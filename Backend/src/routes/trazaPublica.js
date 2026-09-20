const express = require('express');
const pool = require('../db');

const router = express.Router();

// Ruta PÚBLICA (sin login): la abre cualquier celular al escanear el QR impreso.
function esc(s) {
  return String(s ?? '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fechaCorta(v) {
  if (!v) return '—';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

router.get('/:codigo', async (req, res) => {
  const { codigo } = req.params;
  try {
    const [qrs] = await pool.query(
      `SELECT q.*, l.nombre AS lote, l.tipo_siembra, f.nombre AS finca,
              f.codigo_ica AS ica_finca, f.municipio, u.nombre AS generado_por
       FROM codigos_qr q
       JOIN lotes l ON l.id_lote = q.id_lote
       JOIN fincas f ON f.id_finca = q.id_finca
       JOIN usuarios u ON u.id_usuario = q.id_usuario
       WHERE q.codigo = ?`,
      [codigo]
    );
    if (qrs.length === 0) {
      return res.status(404).send(
        `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AgroTraz · Código no encontrado</title></head>
        <body style="font-family:system-ui,sans-serif;padding:32px;text-align:center;color:#25312a">
        <h2>Código ${esc(codigo)} no encontrado</h2>
        <p>Verifique el código e intente de nuevo.</p></body></html>`
      );
    }
    const qr = qrs[0];

    const [cajas] = await pool.query(
      'SELECT * FROM cajas WHERE id_qr = ? ORDER BY id_caja',
      [qr.id_qr]
    );

    const [aplicaciones] = await pool.query(
      `SELECT a.fecha_aplicacion, a.fecha_fin_carencia, ag.nombre AS agroquimico, a.dosis_aplicada
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

    const filas = (titulo, items, render) => `
      <section class="card">
        <h3>${titulo} (${items.length})</h3>
        ${items.length === 0
          ? '<p class="vacio">Sin registros.</p>'
          : `<ul>${items.map(render).join('')}</ul>`}
      </section>`;

    const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AgroTraz · Trazabilidad ${esc(qr.codigo)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #f4f1e8; color: #25312a; margin: 0; padding: 16px; }
  .wrap { max-width: 640px; margin: 0 auto; }
  header { background: #1d3b2a; color: #fff; border-radius: 14px; padding: 18px 20px; margin-bottom: 14px; }
  header h1 { margin: 0 0 4px; font-size: 20px; }
  header .codigo { font-size: 15px; opacity: .9; }
  .card { background: #fff; border-radius: 12px; padding: 14px 16px; margin-bottom: 12px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
  .card h3 { margin: 0 0 10px; font-size: 15px; color: #1d3b2a; }
  .dato { display: flex; justify-content: space-between; gap: 12px; padding: 5px 0; font-size: 14px; border-bottom: 1px dashed #eee; }
  .dato:last-child { border-bottom: none; }
  .dato span { color: #5c7064; }
  .dato strong { text-align: right; }
  ul { margin: 0; padding: 0; list-style: none; }
  li { font-size: 13.5px; padding: 6px 0; border-bottom: 1px dashed #eee; }
  li:last-child { border-bottom: none; }
  .vacio { color: #8a8f8a; font-size: 13.5px; margin: 0; }
  footer { text-align: center; color: #8a8f8a; font-size: 12px; margin: 18px 0 8px; }
  @media print { body { background: #fff; } .card { box-shadow: none; border: 1px solid #ddd; } }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>🌱 AgroTraz Urabá · Trazabilidad</h1>
    <div class="codigo">Código <strong>${esc(qr.codigo)}</strong></div>
  </header>

  <section class="card">
    <h3>Origen del producto</h3>
    <div class="dato"><span>Producto</span><strong>${esc(qr.tipo_siembra)}</strong></div>
    <div class="dato"><span>Lote</span><strong>${esc(qr.lote)}</strong></div>
    <div class="dato"><span>Finca</span><strong>${esc(qr.finca)}</strong></div>
    <div class="dato"><span>Código ICA finca</span><strong>${esc(qr.codigo_ica_finca || qr.ica_finca)}</strong></div>
    <div class="dato"><span>Municipio</span><strong>${esc(qr.municipio)}</strong></div>
  </section>

  <section class="card">
    <h3>Proceso y empaque</h3>
    <div class="dato"><span>Fecha de proceso</span><strong>${esc(fechaCorta(qr.fecha_proceso))}</strong></div>
    <div class="dato"><span>Hora de proceso</span><strong>${esc(String(qr.hora_proceso || '—').slice(0, 5))}</strong></div>
    <div class="dato"><span>Peso neto</span><strong>${esc(qr.peso_neto)} kg</strong></div>
    <div class="dato"><span>Cajas registradas</span><strong>${cajas.length}</strong></div>
    <div class="dato"><span>Registrado por</span><strong>${esc(qr.generado_por)}</strong></div>
  </section>

  ${filas('Cajas', cajas, (c) => `<li>Caja #${c.id_caja} · ${esc(c.tipo_empaque || '—')} · ${c.peso_bruto ?? '—'} kg · ${esc(fechaCorta(c.fecha_empaque))}</li>`)}

  ${filas('Aplicaciones fitosanitarias del lote', aplicaciones, (a) => `<li>${esc(a.agroquimico)} · aplicada ${esc(fechaCorta(a.fecha_aplicacion))} · carencia hasta ${esc(fechaCorta(a.fecha_fin_carencia))}${a.dosis_aplicada ? ` · dosis ${esc(a.dosis_aplicada)}` : ''}</li>`)}

  ${filas('Evaluaciones fitosanitarias del lote', evaluaciones, (e) => `<li>${esc(e.tipo_evaluacion)} · ${esc(fechaCorta(e.fecha_evaluacion))}${e.yha != null ? ` · YHA ${esc(e.yha)}` : ''}${e.indice_severidad != null ? ` · sev ${esc(e.indice_severidad)}%` : ''}${e.numero_adultos != null ? ` · ${esc(e.numero_adultos)} adultos` : ''}</li>`)}

  <footer>AgroTraz Urabá · control fitosanitario y trazabilidad Lote-a-Caja</footer>
</div>
</body>
</html>`;

    res.send(html);
  } catch (err) {
    console.error('Error en traza pública:', err.message);
    res.status(500).send('Error interno del servidor');
  }
});

module.exports = router;
