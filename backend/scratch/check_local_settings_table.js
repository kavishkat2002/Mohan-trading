const db = require('/Users/kavishkathilakarathna/Desktop/Company/CreativeX Technology/Mohan Traders CRM/Mohan-trading/backend/db');

async function run() {
  try {
    const res = await db.query('SELECT * FROM settings WHERE id = 1');
    console.log('--- LOCAL SETTINGS TABLE ---');
    console.log(res.rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

run();
