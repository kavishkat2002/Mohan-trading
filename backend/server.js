require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');

const leadsRouter = require('./routes/leads');
const usersRouter = require('./routes/users');
const messagesRouter = require('./routes/messages');
const webhookRouter = require('./routes/webhook');
const vehiclesRouter = require('./routes/vehicles');
const attendanceRouter = require('./routes/attendance');
const financeRouter = require('./routes/finance');
const noticesRouter = require('./routes/notices');
const tasksRouter = require('./routes/tasks');
const supabaseAdminRouter = require('./routes/supabaseAdmin');
const settingsRouter = require('./routes/settings');
const testDrivesRouter = require('./routes/test_drives');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
// Serve static image uploads
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const subscriptionRouter = require('./routes/subscription');

// Routes
app.use('/api/leads', leadsRouter);
app.use('/api/users', usersRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/webhook', webhookRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/finance', financeRouter);
app.use('/api/notices', noticesRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/admin', supabaseAdminRouter);
app.use('/api/subscription', subscriptionRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/test-drives', testDrivesRouter);

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  // Run DB schema migration and check connection
  runMigrations().then(() => {
    db.query('SELECT NOW()', (err, res) => {
      if (err) {
        console.error('Database connection error:', err.stack);
      } else {
        console.log('Connected to PostgreSQL at:', res.rows[0].now);
      }
    });
  });
});

async function runMigrations() {
  console.log('[Migration] Checking database schema...');
  try {
    await db.query(`
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS ai_bot_name VARCHAR(255) DEFAULT 'Alex';
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS ai_dealership_name VARCHAR(255) DEFAULT 'Mohan Trading';
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS ai_greeting_message TEXT DEFAULT 'Hi! I''m Alex from AutoDrive Motors 👋 Looking for your dream car? Tell me what you have in mind!';
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS ai_tone VARCHAR(255) DEFAULT 'Professional & warm';
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS ai_language VARCHAR(255) DEFAULT 'English';
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS ai_emoji_usage VARCHAR(255) DEFAULT 'Use emojis — feels friendly';
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS ai_ask_name_rule VARCHAR(255) DEFAULT '3rd message';
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS ai_ask_budget_rule VARCHAR(255) DEFAULT '3rd message';
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS ai_unanswered_limit VARCHAR(255) DEFAULT '1 follow-up then stop';
      ALTER TABLE settings ADD COLUMN IF NOT EXISTS ai_objections JSONB DEFAULT '[]'::jsonb;
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS ai_notes TEXT DEFAULT '';
    `);
    console.log('[Migration] Database schema migrated successfully.');
  } catch (error) {
    console.error('[Migration] Database migration error:', error);
  }
}
