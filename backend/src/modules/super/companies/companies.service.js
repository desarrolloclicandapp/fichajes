const bcrypt = require('bcrypt');
const prisma = require('../../../config/prisma');
const { Role } = require('@prisma/client');

// LISTAR EMPRESAS CON CONTADORES BÁSICOS
async function listCompanies() {
  // Traemos todas las companies
  const companies = await prisma.company.findMany({
    orderBy: { createdAt: 'desc' },
  });

  // Contamos trabajadores por empresa
  const workersCounts = await prisma.user.groupBy({
    by: ['companyId'],
    where: { role: Role.WORKER },
    _count: { _all: true },
  });

  const adminsCounts = await prisma.user.groupBy({
    by: ['companyId'],
    where: { role: Role.CLIENT_ADMIN },
    _count: { _all: true },
  });

  const workersMap = {};
  workersCounts.forEach((w) => {
    workersMap[w.companyId] = w._count._all;
  });

  const adminsMap = {};
  adminsCounts.forEach((a) => {
    adminsMap[a.companyId] = a._count._all;
  });

  return companies.map((c) => ({
    id: c.id,
    name: c.name,
    taxId: c.taxId,
    isActive: c.isActive,
    createdAt: c.createdAt,
    workersCount: workersMap[c.id] || 0,
    adminsCount: adminsMap[c.id] || 0,
  }));
}

// CREAR EMPRESA
async function createCompany({ name, taxId }) {
  if (!name) {
    throw { status: 400, message: 'El nombre de la empresa es obligatorio.' };
  }

  const company = await prisma.company.create({
    data: {
      name,
      taxId: taxId || null,
      isActive: true,
    },
  });

  return company;
}

// DETALLE EMPRESA + STATS
async function getCompany({ companyId }) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw { status: 404, message: 'Empresa no encontrada.' };
  }

  const workersCount = await prisma.user.count({
    where: { companyId, role: Role.WORKER },
  });

  const adminsCount = await prisma.user.count({
    where: { companyId, role: Role.CLIENT_ADMIN },
  });

  const lastEvent = await prisma.timeEvent.findFirst({
    where: { companyId },
    orderBy: { timestamp: 'desc' },
  });

  return {
    id: company.id,
    name: company.name,
    taxId: company.taxId,
    isActive: company.isActive,
    createdAt: company.createdAt,
    workersCount,
    adminsCount,
    lastActivityAt: lastEvent ? lastEvent.timestamp : null,
  };
}

// EDITAR EMPRESA
async function updateCompany({ companyId, data }) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw { status: 404, message: 'Empresa no encontrada.' };
  }

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: {
      name: data.name ?? company.name,
      taxId: data.taxId !== undefined ? data.taxId : company.taxId,
    },
  });

  return updated;
}

// ACTIVAR / DESACTIVAR EMPRESA
async function setCompanyStatus({ companyId, isActive }) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw { status: 404, message: 'Empresa no encontrada.' };
  }

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: { isActive: !!isActive },
  });

  return updated;
}

// LISTAR CLIENT_ADMIN DE UNA EMPRESA
async function listCompanyAdmins({ companyId }) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw { status: 404, message: 'Empresa no encontrada.' };
  }

  const admins = await prisma.user.findMany({
    where: {
      companyId,
      role: Role.CLIENT_ADMIN,
    },
    orderBy: { email: 'asc' },
  });

  return admins.map((a) => ({
    id: a.id,
    email: a.email,
    fullName: a.fullName,
    isActive: a.isActive,
    createdAt: a.createdAt,
  }));
}

// CREAR CLIENT_ADMIN PARA UNA EMPRESA
async function createCompanyAdmin({ companyId, email, fullName, password }) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw { status: 404, message: 'Empresa no encontrada.' };
  }

  if (!email) {
    throw { status: 400, message: 'El email es obligatorio.' };
  }

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    throw { status: 400, message: 'Ya existe un usuario con ese email.' };
  }

  const plainPassword = password || 'cambiar123'; // simple por ahora
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const admin = await prisma.user.create({
    data: {
      email,
      fullName: fullName || null,
      passwordHash,
      role: Role.CLIENT_ADMIN,
      isActive: true,
      companyId,
    },
  });

  return {
    id: admin.id,
    email: admin.email,
    fullName: admin.fullName,
    tempPasswordUsed: !password,
  };
}

module.exports = {
  listCompanies,
  createCompany,
  getCompany,
  updateCompany,
  setCompanyStatus,
  listCompanyAdmins,
  createCompanyAdmin,
};
