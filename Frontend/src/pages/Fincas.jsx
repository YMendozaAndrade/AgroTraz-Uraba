import { useEffect, useState } from 'react';
import AppLayout from '../app/AppLayout';
import { fincasApi, usuariosApi, asignacionesApi } from '../services/api';

const VACIO = {
  nombre: '',
  codigo_ica: '',
  municipio: '',
  departamento: 'Antioquia',
  direccion: '',
  area_hectareas: '',
  encargado_responsable: '',
  observaciones: '',
  latitud: '',
  longitud: ''
};

function Fincas() {
  const [fincas, setFincas] = useState([]);
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const puedeGestionar = usuario.rol === 'administrador' || usuario.rol === 'gerente';
  const [loading, setLoading] = useState(true);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editar, setEditar] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState('');

  const [modalUsuarios, setModalUsuarios] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [usuariosActivos, setUsuariosActivos] = useState([]);
  const [asignaciones, setAsignaciones] = useState([]);
  const [usuarioSel, setUsuarioSel] = useState('');
  const [usuarioSelError, setUsuarioSelError] = useState('');

  async function cargar() {
    try {
      const [data, usuariosData] = await Promise.all([fincasApi.listar(), usuariosApi.listar()]);
      setFincas(data.fincas);
      setUsuariosActivos(usuariosData.usuarios || []);
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

  function abrirEditar(finca) {
    setEditar(finca);
    setForm({
      nombre: finca.nombre,
      codigo_ica: finca.codigo_ica,
      municipio: finca.municipio || '',
      departamento: finca.departamento || 'Antioquia',
      direccion: finca.direccion || '',
      area_hectareas: finca.area_hectareas || '',
      encargado_responsable: finca.encargado_responsable || '',
      observaciones: finca.observaciones || '',
      latitud: finca.latitud ?? '',
      longitud: finca.longitud ?? ''
    });
    setError('');
    setModalAbierto(true);
  }

  const [obteniendoUbicacion, setObteniendoUbicacion] = useState(false);

  function usarMiUbicacion() {
    if (!navigator.geolocation) {
      setError('Este navegador no soporta geolocalización');
      return;
    }
    setObteniendoUbicacion(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitud: Number(pos.coords.latitude.toFixed(6)),
          longitud: Number(pos.coords.longitude.toFixed(6))
        }));
        setObteniendoUbicacion(false);
      },
      (err) => {
        setObteniendoUbicacion(false);
        setError(`No se pudo obtener la ubicación: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
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
        area_hectareas: form.area_hectareas === '' ? null : Number(form.area_hectareas)
      };
      if (editar) {
        await fincasApi.actualizar(editar.id_finca, payload);
        setMensaje({ tipo: 'success', texto: 'Finca actualizada correctamente' });
      } else {
        await fincasApi.crear(payload);
        setMensaje({ tipo: 'success', texto: 'Finca creada correctamente' });
      }
      setModalAbierto(false);
      cargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  async function handleDesactivar(finca) {
    if (!window.confirm(`¿Desactivar la finca "${finca.nombre}"?`)) return;
    try {
      await fincasApi.desactivar(finca.id_finca);
      setMensaje({ tipo: 'success', texto: 'Finca desactivada' });
      cargar();
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
    }
  }

  function cerrarMensaje() {
    setMensaje(null);
  }

  function abrirUsuarios(finca) {
    setModalUsuarios(finca);
    setUsuarioSel('');
    setUsuarioSelError('');
    listarUsuarios();
  }

  async function listarUsuarios() {
    try {
      const [u, a] = await Promise.all([usuariosApi.listar(), asignacionesApi.listar()]);
      setUsuarios(u.usuarios);
      setAsignaciones(a.asignaciones);
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
    }
  }

  const asignadosEnFinca = modalUsuarios
    ? asignaciones.filter((a) => a.id_finca === modalUsuarios.id_finca)
    : [];

  const disponibles = usuarios.filter(
    (u) => !asignadosEnFinca.some((a) => a.id_usuario === u.id_usuario)
  );

  async function handleAsignar(e) {
    e.preventDefault();
    if (!usuarioSel) {
      setUsuarioSelError('Selecciona un usuario');
      return;
    }
    try {
      await asignacionesApi.asignar(Number(usuarioSel), modalUsuarios.id_finca);
      setUsuarioSel('');
      setUsuarioSelError('');
      listarUsuarios();
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
    }
  }

  async function handleQuitar(asignacion) {
    if (!window.confirm(`¿Quitar a "${asignacion.usuario}" de "${asignacion.finca}"?`)) return;
    try {
      await asignacionesApi.quitar(asignacion.id_usuario, asignacion.id_finca);
      listarUsuarios();
    } catch (e) {
      setMensaje({ tipo: 'error', texto: e.message });
    }
  }

  return (
    <AppLayout>
      {mensaje && (
        <div className={`alert ${mensaje.tipo === 'success' ? 'alert-success' : 'alert-error'}`} onClick={cerrarMensaje}>
          {mensaje.texto}
        </div>
      )}
      <div className="page-head">
        <h2>Fincas registradas</h2>
        {puedeGestionar && (
          <button className="btn-primary" onClick={abrirCrear}>
            + Nueva finca
          </button>
        )}
      </div>

      <div className="panel-card">
        {loading ? (
          <p>Cargando fincas…</p>
        ) : fincas.length === 0 ? (
          <p>No hay fincas registradas todavía.</p>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Código ICA</th>
                  <th>Municipio</th>
                  <th>Área (ha)</th>
                  <th>Ubicación</th>
                  <th>Encargado</th>
                  <th>Estado</th>
                  {puedeGestionar && (
                    <>
                      <th>Usuarios</th>
                      <th>Acciones</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {fincas.map((f) => (
                  <tr key={f.id_finca}>
                    <td>{f.nombre}</td>
                    <td>{f.codigo_ica}</td>
                    <td>{f.municipio}</td>
                    <td>{Number(f.area_hectareas || 0).toFixed(2)}</td>
                    <td>{f.latitud != null && f.longitud != null ? `${f.latitud}, ${f.longitud}` : '—'}</td>
                    <td>{f.encargado_responsable}</td>
                    <td>
                      <span className={`badge ${f.activo ? 'badge-activo' : 'badge-inactivo'}`}>
                        {f.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    </td>
                    {puedeGestionar && (
                      <td>
                        <button className="action-btn edit" onClick={() => abrirUsuarios(f)}>
                          Usuarios
                        </button>
                      </td>
                    )}
                    {puedeGestionar && (
                      <td>
                        <button className="action-btn edit" onClick={() => abrirEditar(f)}>
                          Editar
                        </button>
                        <button className="action-btn delete" onClick={() => handleDesactivar(f)}>
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
            <h3>{editar ? 'Editar finca' : 'Nueva finca'}</h3>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-field-modal">
                  <label>Nombre *</label>
                  <input name="nombre" value={form.nombre} onChange={handleChange} required />
                </div>
                <div className="form-field-modal">
                  <label>Código ICA *</label>
                  <input name="codigo_ica" value={form.codigo_ica} onChange={handleChange} required />
                </div>
                <div className="form-field-modal">
                  <label>Municipio</label>
                  <input name="municipio" value={form.municipio} onChange={handleChange} placeholder="Apartadó" />
                </div>
                <div className="form-field-modal">
                  <label>Departamento</label>
                  <input name="departamento" value={form.departamento} onChange={handleChange} />
                </div>
                <div className="form-field-modal">
                  <label>Dirección</label>
                  <input name="direccion" value={form.direccion} onChange={handleChange} />
                </div>
                <div className="form-field-modal">
                  <label>Área (hectáreas)</label>
                  <input name="area_hectareas" type="number" step="0.01" min="0" value={form.area_hectareas} onChange={handleChange} />
                </div>
                <div className="form-field-modal full">
                  <label>Ubicación (latitud, longitud)</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input name="latitud" type="number" step="any" value={form.latitud} onChange={handleChange} placeholder="Latitud" />
                    <input name="longitud" type="number" step="any" value={form.longitud} onChange={handleChange} placeholder="Longitud" />
                    <button type="button" className="btn-loc" onClick={usarMiUbicacion} disabled={obteniendoUbicacion}>
                      {obteniendoUbicacion ? 'Obteniendo…' : 'Usar mi ubicación'}
                    </button>
                  </div>
                  {form.latitud !== '' && form.longitud !== '' && (
                    <a
                      href={`https://www.google.com/maps?q=${form.latitud},${form.longitud}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: 13, color: '#166534' }}
                    >
                      Ver en el mapa
                    </a>
                  )}
                </div>
                <div className="form-field-modal full">
                  <label>Encargado responsable</label>
                  <select name="encargado_responsable" value={form.encargado_responsable} onChange={handleChange}>
                    <option value="">— Seleccione un responsable —</option>
                    {usuariosActivos.map((u) => (
                      <option key={u.id_usuario} value={u.nombre}>
                        {u.nombre} ({u.rol})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field-modal full">
                  <label>Observaciones</label>
                  <textarea name="observaciones" rows="2" value={form.observaciones} onChange={handleChange} />
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

      {modalUsuarios && (
        <div className="modal-overlay" onClick={() => setModalUsuarios(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Usuarios de {modalUsuarios.nombre}</h3>
            {usuarioSelError && <div className="alert alert-error">{usuarioSelError}</div>}

            <form className="form-grid" onSubmit={handleAsignar}>
              <div className="form-field-modal">
                <label>Agregar usuario</label>
                <select value={usuarioSel} onChange={(e) => setUsuarioSel(e.target.value)}>
                  <option value="">Seleccione un usuario</option>
                  {disponibles.map((u) => (
                    <option key={u.id_usuario} value={u.id_usuario}>
                      {u.nombre} ({u.rol})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field-modal">
                <label>&nbsp;</label>
                <button type="submit" className="btn-save" style={{ width: '100%' }}>
                  Asignar
                </button>
              </div>
            </form>

            <div style={{ marginTop: 18 }}>
              {asignadosEnFinca.length === 0 ? (
                <p style={{ color: '#6b8f7a', fontSize: 14 }}>Sin usuarios asignados.</p>
              ) : (
                <div className="table-responsive">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Usuario</th>
                        <th>Rol</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {asignadosEnFinca.map((a) => (
                        <tr key={a.id_usuario_finca}>
                          <td>{a.usuario}</td>
                          <td>{a.rol}</td>
                          <td>
                            <button className="action-btn delete" onClick={() => handleQuitar(a)}>
                              Quitar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="button" className="btn-cancel" onClick={() => setModalUsuarios(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default Fincas;