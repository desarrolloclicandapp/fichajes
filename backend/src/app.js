// backend/src/app.js
const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const timeRoutes = require('./modules/time/time.routes');


// Rutas
const authRoutes = require('./modules/auth/auth.routes');

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());


// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: env.NODE_ENV });
});

// Rutas de módulos
app.use('/api/auth', authRoutes);
// aquí luego: app.use('/api/companies', companyRoutes); etc.

// Middleware de ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

// Middleware de error genérico (por si algo se escapa)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

// Levantar servidor
app.listen(env.PORT, () => {
  console.log(`✅ API escuchando en http://localhost:${env.PORT}`);
});

app.use('/api/auth', authRoutes);
app.use('/api/time', timeRoutes)