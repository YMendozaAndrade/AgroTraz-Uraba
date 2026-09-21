export const BASE_URL = 'https://agrotraz-backend.onrender.com/api';

async function request(path, method = 'GET', body = null, token = null) {
  const config = { method, headers: {} };
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (body) {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${path}`, config);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`);
  return data;
}

export const api = {
  login: (email, password) =>
    request('/auth/login', 'POST', { email, password }),
  fincas: (token) => request('/fincas', 'GET', null, token),
  lotes: (token) => request('/lotes', 'GET', null, token),
  crearEvaluacion: (token, evaluacion) =>
    request('/evaluaciones', 'POST', evaluacion, token),
};
