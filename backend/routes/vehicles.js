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

async function uploadToMetaMedia(filePath) {
  try {
    const { rows: settingsRows } = await db.query('SELECT whatsapp_token, whatsapp_phone_number_id FROM settings LIMIT 1');
    const settings = settingsRows[0] || {};
    const token = settings.whatsapp_token || process.env.WHATSAPP_TOKEN;
    const phoneId = settings.whatsapp_phone_number_id || process.env.PHONE_NUMBER_ID;

    if (!token || !phoneId) {
      console.warn('[Meta Upload] Missing token or phone number ID, skipping upload.');
      return null;
    }

    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`[Meta Upload] File does not exist: ${fullPath}`);
      return null;
    }

    const fileBuffer = fs.readFileSync(fullPath);
    // Use dynamic Import for standard Blob and FormData if needed, or global objects
    const FormObj = typeof FormData !== 'undefined' ? FormData : global.FormData;
    const BlobObj = typeof Blob !== 'undefined' ? Blob : global.Blob;

    if (!FormObj || !BlobObj) {
      console.error('[Meta Upload] FormData or Blob not supported in this Node environment.');
      return null;
    }

    const formData = new FormObj();
    formData.append('messaging_product', 'whatsapp');
    formData.append('file', new BlobObj([fileBuffer], { type: 'image/jpeg' }), path.basename(fullPath));

    const response = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();
    if (response.ok && data.id) {
      console.log(`[Meta Upload] Successfully uploaded ${filePath} to Meta. ID: ${data.id}`);
      return data.id;
    } else {
      console.error(`[Meta Upload] Meta returned error:`, data);
    }
  } catch (error) {
    console.error(`[Meta Upload] Failed to upload ${filePath} to Meta:`, error.message);
  }
  return null;
}

async function autoUploadVehiclesToMeta() {
  try {
    const { rows: localVehicles } = await db.query('SELECT * FROM vehicles');
    for (const v of localVehicles) {
      let updated = false;
      let whatsappMainMediaId = v.whatsapp_main_media_id || '';
      
      // 1. Process Main Image
      if (v.image_url && !whatsappMainMediaId) {
        const fullImgPath = path.join(__dirname, '..', v.image_url);
        if (fs.existsSync(fullImgPath)) {
          console.log(`[Auto Meta Upload] Uploading main image for vehicle ID ${v.id}: ${v.image_url}`);
          const mId = await uploadToMetaMedia(fullImgPath);
          if (mId) {
            whatsappMainMediaId = mId;
            updated = true;
          }
        } else {
          console.warn(`[Auto Meta Upload] Main image file not found locally: ${fullImgPath}`);
        }
      }

      // 2. Process Additional Images
      let additionalImages = [];
      if (v.additional_images) {
        try {
          additionalImages = typeof v.additional_images === 'string' ? JSON.parse(v.additional_images) : v.additional_images;
        } catch (e) {
          if (Array.isArray(v.additional_images)) additionalImages = v.additional_images;
        }
      }

      let whatsappAdditionalMediaIds = {};
      if (v.whatsapp_additional_media_ids) {
        try {
          whatsappAdditionalMediaIds = typeof v.whatsapp_additional_media_ids === 'string' ? JSON.parse(v.whatsapp_additional_media_ids) : v.whatsapp_additional_media_ids;
        } catch (e) {
          if (typeof v.whatsapp_additional_media_ids === 'object' && v.whatsapp_additional_media_ids !== null) {
            whatsappAdditionalMediaIds = v.whatsapp_additional_media_ids;
          }
        }
      }
      if (Array.isArray(whatsappAdditionalMediaIds) || typeof whatsappAdditionalMediaIds !== 'object' || whatsappAdditionalMediaIds === null) {
        whatsappAdditionalMediaIds = {};
      }

      if (Array.isArray(additionalImages) && additionalImages.length > 0) {
        for (const imgUrl of additionalImages) {
          if (!whatsappAdditionalMediaIds[imgUrl]) {
            const fullImgPath = path.join(__dirname, '..', imgUrl);
            if (fs.existsSync(fullImgPath)) {
              console.log(`[Auto Meta Upload] Uploading additional image for vehicle ID ${v.id}: ${imgUrl}`);
              const mId = await uploadToMetaMedia(fullImgPath);
              if (mId) {
                whatsappAdditionalMediaIds[imgUrl] = mId;
                updated = true;
              }
            } else {
              console.warn(`[Auto Meta Upload] Additional image file not found locally: ${fullImgPath}`);
            }
          }
        }
      }

      if (updated) {
        console.log(`[Auto Meta Upload] Saving media IDs for vehicle ID ${v.id} to local DB`);
        await db.query(
          'UPDATE vehicles SET whatsapp_main_media_id = $1, whatsapp_additional_media_ids = $2 WHERE id = $3',
          [whatsappMainMediaId, JSON.stringify(whatsappAdditionalMediaIds), v.id]
        );
      }
    }
  } catch (err) {
    console.error('[Auto Meta Upload] Error during auto upload scan:', err.message);
  }
}

async function syncVehiclesToSupabase() {
  if (!supabase) return;
  try {
    // First ensure all missing images are uploaded to Meta and updated locally
    await autoUploadVehiclesToMeta();

    // Now query the latest state from the database
    const { rows: localVehicles } = await db.query('SELECT * FROM vehicles');
    const formatted = localVehicles.map(v => {
      let addMediaIds = {};
      if (v.whatsapp_additional_media_ids) {
        try {
          addMediaIds = typeof v.whatsapp_additional_media_ids === 'string' ? JSON.parse(v.whatsapp_additional_media_ids) : v.whatsapp_additional_media_ids;
        } catch (e) {}
      }
      if (Array.isArray(addMediaIds) || typeof addMediaIds !== 'object' || addMediaIds === null) {
        addMediaIds = {};
      }

      return {
        id: v.id,
        brand: v.brand,
        price: parseFloat(v.price) || 0,
        category: v.category || '',
        stock: v.stock || 0,
        description: v.description || '',
        image_url: v.image_url || '',
        additional_images: typeof v.additional_images === 'string' ? JSON.parse(v.additional_images) : (v.additional_images || []),
        ai_notes: v.ai_notes || '',
        whatsapp_main_media_id: v.whatsapp_main_media_id || '',
        whatsapp_additional_media_ids: addMediaIds,
        created_at: v.created_at || new Date()
      };
    });

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
router.post('/', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'additional_images', maxCount: 5 }]), async (req, res) => {
  const { brand, price, category, stock, description, purchase_price, transport_cost, repair_cost, registration_fee, fuel_type } = req.body;
  const imageUrl = req.files && req.files.image ? `/uploads/${req.files.image[0].filename}` : null;
  const additionalImagesUrls = req.files && req.files.additional_images ? req.files.additional_images.map(f => `/uploads/${f.filename}`) : [];

  const purchaseAmt = parseFloat(purchase_price) || 0;
  const transportAmt = parseFloat(transport_cost) || 0;
  const repairAmt = parseFloat(repair_cost) || 0;
  const regAmt = parseFloat(registration_fee) || 0;
  const totalCost = purchaseAmt + transportAmt + repairAmt + regAmt;

  try {
    let whatsappMainMediaId = '';
    if (imageUrl) {
      const fullImgPath = path.join(__dirname, '..', imageUrl);
      const mId = await uploadToMetaMedia(fullImgPath);
      if (mId) whatsappMainMediaId = mId;
    }

    const whatsappAdditionalMediaIds = {};
    if (additionalImagesUrls && additionalImagesUrls.length > 0) {
      for (const imgUrl of additionalImagesUrls) {
        const fullImgPath = path.join(__dirname, '..', imgUrl);
        const mId = await uploadToMetaMedia(fullImgPath);
        if (mId) {
          whatsappAdditionalMediaIds[imgUrl] = mId;
        }
      }
    }

    const { rows } = await db.query(
      'INSERT INTO vehicles (brand, price, category, stock, description, image_url, purchase_price, transport_cost, repair_cost, registration_fee, fuel_type, additional_images, whatsapp_main_media_id, whatsapp_additional_media_ids) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *',
      [brand, price, category, stock || 1, description, imageUrl, purchaseAmt, transportAmt, repairAmt, regAmt, fuel_type || 'Petrol', JSON.stringify(additionalImagesUrls), whatsappMainMediaId, JSON.stringify(whatsappAdditionalMediaIds)]
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
router.put('/:id', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'additional_images', maxCount: 5 }]), async (req, res) => {
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
    // Get old values to calculate cost difference and get existing media ids
    const oldRes = await db.query('SELECT purchase_price, transport_cost, repair_cost, registration_fee, brand, image_url, additional_images, whatsapp_main_media_id, whatsapp_additional_media_ids FROM vehicles WHERE id = $1', [id]);
    const old = oldRes.rows[0];
    if (!old) return res.status(404).json({ error: 'Vehicle not found' });

    let whatsappMainMediaId = old.whatsapp_main_media_id || '';
    if (imageUrl !== old.image_url) {
      if (imageUrl) {
        const fullImgPath = path.join(__dirname, '..', imageUrl);
        const mId = await uploadToMetaMedia(fullImgPath);
        if (mId) whatsappMainMediaId = mId;
      } else {
        whatsappMainMediaId = '';
      }
    }

    let whatsappAdditionalMediaIds = {};
    if (old.whatsapp_additional_media_ids) {
      try {
        whatsappAdditionalMediaIds = typeof old.whatsapp_additional_media_ids === 'string' ? JSON.parse(old.whatsapp_additional_media_ids) : (old.whatsapp_additional_media_ids || {});
      } catch (e) {}
    }

    let finalAdditionalImages = old.additional_images;
    if (newAdditionalImagesUrls) {
      finalAdditionalImages = newAdditionalImagesUrls;
      for (const imgUrl of newAdditionalImagesUrls) {
        if (!whatsappAdditionalMediaIds[imgUrl]) {
          const fullImgPath = path.join(__dirname, '..', imgUrl);
          const mId = await uploadToMetaMedia(fullImgPath);
          if (mId) {
            whatsappAdditionalMediaIds[imgUrl] = mId;
          }
        }
      }
    }

    const oldTotal = old ? (parseFloat(old.purchase_price) + parseFloat(old.transport_cost) + parseFloat(old.repair_cost) + parseFloat(old.registration_fee)) : 0;
    const costDiff = totalCost - oldTotal;

    const updateQuery = 'UPDATE vehicles SET brand = $1, price = $2, category = $3, stock = $4, description = $5, image_url = $6, purchase_price = $7, transport_cost = $8, repair_cost = $9, registration_fee = $10, fuel_type = $11, additional_images = $12, whatsapp_main_media_id = $13, whatsapp_additional_media_ids = $14 WHERE id = $15 RETURNING *';
    const updateParams = [brand, price, category, stock, description, imageUrl, purchaseAmt, transportAmt, repairAmt, regAmt, fuel_type || 'Petrol', JSON.stringify(finalAdditionalImages || []), whatsappMainMediaId, JSON.stringify(whatsappAdditionalMediaIds), id];

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
