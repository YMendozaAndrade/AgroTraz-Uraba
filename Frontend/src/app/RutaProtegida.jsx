import { Navigate } from 'react-router-dom';

function RutaProtegida({ children, roles }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/" replace />;
  }
  if (roles && roles.length > 0) {
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
    if (!roles.includes(usuario.rol)) {
      return <Navigate to="/dashboard" replace />;
    }
  }
  return children;
}

export default RutaProtegida;