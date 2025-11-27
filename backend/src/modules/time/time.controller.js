// backend/src/modules/time/time.controller.js
const timeService = require('./time.service');

async function createEvent(req, res) {
  try {
    const { type, reason } = req.body;
    const { id: userId, companyId } = req.user;

    const event = await timeService.registerEvent({
      userId,
      companyId,
      type,
      reason,
    });

    return res.status(201).json(event);
  } catch (err) {
    console.error('Time event error:', err);
    const status = err.status || 500;
    const message = err.message || 'Error al registrar evento de tiempo';
    return res.status(status).json({ message });
  }
}

async function getMyTodayEvents(req, res) {
  try {
    const { id: userId } = req.user;
    const data = await timeService.getTodayEventsForUser(userId);
    return res.json(data);
  } catch (err) {
    console.error('Get today events error:', err);
    const status = err.status || 500;
    const message = err.message || 'Error al obtener los fichajes de hoy';
    return res.status(status).json({ message });
  }
}

async function getMyHistory(req, res) {
  try {
    const { id: userId } = req.user;
    const days = parseInt(req.query.days || '7', 10);
    const history = await timeService.getHistoryForUser(userId, days);
    return res.json(history);
  } catch (err) {
    console.error('Get history error:', err);
    const status = err.status || 500;
    const message = err.message || 'Error al obtener el historial de fichajes';
    return res.status(status).json({ message });
  }
}

module.exports = {
  createEvent,
  getMyTodayEvents,
  getMyHistory,
};
