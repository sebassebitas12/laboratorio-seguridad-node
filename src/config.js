require('dotenv').config({ quiet: true });

function loadConfig(env = process.env) {
  const production = env.NODE_ENV === 'production';
  const required = (key) => {
    if (!env[key]) throw new Error(`Falta la variable ${key}`);
    return env[key];
  };
  const databaseUrl = required('DATABASE_URL');
  const sessionSecret = required('SESSION_SECRET');
  if (sessionSecret.length < 32) throw new Error('SESSION_SECRET debe tener al menos 32 caracteres');
  const encodedKey = required('DATA_ENCRYPTION_KEY');
  const dataKey = Buffer.from(encodedKey, 'base64');
  if (dataKey.length !== 32 || dataKey.toString('base64') !== encodedKey) {
    throw new Error('DATA_ENCRYPTION_KEY debe ser una llave de 32 bytes en base64');
  }
  const host = new URL(databaseUrl).hostname;
  const ssl = env.DATABASE_SSL === 'true';
  if (production && !ssl && !host.endsWith('.railway.internal')) {
    throw new Error('En producción, la base de datos externa requiere DATABASE_SSL=true');
  }
  if (production && !env.APP_BASE_URL) throw new Error('Falta la variable APP_BASE_URL');
  if (production && env.APP_BASE_URL && new URL(env.APP_BASE_URL).protocol !== 'https:') {
    throw new Error('APP_BASE_URL debe usar HTTPS en producción');
  }
  return {
    production, databaseUrl, sessionSecret, dataKey, ssl,
    port: Number(env.PORT) || 3000,
    baseUrl: env.APP_BASE_URL || 'http://localhost:3000',
    trustProxy: env.TRUST_PROXY === '1' ? 1 : false,
    smtp: env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD && env.MAIL_FROM ? {
      host: env.SMTP_HOST, port: Number(env.SMTP_PORT || 587),
      secure: env.SMTP_SECURE === 'true', requireTLS: env.SMTP_SECURE !== 'true',
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }, from: env.MAIL_FROM,
    } : null,
  };
}

module.exports = { loadConfig };
