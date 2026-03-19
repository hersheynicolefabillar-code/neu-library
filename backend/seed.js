require('dotenv').config();
const supabase = require('./config/db');

const COLLEGES = [
  'College of Accountancy (COA)',
  'College of Agriculture (CA)',
  'College of Arts and Sciences (CAS)',
  'College of Business Administration (CBA)',
  'College of Communication (COC)',
  'College of Informatics and Computing Studies (CICS)',
  'College of Criminology',
  'College of Education (CED)',
  'College of Engineering and Architecture (CEA)',
  'College of Medical Technology (CMT)',
  'College of Midwifery (CMW)',
  'College of Music (COM)',
  'College of Nursing (CON)',
  'College of Physical Therapy (CPT)',
  'College of Respiratory Therapy (CRT)',
  'Graduate School',
];

const PURPOSES = [
  'Study', 'Research', 'Borrowing / Returning Books',
  'Use of Computers', 'Group Discussion', 'Thesis / Capstone Work'
];

const SAMPLE_USERS = [
  { fullName: 'Maria Santos',   email: 'm.santos@neu.edu.ph',   password: 'password123', role: 'student', college: 'College of Computer Studies (CCS)', course: 'BSCS' },
  { fullName: 'Juan Dela Cruz', email: 'j.delacruz@neu.edu.ph', password: 'password123', role: 'student', college: 'College of Nursing (CON)',            course: 'BSN' },
  { fullName: 'Ana Reyes',      email: 'a.reyes@neu.edu.ph',    password: 'password123', role: 'student', college: 'College of Computer Studies (CCS)', course: 'BSIT' },
  { fullName: 'Carlo Mendoza',  email: 'c.mendoza@neu.edu.ph',  password: 'password123', role: 'student', college: 'College of Engineering (COE)',        course: 'BSCE' },
  { fullName: 'Liza Bautista',  email: 'l.bautista@neu.edu.ph', password: 'password123', role: 'faculty', college: 'College of Business and Accountancy (CBA)', course: null },
  { fullName: 'Mark Torres',    email: 'm.torres@neu.edu.ph',   password: 'password123', role: 'student', college: 'College of Computer Studies (CCS)', course: 'BSCS' },
  { fullName: 'Rina Garcia',    email: 'r.garcia@neu.edu.ph',   password: 'password123', role: 'student', college: 'College of Education (CED)',          course: 'BSED' },
  { fullName: 'Paolo Ramos',    email: 'p.ramos@neu.edu.ph',    password: 'password123', role: 'student', college: 'College of Arts and Sciences (CAS)', course: 'BSPsych', status: 'banned' },
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function createAuthUser(email, password) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (error) throw new Error(`Auth user creation failed for ${email}: ${error.message}`);
  return data.user.id;
}

const seed = async () => {
  console.log('Seeding Supabase database...\n');

  // 1. Create admin
  console.log('Creating admin account...');
  try {
    const adminId = await createAuthUser('jcesperanza@neu.edu.ph', 'jcesperanza');
    await supabase.from('users').upsert({
      id: adminId,
      email: 'jcesperanza@neu.edu.ph',
      full_name: 'Library Administrator',
      role: 'admin',
      college: 'Library',
      status: 'active'
    });
    console.log('  Admin   -> jcesperanza@neu.edu.ph / jcesperanza');
  } catch (e) {
    console.warn('Admin may already exist:', e.message);
  }

  // 2. Create sample users
  const createdIds = [];
  for (const u of SAMPLE_USERS) {
    try {
      const id = await createAuthUser(u.email, u.password);
      await supabase.from('users').upsert({
        id,
        email: u.email,
        full_name: u.fullName,
        role: u.role,
        college: u.college,
        course: u.course || null,
        status: u.status || 'active'
      });
      if (!u.status || u.status === 'active') {
        createdIds.push({ id, college: u.college, fullName: u.fullName, email: u.email });
      }
      console.log('Created: ' + u.fullName + ' (' + u.role + ')');
    } catch (e) {
      console.warn('Skipped ' + u.email + ':', e.message);
    }
  }

  // 3. Insert 30 days of sample visits
  if (createdIds.length > 0) {
    const visits = [];
    for (let day = 0; day < 30; day++) {
      const date = new Date();
      date.setDate(date.getDate() - day);
      const count = Math.floor(Math.random() * 12) + 4;
      for (let i = 0; i < count; i++) {
        const user = rand(createdIds);
        const hour = 7 + Math.floor(Math.random() * 10);
        const checkInTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, Math.floor(Math.random() * 60));
        visits.push({
          user_id: user.id,
          full_name: user.fullName,
          email: user.email,
          college: user.college,
          purpose: rand(PURPOSES),
          check_in_time: checkInTime.toISOString()
        });
      }
    }
    for (let i = 0; i < visits.length; i += 100) {
      const { error } = await supabase.from('visits').insert(visits.slice(i, i + 100));
      if (error) console.warn('Visit batch error:', error.message);
    }
    console.log(visits.length + ' sample visits inserted');
  }

  console.log('\nSeed complete!');
  console.log('  Admin   -> jcesperanza@neu.edu.ph / jcesperanza');
  console.log('  Student -> m.santos@neu.edu.ph / password123');
  console.log('  Faculty -> l.bautista@neu.edu.ph / password123');
  process.exit(0);
};

seed().catch(err => { console.error('Seed failed:', err.message); process.exit(1); });
