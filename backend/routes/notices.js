const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all notices
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM notices ORDER BY pinned DESC, created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create a notice
router.post('/', async (req, res) => {
  const { title, content, author_id, author_name, pinned } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO notices (title, content, author_id, author_name, pinned) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, content, author_id, author_name, pinned || false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a notice
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content, pinned } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE notices SET title=$1, content=$2, pinned=$3, updated_at=NOW() WHERE id=$4 RETURNING *',
      [title, content, pinned, id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a notice
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM notices WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
