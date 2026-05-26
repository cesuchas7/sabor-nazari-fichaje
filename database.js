const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS workers (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      pin TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'worker',
      active INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS fichajes (
      id SERIAL PRIMARY KEY,
      worker_id INTEGER NOT NULL REFERENCES workers(id),
      fecha TEXT NOT NULL,
      entrada TEXT,
      inicio_descanso TEXT,
      fin_descanso TEXT,
      salida TEXT,
      editado BOOLEAN DEFAULT false
    );
  `);
  const { rows } = await pool.query("SELECT id FROM workers WHERE role='admin' LIMIT 1");
  if (!rows.length) {
    await pool.query("INSERT INTO workers (name,pin,role) VALUES ($1,$2,$3)", ['César','1234','admin']);
  }
}

const db = {
  init,
  getWorkers: async (onlyActive=false) => {
    const q = onlyActive
      ? "SELECT * FROM workers WHERE active=1 ORDER BY name"
      : "SELECT * FROM workers ORDER BY name";
    return (await pool.query(q)).rows;
  },
  getWorker: async (id) => (await pool.query("SELECT * FROM workers WHERE id=$1",[id])).rows[0]||null,
  addWorker: async (name,pin,role='worker') => (await pool.query("INSERT INTO workers(name,pin,role) VALUES($1,$2,$3) RETURNING *",[name,pin,role])).rows[0],
  updateWorker: async (id,changes) => {
    const fields = Object.keys(changes).map((k,i)=>`${k}=$${i+2}`).join(',');
    return (await pool.query(`UPDATE workers SET ${fields} WHERE id=$1 RETURNING *`,[id,...Object.values(changes)])).rows[0]||null;
  },
  getFichajeHoy: async (worker_id) => {
    const fecha = new Date().toISOString().split('T')[0];
    return (await pool.query("SELECT * FROM fichajes WHERE worker_id=$1 AND fecha=$2",[worker_id,fecha])).rows[0]||null;
  },
  addFichaje: async (worker_id,fecha,entrada) => (await pool.query("INSERT INTO fichajes(worker_id,fecha,entrada) VALUES($1,$2,$3) RETURNING *",[worker_id,fecha,entrada])).rows[0],
  updateFichaje: async (id,changes) => {
    const fields = Object.keys(changes).map((k,i)=>`${k}=$${i+2}`).join(',');
    return (await pool.query(`UPDATE fichajes SET ${fields} WHERE id=$1 RETURNING *`,[id,...Object.values(changes)])).rows[0]||null;
  },
  getFichajeById: async (id) => (await pool.query("SELECT * FROM fichajes WHERE id=$1",[id])).rows[0]||null,
  getFichajesPorFecha: async (fecha) => (await pool.query(`SELECT f.*,w.name AS worker_name FROM fichajes f JOIN workers w ON f.worker_id=w.id WHERE f.fecha=$1 ORDER BY w.name`,[fecha])).rows,
  getFichajesRango: async (desde,hasta) => (await pool.query(`SELECT f.*,w.name AS worker_name FROM fichajes f JOIN workers w ON f.worker_id=w.id WHERE f.fecha BETWEEN $1 AND $2 ORDER BY f.fecha,w.name`,[desde,hasta])).rows,
  getHistorialWorker: async (worker_id) => (await pool.query("SELECT * FROM fichajes WHERE worker_id=$1 ORDER BY fecha DESC LIMIT 60",[worker_id])).rows,
};

module.exports = db;
