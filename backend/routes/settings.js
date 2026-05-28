const express = require('express');
const router = express.Router();
const db = require('../db');

// Get settings
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM settings WHERE id = 1');
    if (rows.length === 0) {
      return res.json({});
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update settings
router.put('/', async (req, res) => {
  const {
    name, contact_email, contact_phone, business_type, description,
    bank_name, bank_account_holder, bank_account_number, bank_branch, bank_swift_code,
    payment_gateway_name, payment_gateway_link, whatsapp_phone_number_id, slogan, logo_url,
    whatsapp_token, meta_app_id, meta_config_id
  } = req.body;
  
  try {
    const values = [
      name, contact_email, contact_phone, business_type, description,
      bank_name, bank_account_holder, bank_account_number, bank_branch, bank_swift_code,
      payment_gateway_name, payment_gateway_link, whatsapp_phone_number_id, slogan, logo_url,
      whatsapp_token, meta_app_id, meta_config_id
    ].map(v => v === undefined ? null : v);

    const { rows } = await db.query(
      `UPDATE settings 
       SET name = COALESCE($1, name),
           contact_email = COALESCE($2, contact_email),
           contact_phone = COALESCE($3, contact_phone),
           business_type = COALESCE($4, business_type),
           description = COALESCE($5, description),
           bank_name = COALESCE($6, bank_name),
           bank_account_holder = COALESCE($7, bank_account_holder),
           bank_account_number = COALESCE($8, bank_account_number),
           bank_branch = COALESCE($9, bank_branch),
           bank_swift_code = COALESCE($10, bank_swift_code),
           payment_gateway_name = COALESCE($11, payment_gateway_name),
           payment_gateway_link = COALESCE($12, payment_gateway_link),
           whatsapp_phone_number_id = COALESCE($13, whatsapp_phone_number_id),
           slogan = COALESCE($14, slogan),
           logo_url = COALESCE($15, logo_url),
           whatsapp_token = COALESCE($16, whatsapp_token),
           meta_app_id = COALESCE($17, meta_app_id),
           meta_config_id = COALESCE($18, meta_config_id)
       WHERE id = 1 RETURNING *`,
      values
    );
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
