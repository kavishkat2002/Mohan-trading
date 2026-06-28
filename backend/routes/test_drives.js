const express = require('express');
const router = express.Router();
const db = require('../db');

// Migration: ensure source column exists
(async () => {
  try {
    await db.query(`ALTER TABLE test_drives ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual'`);
    await db.query(`ALTER TABLE test_drives ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
  } catch (e) { /* columns may already exist */ }
})();

// Get all test drives
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT td.*, 
             l.name as lead_name, l.phone as lead_phone,
             v.brand as vehicle_brand, v.price as vehicle_price,
             td.source as source
      FROM test_drives td
      JOIN leads l ON td.lead_id = l.id
      JOIN vehicles v ON td.vehicle_id = v.id
      ORDER BY td.booking_date DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/test-drives] Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new test drive booking
router.post('/', async (req, res) => {
  const { lead_id, vehicle_id, booking_date, notes, status } = req.body;
  if (!lead_id || !vehicle_id || !booking_date) {
    return res.status(400).json({ error: 'lead_id, vehicle_id, and booking_date are required' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO test_drives (lead_id, vehicle_id, booking_date, notes, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [parseInt(lead_id, 10), parseInt(vehicle_id, 10), booking_date, notes || '', status || 'Scheduled']
    );

    // Fetch details of created test drive to return to client
    const fullRes = await db.query(`
      SELECT td.*, 
             l.name as lead_name, l.phone as lead_phone,
             v.brand as vehicle_brand, v.price as vehicle_price
      FROM test_drives td
      JOIN leads l ON td.lead_id = l.id
      JOIN vehicles v ON td.vehicle_id = v.id
      WHERE td.id = $1
    `, [rows[0].id]);

    res.status(201).json(fullRes.rows[0]);
  } catch (err) {
    console.error('[POST /api/test-drives] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update test drive booking
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { booking_date, status, notes } = req.body;

  try {
    const { rows } = await db.query(
      `UPDATE test_drives 
       SET booking_date = COALESCE($1, booking_date),
           status = COALESCE($2, status),
           notes = COALESCE($3, notes),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [booking_date, status, notes, parseInt(id, 10)]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Test drive booking not found' });
    }

    // Fetch details of updated test drive to return to client
    const fullRes = await db.query(`
      SELECT td.*, 
             l.name as lead_name, l.phone as lead_phone,
             v.brand as vehicle_brand, v.price as vehicle_price
      FROM test_drives td
      JOIN leads l ON td.lead_id = l.id
      JOIN vehicles v ON td.vehicle_id = v.id
      WHERE td.id = $1
    `, [id]);

    res.json(fullRes.rows[0]);
  } catch (err) {
    console.error('[PUT /api/test-drives/:id] Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete test drive booking
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await db.query(
      'DELETE FROM test_drives WHERE id = $1 RETURNING *',
      [parseInt(id, 10)]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Test drive booking not found' });
    }

    res.json({ success: true, message: 'Test drive booking deleted successfully' });
  } catch (err) {
    console.error('[DELETE /api/test-drives/:id] Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
