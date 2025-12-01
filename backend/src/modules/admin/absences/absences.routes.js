// backend/src/modules/admin/absences/absences.routes.js
const express = require('express');
const controller = require('./absences.controller');
const { authMiddleware } = require('../../../middlewares/auth');
const { requireRole } = require('../../../middlewares/roles');

const router = express.Router();

// Sólo CLIENT_ADMIN y SUPER_ADMIN
router.use(authMiddleware);
router.use(requireRole(['CLIENT_ADMIN', 'SUPER_ADMIN']));

// GET /api/admin/absences/requests?status=PENDING
// Listar todas las solicitudes de ausencia de la empresa (con filtro de estado opcional)
router.get('/requests', controller.listCompanyRequests);

// PATCH /api/admin/absences/requests/:id/status
// Aprobar o rechazar una solicitud específica
router.patch('/requests/:id/status', controller.updateRequestStatus);

module.exports = router;