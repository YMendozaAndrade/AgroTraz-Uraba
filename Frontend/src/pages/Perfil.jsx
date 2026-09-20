import { useState } from 'react';
import AppLayout from '../app/AppLayout';
import { authApi } from '../services/api';

function Perfil() {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const [form, setForm] = useState({ password_actual: '', password_nueva: '', confirmar: '' });
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function guardar(e) {
    e.preventDefault();
    if (form.password_nueva !== form.confirmar) {
      setError('La confirmación no coincide con la nueva contraseña');
      setMensaje(null);
      return;
    }
    if (form.password_nueva.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      setMensaje(null);
      return;
    }
    setGuardando(true);
    setError('');
    setMensaje(null);
    try {
      await authApi.cambiarPassword(form.password_actual, form.password_nueva);
      setMensaje({ tipo: 'success', texto: 'Contraseña actualizada correctamente' });
      setForm({ password_actual: '', password_nueva: '', confirmar: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
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
        <h2>Mi perfil</h2>
      </div>

      <div className="panel-card" style={{ maxWidth: 560 }}>
        <div className="form-field-modal full">
          <label>Nombre</label>
          <input value={usuario.nombre || ''} disabled />
        </div>
        <div className="form-field-modal full">
          <label>Correo electrónico</label>
          <input value={usuario.email || ''} disabled />
        </div>
        <div className="form-field-modal full">
          <label>Rol</label>
          <input value={usuario.rol || ''} disabled />
        </div>
      </div>

      <div className="panel-card" style={{ maxWidth: 560 }}>
        <h3>Cambiar contraseña</h3>
        <form onSubmit={guardar}>
          <div className="form-field-modal full">
            <label>Contraseña actual</label>
            <input
              type="password"
              name="password_actual"
              value={form.password_actual}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-field-modal full">
            <label>Nueva contraseña</label>
            <input
              type="password"
              name="password_nueva"
              value={form.password_nueva}
              onChange={handleChange}
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>
          <div className="form-field-modal full">
            <label>Confirmar nueva contraseña</label>
            <input
              type="password"
              name="confirmar"
              value={form.confirmar}
              onChange={handleChange}
              required
            />
          </div>
          <div style={{ marginTop: 14 }}>
            <button type="submit" className="btn-save" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}

export default Perfil;