import AppLayout from '../app/AppLayout';

function EnConstruccion({ titulo }) {
  return (
    <AppLayout>
      <div className="page-head">
        <h2>{titulo}</h2>
      </div>
      <div className="panel-card" style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🚧</div>
        <h3 style={{ color: '#14532d' }}>Módulo en construcción</h3>
        <p style={{ color: '#4b7a5a', marginTop: 8 }}>Este módulo se habilitará en los próximos pasos del desarrollo.</p>
      </div>
    </AppLayout>
  );
}

export default EnConstruccion;