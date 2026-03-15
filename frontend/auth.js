const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const supabase = require('../config/db');
const { protect } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').notEmpty().withMessage('Full name required'),
  body('role').isIn(['student', 'faculty']).withMessage('Role must be student or faculty'),
  body('college').notEmpty().withMessage('College is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, password, fullName, role, college, course, studentId, contact, yearLevel } = req.body;

  if (!email.endsWith('@neu.edu.ph')) {
    return res.status(400).json({ success: false, message: 'Only @neu.edu.ph institutional emails are allowed' });
  }

  try {
    // 1. Create auth user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      if (authError.message.toLowerCase().includes('already')) {
        return res.status(400).json({ success: false, message: 'Email already registered. Please log in instead.' });
      }
      return res.status(400).json({ success: false, message: authError.message });
    }

    const userId = authData.user.id;

    // 2. Upsert full profile into public.users
    const { error: profileError } = await supabase
      .from('users')
      .upsert({
        id:          userId,
        email,
        full_name:   fullName,
        role,
        college,
        course:      course      || null,
        student_id:  studentId   || null,
        contact:     contact     || null,
        year_level:  yearLevel   || null,
        status:      'active'
      }, { onConflict: 'id' });

    if (profileError) {
      await supabase.auth.admin.deleteUser(userId);
      return res.status(500).json({ success: false, message: profileError.message });
    }

    // 3. Sign in to get session token
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({ email, password });
    if (sessionError) {
      return res.status(500).json({ success: false, message: 'Registered but could not sign in: ' + sessionError.message });
    }

    res.status(201).json({
      success: true,
      token: sessionData.session.access_token,
      user: {
        id:        userId,
        fullName,
        email,
        role,
        college,
        course:    course    || null,
        studentId: studentId || null,
        contact:   contact   || null,
        yearLevel: yearLevel || null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const { email, password } = req.body;

  if (!email.endsWith('@neu.edu.ph')) {
    return res.status(400).json({ success: false, message: 'Only @neu.edu.ph institutional emails are allowed' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(500).json({ success: false, message: 'Profile not found' });
    }

    if (profile.status === 'banned') {
      return res.status(403).json({ success: false, message: 'Your account has been banned. Contact library staff.' });
    }

    res.json({
      success: true,
      token: data.session.access_token,
      user: {
        id:        profile.id,
        fullName:  profile.full_name,
        email:     profile.email,
        role:      profile.role,
        college:   profile.college,
        course:    profile.course,
        studentId: profile.student_id,
        contact:   profile.contact,
        yearLevel: profile.year_level
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  const u = req.user;
  res.json({
    success: true,
    user: {
      id:        u.id,
      fullName:  u.full_name,
      email:     u.email,
      role:      u.role,
      college:   u.college,
      course:    u.course,
      studentId: u.student_id,
      contact:   u.contact,
      yearLevel: u.year_level
    }
  });
});

module.exports = router;
