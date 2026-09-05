import AppLayout from '../app/AppLayout';

function Dashboard() {
  return (
    <AppLayout>
      <div className="panel-card">
        <h2 style={{ color: '#14532d', marginBottom: 12 }}>Bienvenido al panel de AgroTraz</h2>
        <p style={{ color: '#4b7a5a' }}>
          Usa el menú lateral para gestionar fincas, lotes y los demás módulos del sistema.
        </p>
        <div style={{ display: 'flex', gap: 16, marginTop: 20 }}>
          <div className="panel-card" style={{ margin: 0, flex: 1 }}>
            <strong style={{ color: '#14532d' }}>Fincas</strong>
            <p style={{ color: '#4b7a5a', marginTop: 4 }}>Catastro, códigos ICA y responsables.</p>
          </div>
          <div className="panel-card" style={{ margin: 0, flex: 1 }}>
            <strong style={{ color: '#14532d' }}>Lotes</strong>
            <p style={{ color: '#4b7a5a', marginTop: 4 }}>Lotificación por finca y tipo de siembra.</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default Dashboard;