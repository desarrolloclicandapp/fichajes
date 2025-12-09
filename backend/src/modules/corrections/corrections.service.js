// backend/src/modules/corrections/corrections.service.js
const prisma = require('../../config/prisma'); // Ruta corregida
const { Role, TimeEventType } = require('@prisma/client'); // Quitamos CorrectionState para evitar errores de importación

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
    return d; 
}

function getScheduledEndTimestamp(date, workEndMinutes) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setMinutes(workEndMinutes);
    return d;
}

// 🆕 SIMULACIÓN AUTOMÁTICA CON TRANSACCIÓN
function getSearchStartDate() {
    const d = new Date();
    d.setDate(d.getDate() - 30); // ⬅️ CAMBIO CLAVE: Miramos 5 días atrás
    d.setHours(0, 0, 0, 0);
    return d;
}

// Función para obtener el final de la búsqueda (Hoy a las 00:00)
// Esto evita tocar los fichajes "de hoy" que aún están ocurriendo
function getSearchEndDate() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d; 
}

// ... getScheduledEndTimestamp ...

async function checkAndInsertProvisional() {
    const searchStart = getSearchStartDate();
    const searchEnd = getSearchEndDate(); // "Hoy" a las 00:00
    

    // Buscar trabajadores con fichajes en ese rango
    const workers = await prisma.user.findMany({
        where: { role: Role.WORKER, isActive: true, companyId: { not: null } },
        include: { 
            timeEvents: {
                where: { timestamp: { gte: searchStart, lt: searchEnd } },
                orderBy: { timestamp: 'asc' }
            },
        }
    });
    
    let createdCount = 0;
    
    for (const worker of workers) {
        if (!worker.workEndMinutes) continue;

        // Agrupamos eventos por día para procesar cada día individualmente
        // (Por si olvidó cerrar el viernes Y el sábado)
        const eventsByDay = {};
        for (const ev of worker.timeEvents) {
            const dayKey = ev.timestamp.toISOString().split('T')[0]; // "2023-10-27"
            if (!eventsByDay[dayKey]) eventsByDay[dayKey] = [];
            eventsByDay[dayKey].push(ev);
        }

        // Revisamos cada día encontrado
        for (const [dateStr, events] of Object.entries(eventsByDay)) {
            const hasClockIn = events.some(e => e.type === TimeEventType.CLOCK_IN);
            const hasClockOut = events.some(e => e.type === TimeEventType.CLOCK_OUT);

            // Si ese día entró pero NO salió...
            if (hasClockIn && !hasClockOut) {
                const dateObj = new Date(dateStr); // Fecha del olvido
                const provisionalTime = getScheduledEndTimestamp(dateObj, worker.workEndMinutes);

                // Verificamos si ya existe una corrección pendiente para este día para no duplicar
                const existingCorrection = await prisma.missingClockOut.findFirst({
                    where: { workerId: worker.id, date: dateObj }
                });

                if (existingCorrection) continue; // Ya está gestionada o pendiente

                // Crear la corrección
                await prisma.$transaction([
                    prisma.timeEvent.create({
                        data: {
                            type: TimeEventType.CLOCK_OUT,
                            companyId: worker.companyId,
                            userId: worker.id,
                            timestamp: provisionalTime,
                            reason: 'Salida provisional (Olvido de fichaje)',
                        }
                    }),
                    prisma.missingClockOut.create({
                        data: {
                            date: dateObj,
                            status: 'PENDING_ADMIN_REVIEW',
                            provisionalTime: provisionalTime,
                            companyId: worker.companyId,
                            workerId: worker.id,
                            adminNotes: 'Sistema: Fichaje de salida insertado automáticamente.'
                        }
                    })
                ]);
                
                createdCount++;
            }
        }
    }
    
    return createdCount;
}

// ADMIN: Listar pendientes (Usando string directo)
async function listMissingClockOuts({ requester }) {
    if (!requester || ![Role.CLIENT_ADMIN, Role.SUPER_ADMIN].includes(requester.role)) {
        throw { status: 403, message: 'No autorizado.' };
    }
    
    const items = await prisma.missingClockOut.findMany({
        where: {
            companyId: requester.companyId,
            status: 'PENDING_ADMIN_REVIEW', // Filtro seguro
        },
        include: {
            worker: { select: { fullName: true, email: true } }
        },
        orderBy: { date: 'asc' }
    });
    
    return items;
}

// ADMIN: Notificar (Aprobar corrección)
async function enableWorkerCorrection({ admin, missingId, adminNotes }) {
    const record = await prisma.missingClockOut.findUnique({ where: { id: missingId } });
    if (!record || record.companyId !== admin.companyId) throw { status: 404, message: 'No encontrado' };

    return await prisma.missingClockOut.update({
        where: { id: missingId },
        data: {
            status: 'PENDING_WORKER_INPUT',
            adminNotes: adminNotes,
            adminApproverId: admin.id,
        }
    });
}

// WORKER: Listar sus pendientes
async function listWorkerPendingCorrections({ worker }) {
    return await prisma.missingClockOut.findMany({
        where: { 
            workerId: worker.id,
            status: 'PENDING_WORKER_INPUT' 
        },
        orderBy: { date: 'asc' }
    });
}

// WORKER: Enviar corrección
async function submitWorkerCorrection({ worker, missingId, manualTimeStr, reason }) {
    const record = await prisma.missingClockOut.findUnique({ where: { id: missingId } });
    if (!record || record.workerId !== worker.id) throw { status: 404, message: 'No encontrado' };
    
    if (!manualTimeStr) throw { status: 400, message: 'Hora obligatoria' };

    const [h, m] = manualTimeStr.split(':').map(Number);
    const finalTime = new Date(record.date);
    finalTime.setHours(h, m, 0, 0);

    // Transacción para limpiar el provisional y poner el real
    await prisma.$transaction([
        // 1. Borrar provisionales de ese día (limpieza)
        prisma.timeEvent.deleteMany({
            where: {
                userId: worker.id,
                timestamp: record.provisionalTime,
                type: TimeEventType.CLOCK_OUT
            }
        }),
        // 2. Crear el nuevo fichaje manual
        prisma.timeEvent.create({
            data: {
                type: TimeEventType.CLOCK_OUT,
                companyId: worker.companyId,
                userId: worker.id,
                timestamp: finalTime,
                reason: `Corrección: ${reason}`
            }
        }),
        // 3. Cerrar la incidencia
        prisma.missingClockOut.update({
            where: { id: missingId },
            data: {
                status: 'COMPLETED',
                manualTime: finalTime,
                reason: reason,
            }
        })
    ]);

    return { success: true };
}

module.exports = {
    checkAndInsertProvisional,
    listMissingClockOuts,
    enableWorkerCorrection,
    listWorkerPendingCorrections,
    submitWorkerCorrection,
};