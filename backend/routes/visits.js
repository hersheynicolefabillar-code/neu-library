const express = require('express');
const router = express.Router();
const supabase = require('../config/db');
const { protect } = require('../middleware/auth');

// POST /api/visits — check in
router.post('/', protect, async (req, res) => {
  const { college, course, purpose } = req.body;

  if (!college || !purpose) {
    return res.status(400).json({ success: false, message: 'College and purpose are required' });
  }

  const validPurposes = [
    'Study', 'Research', 'Borrowing / Returning Books',
    'Use of Computers', 'Group Discussion', 'Thesis / Capstone Work'
  ];
  if (!validPurposes.includes(purpose)) {
    return res.status(400).json({ success: false, message: 'Invalid purpose value' });
  }

  try {
    const visitData = {
      user_id:    req.user.id,
      full_name:  req.user.full_name,
      email:      req.user.email,
      college,
      course:     course || null,
      purpose,
      student_id: req.user.student_id || null,
      contact:    req.user.contact    || null,
      year_level: req.user.year_level || null,
      check_in_time: new Date().toISOString()
    };

    console.log('=== CHECK-IN ===');
    console.log(JSON.stringify(visitData));

    const { data, error } = await supabase
      .from('visits')
      .insert(visitData)
      .select()
      .single();

    if (error) {
      console.log('Visit insert error:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }

    console.log('Visit saved:', data.id);
    res.status(201).json({ success: true, visit: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/visits/my — user's own visit history
router.get('/my', protect, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('visits')
      .select('*')
      .eq('user_id', req.user.id)
      .order('check_in_time', { ascending: false })
      .limit(10);

    if (error) return res.status(500).json({ success: false, message: error.message });
    res.json({ success: true, visits: data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
