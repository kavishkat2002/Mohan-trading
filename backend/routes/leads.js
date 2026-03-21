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
  const { name, phone, interested_car, budget, status, source, notes } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO leads (name, phone, interested_car, budget, status, source, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, phone, interested_car, budget, status || 'New', source || 'manual', notes]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update lead
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, phone, interested_car, budget, status, source, notes } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE leads 
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           interested_car = COALESCE($3, interested_car),
           budget = COALESCE($4, budget),
           status = COALESCE($5, status), 
           source = COALESCE($6, source),
           notes = COALESCE($7, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 RETURNING *`,
      [name, phone, interested_car, budget, status, source, notes, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Lead not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete lead
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query('DELETE FROM leads WHERE id = $1 RETURNING *', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Lead not found' });
    res.json({ message: 'Lead deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
