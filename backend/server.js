require('dotenv').config();
const express = require('express');
const cors = require('cors');

const leadsRouter = require('./routes/leads');
const usersRouter = require('./routes/users');
const messagesRouter = require('./routes/messages');
const webhookRouter = require('./routes/webhook');
const vehiclesRouter = require('./routes/vehicles');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
// Serve static image uploads
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/leads', leadsRouter);
app.use('/api/users', usersRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/webhook', webhookRouter);
app.use('/api/vehicles', vehiclesRouter);

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  // Check DB connection
  db.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Database connection error:', err.stack);
    } else {
      console.log('Connected to PostgreSQL at:', res.rows[0].now);
    }
  });
});
