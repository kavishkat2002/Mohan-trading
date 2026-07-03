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

// Get stats counts
router.get('/stats', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'Scheduled') AS scheduled,
        COUNT(*) FILTER (WHERE status = 'Completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'Cancelled') AS cancelled,
        COUNT(*) AS total
      FROM test_drives
    `);
    res.json(rows[0]);
  } catch (err) {
    console.error('[GET /api/test-drives/stats] Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get booked time slots for a specific date (for UI calendar)
router.get('/slots', async (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' });
  try {
    const { rows } = await db.query(
      `SELECT booking_date, v.brand as vehicle_brand
       FROM test_drives td
       LEFT JOIN vehicles v ON td.vehicle_id = v.id
       WHERE DATE(booking_date) = $1 AND status != 'Cancelled'`,
      [date]
    );
    res.json(rows);
  } catch (err) {
    console.error('[GET /api/test-drives/slots] Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function syncTestDrives() {
  try {
    const { data: remoteDrives, error } = await supabase.from('test_drives').select('*');
    if (error) {
      console.error('[Sync] Supabase fetch error:', error);
      return;
    }
    
    for (const td of remoteDrives) {
      try {
        let localLeadId = td.lead_id;
        
        // Sync Lead if missing or map ID by phone
        if (td.lead_id) {
          const { data: remoteLead } = await supabase.from('leads').select('*').eq('id', td.lead_id).single();
          if (remoteLead) {
            const existingLeadByPhone = await db.query('SELECT id FROM leads WHERE phone = $1', [remoteLead.phone]);
            if (existingLeadByPhone.rows.length > 0) {
              localLeadId = existingLeadByPhone.rows[0].id;
            } else {
              const insertRes = await db.query(
                `INSERT INTO leads (name, phone, interested_car, budget, status, source, notes, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
                [remoteLead.name, remoteLead.phone, remoteLead.interested_car, remoteLead.budget, remoteLead.status, remoteLead.source, remoteLead.notes, remoteLead.created_at, remoteLead.updated_at]
              );
              localLeadId = insertRes.rows[0].id;
              console.log(`[Sync] Inserted new lead ${localLeadId} from remote ${remoteLead.id}`);
            }
          }
        }

        const existingRes = await db.query('SELECT id FROM test_drives WHERE id = $1', [td.id]);
        if (existingRes.rows.length === 0) {
          await db.query(
            `INSERT INTO test_drives (id, lead_id, vehicle_id, booking_date, status, notes, created_at, updated_at, source)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [td.id, localLeadId, td.vehicle_id, td.booking_date, td.status, td.notes, td.created_at, td.updated_at, 'whatsapp_auto']
          );
        } else {
          await db.query(
            `UPDATE test_drives SET status = $1, notes = $2, booking_date = $3, updated_at = $4 WHERE id = $5`,
            [td.status, td.notes, td.booking_date, td.updated_at, td.id]
          );
        }
      } catch (innerErr) {
        console.error(`[Sync] Failed to sync test drive ${td.id}:`, innerErr.message);
      }
    }
  } catch (err) {
    console.error('[Sync] Failed to sync test drives:', err);
  }
}

// Get all test drives
router.get('/', async (req, res) => {
  try {
    await syncTestDrives(); // Sync from Supabase first!
    
    const { rows } = await db.query(`
      SELECT td.*,
             l.name as lead_name, l.phone as lead_phone,
             v.brand as vehicle_brand, v.price as vehicle_price,
             td.source as source
      FROM test_drives td
      JOIN leads l ON td.lead_id = l.id
      LEFT JOIN vehicles v ON td.vehicle_id = v.id
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
router.syncTestDrives = syncTestDrives;
module.exports = router;
