const db = require('../db');

async function run() {
  const { rows } = await db.query('SELECT * FROM settings WHERE id = 1');
  console.log('Settings Row 1:', rows);
  process.exit(0);
}

run();
