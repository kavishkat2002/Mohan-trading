const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:Kavishka2002@db.nceyweiskamspdxfxnga.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    await client.connect();
    console.log("Connected to Supabase. Running migration...");
    await client.query(`
      ALTER TABLE public.test_drives ADD COLUMN IF NOT EXISTS source VARCHAR(50);
    `);
    console.log("Migration applied successfully!");
    
    // Also let's notify PostgREST to reload the schema cache!
    await client.query(`NOTIFY pgrst, 'reload schema'`);
    console.log("Schema cache reloaded.");
  } catch (err) {
    console.error("Migration failed:", err.message);
  } finally {
    await client.end();
  }
}
migrate();
