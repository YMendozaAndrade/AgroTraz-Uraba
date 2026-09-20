import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { authApi } from '../services/api';

function Restablecer() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ token: '', password_nueva: '', confirmar: '' });
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password_nueva !== form.confirmar) {
      setError('La confirmación no coincide con la nueva contraseña');
      return;
    }
    if (form.password_nueva.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await authApi.restablecer(form.token, form.password_nueva);
      setOk(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (ok) {
    return (
      <AuthLayout>
        <div className="auth-message">
          <p>¡Contraseña restablecida correctamente! Ya puedes iniciar sesión.</p>
        </div>
        <button className="btn-glass" onClick={() => navigate('/')}>
          Ir a iniciar sesión
        </button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      {error && <div className="auth-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="token">Token de recuperación</label>
          <input
            id="token"
            name="token"
            placeholder="Pega aquí el token generado"
            value={form.token}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="password_nueva">Nueva contraseña</label>
          <input
            id="password_nueva"
            name="password_nueva"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={form.password_nueva}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="confirmar">Confirmar nueva contraseña</label>
          <input
            id="confirmar"
            name="confirmar"
            type="password"
            value={form.confirmar}
            onChange={handleChange}
            required
          />
        </div>
        <button className="btn-glass" type="submit" disabled={loading}>
          {loading ? 'Restableciendo…' : 'Restablecer contraseña'}
        </button>
      </form>
      <div className="auth-footer">
        ¿No tienes token? <Link to="/recuperar">Solicita uno aquí</Link>
      </div>
    </AuthLayout>
  );
}

export default Restablecer;