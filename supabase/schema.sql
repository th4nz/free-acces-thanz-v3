-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabel users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE NOT NULL,            -- ID dari Supabase Auth
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
  role TEXT DEFAULT 'user',                -- 'user' atau 'admin'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index untuk performa
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- RLS: user hanya bisa melihat/mengupdate data sendiri, admin bisa semua
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_self ON users
  FOR SELECT USING (auth.uid() = auth_id OR (SELECT role FROM users WHERE auth_id = auth.uid()) = 'admin');

CREATE POLICY users_update_self ON users
  FOR UPDATE USING (auth.uid() = auth_id);

-- Insert trigger: set default credit_reset_at
CREATE OR REPLACE FUNCTION set_credit_defaults()
RETURNS TRIGGER AS $$
BEGIN
  NEW.credits = COALESCE(NEW.credits, 3);
  NEW.credit_reset_at = COALESCE(NEW.credit_reset_at, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_credit_defaults
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION set_credit_defaults();

-- Fungsi untuk reset credit jika sudah 3 jam
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
