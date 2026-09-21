import NetInfo from '@react-native-community/netinfo';
import { api } from './api';
import {
  guardarCatalogo,
  listarPendientes,
  marcarSincronizada,
} from './db';

export async function hayConexion() {
  const estado = await NetInfo.fetch();
  return !!(estado.isConnected && estado.isInternetReachable !== false);
}

// Descarga catálogo (fincas y lotes) para trabajar sin conexión.
export async function descargarCatalogo(token) {
  const [f, l] = await Promise.all([api.fincas(token), api.lotes(token)]);
  guardarCatalogo(f.fincas || [], l.lotes || []);
  return { fincas: (f.fincas || []).length, lotes: (l.lotes || []).length };
}

// Sube evaluaciones pendientes. Devuelve { subidas, errores }.
export async function sincronizarPendientes(token) {
  const pendientes = listarPendientes().filter((p) => !p.sincronizada);
  let subidas = 0;
  const errores = [];
  for (const p of pendientes) {
    try {
      await api.crearEvaluacion(token, {
        id_lote: p.id_lote,
        tipo_evaluacion: p.tipo_evaluacion,
        fecha_evaluacion: p.fecha_evaluacion,
        hora_evaluacion: p.hora_evaluacion || undefined,
        latitud: p.latitud,
        longitud: p.longitud,
        fotografia_url: p.fotografia || undefined,
        yha: p.yha,
        indice_severidad: p.indice_severidad,
        numero_adultos: p.numero_adultos,
        sincronizada: true,
      });
      marcarSincronizada(p.id_local);
      subidas += 1;
    } catch (e) {
      errores.push(`#${p.id_local}: ${e.message}`);
    }
  }
  return { subidas, errores, total: pendientes.length };
}
