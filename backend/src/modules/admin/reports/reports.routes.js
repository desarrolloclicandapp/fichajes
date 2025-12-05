// backend/src/modules/admin/reports/reports.routes.js
const express = require('express');
const controller = require('./reports.controller');
const { authMiddleware } = require('../../../middlewares/auth');
const { requireRole } = require('../../../middlewares/roles');

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole(['CLIENT_ADMIN', 'SUPER_ADMIN']));

// GET /api/admin/reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/summary', controller.summary);

// GET /api/admin/reports/export.csv?from=...&to=...
router.get('/export.csv', controller.exportCsv);

// GET /api/admin/reports/summary
router.get('/summary', controller.summary);

// GET /api/admin/reports/export.csv
router.get('/export.csv', controller.exportCsv);

//  detalle diario por trabajador
// GET /api/admin/reports/worker/:userId/daily?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/worker/:userId/daily', controller.dailyByWorker);
//  Reporte de log completo (todos los eventos)
// GET /api/admin/reports/full-log?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/full-log', controller.fullEventLog);

module.exports = router;

module.exports = router;
