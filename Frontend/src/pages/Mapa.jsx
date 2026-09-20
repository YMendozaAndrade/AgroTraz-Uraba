import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw';
import 'leaflet-draw/dist/leaflet.draw.css';
import AppLayout from '../app/AppLayout';
import { fincasApi, lotesApi } from '../services/api';

const COLOR_ESTADO = {
  disponible: '#2f7a3d',
  carencia: '#e0a63c',
  restringido: '#d97a2b',
  cuarentena: '#e0533d'
};

function parseGeoJSON(valor) {
  if (!valor) return null;
  try {
    const g = typeof valor === 'string' ? JSON.parse(valor) : valor;
    const geom = g.type === 'Feature' ? g.geometry : g;
    if (geom && (geom.type === 'Polygon' || geom.type === 'MultiPolygon')) return geom;
    return null;
  } catch {
    return null;
  }
}

function Mapa() {
  const contenedorRef = useRef(null);
  const mapaRef = useRef(null);
  const capasRef = useRef(null);

  const [fincas, setFincas] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const puedeGestionar = usuario.rol === 'administrador' || usuario.rol === 'gerente';
  const puedeGestionarLotes = ['administrador', 'gerente', 'agronomo'].includes(usuario.rol);
  const [fincaAUsar, setFincaAUsar] = useState(null); // finca seleccionada para geolocalizar
  const [ubicoMismo, setUbicoMismo] = useState(false); // usar mi propia ubicacion
  const [loteADibujar, setLoteADibujar] = useState(null); // lote seleccionado para dibujar polígono

  async function cargarTodo() {
    try {
      const [f, l] = await Promise.all([fincasApi.listar(), lotesApi.listar()]);
      setFincas(f.fincas || []);
      setLotes(l.lotes || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarTodo();
  }, []);

  // Crear el mapa una vez que el contenedor existe (después de cargar)
  useEffect(() => {
    if (loading || !contenedorRef.current || mapaRef.current) return;

    const mapa = L.map(contenedorRef.current, {
      center: [7.9403, -76.3204], // región de Urabá
      zoom: 9
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(mapa);

    capasRef.current = L.layerGroup().addTo(mapa);
    mapaRef.current = mapa;

    // Guardar la referencia limpia al desmontar
    return () => {
      mapa.remove();
      mapaRef.current = null;
      capasRef.current = null;
    };
  }, [loading]);

  const guardarCoordenadas = useCallback(async (idFinca, lat, lng) => {
    setGuardando(true);
    setMensaje(null);
    setError('');
    try {
      await fincasApi.actualizar(idFinca, { latitud: Number(lat.toFixed(6)), longitud: Number(lng.toFixed(6)) });
      setMensaje({ tipo: 'success', texto: 'Ubicación guardada correctamente' });
      setFincaAUsar(null);
      setUbicoMismo(false);
      cargarTodo();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }, []);

  // Pintar marcadores y polígonos cada vez que cambian fincas o lotes
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !capasRef.current) return;

    capasRef.current.clearLayers();

    fincas.forEach((f) => {
      const lat = Number(f.latitud);
      const lng = Number(f.longitud);
      if (Number.isNaN(lat) || Number.isNaN(lng) || (lat === 0 && lng === 0)) return;

      const icono = L.divIcon({
        className: 'mapa-marcador',
        html: `<div class="mapa-pin ${f.activo ? 'activo' : 'inactivo'}"></div>`,
        iconSize: [22, 28],
        iconAnchor: [11, 28]
      });

      const marcador = L.marker([lat, lng], { icon: icono }).addTo(capasRef.current);

      marcador.bindPopup(
        `<div class="mapa-ficha">
           <h4>${f.nombre}</h4>
           <div class="mapa-ficha-dato"><span>Código ICA</span><strong>${f.codigo_ica}</strong></div>
           <div class="mapa-ficha-dato"><span>Municipio</span><strong>${f.municipio || '—'}</strong></div>
           <div class="mapa-ficha-dato"><span>Área</span><strong>${f.area_hectareas ? f.area_hectareas + ' ha' : '—'}</strong></div>
           <div class="mapa-ficha-dato"><span>Encargado</span><strong>${f.encargado_responsable || '—'}</strong></div>
           <div class="mapa-ficha-dato"><span>Ubicación</span><strong>${lat.toFixed(5)}, ${lng.toFixed(5)}</strong></div>
           <div class="mapa-ficha-dato"><span>Estado</span><strong>${f.activo ? 'Activa' : 'Inactiva'}</strong></div>
         </div>`,
        { maxWidth: 260 }
      );
    });

    lotes.forEach((l) => {
      const geom = parseGeoJSON(l.poligono_geojson);
      if (!geom) return;
      const estado = l.estado_efectivo || l.estado || 'disponible';
      const color = COLOR_ESTADO[estado] || COLOR_ESTADO.disponible;

      const capa = L.geoJSON(geom, {
        style: { color, weight: 2, fillColor: color, fillOpacity: 0.25 }
      }).addTo(capasRef.current);

      capa.bindPopup(
        `<div class="mapa-ficha">
           <h4>${l.nombre} · ${l.finca || ''}</h4>
           <div class="mapa-ficha-dato"><span>Tipo de siembra</span><strong>${l.tipo_siembra || '—'}</strong></div>
           <div class="mapa-ficha-dato"><span>Área</span><strong>${l.area_hectareas ? l.area_hectareas + ' ha' : '—'}</strong></div>
           <div class="mapa-ficha-dato"><span>Estado</span><strong>${estado}</strong></div>
           ${l.carencia_hasta ? `<div class="mapa-ficha-dato"><span>Carencia hasta</span><strong>${String(l.carencia_hasta).slice(0, 10)}${l.carencia_agroquimico ? ` (${l.carencia_agroquimico})` : ''}</strong></div>` : ''}
         </div>`,
        { maxWidth: 260 }
      );
    });
  }, [fincas, lotes]);

  const guardarPoligono = useCallback(async (idLote, geojson) => {
    setGuardando(true);
    setMensaje(null);
    setError('');
    try {
      await lotesApi.actualizar(idLote, { poligono_geojson: JSON.stringify(geojson) });
      setMensaje({ tipo: 'success', texto: 'Polígono del lote guardado correctamente' });
      setLoteADibujar(null);
      cargarTodo();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }, []);

  async function eliminarPoligono(lote) {
    if (!window.confirm(`¿Eliminar el polígono del lote "${lote.nombre}"?`)) return;
    setGuardando(true);
    try {
      await lotesApi.actualizar(lote.id_lote, { poligono_geojson: null });
      setMensaje({ tipo: 'success', texto: 'Polígono eliminado' });
      cargarTodo();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  // Control de dibujo (solo cuando hay un lote seleccionado para dibujar)
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !loteADibujar) return;

    L.drawLocal.draw.toolbar.buttons.polygon = 'Dibujar polígono del lote';
    L.drawLocal.draw.handlers.polygon.tooltip.start = 'Clic para empezar a dibujar el lote';
    L.drawLocal.draw.handlers.polygon.tooltip.cont = 'Clic para continuar dibujando';
    L.drawLocal.draw.handlers.polygon.tooltip.end = 'Clic en el primer punto para cerrar el polígono';
    L.drawLocal.draw.toolbar.actions.text = 'Cancelar';
    L.drawLocal.draw.toolbar.actions.title = 'Cancelar dibujo';
    L.drawLocal.draw.toolbar.finish.text = 'Terminar';
    L.drawLocal.draw.toolbar.finish.title = 'Terminar dibujo';
    L.drawLocal.draw.toolbar.undo.text = 'Borrar último punto';
    L.drawLocal.draw.toolbar.undo.title = 'Borrar último punto';

    const control = new L.Control.Draw({
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: { color: '#2f7a3d', weight: 2, fillOpacity: 0.25 }
        },
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false
      },
      edit: false
    });
    mapa.addControl(control);

    function handleCreated(e) {
      const geojson = e.layer.toGeoJSON();
      guardarPoligono(loteADibujar.id_lote, geojson.geometry || geojson);
    }

    mapa.on(L.Draw.Event.CREATED, handleCreated);
    return () => {
      mapa.off(L.Draw.Event.CREATED, handleCreated);
      mapa.removeControl(control);
    };
  }, [loteADibujar, guardarPoligono]);

  // Clon en el mapa (modo geolocalización)
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;

    function handleClick(e) {
      if (fincaAUsar) {
        guardarCoordenadas(fincaAUsar.id_finca, e.latlng.lat, e.latlng.lng);
      }
    }

    mapa.on('click', handleClick);
    return () => mapa.off('click', handleClick);
  }, [fincaAUsar, guardarCoordenadas]);

  function useStateUbicacion() {
    if (!navigator.geolocation) {
      setError('Geolocalización no disponible en este navegador');
      return;
    }
    if (!fincaAUsar) {
      setError('Primero selecciona una finca en la lista');
      return;
    }
    setUbicoMismo(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await guardarCoordenadas(fincaAUsar.id_finca, pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setError('No se pudo obtener tu ubicación');
        setUbicoMismo(false);
      },
      { timeout: 15000 }
    );
  }

  return (
    <AppLayout>
      {(mensaje || error) && (
        <div
          className={`alert ${mensaje ? 'alert-success' : 'alert-error'}`}
          onClick={() => {
            setMensaje(null);
            setError('');
          }}
        >
          {mensaje ? mensaje.texto : error}
        </div>
      )}
      <div className="page-head">
        <h2>Mapa interactivo</h2>
      </div>

      {loading ? (
        <div className="panel-card"><p>Cargando mapa…</p></div>
      ) : (
        <div className="mapa-grid">
          <div className="panel-card mapa-panel">
            <h3>Puntos estratégicos</h3>
            <p className="rep-dim">
              Fincas registradas y su ubicación. {puedeGestionar ? 'Selecciona una finca y haz clic en el mapa para ubicarla.' : ''}
            </p>

            {fincas.length === 0 ? (
              <p>No hay fincas registradas.</p>
            ) : (
              <div className="mapa-lista">
                {fincas.map((f) => {
                  const tieneUbicacion =
                    !Number.isNaN(Number(f.latitud)) && !Number.isNaN(Number(f.longitud)) && !(Number(f.latitud) === 0 && Number(f.longitud) === 0);
                  return (
                    <div className={`mapa-item ${fincaAUsar?.id_finca === f.id_finca ? 'seleccionado' : ''}`} key={f.id_finca}>
                      <div className="mapa-item-info">
                        <strong>{f.nombre}</strong>
                        <span className="rep-dim">{f.codigo_ica}</span>
                      </div>
                      {tieneUbicacion ? (
                        <span className="badge badge-disponible">📍 {Number(f.latitud).toFixed(5)}, {Number(f.longitud).toFixed(5)}</span>
                      ) : (
                        <span className="badge badge-inactivo">Sin ubicación</span>
                      )}
                      {puedeGestionar && (
                        <button
                          className="btn-loc"
                          onClick={() => {
                            setFincaAUsar(tieneUbicacion ? null : f);
                            setError('');
                          }}
                        >
                          {fincaAUsar?.id_finca === f.id_finca ? 'Cancelar' : tieneUbicacion ? 'Reubicar' : 'Ubicar en mapa'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {puedeGestionar && (
              <div className="mapa-acciones">
                <button className="btn-loc" disabled={!fincaAUsar || guardando} onClick={useStateUbicacion}>
                  {ubicoMismo ? 'Obteniendo ubicación…' : '📡 Usar mi ubicación'}
                </button>
              </div>
            )}

            <h3 style={{ marginTop: 16 }}>Lotes</h3>
            <p className="rep-dim">
              Polígonos de cada lote, coloreados por estado. {puedeGestionarLotes ? 'Selecciona un lote y dibújalo en el mapa.' : ''}
            </p>

            {lotes.length === 0 ? (
              <p>No hay lotes registrados.</p>
            ) : (
              <div className="mapa-lista">
                {lotes.map((l) => {
                  const tienePoligono = !!parseGeoJSON(l.poligono_geojson);
                  const estado = l.estado_efectivo || l.estado || 'disponible';
                  return (
                    <div className={`mapa-item ${loteADibujar?.id_lote === l.id_lote ? 'seleccionado' : ''}`} key={l.id_lote}>
                      <div className="mapa-item-info">
                        <strong>{l.nombre}</strong>
                        <span className="rep-dim">{l.finca}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span className="badge" style={{ background: COLOR_ESTADO[estado] || COLOR_ESTADO.disponible, color: '#fff' }}>{estado}</span>
                        {tienePoligono ? (
                          <span className="badge badge-disponible">⬟ Con polígono</span>
                        ) : (
                          <span className="badge badge-inactivo">Sin polígono</span>
                        )}
                      </div>
                      {puedeGestionarLotes && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            className="btn-loc"
                            disabled={guardando}
                            onClick={() => {
                              setLoteADibujar(loteADibujar?.id_lote === l.id_lote ? null : l);
                              setError('');
                            }}
                          >
                            {loteADibujar?.id_lote === l.id_lote ? 'Cancelar dibujo' : tienePoligono ? 'Reemplazar' : 'Dibujar en mapa'}
                          </button>
                          {tienePoligono && (
                            <button className="btn-loc" disabled={guardando} onClick={() => eliminarPoligono(l)}>
                              Eliminar polígono
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {loteADibujar && (
              <p className="rep-dim" style={{ marginTop: 8 }}>
                ✏️ Dibujando <strong>{loteADibujar.nombre}</strong>: usa la herramienta de polígono del mapa (arriba a la izquierda) y cierra la figura para guardar.
              </p>
            )}
          </div>

          <div className="panel-card mapa-contenedor-card">
            <div className="mapa-contenedor" ref={contenedorRef} />
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default Mapa;