const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key in backend/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Force connect to local database for reading
const localPool = new Pool({
  user: process.env.DB_USER || 'kavishkathilakarathna',
  host: process.env.DB_HOST || '/tmp',
  database: process.env.DB_NAME || 'crm_db',
  password: process.env.DB_PASSWORD || undefined,
  port: parseInt(process.env.DB_PORT) || 5432,
  connectionTimeoutMillis: 5000,
});

const tablesToMigrate = [
  'users',
  'settings',
  'vehicles',
  'leads',
  'messages',
  'test_drives',
  'attendance',
  'tasks',
  'notices'
];

async function migrateData() {
  console.log('Starting data migration from Local to Supabase...');
  
  for (const table of tablesToMigrate) {
    try {
      console.log(`\nMigrating table: ${table}...`);
      
      const { rows } = await localPool.query(`SELECT * FROM ${table}`);
      console.log(`Found ${rows.length} rows in local ${table}.`);
      
      if (rows.length === 0) continue;

      // Insert data in chunks using upsert to avoid duplicate key errors
      const chunkSize = 100;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await supabase.from(table).upsert(chunk);
        
        if (error) {
          console.error(`Failed to upsert chunk for ${table}:`, error.message);
        } else {
          console.log(`Upserted ${chunk.length} rows into ${table}...`);
        }
      }
    } catch (err) {
      console.error(`Error migrating table ${table}:`, err.message);
    }
  }

  console.log('\nMigration complete! Your local data has been copied to Supabase.');
  process.exit(0);
}

migrateData().catch(console.error);
