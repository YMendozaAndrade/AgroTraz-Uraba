import { Routes, Route } from 'react-router-dom';
import Login from './auth/Login';
import Registro from './auth/Registro';
import Dashboard from './pages/Dashboard';
import Fincas from './pages/Fincas';
import Lotes from './pages/Lotes';
import EnConstruccion from './pages/EnConstruccion';
import Agroquimicos from './pages/Agroquimicos';
import Aplicaciones from './pages/Aplicaciones';
import RutaProtegida from './app/RutaProtegida';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
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
      <Route path="/evaluaciones" element={<RutaProtegida><EnConstruccion titulo="Evaluaciones fitosanitarias" /></RutaProtegida>} />
      <Route path="/agroquimicos" element={<RutaProtegida><Agroquimicos /></RutaProtegida>} />
      <Route path="/aplicaciones" element={<RutaProtegida><Aplicaciones /></RutaProtegida>} />
      <Route path="/ordenes-corte" element={<RutaProtegida><EnConstruccion titulo="Órdenes de corte" /></RutaProtegida>} />
      <Route path="/qr" element={<RutaProtegida><EnConstruccion titulo="QR / Cajas" /></RutaProtegida>} />
    </Routes>
  );
}

export default App;