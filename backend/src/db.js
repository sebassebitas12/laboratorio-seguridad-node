const mysql = require('mysql2/promise');
const fs = require('node:fs');
const path = require('node:path');

function createPool(config) {
  const url = new URL(config.databaseUrl);
  if (!['mysql:', 'mysql2:'].includes(url.protocol)) throw new Error('DATABASE_URL debe ser una URL de MySQL');
  const raw = mysql.createPool({
    host: url.hostname, port: Number(url.port || 3306),
    user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    ssl: config.ssl ? { rejectUnauthorized: true } : undefined,
    waitForConnections: true, connectionLimit: 10, connectTimeout: 5000, timezone: 'Z',
  });
  const query = async (connection, sql, params = []) => {
    const values = [];
    const statement = sql.replace(/\$(\d+)/g, (_, number) => {
      values.push(params[Number(number) - 1]);
      return '?';
    });
    const method = /^(BEGIN|COMMIT|ROLLBACK)$/i.test(statement.trim()) ? 'query' : 'execute';
    const [result] = await connection[method]({ sql: statement, timeout: 5000 }, values);
    return Array.isArray(result)
      ? { rows: result, rowCount: result.length }
      : { rows: [], rowCount: result.affectedRows || 0 };
  };
  return {
    query: (sql, params) => query(raw, sql, params),
    connect: async () => {
      const connection = await raw.getConnection();
      return { query: (sql, params) => query(connection, sql, params), release: () => connection.release() };
    },
    end: () => raw.end(),
  };
}

async function migrate(pool) {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(190) PRIMARY KEY,
    applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

  const migrationDirectory = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationDirectory)
    .filter((file) => /^\d+_[a-z0-9_-]+\.sql$/i.test(file))
    .sort();

  for (const file of files) {
    const applied = await pool.query('SELECT version FROM schema_migrations WHERE version=$1', [file]);
    if (applied.rowCount) continue;

    const sql = fs.readFileSync(path.join(migrationDirectory, file), 'utf8');
    const statements = sql.split(';').map((statement) => statement.trim()).filter(Boolean);
    const connection = await pool.connect();
    try {
      await connection.query('BEGIN');
      for (const statement of statements) await connection.query(statement);
      await connection.query('INSERT INTO schema_migrations(version) VALUES($1)', [file]);
      await connection.query('COMMIT');
      console.log(JSON.stringify({ event: 'database_migration_applied', version: file }));
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = { createPool, migrate };
