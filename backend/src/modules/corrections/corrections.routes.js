const express = require('express');
const controller = require('./corrections.controller');
const { authMiddleware } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/roles');

const router = express.Router();

router.use(authMiddleware);

// Endpoint simulado para disparar el proceso automático (Sistema)
router.post('/run-check', requireRole(['SUPER_ADMIN', 'CLIENT_ADMIN']), controller.runSystemCheck);

// Rutas ADMIN
router.get('/admin/pending', requireRole(['CLIENT_ADMIN', 'SUPER_ADMIN']), controller.listPending);
router.patch('/admin/:id/notify', requireRole(['CLIENT_ADMIN', 'SUPER_ADMIN']), controller.notifyWorker);

// Rutas WORKER
router.get('/worker/pending', requireRole(['WORKER']), controller.listMyPending);
router.patch('/worker/:id/submit', requireRole(['WORKER']), controller.submitCorrection);

module.exports = router;