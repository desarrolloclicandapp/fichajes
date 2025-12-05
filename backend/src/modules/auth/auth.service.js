const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');
const env = require('../../config/env');
const { Role } = require('@prisma/client');

// Helper común para login y getProfile
function minutesToHHMM(minutes) {
  if (minutes == null) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { company: true },
  });

  if (!user || !user.isActive) {
    throw { status: 401, message: 'Credenciales inválidas' };
  }

  // si el usuario tiene empresa y no es SUPER_ADMIN, revisar estado de la empresa
  if (user.company && user.role !== 'SUPER_ADMIN') {
    if (!user.company.isActive) {
      throw {
        status: 403,
        message:
          'La empresa está desactivada. Contacte con el administrador del sistema.',
      };
    }
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

  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '3d' });

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

// 🔑 Reset con clave maestra (desde login, sin estar logueado)
async function masterResetPassword({ email, newPassword, masterKey }) {
  if (!email || !newPassword || !masterKey) {
    const error = new Error(
      'Email, nueva contraseña y clave maestra son obligatorios'
    );
    error.status = 400;
    throw error;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const error = new Error('Usuario no encontrado');
    error.status = 404;
    throw error;
  }

  const isWorker = user.role === Role.WORKER;
  const isClientAdmin = user.role === Role.CLIENT_ADMIN;
  const isSuperAdmin = user.role === Role.SUPER_ADMIN;

  const workerKey = env.MASTER_KEY_WORKER;
  const clientKey = env.MASTER_KEY_CLIENT;
  const superKey = env.MASTER_KEY_SUPER;

  let allowed = false;

  // La super clave siempre puede resetear a cualquiera
  if (superKey && masterKey === superKey) {
    allowed = true;
  } else if (isWorker && workerKey && masterKey === workerKey) {
    allowed = true;
  } else if (isClientAdmin && clientKey && masterKey === clientKey) {
    allowed = true;
  } else if (isSuperAdmin && superKey && masterKey === superKey) {
    allowed = true;
  }

  if (!allowed) {
    const error = new Error('Clave maestra incorrecta para este usuario');
    error.status = 403;
    throw error;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return { message: 'Contraseña actualizada correctamente (master reset).' };
}

// 🔒 Cambio de contraseña estando logueado (panel trabajador / empresa / super)
async function changePassword({ userId, currentPassword, newPassword, masterKey }) {
  if (!userId) {
    const error = new Error('Usuario no autenticado');
    error.status = 401;
    throw error;
  }

  if (!newPassword) {
    const error = new Error('La nueva contraseña es obligatoria');
    error.status = 400;
    throw error;
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    const error = new Error('Usuario no encontrado');
    error.status = 404;
    throw error;
  }

  const isWorker = user.role === Role.WORKER;
  const isClientAdmin = user.role === Role.CLIENT_ADMIN;
  const isSuperAdmin = user.role === Role.SUPER_ADMIN;

  const workerKey = env.MASTER_KEY_WORKER;
  const clientKey = env.MASTER_KEY_CLIENT;
  const superKey = env.MASTER_KEY_SUPER;

  let bypassCurrent = false;

  if (masterKey) {
    if (superKey && masterKey === superKey) {
      bypassCurrent = true;
    } else if (isWorker && workerKey && masterKey === workerKey) {
      bypassCurrent = true;
    } else if (isClientAdmin && clientKey && masterKey === clientKey) {
      bypassCurrent = true;
    } else if (isSuperAdmin && superKey && masterKey === superKey) {
      bypassCurrent = true;
    }
  }

  // Si NO usamos clave maestra válida, hay que comprobar contraseña actual
  if (!bypassCurrent) {
    if (!currentPassword) {
      const error = new Error(
        'La contraseña actual es obligatoria si no usas clave maestra'
      );
      error.status = 400;
      throw error;
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      const error = new Error('La contraseña actual no es correcta');
      error.status = 401;
      throw error;
    }
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return { message: 'Contraseña actualizada correctamente.' };
}

module.exports = {
  login,
  getProfile,
  masterResetPassword,
  changePassword,
};
