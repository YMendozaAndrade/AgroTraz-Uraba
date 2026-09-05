import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { authApi } from '../services/api';

const ROLES = [
  { value: 'administrador', label: 'Administrador' },
  { value: 'agronomo', label: 'Agrónomo' },
  { value: 'evaluador_campo', label: 'Evaluador de campo' },
  { value: 'operador_empacadora', label: 'Operador de empacadora' },
  { value: 'gerente', label: 'Gerente' }
];

function Registro() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    password: '',
    telefono: '',
    rol: 'evaluador_campo'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.register(form);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      {error && <div className="auth-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="nombre">Nombre completo</label>
          <input
            id="nombre"
            name="nombre"
            type="text"
            placeholder="Ej: Juan Pérez"
            value={form.nombre}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="email">Correo electrónico</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="correo@ejemplo.com"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={form.password}
            onChange={handleChange}
            required
            minLength={6}
          />
        </div>
        <div className="form-field">
          <label htmlFor="telefono">Teléfono (opcional)</label>
          <input
            id="telefono"
            name="telefono"
            type="tel"
            placeholder="300 123 4567"
            value={form.telefono}
            onChange={handleChange}
          />
        </div>
        <div className="form-field">
          <label htmlFor="rol">Rol</label>
          <select id="rol" name="rol" value={form.rol} onChange={handleChange}>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-glass" type="submit" disabled={loading}>
          {loading ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>
      <div className="auth-footer">
        ¿Ya tienes cuenta? <Link to="/">Inicia sesión</Link>
      </div>
    </AuthLayout>
  );
}

export default Registro;