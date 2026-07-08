const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all leads
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT l.*, COALESCE(NULLIF(u.name, ''), u.email) as assigned_to_name 
      FROM leads l 
      LEFT JOIN users u ON l.assigned_to = u.id::text 
      WHERE l.phone <> 'SYSTEM_SETTINGS'
      ORDER BY l.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

function normalizePhone(phone) {
  if (!phone) return '';
  if (phone === 'SYSTEM_SETTINGS') return 'SYSTEM_SETTINGS';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return '94' + cleaned.substring(1);
  }
  return cleaned;
}

// Sync leads from external source (WhatsApp Supabase)
router.post('/sync', async (req, res) => {
  const { leads } = req.body;
  if (!Array.isArray(leads)) return res.status(400).json({ error: "leads must be an array" });
  
  try {
    for (let lead of leads) {
      const normPhone = normalizePhone(lead.phone);
      // Check if lead with this phone already exists
      const { rows } = await db.query('SELECT id FROM leads WHERE phone = $1', [normPhone]);
      
      if (rows.length === 0) {
        // Insert new lead
        await db.query(
          `INSERT INTO leads (name, phone, interested_car, budget, status, source, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [lead.name || 'WhatsApp User', normPhone, lead.interested_car, lead.budget, lead.status || 'New', 'whatsapp', lead.notes || null]
        );
      } else {
        // Update existing lead
        await db.query(
          `UPDATE leads 
           SET name = CASE WHEN name = 'WhatsApp User' AND $1 <> 'WhatsApp User' THEN $1 ELSE name END,
               interested_car = COALESCE($2, interested_car), 
               budget = COALESCE($3, budget) 
           WHERE phone = $4`,
          [lead.name, lead.interested_car, lead.budget, normPhone]
        );
      }
    }
    res.json({ message: "Synced successfully" });
  } catch (err) {
    console.error("Lead sync error:", err);
    res.status(500).json({ error: "Server error during sync" });
  }
});

// Create new lead
router.post('/', async (req, res) => {
  const { name, phone, interested_car, interested_product, budget, status, source, notes } = req.body;
  const product = interested_product || interested_car; // support both field names
  const normPhone = normalizePhone(phone);
  try {
    const { rows } = await db.query(
      'INSERT INTO leads (name, phone, interested_car, budget, status, source, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, normPhone, product, budget, status || 'New', source || 'manual', notes]
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
  const { name, phone, interested_car, interested_product, budget, status, source, notes } = req.body;
  const product = interested_product || interested_car; // support both field names
  const normPhone = phone ? normalizePhone(phone) : null;
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
      [name, normPhone, product, budget, status, source, notes, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Lead not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Assign lead
router.put('/:id/assign', async (req, res) => {
  const { id } = req.params;
  const { assigned_to, assigned_to_name, assigner_name } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE leads 
       SET assigned_to = $1, assigned_to_name = $2, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $3 RETURNING *`,
      [assigned_to, assigned_to_name || assigned_to, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Lead not found' });
    
    // Create a notification for the newly assigned staff member (UUID-based user_id)
    if (assigned_to) {
      await db.query(
        `INSERT INTO notifications (user_id, message) VALUES ($1, $2)`,
        [assigned_to, `📋 You have been assigned a new lead: ${rows[0].name} (Budget: ${rows[0].budget || 'N/A'}). Assigned by ${assigner_name || 'Owner'}.`]
      );
    }
    
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// Add commission to closed lead
router.put('/:id/commission', async (req, res) => {
  const { id } = req.params;
  const { commission_amount } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE leads SET commission_amount = $1, status = 'Closed', updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [commission_amount, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Lead not found' });
    
    if (rows[0].assigned_to && commission_amount > 0) {
      await db.query(
        `INSERT INTO notifications (user_id, message) VALUES ($1, $2)`,
        [rows[0].assigned_to, `Congratulations! A commission of LKR ${commission_amount} has been added for closing the deal with ${rows[0].name}.`]
      );
    }
    
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
