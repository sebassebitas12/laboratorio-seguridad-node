const { randomBytes, randomUUID } = require('node:crypto');
const argon2 = require('argon2');
const { z } = require('zod');
const { encrypt, decrypt, tokenHash } = require('./crypto');

const password = z.string().min(12).max(128).refine((value) => /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value));
const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const name = z.string().trim().min(2).max(80).refine((value) => !/[<>]/.test(value));
const authOptions = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };
const noteSchema = z.object({ title: z.string().trim().min(1).max(120), content: z.string().trim().min(1).max(10000) }).strict();
function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) { const error = new Error('Entrada inválida'); error.status = 400; throw error; }
  return result.data;
}

function installRoutes(app, { config, pool, mailTransport }) {
  const event = async (type, actorId = null) => {
    await pool.query('INSERT INTO security_events(event, actor_id) VALUES($1,$2)', [type, actorId]);
    console.log(JSON.stringify({ event: type, actorId, timestamp: new Date().toISOString() }));
  };
  const publicUser = (row) => {
    let phoneMasked = null;
    if (row.phone_encrypted) {
      const value = decrypt(config.dataKey, row.phone_encrypted, `user:${row.id}:phone`);
      phoneMasked = `${'*'.repeat(Math.max(4, value.length - 4))}${value.slice(-4)}`;
    }
    return { id: row.id, name: row.name, email: row.email, role: row.role, phoneMasked };
  };
  const getUser = async (req) => {
    if (!req.session.userId) return null;
    const result = await pool.query('SELECT * FROM users WHERE id=$1', [req.session.userId]);
    return result.rows[0] || null;
  };
  const requireUser = async (req, res, next) => {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Iniciá sesión para continuar.' });
    req.user = user; return next();
  };
  const requireAdmin = async (req, res, next) => {
    if (req.user.role !== 'admin') { await event('access_denied', req.user.id); return res.status(403).json({ error: 'No tenés permiso para realizar esta acción.' }); }
    return next();
  };
  const regenerate = (req) => new Promise((resolve, reject) => req.session.regenerate((err) => err ? reject(err) : resolve()));
  const save = (req) => new Promise((resolve, reject) => req.session.save((err) => err ? reject(err) : resolve()));
  const serializeNote = (row) => ({ id: row.id, title: decrypt(config.dataKey, row.title_encrypted, `note:${row.id}:title`), content: decrypt(config.dataKey, row.content_encrypted, `note:${row.id}:content`), createdAt: row.created_at, updatedAt: row.updated_at });

  app.get('/api/session', async (req, res) => {
    if (!req.session.csrf) req.session.csrf = randomBytes(32).toString('hex');
    const user = await getUser(req);
    res.json({ user: user ? publicUser(user) : null, csrfToken: req.session.csrf });
  });
  app.post('/api/auth/register', async (req, res) => {
    const data = parse(z.object({ name, email, password }).strict(), req.body);
    const hash = await argon2.hash(data.password, authOptions); const id = randomUUID();
    try {
      await pool.query('INSERT INTO users(id,name,email,password_hash) VALUES($1,$2,$3,$4)', [id, data.name, data.email, hash]);
      const result = await pool.query('SELECT * FROM users WHERE id=$1', [id]);
      await event('register', id); await regenerate(req); req.session.userId = id; await save(req);
      return res.status(201).json({ user: publicUser(result.rows[0]) });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'No se pudo crear la cuenta con esos datos.' });
      throw err;
    }
  });
  let dummyHash;
  app.post('/api/auth/login', async (req, res) => {
    const data = parse(z.object({ email, password: z.string().min(1).max(128) }).strict(), req.body);
    const identifierHash = tokenHash(data.email);
    const attempt = await pool.query('SELECT failures, blocked_until FROM login_attempts WHERE identifier_hash=$1', [identifierHash]);
    if (attempt.rows[0]?.blocked_until && new Date(attempt.rows[0].blocked_until) > new Date()) return res.status(429).json({ error: 'Demasiados intentos. Intentá más tarde.' });
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [data.email]); const user = result.rows[0];
    if (!dummyHash) dummyHash = await argon2.hash(randomBytes(32).toString('hex'), authOptions);
    const valid = await argon2.verify(user?.password_hash || dummyHash, data.password);
    if (!user || !valid) {
      await pool.query(`INSERT INTO login_attempts(identifier_hash,failures) VALUES($1,1)
        ON DUPLICATE KEY UPDATE blocked_until=CASE WHEN failures+1 >= 5
        THEN DATE_ADD(UTC_TIMESTAMP(), INTERVAL LEAST(900, POW(2, LEAST(failures+1-5, 5))*30) SECOND)
        ELSE NULL END, failures=failures+1, updated_at=UTC_TIMESTAMP()`, [identifierHash]);
      const updated = await pool.query('SELECT failures FROM login_attempts WHERE identifier_hash=$1', [identifierHash]);
      await event('login_failed', user?.id || null);
      if (updated.rows[0].failures === 5) await event('login_failure_alert', user?.id || null);
      return res.status(updated.rows[0].failures >= 5 ? 429 : 401).json({ error: updated.rows[0].failures >= 5 ? 'Demasiados intentos. Intentá más tarde.' : 'Correo o contraseña incorrectos.' });
    }
    await pool.query('DELETE FROM login_attempts WHERE identifier_hash=$1', [identifierHash]);
    await regenerate(req); req.session.userId = user.id; await save(req); await event('login_success', user.id);
    return res.json({ user: publicUser(user) });
  });
  app.post('/api/auth/logout', async (req, res) => {
    const actor = req.session.userId;
    await new Promise((resolve, reject) => req.session.destroy((err) => err ? reject(err) : resolve()));
    res.clearCookie('lab.sid', { httpOnly: true, secure: config.production, sameSite: 'lax' });
    if (actor) await event('logout', actor);
    res.json({ message: 'Sesión cerrada.' });
  });
  app.post('/api/auth/forgot-password', async (req, res) => {
    const data = parse(z.object({ email }).strict(), req.body);
    if (!mailTransport || !config.smtp) return res.status(503).json({ error: 'La recuperación no está disponible en este momento.' });
    const result = await pool.query('SELECT id,email FROM users WHERE email=$1', [data.email]);
    if (result.rows[0]) {
      const user = result.rows[0]; const token = randomBytes(32).toString('hex');
      await pool.query('DELETE FROM reset_tokens WHERE user_id=$1', [user.id]);
      await pool.query('INSERT INTO reset_tokens(token_hash,user_id,expires_at) VALUES($1,$2,DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE))', [tokenHash(token), user.id]);
      const link = new URL('/reset', config.baseUrl); link.searchParams.set('token', token);
      try {
        await mailTransport.sendMail({ from: config.smtp.from, to: user.email, subject: 'Recuperación de acceso', text: `Abrí este enlace para cambiar tu contraseña. Vence en 30 minutos y solo puede usarse una vez.\n${link}` });
        await event('password_reset_requested', user.id);
      } catch { await event('password_reset_delivery_failed'); }
    }
    res.status(202).json({ message: 'Si la cuenta existe, recibirás instrucciones para recuperar el acceso.' });
  });
  app.post('/api/auth/reset-password', async (req, res) => {
    const data = parse(z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), password }).strict(), req.body);
    const newHash = await argon2.hash(data.password, authOptions); const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query('SELECT user_id FROM reset_tokens WHERE token_hash=$1 AND expires_at>UTC_TIMESTAMP() FOR UPDATE', [tokenHash(data.token)]);
      if (!result.rows[0]) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'El enlace es inválido o ha vencido.' }); }
      const id = result.rows[0].user_id;
      await client.query('DELETE FROM reset_tokens WHERE token_hash=$1', [tokenHash(data.token)]);
      await client.query('UPDATE users SET password_hash=$1 WHERE id=$2', [newHash, id]);
      await client.query('DELETE FROM reset_tokens WHERE user_id=$1', [id]);
      await client.query("DELETE FROM user_sessions WHERE JSON_UNQUOTE(JSON_EXTRACT(sess, '$.userId')) = $1", [id]);
      await client.query('COMMIT'); await event('password_reset_completed', id);
      res.json({ message: 'Contraseña actualizada. Iniciá sesión de nuevo.' });
    } catch (err) { await client.query('ROLLBACK'); throw err; } finally { client.release(); }
  });
  app.patch('/api/profile', requireUser, async (req, res) => {
    const data = parse(z.object({ name, phone: z.string().trim().max(30).regex(/^[+0-9 ()-]*$/) }).strict(), req.body);
    const encrypted = data.phone ? encrypt(config.dataKey, data.phone, `user:${req.user.id}:phone`) : req.user.phone_encrypted;
    await pool.query('UPDATE users SET name=$1,phone_encrypted=$2 WHERE id=$3', [data.name, encrypted, req.user.id]);
    const result = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    res.json({ user: publicUser(result.rows[0]) });
  });
  app.get('/api/notes', requireUser, async (req, res) => {
    const result = await pool.query('SELECT * FROM notes WHERE owner_id=$1 ORDER BY updated_at DESC', [req.user.id]);
    res.json({ notes: result.rows.map(serializeNote) });
  });
  app.get('/api/notes/:id', requireUser, async (req, res) => {
    const id = parse(z.string().uuid(), req.params.id);
    const result = await pool.query('SELECT * FROM notes WHERE id=$1 AND owner_id=$2', [id, req.user.id]);
    if (!result.rowCount) { await event('access_denied', req.user.id); return res.status(404).json({ error: 'Nota no encontrada.' }); }
    return res.json({ note: serializeNote(result.rows[0]) });
  });
  app.post('/api/notes', requireUser, async (req, res) => {
    const data = parse(noteSchema, req.body); const id = randomUUID();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [req.user.id]);
      const count = await client.query('SELECT COUNT(*) AS total FROM notes WHERE owner_id=$1', [req.user.id]);
      if (Number(count.rows[0].total) >= 100) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Alcanzaste el límite de 100 notas.' }); }
      await client.query('INSERT INTO notes(id,owner_id,title_encrypted,content_encrypted) VALUES($1,$2,$3,$4)',
        [id, req.user.id, encrypt(config.dataKey, data.title, `note:${id}:title`), encrypt(config.dataKey, data.content, `note:${id}:content`)]);
      const result = await client.query('SELECT * FROM notes WHERE id=$1 AND owner_id=$2', [id, req.user.id]);
      await client.query('COMMIT'); return res.status(201).json({ note: serializeNote(result.rows[0]) });
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  });
  app.patch('/api/notes/:id', requireUser, async (req, res) => {
    const id = parse(z.string().uuid(), req.params.id); const data = parse(noteSchema, req.body);
    const result = await pool.query('UPDATE notes SET title_encrypted=$1,content_encrypted=$2,updated_at=UTC_TIMESTAMP(3) WHERE id=$3 AND owner_id=$4', [encrypt(config.dataKey, data.title, `note:${id}:title`), encrypt(config.dataKey, data.content, `note:${id}:content`), id, req.user.id]);
    if (!result.rowCount) { await event('access_denied', req.user.id); return res.status(404).json({ error: 'Nota no encontrada.' }); }
    const updated = await pool.query('SELECT * FROM notes WHERE id=$1 AND owner_id=$2', [id, req.user.id]);
    return res.json({ note: serializeNote(updated.rows[0]) });
  });
  app.delete('/api/notes/:id', requireUser, async (req, res) => {
    const id = parse(z.string().uuid(), req.params.id);
    const result = await pool.query('DELETE FROM notes WHERE id=$1 AND owner_id=$2', [id, req.user.id]);
    if (!result.rowCount) { await event('access_denied', req.user.id); return res.status(404).json({ error: 'Nota no encontrada.' }); }
    return res.json({ message: 'Nota eliminada.' });
  });
  app.get('/api/admin/users', requireUser, requireAdmin, async (req, res) => {
    const result = await pool.query('SELECT id,name,email,role,created_at FROM users ORDER BY created_at DESC LIMIT 500');
    res.json({ users: result.rows.map((row) => ({ id: row.id, name: row.name, email: row.email, role: row.role, createdAt: row.created_at })) });
  });
  app.get('/api/admin/events', requireUser, requireAdmin, async (req, res) => {
    const result = await pool.query('SELECT e.id,e.event,e.created_at,u.name AS actor_name FROM security_events e LEFT JOIN users u ON u.id=e.actor_id ORDER BY e.created_at DESC LIMIT 200');
    res.json({ events: result.rows.map((row) => ({ id: row.id, event: row.event, createdAt: row.created_at, actorName: row.actor_name })) });
  });
  app.patch('/api/admin/users/:id/role', requireUser, requireAdmin, async (req, res) => {
    const id = parse(z.string().uuid(), req.params.id); const { role } = parse(z.object({ role: z.enum(['user', 'admin']) }).strict(), req.body);
    if (id === req.user.id) return res.status(400).json({ error: 'No podés cambiar tu propio rol.' });
    const result = await pool.query('UPDATE users SET role=$1 WHERE id=$2', [role, id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Usuario no encontrado.' });
    await event('role_changed', req.user.id);
    const updated = await pool.query('SELECT * FROM users WHERE id=$1', [id]);
    return res.json({ user: publicUser(updated.rows[0]) });
  });
}

module.exports = { installRoutes };
