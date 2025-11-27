// prisma/seed.js
const { PrismaClient, Role, AbsenceType, AbsenceStatus, TimeEventType } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  // 1. Empresa de prueba (si ya existe una con ese name, la reutilizamos)
  // 1. Empresa de prueba (si ya existe con ese name, la reutilizamos)
let company = await prisma.company.findFirst({
  where: { name: 'Empresa Demo' },
});

if (!company) {
  company = await prisma.company.create({
    data: {
      name: 'Empresa Demo',
      taxId: 'B12345678',
    },
  });
}


  // 2. Super admin
  const superAdminPassword = await bcrypt.hash('superadmin123', 10);
  await prisma.user.upsert({
    where: { email: 'superadmin@sistema.com' },
    update: {}, // aquí podrías actualizar cosas si quisieras
    create: {
      email: 'superadmin@sistema.com',
      passwordHash: superAdminPassword,
      fullName: 'Super Admin',
      role: Role.SUPER_ADMIN,
      isActive: true,
      // companyId: null
    },
  });

  // 3. Admin de la empresa
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@empresademo.com' },
    update: {},
    create: {
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
  const worker = await prisma.user.upsert({
    where: { email: 'trabajador@empresademo.com' },
    update: {},
    create: {
      email: 'trabajador@empresademo.com',
      passwordHash: workerPassword,
      fullName: 'Trabajador Demo',
      role: Role.WORKER,
      isActive: true,
      companyId: company.id,
      workStartMinutes: 9 * 60,   // 09:00
      workEndMinutes: 17 * 60,
    },
  });

  // 5. (Opcional) antes de crear fichajes/ausencias, borra los de prueba anteriores
  await prisma.timeEvent.deleteMany({
    where: { userId: worker.id, companyId: company.id },
  });
  await prisma.timeDailySummary.deleteMany({
    where: { userId: worker.id, companyId: company.id },
  });
  await prisma.absenceRequest.deleteMany({
    where: { userId: worker.id, companyId: company.id },
  });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  await prisma.timeEvent.createMany({
    data: [
      {
        type: TimeEventType.CLOCK_IN,
        timestamp: new Date(today.getTime() + 9 * 60 * 60 * 1000),
        companyId: company.id,
        userId: worker.id,
      },
      {
        type: TimeEventType.BREAK_START,
        timestamp: new Date(today.getTime() + 13 * 60 * 60 * 1000),
        companyId: company.id,
        userId: worker.id,
      },
      {
        type: TimeEventType.BREAK_END,
        timestamp: new Date(today.getTime() + 14 * 60 * 60 * 1000),
        companyId: company.id,
        userId: worker.id,
      },
      {
        type: TimeEventType.CLOCK_OUT,
        timestamp: new Date(today.getTime() + 18 * 60 * 60 * 1000),
        companyId: company.id,
        userId: worker.id,
      },
    ],
  });

  await prisma.timeDailySummary.create({
    data: {
      date: today,
      workedMinutes: 8 * 60,
      breakMinutes: 60,
      overtimeMinutes: 0,
      status: 'COMPLETE',
      companyId: company.id,
      userId: worker.id,
    },
  });

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
