const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

let dbConfig;
if (process.env.DATABASE_URL) {
  dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, // Required for Supabase
    connectionTimeoutMillis: 5000,
  };
} else {
  dbConfig = {
    user: process.env.DB_USER || 'kavishkathilakarathna',
    host: process.env.DB_HOST || '/tmp',
    database: process.env.DB_NAME || 'crm_db',
    password: process.env.DB_PASSWORD || undefined,
    port: parseInt(process.env.DB_PORT) || 5432,
    connectionTimeoutMillis: 5000,
  };
}

console.log('[DB] Connecting with:', { ...dbConfig, password: '***' });

const pool = new Pool(dbConfig);

pool.on('error', (err) => {
  console.error('[DB] Pool error:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
