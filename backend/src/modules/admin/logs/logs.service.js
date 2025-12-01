// backend/src/modules/admin/logs/logs.service.js
const prisma = require('../../../config/prisma');
const { TimeEventType } = require('@prisma/client');

function resolveCompanyIdFromUser(user) {
  return user.companyId;
}

function parseDateRange(fromStr, toStr) {
  if (!fromStr || !toStr) {
    throw { status: 400, message: 'Debe especificar from y to (YYYY-MM-DD).' };
  }
  const from = new Date(fromStr + 'T00:00:00');
  const to = new Date(toStr + 'T00:00:00');
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw { status: 400, message: 'Fechas inválidas.' };
  }
  const toExclusive = new Date(to);
  toExclusive.setDate(toExclusive.getDate() + 1);
  return { from, to: toExclusive };
}

// Lógica para listar Eventos de Fichaje (Time Events)
async function listTimeEvents({ requester, fromStr, toStr, userId, type }) {
  const companyId = resolveCompanyIdFromUser(requester);
  if (!companyId) {
    throw { status: 400, message: 'No se ha podido determinar la empresa.' };
  }

  const { from, to } = parseDateRange(fromStr, toStr);

  const events = await prisma.timeEvent.findMany({
    where: {
      companyId,
      timestamp: { gte: from, lt: to },
      ...(userId && { userId }),
      ...(type && { type: type }),
    },
    include: {
      user: {
        select: {
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: { timestamp: 'desc' },
    take: 500,
  });

  return events;
}


// 🆕 Lógica para listar Logs de Ausencias
async function listAbsenceLogs({ requester, fromStr, toStr, userId, status }) {
  const companyId = resolveCompanyIdFromUser(requester);
  if (!companyId) {
    throw { status: 400, message: 'No se ha podido determinar la empresa.' };
  }

  const { from, to } = parseDateRange(fromStr, toStr);
  
  // Buscar solicitudes de ausencia en el rango de tiempo
  const requests = await prisma.absenceRequest.findMany({
    where: {
      companyId,
      // Buscar por fecha de creación O por fecha de actualización
      OR: [
          { createdAt: { gte: from, lt: to } },
          { updatedAt: { gte: from, lt: to }, status: { in: ['APPROVED', 'REJECTED'] } }
      ],
      ...(userId && { userId }),
      ...(status && { status }),
    },
    include: {
      user: {
        select: {
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const allLogs = [];

  requests.forEach(req => {
      // Log de Creación (Solicitud)
      allLogs.push({
          id: req.id + '-created',
          timestamp: req.createdAt,
          type: 'ABSENCE_REQUESTED',
          user: req.user,
          details: `Solicitud de ${req.requestedType} (${req.startDate.toISOString().slice(0, 10)} a ${req.endDate.toISOString().slice(0, 10)}). Motivo: ${req.reason || '-'}`,
          status: 'PENDING',
      });
      
      // Log de Decisión (Aprobación/Rechazo)
      // Si la solicitud ha sido actualizada y ya no está PENDING (es decir, ya se tomó una decisión)
      if (req.status !== 'PENDING' && req.updatedAt.getTime() > req.createdAt.getTime()) {
        allLogs.push({
            id: req.id + '-decision',
            timestamp: req.updatedAt,
            type: req.status === 'APPROVED' ? 'ABSENCE_APPROVED' : 'ABSENCE_REJECTED',
            user: req.user,
            details: `Decisión: ${req.status}. Tipo final: ${req.finalType || req.requestedType}. Admin: ${req.adminComment || '-'}`,
            status: req.status,
        });
      }
  });

  // Ordenar logs por timestamp descendente
  allLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return allLogs;
}


module.exports = {
  listTimeEvents,
  listAbsenceLogs,
};