const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndAddColumn() {
    // We can run an RPC or just try to select it.
    // If we just use the postgres pool directly, we can ALTER TABLE.
    const { Pool } = require('pg');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await pool.query('ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS additional_images JSONB DEFAULT \'[]\'::jsonb;');
        console.log('Column additional_images ensured in vehicles table.');
    } catch (e) {
        console.error('Error altering table:', e);
    } finally {
        await pool.end();
    }
}

checkAndAddColumn();
