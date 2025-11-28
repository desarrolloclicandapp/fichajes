const express = require('express');
const controller = require('./companies.controller');
const { authMiddleware } = require('../../../middlewares/auth');
const { requireRole } = require('../../../middlewares/roles');

const router = express.Router();

// Solo SUPER_ADMIN
router.use(authMiddleware);
router.use(requireRole(['SUPER_ADMIN']));

router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getOne);
router.put('/:id', controller.update);
router.patch('/:id/status', controller.setStatus);
router.get('/:id/admins', controller.listAdmins);
router.post('/:id/admins', controller.createAdmin);

module.exports = router;
