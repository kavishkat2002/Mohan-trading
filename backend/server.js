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
const { initFollowUpCron } = require('./services/followUpCron');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Restrict CORS origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    // Allow exact matches, localhost/127.0.0.1/private network IPs on any port, or subdomain templates
    if (
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:') ||
      origin.startsWith('http://192.168.') ||
      origin.startsWith('http://10.') ||
      origin.startsWith('http://172.') ||
      allowedOrigins.includes(origin) || 
      origin.endsWith('.vercel.app') || 
      origin.endsWith('.netlify.app')
    ) {
      return callback(null, true);
    }
    console.log(`[CORS Reject] Origin is: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json());

// HTTP Request Logger Middleware for diagnostics
app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.url}`);
  next();
});

// Serve static image uploads
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiter for user login to prevent brute force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many login attempts from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/users/login', loginLimiter);

// Global JWT Auth Middleware
app.use('/api', authMiddleware);

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
        // Start background jobs
        initFollowUpCron();
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
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS whatsapp_main_media_id VARCHAR(255) DEFAULT '';
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS whatsapp_additional_media_ids JSONB DEFAULT '[]'::jsonb;
    `);
    console.log('[Migration] Database schema migrated successfully.');
  } catch (error) {
    console.error('[Migration] Database migration error:', error);
  }
}
