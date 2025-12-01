// backend/src/modules/absences/absences.controller.js
const service = require('./absences.service');

async function createRequest(req, res) {
  try {
    const result = await service.createAbsenceRequest({
      requester: req.user,
      data: req.body,
    });
    res.status(201).json(result);
  } catch (err) {
    console.error('Create absence request error:', err);
    res
      .status(err.status || 500)
      .json({ message: err.message || 'Error al registrar la ausencia' });
  }
}

async function listMine(req, res) {
  try {
    const items = await service.listMyAbsences({
      requester: req.user,
    });
    res.json(items);
  } catch (err) {
    console.error('List my absences error:', err);
    res
      .status(err.status || 500)
      .json({ message: err.message || 'Error al obtener tus ausencias' });
  }
}

module.exports = {
  createRequest,
  listMine,
};
