-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabel users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  credits INT DEFAULT 3,
  credit_reset_at TIMESTAMPTZ DEFAULT now(),
  registered_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ,
  total_success INT DEFAULT 0,
  total_failed INT DEFAULT 0,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICY UNTUK SELECT
-- ============================================================
CREATE POLICY users_select_self ON users
  FOR SELECT USING (auth.uid() = auth_id OR (SELECT role FROM users WHERE auth_id = auth.uid()) = 'admin');

-- ============================================================
-- POLICY UNTUK UPDATE - User bisa update data mereka sendiri
-- ============================================================
CREATE POLICY users_update_self ON users
  FOR UPDATE USING (auth.uid() = auth_id);

-- ============================================================
-- POLICY UNTUK INSERT - Anon user bisa insert data mereka sendiri
-- ============================================================
CREATE POLICY users_insert_self ON users
  FOR INSERT WITH CHECK (auth.uid() = auth_id);

-- ============================================================
-- TRIGGER OTOMATIS: Buat user record saat sign up
-- Ini akan otomatis membuat entry di tabel users ketika user baru sign up
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_id, email, username, display_name)
  VALUES (
    new.id,
    new.email,
    COALESCE((new.raw_user_meta_data->>'display_name'), split_part(new.email, '@', 1)),
    COALESCE((new.raw_user_meta_data->>'display_name'), split_part(new.email, '@', 1))
  );
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Jika ada error (misalnya duplicate), log tapi jangan gagal sign up
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger jika sudah ada (untuk update schema tanpa error)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Buat trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- FUNGSI: Set default credits saat insert
-- ============================================================
CREATE OR REPLACE FUNCTION set_credit_defaults()
RETURNS TRIGGER AS $$
BEGIN
  NEW.credits = COALESCE(NEW.credits, 3);
  NEW.credit_reset_at = COALESCE(NEW.credit_reset_at, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger jika sudah ada
DROP TRIGGER IF EXISTS trg_set_credit_defaults ON users;

-- Buat trigger
CREATE TRIGGER trg_set_credit_defaults
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION set_credit_defaults();

-- ============================================================
-- FUNGSI: Reset credits setiap 3 jam
-- ============================================================
CREATE OR REPLACE FUNCTION reset_credits_if_needed(user_id UUID)
RETURNS INT AS $$
DECLARE
  last_reset TIMESTAMPTZ;
  current_credits INT;
BEGIN
  SELECT credit_reset_at, credits INTO last_reset, current_credits
  FROM users WHERE auth_id = user_id;
  
  IF last_reset IS NULL OR (NOW() - last_reset) > INTERVAL '3 hours' THEN
    UPDATE users
    SET credits = 3, credit_reset_at = NOW()
    WHERE auth_id = user_id
    RETURNING credits INTO current_credits;
  END IF;
  
  RETURN current_credits;
END;
$$ LANGUAGE plpgsql;
