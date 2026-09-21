import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { io } from 'socket.io-client';
import AppLayout from '../app/AppLayout';
import { tiempoRealApi } from '../services/api';

// En desarrollo (Vite :5173) el socket va al backend local; en producción al mismo origen.
const SOCKET_URL = window.location.port === '5173' ? 'http://localhost:3000' : undefined;

function horaCorta(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '—';
  }
}

function TiempoReal() {
  const contenedorRef = useRef(null);
  const mapaRef = useRef(null);
  const capasRef = useRef(null);
  const socketRef = useRef(null);
  const watchRef = useRef(null);
  const ultimoEnvioRef = useRef(0);

  const [posiciones, setPosiciones] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [compartiendo, setCompartiendo] = useState(false);
  const [conectado, setConectado] = useState(false);
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);

  const token = localStorage.getItem('token');

  async function cargarEventos() {
    try {
      const data = await tiempoRealApi.eventos();
      setEventos(data.eventos || []);
    } catch {
      // Sin permiso o sin eventos: el log en vivo sigue funcionando por socket
    } finally {
      setListo(true);
    }
  }

  useEffect(() => {
    cargarEventos();
  }, []);

  // Crear el mapa una vez que el contenedor existe
  useEffect(() => {
    if (!listo || !contenedorRef.current || mapaRef.current) return;

    const mapa = L.map(contenedorRef.current, {
      center: [7.9403, -76.3204],
      zoom: 9
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(mapa);

    capasRef.current = L.layerGroup().addTo(mapa);
    mapaRef.current = mapa;

    return () => {
      mapa.remove();
      mapaRef.current = null;
      capasRef.current = null;
    };
  }, [listo]);

  // Conexión socket
  useEffect(() => {
    if (!token) return;
    const socket = io(SOCKET_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => setConectado(true));
    socket.on('disconnect', () => setConectado(false));
    socket.on('connect_error', () => setConectado(false));
    socket.on('posiciones', (lista) => setPosiciones(Array.isArray(lista) ? lista : []));
    socket.on('evento-geocerca', (ev) => {
      setEventos((prev) => [
        { id_evento: `vivo-${Date.now()}`, usuario: ev.usuario, tipo: ev.tipo, lote: ev.lote, finca: ev.finca, created_at: ev.ts },
        ...prev
      ].slice(0, 100));
    });

    return () => {
      detenerCompartir();
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pintar posiciones en vivo
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !capasRef.current) return;

    capasRef.current.clearLayers();

    posiciones.forEach((p) => {
      const lat = Number(p.latitud);
      const lng = Number(p.longitud);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return;

      const icono = L.divIcon({
        className: 'mapa-marcador',
        html: '<div class="mapa-pin vivo"></div>',
        iconSize: [22, 28],
        iconAnchor: [11, 28]
      });

      L.marker([lat, lng], { icon: icono })
        .addTo(capasRef.current)
        .bindPopup(
          `<div class="mapa-ficha">
             <h4>${p.nombre || 'Operario'}</h4>
             <div class="mapa-ficha-dato"><span>Rol</span><strong>${p.rol || '—'}</strong></div>
             <div class="mapa-ficha-dato"><span>Ubicación</span><strong>${lat.toFixed(5)}, ${lng.toFixed(5)}</strong></div>
             <div class="mapa-ficha-dato"><span>Actualizado</span><strong>${horaCorta(p.ts)}</strong></div>
           </div>`,
          { maxWidth: 260 }
        );
    });
  }, [posiciones]);

  function detenerCompartir() {
    if (watchRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setCompartiendo(false);
  }

  function compartirUbicacion() {
    if (compartiendo) {
      detenerCompartir();
      return;
    }
    if (!navigator.geolocation) {
      setError('Geolocalización no disponible en este navegador');
      return;
    }
    if (!socketRef.current) {
      setError('Sin conexión al servidor en vivo');
      return;
    }
    setError('');
    setCompartiendo(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const ahora = Date.now();
        if (ahora - ultimoEnvioRef.current < 5000) return;
        ultimoEnvioRef.current = ahora;
        socketRef.current.emit('ubicacion', {
          latitud: pos.coords.latitude,
          longitud: pos.coords.longitude
        });
      },
      () => {
        setError('No se pudo obtener tu ubicación');
        detenerCompartir();
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
  }

  return (
    <AppLayout>
      {error && (
        <div className="alert alert-error" onClick={() => setError('')}>
          {error}
        </div>
      )}
      <div className="page-head">
        <h2>Personal en campo · en vivo</h2>
        <div className="page-head-acciones">
          <span className={`badge ${conectado ? 'badge-disponible' : 'badge-inactivo'}`}>
            {conectado ? '🟢 En vivo' : '⚪ Desconectado'}
          </span>
          <button className={compartiendo ? 'btn-cancel' : 'btn-primary'} onClick={compartirUbicacion}>
            {compartiendo ? '⏹ Dejar de compartir' : '📡 Compartir mi ubicación'}
          </button>
        </div>
      </div>

      {!listo ? (
        <div className="panel-card"><p>Cargando…</p></div>
      ) : (
        <div className="mapa-grid">
          <div className="panel-card mapa-panel">
            <h3>Operarios ({posiciones.length})</h3>
            <p className="rep-dim">Posiciones en vivo del personal que está compartiendo su ubicación.</p>
            {posiciones.length === 0 ? (
              <p>Nadie está compartiendo ubicación ahora mismo.</p>
            ) : (
              <div className="mapa-lista">
                {posiciones.map((p) => (
                  <div className="mapa-item" key={p.id_usuario}>
                    <div className="mapa-item-info">
                      <strong>{p.nombre}</strong>
                      <span className="rep-dim">{p.rol}</span>
                    </div>
                    <span className="badge badge-disponible">📍 {Number(p.latitud).toFixed(5)}, {Number(p.longitud).toFixed(5)} · {horaCorta(p.ts)}</span>
                  </div>
                ))}
              </div>
            )}

            <h3 style={{ marginTop: 16 }}>Entradas y salidas de lotes</h3>
            {eventos.length === 0 ? (
              <p className="rep-dim">Sin eventos registrados.</p>
            ) : (
              <div className="mapa-lista">
                {eventos.slice(0, 30).map((e) => (
                  <div className="mapa-item" key={e.id_evento}>
                    <div className="mapa-item-info">
                      <strong>{e.tipo === 'entrada' ? '🟢 Entró' : '🔴 Salió'} · {e.lote || 'lote'}</strong>
                      <span className="rep-dim">{horaCorta(e.created_at)}</span>
                    </div>
                    <span className="rep-dim">{e.usuario}{e.finca ? ` · ${e.finca}` : ''}</span>
                  </div>
                ))}
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

export default TiempoReal;
