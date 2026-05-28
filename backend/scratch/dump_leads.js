const db = require('../db');

async function run() {
  const { rows } = await db.query('SELECT * FROM leads ORDER BY id DESC');
  console.log('All Leads:', rows);
  process.exit(0);
}

run();
