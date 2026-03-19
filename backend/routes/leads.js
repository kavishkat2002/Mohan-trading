const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all leads
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM leads ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new lead
router.post('/', async (req, res) => {
  const { name, phone, interested_car, budget, status } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO leads (name, phone, interested_car, budget, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, phone, interested_car, budget, status || 'New']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update lead status/notes
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE leads 
       SET status = COALESCE($1, status), 
           notes = COALESCE($2, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [status, notes, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Lead not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
