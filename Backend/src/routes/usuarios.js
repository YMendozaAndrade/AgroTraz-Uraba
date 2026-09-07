const express = require('express');
const pool = require('../db');
const { verificarToken, requiereRol } = require('../middleware/auth');

const router = express.Router();

router.use(verificarToken, requiereRol('administrador', 'gerente'));

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.email, u.telefono, u.activo, r.nombre AS rol
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       WHERE u.activo = TRUE
       ORDER BY u.nombre`
    );
    res.json({ status: 'ok', usuarios: rows });
  } catch (err) {
    console.error('Error listando usuarios:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

module.exports = router;