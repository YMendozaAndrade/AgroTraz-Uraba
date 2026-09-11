import { Fragment, useEffect, useState } from 'react';
import AppLayout from '../app/AppLayout';
import {
  fincasApi,
  lotesApi,
  aplicacionesApi,
  evaluacionesApi,
  ordenesCorteApi,
  qrCajasApi,
  usuariosApi,
  asignacionesApi,
  reportesApi
} from '../services/api';

const SECCIONES = [
  { id: 'produccion', titulo: 'Producción' },
  { id: 'fitosanitario', titulo: 'Fitosanitario' },
  { id: 'trazabilidad', titulo: 'Trazabilidad' },
  { id: 'inventario', titulo: 'Inventario campesino' },
  { id: 'historial', titulo: 'Historial' }
];

const ROL_LABEL = {
  administrador: 'Administrador',
  gerente: 'Gerente',
  agronomo: 'Agrónomo',
  evaluador_campo: 'Evaluador de campo',
  operador_empacadora: 'Operador de empacadora'
};

function fechaCorta(f) {
  return (f || '').toString().slice(0, 10);
}

function fechaLegible(f) {
  const s = fechaCorta(f);
  if (!s) return '—';
  try {
    return new Date(s + 'T00:00:00').toLocaleDateString('es-CO');
  } catch {
    return s;
  }
}

const TIPO_REPORTE_LABEL = {
  produccion: 'Producción',
  fitosanitario: 'Fitosanitario',
  trazabilidad: 'Trazabilidad',
  inventario: 'Inventario campesino'
};

function hoyISO() {
  return new Date().toISOString().slice(0, 10);
}

function haceDias(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function Cabecera({ titulo, usuario, global }) {
  return (
    <div className="rep-cabecera no-print">
      <div>
        <h2>{titulo}</h2>
        <p className="rep-sub">{global ? 'Reporte con datos de todo el sistema' : 'Reporte segmentado'}</p>
      </div>
      <button className="btn-primary" onClick={() => window.print()}>
        Imprimir / Guardar PDF
      </button>
    </div>
  );
}

function BotonGuardar({ tipo, titulo, desde, hasta, idFinca, resumen, tablas }) {
  const [estado, setEstado] = useState('idle');
  const [mensaje, setMensaje] = useState('');

  async function guardar() {
    if (estado === 'guardando') return;
    setEstado('guardando');
    setMensaje('');
    try {
      await reportesApi.guardar({
        tipo_reporte: tipo,
        titulo,
        desde: desde || null,
        hasta: hasta || null,
        id_finca: idFinca || null,
        resumen,
        detalle: tablas
      });
      setEstado('ok');
      setMensaje('Guardado en el historial');
    } catch (e) {
      setEstado('error');
      setMensaje(e.message);
    }
  }

  return (
    <span className="no-print">
      <button className="btn-cancel" onClick={guardar} disabled={estado === 'guardando'}>
        {estado === 'guardando' ? 'Guardando…' : 'Guardar en historial'}
      </button>
      {mensaje && <span className="rep-dim"> {mensaje}</span>}
    </span>
  );
}

function Reporte({ children, titulo }) {
  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const fechaGen = new Date().toLocaleString('es-CO');
  return (
    <div className="reporte-hoja">
      <div className="rep-doc-head">
        <div className="rep-logo">🍌</div>
        <div>
          <h1>AgroTraz Urabá</h1>
          <p>Sistema de trazabilidad y control fitosanitario de banano y plátano</p>
        </div>
      </div>
      <div className="rep-titulo">
        <h2>{titulo}</h2>
        <p>Generado el {fechaGen} por {usuario.nombre || 'usuario'} · {usuario.rol || ''}</p>
      </div>
      {children}
      <div className="rep-firma">
        <div>
          <div className="rep-firma-linea"></div>
          <p>Elaborado por</p>
        </div>
        <div>
          <div className="rep-firma-linea"></div>
          <p>Revisado por</p>
        </div>
        <div>
          <div className="rep-firma-linea"></div>
          <p>Aprobado por</p>
        </div>
      </div>
    </div>
  );
}

function Resumen({ items }) {
  return (
    <div className="rep-resumen">
      {items.map((r) => (
        <div className="rep-resumen-item" key={r.label}>
          <div className="rep-resumen-valor">{r.valor}</div>
          <div className="rep-resumen-label">{r.label}</div>
        </div>
      ))}
    </div>
  );
}

function ReporteProduccion({ datos, filtros, setFiltros, fincas }) {
  const enRango = (f) => {
    const fc = fechaCorta(f);
    if (!fc) return false;
    if (filtros.desde && fc < filtros.desde) return false;
    if (filtros.hasta && fc > filtros.hasta) return false;
    return true;
  };

  const qrs = (datos.qrs || []).filter((q) => enRango(q.fecha_proceso));
  const ordenes = (datos.ordenes || []).filter((o) => enRango(o.fecha_orden));
  const kgTotal = qrs.reduce((a, q) => a + Number(q.peso_neto || 0), 0);
  const cajasTotal = qrs.reduce((a, q) => a + Number(q.total_cajas || 0), 0);

  const porFinca = {};
  (datos.fincas || []).forEach((f) => {
    porFinca[f.nombre] = { finca: f.nombre, qrs: 0, cajas: 0, kg: 0, cortes: 0 };
  });
  qrs.forEach((q) => {
    if (!porFinca[q.finca]) porFinca[q.finca] = { finca: q.finca, qrs: 0, cajas: 0, kg: 0, cortes: 0 };
    porFinca[q.finca].qrs += 1;
    porFinca[q.finca].cajas += Number(q.total_cajas || 0);
    porFinca[q.finca].kg += Number(q.peso_neto || 0);
  });
  ordenes.forEach((o) => {
    if (!porFinca[o.finca]) porFinca[o.finca] = { finca: o.finca, qrs: 0, cajas: 0, kg: 0, cortes: 0 };
    porFinca[o.finca].cortes += 1;
  });

  const tablasProduccion = [
    {
      titulo: 'Producción por finca',
      columnas: ['Finca', 'Órdenes de corte', 'QR generados', 'Cajas', 'Peso (kg)'],
      filas: Object.values(porFinca)
        .sort((a, b) => b.kg - a.kg)
        .map((f) => [f.finca, f.cortes, f.qrs, f.cajas, f.kg])
    },
    {
      titulo: 'Detalle de empaque',
      columnas: ['Fecha', 'Código', 'Finca', 'Lote', 'Peso (kg)', 'Cajas'],
      filas: qrs.map((q) => [
        fechaCorta(q.fecha_proceso),
        q.codigo,
        q.finca,
        q.lote,
        Number(q.peso_neto || 0),
        q.total_cajas || 0
      ])
    }
  ];

  return (
    <Fragment>
      <FiltrosReporte
        filtros={filtros}
        setFiltros={setFiltros}
        fincas={fincas}
        filtroFinca={filtros.finca}
        setFiltroFinca={(v) => setFiltros({ ...filtros, finca: v })}
      />
      <div className="page-head no-print">
        <div>
          <h2>Reporte de producción</h2>
          <p className="rep-sub">
            {filtros.desde ? `Desde ${fechaLegible(filtros.desde)} hasta ${fechaLegible(filtros.hasta)}` : 'Rango completo'} · {filtros.finca ? (fincas.find((f) => String(f.id_finca) === filtros.finca) || {}).nombre : 'Todas las fincas'}
          </p>
        </div>
        <div className="page-head-acciones">
          <BotonGuardar
            tipo="produccion"
            titulo={`Reporte de producción ${filtros.desde ? `(${fechaLegible(filtros.desde)} - ${fechaLegible(filtros.hasta)})` : ''}`}
            desde={filtros.desde}
            hasta={filtros.hasta}
            idFinca={filtros.finca}
            resumen={[
              { label: 'Kg empacados', valor: kgTotal },
              { label: 'Órdenes de corte', valor: ordenes.length },
              { label: 'Códigos QR', valor: qrs.length },
              { label: 'Cajas registradas', valor: cajasTotal }
            ]}
            tablas={tablasProduccion}
          />
          <button className="btn-primary" onClick={() => window.print()}>
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>
      <Reporte titulo="Reporte de producción">
        <Resumen
          items={[
            { label: 'Kg empacados', valor: kgTotal.toLocaleString('es-CO') },
            { label: 'Órdenes de corte', valor: ordenes.length },
            { label: 'Códigos QR', valor: qrs.length },
            { label: 'Cajas registradas', valor: cajasTotal }
          ]}
        />
        <h3 className="rep-seccion">Producción por finca</h3>
        <div className="table-responsive">
          <table className="rep-tabla">
            <thead>
              <tr>
                <th>Finca</th>
                <th className="r">Órdenes de corte</th>
                <th className="r">QR generados</th>
                <th className="r">Cajas</th>
                <th className="r">Peso (kg)</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(porFinca)
                .sort((a, b) => b.kg - a.kg)
                .map((f) => (
                  <tr key={f.finca}>
                    <td>{f.finca}</td>
                    <td className="r">{f.cortes}</td>
                    <td className="r">{f.qrs}</td>
                    <td className="r">{f.cajas}</td>
                    <td className="r"><strong>{f.kg.toLocaleString('es-CO')}</strong> kg</td>
                  </tr>
                ))}
                <tr className="rep-tabla-total">
                  <td>Total</td>
                  <td className="r">{ordenes.length}</td>
                  <td className="r">{qrs.length}</td>
                  <td className="r">{cajasTotal}</td>
                  <td className="r"><strong>{kgTotal.toLocaleString('es-CO')}</strong> kg</td>
                </tr>
            </tbody>
          </table>
        </div>

        <h3 className="rep-seccion">Detalle de empaque</h3>
        <div className="table-responsive">
          <table className="rep-tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Código</th>
                <th>Finca</th>
                <th>Lote</th>
                <th className="r">Peso (kg)</th>
                <th className="r">Cajas</th>
              </tr>
            </thead>
            <tbody>
              {qrs.map((q) => (
                <tr key={q.id_qr}>
                  <td>{fechaCorta(q.fecha_proceso)}</td>
                  <td>{q.codigo}</td>
                  <td>{q.finca}</td>
                  <td>{q.lote}</td>
                  <td className="r">{Number(q.peso_neto || 0).toLocaleString('es-CO')}</td>
                  <td className="r">{q.total_cajas || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reporte>
    </Fragment>
  );
}

function ReporteFitosanitario({ datos, filtros, setFiltros, fincas }) {
  const enRango = (f) => {
    const fc = fechaCorta(f);
    if (!fc) return false;
    if (filtros.desde && fc < filtros.desde) return false;
    if (filtros.hasta && fc > filtros.hasta) return false;
    return true;
  };

  const lotes = (datos.lotes || []).filter((l) => !filtros.finca || String(l.id_finca) === filtros.finca);
  const evals = (datos.evaluaciones || []).filter((e) => enRango(e.fecha_evaluacion));
  const apps = (datos.aplicaciones || []).filter((a) => enRango(a.fecha_aplicacion));

  const enCarencia = lotes.filter((l) => l.estado_efectivo === 'carencia').length;
  const enCuarentena = lotes.filter((l) => l.estado_efectivo === 'cuarentena').length;
  const restringidos = lotes.filter((l) => l.estado_efectivo === 'restringido').length;

  const riesgos = {};
  evals.forEach((e) => {
    if (!riesgos[e.lote]) riesgos[e.lote] = { lote: e.lote, finca: e.finca, sigatoka: null, moko: null, picudo: null };
    if (e.tipo_evaluacion === 'sigatoka' && e.indice_severidad != null) riesgos[e.lote].sigatoka = e.indice_severidad;
    if (e.tipo_evaluacion === 'moko_fusarium' && e.indice_severidad != null) riesgos[e.lote].moko = e.indice_severidad;
    if (e.tipo_evaluacion === 'picudo' && e.numero_adultos != null) riesgos[e.lote].picudo = e.numero_adultos;
  });

  const TIPO_LABEL = { sigatoka: 'Sigatoka', moko_fusarium: 'Moko/Fusarium', picudo: 'Picudo' };

  const tablasFito = [
    {
      titulo: 'Estado fitosanitario de lotes',
      columnas: ['Lote', 'Finca', 'Estado', 'Detalle'],
      filas: lotes.map((l) => [
        l.nombre,
        l.finca,
        l.estado_efectivo,
        l.estado_efectivo === 'carencia'
          ? `Carencia hasta ${fechaCorta(l.carencia_hasta)} · ${l.carencia_agroquimico || ''}`
          : l.estado_efectivo === 'cuarentena'
            ? 'Foco fitosanitario (Moko/Fusarium)'
            : l.estado_efectivo === 'restringido'
              ? 'Requiere validación de gerencia'
              : 'Sin restricción'
      ])
    },
    {
      titulo: 'Últimos valores de riesgo por lote',
      columnas: ['Lote', 'Finca', 'Sigatoka (severidad %)', 'Moko (severidad)', 'Picudo (adultos)'],
      filas: Object.values(riesgos).map((r) => [r.lote, r.finca, r.sigatoka ?? '—', r.moko ?? '—', r.picudo ?? '—'])
    },
    {
      titulo: 'Aplicaciones del período',
      columnas: ['Fecha', 'Finca', 'Lote', 'Agroquímico', 'Dosis (L/ha)', 'Carencia hasta'],
      filas: apps.map((a) => [
        fechaCorta(a.fecha_aplicacion),
        a.finca,
        a.lote,
        a.agroquimico,
        a.dosis_aplicada ?? '—',
        fechaCorta(a.fecha_fin_carencia)
      ])
    }
  ];

  return (
    <Fragment>
      <FiltrosReporte
        filtros={filtros}
        setFiltros={setFiltros}
        fincas={fincas}
        filtroFinca={filtros.finca}
        setFiltroFinca={(v) => setFiltros({ ...filtros, finca: v })}
      />
      <div className="page-head no-print">
        <div>
          <h2>Reporte fitosanitario</h2>
          <p className="rep-sub">
            {filtros.desde ? `Desde ${fechaLegible(filtros.desde)} hasta ${fechaLegible(filtros.hasta)}` : 'Rango completo'} · {filtros.finca ? (fincas.find((f) => String(f.id_finca) === filtros.finca) || {}).nombre : 'Todas las fincas'}
          </p>
        </div>
        <div className="page-head-acciones">
          <BotonGuardar
            tipo="fitosanitario"
            titulo={`Reporte fitosanitario ${filtros.desde ? `(${fechaLegible(filtros.desde)} - ${fechaLegible(filtros.hasta)})` : ''}`}
            desde={filtros.desde}
            hasta={filtros.hasta}
            idFinca={filtros.finca}
            resumen={[
              { label: 'Lotes en carencia', valor: enCarencia },
              { label: 'Lotes en cuarentena', valor: enCuarentena },
              { label: 'Lotes restringidos', valor: restringidos },
              { label: 'Evaluaciones en periodo', valor: evals.length }
            ]}
            tablas={tablasFito}
          />
          <button className="btn-primary" onClick={() => window.print()}>
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>
      <Reporte titulo="Reporte fitosanitario">
        <Resumen
          items={[
            { label: 'Lotes en carencia', valor: enCarencia },
            { label: 'Lotes en cuarentena', valor: enCuarentena },
            { label: 'Lotes restringidos', valor: restringidos },
            { label: 'Evaluaciones en periodo', valor: evals.length }
          ]}
        />

        <h3 className="rep-seccion">Estado fitosanitario de lotes</h3>
        <div className="table-responsive">
          <table className="rep-tabla">
            <thead>
              <tr>
                <th>Lote</th>
                <th>Finca</th>
                <th>Estado</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {lotes.map((l) => (
                <tr key={l.id_lote}>
                  <td>{l.nombre}</td>
                  <td>{l.finca}</td>
                  <td>
                    <span className={`badge badge-${l.estado_efectivo}`}>{l.estado_efectivo}</span>
                  </td>
                  <td>
                    {l.estado_efectivo === 'carencia'
                      ? `Carencia hasta ${fechaCorta(l.carencia_hasta)} · ${l.carencia_agroquimico || ''}`
                      : l.estado_efectivo === 'cuarentena'
                        ? 'Foco fitosanitario (Moko/Fusarium)'
                        : l.estado_efectivo === 'restringido'
                          ? 'Requiere validación de gerencia'
                          : 'Sin restricción'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="rep-seccion">Últimos valores de riesgo por lote</h3>
        {Object.values(riesgos).length === 0 ? (
          <p className="rep-vacio">No hay evaluaciones en el período.</p>
        ) : (
          <div className="table-responsive">
            <table className="rep-tabla">
              <thead>
                <tr>
                  <th>Lote</th>
                  <th>Sigatoka (severidad %)</th>
                  <th>Moko (severidad)</th>
                  <th>Picudo (adultos)</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(riesgos).map((r) => (
                  <tr key={r.lote}>
                    <td>{r.lote} <span className="rep-dim">({r.finca})</span></td>
                    <td>{r.sigatoka ?? '—'}</td>
                    <td>{r.moko ?? '—'}</td>
                    <td>{r.picudo ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <h3 className="rep-seccion">Aplicaciones del período</h3>
        <div className="table-responsive">
          <table className="rep-tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Finca</th>
                <th>Lote</th>
                <th>Agroquímico</th>
                <th className="r">Dosis (L/ha)</th>
                <th>Carencia hasta</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id_aplicacion}>
                  <td>{fechaCorta(a.fecha_aplicacion)}</td>
                  <td>{a.finca}</td>
                  <td>{a.lote}</td>
                  <td>{a.agroquimico}</td>
                  <td className="r">{a.dosis_aplicada ?? '—'}</td>
                  <td>{fechaCorta(a.fecha_fin_carencia)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reporte>
    </Fragment>
  );
}

function ReporteTrazabilidad({ datos }) {
  const [codigo, setCodigo] = useState('');
  const [traza, setTraza] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState('');

  async function buscar() {
    setError('');
    setTraza(null);
    if (!codigo.trim()) {
      setError('Ingrese un código QR');
      return;
    }
    setBuscando(true);
    try {
      const res = await qrCajasApi.traza(codigo.trim());
      setTraza(res.traza);
    } catch (e) {
      setError(e.message);
    } finally {
      setBuscando(false);
    }
  }

  return (
    <Fragment>
      <div className="page-head no-print">
        <div>
          <h2>Trazabilidad por código QR</h2>
          <p className="rep-sub">Consulte el origen completo de un empaque por su código QR.</p>
        </div>
        <div className="page-head-acciones">
          <BotonGuardar
            tipo="trazabilidad"
            titulo={`Trazabilidad · ${(traza && traza.codigo) || codigo.trim() || '—'}`}
            resumen={
              traza
                ? [
                    { label: 'Producto', valor: traza.producto },
                    { label: 'Lote', valor: traza.lote },
                    { label: 'Finca', valor: traza.finca },
                    { label: 'Peso neto (kg)', valor: traza.peso_neto || 0 }
                  ]
                : []
            }
            tablas={
              traza
                ? [
                    {
                      titulo: 'Datos generales',
                      columnas: ['Producto', 'Lote', 'Finca', 'Fecha', 'Peso (kg)', 'Código ICA'],
                      filas: [[traza.producto, traza.lote, traza.finca, `${traza.fecha_proceso} ${traza.hora_proceso}`, traza.peso_neto || 0, traza.codigo_ica_finca || '—']]
                    },
                    {
                      titulo: 'Cajas asociadas',
                      columnas: ['# Caja', 'Peso bruto (kg)', 'Tipo de empaque', 'Fecha', 'Hora'],
                      filas: (traza.cajas || []).map((c) => [c.id_caja, c.peso_bruto ?? '—', c.tipo_empaque || '—', fechaCorta(c.fecha_empaque), c.hora_empaque || '—'])
                    },
                    {
                      titulo: 'Aplicaciones del lote',
                      columnas: ['Fecha', 'Agroquímico', 'Dosis (L/ha)', 'Carencia hasta'],
                      filas: (traza.aplicaciones || []).map((a) => [fechaCorta(a.fecha_aplicacion), a.agroquimico, a.dosis_aplicada ?? '—', fechaCorta(a.fecha_fin_carencia)])
                    },
                    {
                      titulo: 'Evaluaciones del lote',
                      columnas: ['Fecha', 'Tipo', 'YHA', 'Severidad', 'Adultos'],
                      filas: (traza.evaluaciones || []).map((e) => [fechaCorta(e.fecha_evaluacion), e.tipo_evaluacion, e.yha ?? '—', e.indice_severidad ?? '—', e.numero_adultos ?? '—'])
                    }
                  ]
                : []
            }
          />
          <button className="btn-primary" onClick={() => window.print()} disabled={!traza}>
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>
      <div className="dash-filtros no-print">
        <div className="dash-filtro-item">
          <label htmlFor="codigo-qr">Código QR</label>
          <input
            id="codigo-qr"
            className="rep-input"
            placeholder="AGT-2026-XXXX"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && buscar()}
          />
        </div>
        <button className="btn-primary" onClick={buscar} disabled={buscando}>
          {buscando ? 'Buscando…' : 'Consultar traza'}
        </button>
      </div>
      {error && <div className="alert alert-error no-print">{error}</div>}
      {traza && (
        <Reporte titulo={`Trazabilidad · ${traza.codigo}`}>
          <div className="rep-datos">
            <div><span>Producto</span><strong>{traza.producto}</strong></div>
            <div><span>Lote</span><strong>{traza.lote}</strong></div>
            <div><span>Finca</span><strong>{traza.finca}</strong></div>
            <div><span>Fecha de proceso</span><strong>{traza.fecha_proceso} {traza.hora_proceso}</strong></div>
            <div><span>Peso neto</span><strong>{Number(traza.peso_neto || 0).toLocaleString('es-CO')} kg</strong></div>
            <div><span>Código ICA</span><strong>{traza.codigo_ica_finca || '—'}</strong></div>
            <div><span>Generado por</span><strong>{traza.generado_por}</strong></div>
            <div><span>Sincronizado</span><strong>{traza.sincronizado ? 'Sí' : 'No'}</strong></div>
          </div>

          <h3 className="rep-seccion">Cajas asociadas</h3>
          <div className="table-responsive">
            <table className="rep-tabla">
              <thead>
                <tr>
                  <th># Caja</th>
                  <th>Peso bruto (kg)</th>
                  <th>Tipo de empaque</th>
                  <th>Fecha</th>
                  <th>Hora</th>
                </tr>
              </thead>
              <tbody>
                {(traza.cajas || []).map((c) => (
                  <tr key={c.id_caja}>
                    <td>{c.id_caja}</td>
                    <td>{c.peso_bruto ?? '—'}</td>
                    <td>{c.tipo_empaque || '—'}</td>
                    <td>{fechaCorta(c.fecha_empaque)}</td>
                    <td>{c.hora_empaque || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="rep-seccion">Aplicaciones del lote</h3>
          {(traza.aplicaciones || []).length === 0 ? (
            <p className="rep-vacio">Sin aplicaciones registradas.</p>
          ) : (
            <div className="table-responsive">
              <table className="rep-tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Agroquímico</th>
                    <th>Dosis (L/ha)</th>
                    <th>Carencia hasta</th>
                  </tr>
                </thead>
                <tbody>
                  {traza.aplicaciones.map((a, i) => (
                    <tr key={i}>
                      <td>{fechaCorta(a.fecha_aplicacion)}</td>
                      <td>{a.agroquimico}</td>
                      <td>{a.dosis_aplicada ?? '—'}</td>
                      <td>{fechaCorta(a.fecha_fin_carencia)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3 className="rep-seccion">Evaluaciones del lote</h3>
          {(traza.evaluaciones || []).length === 0 ? (
            <p className="rep-vacio">Sin evaluaciones registradas.</p>
          ) : (
            <div className="table-responsive">
              <table className="rep-tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>YHA</th>
                    <th>Severidad</th>
                    <th>Adultos</th>
                  </tr>
                </thead>
                <tbody>
                  {traza.evaluaciones.map((e, i) => (
                    <tr key={i}>
                      <td>{fechaCorta(e.fecha_evaluacion)}</td>
                      <td>{e.tipo_evaluacion}</td>
                      <td>{e.yha ?? '—'}</td>
                      <td>{e.indice_severidad ?? '—'}</td>
                      <td>{e.numero_adultos ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Reporte>
      )}
    </Fragment>
  );
}

function ReporteInventario({ datos }) {
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroFinca, setFiltroFinca] = useState('');

  const usuarios = (datos.usuarios || []).filter((u) => {
    if (filtroRol && u.rol !== filtroRol) return false;
    if (filtroFinca) {
      const asignado = (datos.asignaciones || []).some(
        (a) => a.id_usuario === u.id_usuario && String(a.id_finca) === filtroFinca
      );
      if (!asignado) return false;
    }
    return true;
  });

  const porFinca = {};
  (datos.asignaciones || []).forEach((a) => {
    if (!porFinca[a.finca]) porFinca[a.finca] = { cantidad: 0, usuarios: [] };
    porFinca[a.finca].cantidad += 1;
    porFinca[a.finca].usuarios.push(a.usuario);
  });

  const fincas = datos.fincas || [];
  const lotes = datos.lotes || [];

  return (
    <Fragment>
      <div className="page-head">
        <div>
          <h2>Inventario campesino</h2>
          <p className="rep-sub">Personal, fincas y lotes del cultivo.</p>
        </div>
        <div className="page-head-acciones">
          <BotonGuardar
            tipo="inventario"
            titulo="Inventario campesino"
            resumen={[
              { label: 'Usuarios', valor: (datos.usuarios || []).length },
              { label: 'Fincas', valor: fincas.length },
              { label: 'Lotes', valor: lotes.length },
              { label: 'Asignaciones', valor: (datos.asignaciones || []).length }
            ]}
            tablas={[
              {
                titulo: 'Personal y rol',
                columnas: ['Nombre', 'Email', 'Rol'],
                filas: usuarios.map((u) => [u.nombre, u.email, ROL_LABEL[u.rol] || u.rol])
              },
              {
                titulo: 'Asignación personal - finca',
                columnas: ['Finca', 'Usuarios asignados'],
                filas: Object.entries(porFinca).map(([finca, info]) => [finca, info.usuarios.join(', ')])
              },
              {
                titulo: 'Lotes por finca',
                columnas: ['Finca', 'Lote', 'Tipo', 'Área (ha)', 'Estado'],
                filas: lotes.map((l) => [l.finca, l.nombre, l.tipo_siembra, l.area_hectareas ?? '—', l.estado_efectivo])
              }
            ]}
          />
          <button className="btn-primary" onClick={() => window.print()}>
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>
      <div className="dash-filtros no-print">
        <div className="dash-filtro-item">
          <label htmlFor="filtro-rol">Rol</label>
          <select id="filtro-rol" value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(ROL_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div className="dash-filtro-item">
          <label htmlFor="filtro-finca-inv">Finca</label>
          <select id="filtro-finca-inv" value={filtroFinca} onChange={(e) => setFiltroFinca(e.target.value)}>
            <option value="">Todas</option>
            {fincas.map((f) => (
              <option key={f.id_finca} value={String(f.id_finca)}>{f.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      <Reporte titulo="Inventario campesino">
        <Resumen
          items={[
            { label: 'Usuarios', valor: (datos.usuarios || []).length },
            { label: 'Fincas', valor: fincas.length },
            { label: 'Lotes', valor: lotes.length },
            { label: 'Asignaciones', valor: (datos.asignaciones || []).length }
          ]}
        />

        <h3 className="rep-seccion">Personal y rol</h3>
        <div className="table-responsive">
          <table className="rep-tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id_usuario}>
                  <td>{u.nombre}</td>
                  <td>{u.email}</td>
                  <td><span className="badge badge-activo">{ROL_LABEL[u.rol] || u.rol}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="rep-seccion">Asignación personal - finca</h3>
        <div className="table-responsive">
          <table className="rep-tabla">
            <thead>
              <tr>
                <th>Finca</th>
                <th>Usuarios asignados</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(porFinca).map(([finca, info]) => (
                <tr key={finca}>
                  <td>{finca}</td>
                  <td>{info.usuarios.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="rep-seccion">Lotes por finca</h3>
        <div className="table-responsive">
          <table className="rep-tabla">
            <thead>
              <tr>
                <th>Finca</th>
                <th>Lote</th>
                <th>Tipo</th>
                <th className="r">Área (ha)</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {lotes.map((l) => (
                <tr key={l.id_lote}>
                  <td>{l.finca}</td>
                  <td>{l.nombre}</td>
                  <td>{l.tipo_siembra}</td>
                  <td className="r">{l.area_hectareas ?? '—'}</td>
                  <td><span className={`badge badge-${l.estado_efectivo}`}>{l.estado_efectivo}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reporte>
    </Fragment>
  );
}

function FiltrosReporte({ filtros, setFiltros, fincas, filtroFinca, setFiltroFinca }) {
  return (
    <div className="dash-filtros no-print">
      <div className="dash-filtro-item">
        <label htmlFor="f-desde">Desde</label>
        <input id="f-desde" type="date" className="rep-input" value={filtros.desde} onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} />
      </div>
      <div className="dash-filtro-item">
        <label htmlFor="f-hasta">Hasta</label>
        <input id="f-hasta" type="date" className="rep-input" value={filtros.hasta} onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} />
      </div>
      <div className="dash-filtro-item">
        <label htmlFor="f-finca">Finca</label>
        <select id="f-finca" value={filtroFinca} onChange={(e) => setFiltroFinca(e.target.value)}>
          <option value="">Todas</option>
          {fincas.map((f) => (
            <option key={f.id_finca} value={String(f.id_finca)}>{f.nombre}</option>
          ))}
        </select>
      </div>
      <div className="dash-filtro-item dash-filtro-acciones">
        <button className="btn-cancel" onClick={() => setFiltros({ desde: haceDias(30), hasta: hoyISO() })}>Últimos 30 días</button>
        <button className="btn-cancel" onClick={() => setFiltros({ desde: '', hasta: hoyISO() })}>Todo</button>
      </div>
    </div>
  );
}

function HistorialReportes() {
  const [reportes, setReportes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [ver, setVer] = useState(null);

  async function cargar() {
    setCargando(true);
    setError('');
    try {
      const res = await reportesApi.listar();
      setReportes(res.reportes || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar este reporte del historial?')) return;
    try {
      await reportesApi.eliminar(id);
      if (ver && ver.id_reporte === id) setVer(null);
      cargar();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <Fragment>
      <div className="page-head">
        <div>
          <h2>Historial de reportes</h2>
          <p className="rep-sub">Reportes guardados que pueden reimprimirse.</p>
        </div>
        {ver && (
          <div className="page-head-acciones">
            <button className="btn-primary" onClick={() => window.print()}>
              Imprimir / Guardar PDF
            </button>
          </div>
        )}
      </div>
      {error && <div className="alert alert-error no-print">{error}</div>}

      {ver ? (
        <div>
          <button className="btn-cancel no-print" onClick={() => setVer(null)}>← Volver al historial</button>
          <Reporte titulo={ver.titulo}>
            <Resumen items={(ver.resumen || []).map((r) => ({ label: r.label, valor: r.valor }))} />
            {(ver.detalle || []).map((tabla, ti) => (
              <div key={ti}>
                <h3 className="rep-seccion">{tabla.titulo}</h3>
                <div className="table-responsive">
                  <table className="rep-tabla">
                    <thead>
                      <tr>
                        {tabla.columnas.map((c, ci) => (
                          <th key={ci}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tabla.filas.map((fila, fi) => (
                        <tr key={fi}>
                          {fila.map((v, vi) => (
                            <td key={vi}>{v ?? '—'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </Reporte>
        </div>
      ) : cargando ? (
        <div className="rep-vacio">Cargando historial…</div>
      ) : reportes.length === 0 ? (
        <div className="rep-vacio">
          No hay reportes guardados. Use "Guardar en historial" desde cada reporte.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="rep-tabla">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Título</th>
                <th>Período</th>
                <th>Finca</th>
                <th>Generado por</th>
                <th className="r">Fecha</th>
                <th className="c no-print">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reportes.map((r) => (
                <tr key={r.id_reporte}>
                  <td>{TIPO_REPORTE_LABEL[r.tipo_reporte] || r.tipo_reporte}</td>
                  <td>{r.titulo}</td>
                  <td>{r.desde ? `${fechaLegible(r.desde)} — ${fechaLegible(r.hasta)}` : '—'}</td>
                  <td>{r.finca || '—'}</td>
                  <td>{r.generado_por_nombre || '—'}</td>
                  <td className="r">{fechaLegible(r.created_at)}</td>
                  <td className="c no-print">
                    <button className="btn-cancel" onClick={() => setVer(r)}>Ver</button>{' '}
                    <button className="btn-danger" onClick={() => eliminar(r.id_reporte)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Fragment>
  );
}

function Reportes() {
  const [seccion, setSeccion] = useState('produccion');
  const [datos, setDatos] = useState(null);
  const [filtroProd, setFiltroProd] = useState({ desde: haceDias(30), hasta: hoyISO(), finca: '' });
  const [filtroFito, setFiltroFito] = useState({ desde: haceDias(90), hasta: hoyISO(), finca: '' });

  useEffect(() => {
    Promise.allSettled([
      fincasApi.listar(),
      lotesApi.listar(),
      aplicacionesApi.listar(),
      evaluacionesApi.listar(),
      ordenesCorteApi.listar(),
      qrCajasApi.listar(),
      usuariosApi.listar(),
      asignacionesApi.listar()
    ]).then(([f, l, a, e, o, q, u, as]) =>
      setDatos({
        fincas: f.status === 'fulfilled' ? (f.value.fincas || []) : [],
        lotes: l.status === 'fulfilled' ? (l.value.lotes || []) : [],
        aplicaciones: a.status === 'fulfilled' ? (a.value.aplicaciones || []) : [],
        evaluaciones: e.status === 'fulfilled' ? (e.value.evaluaciones || []) : [],
        ordenes: o.status === 'fulfilled' ? (o.value.ordenes || []) : [],
        qrs: q.status === 'fulfilled' ? (q.value.codigos || []) : [],
        usuarios: u.status === 'fulfilled' ? (u.value.usuarios || []) : [],
        asignaciones: as.status === 'fulfilled' ? (as.value.asignaciones || []) : []
      })
    );
  }, []);

  return (
    <AppLayout>
      <nav className="rep-tabs no-print">
        {SECCIONES.map((s) => (
          <button
            key={s.id}
            className={`rep-tab ${seccion === s.id ? 'active' : ''}`}
            onClick={() => setSeccion(s.id)}
          >
            {s.titulo}
          </button>
        ))}
      </nav>

      {seccion === 'produccion' && (
        <ReporteProduccion
          datos={datos || {}}
          filtros={filtroProd}
          setFiltros={setFiltroProd}
          fincas={datos?.fincas || []}
        />
      )}
      {seccion === 'fitosanitario' && (
        <ReporteFitosanitario
          datos={datos || {}}
          filtros={filtroFito}
          setFiltros={setFiltroFito}
          fincas={datos?.fincas || []}
        />
      )}
      {seccion === 'trazabilidad' && <ReporteTrazabilidad datos={datos || {}} />}
      {seccion === 'inventario' && <ReporteInventario datos={datos || {}} />}
      {seccion === 'historial' && <HistorialReportes />}
    </AppLayout>
  );
}

export default Reportes;