const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper: resolve user_id to local integer (handles UUID or integer strings)
async function resolveLocalUserId(user_id, email, db) {
  // If email is provided, always look up by email (most reliable)
  if (email) {
    const { rows } = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (rows.length > 0) return rows[0].id;
  }
  // If user_id is a plain integer string, use it directly
  if (user_id && /^\d+$/.test(String(user_id))) return parseInt(user_id);
  // If user_id looks like a UUID, try to match by supabase_uid column
  if (user_id) {
    const { rows } = await db.query('SELECT id FROM users WHERE supabase_uid = $1', [String(user_id)]);
    if (rows.length > 0) return rows[0].id;
  }
  return null;
}

// Check In
router.post('/check-in', async (req, res) => {
  const { user_id, lat, lng, email } = req.body;
  try {
    const localId = await resolveLocalUserId(user_id, email, db);
    if (!localId) return res.status(400).json({ error: 'Could not resolve user. Please provide email.' });

    const { rows } = await db.query(
      `INSERT INTO attendance (user_id, date, check_in_time, check_in_lat, check_in_lng) 
       VALUES ($1, (NOW() AT TIME ZONE 'Asia/Colombo')::date, CURRENT_TIMESTAMP, $2, $3) 
       ON CONFLICT (user_id, date) DO NOTHING RETURNING *`,
      [String(localId), lat, lng]
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
  const { user_id, lat, lng, email } = req.body;
  try {
    const localId = await resolveLocalUserId(user_id, email, db);
    if (!localId) return res.status(400).json({ error: 'Could not resolve user. Please provide email.' });

    const { rows } = await db.query(
      `UPDATE attendance SET check_out_time = CURRENT_TIMESTAMP, check_out_lat = $1, check_out_lng = $2 
       WHERE user_id = $3 AND date = (NOW() AT TIME ZONE 'Asia/Colombo')::date AND check_out_time IS NULL RETURNING *`,
      [lat, lng, String(localId)]
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
  const { date, email } = req.query; // e.g. "YYYY-MM-DD", "user@example.com"
  try {
    const localId = await resolveLocalUserId(userId, email, db);
    if (!localId) {
      return res.json(null);
    }
    let query = `SELECT * FROM attendance WHERE user_id = $1`;
    let params = [String(localId)];
    if (date) {
      query += ` AND date = $2`;
      params.push(date);
    } else {
      query += ` AND date = (NOW() AT TIME ZONE 'Asia/Colombo')::date`;
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
      SELECT a.*
      FROM attendance a 
      JOIN users u ON a.user_id = u.id::text 
      ORDER BY a.date DESC, a.check_in_time DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Dashboard summary: staff attendance + leave counts (resolves UUID vs integer user_id mismatch)
router.get('/dashboard-summary', async (req, res) => {
  try {
    // Get all non-owner/admin staff with their supabase_uid for UUID matching
    const { rows: staffRows } = await db.query(
      `SELECT id, email, role, name, mobile_number, avatar_url, supabase_uid FROM users WHERE role NOT IN ('owner', 'admin') ORDER BY created_at`
    );

    // Get today's attendance records for all matching users (by integer id OR supabase_uid)
    // Build a list of all possible user_id values for today's check
    const userIdValues = [];
    const localIdByValue = {}; // maps attendance user_id string -> local integer id
    for (const u of staffRows) {
      const intId = String(u.id);
      userIdValues.push(intId);
      localIdByValue[intId] = u.id;
      if (u.supabase_uid) {
        userIdValues.push(u.supabase_uid);
        localIdByValue[u.supabase_uid] = u.id;
      }
    }

    let attendanceRows = [];
    if (userIdValues.length > 0) {
      const placeholders = userIdValues.map((_, i) => `$${i + 1}`).join(',');
      const { rows } = await db.query(
        `SELECT * FROM attendance 
         WHERE date = (NOW() AT TIME ZONE 'Asia/Colombo')::date
         AND user_id IN (${placeholders})`,
        userIdValues
      );
      attendanceRows = rows;
    }

    // Build attendance map keyed by LOCAL integer user_id
    const attMap = {}; // localId -> attendance record
    for (const a of attendanceRows) {
      const localId = localIdByValue[String(a.user_id)];
      if (localId) attMap[localId] = a;
    }

    // Get all pending leaves (by any user_id format, also resolve via supabase_uid)
    const { rows: leavesRows } = await db.query(
      `SELECT user_id, COUNT(*) as pending_count FROM leaves WHERE status = 'Pending' GROUP BY user_id`
    );
    const leaveMap = {};
    for (const l of leavesRows) {
      const localId = localIdByValue[String(l.user_id)] || null;
      if (localId) {
        leaveMap[localId] = (leaveMap[localId] || 0) + parseInt(l.pending_count);
      }
    }

    // Map each staff member by their local integer id
    const summary = staffRows.map(u => {
      const todayRecord = attMap[u.id] || null;
      const pendingLeavesCount = leaveMap[u.id] || 0;
      return { ...u, todayRecord, pendingLeavesCount };
    });

    res.json(summary);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Get My Attendance
router.get('/my-attendance/:userId', async (req, res) => {
  const { userId } = req.params;
  const { email } = req.query;
  try {
    const localId = await resolveLocalUserId(userId, email, db);
    const storedId = localId ? String(localId) : String(userId);
    const { rows } = await db.query(
      `SELECT * FROM attendance WHERE user_id = $1 ORDER BY date DESC, check_in_time DESC LIMIT 30`,
      [storedId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create Leave Request
router.post('/leaves', async (req, res) => {
  const { user_id, email, leave_type, start_date, end_date, reason } = req.body;
  try {
    const localId = await resolveLocalUserId(user_id, email, db);
    const storedId = localId ? String(localId) : String(user_id);
    const { rows } = await db.query(
      `INSERT INTO leaves (user_id, leave_type, start_date, end_date, reason) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [storedId, leave_type, start_date, end_date, reason]
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
      JOIN users u ON l.user_id = u.id::text 
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
  const { email } = req.query;
  try {
    const localId = await resolveLocalUserId(userId, email, db);
    const storedId = localId ? String(localId) : String(userId);
    const { rows } = await db.query(
      `SELECT * FROM leaves WHERE user_id = $1 ORDER BY created_at DESC`,
      [storedId]
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
