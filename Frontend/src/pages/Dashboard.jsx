import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../app/AppLayout';
import {
  fincasApi,
  lotesApi,
  aplicacionesApi,
  evaluacionesApi,
  ordenesCorteApi,
  qrCajasApi
} from '../services/api';

const ACCESO_RAPIDO = [
  { to: '/fincas', titulo: 'Fincas', descripcion: 'Catastro, códigos ICA y responsables', roles: ['administrador', 'gerente', 'agronomo', 'evaluador_campo'] },
  { to: '/lotes', titulo: 'Lotes', descripcion: 'Lotificación, tipo de siembra y estado', roles: ['administrador', 'gerente', 'agronomo', 'evaluador_campo'] },
  { to: '/evaluaciones', titulo: 'Evaluaciones', descripcion: 'Sigatoka, Moko/Fusarium y Picudo', roles: ['administrador', 'gerente', 'agronomo', 'evaluador_campo'] },
  { to: '/aplicaciones', titulo: 'Aplicaciones', descripcion: 'Registro y control de carencia', roles: ['administrador', 'gerente', 'agronomo'] },
  { to: '/agroquimicos', titulo: 'Agroquímicos', descripcion: 'Catálogo con códigos ICA', roles: ['administrador', 'gerente', 'agronomo'] },
  { to: '/ordenes-corte', titulo: 'Órdenes de corte', descripcion: 'Planificación con bloqueo por carencia', roles: ['administrador', 'gerente', 'agronomo'] },
  { to: '/qr', titulo: 'QR / Cajas', descripcion: 'Empaque y trazabilidad del producto', roles: ['administrador', 'gerente', 'agronomo', 'operador_empacadora'] }
];

function Dashboard() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    Promise.all([
      fincasApi.listar(),
      lotesApi.listar(),
      aplicacionesApi.listar(),
      evaluacionesApi.listar(),
      ordenesCorteApi.listar(),
      qrCajasApi.listar()
    ])
      .then(([f, l, a, e, o, q]) => setDatos({ fincas: f.fincas, lotes: l.lotes, aplicaciones: a.aplicaciones, evaluaciones: e.evaluaciones, ordenes: o.ordenes, qrs: q.qrs }))
      .catch(() => setDatos(null));
  }, []);

  const hoy = new Date().toISOString().slice(0, 10);

  const lotesEnCarencia = (datos?.lotes || [])
    .filter((lote) =>
      (datos?.aplicaciones || []).some((a) => a.id_lote === lote.id_lote && a.fecha_fin_carencia >= hoy)
    ).length;

  const lotesCuarentena = (datos?.lotes || []).filter((l) => l.estado === 'cuarentena').length;
  const lotesRestringidos = (datos?.lotes || []).filter((l) => l.estado === 'restringido').length;
  const ordenesProgramadas = (datos?.ordenes || []).filter((o) => o.estado === 'programada').length;
  const evaluacionesActivas = (datos?.evaluaciones || []).filter((e) => e.sincronizada === 1).length;

  const nec = new Date();
  const fechaFriendly = nec.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const kpis = [
    { etiqueta: 'Fincas', valor: datos?.fincas?.length ?? '–' },
    { etiqueta: 'Lotes', valor: datos?.lotes?.length ?? '–' },
    { etiqueta: 'Lotes en carencia', valor: lotesEnCarencia },
    { etiqueta: 'Lotes en cuarentena', valor: lotesCuarentena },
    { etiqueta: 'Órdenes programadas', valor: ordenesProgramadas },
    { etiqueta: 'QR generados', valor: datos?.qrs?.length ?? '–' }
  ];

  return (
    <AppLayout>
      <div className="inicio-hero">
        <div>
          <h2>¡Hola, {usuario.nombre || 'usuario'}! </h2>
          <p className="inicio-fecha">{fechaFriendly.charAt(0).toUpperCase() + fechaFriendly.slice(1)}</p>
          <p className="inicio-sub">
            Panel de control del sistema de trazabilidad y control fitosanitario.
          </p>
        </div>
        <div className="inicio-estado-lotes">
          <span className={`badge badge-cuarentena`}>{lotesCuarentena} cuarentena</span>
          <span className={`badge badge-restringido`}>{lotesRestringidos} restringido</span>
          <span className={`badge badge-disponible`}>{lotesEnCarencia} en carencia</span>
        </div>
      </div>

      <div className="kpi-grid">
        {kpis.map((kpi) => (
          <div key={kpi.etiqueta} className="kpi-card">
            <div className="kpi-value">{kpi.valor}</div>
            <div className="kpi-label">{kpi.etiqueta}</div>
          </div>
        ))}
      </div>

      {lotesCuarentena > 0 && (
        <div className="info-note">
          Atención: hay {lotesCuarentena} lote(s) en cuarentena. Cortes y empaque están bloqueados
          automáticamente hasta que se levante el estado.
        </div>
      )}

      <div className="panel-card">
        <h3 className="panel-title">Acceso rápido</h3>
        <div className="quick-grid">
          {ACCESO_RAPIDO.filter((mod) => mod.roles.includes(usuario.rol)).map((mod) => (
            <button key={mod.to} className="quick-card" onClick={() => navigate(mod.to)}>
              <strong>{mod.titulo}</strong>
              <span>{mod.descripcion}</span>
            </button>
          ))}
        </div>
      </div>

      {evaluacionesActivas > 0 && (
        <div className="inicio-pie">
          Registro totalmente sincronizado: {evaluacionesActivas} evaluaciones listas en la nube.
        </div>
      )}
    </AppLayout>
  );
}

export default Dashboard;