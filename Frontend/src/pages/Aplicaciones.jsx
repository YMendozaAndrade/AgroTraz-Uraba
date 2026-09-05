import { useEffect, useState } from 'react';
import AppLayout from '../app/AppLayout';
import { aplicacionesApi, lotesApi, agroquimicosApi } from '../services/api';

function Aplicaciones() {
  const [aplicaciones, setAplicaciones] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [agroquimicos, setAgroquimicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editar, setEditar] = useState(null);
  const [form, setForm] = useState({ id_lote: '', id_agroquimico: '', fecha_aplicacion: '', dosis_aplicada: '', observaciones: '' });
  const [carenciaCalculada, setCarenciaCalculada] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState('');

  async function cargarTodo() {
    try {
      const [a, l, q] = await Promise.all([aplicacionesApi.listar(), lotesApi.listar(), agroquimicosApi.listar()]);
      setAplicaciones(a.aplicaciones);
      setLotes(l.lotes);
      setAgroquimicos(q.agroquimicos);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarTodo();
  }, []);

  function calcularCarencia(fecha, agroquimicoId, agroquimicosList) {
    const agro = agroquimicosList.find((x) => x.id_agroquimico === Number(agroquimicoId));
    if (!agro || !fecha) return '';
    const d = new Date(`${fecha}T00:00:00`);
    d.setDate(d.getDate() + Number(agro.dias_carencia));
    return d.toISOString().slice(0, 10);
  }

  function abrirCrear() {
    setEditar(null);
    setForm({
      id_lote: lotes.length > 0 ? lotes[0].id_lote : '',
      id_agroquimico: agroquimicos.length > 0 ? agroquimicos[0].id_agroquimico : '',
      fecha_aplicacion: new Date().toISOString().slice(0, 10),
      dosis_aplicada: '',
      observaciones: ''
    });
    setError('');
    setModalAbierto(true);
  }

  function abrirEditar(a) {
    setEditar(a);
    setForm({
      id_lote: a.id_lote,
      id_agroquimico: a.id_agroquimico,
      fecha_aplicacion: a.fecha_aplicacion.slice(0, 10),
      dosis_aplicada: a.dosis_aplicada || '',
      observaciones: a.observaciones || ''
    });
    setCarenciaCalculada(calcularCarencia(a.fecha_aplicacion.slice(0, 10), a.id_agroquimico, agroquimicos));
    setError('');
    setModalAbierto(true);
  }

  function handleChange(e) {
    const next = { ...form, [e.target.name]: e.target.value };
    setForm(next);
    if (e.target.name === 'fecha_aplicacion' || e.target.name === 'id_agroquimico') {
      setCarenciaCalculada(calcularCarencia(next.fecha_aplicacion, next.id_agroquimico, agroquimicos));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const payload = {
        ...form,
        id_lote: Number(form.id_lote),
        id_agroquimico: Number(form.id_agroquimico)
      };
      if (editar) {
        await aplicacionesApi.actualizar(editar.id_aplicacion, payload);
        setMensaje({ tipo: 'success', texto: 'Aplicación actualizada' });
      } else {
        await aplicacionesApi.crear(payload);
        setMensaje({ tipo: 'success', texto: 'Aplicación registrada' });
      }
      setModalAbierto(false);
      cargarTodo();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminar(a) {
    if (!window.confirm(`¿Eliminar la aplicación del ${a.fecha_aplicacion.slice(0, 10)} (${a.agroquimico})?`)) return;
    try {
      await aplicacionesApi.eliminar(a.id_aplicacion);
      setMensaje({ tipo: 'success', texto: 'Aplicación eliminada' });
      cargarTodo();
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
    }
  }

  const hoy = new Date().toISOString().slice(0, 10);

  function enCarencia(a) {
    return a.fecha_fin_carencia.slice(0, 10) > hoy;
  }

  return (
    <AppLayout>
      {mensaje && (
        <div className={`alert ${mensaje.tipo === 'success' ? 'alert-success' : 'alert-error'}`} onClick={() => setMensaje(null)}>
          {mensaje.texto}
        </div>
      )}
      <div className="page-head">
        <h2>Aplicaciones</h2>
        <button className="btn-primary" onClick={abrirCrear}>
          + Registrar aplicación
        </button>
      </div>

      <div className="panel-card">
        {loading ? (
          <p>Cargando aplicaciones…</p>
        ) : aplicaciones.length === 0 ? (
          <p>No hay aplicaciones registradas todavía.</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Lote</th>
                  <th>Agroquímico</th>
                  <th>Dosis</th>
                  <th>Fin carencia</th>
                  <th>Estado</th>
                  <th>Registrado por</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {aplicaciones.map((a) => (
                  <tr key={a.id_aplicacion}>
                    <td>{a.fecha_aplicacion.slice(0, 10)}</td>
                    <td>{a.lote}</td>
                    <td>{a.agroquimico}</td>
                    <td>{a.dosis_aplicada || '—'}</td>
                    <td>{a.fecha_fin_carencia.slice(0, 10)}</td>
                    <td>
                      <span className={`badge ${enCarencia(a) ? 'badge-restringido' : 'badge-disponible'}`}>
                        {enCarencia(a) ? 'En carencia' : 'Disponible'}
                      </span>
                    </td>
                    <td>{a.registrado_por}</td>
                    <td>
                      <button className="action-btn edit" onClick={() => abrirEditar(a)}>Editar</button>
                      <button className="action-btn delete" onClick={() => handleEliminar(a)}>Eliminar</button>
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
            <h3>{editar ? 'Editar aplicación' : 'Registrar aplicación'}</h3>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-field-modal">
                  <label>Lote *</label>
                  <select name="id_lote" value={form.id_lote} onChange={handleChange} required>
                    <option value="">Seleccione un lote</option>
                    {lotes.map((l) => (
                      <option key={l.id_lote} value={l.id_lote}>{l.finca} / {l.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field-modal">
                  <label>Agroquímico *</label>
                  <select name="id_agroquimico" value={form.id_agroquimico} onChange={handleChange} required>
                    <option value="">Seleccione un agroquímico</option>
                    {agroquimicos.map((q) => (
                      <option key={q.id_agroquimico} value={q.id_agroquimico}>
                        {q.nombre} ({q.dias_carencia} días)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field-modal">
                  <label>Fecha de aplicación *</label>
                  <input name="fecha_aplicacion" type="date" value={form.fecha_aplicacion} onChange={handleChange} required />
                </div>
                <div className="form-field-modal">
                  <label>Dosis aplicada</label>
                  <input name="dosis_aplicada" value={form.dosis_aplicada} onChange={handleChange} placeholder="1.5 L/ha" />
                </div>
                <div className="form-field-modal full">
                  <label>Fin de carencia (calculado automáticamente)</label>
                  <input value={carenciaCalculada || '—'} disabled style={{ background: '#ecfdf5', color: '#166534', fontWeight: 600 }} />
                </div>
                <div className="form-field-modal full">
                  <label>Observaciones</label>
                  <textarea name="observaciones" rows="2" value={form.observaciones} onChange={handleChange} />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setModalAbierto(false)}>Cancelar</button>
                <button type="submit" className="btn-save" disabled={guardando}>
                  {guardando ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default Aplicaciones;