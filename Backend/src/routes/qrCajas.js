const express = require('express');
const pool = require('../db');
const { verificarToken, requiereRol } = require('../middleware/auth');

const router = express.Router();

router.use(verificarToken);

const rolesGestion = requiereRol('administrador', 'gerente', 'agronomo', 'operador_empacadora');
const rolesEliminar = requiereRol('administrador', 'gerente');

const TIPOS_EMPAQUE = ['carton_22', 'carton_saco', 'bolsa_malla'];

function generarCodigoQR() {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const random = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `AGT-${anio}-${random}`;
}

async function validarLoteParaEmpacar(idLote) {
  const [lotes] = await pool.query('SELECT id_lote, id_finca, nombre, estado, activo FROM lotes WHERE id_lote = ?', [idLote]);
  if (lotes.length === 0) {
    return { ok: false, message: 'El lote no existe' };
  }
  const lote = lotes[0];
  if (!lote.activo) {
    return { ok: false, message: 'El lote está inactivo' };
  }
  if (lote.estado === 'cuarentena') {
    return { ok: false, message: `El lote "${lote.nombre}" está EN CUARENTENA (foco fitosanitario). No puede empacarse` };
  }
  if (lote.estado === 'restringido') {
    return { ok: false, message: `El lote "${lote.nombre}" está RESTRINGIDO. El empaque requiere validación de gerencia` };
  }
  return { ok: true, lote };
}

// Listar QRs (fincas asignadas si no es admin/gerente)
router.get('/', async (req, res) => {
  const { id_lote } = req.query;
  try {
    let query = `
      SELECT q.id_qr, q.codigo, q.id_lote, l.nombre AS lote, q.id_finca, f.nombre AS finca,
             q.id_usuario, u.nombre AS generado_por, q.fecha_proceso, q.hora_proceso,
             q.peso_neto, q.codigo_ica_finca, q.sincronizado,
             (SELECT COUNT(*) FROM cajas c WHERE c.id_qr = q.id_qr) AS total_cajas
      FROM codigos_qr q
      JOIN lotes l ON l.id_lote = q.id_lote
      JOIN fincas f ON f.id_finca = q.id_finca
      JOIN usuarios u ON u.id_usuario = q.id_usuario
    `;
    const params = [];

    if (req.usuario.rol !== 'administrador' && req.usuario.rol !== 'gerente') {
      query += `
        JOIN usuario_finca uf ON uf.id_finca = q.id_finca
        WHERE uf.id_usuario = ?`;
      params.push(req.usuario.id_usuario);
      if (id_lote) {
        query += ' AND q.id_lote = ?';
        params.push(id_lote);
      }
    } else if (id_lote) {
      query += ' WHERE q.id_lote = ?';
      params.push(id_lote);
    }

    query += ' ORDER BY q.fecha_proceso DESC, q.id_qr DESC';
    const [rows] = await pool.query(query, params);
    res.json({ status: 'ok', codigos: rows });
  } catch (err) {
    console.error('Error listando QR:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// Crear QR para un lote
router.post('/', rolesGestion, async (req, res) => {
  const { id_lote, fecha_proceso, hora_proceso, peso_neto, codigo_ica_finca, sincronizado } = req.body;

  if (!id_lote || !fecha_proceso || !hora_proceso || peso_neto == null) {
    return res.status(400).json({ status: 'error', message: 'id_lote, fecha_proceso, hora_proceso y peso_neto son obligatorios' });
  }

  try {
    const validacion = await validarLoteParaEmpacar(id_lote);
    if (!validacion.ok) {
      return res.status(409).json({ status: 'error', message: validacion.message });
    }

    const codigo = req.body.codigo || generarCodigoQR();
    const [dup] = await pool.query('SELECT id_qr FROM codigos_qr WHERE codigo = ?', [codigo]);
    if (dup.length > 0) {
      return res.status(409).json({ status: 'error', message: 'El código QR ya existe' });
    }

    const [result] = await pool.query(
      `INSERT INTO codigos_qr (codigo, id_lote, id_finca, id_usuario, fecha_proceso, hora_proceso, peso_neto, codigo_ica_finca, sincronizado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [codigo, id_lote, validacion.lote.id_finca, req.usuario.id_usuario, fecha_proceso, hora_proceso, peso_neto, codigo_ica_finca || null, sincronizado ? 1 : 0]
    );

    const [nuevo] = await pool.query(
      `SELECT q.*, l.nombre AS lote, f.nombre AS finca FROM codigos_qr q
       JOIN lotes l ON l.id_lote = q.id_lote
       JOIN fincas f ON f.id_finca = q.id_finca
       WHERE q.id_qr = ?`,
      [result.insertId]
    );

    res.status(201).json({ status: 'ok', message: `Código QR ${codigo} generado`, codigo: nuevo[0] });
  } catch (err) {
    console.error('Error creando QR:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// Trazabilidad completa por código QR
router.get('/traza/:codigo', async (req, res) => {
  const { codigo } = req.params;
  try {
    const [qrs] = await pool.query(
      `SELECT q.*, l.nombre AS lote, f.nombre AS finca, u.nombre AS generado_por,
              l.tipo_siembra
       FROM codigos_qr q
       JOIN lotes l ON l.id_lote = q.id_lote
       JOIN fincas f ON f.id_finca = q.id_finca
       JOIN usuarios u ON u.id_usuario = q.id_usuario
       WHERE q.codigo = ?`,
      [codigo]
    );
    if (qrs.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Código QR no encontrado' });
    }
    const qr = qrs[0];

    const [cajas] = await pool.query(
      'SELECT * FROM cajas WHERE id_qr = ? ORDER BY id_caja',
      [qr.id_qr]
    );

    const [aplicaciones] = await pool.query(
      `SELECT a.fecha_aplicacion, a.fecha_fin_carencia, ag.nombre AS agroquimico, ag.dias_carencia, a.dosis_aplicada
       FROM aplicaciones a
       JOIN agroquimicos ag ON ag.id_agroquimico = a.id_agroquimico
       WHERE a.id_lote = ?
       ORDER BY a.fecha_aplicacion`,
      [qr.id_lote]
    );

    const [evaluaciones] = await pool.query(
      `SELECT e.tipo_evaluacion, e.fecha_evaluacion, e.yha, e.indice_severidad, e.numero_adultos
       FROM evaluaciones e
       WHERE e.id_lote = ?
       ORDER BY e.fecha_evaluacion`,
      [qr.id_lote]
    );

    res.json({
      status: 'ok',
      traza: {
        codigo: qr.codigo,
        producto: qr.tipo_siembra,
        lote: qr.lote,
        finca: qr.finca,
        fecha_proceso: qr.fecha_proceso,
        hora_proceso: qr.hora_proceso,
        peso_neto: Number(qr.peso_neto),
        codigo_ica_finca: qr.codigo_ica_finca,
        generado_por: qr.generado_por,
        sincronizado: qr.sincronizado,
        cajas: cajas.map((c) => ({
          id_caja: c.id_caja,
          peso_bruto: c.peso_bruto != null ? Number(c.peso_bruto) : null,
          tipo_empaque: c.tipo_empaque,
          fecha_empaque: c.fecha_empaque,
          hora_empaque: c.hora_empaque,
          sincronizado: c.sincronizado
        })),
        aplicaciones,
        evaluaciones
      }
    });
  } catch (err) {
    console.error('Error consultando traza:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// Obtener cajas de un QR
router.get('/:id/cajas', async (req, res) => {
  const { id } = req.params;
  try {
    const [cajas] = await pool.query('SELECT * FROM cajas WHERE id_qr = ? ORDER BY id_caja', [id]);
    res.json({ status: 'ok', cajas });
  } catch (err) {
    console.error('Error listando cajas:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// Registrar caja para un QR
router.post('/:id/cajas', rolesGestion, async (req, res) => {
  const { id } = req.params;
  const { id_lote, peso_bruto, tipo_empaque, fecha_empaque, hora_empaque, sincronizado } = req.body;

  if (!fecha_empaque || !hora_empaque || !id_lote) {
    return res.status(400).json({ status: 'error', message: 'id_lote, fecha_empaque y hora_empaque son obligatorios' });
  }

  try {
    const [qrs] = await pool.query('SELECT id_qr, id_lote FROM codigos_qr WHERE id_qr = ?', [id]);
    if (qrs.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Código QR no encontrado' });
    }

    const [result] = await pool.query(
      `INSERT INTO cajas (id_qr, id_lote, peso_bruto, tipo_empaque, fecha_empaque, hora_empaque, sincronizado)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, id_lote, peso_bruto != null && peso_bruto !== '' ? peso_bruto : null, tipo_empaque || null, fecha_empaque, hora_empaque, sincronizado ? 1 : 0]
    );

    const [nueva] = await pool.query('SELECT * FROM cajas WHERE id_caja = ?', [result.insertId]);
    res.status(201).json({ status: 'ok', message: 'Caja registrada', caja: nueva[0] });
  } catch (err) {
    console.error('Error creando caja:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// Editar QR
router.put('/:id', rolesGestion, async (req, res) => {
  const { id } = req.params;
  const { fecha_proceso, hora_proceso, peso_neto, codigo_ica_finca, sincronizado } = req.body;

  try {
    const [existe] = await pool.query('SELECT * FROM codigos_qr WHERE id_qr = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Código QR no encontrado' });
    }
    const actual = existe[0];

    await pool.query(
      'UPDATE codigos_qr SET fecha_proceso = ?, hora_proceso = ?, peso_neto = ?, codigo_ica_finca = ?, sincronizado = ? WHERE id_qr = ?',
      [fecha_proceso ?? actual.fecha_proceso, hora_proceso ?? actual.hora_proceso,
       peso_neto ?? actual.peso_neto, codigo_ica_finca ?? actual.codigo_ica_finca,
       sincronizado != null ? (sincronizado ? 1 : 0) : actual.sincronizado, id]
    );

    const [actualizado] = await pool.query(
      `SELECT q.*, l.nombre AS lote, f.nombre AS finca FROM codigos_qr q
       JOIN lotes l ON l.id_lote = q.id_lote
       JOIN fincas f ON f.id_finca = q.id_finca
       WHERE q.id_qr = ?`,
      [id]
    );

    res.json({ status: 'ok', message: 'Código QR actualizado', codigo: actualizado[0] });
  } catch (err) {
    console.error('Error actualizando QR:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// Editar caja
router.put('/cajas/:idCaja', rolesGestion, async (req, res) => {
  const { idCaja } = req.params;
  const { peso_bruto, tipo_empaque, fecha_empaque, hora_empaque, sincronizado } = req.body;

  try {
    const [existe] = await pool.query('SELECT * FROM cajas WHERE id_caja = ?', [idCaja]);
    if (existe.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Caja no encontrada' });
    }
    const actual = existe[0];

    await pool.query(
      'UPDATE cajas SET peso_bruto = ?, tipo_empaque = ?, fecha_empaque = ?, hora_empaque = ?, sincronizado = ? WHERE id_caja = ?',
      [peso_bruto ?? actual.peso_bruto, tipo_empaque ?? actual.tipo_empaque,
       fecha_empaque ?? actual.fecha_empaque, hora_empaque ?? actual.hora_empaque,
       sincronizado != null ? (sincronizado ? 1 : 0) : actual.sincronizado, idCaja]
    );

    const [actualizada] = await pool.query('SELECT * FROM cajas WHERE id_caja = ?', [idCaja]);
    res.json({ status: 'ok', message: 'Caja actualizada', caja: actualizada[0] });
  } catch (err) {
    console.error('Error actualizando caja:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// Eliminar caja
router.delete('/cajas/:idCaja', rolesEliminar, async (req, res) => {
  const { idCaja } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM cajas WHERE id_caja = ?', [idCaja]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'Caja no encontrada' });
    }
    res.json({ status: 'ok', message: 'Caja eliminada' });
  } catch (err) {
    console.error('Error eliminando caja:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

// Eliminar QR (borrado físico; elimina cajas asociadas primero)
router.delete('/:id', rolesEliminar, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM cajas WHERE id_qr = ?', [id]);
    const [result] = await pool.query('DELETE FROM codigos_qr WHERE id_qr = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ status: 'error', message: 'Código QR no encontrado' });
    }
    res.json({ status: 'ok', message: 'Código QR y sus cajas eliminados' });
  } catch (err) {
    console.error('Error eliminando QR:', err.message);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
  }
});

module.exports = router;