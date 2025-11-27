// backend/src/modules/time/time.routes.js
const express = require('express');
const controller = require('./time.controller');
const { authMiddleware } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/roles');
const { TimeEventType } = require('@prisma/client');

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole(['WORKER', 'CLIENT_ADMIN', 'SUPER_ADMIN']));

router.post('/event', controller.createEvent);

router.post('/clock-in', (req, res, next) => {
  req.body.type = TimeEventType.CLOCK_IN;
  controller.createEvent(req, res, next);
});

router.post('/break-start', (req, res, next) => {
  req.body.type = TimeEventType.BREAK_START;
  controller.createEvent(req, res, next);
});

router.post('/break-end', (req, res, next) => {
  req.body.type = TimeEventType.BREAK_END;
  controller.createEvent(req, res, next);
});

router.post('/clock-out', (req, res, next) => {
  req.body.type = TimeEventType.CLOCK_OUT;
  controller.createEvent(req, res, next);
});

// hoy
router.get('/my-today', controller.getMyTodayEvents);

// últimos días
router.get('/my-history', controller.getMyHistory);

module.exports = router;
