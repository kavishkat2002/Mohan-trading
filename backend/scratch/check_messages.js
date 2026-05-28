const db = require('../db');

async function run() {
  const { rows } = await db.query('SELECT * FROM messages ORDER BY id DESC LIMIT 10');
  console.log('Last 10 messages:', rows);
  process.exit(0);
}

run();
