const service = require('./corrections.service');

// 1. (Simulación) Endpoint para que el sistema detecte y cree los provisionales
async function runSystemCheck(req, res) {
  try {
    const count = await service.checkAndInsertProvisional();
    res.json({ message: `Proceso finalizado. Se generaron ${count} correcciones.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// 2. ADMIN: Listar faltas pendientes de revisión
async function listPending(req, res) {
  try {
    const items = await service.listMissingClockOuts({ requester: req.user });
    res.json(items);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

// 3. ADMIN: Notificar al trabajador (Aprobar que corrija)
async function notifyWorker(req, res) {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;
    const result = await service.enableWorkerCorrection({
      admin: req.user,
      missingId: id,
      adminNotes
    });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

// 4. WORKER: Listar sus correcciones pendientes
async function listMyPending(req, res) {
  try {
    const items = await service.listWorkerPendingCorrections({ worker: req.user });
    res.json(items);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

// 5. WORKER: Enviar la corrección manual
async function submitCorrection(req, res) {
  try {
    const { id } = req.params;
    const { manualTime, reason } = req.body; // manualTime string "HH:MM"
    const result = await service.submitWorkerCorrection({
      worker: req.user,
      missingId: id,
      manualTimeStr: manualTime,
      reason
    });
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ message: err.message });
  }
}

module.exports = {
  runSystemCheck,
  listPending,
  notifyWorker,
  listMyPending,
  submitCorrection
};