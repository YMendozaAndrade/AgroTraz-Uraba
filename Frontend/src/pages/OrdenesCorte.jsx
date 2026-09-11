import { useEffect, useState } from 'react';
import AppLayout from '../app/AppLayout';
import { ordenesCorteApi, lotesApi } from '../services/api';

function OrdenesCorte() {
  const [ordenes, setOrdenes] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [form, setForm] = useState({ id_lote: '', fecha_corte: '', observaciones: '' });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState('');

  async function cargarTodo() {
    try {
      const [o, l] = await Promise.all([ordenesCorteApi.listar(), lotesApi.listar()]);
      setOrdenes(o.ordenes || []);
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

  function esHoyOPróximo(fecha) {
    const hoy = new Date().toISOString().slice(0, 10);
    return fecha >= hoy;
  }

  function abrirCrear() {
    setForm({
      id_lote: lotes.length > 0 ? lotes[0].id_lote : '',
      fecha_corte: new Date().toISOString().slice(0, 10),
      observaciones: ''
    });
    setError('');
    setModalAbierto(true);
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      await ordenesCorteApi.crear({ id_lote: Number(form.id_lote), fecha_corte: form.fecha_corte, observaciones: form.observaciones });
      setModalAbierto(false);
      setMensaje({ tipo: 'success', texto: 'Orden de corte generada' });
      cargarTodo();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  async function cambiarEstado(o, nuevoEstado) {
    const acciones = {
      ejecutada: 'marcar como EJECUTADA',
      cancelada: 'cancelar'
    };
    if (!window.confirm(`¿Seguro que desea ${acciones[nuevoEstado]} la orden #${o.id_orden_corte} (lote ${o.lote})?`)) return;
    try {
      await ordenesCorteApi.actualizar(o.id_orden_corte, { estado: nuevoEstado });
      setMensaje({ tipo: 'success', texto: `Orden #${o.id_orden_corte} ${nuevoEstado}` });
      cargarTodo();
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
    }
  }

  async function handleEliminar(o) {
    if (!window.confirm(`¿Eliminar definitivamente la orden #${o.id_orden_corte} (lote ${o.lote})?`)) return;
    try {
      await ordenesCorteApi.eliminar(o.id_orden_corte);
      setMensaje({ tipo: 'success', texto: 'Orden eliminada' });
      cargarTodo();
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
    }
  }

  function labelLote(l) {
    if (l.estado_efectivo === 'cuarentena') return `${l.finca} / ${l.nombre} — EN CUARENTENA`;
    if (l.estado_efectivo === 'restringido') return `${l.finca} / ${l.nombre} — RESTRINGIDO`;
    if (l.estado_efectivo === 'carencia') return `${l.finca} / ${l.nombre} — CARENCIA hasta ${l.carencia_hasta.toString().slice(0, 10)}`;
    return `${l.finca} / ${l.nombre} (${l.estado_efectivo || l.estado})`;
  }

  function loteDisponible(l) {
    return l.estado_efectivo === 'disponible' || l.estado_efectivo === undefined;
  }

  return (
    <AppLayout>
      {mensaje && (
        <div className={`alert ${mensaje.tipo === 'success' ? 'alert-success' : 'alert-error'}`} onClick={() => setMensaje(null)}>
          {mensaje.texto}
        </div>
      )}
      <div className="page-head">
        <h2>Órdenes de corte</h2>
        <button className="btn-primary" onClick={abrirCrear}>
          + Nueva orden
        </button>
      </div>

      {error && !loading && <div className="alert alert-error">{error}</div>}

      <div className="panel-card">
        <p className="info-note">
          El sistema bloquea automáticamente las órdenes de corte sobre lotes <b>en carencia</b> de agroquímicos o en estado <b>restringido / cuarentena</b>.
        </p>
        {loading ? (
          <p>Cargando órdenes…</p>
        ) : ordenes.length === 0 ? (
          <p>No hay órdenes de corte registradas todavía.</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Lote</th>
                  <th>Finca</th>
                  <th>Fecha orden</th>
                  <th>Fecha corte</th>
                  <th>Estado</th>
                  <th>Generada por</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map((o) => (
                  <tr key={o.id_orden_corte}>
                    <td>{o.id_orden_corte}</td>
                    <td>{o.lote}</td>
                    <td>{o.finca}</td>
                    <td>{o.fecha_orden.slice(0, 10)}</td>
                    <td>{o.fecha_corte.slice(0, 10)}</td>
                    <td>
                      <span className={`badge badge-${o.estado}`}>{o.estado}</span>
                    </td>
                    <td>{o.generada_por}</td>
                    <td>
                      {o.estado === 'programada' && esHoyOPróximo(o.fecha_corte.slice(0, 10)) && (
                        <button className="action-btn edit" onClick={() => cambiarEstado(o, 'ejecutada')}>Ejecutar</button>
                      )}
                      {o.estado === 'programada' && (
                        <button className="action-btn delete" onClick={() => cambiarEstado(o, 'cancelada')}>Cancelar</button>
                      )}
                      {o.estado === 'ejecutada' && <button className="action-btn delete" onClick={() => handleEliminar(o)}>Eliminar</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalAbierto && (
        <div className="modal-overlay" onClick={() => setModalAbierto(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Nueva orden de corte</h3>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-field-modal full">
                  <label>Lote *</label>
                  <select name="id_lote" value={form.id_lote} onChange={handleChange} required>
                    <option value="">Seleccione un lote</option>
                    {lotes.map((l) => (
                      <option key={l.id_lote} value={l.id_lote} disabled={!loteDisponible(l)}>
                        {labelLote(l)}
                      </option>
                    ))}
                  </select>
                  {form.id_lote && !loteDisponible(lotes.find((l) => String(l.id_lote) === String(form.id_lote))) && (
                    <p style={{ marginTop: 6, fontSize: 12, color: '#b3352b' }}>
                      Este lote no está disponible: el sistema bloquearía la orden automáticamente.
                    </p>
                  )}
                </div>
                <div className="form-field-modal">
                  <label>Fecha de corte *</label>
                  <input name="fecha_corte" type="date" value={form.fecha_corte} onChange={handleChange} required />
                </div>
                <div className="form-field-modal">
                  <label>Observaciones</label>
                  <input name="observaciones" value={form.observaciones} onChange={handleChange} placeholder="Opcional" />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setModalAbierto(false)}>Cancelar</button>
                <button type="submit" className="btn-save" disabled={guardando}>
                  {guardando ? 'Guardando…' : 'Generar orden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default OrdenesCorte;