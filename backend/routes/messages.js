const express = require('express');
const router = express.Router();
const db = require('../db');

// Get messages for a lead
router.get('/lead/:leadId', async (req, res) => {
  const { leadId } = req.params;
  try {
    const { rows } = await db.query(
      'SELECT * FROM messages WHERE lead_id = $1 ORDER BY created_at ASC',
      [leadId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Post a message (mostly for internal sales notes or manual messages)
router.post('/', async (req, res) => {
  const { lead_id, sender, content } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO messages (lead_id, sender, content) VALUES ($1, $2, $3) RETURNING *',
      [lead_id, sender, content]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
