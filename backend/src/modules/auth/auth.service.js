const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');
const env = require('../../config/env');

async function login({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { company: true },
  });
  function minutesToHHMM(minutes) {
  if (minutes == null) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}


  if (!user || !user.isActive) {
    throw { status: 401, message: 'Credenciales inválidas' };
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw { status: 401, message: 'Credenciales inválidas' };
  }

  const payload = {
    userId: user.id,
    role: user.role,
    companyId: user.companyId || null,
  };

  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '8h' });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      companyId: user.companyId,
      companyName: user.company?.name ?? null,
      workStartMinutes: user.workStartMinutes,
      workEndMinutes: user.workEndMinutes,
      workStartTime: minutesToHHMM(user.workStartMinutes),
      workEndTime: minutesToHHMM(user.workEndMinutes),
    },
  };
}

async function getProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { company: true },
  });

  if (!user) {
    throw { status: 404, message: 'Usuario no encontrado' };
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    companyId: user.companyId,
    companyName: user.company?.name ?? null,
    workStartMinutes: user.workStartMinutes,
    workEndMinutes: user.workEndMinutes,
    workStartTime: minutesToHHMM(user.workStartMinutes),
    workEndTime: minutesToHHMM(user.workEndMinutes),
  };
}

module.exports = { login, getProfile };
