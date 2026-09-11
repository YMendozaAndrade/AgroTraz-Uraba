const express = require('express');
const pool = require('../db');
const { verificarToken, requiereRol } = require('../middleware/auth');

const router = express.Router();

router.use(verificarToken);

const rolesGestion = requiereRol('administrador', 'gerente', 'agronomo', 'evaluador_campo');

const TIPOS = ['sigatoka', 'moko_fusarium', 'picudo'];

const UMBRALES = {
  sigatoka_severidad_critica: 30,
  moko_presencia_severidad_min: 0,
  picudo_adultos_critico: 10
};

const JERARQUIA_ESTADO = { disponible: 0, restringido: 1, cuarentena: 2 };

function estadoRecomendado(tipo, { indice_severidad, numero_adultos }) {
  if (tipo === 'moko_fusarium') {
    if (indice_severidad > UMBRALES.moko_presencia_severidad_min) return 'cuarentena';
    return 'disponible';
  }
  if (tipo === 'sigatoka') {
    if (indice_severidad > UMBRALES.sigatoka_severidad_critica) return 'restringido';
    return 'disponible';
  }
  if (tipo === 'picudo') {
    if (numero_adultos > UMBRALES.picudo_adultos_critico) return 'restringido';
    return 'disponible';
  }
  return null;
}

// Recalcula el estado del lote a partir de las evaluaciones más recientes por tipo.
async function recalcularEstado(idLote) {
  const [filas] = await pool.query(
    `SELECT e.tipo_evaluacion, e.fecha_evaluacion, e.yha, e.indice_severidad, e.numero_adultos
     FROM evaluaciones e
     WHERE e.id_lote = ?
     ORDER BY e.fecha_evaluacion DESC, e.id_evaluacion DESC`,
    [idLote]
  );
  if (filas.length === 0) return null;

  const ultimasPorTipo = {};
  filas.forEach((f) => {
    if (!ultimasPorTipo[f.tipo_evaluacion]) {
      ultimasPorTipo[f.tipo_evaluacion] = f;
    }
  });

  const recomendados = Object.values(ultimasPorTipo).map((f) =>
    estadoRecomendado(f.tipo_evaluacion, f) || 'disponible'
  );

  return recomendados.reduce(
    (masAlto, r) => (JERARQUIA_ESTADO[r] > JERARQUIA_ESTADO[masAlto] ? r : masAlto),
    'disponible'
  );
}

async function aplicarTransicionEstado(idLote) {
  const recomendado = await recalcularEstado(idLote);
  if (!recomendado) return null;

  const [lotes] = await pool.query('SELECT estado FROM lotes WHERE id_lote = ?', [idLote]);
  if (lotes.length === 0) return null;
  const actual = lotes[0].estado;

  if (recomendado === actual) return null;

  await pool.query('UPDATE lotes SET estado = ? WHERE id_lote = ?', [recomendado, idLote]);
  return recomendado;
}

function limpiarBody(body) {
  const {
    id_lote, tipo_evaluacion, fecha_evaluacion, hora_evaluacion,
    latitud, longitud, fotografia_url, yha, indice_severidad, numero_adultos, sincronizada
  } = body;

  const data = {
    id_lote: id_lote ? Number(id_lote) : null,
    tipo_evaluacion,
    fecha_evaluacion,
    hora_evaluacion: hora_evaluacion || null,
    latitud: latitud != null && latitud !== '' ? Number(latitud) : null,
    longitud: longitud != null && longitud !== '' ? Number(longitud) : null,
    fotografia_url: fotografia_url || null,
    yha: yha != null && yha !== '' ? Number(yha) : null,
    indice_severidad: indice_severidad != null && indice_severidad !== '' ? Number(indice_severidad) : null,
    numero_adultos: numero_adultos != null && numero_adultos !== '' ? Number(numero_adultos) : null,
    sincronizada: sincronizada != null ? (sincronizada ? 1 : 0) : 0
  };
  return data;
}

function validarCampos(data) {
  if (!data.id_lote || !data.tipo_evaluacion || !data.fecha_evaluacion) {
    return 'id_lote, tipo_evaluacion y fecha_evaluacion son obligatorios';
  }
  if (!TIPOS.includes(data.tipo_evaluacion)) {
    return 'tipo_evaluacion inválido (use sigatoka, moko_fusarium o picudo)';
  }
  if (data.tipo_evaluacion === 'sigatoka' && (data.yha == null || data.indice_severidad == null)) {
    return 'Para evaluaciones de Sigatoka, yha (hoja más joven afectada) e indice_severidad son obligatorios';
  }
  if (data.tipo_evaluacion === 'picudo' && data.numero_adultos == null) {
    return 'Para evaluaciones de Picudo, numero_adultos (captura en trampas) es obligatorio';
  }
  return null;
}

router.get('/', async (req, res) => {
  const { id_lote } = req.query;
  try {
    let query = `
      SELECT e.id_evaluacion, e.id_lote, l.nombre AS lote, f.nombre AS finca,
             e.id_usuario, u.nombre AS evaluador, e.tipo_evaluacion, e.fecha_evaluacion,
             e.hora_evaluacion, e.latitud, e.longitud, e.fotografia_url,
             e.yha, e.indice_severidad, e.numero_adultos, e.sincronizada,
             e.created_at, e.updated_at
      FROM evaluaciones e
      JOIN lotes l ON l.id_lote = e.id_lote
      JOIN fincas f ON f.id_finca = l.id_finca
      JOIN usuarios u ON u.id_usuario = e.id_usuario
    `;
    const params = [];

    if (req.usuario.rol !== 'administrador' && req.usuario.rol !== 'gerente') {
      query += `
        JOIN usuario_finca uf ON uf.id_finca = l.id_finca
        WHERE uf.id_usuario = ?`;
      params.push(req.usuario.id_usuario);
      if (id_lote) {
        query += ' AND e.id_lote = ?';
        params.push(id_lote);
      }
    } else if (id_lote) {
      query += ' WHERE e.id_lote = ?';
      params.push(id_lote);
    }

    query += ' ORDER BY e.fecha_evaluacion DESC, e.id_evaluacion DESC';
    const [rows] = await pool.query(query, params);
    res.json({ status: 'ok', evaluaciones: rows });
  } catch (err) {
    console.error('Error listando evaluaciones:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

router.post('/', rolesGestion, async (req, res) => {
  const data = limpiarBody(req.body);
  const error = validarCampos(data);
  if (error) {
    return res.status(400).json({ status: 'error', message: error });
  }

  try {
    const [lotes] = await pool.query('SELECT activo FROM lotes WHERE id_lote = ?', [data.id_lote]);
    if (lotes.length === 0) {
      return res.status(404).json({ status: 'error', message: 'El lote no existe' });
    }
    if (!lotes[0].activo) {
      return res.status(409).json({ status: 'error', message: 'El lote está inactivo y no puede evaluarse' });
    }

    const [result] = await pool.query(
      `INSERT INTO evaluaciones
       (id_lote, id_usuario, tipo_evaluacion, fecha_evaluacion, hora_evaluacion,
        latitud, longitud, fotografia_url, yha, indice_severidad, numero_adultos, sincronizada)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.id_lote, req.usuario.id_usuario, data.tipo_evaluacion, data.fecha_evaluacion,
       data.hora_evaluacion, data.latitud, data.longitud, data.fotografia_url,
       data.yha, data.indice_severidad, data.numero_adultos, data.sincronizada]
    );

    const transicion = await aplicarTransicionEstado(data.id_lote);

    const [nueva] = await pool.query(
      `SELECT e.*, l.nombre AS lote, f.nombre AS finca, u.nombre AS evaluador
       FROM evaluaciones e
       JOIN lotes l ON l.id_lote = e.id_lote
       JOIN fincas f ON f.id_finca = l.id_finca
       JOIN usuarios u ON u.id_usuario = e.id_usuario
       WHERE e.id_evaluacion = ?`,
      [result.insertId]
    );

    res.status(201).json({
      status: 'ok',
      message: transicion ? `El estado del lote se actualizó a: ${transicion}` : 'Evaluación registrada',
      evaluacion: nueva[0],
      transicion
    });
  } catch (err) {
    console.error('Error creando evaluación:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

router.put('/:id', rolesGestion, async (req, res) => {
  const { id } = req.params;
  const data = limpiarBody(req.body);

  try {
    const [existe] = await pool.query('SELECT * FROM evaluaciones WHERE id_evaluacion = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Evaluación no encontrada' });
    }

    const merged = {
      ...data,
      id_lote: data.id_lote ?? existe[0].id_lote,
      tipo_evaluacion: data.tipo_evaluacion ?? existe[0].tipo_evaluacion,
      fecha_evaluacion: data.fecha_evaluacion ?? existe[0].fecha_evaluacion,
      hora_evaluacion: data.hora_evaluacion ?? existe[0].hora_evaluacion,
      latitud: data.latitud ?? existe[0].latitud,
      longitud: data.longitud ?? existe[0].longitud,
      fotografia_url: data.fotografia_url ?? existe[0].fotografia_url,
      yha: data.yha ?? existe[0].yha,
      indice_severidad: data.indice_severidad ?? existe[0].indice_severidad,
      numero_adultos: data.numero_adultos ?? existe[0].numero_adultos
    };
    const error = validarCampos(merged);
    if (error) {
      return res.status(400).json({ status: 'error', message: error });
    }

    await pool.query(
      `UPDATE evaluaciones SET
         id_lote = ?, tipo_evaluacion = ?, fecha_evaluacion = ?, hora_evaluacion = ?,
         latitud = ?, longitud = ?, fotografia_url = ?, yha = ?, indice_severidad = ?,
         numero_adultos = ?, sincronizada = ?
       WHERE id_evaluacion = ?`,
      [merged.id_lote, merged.tipo_evaluacion, merged.fecha_evaluacion,
       merged.hora_evaluacion, merged.latitud, merged.longitud, merged.fotografia_url,
       merged.yha, merged.indice_severidad, merged.numero_adultos, merged.sincronizada, id]
    );

    const transicion = await aplicarTransicionEstado(merged.id_lote);

    const [actualizada] = await pool.query(
      `SELECT e.*, l.nombre AS lote, f.nombre AS finca, u.nombre AS evaluador
       FROM evaluaciones e
       JOIN lotes l ON l.id_lote = e.id_lote
       JOIN fincas f ON f.id_finca = l.id_finca
       JOIN usuarios u ON u.id_usuario = e.id_usuario
       WHERE e.id_evaluacion = ?`,
      [id]
    );

    res.json({
      status: 'ok',
      message: transicion ? `Evaluación actualizada. El lote pasó automáticamente a ${transicion}` : 'Evaluación actualizada',
      evaluacion: actualizada[0],
      transicion
    });
  } catch (err) {
    console.error('Error actualizando evaluación:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

router.delete('/:id', requiereRol('administrador', 'gerente'), async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM evaluaciones WHERE id_evaluacion = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'Evaluación no encontrada' });
    }
    res.json({ status: 'ok', message: 'Evaluación eliminada' });
  } catch (err) {
    console.error('Error eliminando evaluación:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

module.exports = router;