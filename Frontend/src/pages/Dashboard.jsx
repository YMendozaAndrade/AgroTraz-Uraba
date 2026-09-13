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
import { fechaLocal, hoyLocal } from '../utils/fecha';

const ACCESO_RAPIDO = [
  { to: '/fincas', titulo: 'Fincas', descripcion: 'Catastro, códigos ICA y responsables', roles: ['administrador', 'gerente', 'agronomo', 'evaluador_campo'] },
  { to: '/lotes', titulo: 'Lotes', descripcion: 'Lotificación, tipo de siembra y estado', roles: ['administrador', 'gerente', 'agronomo', 'evaluador_campo'] },
  { to: '/evaluaciones', titulo: 'Evaluaciones', descripcion: 'Sigatoka, Moko/Fusarium y Picudo', roles: ['administrador', 'gerente', 'agronomo', 'evaluador_campo'] },
  { to: '/aplicaciones', titulo: 'Aplicaciones', descripcion: 'Registro y control de carencia', roles: ['administrador', 'gerente', 'agronomo'] },
  { to: '/agroquimicos', titulo: 'Agroquímicos', descripcion: 'Catálogo con códigos ICA', roles: ['administrador', 'gerente', 'agronomo'] },
  { to: '/ordenes-corte', titulo: 'Órdenes de corte', descripcion: 'Planificación con bloqueo por carencia', roles: ['administrador', 'gerente', 'agronomo'] },
  { to: '/qr', titulo: 'QR / Cajas', descripcion: 'Empaque y trazabilidad del producto', roles: ['administrador', 'gerente', 'agronomo', 'operador_empacadora'] },
  { to: '/reportes', titulo: 'Reportes', descripcion: 'Producción, fitosanitario, trazabilidad e inventario', roles: ['administrador', 'gerente', 'agronomo'] }
];

function fechaCorta(f) {
  return (f || '').toString().slice(0, 10);
}

function hoyISO() {
  return hoyLocal();
}

function haceDias(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return fechaLocal(d);
}

function Dashboard() {
  const navigate = useNavigate();
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const [datos, setDatos] = useState(null);

  const [filtroFechas, setFiltroFechas] = useState('30');
  const [filtroFinca, setFiltroFinca] = useState('');

  useEffect(() => {
    Promise.allSettled([
      fincasApi.listar(),
      lotesApi.listar(),
      aplicacionesApi.listar(),
      evaluacionesApi.listar(),
      ordenesCorteApi.listar(),
      qrCajasApi.listar()
    ]).then(([f, l, a, e, o, q]) =>
      setDatos({
        fincas: f.status === 'fulfilled' ? (f.value.fincas || []) : [],
        lotes: l.status === 'fulfilled' ? (l.value.lotes || []) : [],
        aplicaciones: a.status === 'fulfilled' ? (a.value.aplicaciones || []) : [],
        evaluaciones: e.status === 'fulfilled' ? (e.value.evaluaciones || []) : [],
        ordenes: o.status === 'fulfilled' ? (o.value.ordenes || []) : [],
        qrs: q.status === 'fulfilled' ? (q.value.codigos || []) : []
      })
    );
  }, []);

  const rango = {
    desde: filtroFechas === 'todo' ? '' : haceDias(Number(filtroFechas)),
    hasta: hoyISO()
  };

  const enRango = (fechaISO) => {
    const f = fechaCorta(fechaISO);
    if (!f) return false;
    if (rango.desde && f < rango.desde) return false;
    if (rango.hasta && f > rango.hasta) return false;
    return true;
  };

  const lotesVisibles = (datos?.lotes || []).filter((l) => !filtroFinca || String(l.id_finca) === String(filtroFinca));
  const qrsRango = (datos?.qrs || []).filter((q) => enRango(q.fecha_proceso));
  const ordenesRango = (datos?.ordenes || []).filter((o) => enRango(o.fecha_orden));
  const appsRango = (datos?.aplicaciones || []).filter((a) => enRango(a.fecha_aplicacion));
  const evalsRango = (datos?.evaluaciones || []).filter((e) => enRango(e.fecha_evaluacion));

  const lotesEnCarencia = lotesVisibles.filter((l) => l.estado_efectivo === 'carencia').length;
  const lotesCuarentena = lotesVisibles.filter((l) => l.estado_efectivo === 'cuarentena').length;
  const lotesRestringidos = lotesVisibles.filter((l) => l.estado_efectivo === 'restringido').length;
  const ordenesProgramadas = ordenesRango.filter((o) => o.estado === 'programada').length;
  const kgEmpacados = qrsRango.reduce((acc, q) => acc + Number(q.peso_neto || 0), 0);

  const kpis = [
    { etiqueta: 'Fincas', valor: datos?.fincas?.length ?? '–', detalle: 'registradas' },
    { etiqueta: 'Lotes', valor: lotesVisibles.length, detalle: filtroFinca ? 'finca seleccionada' : 'activos' },
    { etiqueta: 'En carencia', valor: lotesEnCarencia, detalle: 'uso bloqueado' },
    { etiqueta: 'Cuarentenas', valor: lotesCuarentena, detalle: 'foco fitosanitario' },
    { etiqueta: 'Kg empacados', valor: kgEmpacados.toLocaleString('es-CO'), detalle: 'en el rango' },
    { etiqueta: 'QR generados', valor: qrsRango.length, detalle: 'en el rango' }
  ];

  const nec = new Date();
  const fechaFriendly = nec.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  function rankingFincas() {
    const mapa = {};
    (datos?.fincas || []).forEach((f) => {
      mapa[f.nombre] = { finca: f.nombre, id_finca: f.id_finca, kg: 0, qrs: 0, ordenes: 0, evaluaciones: 0, aplicaciones: 0 };
    });
    qrsRango.forEach((q) => {
      const nombre = q.finca || '—';
      if (!mapa[nombre]) mapa[nombre] = { finca: nombre, id_finca: q.id_finca, kg: 0, qrs: 0, ordenes: 0, evaluaciones: 0, aplicaciones: 0 };
      mapa[nombre].kg += Number(q.peso_neto || 0);
      mapa[nombre].qrs += 1;
    });
    ordenesRango.forEach((o) => {
      const nombre = o.finca || '—';
      if (!mapa[nombre]) mapa[nombre] = { finca: nombre, id_finca: o.id_finca, kg: 0, qrs: 0, ordenes: 0, evaluaciones: 0, aplicaciones: 0 };
      mapa[nombre].ordenes += 1;
    });
    evalsRango.forEach((e) => {
      const nombre = e.finca || '—';
      if (!mapa[nombre]) mapa[nombre] = { finca: nombre, id_finca: e.id_finca, kg: 0, qrs: 0, ordenes: 0, evaluaciones: 0, aplicaciones: 0 };
      mapa[nombre].evaluaciones += 1;
    });
    Object.values(mapa).forEach((m) => (m.actividad = m.qrs + m.ordenes + m.evaluaciones));
    return Object.values(mapa).sort((a, b) => b.kg - a.kg).slice(0, 6);
  }

  function rankingLotes() {
    const mapa = {};
    (datos?.lotes || []).forEach((l) => {
      mapa[l.nombre] = { lote: l.nombre, finca: l.finca, id_lote: l.id_lote, kg: 0, qrs: 0 };
    });
    qrsRango.forEach((q) => {
      const nombre = q.lote || '—';
      if (!mapa[nombre]) mapa[nombre] = { lote: nombre, finca: q.finca, id_lote: q.id_lote, kg: 0, qrs: 0 };
      mapa[nombre].kg += Number(q.peso_neto || 0);
      mapa[nombre].qrs += 1;
    });
    return Object.values(mapa).sort((a, b) => b.kg - a.kg).slice(0, 5);
  }

  const filasFincas = rankingFincas();
  const filasLotes = rankingLotes();
  const maxKg = Math.max(1, ...filasFincas.map((f) => f.kg));

  const lotesConProblema = lotesVisibles
    .filter((l) => l.estado_efectivo === 'carencia' || l.estado_efectivo === 'restringido' || l.estado_efectivo === 'cuarentena')
    .map((l) => {
      if (l.estado_efectivo === 'carencia') {
        return { tipo: 'Carencia', lote: l.nombre, finca: l.finca, detalle: `Bloqueado hasta ${fechaCorta(l.carencia_hasta)} · ${l.carencia_agroquimico || ''}` };
      }
      if (l.estado_efectivo === 'cuarentena') {
        return { tipo: 'Cuarentena', lote: l.nombre, finca: l.finca, detalle: 'Corte y empaque bloqueados por foco fitosanitario' };
      }
      return { tipo: 'Restringido', lote: l.nombre, finca: l.finca, detalle: 'Requiere validación de gerencia' };
    });

  const bitacora = [
    ...ordenesRango.map((o) => ({ fecha: fechaCorta(o.fecha_orden), texto: `Orden de corte #${o.id_orden_corte} · ${o.lote}`, detalle: o.estado })),
    ...appsRango.map((a) => ({ fecha: fechaCorta(a.fecha_aplicacion), texto: `Aplicación · ${a.agroquimico || ''} · ${a.lote}`, detalle: `carencia hasta ${fechaCorta(a.fecha_fin_carencia)}` })),
    ...evalsRango.map((e) => ({ fecha: fechaCorta(e.fecha_evaluacion), texto: `Evaluación ${e.tipo_evaluacion || ''} · ${e.lote}`, detalle: e.yha != null ? `YHA ${e.yha}` : (e.evaluador || '') })),
    ...qrsRango.map((q) => ({ fecha: fechaCorta(q.fecha_proceso), texto: `QR ${q.codigo} · ${q.lote}`, detalle: `${q.peso_neto || 0} kg` }))
  ]
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
    .slice(0, 8);

  const kpiTono = (idx) => {
    const tonos = ['t-v', 't-g', 't-a', 't-r', 't-b', 't-v'];
    return tonos[idx % tonos.length];
  };

  return (
    <AppLayout>
      <div className="inicio-hero">
        <div className="inicio-hero-foto"></div>
        <div className="inicio-hero-velo"></div>
        <div className="inicio-hero-contenido">
          <h2>¡Hola, {usuario.nombre || 'usuario'}! </h2>
          <p className="inicio-fecha">{fechaFriendly.charAt(0).toUpperCase() + fechaFriendly.slice(1)}</p>
          <p className="inicio-sub">
            Panel de control del sistema de trazabilidad y control fitosanitario.
          </p>
        </div>
        <div className="inicio-estado-lotes">
          <span className="badge badge-cuarentena">{lotesCuarentena} cuarentena</span>
          <span className="badge badge-restringido">{lotesRestringidos} restringido</span>
          <span className="badge badge-carencia">{lotesEnCarencia} en carencia</span>
        </div>
      </div>

      <div className="dash-filtros">
        <div className="dash-filtro-item">
          <label htmlFor="filtro-fechas">Período</label>
          <select id="filtro-fechas" value={filtroFechas} onChange={(e) => setFiltroFechas(e.target.value)}>
            <option value="7">Últimos 7 días</option>
            <option value="15">Últimos 15 días</option>
            <option value="30">Últimos 30 días</option>
            <option value="90">Últimos 3 meses</option>
            <option value="365">Último año</option>
            <option value="todo">Todo</option>
          </select>
        </div>
        <div className="dash-filtro-item">
          <label htmlFor="filtro-finca">Finca</label>
          <select id="filtro-finca" value={filtroFinca} onChange={(e) => setFiltroFinca(e.target.value)}>
            <option value="">Todas</option>
            {(datos?.fincas || []).map((f) => (
              <option key={f.id_finca} value={f.id_finca}>{f.nombre}</option>
            ))}
          </select>
        </div>
        <button className="btn-primary" style={{ marginLeft: 'auto' }} onClick={() => navigate('/reportes')}>
          Ir a reportes →
        </button>
      </div>

      <div className="dash-kpis">
        {kpis.map((kpi, idx) => (
          <div key={kpi.etiqueta} className="dash-kpi">
            <div className={`dash-kpi-n ${kpiTono(idx)}`}>{kpi.valor}</div>
            <div className="dash-kpi-t">{kpi.etiqueta}</div>
            <div className="dash-kpi-d">{kpi.detalle}</div>
          </div>
        ))}
      </div>

      {lotesCuarentena > 0 && (
        <div className="info-note">
          Atención: hay {lotesCuarentena} lote(s) en cuarentena{filtroFinca ? ' en la finca seleccionada' : ''}. Cortes y empaque están bloqueados
          automáticamente hasta que se levante el estado.
        </div>
      )}

      <div className="dash-2col">
        <div className="panel-card dash-chart-card">
          <h3 className="panel-title">Producción empacada por finca (kg)</h3>
          {filasFincas.every((f) => !f.kg) ? (
            <p className="dash-vacio">Aún no hay registros de empaque en el período seleccionado.</p>
          ) : (
            <div className="dash-bars">
              {filasFincas.map((f) => (
                <div key={f.finca} className="dash-bar-row">
                  <div className="dash-bar-lab" title={f.finca}>{f.finca}</div>
                  <div className="dash-bar-track">
                    <div className="dash-bar-fill" style={{ width: `${Math.max(6, (f.kg / maxKg) * 100)}%` }}>
                      <span>{f.kg} kg</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel-card">
          <h3 className="panel-title">Alertas fitosanitarias</h3>
          {lotesConProblema.length === 0 ? (
            <p className="dash-vacio">Sin alertas activas.</p>
          ) : (
            <ul className="dash-lista">
              {lotesConProblema.map((a, i) => (
                <li key={i}>
                  <div className={`dash-punto ${a.tipo === 'Cuarentena' ? 'p-bad' : a.tipo === 'Carencia' ? 'p-warn' : 'p-soft'}`}></div>
                  <div>
                    <strong>{a.tipo}</strong> · {a.lote} <span className="dash-dim">({a.finca})</span>
                    <div className="dash-dim">{a.detalle}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="dash-2col">
        <div className="panel-card">
          <h3 className="panel-title">Top 5 lotes por producción</h3>
          {filasLotes.every((l) => !l.kg) ? (
            <p className="dash-vacio">Sin empaque registrado en el período.</p>
          ) : (
            <ul className="dash-top">
              {filasLotes.map((l, i) => (
                <li key={`${l.lote}-${i}`}>
                  <span className="dash-top-pos">{i + 1}</span>
                  <div className="dash-top-info">
                    <div className="dash-top-nombre">{l.lote} <span className="dash-dim">({l.finca})</span></div>
                    <div className="dash-top-bar"><div className="dash-top-fill" style={{ width: `${Math.max(4, (l.kg / Math.max(maxKg, 1)) * 100)}%` }} /></div>
                  </div>
                  <span className="dash-top-valor">{l.kg} kg</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel-card">
          <h3 className="panel-title">Actividad reciente</h3>
          {bitacora.length === 0 ? (
            <p className="dash-vacio">Sin actividad en el período.</p>
          ) : (
            <ul className="dash-bitacora">
              {bitacora.map((b, i) => (
                <li key={i}>
                  <span className="dash-fecha">{b.fecha}</span>
                  <span className="dash-texto">{b.texto}</span>
                  <span className="dash-dim">{b.detalle}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

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
    </AppLayout>
  );
}

export default Dashboard;