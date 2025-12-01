// backend/src/app.js
const express = require('express');
const cors = require('cors');
const path = require('path');

const env = require('./config/env');

// Rutas módulos
const authRoutes = require('./modules/auth/auth.routes');
const timeRoutes = require('./modules/time/time.routes');

// 🆕 módulos admin
const adminWorkersRoutes = require('./modules/admin/workers/workers.routes');
const adminReportsRoutes = require('./modules/admin/reports/reports.routes');
const adminLogsRoutes = require('./modules/admin/logs/logs.routes');
//super
const superCompaniesRoutes = require('./modules/super/companies/companies.routes');
const absencesRoutes = require('./modules/absences/absences.routes');

const app = express();

app.use(cors());
app.use(express.json());

// servir frontend estático
app.use(express.static(path.join(__dirname, '..', '..', 'frontend', 'public')));

// 🆕 RUTA RAÍZ: Redirigir a login.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', '..', 'frontend', 'public', 'login.html'));
});

// healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: env.NODE_ENV });
});

// Rutas API// Ausencias de trabajador
app.use('/api/worker/absences', absencesRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/time', timeRoutes);

// 🆕 rutas admin
app.use('/api/admin/workers', adminWorkersRoutes);
app.use('/api/admin/reports', adminReportsRoutes);
app.use('/api/admin/logs', adminLogsRoutes);
//super
app.use('/api/super/companies', superCompaniesRoutes);
// 404 por defecto
app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

app.listen(env.PORT, () => {
  console.log(`✅ API escuchando en http://localhost:${env.PORT}`);
});