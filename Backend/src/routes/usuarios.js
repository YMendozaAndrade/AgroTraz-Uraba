const express = require('express');
const bcrypt = require('bcryptjs');
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

const ROLES_GESTION = ['administrador', 'gerente', 'agronomo', 'evaluador_campo', 'operador_empacadora'];

router.post('/', async (req, res) => {
  const { nombre, email, password, telefono, rol } = req.body;

  if (!nombre || !email || !password || !rol) {
    return res.status(400).json({ status: 'error', message: 'nombre, email, password y rol son obligatorios' });
  }

  if (typeof nombre !== 'string' || nombre.trim().length < 3 || nombre.trim().length > 120) {
    return res.status(400).json({ status: 'error', message: 'El nombre debe tener entre 3 y 120 caracteres' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) {
    return res.status(400).json({ status: 'error', message: 'El correo electrónico no es válido' });
  }

  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ status: 'error', message: 'La contraseña debe tener al menos 6 caracteres' });
  }

  if (!ROLES_GESTION.includes(rol)) {
    return res.status(400).json({ status: 'error', message: 'El rol no es válido' });
  }

  if (rol === 'administrador' && req.usuario.rol !== 'administrador') {
    return res.status(403).json({ status: 'error', message: 'Solo un administrador puede crear otros administradores' });
  }

  try {
    const [existe] = await pool.query('SELECT id_usuario FROM usuarios WHERE email = ?', [email]);
    if (existe.length > 0) {
      return res.status(409).json({ status: 'error', message: 'El email ya está registrado' });
    }

    const [rolRows] = await pool.query('SELECT id FROM roles WHERE nombre = ?', [rol]);
    if (rolRows.length === 0) {
      return res.status(400).json({ status: 'error', message: 'El rol no existe' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre, email, password_hash, telefono, rol_id, activo) VALUES (?, ?, ?, ?, ?, TRUE)',
      [nombre.trim(), email, passwordHash, telefono || null, rolRows[0].id]
    );

    res.status(201).json({
      status: 'ok',
      message: 'Usuario creado correctamente',
      usuario: { id_usuario: result.insertId, nombre: nombre.trim(), email, telefono: telefono || null, rol }
    });
  } catch (err) {
    console.error('Error creando usuario:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

module.exports = router;