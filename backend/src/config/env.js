// backend/src/config/env.js
const dotenv = require('dotenv');

dotenv.config();

const env = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret',
  NODE_ENV: process.env.NODE_ENV || 'development',
};

module.exports = env;
