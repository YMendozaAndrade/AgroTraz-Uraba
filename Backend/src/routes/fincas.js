const express = require('express');
const pool = require('../db');
const { verificarToken, requiereRol } = require('../middleware/auth');

const router = express.Router();

router.use(verificarToken);

const rolesGestion = requiereRol('administrador', 'gerente');

router.get('/', async (req, res) => {
  try {
    let rows;
    if (req.usuario.rol === 'administrador' || req.usuario.rol === 'gerente') {
      [rows] = await pool.query(
        `SELECT f.id_finca, f.nombre, f.codigo_ica, f.municipio, f.departamento, f.direccion,
                f.area_hectareas, f.encargado_responsable, f.observaciones, f.activo,
                f.created_at, f.updated_at
         FROM fincas f ORDER BY f.nombre`
      );
    } else {
      [rows] = await pool.query(
        `SELECT f.id_finca, f.nombre, f.codigo_ica, f.municipio, f.departamento, f.direccion,
                f.area_hectareas, f.encargado_responsable, f.observaciones, f.activo,
                f.created_at, f.updated_at
         FROM fincas f
         JOIN usuario_finca uf ON uf.id_finca = f.id_finca
         WHERE uf.id_usuario = ? AND f.activo = TRUE
         ORDER BY f.nombre`,
        [req.usuario.id_usuario]
      );
    }
    res.json({ status: 'ok', fincas: rows });
  } catch (err) {
    console.error('Error listando fincas:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

router.post('/', rolesGestion, async (req, res) => {
  const { nombre, codigo_ica, municipio, departamento, direccion, area_hectareas, encargado_responsable, poligono_geojson, observaciones } = req.body;

  if (!nombre || !codigo_ica) {
    return res.status(400).json({ status: 'error', message: 'nombre y codigo_ica son obligatorios' });
  }

  try {
    const [existe] = await pool.query('SELECT id_finca FROM fincas WHERE codigo_ica = ?', [codigo_ica]);
    if (existe.length > 0) {
      return res.status(409).json({ status: 'error', message: 'Ya existe una finca con ese código ICA' });
    }

    const [result] = await pool.query(
      `INSERT INTO fincas
        (nombre, codigo_ica, municipio, departamento, direccion, area_hectareas, encargado_responsable, poligono_geojson, observaciones)
       VALUES (?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?)`,
      [
        nombre,
        codigo_ica,
        municipio || null,
        departamento || 'Antioquia',
        direccion || null,
        area_hectareas || null,
        encargado_responsable || null,
        poligono_geojson || null,
        observaciones || null
      ]
    );

    const [nueva] = await pool.query('SELECT * FROM fincas WHERE id_finca = ?', [result.insertId]);

    if (req.usuario.rol === 'administrador' && req.body.id_usuario) {
      await pool.query(
        'INSERT IGNORE INTO usuario_finca (id_usuario, id_finca, creado_por) VALUES (?, ?, ?)',
        [req.body.id_usuario, result.insertId, req.usuario.id_usuario]
      );
    }

    res.status(201).json({ status: 'ok', message: 'Finca creada', finca: nueva[0] });
  } catch (err) {
    console.error('Error creando finca:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

router.put('/:id', rolesGestion, async (req, res) => {
  const { id } = req.params;
  const { nombre, codigo_ica, municipio, departamento, direccion, area_hectareas, encargado_responsable, poligono_geojson, observaciones } = req.body;

  try {
    const [existe] = await pool.query('SELECT * FROM fincas WHERE id_finca = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Finca no encontrada' });
    }

    const nuevoCodigo = codigo_ica ?? existe[0].codigo_ica;
    const [dup] = await pool.query('SELECT id_finca FROM fincas WHERE id_finca <> ? AND codigo_ica = ?', [id, nuevoCodigo]);
    if (dup.length > 0) {
      return res.status(409).json({ status: 'error', message: 'Ya existe otra finca con ese código ICA' });
    }

    const nuevaArea = area_hectareas ?? existe[0].area_hectareas;
    if (nuevaArea != null && nuevaArea !== '' && (Number.isNaN(Number(nuevaArea)) || Number(nuevaArea) <= 0)) {
      return res.status(400).json({ status: 'error', message: 'area_hectareas debe ser un número positivo' });
    }

    await pool.query(
      `UPDATE fincas SET
         nombre = ?, codigo_ica = ?, municipio = ?, departamento = ?, direccion = ?,
         area_hectareas = ?, encargado_responsable = ?, poligono_geojson = CAST(? AS JSON), observaciones = ?
       WHERE id_finca = ?`,
      [
        nombre ?? existe[0].nombre,
        nuevoCodigo,
        municipio ?? existe[0].municipio,
        departamento ?? existe[0].departamento,
        direccion ?? existe[0].direccion,
        nuevaArea,
        encargado_responsable ?? existe[0].encargado_responsable,
        poligono_geojson ?? existe[0].poligono_geojson,
        observaciones ?? existe[0].observaciones,
        id
      ]
    );

    const [actualizada] = await pool.query('SELECT * FROM fincas WHERE id_finca = ?', [id]);
    res.json({ status: 'ok', message: 'Finca actualizada', finca: actualizada[0] });
  } catch (err) {
    console.error('Error actualizando finca:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

router.delete('/:id', rolesGestion, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('UPDATE fincas SET activo = FALSE WHERE id_finca = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'Finca no encontrada' });
    }
    res.json({ status: 'ok', message: 'Finca desactivada' });
  } catch (err) {
    console.error('Error desactivando finca:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

module.exports = router;