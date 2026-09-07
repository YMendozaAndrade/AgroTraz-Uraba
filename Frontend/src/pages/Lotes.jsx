import { useEffect, useState } from 'react';
import AppLayout from '../app/AppLayout';
import { lotesApi, fincasApi } from '../services/api';

const VACIO = {
  id_finca: '',
  nombre: '',
  tipo_siembra: 'banano',
  area_hectareas: '',
  densidad_plantas: '',
  estado: 'disponible'
};

function Lotes() {
  const [lotes, setLotes] = useState([]);
  const [fincas, setFincas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editar, setEditar] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState('');
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const puedeGestionar = ['administrador', 'gerente', 'agronomo'].includes(usuario.rol);

  async function cargarTodo() {
    try {
      const [lotesData, fincasData] = await Promise.all([lotesApi.listar(), fincasApi.listar()]);
      setLotes(lotesData.lotes);
      setFincas(fincasData.fincas);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarTodo();
  }, []);

  function abrirCrear() {
    setEditar(null);
    setForm({ ...VACIO, id_finca: fincas.length > 0 ? fincas[0].id_finca : '' });
    setError('');
    setModalAbierto(true);
  }

  function abrirEditar(lote) {
    setEditar(lote);
    setForm({
      id_finca: lote.id_finca,
      nombre: lote.nombre,
      tipo_siembra: lote.tipo_siembra,
      area_hectareas: lote.area_hectareas || '',
      densidad_plantas: lote.densidad_plantas || '',
      estado: lote.estado
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
      const payload = {
        ...form,
        id_finca: Number(form.id_finca),
        area_hectareas: form.area_hectareas === '' ? null : Number(form.area_hectareas),
        densidad_plantas: form.densidad_plantas === '' ? null : Number(form.densidad_plantas)
      };
      if (editar) {
        await lotesApi.actualizar(editar.id_lote, payload);
        setMensaje({ tipo: 'success', texto: 'Lote actualizado correctamente' });
      } else {
        await lotesApi.crear(payload);
        setMensaje({ tipo: 'success', texto: 'Lote creado correctamente' });
      }
      setModalAbierto(false);
      cargarTodo();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  async function handleDesactivar(lote) {
    if (!window.confirm(`¿Desactivar el lote "${lote.nombre}"?`)) return;
    try {
      await lotesApi.desactivar(lote.id_lote);
      setMensaje({ tipo: 'success', texto: 'Lote desactivado' });
      cargarTodo();
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
    }
  }

  function cerrarMensaje() {
    setMensaje(null);
  }

  return (
    <AppLayout>
      {mensaje && (
        <div className={`alert ${mensaje.tipo === 'success' ? 'alert-success' : 'alert-error'}`} onClick={cerrarMensaje}>
          {mensaje.texto}
        </div>
      )}
      <div className="page-head">
        <h2>Lotes registrados</h2>
        {puedeGestionar && (
          <button className="btn-primary" onClick={abrirCrear}>
            + Nuevo lote
          </button>
        )}
      </div>

      <div className="panel-card">
        {loading ? (
          <p>Cargando lotes…</p>
        ) : lotes.length === 0 ? (
          <p>No hay lotes registrados todavía. Crea uno con el botón "+ Nuevo lote".</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Lote</th>
                  <th>Finca</th>
                  <th>Tipo</th>
                  <th>Área (ha)</th>
                  <th>Densidad</th>
                  <th>Estado</th>
                  <th>Activo</th>
                  {puedeGestionar && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {lotes.map((l) => (
                  <tr key={l.id_lote}>
                    <td>{l.nombre}</td>
                    <td>{l.finca}</td>
                    <td>
                      <span className={`badge ${l.tipo_siembra === 'banano' ? 'badge-banano' : 'badge-platano'}`}>
                        {l.tipo_siembra}
                      </span>
                    </td>
                    <td>{Number(l.area_hectareas || 0).toFixed(2)}</td>
                    <td>{l.densidad_plantas || '—'}</td>
                    <td>
                      <span className={`badge badge-${l.estado}`}>{l.estado}</span>
                    </td>
                    <td>
                      <span className={`badge ${l.activo ? 'badge-activo' : 'badge-inactivo'}`}>
                        {l.activo ? 'Sí' : 'No'}
                      </span>
                    </td>
                    {puedeGestionar && (
                      <td>
                        <button className="action-btn edit" onClick={() => abrirEditar(l)}>
                          Editar
                        </button>
                        <button className="action-btn delete" onClick={() => handleDesactivar(l)}>
                          Desactivar
                        </button>
                      </td>
                    )}
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
            <h3>{editar ? 'Editar lote' : 'Nuevo lote'}</h3>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-field-modal">
                  <label>Finca *</label>
                  <select name="id_finca" value={form.id_finca} onChange={handleChange} required>
                    <option value="">Seleccione una finca</option>
                    {fincas.map((f) => (
                      <option key={f.id_finca} value={f.id_finca}>
                        {f.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field-modal">
                  <label>Nombre *</label>
                  <input name="nombre" value={form.nombre} onChange={handleChange} required placeholder="Lote A" />
                </div>
                <div className="form-field-modal">
                  <label>Tipo de siembra *</label>
                  <select name="tipo_siembra" value={form.tipo_siembra} onChange={handleChange}>
                    <option value="banano">Banano</option>
                    <option value="platano">Plátano</option>
                  </select>
                </div>
                <div className="form-field-modal">
                  <label>Estado</label>
                  <select name="estado" value={form.estado} onChange={handleChange}>
                    <option value="disponible">Disponible</option>
                    <option value="restringido">Restringido</option>
                    <option value="cuarentena">Cuarentena</option>
                  </select>
                </div>
                <div className="form-field-modal">
                  <label>Área (hectáreas)</label>
                  <input name="area_hectareas" type="number" step="0.01" min="0" value={form.area_hectareas} onChange={handleChange} />
                </div>
                <div className="form-field-modal">
                  <label>Densidad de plantas</label>
                  <input name="densidad_plantas" type="number" min="0" value={form.densidad_plantas} onChange={handleChange} />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setModalAbierto(false)}>
                  Cancelar
                </button>
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

export default Lotes;