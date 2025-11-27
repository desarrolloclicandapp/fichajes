// backend/src/modules/time/time.service.js
const prisma = require('../../config/prisma');
const { TimeEventType } = require('@prisma/client');

async function registerEvent({ userId, companyId, type }) {
  if (!companyId) {
    throw { status: 400, message: 'El usuario no está asociado a una empresa' };
  }

  if (!Object.values(TimeEventType).includes(type)) {
    throw { status: 400, message: 'Tipo de evento de tiempo inválido' };
  }

  const event = await prisma.timeEvent.create({
    data: {
      type,
      companyId,
      userId,
    },
  });

  return event;
}

function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

async function getTodayEventsForUser(userId) {
  const { start, end } = getTodayRange();

  const events = await prisma.timeEvent.findMany({
    where: {
      userId,
      timestamp: {
        gte: start,
        lt: end,
      },
    },
    orderBy: { timestamp: 'asc' },
  });

  return events;
}

module.exports = {
  registerEvent,
  getTodayEventsForUser,
};
