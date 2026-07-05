const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: 'postgresql://postgres:MohanTrading2024!@db.nceyweiskamspdxfxnga.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to Supabase DB");
    await client.query("ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS additional_images jsonb DEFAULT '[]'::jsonb;");
    console.log("Added additional_images column successfully");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
