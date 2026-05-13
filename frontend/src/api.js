const BASE = '/api';

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error del servidor');
  return data;
}

export const api = {
  getWorkers: () => req('GET', '/workers/public'),
  login: (worker_id, pin) => req('POST', '/auth/login', { worker_id, pin }),
  logout: () => req('POST', '/auth/logout'),
  me: () => req('GET', '/auth/me'),
  fichajeHoy: () => req('GET', '/fichajes/hoy'),
  accion: (accion) => req('POST', '/fichajes/accion', { accion }),
  historial: () => req('GET', '/fichajes/historial'),
  adminFichajes: (fecha) => req('GET', `/fichajes/admin?fecha=${fecha}`),
  adminEditar: (id, data) => req('PUT', `/fichajes/admin/${id}`, data),
  adminWorkers: () => req('GET', '/workers'),
  adminAddWorker: (data) => req('POST', '/workers', data),
  adminEditWorker: (id, data) => req('PUT', `/workers/${id}`, data),
};
