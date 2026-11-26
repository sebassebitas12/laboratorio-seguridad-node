const path = require('node:path');
const { timingSafeEqual } = require('node:crypto');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const nodemailer = require('nodemailer');
const { loadConfig } = require('./config');
const { createPool, migrate } = require('./db');
const { installRoutes } = require('./routes');

function createApp({ config, pool, mailTransport }) {
  const app = express();
  class MySQLSessionStore extends session.Store {
    get(sid, callback) {
      pool.query('SELECT sess FROM user_sessions WHERE sid=$1 AND expire>UTC_TIMESTAMP(3)', [sid])
        .then(({ rows }) => callback(null, rows.length ? (typeof rows[0].sess === 'string' ? JSON.parse(rows[0].sess) : rows[0].sess) : null))
        .catch(callback);
    }
    set(sid, value, callback = () => {}) {
      const expires = new Date(value.cookie.expires || Date.now() + 8 * 60 * 60 * 1000);
      pool.query('INSERT INTO user_sessions(sid,sess,expire) VALUES($1,$2,$3) ON DUPLICATE KEY UPDATE sess=VALUES(sess),expire=VALUES(expire)', [sid, JSON.stringify(value), expires])
        .then(() => callback()).catch(callback);
    }
    destroy(sid, callback = () => {}) {
      pool.query('DELETE FROM user_sessions WHERE sid=$1', [sid]).then(() => callback()).catch(callback);
    }
    touch(sid, value, callback = () => {}) {
      const expires = new Date(value.cookie.expires || Date.now() + 8 * 60 * 60 * 1000);
      pool.query('UPDATE user_sessions SET expire=$1 WHERE sid=$2', [expires, sid]).then(() => callback()).catch(callback);
    }
  }
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);
  app.use(helmet({ referrerPolicy: { policy: 'no-referrer' }, contentSecurityPolicy: {
    directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"], imgSrc: ["'self'", 'data:'], connectSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'self'"], formAction: ["'self'"] },
  } }));
  app.use(express.json({ limit: '20kb' }));
  app.use(session({ name: 'lab.sid', secret: config.sessionSecret, resave: false, saveUninitialized: false,
    store: new MySQLSessionStore(),
    cookie: { httpOnly: true, secure: config.production, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 } }));
  app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use('/api', (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const actual = Buffer.from(req.get('X-CSRF-Token') || '');
    const expected = Buffer.from(req.session.csrf || '');
    if (!expected.length || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      return res.status(403).json({ error: 'La sesión de seguridad venció. Actualizá la página.' });
    }
    return next();
  });
  app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes. Intentá más tarde.' } }));
  app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false,
    message: { error: 'Demasiados intentos. Intentá más tarde.' } }));
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  installRoutes(app, { config, pool, mailTransport });
  app.use(express.static(path.join(__dirname, '..', 'public'), { index: 'index.html' }));
  app.get('/reset', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'index.html')));
  app.use((req, res) => res.status(404).json({ error: 'No encontrado.' }));
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    const status = err.status === 400 || err.status === 413 ? err.status : 500;
    if (status === 500) console.error(JSON.stringify({ event: 'internal_error', timestamp: new Date().toISOString(), code: err.code || 'UNKNOWN' }));
    res.status(status).json({ error: status === 500 ? 'Ocurrió un error. Intentá más tarde.' : 'Revisá los datos ingresados.' });
  });
  return app;
}

async function start() {
  const config = loadConfig();
  const pool = createPool(config);
  await migrate(pool);
  const transport = config.smtp ? nodemailer.createTransport({ ...config.smtp, connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000 }) : null;
  const app = createApp({ config, pool, mailTransport: transport });
  const server = app.listen(config.port, '0.0.0.0', () => console.log(JSON.stringify({ event: 'server_started', port: config.port })));
  const shutdown = () => server.close(() => pool.end().finally(() => process.exit(0)));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  process.on('unhandledRejection', (error) => { console.error(JSON.stringify({ event: 'unhandled_rejection', code: error?.code || 'UNKNOWN' })); server.close(() => pool.end().finally(() => process.exit(1))); });
}

if (require.main === module) start().catch((error) => { console.error(JSON.stringify({ event: 'startup_failed', message: error.message })); process.exit(1); });
module.exports = { createApp, start };
