// backend/src/modules/auth/auth.routes.js
const express = require('express');
const controller = require('./auth.controller');
const { authMiddleware } = require('../../middlewares/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', controller.login);

// GET /api/auth/me
router.get('/me', authMiddleware, controller.me);

module.exports = router;
