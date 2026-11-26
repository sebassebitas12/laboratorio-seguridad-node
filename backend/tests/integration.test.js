const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { loadConfig } = require('../src/config');
const { createPool, migrate } = require('../src/db');
const { createApp } = require('../src/server');

test('cuentas, notas cifradas y aislamiento de acceso en MySQL', async (t) => {
  const config = loadConfig();
  const url = new URL(config.databaseUrl);
  if (process.env.NODE_ENV !== 'test' || url.pathname !== '/lab_test' ||
      !['127.0.0.1', 'localhost'].includes(url.hostname)) {
    throw new Error('Las pruebas solo pueden ejecutarse contra lab_test local');
  }
  const pool = createPool(config);
  await migrate(pool);
  const messages = [];
  config.smtp = { from: 'test@example.test' };
  const mailTransport = { sendMail: async (message) => messages.push(message) };
  const server = createApp({ config, pool, mailTransport }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  function client() {
    let cookie = '', csrf = '';
    async function request(path, method = 'GET', body) {
      const headers = {};
      if (cookie) headers.Cookie = cookie;
      if (body) headers['Content-Type'] = 'application/json';
      if (method !== 'GET') headers['X-CSRF-Token'] = csrf;
      const response = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
      const cookies = response.headers.getSetCookie();
      if (cookies.length) cookie = cookies[0].split(';')[0];
      return { status: response.status, data: await response.json() };
    }
    async function session() {
      const result = await request('/api/session');
      assert.equal(result.status, 200);
      csrf = result.data.csrfToken;
    }
    return { request, session };
  }
  const a = client(), b = client(), nonce = randomUUID();
  await a.session();
  let result = await a.request('/api/auth/register', 'POST', { name: 'Persona A', email: `a-${nonce}@example.test`, password: 'PruebaSegura123' });
  assert.equal(result.status, 201);
  const userId = result.data.user.id;
  await a.session();
  result = await a.request('/api/notes', 'POST', { title: 'Nota privada', content: 'Contenido confidencial' });
  assert.equal(result.status, 201);
  const noteId = result.data.note.id;
  await b.session();
  result = await b.request('/api/auth/register', 'POST', { name: 'Persona B', email: `b-${nonce}@example.test`, password: 'PruebaSegura456' });
  assert.equal(result.status, 201);
  await b.session();
  assert.equal((await b.request('/api/notes/' + noteId)).status, 404);
  assert.equal((await b.request('/api/notes/' + noteId, 'DELETE')).status, 404);
  assert.equal((await b.request('/api/admin/users')).status, 403);
  result = await a.request('/api/profile', 'PATCH', { name: 'Persona A', phone: '88881234' });
  assert.equal(result.status, 200);
  assert.ok(result.data.user.phoneMasked.endsWith('1234'));
  const user = (await pool.query('SELECT password_hash,phone_encrypted FROM users WHERE id=$1', [userId])).rows[0];
  const note = (await pool.query('SELECT content_encrypted FROM notes WHERE id=$1', [noteId])).rows[0];
  assert.ok(user.password_hash.startsWith('$argon2id$'));
  assert.ok(!user.phone_encrypted.includes('88881234'));
  assert.ok(!note.content_encrypted.includes('Contenido confidencial'));
  assert.equal((await a.request('/api/notes/' + noteId, 'PATCH', { title: 'Actualizada', content: 'Contenido nuevo' })).status, 200);
  assert.equal((await a.request('/api/notes/' + noteId, 'DELETE')).status, 200);
  assert.equal((await a.request('/api/auth/forgot-password', 'POST', { email: `a-${nonce}@example.test` })).status, 202);
  assert.equal(messages.length, 1);
  const token = new URL(messages[0].text.match(/https?:\/\/\S+/)[0]).searchParams.get('token');
  const storedTokens = await pool.query('SELECT token_hash FROM reset_tokens WHERE user_id=$1', [userId]);
  assert.equal(storedTokens.rows.length, 1);
  assert.notEqual(storedTokens.rows[0].token_hash, token);
  assert.equal((await a.request('/api/auth/reset-password', 'POST', { token, password: 'OtraClaveSegura123' })).status, 200);
  await a.session();
  assert.equal((await a.request('/api/auth/reset-password', 'POST', { token, password: 'OtraClaveSegura123' })).status, 400);
  await a.session();
  assert.equal((await a.request('/api/auth/login', 'POST', { email: `a-${nonce}@example.test`, password: 'OtraClaveSegura123' })).status, 200);
  await a.session();
  assert.equal((await a.request('/api/auth/logout', 'POST', {})).status, 200);
  assert.equal((await a.request('/api/notes')).status, 401);
  await a.session();
  for (let i = 0; i < 4; i += 1) {
    assert.equal((await a.request('/api/auth/login', 'POST', { email: `a-${nonce}@example.test`, password: 'ClaveIncorrecta1' })).status, 401);
  }
  assert.equal((await a.request('/api/auth/login', 'POST', { email: `a-${nonce}@example.test`, password: 'ClaveIncorrecta1' })).status, 429);
});
