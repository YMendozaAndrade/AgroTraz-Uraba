const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { verificarToken, requiereRol } = require('../middleware/auth');

const router = express.Router();

router.use(verificarToken, requiereRol('administrador', 'gerente'));

router.get('/', async (req, res) => {
  const { incluir_inactivos } = req.query;
  try {
    const [rows] = await pool.query(
      `SELECT u.id_usuario, u.nombre, u.email, u.telefono, u.activo, r.nombre AS rol
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       ${incluir_inactivos === 'true' ? '' : 'WHERE u.activo = TRUE'}
       ORDER BY u.activo DESC, u.nombre`
    );
    res.json({ status: 'ok', usuarios: rows });
  } catch (err) {
    console.error('Error listando usuarios:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

const ROLES_GESTION = ['administrador', 'gerente', 'agronomo', 'evaluador_campo', 'operador_empacadora'];

/**
 * Activa o desactiva un usuario.
 * Ruta restringida a administrador/gerente (router.use).
 */
router.put('/:id/estado', async (req, res) => {
  const { id } = req.params;
  const { activo } = req.body;

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ status: 'error', message: 'Identificador inválido' });
  }
  if (typeof activo !== 'boolean') {
    return res.status(400).json({ status: 'error', message: 'El campo activo debe ser booleano' });
  }
  if (Number(id) === req.usuario.id_usuario) {
    return res.status(400).json({ status: 'error', message: 'No puede desactivar su propia cuenta' });
  }

  try {
    const [existe] = await pool.query(
      `SELECT u.id_usuario, r.nombre AS rol FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.id_usuario = ?`,
      [id]
    );
    if (existe.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
    }

    // Un gerente no puede modificar a un administrador
    if (existe[0].rol === 'administrador' && req.usuario.rol !== 'administrador') {
      return res.status(403).json({ status: 'error', message: 'Solo un administrador puede modificar a otro administrador' });
    }

    await pool.query('UPDATE usuarios SET activo = ? WHERE id_usuario = ?', [activo ? 1 : 0, id]);

    res.json({
      status: 'ok',
      message: activo ? 'Usuario activado correctamente' : 'Usuario desactivado correctamente',
      usuario: { id_usuario: Number(id), activo }
    });
  } catch (err) {
    console.error('Error cambiando estado de usuario:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

/**
 * Cambia el rol de un usuario.
 * La ruta ya está restringida a administrador/gerente (router.use).
 * Solo un administrador puede asignar el rol de administrador.
 */
router.put('/:id/rol', async (req, res) => {
  const { id } = req.params;
  const { rol } = req.body;

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ status: 'error', message: 'Identificador inválido' });
  }
  if (!ROLES_GESTION.includes(rol)) {
    return res.status(400).json({ status: 'error', message: 'El rol no es válido' });
  }
  if (Number(id) === req.usuario.id_usuario) {
    return res.status(400).json({ status: 'error', message: 'No puede cambiar su propio rol' });
  }
  if (rol === 'administrador' && req.usuario.rol !== 'administrador') {
    return res.status(403).json({ status: 'error', message: 'Solo un administrador puede asignar el rol de administrador' });
  }

  try {
    const [existe] = await pool.query(
      `SELECT u.id_usuario, r.nombre AS rol FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.id_usuario = ?`,
      [id]
    );
    if (existe.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Usuario no encontrado' });
    }

    // Un gerente no puede modificar a un administrador
    if (existe[0].rol === 'administrador' && req.usuario.rol !== 'administrador') {
      return res.status(403).json({ status: 'error', message: 'Solo un administrador puede modificar a otro administrador' });
    }

    const [rolRows] = await pool.query('SELECT id FROM roles WHERE nombre = ?', [rol]);
    if (rolRows.length === 0) {
      return res.status(400).json({ status: 'error', message: 'El rol no existe' });
    }

    await pool.query('UPDATE usuarios SET rol_id = ? WHERE id_usuario = ?', [rolRows[0].id, id]);

    res.json({
      status: 'ok',
      message: 'Rol actualizado correctamente',
      usuario: { id_usuario: Number(id), rol }
    });
  } catch (err) {
    console.error('Error cambiando rol de usuario:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

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