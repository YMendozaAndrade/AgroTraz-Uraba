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
import RutaProtegida from './app/RutaProtegida';

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
          <RutaProtegida>
            <Dashboard />
          </RutaProtegida>
        }
      />
      <Route
        path="/fincas"
        element={
          <RutaProtegida>
            <Fincas />
          </RutaProtegida>
        }
      />
      <Route
        path="/lotes"
        element={
          <RutaProtegida>
            <Lotes />
          </RutaProtegida>
        }
      />
      <Route path="/evaluaciones" element={<RutaProtegida><Evaluaciones /></RutaProtegida>} />
      <Route path="/agroquimicos" element={<RutaProtegida><Agroquimicos /></RutaProtegida>} />
      <Route path="/aplicaciones" element={<RutaProtegida><Aplicaciones /></RutaProtegida>} />
      <Route path="/ordenes-corte" element={<RutaProtegida><OrdenesCorte /></RutaProtegida>} />
      <Route path="/qr" element={<RutaProtegida><QrCajas /></RutaProtegida>} />
      <Route path="/reportes" element={<RutaProtegida><Reportes /></RutaProtegida>} />
      <Route path="/usuarios" element={<RutaProtegida><Usuarios /></RutaProtegida>} />
      <Route path="/perfil" element={<RutaProtegida><Perfil /></RutaProtegida>} />
    </Routes>
  );
}

export default App;