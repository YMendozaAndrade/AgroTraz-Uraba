const express = require('express');
const pool = require('../db');
const { verificarToken, requiereRol } = require('../middleware/auth');

const router = express.Router();

router.use(verificarToken);

const rolesGestion = requiereRol('administrador', 'gerente', 'agronomo');
const rolesEliminar = requiereRol('administrador', 'gerente');

const ESTADOS = ['programada', 'ejecutada', 'cancelada'];

async function validarLoteParaCorte(idLote, fechaCorte) {
  const [lotes] = await pool.query(
    'SELECT id_lote, nombre, estado, activo FROM lotes WHERE id_lote = ?',
    [idLote]
  );
  if (lotes.length === 0) {
    return { ok: false, message: 'El lote no existe' };
  }
  const lote = lotes[0];

  if (!lote.activo) {
    return { ok: false, message: 'El lote está inactivo' };
  }

  if (lote.estado === 'restringido') {
    return { ok: false, message: `El lote "${lote.nombre}" está RESTRINGIDO (carencia activa). No se puede generar orden de corte` };
  }
  if (lote.estado === 'cuarentena') {
    return { ok: false, message: `El lote "${lote.nombre}" está EN CUARENTENA (foco fitosanitario). No se puede generar orden de corte` };
  }

  const [carencias] = await pool.query(
    `SELECT a.fecha_aplicacion, a.fecha_fin_carencia, q.nombre AS agroquimico
     FROM aplicaciones a
     JOIN agroquimicos q ON q.id_agroquimico = a.id_agroquimico
     WHERE a.id_lote = ?`,
    [idLote]
  );

  if (carencias.length > 0 && fechaCorte) {
    const enCarencia = carencias.find(
      (c) => fechaCorte >= c.fecha_aplicacion.toISOString().slice(0, 10) &&
             fechaCorte <= c.fecha_fin_carencia.toISOString().slice(0, 10)
    );
    if (enCarencia) {
      const fin = enCarencia.fecha_fin_carencia.toISOString().slice(0, 10);
      return {
        ok: false,
        message: `El lote "${lote.nombre}" está en CARENCIA hasta el ${fin} (${enCarencia.agroquimico}). La fecha de corte (${fechaCorte}) está bloqueada automáticamente`
      };
    }
  }

  return { ok: true, lote };
}

router.get('/', async (req, res) => {
  const { id_lote } = req.query;
  try {
    let query = `
      SELECT oc.id_orden_corte, oc.id_lote, l.nombre AS lote, f.nombre AS finca,
             oc.id_usuario, u.nombre AS generada_por, oc.fecha_orden, oc.fecha_corte,
             oc.estado, oc.observaciones, oc.created_at, oc.updated_at
      FROM ordenes_corte oc
      JOIN lotes l ON l.id_lote = oc.id_lote
      JOIN fincas f ON f.id_finca = l.id_finca
      JOIN usuarios u ON u.id_usuario = oc.id_usuario
    `;
    const params = [];

    if (req.usuario.rol !== 'administrador' && req.usuario.rol !== 'gerente') {
      query += `
        JOIN usuario_finca uf ON uf.id_finca = l.id_finca
        WHERE uf.id_usuario = ?`;
      params.push(req.usuario.id_usuario);
      if (id_lote) {
        query += ' AND oc.id_lote = ?';
        params.push(id_lote);
      }
    } else if (id_lote) {
      query += ' WHERE oc.id_lote = ?';
      params.push(id_lote);
    }

    query += ' ORDER BY oc.fecha_orden DESC, oc.id_orden_corte DESC';
    const [rows] = await pool.query(query, params);
    res.json({ status: 'ok', ordenes: rows });
  } catch (err) {
    console.error('Error listando órdenes:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

router.post('/', rolesGestion, async (req, res) => {
  const { id_lote, fecha_corte, observaciones } = req.body;

  if (!id_lote || !fecha_corte) {
    return res.status(400).json({ status: 'error', message: 'id_lote y fecha_corte son obligatorios' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_corte)) {
    return res.status(400).json({ status: 'error', message: 'fecha_corte debe tener formato YYYY-MM-DD' });
  }

  try {
    const validacion = await validarLoteParaCorte(id_lote, fecha_corte);
    if (!validacion.ok) {
      return res.status(409).json({ status: 'error', message: validacion.message });
    }

    const [result] = await pool.query(
      `INSERT INTO ordenes_corte (id_lote, id_usuario, fecha_orden, fecha_corte, estado, observaciones)
       VALUES (?, ?, CURDATE(), ?, 'programada', ?)`,
      [id_lote, req.usuario.id_usuario, fecha_corte, observaciones || null]
    );

    const [nueva] = await pool.query(
      `SELECT oc.*, l.nombre AS lote, f.nombre AS finca
       FROM ordenes_corte oc
       JOIN lotes l ON l.id_lote = oc.id_lote
       JOIN fincas f ON f.id_finca = l.id_finca
       WHERE oc.id_orden_corte = ?`,
      [result.insertId]
    );

    res.status(201).json({ status: 'ok', message: 'Orden de corte generada', orden: nueva[0] });
  } catch (err) {
    console.error('Error creando orden:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

router.put('/:id', rolesGestion, async (req, res) => {
  const { id } = req.params;
  const { fecha_corte, estado, observaciones } = req.body;

  try {
    const [existe] = await pool.query('SELECT * FROM ordenes_corte WHERE id_orden_corte = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Orden no encontrada' });
    }

    if (estado && !ESTADOS.includes(estado)) {
      return res.status(400).json({ status: 'error', message: 'estado inválido' });
    }

    if (fecha_corte && !/^\d{4}-\d{2}-\d{2}$/.test(fecha_corte)) {
      return res.status(400).json({ status: 'error', message: 'fecha_corte debe tener formato YYYY-MM-DD' });
    }

    const anterior = existe[0].estado;
    const nuevoEstado = estado ?? anterior;

    const TRANSICIONES = {
      programada: ['ejecutada', 'cancelada', 'programada'],
      ejecutada: ['ejecutada'],
      cancelada: ['cancelada']
    };

    if (!TRANSICIONES[anterior] || !TRANSICIONES[anterior].includes(nuevoEstado)) {
      return res.status(409).json({
        status: 'error',
        message: `Transición inválida: una orden ${anterior} no puede pasar a ${nuevoEstado}`
      });
    }

    const nuevaFecha = fecha_corte ?? existe[0].fecha_corte;

    if (anterior === 'programada' || nuevoEstado === 'programada') {
      const validacion = await validarLoteParaCorte(existe[0].id_lote, nuevaFecha);
      if (!validacion.ok) {
        return res.status(409).json({ status: 'error', message: validacion.message });
      }
    }

    await pool.query(
      'UPDATE ordenes_corte SET fecha_corte = ?, estado = ?, observaciones = ? WHERE id_orden_corte = ?',
      [nuevaFecha, nuevoEstado, observaciones ?? existe[0].observaciones, id]
    );

    const [actualizada] = await pool.query(
      `SELECT oc.*, l.nombre AS lote, f.nombre AS finca
       FROM ordenes_corte oc
       JOIN lotes l ON l.id_lote = oc.id_lote
       JOIN fincas f ON f.id_finca = l.id_finca
       WHERE oc.id_orden_corte = ?`,
      [id]
    );

    res.json({ status: 'ok', message: 'Orden actualizada', orden: actualizada[0] });
  } catch (err) {
    console.error('Error actualizando orden:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

router.delete('/:id', rolesEliminar, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM ordenes_corte WHERE id_orden_corte = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'Orden no encontrada' });
    }
    res.json({ status: 'ok', message: 'Orden eliminada' });
  } catch (err) {
    console.error('Error eliminando orden:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

module.exports = router;