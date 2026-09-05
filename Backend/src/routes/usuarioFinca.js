const express = require('express');
const pool = require('../db');
const { verificarToken, requiereRol } = require('../middleware/auth');

const router = express.Router();

router.use(verificarToken, requiereRol('administrador', 'gerente'));

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT uf.id_usuario_finca, uf.id_finca, f.nombre AS finca,
              uf.id_usuario, u.nombre AS usuario, r.nombre AS rol
       FROM usuario_finca uf
       JOIN fincas f ON f.id_finca = uf.id_finca
       JOIN usuarios u ON u.id_usuario = uf.id_usuario
       JOIN roles r ON r.id = u.rol_id
       ORDER BY f.nombre, u.nombre`
    );
    res.json({ status: 'ok', asignaciones: rows });
  } catch (err) {
    console.error('Error listando asignaciones:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

router.post('/', async (req, res) => {
  const { id_usuario, id_finca } = req.body;

  if (!id_usuario || !id_finca) {
    return res.status(400).json({ status: 'error', message: 'id_usuario e id_finca son obligatorios' });
  }

  try {
    const [usuario] = await pool.query('SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND activo = TRUE', [id_usuario]);
    if (usuario.length === 0) {
      return res.status(404).json({ status: 'error', message: 'El usuario no existe o está inactivo' });
    }
    const [finca] = await pool.query('SELECT id_finca FROM fincas WHERE id_finca = ? AND activo = TRUE', [id_finca]);
    if (finca.length === 0) {
      return res.status(404).json({ status: 'error', message: 'La finca no existe o está inactiva' });
    }

    const [result] = await pool.query(
      'INSERT IGNORE INTO usuario_finca (id_usuario, id_finca, creado_por) VALUES (?, ?, ?)',
      [id_usuario, id_finca, req.usuario.id_usuario]
    );

    if (result.affectedRows === 0) {
      return res.status(409).json({ status: 'error', message: 'El usuario ya está asignado a esa finca' });
    }

    res.status(201).json({ status: 'ok', message: 'Usuario asignado a la finca' });
  } catch (err) {
    console.error('Error asignando usuario:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

router.delete('/:id_usuario/:id_finca', async (req, res) => {
  const { id_usuario, id_finca } = req.params;
  try {
    const [result] = await pool.query(
      'DELETE FROM usuario_finca WHERE id_usuario = ? AND id_finca = ?',
      [id_usuario, id_finca]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'Asignación no encontrada' });
    }
    res.json({ status: 'ok', message: 'Asignación eliminada' });
  } catch (err) {
    console.error('Error quitando asignación:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

module.exports = router;