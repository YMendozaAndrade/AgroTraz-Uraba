import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import AppLayout from '../app/AppLayout';
import { fincasApi } from '../services/api';

function Mapa() {
  const contenedorRef = useRef(null);
  const mapaRef = useRef(null);
  const capasRef = useRef(null);

  const [fincas, setFincas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
  const puedeGestionar = usuario.rol === 'administrador' || usuario.rol === 'gerente';
  const [fincaAUsar, setFincaAUsar] = useState(null); // finca seleccionada para geolocalizar
  const [ubicoMismo, setUbicoMismo] = useState(false); // usar mi propia ubicacion

  async function cargarFincas() {
    try {
      const data = await fincasApi.listar();
      setFincas(data.fincas || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarFincas();
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
      cargarFincas();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }, []);

  // Pintar marcadores cada vez que cambian las fincas
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
  }, [fincas]);

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