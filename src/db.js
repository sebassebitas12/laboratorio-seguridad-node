const mysql = require('mysql2/promise');

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
  const tables = [
    `CREATE TABLE IF NOT EXISTS users (
      id CHAR(36) PRIMARY KEY, email VARCHAR(254) NOT NULL UNIQUE,
      name VARCHAR(80) NOT NULL, password_hash VARCHAR(255) NOT NULL,
      role ENUM('user','admin') NOT NULL DEFAULT 'user', phone_encrypted TEXT,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS notes (
      id CHAR(36) PRIMARY KEY, owner_id CHAR(36) NOT NULL,
      title_encrypted TEXT NOT NULL, content_encrypted MEDIUMTEXT NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX notes_owner (owner_id), FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS reset_tokens (
      token_hash CHAR(64) PRIMARY KEY, user_id CHAR(36) NOT NULL,
      expires_at DATETIME(3) NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS security_events (
      id BIGINT AUTO_INCREMENT PRIMARY KEY, event VARCHAR(100) NOT NULL, actor_id CHAR(36),
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS login_attempts (
      identifier_hash CHAR(64) PRIMARY KEY, failures INT NOT NULL DEFAULT 0,
      blocked_until DATETIME(3), updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS user_sessions (
      sid VARCHAR(128) PRIMARY KEY, sess JSON NOT NULL, expire DATETIME(3) NOT NULL,
      INDEX sessions_expire (expire)
    ) ENGINE=InnoDB`,
  ];
  for (const statement of tables) await pool.query(statement);
}

module.exports = { createPool, migrate };
