const express = require('express');
const router = express.Router();
const supabase = require('../config/db');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

router.get('/stats', async (req, res) => {
  try {
    const filter = req.query.filter || 'day';
    const purpose = req.query.purpose || '';
    const college = req.query.college || '';
    const role = req.query.role || '';
    const now = new Date();
    let startDate;

    if (filter === 'day') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    } else if (filter === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 14);
      d.setHours(0, 0, 0, 0);
      startDate = d.toISOString();
    } else {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      d.setHours(0, 0, 0, 0);
      startDate = d.toISOString();
    }

    let query = supabase
      .from('visits')
      .select('college, purpose, user_id')
      .gte('check_in_time', startDate);

    if (purpose) query = query.eq('purpose', purpose);
    if (college) query = query.eq('college', college);

    const { data: visits, error } = await query;
    if (error) return res.status(500).json({ success: false, message: error.message });

    let filteredVisits = visits || [];

    if (role && filteredVisits.length > 0) {
      const roleFilter = role === 'employee' ? 'faculty' : 'student';
      const userIds = filteredVisits.map(function(v) { return v.user_id; });
      const { data: users } = await supabase
        .from('users')
        .select('id, role')
        .in('id', userIds)
        .eq('role', roleFilter);
      const allowedIds = new Set((users || []).map(function(u) { return u.id; }));
      filteredVisits = filteredVisits.filter(function(v) { return allowedIds.has(v.user_id); });
    }

    const totalVisitors = filteredVisits.length;
    const byCollege = {};
    const byPurpose = {};

    filteredVisits.forEach(function(v) {
      if (v.college) byCollege[v.college] = (byCollege[v.college] || 0) + 1;
      if (v.purpose) byPurpose[v.purpose] = (byPurpose[v.purpose] || 0) + 1;
    });

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const { count: todayVisits } = await supabase
      .from('visits')
      .select('id', { count: 'exact', head: true })
      .gte('check_in_time', todayStart);

    const purposeEntries = Object.entries(byPurpose).sort(function(a, b) { return b[1] - a[1]; });
    const topPurpose = purposeEntries.length > 0 ? purposeEntries[0][0] : '-';

    return res.json({
      success: true,
      stats: {
        totalVisitors: totalVisitors,
        todayVisits: todayVisits || 0,
        byCollege: byCollege,
        byPurpose: byPurpose,
        topPurpose: topPurpose
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('visits')
      .select('*', { count: 'exact' })
      .order('check_in_time', { ascending: false })
      .range(from, to);

    if (search) {
      query = query.or('full_name.ilike.%' + search + '%,email.ilike.%' + search + '%');
    }

    const { data: visits, error, count } = await query;
    if (error) return res.status(500).json({ success: false, message: error.message });

    return res.json({
      success: true,
      visits: visits || [],
      total: count || 0,
      page: page,
      pages: Math.ceil((count || 0) / limit)
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const search = req.query.search || '';

    let query = supabase
      .from('users')
      .select('*')
      .neq('role', 'admin')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or('full_name.ilike.%' + search + '%,email.ilike.%' + search + '%');
    }

    const { data: users, error } = await query;
    if (error) return res.status(500).json({ success: false, message: error.message });

    const usersWithCounts = await Promise.all((users || []).map(async function(u) {
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

    return res.json({ success: true, users: usersWithCounts });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/users/:id/ban', async (req, res) => {
  try {
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('status')
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

    return res.json({ success: true, status: newStatus, message: 'User ' + newStatus + ' successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
