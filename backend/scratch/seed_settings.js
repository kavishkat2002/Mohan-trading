const db = require('../db');

async function run() {
  console.log('[DB] Seeding settings table with current env values...');
  const token = process.env.WHATSAPP_TOKEN || '';
  const phoneId = process.env.PHONE_NUMBER_ID || '';
  
  await db.query(
    'UPDATE settings SET whatsapp_token = $1, whatsapp_phone_number_id = $2 WHERE id = 1',
    [token, phoneId]
  );
  console.log('[DB] Seeding complete.');
  process.exit(0);
}

run();
