// backend/src/modules/corrections/corrections.service.js
const prisma = require('../../../config/prisma');
const { Role, TimeEventType, CorrectionState } = require('@prisma/client');

const HOUR_OFFSET_MINUTES = 3 * 60; // 3 horas

function getYesterdayStart() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
}

function getYesterdayEnd() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d; // Hoy a las 00:00 (final del día de ayer)
}

function getScheduledEndTimestamp(date, workEndMinutes) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0); // Limpiar hora y usar la fecha correcta
    d.setMinutes(workEndMinutes);
    return d;
}

// 🆕 ESTA FUNCIÓN SIMULA EL TRABAJO PROGRAMADO (CRON JOB)
async function checkAndInsertProvisional() {
    // 1. Buscamos todas las jornadas de AYER sin CLOCK_OUT
    const yesterday = getYesterdayStart();
    const today = getYesterdayEnd();
    
    // Esto es muy simplificado: en producción solo buscamos jornadas 'abiertas'
    const workers = await prisma.user.findMany({
        where: { role: Role.WORKER, isActive: true, companyId: { not: null } },
        include: { 
            timeEvents: {
                where: { 
                    timestamp: { gte: yesterday, lt: today },
                },
                orderBy: { timestamp: 'asc' }
            },
            company: { select: { id: true } }
        }
    });
    
    const newCorrections = [];
    
    for (const worker of workers) {
        if (!worker.workEndMinutes) continue;
        const events = worker.timeEvents;

        const hasClockIn = events.some(e => e.type === TimeEventType.CLOCK_IN);
        const hasClockOut = events.some(e => e.type === TimeEventType.CLOCK_OUT);
        
        // Si tiene CLOCK_IN pero NO tiene CLOCK_OUT, se considera faltante
        if (hasClockIn && !hasClockOut) {
            
            // 🆕 Regla de 3 horas de offset (SIMULADA, el cron job se encargaría del tiempo)
            const scheduledEnd = getScheduledEndTimestamp(yesterday, worker.workEndMinutes);
            // Si el trabajo se ejecuta 3 horas DESPUÉS de la salida programada...
            // En un cron real, esta lógica sería el filtro de la consulta, no un simple if
            // if (new Date() < new Date(scheduledEnd.getTime() + HOUR_OFFSET_MINUTES * 60 * 1000)) continue;

            const provisionalTime = scheduledEnd;

            // 1. Insertar el CLOCK_OUT provisional para cerrar la jornada
            const provisionalEvent = await prisma.timeEvent.create({
                data: {
                    type: TimeEventType.CLOCK_OUT,
                    companyId: worker.companyId,
                    userId: worker.id,
                    timestamp: provisionalTime, // Hora de salida predefinida
                    reason: 'Salida provisional (Olvido de fichaje)',
                }
            });

            // 2. Crear el registro de MissingClockOut para el seguimiento del admin
            const missingRecord = await prisma.missingClockOut.create({
                data: {
                    date: yesterday,
                    status: CorrectionState.PENDING_ADMIN_REVIEW,
                    provisionalTime: provisionalTime,
                    companyId: worker.companyId,
                    workerId: worker.id,
                    adminNotes: 'Sistema: Fichaje de salida insertado automáticamente por olvido.'
                }
            });
            newCorrections.push(missingRecord);
        }
    }
    
    return newCorrections.length;
}

// -------------------------------------------------------------
// LÓGICA DE ADMIN: Listar, Aprobar, Rechazar
// -------------------------------------------------------------

// ADMIN: Listar fichajes faltantes para revisión
async function listMissingClockOuts({ requester }) {
    if (!requester || ![Role.CLIENT_ADMIN, Role.SUPER_ADMIN].includes(requester.role)) {
        throw { status: 403, message: 'No tienes permiso para ver correcciones.' };
    }
    
    const companyId = requester.companyId;

    const items = await prisma.missingClockOut.findMany({
        where: {
            companyId,
            status: CorrectionState.PENDING_ADMIN_REVIEW,
        },
        include: {
            worker: { select: { fullName: true, email: true, workEndMinutes: true } }
        },
        orderBy: { date: 'asc' }
    });
    
    return items;
}

// ADMIN: Dar opción al trabajador para corregir
async function enableWorkerCorrection({ admin, missingId, adminNotes }) {
    if (!admin || ![Role.CLIENT_ADMIN, Role.SUPER_ADMIN].includes(admin.role)) {
        throw { status: 403, message: 'No autorizado.' };
    }
    
    const record = await prisma.missingClockOut.findUnique({ where: { id: missingId } });
    
    if (!record || record.companyId !== admin.companyId) {
        throw { status: 404, message: 'Registro de corrección no encontrado.' };
    }
    
    if (record.status !== CorrectionState.PENDING_ADMIN_REVIEW) {
         throw { status: 400, message: 'La corrección no está pendiente de aprobación inicial.' };
    }

    const updated = await prisma.missingClockOut.update({
        where: { id: missingId },
        data: {
            status: CorrectionState.PENDING_WORKER_INPUT,
            adminNotes: adminNotes,
            adminApproverId: admin.id,
        }
    });

    return updated;
}

// ADMIN: Rechazar corrección (mantener el provisional)
async function rejectCorrection({ admin, missingId, adminNotes }) {
    if (!admin || ![Role.CLIENT_ADMIN, Role.SUPER_ADMIN].includes(admin.role)) {
        throw { status: 403, message: 'No autorizado.' };
    }
    
    const record = await prisma.missingClockOut.findUnique({ where: { id: missingId } });
    
    if (!record || record.companyId !== admin.companyId) {
        throw { status: 404, message: 'Registro de corrección no encontrado.' };
    }

    const updated = await prisma.missingClockOut.update({
        where: { id: missingId },
        data: {
            status: CorrectionState.REJECTED,
            adminNotes: adminNotes + ' (Rechazado)',
            adminApproverId: admin.id,
        }
    });

    return updated;
}

// -------------------------------------------------------------
// LÓGICA DE WORKER: Listar, Enviar Corrección
// -------------------------------------------------------------

// WORKER: Listar correcciones pendientes de su input
async function listWorkerPendingCorrections({ worker }) {
    const items = await prisma.missingClockOut.findMany({
        where: { 
            workerId: worker.id,
            status: CorrectionState.PENDING_WORKER_INPUT 
        },
        orderBy: { date: 'asc' }
    });
    return items;
}

// WORKER: Enviar hora de salida correcta
async function submitWorkerCorrection({ worker, missingId, manualTimeStr, reason }) {
    const manualTime = getScheduledEndTimestamp(new Date(), 0); // Usaremos un timestamp de hoy temporalmente
    
    const record = await prisma.missingClockOut.findUnique({ where: { id: missingId } });
    
    if (!record || record.workerId !== worker.id) {
        throw { status: 404, message: 'Registro de corrección no encontrado.' };
    }
    
    if (record.status !== CorrectionState.PENDING_WORKER_INPUT) {
        throw { status: 400, message: 'La corrección no está lista para ser enviada.' };
    }
    
    if (!manualTimeStr) {
        throw { status: 400, message: 'La hora manual es obligatoria.' };
    }

    // Calcular el día de la corrección y crear el timestamp
    const correctionDate = new Date(record.date);
    const [h, m] = manualTimeStr.split(':').map(Number);
    
    if (Number.isNaN(h) || Number.isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
         throw { status: 400, message: 'Formato de hora manual inválido.' };
    }
    
    const finalTime = new Date(correctionDate);
    finalTime.setHours(h, m, 0, 0);


    // 1. ELIMINAR el evento provisional insertado por el sistema
    await prisma.timeEvent.deleteMany({
        where: {
            userId: worker.id,
            companyId: worker.companyId,
            timestamp: record.provisionalTime,
            type: TimeEventType.CLOCK_OUT,
            // (En un sistema real, el evento provisional tendría un ID único en el MissingClockOut)
        }
    });

    // 2. INSERTAR el nuevo evento con la hora manual
    await prisma.timeEvent.create({
        data: {
            type: TimeEventType.CLOCK_OUT,
            companyId: worker.companyId,
            userId: worker.id,
            timestamp: finalTime,
            reason: `Corrección Manual: ${reason || 'Sin motivo'}`
        }
    });

    // 3. ACTUALIZAR el registro de MissingClockOut
    const updated = await prisma.missingClockOut.update({
        where: { id: missingId },
        data: {
            status: CorrectionState.COMPLETED,
            manualTime: finalTime,
            reason: reason || null,
        }
    });

    return updated;
}


module.exports = {
    checkAndInsertProvisional,
    listMissingClockOuts,
    enableWorkerCorrection,
    rejectCorrection,
    listWorkerPendingCorrections,
    submitWorkerCorrection,
};