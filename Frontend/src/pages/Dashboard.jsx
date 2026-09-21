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

function inicioSemana(t) {
  const d = t instanceof Date ? new Date(t) : new Date(t + 'T00:00:00');
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function periodosEntre(desde, hasta) {
  const d0 = new Date(desde + 'T00:00:00');
  const d1 = new Date(hasta + 'T00:00:00');
  if (isNaN(d0) || isNaN(d1)) return { periodos: [], modo: 'dia', keyDe: () => '' };
  const dias = Math.round((d1 - d0) / 86400000);
  const modo = dias <= 35 ? 'dia' : dias <= 130 ? 'semana' : 'mes';
  const periodos = [];
  const cursor = new Date(d0);
  while (cursor <= d1) {
    periodos.push({
      inicio: new Date(cursor),
      key:
        modo === 'dia' ? fechaLocal(cursor) :
        modo === 'semana' ? fechaLocal(inicioSemana(cursor)) :
        `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`
    });
    if (modo === 'dia') cursor.setDate(cursor.getDate() + 1);
    else if (modo === 'semana') cursor.setDate(cursor.getDate() + 7);
    else cursor.setMonth(cursor.getMonth() + 1);
  }
  function keyDe(fechaISO) {
    const t = new Date((fechaISO || '').slice(0, 10) + 'T00:00:00');
    if (isNaN(t)) return '';
    if (modo === 'dia') return fechaLocal(t);
    if (modo === 'semana') return fechaLocal(inicioSemana(t));
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
  }
  return { periodos, modo, keyDe };
}

function etiquetaPeriodo(p, modo) {
  if (modo === 'mes') {
    return p.inicio.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' });
  }
  return p.inicio.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' });
}

function AreaChart({ serie, color = '#3f7d3a' }) {
  const ancho = 620;
  const alto = 200;
  const pad = { t: 14, r: 12, b: 30, l: 48 };
  if (!serie || serie.length === 0) return null;
  const max = Math.max(1, ...serie.map((p) => p.valor));
  const pts = serie.map((p, i) => ({
    x: pad.l + (i / Math.max(1, serie.length - 1)) * (ancho - pad.l - pad.r),
    y: pad.t + (1 - p.valor / max) * (alto - pad.t - pad.b),
    ...p
  }));
  const linea = pts.map((pp, i) => `${i === 0 ? 'M' : 'L'} ${pp.x.toFixed(1)} ${pp.y.toFixed(1)}`).join(' ');
  const area = `${linea} L ${pts[pts.length - 1].x.toFixed(1)} ${alto - pad.b} L ${pts[0].x.toFixed(1)} ${alto - pad.b} Z`;
  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const y = pad.t + f * (alto - pad.t - pad.b);
    return { y, val: Math.round(max * (1 - f)) };
  });
  const pasoEtiquetas = Math.max(1, Math.ceil(serie.length / 6));
  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className="dash-area" role="img" aria-label="Evolución de producción en kg">
      <defs>
        <linearGradient id="dashGradProd" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {grid.map((g, i) => (
        <g key={i}>
          <line x1={pad.l} x2={ancho - pad.r} y1={g.y} y2={g.y} stroke="#edf0ea" strokeDasharray="3 4" />
          <text x={pad.l - 8} y={g.y + 4} textAnchor="end" className="dash-area-eje">{g.val.toLocaleString('es-CO')}</text>
        </g>
      ))}
      <path d={area} fill="url(#dashGradProd)" />
      <path d={linea} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.filter((_, i) => i % pasoEtiquetas === 0).map((pp) => (
        <text key={pp.x} x={pp.x} y={alto - 8} textAnchor="middle" className="dash-area-eje">{pp.etiqueta}</text>
      ))}
    </svg>
  );
}

function Donut({ datos, centroValor, centroLabel }) {
  const crc = 2 * Math.PI * 54;
  const total = datos.reduce((a, d) => a + Number(d.valor || 0), 0);
  let acum = 0;
  return (
    <div className="dash-donut-layout">
      <svg viewBox="0 0 140 140" className="dash-donut" role="img" aria-label={centroLabel}>
        <circle cx="70" cy="70" r="54" fill="none" stroke="#f0f1ec" strokeWidth="18" />
        {total > 0 &&
          datos.map((d, i) => {
            const fraccion = Number(d.valor) / total;
            const dash = fraccion * crc;
            const offset = -acum * crc;
            acum += fraccion;
            return (
              <circle
                key={i}
                cx="70"
                cy="70"
                r="54"
                fill="none"
                stroke={d.color}
                strokeWidth="18"
                strokeDasharray={`${dash} ${crc - dash}`}
                strokeDashoffset={offset}
                transform="rotate(-90 70 70)"
              >
                <title>{`${d.label}: ${d.valor}`}</title>
              </circle>
            );
          })}
        <text x="70" y="67" textAnchor="middle" className="dash-donut-total">{centroValor}</text>
        <text x="70" y="84" textAnchor="middle" className="dash-donut-label">{centroLabel}</text>
      </svg>
      <ul className="dash-donut-leyenda">
        {datos.map((d, i) => (
          <li key={i}>
            <span className="dash-leyenda-punto" style={{ background: d.color }}></span>
            {d.label}
            <span className="dash-leyenda-valor">{d.valor}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const MAPA_ESTADO = {
  disponible: { label: 'Disponible', color: '#3f7d3a' },
  carencia: { label: 'En carencia', color: '#d99e29' },
  cuarentena: { label: 'Cuarentena', color: '#b3352b' },
  restringido: { label: 'Restringido', color: '#8b6f47' },
  inactivo: { label: 'Inactivo', color: '#b0ada5' }
};

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

  const desdeUsar = rango.desde || haceDias(365);
  const { periodos, modo, keyDe } = periodosEntre(desdeUsar, rango.hasta);
  const serieProduccion = periodos.map((p) => ({ etiqueta: etiquetaPeriodo(p, modo), valor: 0 }));
  const idxPorKey = new Map(periodos.map((p, i) => [p.key, i]));
  qrsRango.forEach((q) => {
    const k = keyDe(q.fecha_proceso);
    const i = idxPorKey.get(k);
    if (i != null) serieProduccion[i].valor += Number(q.peso_neto || 0);
  });

  const estadoConteo = {};
  lotesVisibles.forEach((l) => {
    const k = l.activo === false ? 'inactivo' : (l.estado_efectivo || 'disponible');
    estadoConteo[k] = (estadoConteo[k] || 0) + 1;
  });
  const conteoEstados = Object.entries(MAPA_ESTADO)
    .filter(([k]) => estadoConteo[k])
    .map(([k, meta]) => ({ label: meta.label, color: meta.color, valor: estadoConteo[k] }));

  const cultivoConteo = { banano: 0, platano: 0 };
  lotesVisibles.forEach((l) => {
    const t = l.tipo_siembra === 'platano' ? 'platano' : 'banano';
    cultivoConteo[t] += Number(l.area_hectareas || 0);
  });
  const haTotal = cultivoConteo.banano + cultivoConteo.platano;
  const conteoCultivo = [
    { label: 'Banano', color: '#d99e29', valor: Math.round(cultivoConteo.banano * 100) / 100 },
    { label: 'Plátano', color: '#2f6489', valor: Math.round(cultivoConteo.platano * 100) / 100 }
  ].filter((c) => c.valor > 0);

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

      <div className="dash-3col">
        <div className="panel-card dash-chart-card">
          <h3 className="panel-title">Evolución de producción empacada (kg)</h3>
          {serieProduccion.every((p) => !p.valor) ? (
            <p className="dash-vacio">Sin empaque registrado en el período.</p>
          ) : (
            <AreaChart serie={serieProduccion} />
          )}
        </div>
        <div className="panel-card">
          <h3 className="panel-title">Lotes por estado</h3>
          {conteoEstados.length === 0 ? (
            <p className="dash-vacio">Sin lotes para mostrar.</p>
          ) : (
            <Donut datos={conteoEstados} centroValor={lotesVisibles.length} centroLabel="lotes" />
          )}
        </div>
        <div className="panel-card">
          <h3 className="panel-title">Tipo de cultivo (ha)</h3>
          {conteoCultivo.length === 0 ? (
            <p className="dash-vacio">Sin áreas registradas.</p>
          ) : (
            <Donut datos={conteoCultivo} centroValor={haTotal} centroLabel="ha" />
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

    </AppLayout>
  );
}

export default Dashboard;