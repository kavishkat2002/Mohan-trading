const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

let supabaseClient = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabaseClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

module.exports = async (req, res, next) => {
  // Allow OPTIONS preflight requests (required for CORS)
  if (req.method === 'OPTIONS') {
    return next();
  }

  // Define public paths that do not require JWT validation
  const publicPaths = [
    '/health',
    '/api/users/login',
    '/api/webhook'
  ];

  // Check if current path matches any of the public paths
  if (publicPaths.some(p => req.path === p || req.path.startsWith(p))) {
    return next();
  }

  // Check for Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    let decoded = null;

    // 1. Try verifying with Supabase Auth
    if (supabaseClient) {
      try {
        const { data: { user }, error } = await supabaseClient.auth.getUser(token);
        if (!error && user) {
          decoded = {
            userId: user.id,
            email: user.email,
            role: user.user_metadata?.role || user.app_metadata?.role || 'sales'
          };
        }
      } catch (err) {
        // Fallback to local JWT verification below
      }
    }

    // 2. Fallback: Try verifying with local JWT secret
    if (!decoded) {
      const payload = jwt.verify(token, JWT_SECRET);
      decoded = {
        userId: payload.userId,
        role: payload.role
      };
    }

    req.user = decoded;

    // Enforce Role-Based Access Control (RBAC) on admin routes
    if (req.path.startsWith('/api/admin')) {
      const allowedRoles = ['admin', 'owner'];
      if (!allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Forbidden. Access restricted to administrator accounts.' });
      }
    }

    next();
  } catch (err) {
    console.error('[Auth Middleware] Invalid token validation error:', err.message);
    res.status(401).json({ error: 'Invalid token.' });
  }
};
