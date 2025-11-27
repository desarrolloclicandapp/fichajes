// backend/src/modules/auth/auth.service.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');
const env = require('../../config/env');

async function login({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      company: true,
    },
  });

  if (!user || !user.isActive) {
    throw { status: 401, message: 'Credenciales inválidas' };
  }

  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) {
    throw { status: 401, message: 'Credenciales inválidas' };
  }

  const tokenPayload = {
    userId: user.id,
    role: user.role,
    companyId: user.companyId || null,
  };

  const token = jwt.sign(tokenPayload, env.JWT_SECRET, {
    expiresIn: '8h',
  });

  // Lo que devolvemos al frontend
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      companyId: user.companyId,
      companyName: user.company?.name ?? null,
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
  };
}

module.exports = {
  login,
  getProfile,
};
