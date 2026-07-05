const db = require('../db');

async function run() {
  console.log('[DB] Altering settings table...');
  try {
    await db.query(`
      ALTER TABLE settings 
      ADD COLUMN IF NOT EXISTS whatsapp_token TEXT,
      ADD COLUMN IF NOT EXISTS meta_app_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS meta_config_id VARCHAR(100);
    `);
    console.log('[DB] Columns added successfully!');
  } catch (err) {
    console.error('[DB] Migration failed:', err);
  }
  process.exit(0);
}

run();
