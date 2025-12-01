// backend/src/modules/admin/absences/absences.controller.js
const service = require('./absences.service');

async function listCompanyRequests(req, res) {
  try {
    const { status } = req.query; // para filtrar por estado (PENDING, APPROVED, REJECTED)
    const items = await service.listCompanyAbsenceRequests({
      requester: req.user,
      statusFilter: status,
    });
    res.json(items);
  } catch (err) {
    console.error('List company absences error:', err);
    res
      .status(err.status || 500)
      .json({ message: err.message || 'Error al obtener las solicitudes de ausencia' });
  }
}

async function updateRequestStatus(req, res) {
  try {
    const { status, adminComment, finalType } = req.body;
    const result = await service.updateAbsenceRequestStatus({
      requester: req.user,
      requestId: req.params.id,
      status, // 'APPROVED' or 'REJECTED'
      adminComment,
      finalType, // Opcional, solo si el admin lo cambia
    });
    res.json(result);
  } catch (err) {
    console.error('Update absence request status error:', err);
    res
      .status(err.status || 500)
      .json({ message: err.message || 'Error al actualizar el estado de la solicitud' });
  }
}

module.exports = {
  listCompanyRequests,
  updateRequestStatus,
};