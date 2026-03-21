const express = require('express');
const router = express.Router();
const db = require('../db');

// Check In
router.post('/check-in', async (req, res) => {
  const { user_id, lat, lng } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO attendance (user_id, date, check_in_time, check_in_lat, check_in_lng) 
       VALUES ($1, CURRENT_DATE, CURRENT_TIMESTAMP, $2, $3) 
       ON CONFLICT (user_id, date) DO NOTHING RETURNING *`,
      [user_id, lat, lng]
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Already checked in today' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check Out
router.post('/check-out', async (req, res) => {
  const { user_id, lat, lng } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE attendance SET check_out_time = CURRENT_TIMESTAMP, check_out_lat = $1, check_out_lng = $2 
       WHERE user_id = $3 AND date = CURRENT_DATE AND check_out_time IS NULL RETURNING *`,
      [lat, lng, user_id]
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Not checked in or already checked out' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Attendance Status (for current user, optionally by date)
router.get('/status/:userId', async (req, res) => {
  const { userId } = req.params;
  const { date } = req.query; // e.g. "YYYY-MM-DD"
  try {
    let query = `SELECT * FROM attendance WHERE user_id = $1`;
    let params = [userId];
    if (date) {
      query += ` AND date = $2`;
      params.push(date);
    } else {
      query += ` AND date = CURRENT_DATE`;
    }
    const { rows } = await db.query(query, params);
    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all attendance records (for Admin/Owner)
router.get('/all', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT a.*, u.email, u.name 
      FROM attendance a 
      JOIN users u ON a.user_id = u.id 
      ORDER BY a.date DESC, a.check_in_time DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get My Attendance
router.get('/my-attendance/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const { rows } = await db.query(
      `SELECT * FROM attendance WHERE user_id = $1 ORDER BY date DESC, check_in_time DESC LIMIT 30`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create Leave Request
router.post('/leaves', async (req, res) => {
  const { user_id, leave_type, start_date, end_date, reason } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO leaves (user_id, leave_type, start_date, end_date, reason) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user_id, leave_type, start_date, end_date, reason]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all leaves
router.get('/leaves', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT l.*, u.email, u.name 
      FROM leaves l 
      JOIN users u ON l.user_id = u.id 
      ORDER BY l.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get My Leaves
router.get('/my-leaves/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const { rows } = await db.query(
      `SELECT * FROM leaves WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update leave status (Approve/Reject)
router.put('/leaves/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE leaves SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
