// backend/src/modules/admin/workers/workers.controller.js
const workersService = require('./workers.service');

async function list(req, res) {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const workers = await workersService.listWorkers({
      requester: req.user,
      includeInactive,
    });
    res.json(workers);
  } catch (err) {
    console.error('List workers error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Error al listar trabajadores' });
  }
}

async function create(req, res) {
  try {
    const worker = await workersService.createWorker({
      requester: req.user,
      data: req.body,
    });
    res.status(201).json(worker);
  } catch (err) {
    console.error('Create worker error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Error al crear trabajador' });
  }
}

async function getOne(req, res) {
  try {
    const worker = await workersService.getWorker({
      requester: req.user,
      workerId: req.params.id,
    });
    res.json(worker);
  } catch (err) {
    console.error('Get worker error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Error al obtener trabajador' });
  }
}

async function update(req, res) {
  try {
    const worker = await workersService.updateWorker({
      requester: req.user,
      workerId: req.params.id,
      data: req.body,
    });
    res.json(worker);
  } catch (err) {
    console.error('Update worker error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Error al actualizar trabajador' });
  }
}

async function setStatus(req, res) {
  try {
    const { isActive } = req.body;
    const worker = await workersService.setWorkerStatus({
      requester: req.user,
      workerId: req.params.id,
      isActive,
    });
    res.json(worker);
  } catch (err) {
    console.error('Set worker status error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Error al cambiar estado' });
  }
}

module.exports = {
  list,
  create,
  getOne,
  update,
  setStatus,
};
