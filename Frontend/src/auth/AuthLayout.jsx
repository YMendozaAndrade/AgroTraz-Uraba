import './auth.css';

function AuthLayout({ children }) {
  return (
    <div className="auth-screen">
      <div className="auth-panel">
        <div className="auth-photo">
          <img
            src="/img/portada.jpg"
            alt="Plantación de banano"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div className="auth-veil"></div>
          <div className="auth-quote">
            <p>“El campo no espera:<br />los registros tampoco.”</p>
            <span>Trazabilidad fitosanitaria de banano y plátano para Urabá.</span>
          </div>
        </div>
        <div className="auth-form-side">
          <div className="auth-box">
            <div className="auth-header">
              <div className="auth-logo">🍌</div>
              <h1 className="auth-title">AgroTraz</h1>
              <p className="auth-subtitle">Bienvenido de nuevo</p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;