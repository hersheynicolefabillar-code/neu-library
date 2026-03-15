const supabase = require('../config/db');

// Verifies the Supabase access token from the Authorization header.
// Attaches the full profile row from public.users to req.user.
exports.protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Ask Supabase to validate the JWT and return the user
    const { data: { user: authUser }, error } = await supabase.auth.getUser(token);
    if (error || !authUser) {
      return res.status(401).json({ success: false, message: 'Token invalid or expired' });
    }

    // Fetch the profile row (role, status, college, etc.)
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ success: false, message: 'User profile not found' });
    }

    if (profile.status === 'banned') {
      return res.status(403).json({ success: false, message: 'Your account has been banned. Contact library staff.' });
    }

    req.user = profile; // { id, full_name, email, role, college, course, status }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Auth error: ' + err.message });
  }
};

exports.adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ success: false, message: 'Admin access only' });
};
