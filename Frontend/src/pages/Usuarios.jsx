import { useEffect, useState } from 'react';
import AppLayout from '../app/AppLayout';
import { usuariosApi } from '../services/api';

const ROLES = [
  { value: 'administrador', label: 'Administrador' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'agronomo', label: 'Agrónomo' },
  { value: 'evaluador_campo', label: 'Evaluador de campo' },
  { value: 'operador_empacadora', label: 'Operador de empacadora' }
];

const ROL_LABEL = ROLES.reduce((acc, r) => ({ ...acc, [r.value]: r.label }), {});

function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [cambiando, setCambiando] = useState(null);
  const [abierto, setAbierto] = useState(null);
  const yo = JSON.parse(localStorage.getItem('usuario') || '{}');

  async function cargar() {
    try {
      const data = await usuariosApi.listar(true);
      setUsuarios(data.usuarios || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function guardarRol(usuario, rolNuevo) {
    if (!rolNuevo) return;
    if (window.confirm(`¿Cambiar el rol de "${usuario.nombre}" a "${ROL_LABEL[rolNuevo]}"?`)) {
      setCambiando(usuario.id_usuario);
      setMensaje(null);
      setError('');
      try {
        await usuariosApi.cambiarRol(usuario.id_usuario, rolNuevo);
        setMensaje({ tipo: 'success', texto: 'Rol actualizado correctamente' });
        setAbierto(null);
        cargar();
      } catch (e) {
        setError(e.message);
      } finally {
        setCambiando(null);
      }
    }
  }

  async function cambiarEstado(usuario, activo) {
    const accion = activo ? 'activar' : 'desactivar';
    if (window.confirm(`¿${activo ? 'Activar' : 'Desactivar'} al usuario "${usuario.nombre}"?`)) {
      setCambiando(usuario.id_usuario);
      setMensaje(null);
      setError('');
      try {
        await usuariosApi.cambiarEstado(usuario.id_usuario, activo);
        setMensaje({ tipo: 'success', texto: `Usuario ${accion === 'activar' ? 'activado' : 'desactivado'} correctamente` });
        setAbierto(null);
        cargar();
      } catch (e) {
        setError(e.message);
      } finally {
        setCambiando(null);
      }
    }
  }

  return (
    <AppLayout>
      {(mensaje || error) && (
        <div
          className={`alert ${mensaje ? 'alert-success' : 'alert-error'}`}
          onClick={() => {
            setMensaje(null);
            setError('');
          }}
        >
          {mensaje ? mensaje.texto : error}
        </div>
      )}
      <div className="page-head">
        <h2>Usuarios del sistema</h2>
      </div>

      {loading ? (
        <div className="panel-card"><p>Cargando usuarios…</p></div>
      ) : usuarios.length === 0 ? (
        <div className="panel-card"><p>No hay usuarios registrados.</p></div>
      ) : (
        <div className="accordion-list">
          {usuarios.map((u) => {
            const esAbierto = abierto === u.id_usuario;
            return (
              <div className={`accordion-item ${esAbierto ? 'open' : ''}`} key={u.id_usuario}>
                <button
                  type="button"
                  className="accordion-head"
                  onClick={() => setAbierto(esAbierto ? null : u.id_usuario)}
                >
                  <span className="accordion-avatar">{(u.nombre || 'U').charAt(0).toUpperCase()}</span>
                  <span className="accordion-nombre">
                    {u.nombre}
                    {u.id_usuario === yo.id_usuario && (
                      <span className="badge badge-activo" style={{ marginLeft: 8 }}>Usted</span>
                    )}
                  </span>
                  <span className={`badge badge-${u.activo ? 'activo' : 'inactivo'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  <span className="badge badge-inactivo">{ROL_LABEL[u.rol] || u.rol}</span>
                  <span className="accordion-flecha">{esAbierto ? '▴' : '▾'}</span>
                </button>

                {esAbierto && (
                  <div className="accordion-body">
                    <div className="accordion-datos">
                      <div><span>Email</span><strong>{u.email}</strong></div>
                      <div><span>Teléfono</span><strong>{u.telefono || '—'}</strong></div>
                      <div><span>Rol actual</span><strong>{ROL_LABEL[u.rol] || u.rol}</strong></div>
                    </div>
                    <div className="accordion-cambiar">
                      <label htmlFor={`rol-${u.id_usuario}`}>Nuevo rol</label>
                      <select
                        id={`rol-${u.id_usuario}`}
                        value=""
                        disabled={cambiando === u.id_usuario}
                        onChange={(e) => guardarRol(u, e.target.value)}
                      >
                        <option value="">— Seleccione un rol —</option>
                        {ROLES.filter((r) => r.value !== u.rol).map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                      {cambiando === u.id_usuario && <span className="rep-dim"> Guardando…</span>}
                    </div>
                    {u.id_usuario !== yo.id_usuario && (
                      <div className="accordion-cambiar" style={{ marginTop: 14 }}>
                        <label>Estado de la cuenta</label>
                        <button
                          type="button"
                          className={`btn btn-${u.activo ? 'danger' : 'light'}`}
                          disabled={cambiando === u.id_usuario}
                          onClick={() => cambiarEstado(u, !u.activo)}
                        >
                          {u.activo ? 'Desactivar usuario' : 'Activar usuario'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}

export default Usuarios;