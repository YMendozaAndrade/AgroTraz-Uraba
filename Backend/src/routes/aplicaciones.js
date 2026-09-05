const express = require('express');
const pool = require('../db');
const { verificarToken, requiereRol } = require('../middleware/auth');

const router = express.Router();

router.use(verificarToken);

const rolesGestion = requiereRol('administrador', 'gerente', 'agronomo');

function calcularFinCarencia(fechaAplicacion, diasCarencia) {
  const fecha = new Date(`${fechaAplicacion}T00:00:00`);
  fecha.setDate(fecha.getDate() + Number(diasCarencia));
  return fecha.toISOString().slice(0, 10);
}

router.get('/', async (req, res) => {
  const { id_lote } = req.query;
  try {
    let query = `
      SELECT a.id_aplicacion, a.id_lote, l.nombre AS lote, f.nombre AS finca,
             a.id_agroquimico, q.nombre AS agroquimico, q.registro_ica, q.dias_carencia,
             a.id_usuario, u.nombre AS registrado_por, a.fecha_aplicacion, a.dosis_aplicada,
             a.fecha_fin_carencia, a.observaciones, a.created_at, a.updated_at
      FROM aplicaciones a
      JOIN lotes l ON l.id_lote = a.id_lote
      JOIN fincas f ON f.id_finca = l.id_finca
      JOIN agroquimicos q ON q.id_agroquimico = a.id_agroquimico
      JOIN usuarios u ON u.id_usuario = a.id_usuario
    `;
    const params = [];

    if (req.usuario.rol !== 'administrador' && req.usuario.rol !== 'gerente') {
      query += `
        JOIN usuario_finca uf ON uf.id_finca = l.id_finca
        WHERE uf.id_usuario = ?`;
      params.push(req.usuario.id_usuario);
      if (id_lote) {
        query += ' AND a.id_lote = ?';
        params.push(id_lote);
      }
    } else if (id_lote) {
      query += ' WHERE a.id_lote = ?';
      params.push(id_lote);
    }

    query += ' ORDER BY a.fecha_aplicacion DESC, a.id_aplicacion DESC';
    const [rows] = await pool.query(query, params);
    res.json({ status: 'ok', aplicaciones: rows });
  } catch (err) {
    console.error('Error listando aplicaciones:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

router.post('/', rolesGestion, async (req, res) => {
  const { id_lote, id_agroquimico, fecha_aplicacion, dosis_aplicada, observaciones } = req.body;

  if (!id_lote || !id_agroquimico || !fecha_aplicacion) {
    return res.status(400).json({ status: 'error', message: 'id_lote, id_agroquimico y fecha_aplicacion son obligatorios' });
  }

  try {
    const [lote] = await pool.query('SELECT id_lote FROM lotes WHERE id_lote = ? AND activo = TRUE', [id_lote]);
    if (lote.length === 0) {
      return res.status(404).json({ status: 'error', message: 'El lote no existe o está inactivo' });
    }

    const [agroquimico] = await pool.query('SELECT id_agroquimico, dias_carencia FROM agroquimicos WHERE id_agroquimico = ? AND activo = TRUE', [id_agroquimico]);
    if (agroquimico.length === 0) {
      return res.status(404).json({ status: 'error', message: 'El agroquímico no existe o está inactivo' });
    }

    const fechaFinCarencia = calcularFinCarencia(fecha_aplicacion, agroquimico[0].dias_carencia);

    const [result] = await pool.query(
      `INSERT INTO aplicaciones (id_lote, id_agroquimico, id_usuario, fecha_aplicacion, dosis_aplicada, fecha_fin_carencia, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id_lote, id_agroquimico, req.usuario.id_usuario, fecha_aplicacion, dosis_aplicada || null, fechaFinCarencia, observaciones || null]
    );

    const [nueva] = await pool.query(
      `SELECT a.*, l.nombre AS lote, q.nombre AS agroquimico, q.dias_carencia
       FROM aplicaciones a
       JOIN lotes l ON l.id_lote = a.id_lote
       JOIN agroquimicos q ON q.id_agroquimico = a.id_agroquimico
       WHERE a.id_aplicacion = ?`,
      [result.insertId]
    );

    res.status(201).json({
      status: 'ok',
      message: 'Aplicación registrada',
      aplicacion: nueva[0],
      fecha_fin_carencia: fechaFinCarencia
    });
  } catch (err) {
    console.error('Error creando aplicación:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

router.put('/:id', rolesGestion, async (req, res) => {
  const { id } = req.params;
  const { id_lote, id_agroquimico, fecha_aplicacion, dosis_aplicada, observaciones } = req.body;

  try {
    const [existe] = await pool.query('SELECT * FROM aplicaciones WHERE id_aplicacion = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Aplicación no encontrada' });
    }

    const loteId = id_lote ?? existe[0].id_lote;
    const agroId = id_agroquimico ?? existe[0].id_agroquimico;
    const fecha = fecha_aplicacion ?? existe[0].fecha_aplicacion;

    const [agroquimico] = await pool.query('SELECT dias_carencia FROM agroquimicos WHERE id_agroquimico = ?', [agroId]);
    if (agroquimico.length === 0) {
      return res.status(404).json({ status: 'error', message: 'El agroquímico no existe' });
    }

    const fechaFinCarencia = calcularFinCarencia(fecha, agroquimico[0].dias_carencia);

    await pool.query(
      `UPDATE aplicaciones SET
         id_lote = ?, id_agroquimico = ?, fecha_aplicacion = ?, dosis_aplicada = ?, fecha_fin_carencia = ?, observaciones = ?
       WHERE id_aplicacion = ?`,
      [loteId, agroId, fecha, dosis_aplicada ?? existe[0].dosis_aplicada, fechaFinCarencia, observaciones ?? existe[0].observaciones, id]
    );

    const [actualizada] = await pool.query(
      `SELECT a.*, l.nombre AS lote, q.nombre AS agroquimico, q.dias_carencia
       FROM aplicaciones a
       JOIN lotes l ON l.id_lote = a.id_lote
       JOIN agroquimicos q ON q.id_agroquimico = a.id_agroquimico
       WHERE a.id_aplicacion = ?`,
      [id]
    );

    res.json({ status: 'ok', message: 'Aplicación actualizada', aplicacion: actualizada[0] });
  } catch (err) {
    console.error('Error actualizando aplicación:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

router.delete('/:id', rolesGestion, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM aplicaciones WHERE id_aplicacion = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'Aplicación no encontrada' });
    }
    res.json({ status: 'ok', message: 'Aplicación eliminada' });
  } catch (err) {
    console.error('Error eliminando aplicación:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

module.exports = router;