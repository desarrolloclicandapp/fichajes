// backend/src/modules/admin/logs/logs.controller.js
const logsService = require('./logs.service');

// Controller para listar Eventos de Tiempo (función existente del frontend)
async function listTimeEvents(req, res) {
  try {
    const { from, to, userId, type } = req.query;

    const events = await logsService.listTimeEvents({
      requester: req.user,
      fromStr: from,
      toStr: to,
      userId,
      type,
    });
    res.json(events);
  } catch (err) {
    console.error('List time events error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Error al listar eventos de tiempo' });
  }
}

// 🆕 Controller para listar Logs de Ausencias
async function listAbsenceLogs(req, res) {
  try {
    const { from, to, userId, status } = req.query;

    const logs = await logsService.listAbsenceLogs({
      requester: req.user,
      fromStr: from,
      toStr: to,
      userId,
      status,
    });
    res.json(logs);
  } catch (err) {
    console.error('List absence logs error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Error al listar logs de ausencias' });
  }
}


module.exports = {
  listTimeEvents, // Asegúrate que esta línea esté presente
  listAbsenceLogs, // Asegúrate que esta línea esté presente
};