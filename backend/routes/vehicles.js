const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
router.post('/', upload.single('image'), async (req, res) => {
  const { brand, price, category, stock, description } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const { rows } = await db.query(
      'INSERT INTO vehicles (brand, price, category, stock, description, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [brand, price, category, stock || 1, description, imageUrl]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update vehicle stock or details
router.put('/:id', upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { brand, price, category, stock, description, existing_image } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : existing_image;

  try {
    const { rows } = await db.query(
      'UPDATE vehicles SET brand = $1, price = $2, category = $3, stock = $4, description = $5, image_url = $6 WHERE id = $7 RETURNING *',
      [brand, price, category, stock, description, imageUrl, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Vehicle not found' });
    res.json(rows[0]);
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
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
