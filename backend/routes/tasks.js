const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all tasks (Admins/Owners see all, others see assigned)
router.get('/', async (req, res) => {
  const { userId, role } = req.query; // Simple auth simulation for now
  try {
    let query = `
      SELECT t.*, u.name as assigned_to_name, u2.name as created_by_name, v.brand as vehicle_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      LEFT JOIN vehicles v ON t.vehicle_id = v.id
    `;
    let params = [];

    if (role !== 'owner' && role !== 'admin') {
      query += ' WHERE t.assigned_to = $1';
      params.push(userId);
    }
    query += ' ORDER BY t.created_at DESC';

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create task
router.post('/', async (req, res) => {
  const { assigned_to, created_by, vehicle_id, title, description, priority, due_date } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO tasks (assigned_to, created_by, vehicle_id, title, description, priority, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [assigned_to, created_by, vehicle_id, title, description, priority || 'Medium', due_date]
    );

    // Also create a notification for the assigned user
    await db.query(
      'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
      [assigned_to, `New task assigned: ${title}`]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update task status
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE tasks SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete task
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
