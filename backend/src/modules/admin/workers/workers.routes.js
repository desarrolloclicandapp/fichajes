// backend/src/modules/admin/workers/workers.routes.js
const express = require('express');
const controller = require('./workers.controller');
const { authMiddleware } = require('../../../middlewares/auth');
const { requireRole } = require('../../../middlewares/roles');

const router = express.Router();

// Sólo CLIENT_ADMIN y SUPER_ADMIN
router.use(authMiddleware);
router.use(requireRole(['CLIENT_ADMIN', 'SUPER_ADMIN']));

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getOne);
router.put('/:id', controller.update);
router.patch('/:id/status', controller.setStatus);

module.exports = router;
