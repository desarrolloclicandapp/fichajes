// backend/src/modules/admin/reports/reports.service.js
const prisma = require('../../../config/prisma');
const { TimeEventType } = require('@prisma/client');

function resolveCompanyIdFromUser(user) {
  if (user.role === 'SUPER_ADMIN') {
    return user.companyId || null; // o podrías permitir pasar companyId por query
  }
  return user.companyId;
}

function parseDateRange(fromStr, toStr) {
  if (!fromStr || !toStr) {
    throw { status: 400, message: 'Debe especificar from y to (YYYY-MM-DD).' };
  }
  const from = new Date(fromStr + 'T00:00:00');
  const to = new Date(toStr + 'T00:00:00');
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw { status: 400, message: 'Fechas inválidas.' };
  }
  // to es exclusivo, sumamos 1 día
  const toExclusive = new Date(to);
  toExclusive.setDate(toExclusive.getDate() + 1);
  return { from, to: toExclusive };
}

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
      const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
      pauses.push({ start: startTs, end: endTs, totalSeconds });
      currentStart = null;
    }
  }

  return pauses;
}

function formatSecondsAsHHMMSS(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
    2,
    '0',
  )}:${String(seconds).padStart(2, '0')}`;
}

async function getCompanySummary({ requester, fromStr, toStr }) {
  const companyId = resolveCompanyIdFromUser(requester);
  if (!companyId) {
    throw { status: 400, message: 'No se ha podido determinar la empresa.' };
  }

  const { from, to } = parseDateRange(fromStr, toStr);

  // 1. usuarios de la empresa
  const users = await prisma.user.findMany({
    where: {
      companyId,
      role: 'WORKER',
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      isActive: true,
    },
  });

  if (!users.length) {
    return {
      range: { from: fromStr, to: toStr },
      workers: [],
    };
  }

  const userIds = users.map((u) => u.id);

  // 2. eventos de tiempo en rango
  const events = await prisma.timeEvent.findMany({
    where: {
      companyId,
      userId: { in: userIds },
      timestamp: {
        gte: from,
        lt: to,
      },
    },
    orderBy: [{ userId: 'asc' }, { timestamp: 'asc' }],
  });

  // 🆕 3. Ausencias Aprobadas en el rango del reporte
  const approvedAbsences = await prisma.absenceRequest.findMany({
    where: {
      companyId,
      userId: { in: userIds },
      status: 'APPROVED',
      // Buscar ausencias que tengan al menos 1 día de solapamiento con el rango del reporte
      startDate: { lte: to }, 
      endDate: { gte: from }, 
    },
    select: {
        id: true,
        userId: true,
        requestedType: true,
        finalType: true,
        startDate: true,
        endDate: true,
        reason: true,
    },
  });
  
  const absencesByUser = approvedAbsences.reduce((acc, abs) => {
    if (!acc[abs.userId]) acc[abs.userId] = [];
    acc[abs.userId].push(abs);
    return acc;
  }, {});

  // 4. agrupar eventos por userId y fecha
  const byUser = {};
  for (const ev of events) {
    if (!byUser[ev.userId]) byUser[ev.userId] = {};
    const d = new Date(ev.timestamp);
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    if (!byUser[ev.userId][key]) byUser[ev.userId][key] = [];
    byUser[ev.userId][key].push(ev);
  }

  const resultWorkers = [];

  for (const user of users) {
    const dayMap = byUser[user.id] || {};
    
    // *** CORRECCIÓN: INICIALIZAR LAS VARIABLES A 0 AQUÍ ***
    let totalWorkedSeconds = 0;
    let totalPauseSeconds = 0;
    let daysCount = 0;
    // *******************************************************

    for (const [date, dayEvents] of Object.entries(dayMap)) {
      if (!dayEvents.length) continue;
      dayEvents.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

      const firstClockIn = dayEvents.find((e) => e.type === TimeEventType.CLOCK_IN);
      const lastClockOut = [...dayEvents]
        .reverse()
        .find((e) => e.type === TimeEventType.CLOCK_OUT);

      if (!firstClockIn || !lastClockOut) {
        continue; // día incompleto, lo puedes cambiar si quieres contarlo igual
      }

      const startTs = new Date(firstClockIn.timestamp);
      const endTs = new Date(lastClockOut.timestamp);
      const spanSeconds = Math.max(0, Math.floor((endTs - startTs) / 1000));

      const pauses = computePauses(dayEvents);
      const pauseSeconds = pauses.reduce((acc, p) => acc + p.totalSeconds, 0);

      const workedSeconds = Math.max(0, spanSeconds - pauseSeconds);

      totalWorkedSeconds += workedSeconds;
      totalPauseSeconds += pauseSeconds;
      daysCount += 1;
    }
    
    const userAbsences = absencesByUser[user.id] || []; // 🆕 Ausencias de este trabajador

    resultWorkers.push({
      userId: user.id,
      fullName: user.fullName,
      email: user.email,
      isActive: user.isActive,
      daysCount,
      totalWorkedSeconds,
      totalWorkedFormatted: formatSecondsAsHHMMSS(totalWorkedSeconds),
      totalPauseSeconds,
      totalPauseFormatted: formatSecondsAsHHMMSS(totalPauseSeconds),
      
      // 🆕 Añadir ausencias aprobadas al resumen
      absences: userAbsences.map(abs => ({
        id: abs.id,
        requestedType: abs.requestedType,
        finalType: abs.finalType,
        startDate: abs.startDate.toISOString().slice(0, 10),
        endDate: abs.endDate.toISOString().slice(0, 10),
        reason: abs.reason,
      })),
    });
  }

  return {
    range: { from: fromStr, to: toStr },
    workers: resultWorkers,
  };
}

async function getCompanySummaryCsv(args) {
  const json = await getCompanySummary(args);

  const header = [
    'Trabajador',
    'Email',
    'Días con jornada completa',
    'Horas trabajadas',
    'Horas en pausa',
    // 🆕 Nueva columna
    'Ausencias Aprobadas', 
  ];

  const rows = json.workers.map((w) => {
      // 🆕 Resumen de ausencias aprobadas para el CSV
      const absenceSummary = w.absences.map(a => `${a.finalType || a.requestedType} (${a.startDate} a ${a.endDate})`).join('; ');
      
      return [
        w.fullName || '',
        w.email || '',
        String(w.daysCount),
        w.totalWorkedFormatted,
        w.totalPauseFormatted,
        absenceSummary, // 🆕 Nueva columna
      ];
  });

  const all = [header, ...rows];
  const csv = all.map((row) => row.map((v) => `"${(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');

  return { csv, range: json.range };
}

async function getWorkerDaily({ requester, fromStr, toStr, workerId }) {
  const companyId = resolveCompanyIdFromUser(requester);
  if (!companyId) {
    throw { status: 400, message: 'No se ha podido determinar la empresa.' };
  }

  const { from, to } = parseDateRange(fromStr, toStr);

  // comprobar que el trabajador pertenece a la empresa
  const worker = await prisma.user.findFirst({
    where: {
      id: workerId,
      companyId,
      role: 'WORKER',
    },
    select: {
      id: true,
      fullName: true,
      email: true,
    },
  });

  if (!worker) {
    throw { status: 404, message: 'Trabajador no encontrado en esta empresa.' };
  }

  const events = await prisma.timeEvent.findMany({
    where: {
      companyId,
      userId: workerId,
      timestamp: {
        gte: from,
        lt: to,
      },
    },
    orderBy: { timestamp: 'asc' },
  });

  const byDate = {};
  for (const ev of events) {
    const d = new Date(ev.timestamp);
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(ev);
  }

  const days = [];

  for (const [date, dayEvents] of Object.entries(byDate)) {
    if (!dayEvents.length) continue;

    const firstClockIn = dayEvents.find((e) => e.type === TimeEventType.CLOCK_IN) || null;
    const lastClockOut =
      [...dayEvents].reverse().find((e) => e.type === TimeEventType.CLOCK_OUT) || null;

    const pauses = computePauses(dayEvents);
    let totalWorkedSeconds = null;
    let totalPauseSeconds = pauses.reduce((acc, p) => acc + p.totalSeconds, 0);

    if (firstClockIn && lastClockOut) {
      const startTs = new Date(firstClockIn.timestamp);
      const endTs = new Date(lastClockOut.timestamp);
      const spanSeconds = Math.max(0, Math.floor((endTs - startTs) / 1000));
      totalWorkedSeconds = Math.max(0, spanSeconds - totalPauseSeconds);
    }

    days.push({
      date,
      firstClockIn: firstClockIn ? firstClockIn.timestamp : null,
      lastClockOut: lastClockOut ? lastClockOut.timestamp : null,
      totalWorkedSeconds,
      totalWorkedFormatted:
        totalWorkedSeconds != null ? formatSecondsAsHHMMSS(totalWorkedSeconds) : null,
      totalPauseSeconds,
      totalPauseFormatted: formatSecondsAsHHMMSS(totalPauseSeconds),
    });
  }

  // ordenar por fecha ascendente
  days.sort((a, b) => (a.date < b.date ? -1 : 1));

  return {
    worker,
    range: { from: fromStr, to: toStr },
    days,
  };
}

module.exports = {
  getCompanySummary,
  getCompanySummaryCsv,
  getWorkerDaily,          
};