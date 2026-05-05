const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const getAdminClient = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key === 'PASTE_YOUR_SERVICE_ROLE_KEY_HERE') {
    return null;
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
};

// POST /api/admin/create-user
// Creates a Supabase Auth user with email_confirm bypassed + sets role in metadata
router.post('/create-user', async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const supabaseAdmin = getAdminClient();
  if (!supabaseAdmin) {
    return res.status(503).json({ 
      error: 'Supabase admin not configured. Add SUPABASE_SERVICE_ROLE_KEY to backend/.env' 
    });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip email confirmation
      user_metadata: { role: role || 'sales' }
    });

    if (error) {
      console.error('[Supabase Admin] Create user error:', error.message);
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ 
      success: true, 
      user: { id: data.user.id, email: data.user.email, role: role || 'sales' } 
    });
  } catch (err) {
    console.error('[Supabase Admin] Unexpected error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/delete-user/:supabaseId
// Deletes a Supabase Auth user by their UUID
router.delete('/delete-user/:supabaseId', async (req, res) => {
  const { supabaseId } = req.params;
  const supabaseAdmin = getAdminClient();
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Supabase admin not configured' });
  }

  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(supabaseId);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/update-role/:supabaseId
// Updates user_metadata.role in Supabase
router.put('/update-role/:supabaseId', async (req, res) => {
  const { supabaseId } = req.params;
  const { role } = req.body;
  const supabaseAdmin = getAdminClient();
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Supabase admin not configured' });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(supabaseId, {
      user_metadata: { role }
    });
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true, user: data.user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/users
// List all Supabase Auth users
router.get('/users', async (req, res) => {
  const supabaseAdmin = getAdminClient();
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Supabase admin not configured' });
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) return res.status(400).json({ error: error.message });
    const users = data.users.map(u => ({
      id: u.id,
      email: u.email,
      role: u.user_metadata?.role || 'sales',
      created_at: u.created_at
    }));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
