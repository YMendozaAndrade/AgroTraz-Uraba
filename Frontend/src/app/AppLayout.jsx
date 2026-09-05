import { NavLink, useNavigate } from 'react-router-dom';
import './app.css';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/fincas', label: 'Fincas' },
  { to: '/lotes', label: 'Lotes' },
  { to: '/evaluaciones', label: 'Evaluaciones' },
  { to: '/agroquimicos', label: 'Agroquímicos' },
  { to: '/aplicaciones', label: 'Aplicaciones' },
  { to: '/ordenes-corte', label: 'Órdenes de corte' },
  { to: '/qr', label: 'QR / Cajas' }
];

function AppLayout({ children }) {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    navigate('/');
  }

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="app-brand">
          <span>🍌</span>
          <div>AgroTraz</div>
        </div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="app-main">
        <div className="app-topbar">
          <h1>Módulo de catastro (RF-01)</h1>
          <div className="app-user">
            <div className="info">
              <div className="nombre">{usuario.nombre}</div>
              <div className="rol">{usuario.rol}</div>
            </div>
            <div className="avatar">{(usuario.nombre || 'U').charAt(0).toUpperCase()}</div>
            <button className="btn-logout" onClick={handleLogout}>
              Salir
            </button>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

export default AppLayout;