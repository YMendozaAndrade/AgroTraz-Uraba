import { useEffect, useState } from 'react';
import AppLayout from '../app/AppLayout';
import { evaluacionesApi, lotesApi } from '../services/api';

const TIPOS = [
  { valor: 'sigatoka', label: 'Sigatoka' },
  { valor: 'moko_fusarium', label: 'Moko / Fusarium' },
  { valor: 'picudo', label: 'Picudo' }
];

function Evaluaciones() {
  const [evaluaciones, setEvaluaciones] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editar, setEditar] = useState(null);
  const [form, setForm] = useState({
    id_lote: '', tipo_evaluacion: 'sigatoka', fecha_evaluacion: '',
    hora_evaluacion: '', latitud: '', longitud: '', fotografia_url: '',
    yha: '', indice_severidad: '', numero_adultos: '', sincronizada: false
  });
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState('');
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const puedeEliminar = usuario.rol === 'administrador' || usuario.rol === 'gerente';

  async function cargarTodo() {
    try {
      const [e, l] = await Promise.all([evaluacionesApi.listar(), lotesApi.listar()]);
      setEvaluaciones(e.evaluaciones || []);
      setLotes(l.lotes || []);
    } catch (e2) {
      setError(e2.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarTodo();
  }, []);

  const hoy = new Date().toISOString().slice(0, 10);

  function abrirCrear() {
    setEditar(null);
    setForm({
      id_lote: lotes.length > 0 ? lotes[0].id_lote : '',
      tipo_evaluacion: 'sigatoka',
      fecha_evaluacion: hoy,
      hora_evaluacion: new Date().toTimeString().slice(0, 5),
      latitud: '', longitud: '', fotografia_url: '',
      yha: '', indice_severidad: '', numero_adultos: '', sincronizada: false
    });
    setError('');
    setModalAbierto(true);
  }

  function abrirEditar(e) {
    setEditar(e);
    setForm({
      id_lote: e.id_lote,
      tipo_evaluacion: e.tipo_evaluacion,
      fecha_evaluacion: e.fecha_evaluacion.slice(0, 10),
      hora_evaluacion: e.hora_evaluacion ? e.hora_evaluacion.slice(0, 5) : '',
      latitud: e.latitud ?? '',
      longitud: e.longitud ?? '',
      fotografia_url: e.fotografia_url || '',
      yha: e.yha ?? '',
      indice_severidad: e.indice_severidad ?? '',
      numero_adultos: e.numero_adultos ?? '',
      sincronizada: Boolean(e.sincronizada)
    });
    setError('');
    setModalAbierto(true);
  }

  function handleChange(e) {
    const next = { ...form, [e.target.name]: e.target.value };
    setForm(next);
  }

  function obtenerUbicacion() {
    if (!navigator.geolocation) {
      setError('Geolocalización no disponible en este navegador');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((f) => ({ ...f, latitud: pos.coords.latitude.toFixed(7), longitud: pos.coords.longitude.toFixed(7) })),
      () => setError('No se pudo obtener la ubicación')
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setGuardando(true);
    setError('');
    const payload = {
      id_lote: Number(form.id_lote),
      tipo_evaluacion: form.tipo_evaluacion,
      fecha_evaluacion: form.fecha_evaluacion,
      hora_evaluacion: form.hora_evaluacion || null,
      latitud: form.latitud || null,
      longitud: form.longitud || null,
      fotografia_url: form.fotografia_url || null,
      yha: form.yha || null,
      indice_severidad: form.indice_severidad || null,
      numero_adultos: form.numero_adultos || null
    };
    try {
      if (editar) {
        await evaluacionesApi.actualizar(editar.id_evaluacion, { ...payload, sincronizada: form.sincronizada });
        setMensaje({ tipo: 'success', texto: 'Evaluación actualizada' });
      } else {
        await evaluacionesApi.crear({ ...payload, sincronizada: form.sincronizada });
        setMensaje({ tipo: 'success', texto: 'Evaluación registrada' });
      }
      setModalAbierto(false);
      cargarTodo();
    } catch (e2) {
      setError(e2.message);
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminar(e) {
    if (!window.confirm(`¿Eliminar la evaluación de ${e.tipo_evaluacion} del ${e.fecha_evaluacion.slice(0, 10)} (${e.lote})?`)) return;
    try {
      await evaluacionesApi.eliminar(e.id_evaluacion);
      setMensaje({ tipo: 'success', texto: 'Evaluación eliminada' });
      cargarTodo();
    } catch (e2) {
      setMensaje({ tipo: 'error', texto: e2.message });
    }
  }

  async function marcarSincronizada(e) {
    try {
      await evaluacionesApi.actualizar(e.id_evaluacion, { sincronizada: true });
      setMensaje({ tipo: 'success', texto: 'Registro sincronizado' });
      cargarTodo();
    } catch (e2) {
      setMensaje({ tipo: 'error', texto: e2.message });
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
        <h2>Evaluaciones fitosanitarias</h2>
        <button className="btn-primary" onClick={abrirCrear}>
          + Nueva evaluación
        </button>
      </div>

      {error && !loading && <div className="alert alert-error">{error}</div>}

      <div className="panel-card">
        <p className="info-note">
          Registro fitosanitario por lote: <b>Sigatoka</b> (método Stover), <b>Moko/Fusarium</b> y <b>Picudo</b> (captura en trampas). Se capturan GPS y foto en campo; permiten guardar sin conexión (<b>sincronización</b>).
        </p>
        {loading ? (
          <p>Cargando evaluaciones…</p>
        ) : evaluaciones.length === 0 ? (
          <p>No hay evaluaciones registradas todavía.</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Tipo</th>
                  <th>Lote</th>
                  <th>Finca</th>
                  <th>Datos específicos</th>
                  <th>Evaluador</th>
                  <th>Sync</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {evaluaciones.map((e) => (
                  <tr key={e.id_evaluacion}>
                    <td>{e.fecha_evaluacion.slice(0, 10)}</td>
                    <td>{e.hora_evaluacion ? e.hora_evaluacion.slice(0, 5) : '—'}</td>
                    <td>
                      <span className="badge badge-banano">{e.tipo_evaluacion === 'moko_fusarium' ? 'Moko/Fusarium' : e.tipo_evaluacion}</span>
                    </td>
                    <td>{e.lote}</td>
                    <td>{e.finca}</td>
                    <td>
                      {e.tipo_evaluacion === 'sigatoka' && `YHA ${e.yha ?? '—'} · Sev ${e.indice_severidad ?? '—'}%`}
                      {e.tipo_evaluacion === 'moko_fusarium' && `Sev ${e.indice_severidad ?? '—'}%`}
                      {e.tipo_evaluacion === 'picudo' && `${e.numero_adultos ?? '—'} adultos`}
                    </td>
                    <td>{e.evaluador}</td>
                    <td>
                      <span className={`badge ${e.sincronizada ? 'badge-disponible' : 'badge-restringido'}`}>
                        {e.sincronizada ? 'Sincronizada' : 'Pendiente'}
                      </span>
                    </td>
                    <td>
                      {!e.sincronizada && (
                        <button className="action-btn edit" onClick={() => marcarSincronizada(e)}>Sincronizar</button>
                      )}
                      <button className="action-btn edit" onClick={() => abrirEditar(e)}>Editar</button>
                      {puedeEliminar && (
                        <button className="action-btn delete" onClick={() => handleEliminar(e)}>Eliminar</button>
                      )}
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
            <h3>{editar ? 'Editar evaluación' : 'Nueva evaluación'}</h3>
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
                  <label>Tipo de evaluación *</label>
                  <select name="tipo_evaluacion" value={form.tipo_evaluacion} onChange={handleChange}>
                    {TIPOS.map((t) => (
                      <option key={t.valor} value={t.valor}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field-modal">
                  <label>Fecha *</label>
                  <input name="fecha_evaluacion" type="date" value={form.fecha_evaluacion} onChange={handleChange} required />
                </div>
                <div className="form-field-modal">
                  <label>Hora</label>
                  <input name="hora_evaluacion" type="time" value={form.hora_evaluacion} onChange={handleChange} />
                </div>

                {form.tipo_evaluacion === 'sigatoka' && (
                  <div className="form-field-modal">
                    <label>YHA (hoja más joven afectada) *</label>
                    <input name="yha" type="number" min="1" value={form.yha} onChange={handleChange} placeholder="Ej. 6" required />
                  </div>
                )}
                {form.tipo_evaluacion !== 'picudo' && (
                  <div className="form-field-modal">
                    <label>Índice de severidad (%) *</label>
                    <input name="indice_severidad" type="number" step="0.01" min="0" max="100" value={form.indice_severidad} onChange={handleChange} placeholder="Ej. 18.5" required />
                  </div>
                )}
                {form.tipo_evaluacion === 'picudo' && (
                  <div className="form-field-modal">
                    <label>Adultos capturados en trampa *</label>
                    <input name="numero_adultos" type="number" min="0" value={form.numero_adultos} onChange={handleChange} placeholder="Ej. 12" required />
                  </div>
                )}

                <div className="form-field-modal">
                  <label>Latitud</label>
                  <input name="latitud" value={form.latitud} onChange={handleChange} placeholder="Ej. 8.1000000" />
                </div>
                <div className="form-field-modal">
                  <label>Longitud</label>
                  <input name="longitud" value={form.longitud} onChange={handleChange} placeholder="Ej. -76.7000000" />
                </div>
                <div className="form-field-modal">
                  <label>URL de la fotografía</label>
                  <input name="fotografia_url" value={form.fotografia_url} onChange={handleChange} placeholder="Opcional" />
                </div>
                <div className="form-field-modal" style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button type="button" className="btn-cancel" onClick={obtenerUbicacion}>Usar mi ubicación</button>
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

export default Evaluaciones;