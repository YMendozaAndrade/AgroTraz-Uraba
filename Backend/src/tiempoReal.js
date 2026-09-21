const jwt = require('jsonwebtoken');
const pool = require('./db');
const { requiereRol } = require('./middleware/auth');

const SECRETO = process.env.JWT_SECRET;
const ROLES_VIGIA = ['administrador', 'gerente', 'agronomo'];

// Últimas posiciones conocidas en memoria: id_usuario -> { nombre, rol, latitud, longitud, ts }
const posiciones = new Map();
// Lotes donde está cada usuario ahora: id_usuario -> Set(id_lote)
const dentroDe = new Map();
// Polígonos de lotes en caché: [{ id_lote, nombre, finca, geometrias: [[ [lng,lat], ... ]] }]
let poligonosCache = [];
let cacheTs = 0;

function parseGeometrias(valor) {
  if (!valor) return [];
  try {
    const g = typeof valor === 'string' ? JSON.parse(valor) : valor;
    const geom = g && g.type === 'Feature' ? g.geometry : g;
    if (!geom) return [];
    if (geom.type === 'Polygon') return [geom.coordinates];
    if (geom.type === 'MultiPolygon') return geom.coordinates;
    return [];
  } catch {
    return [];
  }
}

async function recargarPoligonos() {
  try {
    const [rows] = await pool.query(
      `SELECT l.id_lote, l.nombre, f.nombre AS finca, l.poligono_geojson
       FROM lotes l JOIN fincas f ON f.id_finca = l.id_finca
       WHERE l.activo = TRUE AND l.poligono_geojson IS NOT NULL`
    );
    poligonosCache = rows
      .map((l) => ({ id_lote: l.id_lote, nombre: l.nombre, finca: l.finca, geometrias: parseGeometrias(l.poligono_geojson) }))
      .filter((l) => l.geometrias.length > 0);
    cacheTs = Date.now();
  } catch (err) {
    console.error('Error cargando polígonos para geocercas:', err.message);
  }
}

// Ray casting sobre el anillo exterior. coords: [ [lng, lat], ... ]
function puntoEnAnillo(lng, lat, anillo) {
  let dentro = false;
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const xi = anillo[i][0], yi = anillo[i][1];
    const xj = anillo[j][0], yj = anillo[j][1];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      dentro = !dentro;
    }
  }
  return dentro;
}

function lotesContienen(lat, lng) {
  const hallados = [];
  for (const l of poligonosCache) {
    for (const poligono of l.geometrias) {
      if (poligono.length > 0 && puntoEnAnillo(lng, lat, poligono[0])) {
        hallados.push(l);
        break;
      }
    }
  }
  return hallados;
}

function snapshotPosiciones() {
  return [...posiciones.entries()].map(([id_usuario, p]) => ({ id_usuario, ...p }));
}

function initTiempoReal(io) {
  recargarPoligonos();
  setInterval(recargarPoligonos, 60000).unref();

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) return next(new Error('Token no proporcionado'));
      socket.usuario = jwt.verify(token, SECRETO);
      next();
    } catch {
      next(new Error('Token inválido o expirado'));
    }
  });

  io.on('connection', (socket) => {
    const u = socket.usuario;
    if (ROLES_VIGIA.includes(u.rol)) {
      socket.join('vigias');
      socket.emit('posiciones', snapshotPosiciones());
    }

    socket.on('ubicacion', async (data) => {
      const lat = Number(data && data.latitud);
      const lng = Number(data && data.longitud);
      if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return;
      }
      posiciones.set(u.id_usuario, {
        nombre: u.nombre,
        rol: u.rol,
        latitud: Number(lat.toFixed(6)),
        longitud: Number(lng.toFixed(6)),
        ts: new Date().toISOString()
      });
      io.to('vigias').emit('posiciones', snapshotPosiciones());

      // Geocercas: detectar entradas/salidas de polígonos de lotes
      if (Date.now() - cacheTs > 60000) await recargarPoligonos();
      const ahora = new Set(lotesContienen(lat, lng).map((l) => l.id_lote));
      const antes = dentroDe.get(u.id_usuario) || new Set();
      for (const l of lotesContienen(lat, lng)) {
        if (!antes.has(l.id_lote)) {
          await registrarEvento(u, l, 'entrada', lat, lng, io);
        }
      }
      for (const idLote of antes) {
        if (!ahora.has(idLote)) {
          const l = poligonosCache.find((p) => p.id_lote === idLote);
          await registrarEvento(u, l || { id_lote: idLote, nombre: '', finca: '' }, 'salida', lat, lng, io);
        }
      }
      dentroDe.set(u.id_usuario, ahora);
    });

    socket.on('disconnect', () => {
      posiciones.delete(u.id_usuario);
      dentroDe.delete(u.id_usuario);
      io.to('vigias').emit('posiciones', snapshotPosiciones());
    });
  });
}

async function registrarEvento(u, lote, tipo, lat, lng, io) {
  try {
    await pool.query(
      `INSERT INTO eventos_geocerca (id_usuario, id_lote, tipo, latitud, longitud)
       VALUES (?, ?, ?, ?, ?)`,
      [u.id_usuario, lote.id_lote, tipo, Number(lat.toFixed(6)), Number(lng.toFixed(6))]
    );
  } catch (err) {
    console.error('Error guardando evento de geocerca:', err.message);
  }
  io.to('vigias').emit('evento-geocerca', {
    usuario: u.nombre,
    rol: u.rol,
    tipo,
    lote: lote.nombre,
    finca: lote.finca,
    ts: new Date().toISOString()
  });
}

const express = require('express');
const routerTR = express.Router();

routerTR.get(
  '/eventos',
  requiereRol('administrador', 'gerente', 'agronomo'),
  async (req, res) => {
    try {
      const [rows] = await pool.query(
        `SELECT e.id_evento, e.id_usuario, u.nombre AS usuario, e.id_lote, l.nombre AS lote,
                f.nombre AS finca, e.tipo, e.latitud, e.longitud, e.created_at
         FROM eventos_geocerca e
         LEFT JOIN usuarios u ON u.id_usuario = e.id_usuario
         LEFT JOIN lotes l ON l.id_lote = e.id_lote
         LEFT JOIN fincas f ON f.id_finca = l.id_finca
         ORDER BY e.created_at DESC, e.id_evento DESC
         LIMIT 100`
      );
      res.json({ status: 'ok', eventos: rows });
    } catch (err) {
      console.error('Error listando eventos de geocerca:', err.message);
      res.status(500).json({ status: 'error', message: 'Error interno del servidor' });
    }
  }
);

module.exports = { initTiempoReal, routerTR };
