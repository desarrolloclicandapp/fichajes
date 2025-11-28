// backend/src/modules/admin/workers/workers.service.js
const bcrypt = require('bcrypt');
const prisma = require('../../../config/prisma');
const { Role } = require('@prisma/client');

function resolveCompanyIdFromUser(user, explicitCompanyId) {
  // SUPER_ADMIN puede pasar companyId por query/body, CLIENT_ADMIN usa el suyo
  if (user.role === 'SUPER_ADMIN') {
    return explicitCompanyId || user.companyId || null;
  }
  return user.companyId;
}

async function listWorkers({ requester, includeInactive = false }) {
  const companyId = resolveCompanyIdFromUser(requester);
  if (!companyId) {
    throw { status: 400, message: 'No se ha podido determinar la empresa.' };
  }

  const workers = await prisma.user.findMany({
    where: {
      companyId,
      role: Role.WORKER,
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: { fullName: 'asc' },
  });

  return workers.map((u) => ({
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    isActive: u.isActive,
    workStartMinutes: u.workStartMinutes,
    workEndMinutes: u.workEndMinutes,
    workDays: u.workDays,
  }));
}

async function createWorker({ requester, data }) {
  const companyId = resolveCompanyIdFromUser(requester, data.companyId);
  if (!companyId) {
    throw { status: 400, message: 'No se ha podido determinar la empresa.' };
  }

  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) {
    throw { status: 400, message: 'Ya existe un usuario con ese email.' };
  }

  // password temporal sencillo (en un sistema real se generaría algo y se enviaría por email)
  const passwordPlain = data.password || 'cambiar123';
  const passwordHash = await bcrypt.hash(passwordPlain, 10);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      fullName: data.fullName || null,
      role: Role.WORKER,
      isActive: true,
      companyId,
      workStartMinutes: data.workStartMinutes ?? null,
      workEndMinutes: data.workEndMinutes ?? null,
      workDays: data.workDays || null,
    },
  });

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    workStartMinutes: user.workStartMinutes,
    workEndMinutes: user.workEndMinutes,
    workDays: user.workDays,
    tempPasswordUsed: !data.password, // info para el admin
  };
}

async function getWorker({ requester, workerId }) {
  const companyId = resolveCompanyIdFromUser(requester);
  if (!companyId) {
    throw { status: 400, message: 'No se ha podido determinar la empresa.' };
  }

  const user = await prisma.user.findFirst({
    where: {
      id: workerId,
      companyId,
      role: Role.WORKER,
    },
  });

  if (!user) {
    throw { status: 404, message: 'Trabajador no encontrado.' };
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    isActive: user.isActive,
    workStartMinutes: user.workStartMinutes,
    workEndMinutes: user.workEndMinutes,
    workDays: user.workDays,
  };
}

async function updateWorker({ requester, workerId, data }) {
  const companyId = resolveCompanyIdFromUser(requester);
  if (!companyId) {
    throw { status: 400, message: 'No se ha podido determinar la empresa.' };
  }

  const user = await prisma.user.findFirst({
    where: {
      id: workerId,
      companyId,
      role: Role.WORKER,
    },
  });
  if (!user) {
    throw { status: 404, message: 'Trabajador no encontrado.' };
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      fullName: data.fullName ?? user.fullName,
      workStartMinutes:
        data.workStartMinutes !== undefined
          ? data.workStartMinutes
          : user.workStartMinutes,
      workEndMinutes:
        data.workEndMinutes !== undefined ? data.workEndMinutes : user.workEndMinutes,
      workDays: data.workDays !== undefined ? data.workDays : user.workDays,
      isActive: data.isActive !== undefined ? data.isActive : user.isActive,
    },
  });

  return {
    id: updated.id,
    email: updated.email,
    fullName: updated.fullName,
    isActive: updated.isActive,
    workStartMinutes: updated.workStartMinutes,
    workEndMinutes: updated.workEndMinutes,
    workDays: updated.workDays,
  };
}

async function setWorkerStatus({ requester, workerId, isActive }) {
  return updateWorker({ requester, workerId, data: { isActive } });
}

module.exports = {
  listWorkers,
  createWorker,
  getWorker,
  updateWorker,
  setWorkerStatus,
};
