import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import './app.css';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Inicio', roles: ['administrador', 'gerente', 'agronomo', 'evaluador_campo', 'operador_empacadora'] },
  { to: '/fincas', label: 'Fincas', roles: ['administrador', 'gerente', 'agronomo', 'evaluador_campo'] },
  { to: '/lotes', label: 'Lotes', roles: ['administrador', 'gerente', 'agronomo', 'evaluador_campo'] },
  { to: '/evaluaciones', label: 'Evaluaciones', roles: ['administrador', 'gerente', 'agronomo', 'evaluador_campo'] },
  { to: '/agroquimicos', label: 'Agroquímicos', roles: ['administrador', 'gerente', 'agronomo'] },
  { to: '/aplicaciones', label: 'Aplicaciones', roles: ['administrador', 'gerente', 'agronomo'] },
  { to: '/ordenes-corte', label: 'Órdenes de corte', roles: ['administrador', 'gerente', 'agronomo'] },
  { to: '/qr', label: 'QR / Cajas', roles: ['administrador', 'gerente', 'agronomo', 'operador_empacadora'] }
];

function AppLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  const itemsVisibles = NAV_ITEMS.filter((item) => item.roles.includes(usuario.rol));
  const paginaActual = itemsVisibles.find((item) => item.to === location.pathname)?.label || '';

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
          {itemsVisibles.map((item) => (
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
          <h1>{paginaActual}</h1>
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