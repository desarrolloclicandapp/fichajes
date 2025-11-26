// prisma/seed.js
const { PrismaClient, Role, AbsenceType, AbsenceStatus, TimeEventType } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  // 1. Empresa de prueba
  const company = await prisma.company.create({
    data: {
      name: 'Empresa Demo',
      taxId: 'B12345678',
    },
  });

  // 2. Super admin (sin companyId si quieres que esté "global")
  const superAdminPassword = await bcrypt.hash('superadmin123', 10);
  await prisma.user.create({
    data: {
      email: 'superadmin@sistema.com',
      passwordHash: superAdminPassword,
      fullName: 'Super Admin',
      role: Role.SUPER_ADMIN,
      isActive: true,
      // companyId: null // lo dejas sin empresa
    },
  });

  // 3. Admin de la empresa
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@empresademo.com',
      passwordHash: adminPassword,
      fullName: 'Admin Empresa Demo',
      role: Role.CLIENT_ADMIN,
      isActive: true,
      companyId: company.id,
    },
  });

  // 4. Trabajador de ejemplo
  const workerPassword = await bcrypt.hash('worker123', 10);
  const worker = await prisma.user.create({
    data: {
      email: 'trabajador@empresademo.com',
      passwordHash: workerPassword,
      fullName: 'Trabajador Demo',
      role: Role.WORKER,
      isActive: true,
      companyId: company.id,
    },
  });

  // 5. Unos fichajes de prueba para hoy
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  await prisma.timeEvent.createMany({
    data: [
      {
        type: TimeEventType.CLOCK_IN,
        timestamp: new Date(today.getTime() + 9 * 60 * 60 * 1000), // 09:00
        companyId: company.id,
        userId: worker.id,
      },
      {
        type: TimeEventType.BREAK_START,
        timestamp: new Date(today.getTime() + 13 * 60 * 60 * 1000), // 13:00
        companyId: company.id,
        userId: worker.id,
      },
      {
        type: TimeEventType.BREAK_END,
        timestamp: new Date(today.getTime() + 14 * 60 * 60 * 1000), // 14:00
        companyId: company.id,
        userId: worker.id,
      },
      {
        type: TimeEventType.CLOCK_OUT,
        timestamp: new Date(today.getTime() + 18 * 60 * 60 * 1000), // 18:00
        companyId: company.id,
        userId: worker.id,
      },
    ],
  });

  // 6. Resumen diario de ejemplo
  await prisma.timeDailySummary.create({
    data: {
      date: today,
      workedMinutes: 8 * 60,   // 8h
      breakMinutes: 60,        // 1h
      overtimeMinutes: 0,
      status: 'COMPLETE',
      companyId: company.id,
      userId: worker.id,
    },
  });

  // 7. Ejemplo de ausencia pendiente y otra aprobada
  await prisma.absenceRequest.create({
    data: {
      requestedType: AbsenceType.VACATION,
      finalType: null,
      startDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000),
      endDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
      status: AbsenceStatus.PENDING,
      reason: 'Vacaciones de verano',
      companyId: company.id,
      userId: worker.id,
    },
  });

  await prisma.absenceRequest.create({
    data: {
      requestedType: AbsenceType.SICK_LEAVE,
      finalType: AbsenceType.SICK_LEAVE,
      startDate: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
      endDate: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
      status: AbsenceStatus.APPROVED,
      reason: 'Gripe',
      companyId: company.id,
      userId: worker.id,
    },
  });

  console.log('✅ Seed ejecutado correctamente');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
