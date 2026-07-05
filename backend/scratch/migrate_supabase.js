const { Client } = require('pg');
require('dotenv').config({ path: '../.env' });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is missing in environment.");
  process.exit(1);
}

console.log("Connecting to remote Supabase database...");
const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    await client.connect();
    console.log("Connected successfully. Running migration...");
    await client.query(`
      ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS whatsapp_main_media_id text DEFAULT ''::text;
      ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS whatsapp_additional_media_ids jsonb DEFAULT '[]'::jsonb;
    `);
    console.log("Migration applied successfully!");
  } catch (err) {
    console.error("Migration failed:", err.message);
  } finally {
    await client.end();
  }
}

migrate();
