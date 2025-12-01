// backend/src/modules/admin/absences/absences.service.js
const prisma = require('../../../config/prisma');
const { AbsenceStatus, AbsenceType } = require('@prisma/client');

const ALLOWED_STATUS_UPDATE = [AbsenceStatus.APPROVED, AbsenceStatus.REJECTED];
const VALID_FINAL_TYPES = Object.values(AbsenceType);

function resolveCompanyIdFromUser(user) {
  // CLIENT_ADMIN usa su companyId. SUPER_ADMIN también debe estar en contexto de empresa.
  return user.companyId;
}

async function listCompanyAbsenceRequests({ requester, statusFilter }) {
  const companyId = resolveCompanyIdFromUser(requester);
  if (!companyId) {
    throw { status: 400, message: 'No se ha podido determinar la empresa.' };
  }

  const items = await prisma.absenceRequest.findMany({
    where: {
      companyId,
      ...(statusFilter && { status: statusFilter }),
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
    // Ordenar por estado pendiente primero, luego por fecha de inicio
    orderBy: [{ status: 'asc' }, { startDate: 'asc' }],
  });

  return items;
}

async function updateAbsenceRequestStatus({
  requester,
  requestId,
  status,
  adminComment,
  finalType,
}) {
  const companyId = resolveCompanyIdFromUser(requester);
  if (!companyId) {
    throw { status: 400, message: 'No se ha podido determinar la empresa.' };
  }

  if (!ALLOWED_STATUS_UPDATE.includes(status)) {
    throw { status: 400, message: 'Estado de actualización inválido. Solo se permite APPROVED o REJECTED.' };
  }

  if (finalType && !VALID_FINAL_TYPES.includes(finalType)) {
    throw { status: 400, message: 'Tipo de ausencia final inválido.' };
  }

  // 1. Verificar que la solicitud existe y pertenece a la empresa
  const request = await prisma.absenceRequest.findFirst({
    where: {
      id: requestId,
      companyId,
    },
    select: {
        id: true,
        status: true,
        requestedType: true,
    }
  });

  if (!request) {
    throw { status: 404, message: 'Solicitud de ausencia no encontrada.' };
  }
  
  // 2. No se puede actualizar una solicitud ya finalizada
  if (request.status !== AbsenceStatus.PENDING) {
      throw { status: 400, message: `La solicitud ya tiene estado ${request.status}. No se puede modificar.` };
  }


  // 3. Actualizar
  const updated = await prisma.absenceRequest.update({
    where: { id: requestId },
    data: {
      status,
      adminComment: adminComment || null,
      // Si se aprueba y no se especifica finalType, usar el solicitado.
      finalType: status === AbsenceStatus.APPROVED
        ? finalType || request.requestedType
        : null, // Si se rechaza, finalType es null
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    }
  });

  return updated;
}

module.exports = {
  listCompanyAbsenceRequests,
  updateAbsenceRequestStatus,
};