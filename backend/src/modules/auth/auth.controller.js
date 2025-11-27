// backend/src/modules/auth/auth.controller.js
const authService = require('./auth.service');

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email y password son obligatorios' });
    }

    const result = await authService.login({ email, password });
    return res.json(result);
  } catch (err) {
    console.error('Login error:', err);

    const status = err.status || 500;
    const message = err.message || 'Error en el login';
    return res.status(status).json({ message });
  }
}

async function me(req, res) {
  try {
    const userId = req.user.id;
    const profile = await authService.getProfile(userId);
    return res.json(profile);
  } catch (err) {
    console.error('Me error:', err);
    const status = err.status || 500;
    const message = err.message || 'Error al obtener el perfil';
    return res.status(status).json({ message });
  }
}

module.exports = {
  login,
  me,
};
