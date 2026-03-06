-- ============================================================
-- 004: Subscriber Account Setup
-- Adds setup_tokens table and profiles improvements
-- ============================================================

-- Setup tokens for post-purchase account creation
CREATE TABLE IF NOT EXISTS setup_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One active token per profile
  CONSTRAINT one_active_token_per_profile UNIQUE (profile_id)
);

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_setup_tokens_token ON setup_tokens(token) WHERE NOT used;
CREATE INDEX IF NOT EXISTS idx_setup_tokens_expires ON setup_tokens(expires_at) WHERE NOT used;

-- Profiles table (if not exists) - links to auth.users
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add username to profiles if column doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE profiles ADD COLUMN username TEXT UNIQUE;
  END IF;
END $$;

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at)
  VALUES (NEW.id, NEW.email, NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists, then create
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS policies for setup_tokens (admin only via service role)
ALTER TABLE setup_tokens ENABLE ROW LEVEL SECURITY;

-- Profiles RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Service role can do everything (for webhooks)
CREATE POLICY "Service role full access to profiles"
  ON profiles FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to setup_tokens"
  ON setup_tokens FOR ALL
  USING (auth.role() = 'service_role');

-- Cleanup expired tokens (can be called by cron)
CREATE OR REPLACE FUNCTION cleanup_expired_setup_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM setup_tokens
  WHERE expires_at < NOW() OR used = TRUE;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Telegram Subscriber Verification
-- ============================================================

-- Add verification fields to subscriber_profiles if not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscriber_profiles' AND column_name = 'verified_at'
  ) THEN
    ALTER TABLE subscriber_profiles ADD COLUMN verified_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscriber_profiles' AND column_name = 'verification_code'
  ) THEN
    ALTER TABLE subscriber_profiles ADD COLUMN verification_code TEXT;
  END IF;
END $$;

-- Index for verification lookup
CREATE INDEX IF NOT EXISTS idx_subscriber_verification 
  ON subscriber_profiles(verification_code) 
  WHERE verification_code IS NOT NULL;

COMMENT ON TABLE setup_tokens IS 'One-time tokens for post-purchase account password setup';
COMMENT ON TABLE profiles IS 'Public user profiles linked to auth.users';
