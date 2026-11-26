let csrfToken = '';

export async function api(path, options = {}) {
  const method = options.method || 'GET';
  const headers = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (!['GET', 'HEAD'].includes(method)) headers['X-CSRF-Token'] = csrfToken;

  let response;
  try {
    response = await fetch(path, {
      method,
      headers,
      credentials: 'same-origin',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new Error('No fue posible conectar con el servidor. Intentá de nuevo.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || 'No pudimos completar la solicitud.');
  return data;
}

export async function refreshSession() {
  const session = await api('/api/session');
  csrfToken = session.csrfToken || '';
  return session;
}
