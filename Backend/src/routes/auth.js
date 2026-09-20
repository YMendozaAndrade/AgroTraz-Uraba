const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { generarToken, verificarToken } = require('../middleware/auth');

const router = express.Router();

const ROLES_AUTORREGISTRO = ['evaluador_campo', 'operador_empacadora'];

function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post('/register', async (req, res) => {
  const { nombre, email, password, telefono, rol } = req.body;

  if (!nombre || !email || !password || !rol) {
    return res.status(400).json({ status: 'error', message: 'nombre, email, password y rol son obligatorios' });
  }

  if (typeof nombre !== 'string' || nombre.trim().length < 3 || nombre.trim().length > 120) {
    return res.status(400).json({ status: 'error', message: 'El nombre debe tener entre 3 y 120 caracteres' });
  }

  if (!validarEmail(email) || email.length > 120) {
    return res.status(400).json({ status: 'error', message: 'El correo electrónico no es válido' });
  }

  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ status: 'error', message: 'La contraseña debe tener al menos 6 caracteres' });
  }

  if (!ROLES_AUTORREGISTRO.includes(rol)) {
    return res.status(403).json({
      status: 'error',
      message: 'No puede registrarse con ese rol. Los roles administrativos los crea un administrador'
    });
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

router.post('/cambiar-password', verificarToken, async (req, res) => {
  const { password_actual, password_nueva } = req.body;

  if (typeof password_actual !== 'string' || password_actual.length === 0) {
    return res.status(400).json({ status: 'error', message: 'La contraseña actual es obligatoria' });
  }
  if (typeof password_nueva !== 'string' || password_nueva.length < 6) {
    return res.status(400).json({ status: 'error', message: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }
  if (password_nueva === password_actual) {
    return res.status(400).json({ status: 'error', message: 'La nueva contraseña debe ser diferente a la actual' });
  }

  try {
    const [rows] = await pool.query('SELECT password_hash FROM usuarios WHERE id_usuario = ?', [req.usuario.id_usuario]);
    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
    }

    const valida = await bcrypt.compare(password_actual, rows[0].password_hash);
    if (!valida) {
      return res.status(400).json({ status: 'error', message: 'La contraseña actual es incorrecta' });
    }

    const passwordHash = await bcrypt.hash(password_nueva, 10);
    await pool.query('UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?', [passwordHash, req.usuario.id_usuario]);

    res.json({ status: 'ok', message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error('Error en cambiar-password:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

module.exports = router;