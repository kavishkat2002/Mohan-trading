const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

async function syncVehiclesToSupabase() {
  if (!supabase) return;
  try {
    const { rows: localVehicles } = await db.query('SELECT * FROM vehicles');
    const formatted = localVehicles.map(v => ({
      id: v.id,
      brand: v.brand,
      price: parseFloat(v.price) || 0,
      category: v.category || '',
      stock: v.stock || 0,
      description: v.description || '',
      image_url: v.image_url || '',
      created_at: v.created_at || new Date()
    }));

    const { error } = await supabase
      .from('vehicles')
      .upsert(formatted, { onConflict: 'id' });

    if (error) {
      console.error('[Supabase Sync] Vehicles sync failed:', error.message);
    } else {
      console.log('[Supabase Sync] Vehicles synced successfully.');
    }
  } catch (err) {
    console.error('[Supabase Sync] Vehicles sync error:', err.message);
  }
}

async function deleteVehicleFromSupabase(id) {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('[Supabase Sync] Vehicle delete failed:', error.message);
    } else {
      console.log('[Supabase Sync] Vehicle deleted from Supabase.');
    }
  } catch (err) {
    console.error('[Supabase Sync] Vehicle delete error:', err.message);
  }
}

// Perform initial sync at startup
syncVehiclesToSupabase();

// Configure multer for local file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// Get all vehicles
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM vehicles ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a new vehicle
router.post('/', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'additional_images', maxCount: 10 }]), async (req, res) => {
  const { brand, price, category, stock, description, purchase_price, transport_cost, repair_cost, registration_fee, fuel_type } = req.body;
  const imageUrl = req.files && req.files.image ? `/uploads/${req.files.image[0].filename}` : null;
  const additionalImagesUrls = req.files && req.files.additional_images ? req.files.additional_images.map(f => `/uploads/${f.filename}`) : [];

  const purchaseAmt = parseFloat(purchase_price) || 0;
  const transportAmt = parseFloat(transport_cost) || 0;
  const repairAmt = parseFloat(repair_cost) || 0;
  const regAmt = parseFloat(registration_fee) || 0;
  const totalCost = purchaseAmt + transportAmt + repairAmt + regAmt;

  try {
    const { rows } = await db.query(
      'INSERT INTO vehicles (brand, price, category, stock, description, image_url, purchase_price, transport_cost, repair_cost, registration_fee, fuel_type, additional_images) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
      [brand, price, category, stock || 1, description, imageUrl, purchaseAmt, transportAmt, repairAmt, regAmt, fuel_type || 'Petrol', JSON.stringify(additionalImagesUrls)]
    );

    // Auto-record total purchase cost in cash_flow so Finance reflects it
    if (totalCost > 0) {
      await db.query(
        "INSERT INTO cash_flow (type, account, amount, description, date) VALUES ('Expense', 'Bank', $1, $2, CURRENT_DATE)",
        [totalCost, `Vehicle Purchase: ${brand} (purchase + costs)`]
      );
    }

    res.status(201).json(rows[0]);
    syncVehiclesToSupabase();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update vehicle stock or details
router.put('/:id', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'additional_images', maxCount: 10 }]), async (req, res) => {
  const { id } = req.params;
  const { brand, price, category, stock, description, existing_image, purchase_price, transport_cost, repair_cost, registration_fee, fuel_type } = req.body;
  const imageUrl = req.files && req.files.image ? `/uploads/${req.files.image[0].filename}` : existing_image;
  
  let newAdditionalImagesUrls = null;
  if (req.files && req.files.additional_images) {
    newAdditionalImagesUrls = req.files.additional_images.map(f => `/uploads/${f.filename}`);
  }

  const purchaseAmt = parseFloat(purchase_price) || 0;
  const transportAmt = parseFloat(transport_cost) || 0;
  const repairAmt = parseFloat(repair_cost) || 0;
  const regAmt = parseFloat(registration_fee) || 0;
  const totalCost = purchaseAmt + transportAmt + repairAmt + regAmt;

  try {
    // Get old values to calculate cost difference
    const oldRes = await db.query('SELECT purchase_price, transport_cost, repair_cost, registration_fee, brand FROM vehicles WHERE id = $1', [id]);
    const old = oldRes.rows[0];
    const oldTotal = old ? (parseFloat(old.purchase_price) + parseFloat(old.transport_cost) + parseFloat(old.repair_cost) + parseFloat(old.registration_fee)) : 0;
    const costDiff = totalCost - oldTotal;

    const updateQuery = newAdditionalImagesUrls
      ? 'UPDATE vehicles SET brand = $1, price = $2, category = $3, stock = $4, description = $5, image_url = $6, purchase_price = $7, transport_cost = $8, repair_cost = $9, registration_fee = $10, fuel_type = $11, additional_images = $13 WHERE id = $12 RETURNING *'
      : 'UPDATE vehicles SET brand = $1, price = $2, category = $3, stock = $4, description = $5, image_url = $6, purchase_price = $7, transport_cost = $8, repair_cost = $9, registration_fee = $10, fuel_type = $11 WHERE id = $12 RETURNING *';

    const updateParams = newAdditionalImagesUrls
      ? [brand, price, category, stock, description, imageUrl, purchaseAmt, transportAmt, repairAmt, regAmt, fuel_type || 'Petrol', id, JSON.stringify(newAdditionalImagesUrls)]
      : [brand, price, category, stock, description, imageUrl, purchaseAmt, transportAmt, repairAmt, regAmt, fuel_type || 'Petrol', id];

    const { rows } = await db.query(updateQuery, updateParams);
    if (rows.length === 0) return res.status(404).json({ error: 'Vehicle not found' });

    // Update cash_flow if cost changed
    if (Math.abs(costDiff) > 0) {
      // Remove old vehicle purchase entry and re-insert with new total
      await db.query(
        "DELETE FROM cash_flow WHERE description LIKE $1",
        [`Vehicle Purchase: ${old?.brand || brand}%`]
      );
      if (totalCost > 0) {
        await db.query(
          "INSERT INTO cash_flow (type, account, amount, description, date) VALUES ('Expense', 'Bank', $1, $2, CURRENT_DATE)",
          [totalCost, `Vehicle Purchase: ${brand} (purchase + costs)`]
        );
      }
    }

    res.json(rows[0]);
    syncVehiclesToSupabase();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update vehicle AI notes only
router.put('/:id/ai-notes', async (req, res) => {
  const { id } = req.params;
  const { ai_notes } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE vehicles SET ai_notes = $1 WHERE id = $2 RETURNING *',
      [ai_notes || '', id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(rows[0]);
    syncVehiclesToSupabase();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete vehicle
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM vehicles WHERE id = $1', [id]);
    deleteVehicleFromSupabase(id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
