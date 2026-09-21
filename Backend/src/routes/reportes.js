const express = require('express');
const pool = require('../db');
const { verificarToken, requiereRol } = require('../middleware/auth');

const router = express.Router();

function parseJson(v) {
  if (v == null) return null;
  if (typeof v === 'string') {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  }
  return v;
}

router.use(verificarToken);

const rolesGestion = requiereRol('administrador', 'gerente', 'agronomo');
const rolesEliminar = requiereRol('administrador', 'gerente');

// Listar historial de reportes generados
router.get('/', requiereRol('administrador', 'gerente', 'agronomo'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.id_reporte, r.tipo_reporte, r.titulo, r.desde, r.hasta,
              r.id_finca, f.nombre AS finca, r.resumen, r.generado_por, u.nombre AS generado_por_nombre,
              r.created_at
       FROM reportes r
       LEFT JOIN fincas f ON f.id_finca = r.id_finca
       LEFT JOIN usuarios u ON u.id_usuario = r.generado_por
       ORDER BY r.created_at DESC, r.id_reporte DESC`
    );
    const reportes = rows.map((r) => ({
      ...r,
      resumen: parseJson(r.resumen)
    }));
    res.json({ status: 'ok', reportes });
  } catch (err) {
    console.error('Error listando reportes:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// Obtener un reporte con su detalle
router.get('/:id', requiereRol('administrador', 'gerente', 'agronomo'), async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      `SELECT r.*, f.nombre AS finca, u.nombre AS generado_por_nombre
       FROM reportes r
       LEFT JOIN fincas f ON f.id_finca = r.id_finca
       LEFT JOIN usuarios u ON u.id_usuario = r.generado_por
       WHERE r.id_reporte = ?`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Reporte no encontrado' });
    }
    const r = rows[0];
    res.json({
      status: 'ok',
      reporte: {
        ...r,
        resumen: parseJson(r.resumen),
        detalle: parseJson(r.detalle)
      }
    });
  } catch (err) {
    console.error('Error consultando reporte:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// Guardar un reporte generado
router.post('/', rolesGestion, async (req, res) => {
  const { tipo_reporte, titulo, desde, hasta, id_finca, resumen, detalle } = req.body;

  if (!tipo_reporte || !titulo) {
    return res.status(400).json({ status: 'error', message: 'tipo_reporte y titulo son obligatorios' });
  }

  const tiposValidos = ['produccion', 'fitosanitario', 'trazabilidad', 'inventario'];
  if (!tiposValidos.includes(tipo_reporte)) {
    return res.status(400).json({ status: 'error', message: 'tipo_reporte inválido' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO reportes
        (tipo_reporte, titulo, desde, hasta, id_finca, resumen, detalle, generado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tipo_reporte,
        titulo,
        desde || null,
        hasta || null,
        id_finca || null,
        resumen ? JSON.stringify(resumen) : null,
        detalle ? JSON.stringify(detalle) : null,
        req.usuario.id_usuario
      ]
    );
    const [nuevo] = await pool.query('SELECT * FROM reportes WHERE id_reporte = ?', [result.insertId]);
    res.status(201).json({ status: 'ok', message: 'Reporte guardado', reporte: nuevo[0] });
  } catch (err) {
    console.error('Error guardando reporte:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// Eliminar un reporte del historial
router.delete('/:id', rolesEliminar, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM reportes WHERE id_reporte = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'Reporte no encontrado' });
    }
    res.json({ status: 'ok', message: 'Reporte eliminado' });
  } catch (err) {
    console.error('Error eliminando reporte:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

module.exports = router;