import { useEffect, useState } from 'react';
import AppLayout from '../app/AppLayout';
import { agroquimicosApi } from '../services/api';

const VACIO = {
  nombre: '',
  ingrediente_activo: '',
  registro_ica: '',
  tipo_producto: 'fungicida',
  dosis_recomendada: '',
  dias_carencia: ''
};

const TIPOS = [
  { value: 'fungicida', label: 'Fungicida' },
  { value: 'insecticida', label: 'Insecticida' },
  { value: 'fertilizante', label: 'Fertilizante' },
  { value: 'herbicida', label: 'Herbicida' },
  { value: 'otros', label: 'Otros' }
];

function Agroquimicos() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editar, setEditar] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState('');

  async function cargar() {
    try {
      const data = await agroquimicosApi.listar();
      setItems(data.agroquimicos);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrirCrear() {
    setEditar(null);
    setForm(VACIO);
    setError('');
    setModalAbierto(true);
  }

  function abrirEditar(item) {
    setEditar(item);
    setForm({
      nombre: item.nombre,
      ingrediente_activo: item.ingrediente_activo,
      registro_ica: item.registro_ica,
      tipo_producto: item.tipo_producto,
      dosis_recomendada: item.dosis_recomendada || '',
      dias_carencia: item.dias_carencia
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
        dias_carencia: Number(form.dias_carencia)
      };
      if (editar) {
        await agroquimicosApi.actualizar(editar.id_agroquimico, payload);
        setMensaje({ tipo: 'success', texto: 'Agroquímico actualizado' });
      } else {
        await agroquimicosApi.crear(payload);
        setMensaje({ tipo: 'success', texto: 'Agroquímico creado' });
      }
      setModalAbierto(false);
      cargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  async function handleDesactivar(item) {
    if (!window.confirm(`¿Desactivar "${item.nombre}"?`)) return;
    try {
      await agroquimicosApi.desactivar(item.id_agroquimico);
      setMensaje({ tipo: 'success', texto: 'Agroquímico desactivado' });
      cargar();
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
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
        <h2>Agroquímicos</h2>
        <button className="btn-primary" onClick={abrirCrear}>
          + Nuevo agroquímico
        </button>
      </div>

      <div className="panel-card">
        {loading ? (
          <p>Cargando agroquímicos…</p>
        ) : items.length === 0 ? (
          <p>No hay agroquímicos registrados todavía.</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Ingrediente activo</th>
                  <th>Registro ICA</th>
                  <th>Tipo</th>
                  <th>Dosis</th>
                  <th>Carencia (días)</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id_agroquimico}>
                    <td>{i.nombre}</td>
                    <td>{i.ingrediente_activo}</td>
                    <td>{i.registro_ica}</td>
                    <td>
                      <span className="badge badge-banano">{i.tipo_producto}</span>
                    </td>
                    <td>{i.dosis_recomendada || '—'}</td>
                    <td><strong>{i.dias_carencia}</strong></td>
                    <td>
                      <span className={`badge ${i.activo ? 'badge-activo' : 'badge-inactivo'}`}>
                        {i.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <button className="action-btn edit" onClick={() => abrirEditar(i)}>Editar</button>
                      <button className="action-btn delete" onClick={() => handleDesactivar(i)}>Desactivar</button>
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
            <h3>{editar ? 'Editar agroquímico' : 'Nuevo agroquímico'}</h3>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-field-modal">
                  <label>Nombre *</label>
                  <input name="nombre" value={form.nombre} onChange={handleChange} required />
                </div>
                <div className="form-field-modal">
                  <label>Ingrediente activo *</label>
                  <input name="ingrediente_activo" value={form.ingrediente_activo} onChange={handleChange} required />
                </div>
                <div className="form-field-modal">
                  <label>Registro ICA *</label>
                  <input name="registro_ica" value={form.registro_ica} onChange={handleChange} required />
                </div>
                <div className="form-field-modal">
                  <label>Tipo de producto</label>
                  <select name="tipo_producto" value={form.tipo_producto} onChange={handleChange}>
                    {TIPOS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field-modal">
                  <label>Dosis recomendada</label>
                  <input name="dosis_recomendada" value={form.dosis_recomendada} onChange={handleChange} placeholder="1.5 L/ha" />
                </div>
                <div className="form-field-modal">
                  <label>Días de carencia *</label>
                  <input name="dias_carencia" type="number" min="0" value={form.dias_carencia} onChange={handleChange} required />
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

export default Agroquimicos;