import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './app.css';

const ICONOS = {
  '/dashboard': 'M3 10l9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z',
  '/fincas': 'M4 21V4M4 21h16M4 13h16M8 8h.01M12 8h.01M8 12h.01M12 12h.01',
  '/lotes': 'M9 8l3 3 7-7M4 21V4M4 21h16',
  '/evaluaciones': 'M4 4h16v16H4zM4 9h16M4 14h16',
  '/agroquimicos': 'M12 3v3M5.6 5.6l2.1 2.1M3 12h3M5.6 18.4l2.1-2.1M12 21v-3M18.4 18.4l-2.1-2.1M21 12h-3M18.4 5.6l-2.1 2.1M12 8v4',
  '/aplicaciones': 'M12 3v12M6 8l6-5 6 5-6 5z',
  '/ordenes-corte': 'M4 8h11v9a2 2 0 0 1-2 2H4zM15 10l5-3v9l-5-3',
  '/qr': 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h3v3h-3zM13 16h2M16 13h1M18 13v1M17 16l-1 1M21 13v7h-7',
  '/reportes': 'M4 5h16v14H4zM4 9h16M9 13h6M9 17h4M8 13h.01M12 17h.01',
  '/usuarios': 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 8v6M20 11h-6',
  '/perfil': 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  '/mapa': 'M12 2a8 8 0 0 1 8 8c0 5.4-8 12-8 12S4 15.4 4 10a8 8 0 0 1 8-8zM12 10m-3 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0',
  '/tiempo-real': 'M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1'
};

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Inicio', roles: ['administrador', 'gerente', 'agronomo', 'evaluador_campo', 'operador_empacadora'] },
  { to: '/fincas', label: 'Fincas', roles: ['administrador', 'gerente', 'agronomo', 'evaluador_campo'] },
  { to: '/lotes', label: 'Lotes', roles: ['administrador', 'gerente', 'agronomo', 'evaluador_campo'] },
  { to: '/evaluaciones', label: 'Evaluaciones', roles: ['administrador', 'gerente', 'agronomo', 'evaluador_campo'] },
  { to: '/agroquimicos', label: 'Agroquímicos', roles: ['administrador', 'gerente', 'agronomo'] },
  { to: '/aplicaciones', label: 'Aplicaciones', roles: ['administrador', 'gerente', 'agronomo'] },
  { to: '/ordenes-corte', label: 'Órdenes de corte', roles: ['administrador', 'gerente', 'agronomo'] },
  { to: '/qr', label: 'QR / Cajas', roles: ['administrador', 'gerente', 'agronomo', 'operador_empacadora'] },
  { to: '/usuarios', label: 'Usuarios', roles: ['administrador', 'gerente'] },
  { to: '/reportes', label: 'Reportes', roles: ['administrador', 'gerente', 'agronomo'] },
  { to: '/mapa', label: 'Mapa', roles: ['administrador', 'gerente', 'agronomo', 'evaluador_campo'] },
  { to: '/tiempo-real', label: 'En vivo', roles: ['administrador', 'gerente', 'agronomo'] },
  { to: '/perfil', label: 'Mi perfil', roles: ['administrador', 'gerente', 'agronomo', 'evaluador_campo', 'operador_empacadora'] }
];

function AppLayout({ children }) {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');

  const itemsVisibles = NAV_ITEMS.filter((item) => item.roles.includes(usuario.rol));

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
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={ICONOS[item.to] || 'M3 3h18v18H3z'} />
              </svg>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="side-foot">
          Bienvenida/o, {usuario.nombre || 'usuario'}<br />
          {usuario.rol} · Fin de sesión
        </div>
      </aside>
      <main className="app-main">
        <div className="app-topbar">
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