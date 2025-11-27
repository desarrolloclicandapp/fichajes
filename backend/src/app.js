const express = require('express');
const cors = require('cors');
const env = require('./config/env');

const authRoutes = require('./modules/auth/auth.routes');
const timeRoutes = require('./modules/time/time.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', env: env.NODE_ENV });
});

app.use('/api/auth', authRoutes);
app.use('/api/time', timeRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

app.listen(env.PORT, () => {
  console.log(`✅ API escuchando en http://localhost:${env.PORT}`);
});
