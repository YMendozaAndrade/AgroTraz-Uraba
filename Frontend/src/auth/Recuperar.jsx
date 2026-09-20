import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import { authApi } from '../services/api';

function Recuperar() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setInfo(null);
    setLoading(true);
    try {
      const data = await authApi.recuperar(email);
      setInfo(data.token || data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      {error && <div className="auth-error">{error}</div>}

      {info ? (
        <div>
          <div className="auth-message">
            {typeof info === 'string' && info.length > 40 ? (
              <>
                <p>Tu token de recuperación (válido por 1 hora):</p>
                <code className="auth-token">{info}</code>
                <p>Cópialo y contínúa para restablecer tu contraseña.</p>
              </>
            ) : (
              <p>{info}</p>
            )}
          </div>
          <button className="btn-glass" onClick={() => navigate('/restablecer')}>
            Continuar al restablecimiento
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="email">Correo electrónico registrado</label>
            <input
              id="email"
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button className="btn-glass" type="submit" disabled={loading}>
            {loading ? 'Generando…' : 'Generar token'}
          </button>
        </form>
      )}

      <div className="auth-footer">
        ¿Recordaste tu contraseña? <Link to="/">Ingresa aquí</Link>
      </div>
    </AuthLayout>
  );
}

export default Recuperar;