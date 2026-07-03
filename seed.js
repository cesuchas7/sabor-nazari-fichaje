const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:FBXvhkrDRbOLzeEGmNgrKaDhMCerZVck@yamabiko.proxy.rlwy.net:32234/railway',
  ssl: { rejectUnauthorized: false }
});

const festivos = new Set([
  '2025-10-12','2025-10-22','2025-11-01','2025-12-06','2025-12-08','2025-12-25',
  '2026-01-01','2026-01-06','2026-02-28','2026-04-02','2026-04-03','2026-04-06',
  '2026-05-01','2026-05-25'
]);

function esLaboral(fecha) {
  const dia = fecha.getUTCDay();
  const str = fecha.toISOString().split('T')[0];
  return dia !== 0 && dia !== 6 && !festivos.has(str);
}

function offsetEspana(fecha) {
  if (fecha < new Date('2025-10-26T01:00:00Z')) return 2;
  if (fecha < new Date('2026-03-29T01:00:00Z')) return 1;
  return 2;
}

function ts(fechaStr, h, m) {
  while (m >= 60) { h++; m -= 60; }
  while (m < 0)  { h--; m += 60; }
  const d = new Date(fechaStr + 'T00:00:00Z');
  d.setUTCHours(h - offsetEspana(d), m, Math.floor(Math.random()*59), 0);
  return d.toISOString();
}

function r(base, min, max) {
  return base + Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  const { rows: workers } = await pool.query("SELECT id, name FROM workers WHERE role != 'admin' OR name = 'César' ORDER BY id");
  console.log('Workers:', workers.map(w => `${w.id}:${w.name}`).join(', '));

  const cesar = workers.find(w => w.name === 'César');
  const zineb = workers.find(w => w.name.toLowerCase().includes('zineb'));

  if (!cesar || !zineb) {
    console.error('No se encontraron los trabajadores. Workers:', workers);
    process.exit(1);
  }

  // Borrar período completo y reinsertar
  await pool.query("DELETE FROM fichajes WHERE fecha >= '2025-10-01' AND fecha <= '2026-06-01'");
  console.log('Registros anteriores eliminados.');

  const inicio = new Date('2025-10-01T00:00:00Z');
  const fin    = new Date('2026-06-01T00:00:00Z');
  let actual = new Date(inicio);
  let total = 0;

  while (actual <= fin) {
    const fechaStr = actual.toISOString().split('T')[0];

    if (esLaboral(actual)) {
      // César: entrada ~6:59, descanso ~10:00-10:30, salida ~15:00
      await pool.query(
        "INSERT INTO fichajes (worker_id,fecha,entrada,inicio_descanso,fin_descanso,salida,editado) VALUES ($1,$2,$3,$4,$5,$6,false)",
        [cesar.id, fechaStr,
          ts(fechaStr, 6, r(59,0,10)),
          ts(fechaStr, 10, r(0,-4,6)),
          ts(fechaStr, 10, r(30,-3,7)),
          ts(fechaStr, 15, r(0,-5,13))
        ]
      );

      // Zineb: entrada ~7:30, descanso ~11:00-11:30, salida ~15:00
      await pool.query(
        "INSERT INTO fichajes (worker_id,fecha,entrada,inicio_descanso,fin_descanso,salida,editado) VALUES ($1,$2,$3,$4,$5,$6,false)",
        [zineb.id, fechaStr,
          ts(fechaStr, 7, r(30,-2,8)),
          ts(fechaStr, 11, r(0,-4,6)),
          ts(fechaStr, 11, r(30,-3,7)),
          ts(fechaStr, 15, r(0,-5,13))
        ]
      );

      total++;
      if (total % 20 === 0) console.log(`${total} días... (${fechaStr})`);
    }

    actual.setUTCDate(actual.getUTCDate() + 1);
  }

  console.log(`\n✓ ${total} días laborales, ${total*2} registros insertados.`);
  await pool.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
