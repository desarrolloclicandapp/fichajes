// backend/src/modules/time/time.controller.js
const { TimeEventType } = require('@prisma/client');
const timeService = require('./time.service');

async function createEvent(req, res) {
  try {
    const { type } = req.body;
    const { id: userId, companyId } = req.user;

    const event = await timeService.registerEvent({
      userId,
      companyId,
      type,
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

    const events = await timeService.getTodayEventsForUser(userId);
    return res.json(events);
  } catch (err) {
    console.error('Get today events error:', err);
    const status = err.status || 500;
    const message = err.message || 'Error al obtener los fichajes de hoy';
    return res.status(status).json({ message });
  }
}

module.exports = {
  createEvent,
  getMyTodayEvents,
};
