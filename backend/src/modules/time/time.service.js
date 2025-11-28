// backend/src/modules/time/time.service.js
const prisma = require('../../config/prisma');
const { TimeEventType } = require('@prisma/client');

function getTodayAtMinutes(minutes) {
  if (minutes == null) return null;
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  d.setMinutes(minutes);
  return d;
}


function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function getRangeForDays(days) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(todayStart);
  start.setDate(start.getDate() - (days - 1));
  const end = new Date(todayStart);
  end.setDate(end.getDate() + 1); // mañana
  return { start, end };
}

// calcula intervalos de pausa a partir de la secuencia de eventos
function computePauses(events) {
  const pauses = [];
  let currentStart = null;

  for (const ev of events) {
    if (ev.type === TimeEventType.BREAK_START) {
      currentStart = ev;
    } else if (ev.type === TimeEventType.BREAK_END && currentStart) {
      const startTs = new Date(currentStart.timestamp);
      const endTs = new Date(ev.timestamp);

      const diffMs = endTs - startTs;

      const totalSeconds = Math.floor(diffMs / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      const durationFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      pauses.push({
        start: currentStart.timestamp,
        end: ev.timestamp,
        minutes,
        seconds,
        durationFormatted,
        reason: currentStart.reason || null,
      });

      currentStart = null;
    }
  }

  return pauses;
}



// valida la secuencia de eventos de hoy antes de insertar uno nuevo
function validateNewEvent(type, todaysEvents) {
  const hasClockIn = todaysEvents.some(e => e.type === TimeEventType.CLOCK_IN);
  const hasClockOut = todaysEvents.some(e => e.type === TimeEventType.CLOCK_OUT);
  const lastEvent = todaysEvents[todaysEvents.length - 1] || null;

  switch (type) {
    case TimeEventType.CLOCK_IN:
      if (hasClockIn || hasClockOut) {
        throw { status: 400, message: 'Ya se ha iniciado o finalizado la jornada hoy.' };
      }
      break;

    case TimeEventType.BREAK_START:
      if (!hasClockIn) {
        throw { status: 400, message: 'No se puede iniciar una pausa sin haber iniciado la jornada.' };
      }
      if (!lastEvent || lastEvent.type === TimeEventType.BREAK_START) {
        throw { status: 400, message: 'Ya estás en una pausa.' };
      }
      if (lastEvent.type === TimeEventType.CLOCK_OUT) {
        throw { status: 400, message: 'La jornada ya ha sido finalizada.' };
      }
      break;

    case TimeEventType.BREAK_END:
      if (!lastEvent || lastEvent.type !== TimeEventType.BREAK_START) {
        throw { status: 400, message: 'No hay una pausa activa para finalizar.' };
      }
      break;

    case TimeEventType.CLOCK_OUT:
      if (!hasClockIn) {
        throw { status: 400, message: 'No se puede finalizar la jornada sin haberla iniciado.' };
      }
      if (hasClockOut) {
        throw { status: 400, message: 'La jornada ya ha sido finalizada.' };
      }
      if (lastEvent && lastEvent.type === TimeEventType.BREAK_START) {
        throw { status: 400, message: 'No se puede finalizar la jornada mientras estás en pausa.' };
      }
      break;

    default:
      throw { status: 400, message: 'Tipo de evento de tiempo inválido.' };
  }
}

async function registerEvent({ userId, companyId, type, reason }) {
  const company = await prisma.company.findUnique({
  where: { id: companyId },
});

if (!company || !company.isActive) {
  throw {
    status: 403,
    message: 'La empresa está desactivada. No se pueden registrar fichajes.',
  };
}

  if (!companyId) {
    throw { status: 400, message: 'El usuario no está asociado a una empresa.' };
  }

  // Traemos al usuario para conocer su horario
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw { status: 404, message: 'Usuario no encontrado.' };
  }

  const now = new Date();

  // Horario de hoy según minutos configurados
  const scheduledStart = getTodayAtMinutes(user.workStartMinutes ?? null);
  const scheduledEnd = getTodayAtMinutes(user.workEndMinutes ?? null);

  const { start, end } = getTodayRange();
  const todaysEvents = await prisma.timeEvent.findMany({
    where: {
      userId,
      timestamp: { gte: start, lt: end },
    },
    orderBy: { timestamp: 'asc' },
  });

  // Reglas generales (sin horario)
  validateNewEvent(type, todaysEvents);

  // ✅ Regla de horario para CLOCK_IN (solo desde 30 min antes)
  if (type === TimeEventType.CLOCK_IN && scheduledStart) {
    const earliest = new Date(scheduledStart.getTime() - 30 * 60 * 1000); // -30 min
    if (now < earliest) {
      throw {
        status: 400,
        message: 'Solo puedes iniciar la jornada 30 minutos antes de tu hora de entrada.',
      };
    }
  }

  // ✅ Regla de horario para CLOCK_OUT (si es antes de hora fin, exige motivo)
  if (type === TimeEventType.CLOCK_OUT && scheduledEnd) {
    if (now < scheduledEnd) {
      if (!reason || !String(reason).trim()) {
        throw {
          status: 400,
          message: 'Estás finalizando antes de tu hora de salida. Debes indicar un motivo.',
        };
      }
    }
  }

  const event = await prisma.timeEvent.create({
    data: {
      type,
      companyId,
      userId,
      reason: reason || null,
    },
  });

  return event;
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

  const pauses = computePauses(events);

  return { events, pauses };
}

// historial últimos N días con resumen simple
async function getHistoryForUser(userId, days = 7) {
  const { start, end } = getRangeForDays(days);

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

  // agrupar por fecha (YYYY-MM-DD)
  const byDate = {};
  for (const ev of events) {
    const d = new Date(ev.timestamp);
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(ev);
  }

  // construir resumen por día (sin días vacíos)
  const history = Object.entries(byDate).map(([date, dayEvents]) => {
    const firstClockIn = dayEvents.find(e => e.type === TimeEventType.CLOCK_IN) || null;
    const lastClockOut = [...dayEvents].reverse().find(e => e.type === TimeEventType.CLOCK_OUT) || null;
    const pauses = computePauses(dayEvents);
    // calcular tiempo trabajado neto (sin pausas)
let totalWorkedSeconds = null;
let totalWorkedFormatted = null;

if (firstClockIn && lastClockOut) {
  const startTs = new Date(firstClockIn.timestamp);
  const endTs = new Date(lastClockOut.timestamp);
  const spanSeconds = Math.max(0, Math.floor((endTs - startTs) / 1000));

  const totalPauseSeconds = pauses.reduce(
    (acc, p) => acc + (p.minutes * 60 + p.seconds),
    0
  );

  totalWorkedSeconds = Math.max(0, spanSeconds - totalPauseSeconds);

  const hours = Math.floor(totalWorkedSeconds / 3600);
  const minutes = Math.floor((totalWorkedSeconds % 3600) / 60);
  const seconds = totalWorkedSeconds % 60;

  totalWorkedFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(
    seconds
  ).padStart(2, '0')}`;
}


   return {
  date,
  events: dayEvents,
  firstClockIn: firstClockIn ? firstClockIn.timestamp : null,
  lastClockOut: lastClockOut ? lastClockOut.timestamp : null,
  pauses,
  totalWorkedSeconds,
  totalWorkedFormatted,
};

  });

  // ordenar por fecha descendente (último día arriba)
  history.sort((a, b) => (a.date < b.date ? 1 : -1));

  return history;
}

module.exports = {
  registerEvent,
  getTodayEventsForUser,
  getHistoryForUser,
};
