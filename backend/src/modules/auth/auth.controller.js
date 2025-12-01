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

// 🔑 POST /api/auth/master-reset (sin login, con clave maestra)
async function masterResetPassword(req, res) {
  try {
    const { email, newPassword, masterKey } = req.body;
    const result = await authService.masterResetPassword({
      email,
      newPassword,
      masterKey,
    });
    return res.json(result);
  } catch (err) {
    console.error('Master reset error:', err);
    const status = err.status || 500;
    const message = err.message || 'Error al restablecer la contraseña';
    return res.status(status).json({ message });
  }
}

// 🔒 POST /api/auth/change-password (requiere login)
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword, masterKey } = req.body;
    const userId = req.user.id;

    const result = await authService.changePassword({
      userId,
      currentPassword,
      newPassword,
      masterKey,
    });

    return res.json(result);
  } catch (err) {
    console.error('Change password error:', err);
    const status = err.status || 500;
    const message = err.message || 'Error al cambiar la contraseña';
    return res.status(status).json({ message });
  }
}

module.exports = {
  login,
  me,
  masterResetPassword,
  changePassword,
};
