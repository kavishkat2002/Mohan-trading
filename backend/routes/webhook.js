const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsapp');
const db = require('../db');

const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'my_verify_token';

// Webhook Verification (Required by Meta)
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// Receive messages from WhatsApp
router.post('/', async (req, res) => {
  const body = req.body;

  if (body.object) {
    if (body.entry && body.entry[0].changes && body.entry[0].changes[0] && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {
      const phoneNumber = body.entry[0].changes[0].value.messages[0].from;
      const messageBody = body.entry[0].changes[0].value.messages[0].text?.body;

      if (messageBody) {
        console.log(`Received message from ${phoneNumber}: ${messageBody}`);
        
        // Save raw message to CRM history if lead exists (optional step, doing it asynchronously)
        db.query('SELECT id FROM leads WHERE phone = $1', [phoneNumber]).then(result => {
           if (result.rows.length > 0) {
             db.query('INSERT INTO messages (lead_id, sender, content) VALUES ($1, $2, $3)', [result.rows[0].id, 'customer', messageBody]);
           }
        }).catch(err => console.error(err));

        // Process message through WhatsApp service for auto-reply and lead capture
        await whatsappService.handleIncomingMessage(phoneNumber, messageBody);
      }
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

module.exports = router;
