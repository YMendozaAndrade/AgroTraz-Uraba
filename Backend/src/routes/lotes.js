const express = require('express');
const pool = require('../db');
const { verificarToken, requiereRol } = require('../middleware/auth');

const router = express.Router();

router.use(verificarToken);

const rolesGestion = requiereRol('administrador', 'gerente', 'agronomo');

router.get('/', async (req, res) => {
  const { id_finca } = req.query;
  try {
    let query = `
      SELECT l.id_lote, l.id_finca, f.nombre AS finca, l.nombre, l.tipo_siembra, l.area_hectareas,
             l.densidad_plantas, l.poligono_geojson, l.estado, l.activo, l.created_at, l.updated_at,
             (SELECT a.fecha_fin_carencia FROM aplicaciones a
               WHERE a.id_lote = l.id_lote
                 AND a.fecha_aplicacion <= CURDATE()
                 AND a.fecha_fin_carencia >= CURDATE()
               ORDER BY a.fecha_fin_carencia DESC LIMIT 1) AS carencia_hasta,
             (SELECT q.nombre FROM aplicaciones a
               JOIN agroquimicos q ON q.id_agroquimico = a.id_agroquimico
               WHERE a.id_lote = l.id_lote
                 AND a.fecha_aplicacion <= CURDATE()
                 AND a.fecha_fin_carencia >= CURDATE()
               ORDER BY a.fecha_fin_carencia DESC LIMIT 1) AS carencia_agroquimico,
             (SELECT a.id_aplicacion FROM aplicaciones a
               WHERE a.id_lote = l.id_lote
                 AND a.fecha_aplicacion <= CURDATE()
                 AND a.fecha_fin_carencia >= CURDATE()
               ORDER BY a.fecha_fin_carencia DESC LIMIT 1) AS id_aplicacion_carencia
      FROM lotes l
      JOIN fincas f ON f.id_finca = l.id_finca
    `;
    const params = [];

    if (req.usuario.rol !== 'administrador' && req.usuario.rol !== 'gerente') {
      query += `
        JOIN usuario_finca uf ON uf.id_finca = l.id_finca
        WHERE uf.id_usuario = ? AND l.activo = TRUE`;
      params.push(req.usuario.id_usuario);
      if (id_finca) {
        query += ' AND l.id_finca = ?';
        params.push(id_finca);
      }
    } else if (id_finca) {
      query += ' WHERE l.id_finca = ?';
      params.push(id_finca);
    }

    query += ' ORDER BY f.nombre, l.nombre';
    const [rows] = await pool.query(query, params);

    const lotes = rows.map((l) => {
      let estadoEfectivo = l.estado;
      if (l.estado === 'disponible' && l.carencia_hasta) {
        estadoEfectivo = 'carencia';
      }
      return { ...l, estado_efectivo: estadoEfectivo };
    });

    res.json({ status: 'ok', lotes });
  } catch (err) {
    console.error('Error listando lotes:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

router.post('/', rolesGestion, async (req, res) => {
  const { id_finca, nombre, tipo_siembra, area_hectareas, densidad_plantas, poligono_geojson, estado } = req.body;

  if (!id_finca || !nombre || !tipo_siembra) {
    return res.status(400).json({ status: 'error', message: 'id_finca, nombre y tipo_siembra son obligatorios' });
  }

  if (!['banano', 'platano'].includes(tipo_siembra)) {
    return res.status(400).json({ status: 'error', message: 'tipo_siembra debe ser banano o platano' });
  }

  if (estado && !['disponible', 'restringido', 'cuarentena'].includes(estado)) {
    return res.status(400).json({ status: 'error', message: 'estado inválido' });
  }

  if (typeof nombre !== 'string' || nombre.trim().length < 2) {
    return res.status(400).json({ status: 'error', message: 'El nombre del lote debe tener al menos 2 caracteres' });
  }

  if (area_hectareas != null && area_hectareas !== '' && (Number.isNaN(Number(area_hectareas)) || Number(area_hectareas) <= 0)) {
    return res.status(400).json({ status: 'error', message: 'area_hectareas debe ser un número positivo' });
  }

  if (densidad_plantas != null && densidad_plantas !== '' && (Number.isNaN(Number(densidad_plantas)) || Number(densidad_plantas) <= 0)) {
    return res.status(400).json({ status: 'error', message: 'densidad_plantas debe ser un número positivo' });
  }

  try {
    const [finca] = await pool.query('SELECT id_finca FROM fincas WHERE id_finca = ? AND activo = TRUE', [id_finca]);
    if (finca.length === 0) {
      return res.status(404).json({ status: 'error', message: 'La finca no existe o está inactiva' });
    }

    const [existe] = await pool.query('SELECT id_lote FROM lotes WHERE id_finca = ? AND nombre = ?', [id_finca, nombre]);
    if (existe.length > 0) {
      return res.status(409).json({ status: 'error', message: 'Ya existe un lote con ese nombre en la finca' });
    }

    const [result] = await pool.query(
      `INSERT INTO lotes (id_finca, nombre, tipo_siembra, area_hectareas, densidad_plantas, poligono_geojson, estado)
       VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), ?)`,
      [id_finca, nombre, tipo_siembra, area_hectareas || null, densidad_plantas || null, poligono_geojson || null, estado || 'disponible']
    );

    const [nuevo] = await pool.query('SELECT * FROM lotes WHERE id_lote = ?', [result.insertId]);
    res.status(201).json({ status: 'ok', message: 'Lote creado', lote: nuevo[0] });
  } catch (err) {
    console.error('Error creando lote:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

const ESTADOS = ['disponible', 'restringido', 'cuarentena'];

router.put('/:id', rolesGestion, async (req, res) => {
  const { id } = req.params;
  const { nombre, tipo_siembra, area_hectareas, densidad_plantas, poligono_geojson, estado } = req.body;

  try {
    const [existe] = await pool.query('SELECT * FROM lotes WHERE id_lote = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Lote no encontrado' });
    }

    if (tipo_siembra && !['banano', 'platano'].includes(tipo_siembra)) {
      return res.status(400).json({ status: 'error', message: 'tipo_siembra debe ser banano o platano' });
    }

    if (estado && !ESTADOS.includes(estado)) {
      return res.status(400).json({ status: 'error', message: 'estado inválido' });
    }

    const nuevoNombre = nombre ?? existe[0].nombre;
    if (typeof nuevoNombre !== 'string' || nuevoNombre.trim().length < 2) {
      return res.status(400).json({ status: 'error', message: 'El nombre del lote debe tener al menos 2 caracteres' });
    }

    const [dup] = await pool.query('SELECT id_lote FROM lotes WHERE id_lote <> ? AND id_finca = ? AND nombre = ?', [
      id, existe[0].id_finca, nuevoNombre
    ]);
    if (dup.length > 0) {
      return res.status(409).json({ status: 'error', message: 'Ya existe un lote con ese nombre en la finca' });
    }

    const nuevaArea = area_hectareas ?? existe[0].area_hectareas;
    const nuevaDensidad = densidad_plantas ?? existe[0].densidad_plantas;
    if (nuevaArea != null && nuevaArea !== '' && (Number.isNaN(Number(nuevaArea)) || Number(nuevaArea) <= 0)) {
      return res.status(400).json({ status: 'error', message: 'area_hectareas debe ser un número positivo' });
    }
    if (nuevaDensidad != null && nuevaDensidad !== '' && (Number.isNaN(Number(nuevaDensidad)) || Number(nuevaDensidad) <= 0)) {
      return res.status(400).json({ status: 'error', message: 'densidad_plantas debe ser un número positivo' });
    }

    await pool.query(
      `UPDATE lotes SET
         nombre = ?, tipo_siembra = ?, area_hectareas = ?, densidad_plantas = ?,
         poligono_geojson = CAST(? AS JSON), estado = ?
       WHERE id_lote = ?`,
      [
        nuevoNombre.trim(),
        tipo_siembra ?? existe[0].tipo_siembra,
        nuevaArea,
        nuevaDensidad,
        poligono_geojson !== undefined ? poligono_geojson : existe[0].poligono_geojson,
        estado ?? existe[0].estado,
        id
      ]
    );

    const [actualizado] = await pool.query('SELECT * FROM lotes WHERE id_lote = ?', [id]);
    res.json({ status: 'ok', message: 'Lote actualizado', lote: actualizado[0] });
  } catch (err) {
    console.error('Error actualizando lote:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

router.delete('/:id', rolesGestion, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('UPDATE lotes SET activo = FALSE WHERE id_lote = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'Lote no encontrado' });
    }
    res.json({ status: 'ok', message: 'Lote desactivado' });
  } catch (err) {
    console.error('Error desactivando lote:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

module.exports = router;