const db = require('../db');

async function run() {
  const { rows } = await db.query('SELECT id, name, phone, interested_car FROM leads ORDER BY id DESC LIMIT 5');
  console.log('Last 5 Leads:', rows);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
