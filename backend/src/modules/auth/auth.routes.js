const express = require('express');
const controller = require('./auth.controller');
const { authMiddleware } = require('../../middlewares/auth');

const router = express.Router();

// Login normal
router.post('/login', controller.login);

// Perfil
router.get('/me', authMiddleware, controller.me);

// 🔑 Reset con clave maestra (sin login, se usa desde "Olvidé mi contraseña")
router.post('/master-reset', controller.masterResetPassword);

// 🔒 Cambio de contraseña estando logueado (paneles)
router.post('/change-password', authMiddleware, controller.changePassword);

module.exports = router;
