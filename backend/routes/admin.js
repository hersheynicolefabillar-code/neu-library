const express = require('express');
const router = express.Router();
const supabase = require('../config/db');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

// GET /api/admin/stats?filter=day|week|month&purpose=&college=&role=
router.get('/stats', async (req, res) => {
  try {
    const { filter = 'day', purpose = '', college = '', role = '' } = req.query;
    const now = new Date();
    let startDate;

    if (filter === 'day') {
      // Start of today in UTC
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    } else if (filter === 'week') {
      // 7 days ago
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      startDate = weekAgo.toISOString();
    } else {
      // Start of current month
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    }

    // Build visits query
    let query = supabase
      .from('visits')
      .select('college, purpose, user_id')
      .gte('check_in_time', startDate);

    if (purpose) query = query.eq('purpose', purpose);
    if (college) query = query.eq('college', college);

    const { data: visits, error } = await query;
    if (error) return res.status(500).json({ success: false, message: error.message });

    let filteredVisits = visits || [];

    // Filter by role
    if (role && filteredVisits.length > 0) {
      const roleFilter = role === 'employee' ? 'faculty' : 'student';
      const userIds = filteredVisits.map(v => v.user_id);
      const { data: users } = await supabase
        .from('users')
        .select('id, role')
        .in('id', userIds)
        .eq('role', roleFilter);
      const allowedIds = new Set((users || []).map(u => u.id));
      filteredVisits = filteredVisits.filter(v => allowedIds.has(v.user_id));
    }

    const totalVisitors = filteredVisits.length;

    const byCollege = {};
    filteredVisits.forEach(v => {
      if (v.college) byCollege[v.college] = (byCollege[v.college] || 0) + 1;
    });

    const byPurpose = {};
    filteredVisits.forEach(v => {
      if (v.purpose) byPurpose[v.purpose] = (byPurpose[v.purpose] || 0) + 1;
    });

    // Today's visits - always use today regardless of filter
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
    const { count: todayVisits } = await supabase
      .from('visits')
      .select('id', { count: 'exact', head: true })
      .gte('check_in_time', todayStart);

    const topPurpose = Object.entries(byPurpose).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

    res.json({
      success: true,
      stats: {
        totalVisitors,
        todayVisits: todayVisits || 0,
        byCollege,
        byPurpose,
        topPurpose,
        debug: { filter, startDate, totalFound: filteredVisits.length }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/logs?search=&page=1
router.get('/logs', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    let query = supabase
      .from('visits')
      .select('*', { count: 'exact' })
      .order('check_in_time', { ascending: false })
      .range(from, to);

    if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);

    const { data: visits, error, count } = await query;
    if (error) return res.status(500).json({ success: false, message: error.message });

    res.json({
      success: true,
      visits: visits || [],
      total: count || 0,
      page: pageNum,
      pages: Math.ceil((count || 0) / limitNum)
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/users?search=
router.get('/users', async (req, res) => {
  try {
    const { search = '' } = req.query;

    let query = supabase
      .from('users')
      .select('*')
      .neq('role', 'admin')
      .order('created_at', { ascending: false });

    if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);

    const { data: users, error } = await query;
    if (error) return res.status(500).json({ success: false, message: error.message });

    const usersWithCounts = await Promise.all((users || []).map(async (u) => {
      const { count } = await supabase
        .from('visits')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', u.id);
      return {
        id: u.id,
        fullName: u.full_name,
        email: u.email,
        role: u.role,
        college: u.college,
        status: u.status,
        visitCount: count || 0,
        createdAt: u.created_at
      };
    }));

    res.json({ success: true, users: usersWithCounts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/admin/users/:id/ban
router.patch('/users/:id/ban', async (req, res) => {
  try {
    const { data: user, error: fetchError } = await supabase
      .from('users').select('status').eq('id', req.params.id).single();
    if (fetchError || !user) return res.status(404).json({ success: false, message: 'User not found' });

    const newStatus = user.status === 'active' ? 'banned' : 'active';
    const { error: updateError } = await supabase
      .from('users').update({ status: newStatus }).eq('id', req.params.id);
    if (updateError) return res.status(500).json({ success: false, message: updateError.message });

    res.json({ success: true, status: newStatus, message: `User ${newStatus} successfully` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
