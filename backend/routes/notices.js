const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for notice image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/notices');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

// GET all notices
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM notices ORDER BY pinned DESC, created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST create a notice (with optional image upload)
router.post('/', upload.single('image'), async (req, res) => {
  const { title, content, author_id, author_name, pinned } = req.body;
  const imageUrl = req.file ? `http://localhost:5001/uploads/notices/${req.file.filename}` : (req.body.image_url || null);
  try {
    const { rows } = await db.query(
      'INSERT INTO notices (title, content, author_id, author_name, pinned, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [title, content, author_id || null, author_name || 'Admin', pinned === 'true' || pinned === true, imageUrl]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT update a notice (with optional image upload)
router.put('/:id', upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const { title, content, pinned } = req.body;
  const imageUrl = req.file
    ? `http://localhost:5001/uploads/notices/${req.file.filename}`
    : (req.body.image_url || null);

  try {
    // Build dynamic query — only update image_url if provided
    let query, params;
    if (imageUrl !== null) {
      query = 'UPDATE notices SET title=$1, content=$2, pinned=$3, image_url=$4, updated_at=NOW() WHERE id=$5 RETURNING *';
      params = [title, content, pinned === 'true' || pinned === true, imageUrl, id];
    } else {
      query = 'UPDATE notices SET title=$1, content=$2, pinned=$3, updated_at=NOW() WHERE id=$4 RETURNING *';
      params = [title, content, pinned === 'true' || pinned === true, id];
    }
    const { rows } = await db.query(query, params);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE a notice
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM notices WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
