const express = require('express');
const router = express.Router();
const db = require('../db');
const whatsappService = require('../services/whatsapp');

// Get message statistics for dashboard
router.get('/stats', async (req, res) => {
  try {
    const totalMessagesRes = await db.query('SELECT COUNT(*) FROM messages');
    const chatSessionsRes = await db.query('SELECT COUNT(DISTINCT lead_id) FROM messages');
    res.json({
      totalMessages: parseInt(totalMessagesRes.rows[0].count, 10) || 0,
      chatSessions: parseInt(chatSessionsRes.rows[0].count, 10) || 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

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
      let existingRes;
      if (msg.id) {
        existingRes = await db.query(
          'SELECT id FROM messages WHERE supabase_id = $1',
          [msg.id]
        );
      } else {
        existingRes = await db.query(
          'SELECT id FROM messages WHERE lead_id = $1 AND sender = $2 AND content = $3',
          [lead_id, msg.sender, msg.content]
        );
      }

      if (existingRes.rows.length === 0) {
        // Parse the created_at safely to ensure UTC timestamp is converted correctly
        let createdAt = new Date();
        if (msg.created_at) {
          let dateStr = msg.created_at;
          if (typeof dateStr === 'string') {
            const hasTimezone = dateStr.endsWith('Z') || /[\+\-]\d{2}(:\d{2})?$/.test(dateStr);
            if (!hasTimezone) {
              dateStr = dateStr + 'Z';
            }
          }
          createdAt = new Date(dateStr);
        }

        // Insert message
        await db.query(
          'INSERT INTO messages (lead_id, sender, content, supabase_id, created_at) VALUES ($1, $2, $3, $4, $5)',
          [lead_id, msg.sender, msg.content, msg.id || null, createdAt]
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
