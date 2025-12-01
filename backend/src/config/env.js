// backend/src/config/env.js
const dotenv = require('dotenv');

dotenv.config();

const env = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // 🔑 Claves maestras (pueden ser null si no las configuras)
  MASTER_KEY_WORKER: process.env.MASTER_KEY_WORKER || null,
  MASTER_KEY_CLIENT: process.env.MASTER_KEY_CLIENT || null,
  MASTER_KEY_SUPER: process.env.MASTER_KEY_SUPER || null,
};

module.exports = env;
