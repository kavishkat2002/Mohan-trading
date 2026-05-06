const express = require('express');
const router = express.Router();
const db = require('../db');

// Initialize table if not exists
const initDb = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS tenant_subscription (
      id SERIAL PRIMARY KEY,
      status VARCHAR(50) DEFAULT 'Active',
      expires_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '30 days',
      plan_type VARCHAR(50) DEFAULT 'Starter',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Ensure exactly one row
  const { rows } = await db.query('SELECT id FROM tenant_subscription LIMIT 1');
  if (rows.length === 0) {
    await db.query('INSERT INTO tenant_subscription (status) VALUES ($1)', ['Active']);
  }
};

initDb().catch(console.error);

// Get current subscription
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM tenant_subscription LIMIT 1');
    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin ONLY: Update subscription
router.post('/renew', async (req, res) => {
  const { days, status, expires_at } = req.body;
  try {
    let query, params;
    if (expires_at) {
      // Set a specific custom expiry date
      query = `UPDATE tenant_subscription SET expires_at = $1, status = $2 WHERE id = 1 RETURNING *`;
      params = [expires_at, status || 'Active'];
    } else {
      // Default: add N days from now
      query = `UPDATE tenant_subscription SET expires_at = CURRENT_TIMESTAMP + ($1 || ' days')::INTERVAL, status = $2 WHERE id = 1 RETURNING *`;
      params = [days || 30, status || 'Active'];
    }
    const { rows } = await db.query(query, params);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin ONLY: Suspend
router.post('/suspend', async (req, res) => {
  try {
    const { rows } = await db.query(`
      UPDATE tenant_subscription 
      SET status = 'Suspended' 
      WHERE id = 1 RETURNING *
    `);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
