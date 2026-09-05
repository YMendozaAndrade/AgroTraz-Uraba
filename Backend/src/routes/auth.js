const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { generarToken } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { nombre, email, password, telefono, rol } = req.body;

  if (!nombre || !email || !password || !rol) {
    return res.status(400).json({ status: 'error', message: 'nombre, email, password y rol son obligatorios' });
  }

  try {
    const [rolRows] = await pool.query('SELECT id, nombre FROM roles WHERE nombre = ?', [rol]);
    if (rolRows.length === 0) {
      return res.status(400).json({ status: 'error', message: 'El rol no existe' });
    }
    const rolId = rolRows[0].id;

    const [existe] = await pool.query('SELECT id_usuario FROM usuarios WHERE email = ?', [email]);
    if (existe.length > 0) {
      return res.status(409).json({ status: 'error', message: 'El email ya está registrado' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO usuarios (nombre, email, password_hash, telefono, rol_id, activo) VALUES (?, ?, ?, ?, ?, TRUE)',
      [nombre, email, passwordHash, telefono || null, rolId]
    );

    res.status(201).json({
      status: 'ok',
      message: 'Usuario registrado correctamente',
      usuario: { id_usuario: result.insertId, nombre, email, telefono: telefono || null, rol }
    });
  } catch (err) {
    console.error('Error en register:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ status: 'error', message: 'email y password son obligatorios' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.email, u.password_hash, u.telefono, u.activo, r.nombre AS rol
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       WHERE u.email = ?`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ status: 'error', message: 'Credenciales inválidas' });
    }

    const usuario = rows[0];

    if (!usuario.activo) {
      return res.status(403).json({ status: 'error', message: 'Usuario desactivado. Contacte al administrador' });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({ status: 'error', message: 'Credenciales inválidas' });
    }

    const token = generarToken(usuario);

    res.json({
      status: 'ok',
      message: 'Inicio de sesión exitoso',
      token,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        email: usuario.email,
        telefono: usuario.telefono,
        rol: usuario.rol
      }
    });
  } catch (err) {
    console.error('Error en login:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

module.exports = router;