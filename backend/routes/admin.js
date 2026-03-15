const express = require('express');
const router = express.Router();
const supabase = require('../config/db');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

// GET /api/admin/stats?filter=day|week|month
router.get('/stats', async (req, res) => {
  try {
    const { filter = 'day' } = req.query;
    const now = new Date();
    let startDate;

    if (filter === 'day') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    } else if (filter === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }

    // All visits in the period
    const { data: visits, error } = await supabase
      .from('visits')
      .select('college, purpose, check_in_time')
      .gte('check_in_time', startDate);

    if (error) return res.status(500).json({ success: false, message: error.message });

    const totalVisitors = visits.length;

    // Group by college
    const byCollege = {};
    visits.forEach(v => { byCollege[v.college] = (byCollege[v.college] || 0) + 1; });

    // Group by purpose
    const byPurpose = {};
    visits.forEach(v => { byPurpose[v.purpose] = (byPurpose[v.purpose] || 0) + 1; });

    // Today's visits count
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const { count: todayVisits } = await supabase
      .from('visits')
      .select('id', { count: 'exact', head: true })
      .gte('check_in_time', todayStart);

    const topPurpose = Object.entries(byPurpose).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

    res.json({
      success: true,
      stats: { totalVisitors, todayVisits: todayVisits || 0, byCollege, byPurpose, topPurpose }
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

    if (search) {
      // Supabase ilike for case-insensitive search across two columns
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: visits, error, count } = await query;
    if (error) return res.status(500).json({ success: false, message: error.message });

    res.json({
      success: true,
      visits,
      total: count,
      page: pageNum,
      pages: Math.ceil(count / limitNum)
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

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: users, error } = await query;
    if (error) return res.status(500).json({ success: false, message: error.message });

    // Attach visit counts for each user
    const usersWithCounts = await Promise.all(users.map(async (u) => {
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
    // Fetch current status first
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('status, full_name')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const newStatus = user.status === 'active' ? 'banned' : 'active';

    const { error: updateError } = await supabase
      .from('users')
      .update({ status: newStatus })
      .eq('id', req.params.id);

    if (updateError) return res.status(500).json({ success: false, message: updateError.message });

    res.json({
      success: true,
      status: newStatus,
      message: `User ${newStatus === 'banned' ? 'banned' : 'unbanned'} successfully`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
