# NEU Library Visitor Management System

Full-stack web app for tracking library visitors at New Era University.
Backend: Node.js + Express + Supabase (PostgreSQL + Auth)
Frontend: React 18 + React Router v6

---

## SETUP (5 Steps)

### 1. Create Supabase Project
Go to https://supabase.com → New Project → wait for it to provision.

### 2. Run SQL Schema
Supabase Dashboard → SQL Editor → paste contents of backend/supabase_schema.sql → Run

### 3. Configure .env
Edit backend/.env with your Supabase credentials:
  SUPABASE_URL=https://your-project-id.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
Find these at: Project Settings → API

### 4. Start Backend
  cd backend
  npm install
  node seed.js       (optional — creates sample data)
  npm run dev        (runs on http://localhost:5000)

### 5. Start Frontend
  cd frontend
  npm install
  npm start          (opens http://localhost:3000)

---

## Default Accounts (after seed)
  Admin   → admin@neu.edu.ph / admin123
  Student → m.santos@neu.edu.ph / password123
  Faculty → l.bautista@neu.edu.ph / password123

---

## API Endpoints
  POST   /api/auth/register
  POST   /api/auth/login
  GET    /api/auth/me
  POST   /api/visits
  GET    /api/visits/my
  GET    /api/admin/stats?filter=day|week|month
  GET    /api/admin/logs?search=&page=1
  GET    /api/admin/users?search=
  PATCH  /api/admin/users/:id/ban
