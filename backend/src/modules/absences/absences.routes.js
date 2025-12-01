// backend/src/modules/absences/absences.routes.js
const express = require('express');
const controller = require('./absences.controller');
const { authMiddleware } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/roles');

const router = express.Router();

// Solo trabajadores
router.use(authMiddleware);
router.use(requireRole(['WORKER']));

router.post('/requests', controller.createRequest);
router.get('/my-requests', controller.listMine);

module.exports = router;
