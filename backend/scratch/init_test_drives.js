const db = require('../db');

async function run() {
  console.log('[DB] Creating test_drives table...');
  await db.query(`
    CREATE TABLE IF NOT EXISTS test_drives (
      id SERIAL PRIMARY KEY,
      lead_id INT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
      vehicle_id INT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
      booking_date TIMESTAMP NOT NULL,
      status VARCHAR(50) DEFAULT 'Scheduled', -- 'Scheduled', 'Completed', 'Cancelled'
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('✅ Table test_drives created successfully.');
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Failed to create table:', err);
  process.exit(1);
});
