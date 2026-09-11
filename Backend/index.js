const express = require('express');
const cors = require('cors');
const pool = require('./src/db');
const authRoutes = require('./src/routes/auth');
const fincasRoutes = require('./src/routes/fincas');
const lotesRoutes = require('./src/routes/lotes');
const usuariosRoutes = require('./src/routes/usuarios');
const usuarioFincaRoutes = require('./src/routes/usuarioFinca');
const agroquimicosRoutes = require('./src/routes/agroquimicos');
const aplicacionesRoutes = require('./src/routes/aplicaciones');
const ordenesCorteRoutes = require('./src/routes/ordenesCorte');
const evaluacionesRoutes = require('./src/routes/evaluaciones');
const qrCajasRoutes = require('./src/routes/qrCajas');
const reportesRoutes = require('./src/routes/reportes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/fincas', fincasRoutes);
app.use('/api/lotes', lotesRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/asignaciones', usuarioFincaRoutes);
app.use('/api/agroquimicos', agroquimicosRoutes);
app.use('/api/aplicaciones', aplicacionesRoutes);
app.use('/api/ordenes-corte', ordenesCorteRoutes);
app.use('/api/evaluaciones', evaluacionesRoutes);
app.use('/api/qr', qrCajasRoutes);
app.use('/api/reportes', reportesRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'API AgroTraz Uraba' });
});

app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS resultado');
    res.json({ status: 'ok', db: 'conectada', resultado: rows[0].resultado });
  } catch (err) {
    console.error('Error de conexión a la BD:', err.message);
    res.status(500).json({ status: 'error', db: 'no conectada', error: 'Error de conexión con la base de datos' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor AgroTraz Uraba corriendo en http://localhost:${PORT}`);
  console.log(`MariaDB/MySQL en ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
});