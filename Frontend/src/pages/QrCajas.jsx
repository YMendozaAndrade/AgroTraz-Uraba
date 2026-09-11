import { Fragment, useEffect, useState } from 'react';
import AppLayout from '../app/AppLayout';
import { qrCajasApi, lotesApi } from '../services/api';

const TIPOS_EMPAQUE = [
  { valor: 'carton_22', label: 'Cartón 22 kg' },
  { valor: 'carton_saco', label: 'Cartón en saco' },
  { valor: 'bolsa_malla', label: 'Bolsa de malla' }
];

const TIPO_LABEL = Object.fromEntries(TIPOS_EMPAQUE.map((t) => [t.valor, t.label]));

const LOTES_BLOQUEADOS = ['carencia', 'restringido', 'cuarentena'];

function loteApto(l) {
  return l.activo !== false && !LOTES_BLOQUEADOS.includes(l.estado_efectivo || l.estado);
}

function motivoBloqueo(l) {
  const estado = l.estado_efectivo || l.estado;
  switch (estado) {
    case 'carencia':
      return `En carencia${l.carencia_hasta ? ` hasta ${String(l.carencia_hasta).slice(0, 10)}` : ''}`;
    case 'restringido':
      return 'Restringido';
    case 'cuarentena':
      return 'En cuarentena';
    default:
      return !l.activo && l.activo !== undefined ? 'Inactivo' : '';
  }
}

function QrCajas() {
  const [codigos, setCodigos] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalQr, setModalQr] = useState(false);
  const [formQr, setFormQr] = useState({ id_lote: '', fecha_proceso: '', hora_proceso: '', peso_neto: '', codigo_ica_finca: '' });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState('');

  const [expandido, setExpandido] = useState(null);
  const [cajas, setCajas] = useState([]);
  const [modalCaja, setModalCaja] = useState(false);
  const [qrCaja, setQrCaja] = useState(null);
  const [formCaja, setFormCaja] = useState({ peso_bruto: '', tipo_empaque: 'carton_22', fecha_empaque: '', hora_empaque: '', id_lote: '' });

  const [busqueda, setBusqueda] = useState('');
  const [traza, setTraza] = useState(null);
  const [buscando, setBuscando] = useState(false);

  async function cargarTodo() {
    try {
      const [q, l] = await Promise.all([qrCajasApi.listar(), lotesApi.listar()]);
      setCodigos(q.codigos || []);
      setLotes(l.lotes || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarTodo();
  }, []);

  function abrirCrearQr() {
    const primerApto = lotes.find((l) => loteApto(l));
    setFormQr({
      id_lote: primerApto ? primerApto.id_lote : '',
      fecha_proceso: new Date().toISOString().slice(0, 10),
      hora_proceso: new Date().toTimeString().slice(0, 5),
      peso_neto: '',
      codigo_ica_finca: ''
    });
    setError('');
    setModalQr(true);
  }

  function handleChange(setter) {
    return (e) => setter((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmitQr(e) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const res = await qrCajasApi.crear({ ...formQr, peso_neto: Number(formQr.peso_neto), id_lote: Number(formQr.id_lote) });
      setModalQr(false);
      setMensaje({ tipo: 'success', texto: `Código QR ${res.codigo.codigo} generado` });
      cargarTodo();
    } catch (e2) {
      setError(e2.message);
    } finally {
      setGuardando(false);
    }
  }

  async function toggleExpandir(q) {
    if (expandido === q.id_qr) {
      setExpandido(null);
      setCajas([]);
      return;
    }
    try {
      const c = await qrCajasApi.listarCajas(q.id_qr);
      setCajas(c.cajas);
      setExpandido(q.id_qr);
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
    }
  }

  function abrirCaja(q) {
    setQrCaja(q);
    setFormCaja({
      id_lote: q.id_lote,
      peso_bruto: '',
      tipo_empaque: 'carton_22',
      fecha_empaque: new Date().toISOString().slice(0, 10),
      hora_empaque: new Date().toTimeString().slice(0, 5)
    });
    setError('');
    setModalCaja(true);
  }

  async function handleSubmitCaja(e) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      await qrCajasApi.crearCaja(qrCaja.id_qr, {
        ...formCaja,
        id_lote: Number(formCaja.id_lote),
        peso_bruto: formCaja.peso_bruto ? Number(formCaja.peso_bruto) : null
      });
      setModalCaja(false);
      setMensaje({ tipo: 'success', texto: 'Caja registrada' });
      const c = await qrCajasApi.listarCajas(qrCaja.id_qr);
      setCajas(c.cajas);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminarCaja(q, caja) {
    if (!window.confirm(`¿Eliminar la caja #${caja.id_caja} del QR ${q.codigo}?`)) return;
    try {
      await qrCajasApi.eliminarCaja(caja.id_caja);
      setMensaje({ tipo: 'success', texto: 'Caja eliminada' });
      const c = await qrCajasApi.listarCajas(q.id_qr);
      setCajas(c.cajas);
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
    }
  }

  async function handleEliminarQr(q) {
    if (!window.confirm(`¿Eliminar el código QR ${q.codigo} y todas sus cajas?`)) return;
    try {
      await qrCajasApi.eliminar(q.id_qr);
      setMensaje({ tipo: 'success', texto: 'Código QR eliminado' });
      setExpandido(null);
      cargarTodo();
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
    }
  }

  async function buscarTraza() {
    if (!busqueda.trim()) return;
    setBuscando(true);
    setTraza(null);
    try {
      const r = await qrCajasApi.traza(busqueda.trim());
      setTraza(r.traza);
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
    } finally {
      setBuscando(false);
    }
  }

  return (
    <AppLayout>
      {mensaje && (
        <div className={`alert ${mensaje.tipo === 'success' ? 'alert-success' : 'alert-error'}`} onClick={() => setMensaje(null)}>
          {mensaje.texto}
        </div>
      )}
      <div className="page-head">
        <h2>QR / Cajas</h2>
        <button className="btn-primary" onClick={abrirCrearQr}>
          + Generar QR
        </button>
      </div>

      {error && !loading && <div className="alert alert-error">{error}</div>}

      <div className="panel-card">
        <h4 className="panel-title">Trazabilidad por código</h4>
        <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
          <input
            style={{ padding: '9px 12px', border: '1px solid rgba(20,83,45,.2)', borderRadius: 8, flex: 1 }}
            placeholder="Escanee o escriba el código QR (ej. AGT-2026-XXXX)"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscarTraza()}
          />
          <button className="btn-primary" onClick={buscarTraza} disabled={buscando}>
            {buscando ? 'Buscando…' : 'Consultar'}
          </button>
        </div>

        {traza && (
          <div style={{ marginTop: 16, background: '#f8fafc', border: '1px solid rgba(20,83,45,.15)', borderRadius: 10, padding: 16 }}>
            <div style={{ fontWeight: 700, color: '#14532d', marginBottom: 10 }}>QR {traza.codigo}</div>
            <div className="traza-grid">
              <div><span className="traza-label">Producto</span>{traza.producto}</div>
              <div><span className="traza-label">Lote</span>{traza.lote}</div>
              <div><span className="traza-label">Finca</span>{traza.finca}</div>
              <div><span className="traza-label">Fecha proceso</span>{traza.fecha_proceso.slice(0, 10)}</div>
              <div><span className="traza-label">Hora</span>{traza.hora_proceso}</div>
              <div><span className="traza-label">Peso neto</span>{traza.peso_neto} kg</div>
              <div><span className="traza-label">Código ICA</span>{traza.codigo_ica_finca || '—'}</div>
              <div><span className="traza-label">Generado por</span>{traza.generado_por}</div>
            </div>
            <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
              <div>
                <div className="traza-label">Cajas ({traza.cajas.length})</div>
                <div className="traza-tags">
                  {traza.cajas.length === 0 && <span>Sin cajas registradas</span>}
                  {traza.cajas.map((c) => (
                    <span key={c.id_caja} className="traza-tag">
                      Caja #{c.id_caja} · {TIPO_LABEL[c.tipo_empaque] || c.tipo_empaque} · {c.peso_bruto ?? '—'} kg
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="traza-label">Aplicaciones ({traza.aplicaciones.length})</div>
                <div className="traza-tags">
                  {traza.aplicaciones.length === 0 && <span>Sin aplicaciones registradas</span>}
                  {traza.aplicaciones.map((a, i) => (
                    <span key={i} className="traza-tag">
                      {a.agroquimico} el {a.fecha_aplicacion.slice(0, 10)} · carencia hasta {a.fecha_fin_carencia.slice(0, 10)}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="traza-label">Evaluaciones ({traza.evaluaciones.length})</div>
                <div className="traza-tags">
                  {traza.evaluaciones.length === 0 && <span>Sin evaluaciones registradas</span>}
                  {traza.evaluaciones.map((ev, i) => (
                    <span key={i} className="traza-tag">
                      {ev.tipo_evaluacion} el {ev.fecha_evaluacion.slice(0, 10)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="panel-card">
        <h4 className="panel-title">Códigos QR generados</h4>
        {loading ? (
          <p>Cargando…</p>
        ) : codigos.length === 0 ? (
          <p>No hay códigos QR generados todavía.</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Lote</th>
                  <th>Finca</th>
                  <th>Fecha proceso</th>
                  <th>Peso neto</th>
                  <th>Cajas</th>
                  <th>Sync</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {codigos.map((q) => (
                  <Fragment key={q.id_qr}>
                    <tr>
                      <td><b>{q.codigo}</b></td>
                      <td>{q.lote}</td>
                      <td>{q.finca}</td>
                      <td>{q.fecha_proceso.slice(0, 10)}</td>
                      <td>{q.peso_neto} kg</td>
                      <td>{q.total_cajas}</td>
                      <td>
                        <span className={`badge ${q.sincronizado ? 'badge-disponible' : 'badge-restringido'}`}>
                          {q.sincronizado ? 'Sincronizado' : 'Pendiente'}
                        </span>
                      </td>
                      <td>
                        <button className="action-btn edit" onClick={() => toggleExpandir(q)}>
                          {expandido === q.id_qr ? 'Cerrar' : 'Cajas'}
                        </button>
                        {expandido === q.id_qr && (
                          <button className="action-btn edit" onClick={() => abrirCaja(q)}>+ Caja</button>
                        )}
                        <button className="action-btn delete" onClick={() => handleEliminarQr(q)}>Eliminar</button>
                      </td>
                    </tr>
                    {expandido === q.id_qr && (
                      <tr>
                        <td colSpan="8" style={{ backgroundColor: '#f8fafc' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {cajas.length === 0 && <span style={{ color: '#6b7280' }}>Sin cajas registradas.</span>}
                            {cajas.map((c) => (
                              <div key={c.id_caja} className="caja-chip">
                                #{c.id_caja} · {TIPO_LABEL[c.tipo_empaque] || c.tipo_empaque} · {c.peso_bruto ?? '—'} kg · {c.fecha_empaque.slice(0, 10)} {c.hora_empaque?.slice(0, 5)}
                                <button className="action-btn delete" style={{ padding: '2px 8px' }} onClick={() => handleEliminarCaja(q, c)}>✕</button>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalQr && (
        <div className="modal-overlay" onClick={() => setModalQr(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Generar código QR</h3>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmitQr}>
              <div className="form-grid">
                <div className="form-field-modal full">
                  <label>Lote *</label>
                  <select name="id_lote" value={formQr.id_lote} onChange={handleChange(setFormQr)} required>
                    <option value="">Seleccione un lote</option>
                    {lotes.map((l) => (
                      <option
                        key={l.id_lote}
                        value={l.id_lote}
                        disabled={!loteApto(l)}
                      >
                        {l.finca} / {l.nombre} ({loteApto(l) ? l.estado_efectivo || l.estado : motivoBloqueo(l)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field-modal">
                  <label>Fecha de proceso *</label>
                  <input name="fecha_proceso" type="date" value={formQr.fecha_proceso} onChange={handleChange(setFormQr)} required />
                </div>
                <div className="form-field-modal">
                  <label>Hora de proceso *</label>
                  <input name="hora_proceso" type="time" value={formQr.hora_proceso} onChange={handleChange(setFormQr)} required />
                </div>
                <div className="form-field-modal">
                  <label>Peso neto (kg) *</label>
                  <input name="peso_neto" type="number" step="0.01" min="0" value={formQr.peso_neto} onChange={handleChange(setFormQr)} placeholder="Ej. 180.50" required />
                </div>
                <div className="form-field-modal">
                  <label>Código ICA de la finca</label>
                  <input name="codigo_ica_finca" value={formQr.codigo_ica_finca} onChange={handleChange(setFormQr)} placeholder="Ej. ICA-URABA-001" />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setModalQr(false)}>Cancelar</button>
                <button type="submit" className="btn-save" disabled={guardando}>
                  {guardando ? 'Generando…' : 'Generar QR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalCaja && (
        <div className="modal-overlay" onClick={() => setModalCaja(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Registrar caja · {qrCaja?.codigo}</h3>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmitCaja}>
              <div className="form-grid">
                <div className="form-field-modal">
                  <label>Peso bruto (kg)</label>
                  <input name="peso_bruto" type="number" step="0.01" min="0" value={formCaja.peso_bruto} onChange={handleChange(setFormCaja)} placeholder="Ej. 190" />
                </div>
                <div className="form-field-modal">
                  <label>Tipo de empaque *</label>
                  <select name="tipo_empaque" value={formCaja.tipo_empaque} onChange={handleChange(setFormCaja)}>
                    {TIPOS_EMPAQUE.map((t) => (
                      <option key={t.valor} value={t.valor}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field-modal">
                  <label>Fecha de empaque *</label>
                  <input name="fecha_empaque" type="date" value={formCaja.fecha_empaque} onChange={handleChange(setFormCaja)} required />
                </div>
                <div className="form-field-modal">
                  <label>Hora de empaque *</label>
                  <input name="hora_empaque" type="time" value={formCaja.hora_empaque} onChange={handleChange(setFormCaja)} required />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setModalCaja(false)}>Cancelar</button>
                <button type="submit" className="btn-save" disabled={guardando}>
                  {guardando ? 'Guardando…' : 'Guardar caja'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default QrCajas;