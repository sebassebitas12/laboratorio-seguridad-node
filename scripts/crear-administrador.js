const { loadConfig } = require('../src/config');
const { createPool } = require('../src/db');

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error('Indicá el correo de una cuenta ya registrada');
  const pool = createPool(loadConfig());
  try {
    const user = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (!user.rowCount) throw new Error('La cuenta no existe');
    await pool.query("UPDATE users SET role='admin' WHERE id=$1", [user.rows[0].id]);
    await pool.query("INSERT INTO security_events(event,actor_id) VALUES('admin_provisioned',$1)", [user.rows[0].id]);
    console.log('La cuenta ahora tiene permisos de administración.');
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
