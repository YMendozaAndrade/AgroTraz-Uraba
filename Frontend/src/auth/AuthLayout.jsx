import './auth.css';

function AuthLayout({ children }) {
  return (
    <div className="auth-screen">
      <div className="glass-card">
        <div className="auth-header">
          <div className="auth-logo">🍌</div>
          <h1 className="auth-title">AgroTraz</h1>
          <p className="auth-subtitle">Trazabilidad de cosecha · Urabá</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export default AuthLayout;