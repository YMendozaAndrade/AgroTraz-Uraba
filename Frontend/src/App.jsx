import { Routes, Route } from 'react-router-dom';
import Login from './auth/Login';
import Registro from './auth/Registro';
import Recuperar from './auth/Recuperar';
import Restablecer from './auth/Restablecer';
import Dashboard from './pages/Dashboard';
import Fincas from './pages/Fincas';
import Lotes from './pages/Lotes';
import Agroquimicos from './pages/Agroquimicos';
import Aplicaciones from './pages/Aplicaciones';
import Evaluaciones from './pages/Evaluaciones';
import OrdenesCorte from './pages/OrdenesCorte';
import QrCajas from './pages/QrCajas';
import Reportes from './pages/Reportes';
import Usuarios from './pages/Usuarios';
import Perfil from './pages/Perfil';
import Mapa from './pages/Mapa';
import RutaProtegida from './app/RutaProtegida';

// Roles por ruta (igual que el menú en AppLayout.jsx)
const R = {
  todos: ['administrador', 'gerente', 'agronomo', 'evaluador_campo', 'operador_empacadora'],
  campo: ['administrador', 'gerente', 'agronomo', 'evaluador_campo'],
  tecnico: ['administrador', 'gerente', 'agronomo'],
  empaque: ['administrador', 'gerente', 'agronomo', 'operador_empacadora'],
  admin: ['administrador', 'gerente']
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/recuperar" element={<Recuperar />} />
      <Route path="/restablecer" element={<Restablecer />} />
      <Route
        path="/dashboard"
        element={
          <RutaProtegida roles={R.todos}>
            <Dashboard />
          </RutaProtegida>
        }
      />
      <Route
        path="/fincas"
        element={
          <RutaProtegida roles={R.campo}>
            <Fincas />
          </RutaProtegida>
        }
      />
      <Route
        path="/lotes"
        element={
          <RutaProtegida roles={R.campo}>
            <Lotes />
          </RutaProtegida>
        }
      />
      <Route path="/evaluaciones" element={<RutaProtegida roles={R.campo}><Evaluaciones /></RutaProtegida>} />
      <Route path="/agroquimicos" element={<RutaProtegida roles={R.tecnico}><Agroquimicos /></RutaProtegida>} />
      <Route path="/aplicaciones" element={<RutaProtegida roles={R.tecnico}><Aplicaciones /></RutaProtegida>} />
      <Route path="/ordenes-corte" element={<RutaProtegida roles={R.tecnico}><OrdenesCorte /></RutaProtegida>} />
      <Route path="/qr" element={<RutaProtegida roles={R.empaque}><QrCajas /></RutaProtegida>} />
      <Route path="/reportes" element={<RutaProtegida roles={R.tecnico}><Reportes /></RutaProtegida>} />
      <Route path="/usuarios" element={<RutaProtegida roles={R.admin}><Usuarios /></RutaProtegida>} />
      <Route path="/perfil" element={<RutaProtegida roles={R.todos}><Perfil /></RutaProtegida>} />
      <Route path="/mapa" element={<RutaProtegida roles={R.campo}><Mapa /></RutaProtegida>} />
    </Routes>
  );
}

export default App;