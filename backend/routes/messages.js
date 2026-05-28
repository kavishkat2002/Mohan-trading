const express = require('express');
const router = express.Router();
const db = require('../db');
const whatsappService = require('../services/whatsapp');

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
    
    // If sent by sales, trigger real WhatsApp message
    if (sender === 'sales') {
        const leadRes = await db.query('SELECT phone FROM leads WHERE id = $1', [lead_id]);
        if (leadRes.rows.length > 0) {
            await whatsappService.sendWhatsAppMessage(leadRes.rows[0].phone, content, null, 'sales');
        }
    }

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Sync messages from Supabase
router.post('/sync', async (req, res) => {
  const { lead_id, messages } = req.body;
  if (!lead_id || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'lead_id and messages array required' });
  }

  try {
    for (let msg of messages) {
      // Check if message already exists locally (by content, sender and date to prevent duplicates)
      const { rows } = await db.query(
        'SELECT id FROM messages WHERE lead_id = $1 AND sender = $2 AND content = $3',
        [lead_id, msg.sender, msg.content]
      );

      if (rows.length === 0) {
        // Insert message
        await db.query(
          'INSERT INTO messages (lead_id, sender, content, created_at) VALUES ($1, $2, $3, $4)',
          [lead_id, msg.sender, msg.content, msg.created_at || new Date()]
        );
      }
    }
    res.json({ message: 'Messages synced successfully' });
  } catch (err) {
    console.error('Message sync error:', err);
    res.status(500).json({ error: 'Server error during sync' });
  }
});

module.exports = router;
