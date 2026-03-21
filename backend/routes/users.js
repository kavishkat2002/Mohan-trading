const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Register User
router.post('/register', async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
      [email, hashedPassword, role || 'sales']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login User
router.post('/login', async (req, res) => {
  console.log('Login attempt received for:', req.body.email);
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (rows.length === 0) return res.status(400).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});
// Get all users
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, email, role, created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user role
router.put('/:id/role', async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, role',
      [role, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get profile
router.get('/:id/profile', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query('SELECT id, email, role, name, mobile_number, avatar_url, created_at FROM users WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update profile details
router.put('/:id/profile', async (req, res) => {
  const { id } = req.params;
  const { name, mobile_number, avatar_url, oldPassword, newPassword } = req.body;
  try {
    // Basic updates
    let updateQuery = 'UPDATE users SET name = COALESCE($1, name), avatar_url = COALESCE($2, avatar_url), mobile_number = COALESCE($3, mobile_number)';
    let params = [name, avatar_url, mobile_number, id];
    let returning = 'RETURNING id, email, role, name, mobile_number, avatar_url';

    // Password update flow
    if (newPassword) {
      if (!oldPassword) {
        return res.status(400).json({ error: 'Old password is required to set a new password' });
      }
      
      const userRes = await db.query('SELECT password_hash FROM users WHERE id = $1', [id]);
      if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      
      const match = await bcrypt.compare(oldPassword, userRes.rows[0].password_hash);
      if (!match) return res.status(400).json({ error: 'Incorrect old password' });

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updateQuery += ', password_hash = $5';
      params.push(hashedPassword);
      updateQuery += ` WHERE id = $4 ${returning}`;
    } else {
      updateQuery += ` WHERE id = $4 ${returning}`;
    }

    const { rows } = await db.query(updateQuery, params);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/avatars/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.post('/:id/avatar', upload.single('avatar'), async (req, res) => {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  // Store relative/absolute URL
  const avatarUrl = 'http://localhost:5001/uploads/avatars/' + req.file.filename;

  try {
    const { rows } = await db.query('UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING avatar_url', [avatarUrl, id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user notifications
router.get('/:id/notifications', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query(
      'SELECT * FROM notifications WHERE user_id = $1 AND read = false ORDER BY created_at DESC',
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark notification as read
router.put('/notifications/:notifId/read', async (req, res) => {
  const { notifId } = req.params;
  try {
    const { rows } = await db.query(
      'UPDATE notifications SET read = true WHERE id = $1 RETURNING *',
      [notifId]
    );
    res.json(rows[0] || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user commissions for current month
router.get('/:id/commissions', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await db.query(
      `SELECT SUM(commission_amount) as total_commission FROM leads 
       WHERE assigned_to = $1 AND status = 'Closed' 
       AND EXTRACT(MONTH FROM updated_at) = EXTRACT(MONTH FROM CURRENT_DATE) 
       AND EXTRACT(YEAR FROM updated_at) = EXTRACT(YEAR FROM CURRENT_DATE)`,
      [id]
    );
    res.json({ total: rows[0].total_commission || 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
