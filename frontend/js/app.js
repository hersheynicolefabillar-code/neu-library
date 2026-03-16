/* ============================================================
   neu-library/frontend/js/app.js
   Shared utilities: API wrapper, auth state, constants
   ============================================================ */

const API_BASE = 'https://neu-library-backend.onrender.com';

// ── Auth helpers ─────────────────────────────────────────────
const Auth = {
  getToken()  { return localStorage.getItem('neu_token'); },
  getUser()   { const u = localStorage.getItem('neu_user'); return u ? JSON.parse(u) : null; },
  setSession(token, user) {
    localStorage.setItem('neu_token', token);
    localStorage.setItem('neu_user', JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem('neu_token');
    localStorage.removeItem('neu_user');
  },
  isLoggedIn() { return !!this.getToken(); },
  redirect(path) { window.location.href = path; }
};

// ── API wrapper ──────────────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  const token = Auth.getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(API_BASE + endpoint, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) }
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data.message || data.errors?.[0]?.msg || `Error ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// Convenience shortcuts
const API = {
  get:   (url)          => apiFetch(url),
  post:  (url, body)    => apiFetch(url, { method: 'POST',  body: JSON.stringify(body) }),
  patch: (url, body={}) => apiFetch(url, { method: 'PATCH', body: JSON.stringify(body) }),
};

// ── UI helpers ───────────────────────────────────────────────
function showAlert(id, message, type = 'error') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = message;
  el.className = `alert alert-${type} show`;
}
function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('show');
}
function setLoading(btnId, loading, text, loadingText = 'Please wait...') {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? loadingText : text;
}

// ── Constants ────────────────────────────────────────────────
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

const COURSES_BY_COLLEGE = {
  'College of Accountancy (COA)':  ['BSA', 'BSBAIS'],
  'College of Agriculture (CA)': ['BSA'],
  'College of Arts and Sciences (CAS)': ['BAE', 'BAPS', 'BSB', 'BSPsych', 'BPA'],
  'College of Business Administration (CBA)': ['BSA-FM', 'BSA-HRDM', 'BSA-LM', 'BSA-MM', 'BSEntrep', 'BSREM'],
  'College of Communication (COC)': ['BAB', 'BAC', 'BAJ'],
  'College of Informatics and Computing Studies (CICS)': ['BSCS', 'BSIT', 'BSIS', 'BSEMC'],
  'College of Criminology': ['BSC'],
  'College of Education (CED)': ['BEED', 'BEED-PreED', 'BEED-SPED', 'BSED-MAPEH', 'BSED-Eng', 'BSED-Fil', 'BSED-Math', 'BSED-Sci', 'BSED-SS', 'BSED-TLE'],
  'College of Engineering and Architecture (CEA)': ['BS Architecture', 'BS Astronomy', 'BSCE', 'BSEE', 'BSECE', 'BSIE', 'BSME'],
  'College of Medical Technology (CMT)': ['BSMT'],
  'College of Midwifery (CMW)': ['BSM'],
  'College of Music (COM)': ['BMCC', 'BMME', 'BMP', 'BMV'],
  'College of Nursing (CON)':         ['BSN'],
  'College of Physical Therapy (CPT)': ['BSPT'],
  'College of Respiratory Therapy (CRT)': ['BSRT'],
  'Graduate School': ['MBA', 'MPA', 'MIT', 'PhD'],
};

const PURPOSES = [
  'Study',
  'Research',
  'Borrowing / Returning Books',
  'Use of Computers',
  'Group Discussion',
  'Thesis / Capstone Work',
];

// Populate a <select> element
function populateSelect(selectId, options, placeholder = 'Select...') {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  sel.innerHTML = `<option value="">${placeholder}</option>` +
    options.map(o => `<option value="${o}">${o}</option>`).join('');
}

// Short college label e.g. "CICS" from "College of Informatics and Computing Studies (CICS)"
function shortCollege(str) {
  const m = str && str.match(/\(([^)]+)\)/);
  return m ? m[1] : (str ? str.slice(0, 12) : '-');
}
