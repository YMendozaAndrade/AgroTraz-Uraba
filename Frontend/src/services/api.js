const BASE_URL = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, method = 'GET', body = null) {
  const config = { method, headers: {} };
  const token = getToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  if (body) {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${path}`, config);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/login') {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/';
    }
    throw new Error(data.message || 'Error en la solicitud');
  }
  return data;
}

export const authApi = {
  login: (email, password) => request('/auth/login', 'POST', { email, password }),
  register: (usuario) => request('/auth/register', 'POST', usuario),
  cambiarPassword: (password_actual, password_nueva) =>
    request('/auth/cambiar-password', 'POST', { password_actual, password_nueva }),
  recuperar: (email) => request('/auth/recuperar', 'POST', { email }),
  restablecer: (token, password_nueva) => request('/auth/restablecer', 'POST', { token, password_nueva })
};

export const fincasApi = {
  listar: () => request('/fincas'),
  crear: (finca) => request('/fincas', 'POST', finca),
  actualizar: (id, finca) => request(`/fincas/${id}`, 'PUT', finca),
  desactivar: (id) => request(`/fincas/${id}`, 'DELETE')
};

export const lotesApi = {
  listar: (idFinca) => request(`/lotes${idFinca ? `?id_finca=${idFinca}` : ''}`),
  crear: (lote) => request('/lotes', 'POST', lote),
  actualizar: (id, lote) => request(`/lotes/${id}`, 'PUT', lote),
  desactivar: (id) => request(`/lotes/${id}`, 'DELETE')
};

export const usuariosApi = {
  listar: (incluirInactivos = false) => request(`/usuarios${incluirInactivos ? '?incluir_inactivos=true' : ''}`),
  crear: (usuario) => request('/usuarios', 'POST', usuario),
  cambiarRol: (id, rol) => request(`/usuarios/${id}/rol`, 'PUT', { rol }),
  cambiarEstado: (id, activo) => request(`/usuarios/${id}/estado`, 'PUT', { activo })
};

export const asignacionesApi = {
  listar: () => request('/asignaciones'),
  asignar: (idUsuario, idFinca) => request('/asignaciones', 'POST', { id_usuario: idUsuario, id_finca: idFinca }),
  quitar: (idUsuario, idFinca) => request(`/asignaciones/${idUsuario}/${idFinca}`, 'DELETE')
};

export const agroquimicosApi = {
  listar: () => request('/agroquimicos'),
  crear: (agroquimico) => request('/agroquimicos', 'POST', agroquimico),
  actualizar: (id, agroquimico) => request(`/agroquimicos/${id}`, 'PUT', agroquimico),
  desactivar: (id) => request(`/agroquimicos/${id}`, 'DELETE')
};

export const aplicacionesApi = {
  listar: (idLote) => request(`/aplicaciones${idLote ? `?id_lote=${idLote}` : ''}`),
  alertas: () => request('/aplicaciones/alertas'),
  crear: (aplicacion) => request('/aplicaciones', 'POST', aplicacion),
  actualizar: (id, aplicacion) => request(`/aplicaciones/${id}`, 'PUT', aplicacion),
  eliminar: (id) => request(`/aplicaciones/${id}`, 'DELETE')
};

export const ordenesCorteApi = {
  listar: () => request('/ordenes-corte'),
  crear: (orden) => request('/ordenes-corte', 'POST', orden),
  actualizar: (id, orden) => request(`/ordenes-corte/${id}`, 'PUT', orden),
  eliminar: (id) => request(`/ordenes-corte/${id}`, 'DELETE')
};

export const evaluacionesApi = {
  listar: () => request('/evaluaciones'),
  crear: (evaluacion) => request('/evaluaciones', 'POST', evaluacion),
  actualizar: (id, evaluacion) => request(`/evaluaciones/${id}`, 'PUT', evaluacion),
  eliminar: (id) => request(`/evaluaciones/${id}`, 'DELETE')
};

export const qrCajasApi = {
  listar: () => request('/qr'),
  crear: (qr) => request('/qr', 'POST', qr),
  actualizar: (id, qr) => request(`/qr/${id}`, 'PUT', qr),
  eliminar: (id) => request(`/qr/${id}`, 'DELETE'),
  traza: (codigo) => request(`/qr/traza/${codigo}`),
  listarCajas: (idQr) => request(`/qr/${idQr}/cajas`),
  crearCaja: (idQr, caja) => request(`/qr/${idQr}/cajas`, 'POST', caja),
  eliminarCaja: (idCaja) => request(`/qr/cajas/${idCaja}`, 'DELETE')
};

export const reportesApi = {
  listar: () => request('/reportes'),
  guardar: (reporte) => request('/reportes', 'POST', reporte),
  obtener: (id) => request(`/reportes/${id}`),
  eliminar: (id) => request(`/reportes/${id}`, 'DELETE')
};

export const tiempoRealApi = {
  eventos: () => request('/tiempo-real/eventos')
};