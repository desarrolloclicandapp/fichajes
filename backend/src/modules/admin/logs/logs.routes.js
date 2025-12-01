// backend/src/modules/admin/logs/logs.routes.js
const express = require('express');
const controller = require('./logs.controller');
const { authMiddleware } = require('../../../middlewares/auth');
const { requireRole } = require('../../../middlewares/roles');

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole(['CLIENT_ADMIN', 'SUPER_ADMIN']));

// GET /api/admin/logs/time-events (usado por el frontend actual)
router.get('/time-events', controller.listTimeEvents);

// 🆕 Nueva ruta para logs de ausencias
// GET /api/admin/logs/absences
router.get('/absences', controller.listAbsenceLogs); 

module.exports = router;