// backend/src/modules/time/time.routes.js
const express = require('express');
const controller = require('./time.controller');
const { authMiddleware } = require('../../middlewares/auth');
const { requireRole } = require('../../middlewares/roles');
const { TimeEventType } = require('@prisma/client');

const router = express.Router();

// Todas estas rutas requieren estar logueado como WORKER o CLIENT_ADMIN (por si un admin ficha a alguien desde panel)
router.use(authMiddleware);
router.use(requireRole(['WORKER', 'CLIENT_ADMIN', 'SUPER_ADMIN']));

// Ruta genérica para registrar un tipo de evento
router.post('/event', controller.createEvent);

// Helpers específicos (más cómodos desde el frontend)
router.post('/clock-in', (req, res, next) => {
  req.body.type = TimeEventType.CLOCK_IN;
  return controller.createEvent(req, res, next);
});

router.post('/break-start', (req, res, next) => {
  req.body.type = TimeEventType.BREAK_START;
  return controller.createEvent(req, res, next);
});

router.post('/break-end', (req, res, next) => {
  req.body.type = TimeEventType.BREAK_END;
  return controller.createEvent(req, res, next);
});

router.post('/clock-out', (req, res, next) => {
  req.body.type = TimeEventType.CLOCK_OUT;
  return controller.createEvent(req, res, next);
});

// Ver mis eventos de hoy
router.get('/my-today', controller.getMyTodayEvents);

module.exports = router;
