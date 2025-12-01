// backend/src/modules/absences/absences.service.js
const prisma = require('../../config/prisma');
const { AbsenceStatus, AbsenceType, Role } = require('@prisma/client');

const VALID_REQUEST_TYPES = [
  AbsenceType.VACATION,
  AbsenceType.SICK_LEAVE,
  AbsenceType.PAID_LEAVE,
  AbsenceType.UNPAID_LEAVE,
  AbsenceType.JUSTIFIED_OTHER,
  // Ojo: UNJUSTIFIED lo decide el admin, no el trabajador
];

function parseDateOnly(str) {
  // str puede ser "YYYY-MM-DD" o "YYYY-MM-DDTHH:mm"
  if (!str) return null;
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

async function createAbsenceRequest({ requester, data }) {
  if (!requester || requester.role !== Role.WORKER) {
    const error = new Error('Solo un trabajador puede registrar ausencias');
    error.status = 403;
    throw error;
  }

  if (!requester.companyId) {
    const error = new Error('El trabajador no está asociado a ninguna empresa');
    error.status = 400;
    throw error;
  }

  const { type, startDate, endDate, reason } = data;

  if (!type || !startDate || !endDate) {
    const error = new Error('Tipo, fecha inicio y fecha fin son obligatorios');
    error.status = 400;
    throw error;
  }

  if (!VALID_REQUEST_TYPES.includes(type)) {
    const error = new Error('Tipo de ausencia no válido');
    error.status = 400;
    throw error;
  }

  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);

  if (!start || !end) {
    const error = new Error('Fechas de ausencia no válidas');
    error.status = 400;
    throw error;
  }

  if (end < start) {
    const error = new Error('La fecha fin no puede ser anterior a la fecha inicio');
    error.status = 400;
    throw error;
  }

  const created = await prisma.absenceRequest.create({
    data: {
      requestedType: type,
      finalType: null,
      startDate: start,
      endDate: end,
      status: AbsenceStatus.PENDING,
      reason: reason || null,
      adminComment: null,
      attachmentUrl: null,
      companyId: requester.companyId,
      userId: requester.id,
    },
  });

  return created;
}

async function listMyAbsences({ requester }) {
  if (!requester || requester.role !== Role.WORKER) {
    const error = new Error('Solo un trabajador puede ver sus ausencias');
    error.status = 403;
    throw error;
  }

  const items = await prisma.absenceRequest.findMany({
    where: { userId: requester.id },
    orderBy: [{ startDate: 'desc' }],
  });

  return items;
}

module.exports = {
  createAbsenceRequest,
  listMyAbsences,
};
