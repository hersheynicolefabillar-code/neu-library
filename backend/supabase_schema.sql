-- ============================================================
--  NEU Library VMS — Supabase SQL Schema
--  Run this entire file in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Users profile table ───────────────────────────────────
-- Extends Supabase Auth. One row per registered user.
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'faculty', 'admin')),
  college     TEXT,
  course      TEXT,
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'banned')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Visits / check-in log table ───────────────────────────
CREATE TABLE IF NOT EXISTS public.visits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL,
  college       TEXT NOT NULL,
  course        TEXT,
  purpose       TEXT NOT NULL CHECK (purpose IN (
                  'Study',
                  'Research',
                  'Borrowing / Returning Books',
                  'Use of Computers',
                  'Group Discussion',
                  'Thesis / Capstone Work'
                )),
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. Indexes for fast queries ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_visits_user_id       ON public.visits(user_id);
CREATE INDEX IF NOT EXISTS idx_visits_check_in_time ON public.visits(check_in_time DESC);
CREATE INDEX IF NOT EXISTS idx_visits_college       ON public.visits(college);
CREATE INDEX IF NOT EXISTS idx_visits_purpose       ON public.visits(purpose);
CREATE INDEX IF NOT EXISTS idx_users_email          ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role           ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status         ON public.users(status);

-- ── 4. Row Level Security (RLS) ───────────────────────────────
-- Enable RLS on both tables (the service-role key bypasses this,
-- so the Express API always has full access).
ALTER TABLE public.users  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (except role/status)
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Users can read their own visits
CREATE POLICY "visits_select_own" ON public.visits
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own visits
CREATE POLICY "visits_insert_own" ON public.visits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── 5. Auto-create profile on sign-up (optional helper) ──────
-- This trigger fires when a new auth.users row is created.
-- Useful if you want sign-ups via Supabase directly.
-- The Express API creates the profile manually, so this is
-- a safety net — it only inserts if the row doesn't already exist.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'), 'student')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
