/* ============================================================
   neu-library/frontend/js/app.js
   Shared utilities: API wrapper, auth state, constants
   ============================================================ */

const API_BASE = 'https://neu-library-backend.onrender.com/api';

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
  'College of Computer Studies (CCS)',
  'College of Nursing (CON)',
  'College of Engineering (COE)',
  'College of Business and Accountancy (CBA)',
  'College of Education (CED)',
  'College of Arts and Sciences (CAS)',
  'College of Architecture (CAR)',
  'Graduate School',
];

const COURSES_BY_COLLEGE = {
  'College of Computer Studies (CCS)':        ['BSCS', 'BSIT', 'BSIS', 'ACT'],
  'College of Nursing (CON)':                  ['BSN'],
  'College of Engineering (COE)':              ['BSCE', 'BSEE', 'BSME', 'BSECE'],
  'College of Business and Accountancy (CBA)': ['BSA', 'BSBA', 'BSMA'],
  'College of Education (CED)':                ['BEED', 'BSED'],
  'College of Arts and Sciences (CAS)':        ['BAPS', 'BSPsych', 'ABComm'],
  'College of Architecture (CAR)':             ['BS Architecture'],
  'Graduate School':                           ['MBA', 'MPA', 'MIT', 'PhD'],
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

// Short college label e.g. "CCS" from "College of Computer Studies (CCS)"
function shortCollege(str) {
  const m = str && str.match(/\(([^)]+)\)/);
  return m ? m[1] : (str ? str.slice(0, 12) : '-');
}
