-- ============================================================
-- TipstersKing Marketplace Migration
-- Phase 1: Foundation Schema
-- Run this in Supabase SQL Editor (in order)
-- ============================================================

-- ============================================================
-- STEP 1: Archive old data
-- ============================================================

-- Archive old bets table (do not migrate data - lacks timestamp integrity)
ALTER TABLE IF EXISTS bets RENAME TO bets_archive;

-- Add role column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'subscriber';

-- Role values: 'subscriber' | 'tipster' | 'admin'
COMMENT ON COLUMN profiles.role IS 'User role: subscriber, tipster, or admin';

-- ============================================================
-- STEP 2: Extension tables (1-to-1 with profiles)
-- ============================================================

-- Tipster-specific data
CREATE TABLE IF NOT EXISTS tipster_profiles (
  id SERIAL PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  alias VARCHAR(50) UNIQUE,
  stripe_account_id VARCHAR(100),
  telegram_chat_id BIGINT,
  active BOOLEAN DEFAULT true,
  application_status VARCHAR(20) DEFAULT 'pending',
  application_note TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  tip_count_total INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id)
);

-- Subscriber-specific data
CREATE TABLE IF NOT EXISTS subscriber_profiles (
  id SERIAL PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  telegram_user_id BIGINT,
  telegram_username VARCHAR(100),
  subscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id)
);

-- ============================================================
-- STEP 3: Subscriptions table
-- ============================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(100) NOT NULL,
  stripe_subscription_id VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  price_amount INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'eur',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Status values: 'active' | 'cancelled' | 'past_due' | 'trialing'
COMMENT ON COLUMN subscriptions.status IS 'active, cancelled, past_due, or trialing';
COMMENT ON COLUMN subscriptions.price_amount IS 'Price in cents (e.g., 999 = €9.99)';

CREATE INDEX IF NOT EXISTS idx_subscriptions_profile_id ON subscriptions(profile_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);

-- ============================================================
-- STEP 4: Leagues table
-- ============================================================

CREATE TABLE IF NOT EXISTS leagues (
  id SERIAL PRIMARY KEY,
  api_football_id INTEGER UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  country VARCHAR(100),
  logo_url VARCHAR(255),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed launch leagues
INSERT INTO leagues (api_football_id, name, country, active) VALUES
  (140, 'La Liga', 'Spain', true),
  (39, 'Premier League', 'England', true),
  (2, 'UEFA Champions League', 'World', true),
  (3, 'UEFA Europa League', 'World', true),
  (78, 'Bundesliga', 'Germany', true),
  (135, 'Serie A', 'Italy', true),
  (61, 'Ligue 1', 'France', true),
  (88, 'Eredivisie', 'Netherlands', true),
  (94, 'Primeira Liga', 'Portugal', true),
  (71, 'Brasileirão', 'Brazil', true),
  (253, 'MLS', 'USA', true)
ON CONFLICT (api_football_id) DO NOTHING;

-- ============================================================
-- STEP 5: Matches table
-- ============================================================

CREATE TABLE IF NOT EXISTS matches (
  id SERIAL PRIMARY KEY,
  api_football_id INTEGER UNIQUE NOT NULL,
  league_id INTEGER REFERENCES leagues(id),
  home_team VARCHAR(100) NOT NULL,
  away_team VARCHAR(100) NOT NULL,
  home_team_logo VARCHAR(255),
  away_team_logo VARCHAR(255),
  kickoff_time TIMESTAMPTZ NOT NULL,
  deadline TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'upcoming',
  home_score INTEGER,
  away_score INTEGER,
  fetched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Status values: 'upcoming' | 'live' | 'finished' | 'postponed' | 'cancelled'
COMMENT ON COLUMN matches.status IS 'upcoming, live, finished, postponed, or cancelled';
COMMENT ON COLUMN matches.deadline IS 'Always kickoff_time - 60 minutes, auto-calculated';

CREATE INDEX IF NOT EXISTS idx_matches_kickoff ON matches(kickoff_time);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_league ON matches(league_id);

-- Auto-calculate deadline on insert/update
CREATE OR REPLACE FUNCTION calculate_match_deadline()
RETURNS TRIGGER AS $$
BEGIN
  NEW.deadline = NEW.kickoff_time - INTERVAL '60 minutes';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS match_deadline_trigger ON matches;
CREATE TRIGGER match_deadline_trigger
  BEFORE INSERT OR UPDATE OF kickoff_time ON matches
  FOR EACH ROW
  EXECUTE FUNCTION calculate_match_deadline();

-- ============================================================
-- STEP 6: Tips table (core anti-manipulation)
-- ============================================================

CREATE TABLE IF NOT EXISTS tips (
  id SERIAL PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  match_id INTEGER REFERENCES matches(id) NOT NULL,
  market_type VARCHAR(50) NOT NULL,
  pick VARCHAR(50) NOT NULL,
  odds DECIMAL(5,2) NOT NULL CHECK (odds BETWEEN 1.30 AND 10.00),
  tip_timestamp TIMESTAMPTZ NOT NULL,
  telegram_msg_id BIGINT,
  status VARCHAR(20) DEFAULT 'pending',
  analysis TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate tips on same match by same tipster
  UNIQUE(profile_id, match_id, market_type)
);

-- Market types: '1X2', 'over_2.5', 'under_2.5', 'btts_yes', 'btts_no', etc.
COMMENT ON COLUMN tips.market_type IS '1X2, over_2.5, under_2.5, btts_yes, btts_no, etc.';
COMMENT ON COLUMN tips.tip_timestamp IS 'Telegram SERVER timestamp only - never device time';
COMMENT ON COLUMN tips.status IS 'pending, won, lost, or void';

CREATE INDEX IF NOT EXISTS idx_tips_profile_id ON tips(profile_id);
CREATE INDEX IF NOT EXISTS idx_tips_match_id ON tips(match_id);
CREATE INDEX IF NOT EXISTS idx_tips_status ON tips(status);
CREATE INDEX IF NOT EXISTS idx_tips_timestamp ON tips(tip_timestamp);

-- CRITICAL: Prevent updates/deletes on tips (immutability)
CREATE OR REPLACE FUNCTION prevent_tip_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow status updates only (for marking won/lost/void)
  IF TG_OP = 'UPDATE' THEN
    IF OLD.profile_id != NEW.profile_id OR
       OLD.match_id != NEW.match_id OR
       OLD.market_type != NEW.market_type OR
       OLD.pick != NEW.pick OR
       OLD.odds != NEW.odds OR
       OLD.tip_timestamp != NEW.tip_timestamp OR
       OLD.telegram_msg_id != NEW.telegram_msg_id THEN
      RAISE EXCEPTION 'Tips are immutable. Only status can be updated.';
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Tips cannot be deleted.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tip_immutability_trigger ON tips;
CREATE TRIGGER tip_immutability_trigger
  BEFORE UPDATE OR DELETE ON tips
  FOR EACH ROW
  EXECUTE FUNCTION prevent_tip_modification();

-- Validate tip timestamp before deadline
CREATE OR REPLACE FUNCTION validate_tip_deadline()
RETURNS TRIGGER AS $$
DECLARE
  match_deadline TIMESTAMPTZ;
  match_status VARCHAR(20);
BEGIN
  SELECT deadline, status INTO match_deadline, match_status
  FROM matches WHERE id = NEW.match_id;
  
  IF match_status != 'upcoming' THEN
    RAISE EXCEPTION 'Cannot tip on match that is not upcoming (status: %)', match_status;
  END IF;
  
  IF NEW.tip_timestamp > match_deadline THEN
    RAISE EXCEPTION 'Tip timestamp (%) is after deadline (%)', NEW.tip_timestamp, match_deadline;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tip_deadline_validation_trigger ON tips;
CREATE TRIGGER tip_deadline_validation_trigger
  BEFORE INSERT ON tips
  FOR EACH ROW
  EXECUTE FUNCTION validate_tip_deadline();

-- ============================================================
-- STEP 7: Monthly commissions table
-- ============================================================

CREATE TABLE IF NOT EXISTS monthly_commissions (
  id SERIAL PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL,
  rank INTEGER,
  roi_pct DECIMAL(8,2),
  tip_count INTEGER,
  pool_share_pct DECIMAL(5,2),
  gross_amount DECIMAL(10,2),
  net_amount DECIMAL(10,2),
  paid_at TIMESTAMPTZ,
  stripe_payout_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One commission record per tipster per month
  UNIQUE(profile_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_commissions_period ON monthly_commissions(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_commissions_profile ON monthly_commissions(profile_id);

-- ============================================================
-- STEP 8: Free channel delay queue
-- ============================================================

CREATE TABLE IF NOT EXISTS free_channel_queue (
  id SERIAL PRIMARY KEY,
  tip_id INTEGER REFERENCES tips(id) NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  skipped BOOLEAN DEFAULT false,
  skip_reason VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_free_queue_scheduled ON free_channel_queue(scheduled_at) 
  WHERE published_at IS NULL AND skipped = false;

-- ============================================================
-- STEP 9: Row Level Security
-- ============================================================

-- Enable RLS on all new tables
ALTER TABLE tipster_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriber_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE free_channel_queue ENABLE ROW LEVEL SECURITY;

-- Tipster profiles: users can view their own, admins can view all
CREATE POLICY "Users can view own tipster profile"
  ON tipster_profiles FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own tipster profile"
  ON tipster_profiles FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update own tipster profile"
  ON tipster_profiles FOR UPDATE
  USING (profile_id = auth.uid());

-- Subscriber profiles
CREATE POLICY "Users can view own subscriber profile"
  ON subscriber_profiles FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Users can manage own subscriber profile"
  ON subscriber_profiles FOR ALL
  USING (profile_id = auth.uid());

-- Subscriptions: users see their own
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (profile_id = auth.uid());

-- Leagues: public read
CREATE POLICY "Leagues are public"
  ON leagues FOR SELECT
  USING (true);

-- Matches: public read
CREATE POLICY "Matches are public"
  ON matches FOR SELECT
  USING (true);

-- Tips: public read (for leaderboard), tipsters can insert own
CREATE POLICY "Tips are public for leaderboard"
  ON tips FOR SELECT
  USING (true);

CREATE POLICY "Tipsters can insert own tips"
  ON tips FOR INSERT
  WITH CHECK (
    profile_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN tipster_profiles tp ON tp.profile_id = p.id
      WHERE p.id = auth.uid()
      AND p.role = 'tipster'
      AND tp.application_status = 'approved'
      AND tp.active = true
    )
  );

-- Monthly commissions: users see their own, public for leaderboard
CREATE POLICY "Commissions are public"
  ON monthly_commissions FOR SELECT
  USING (true);

-- Free channel queue: service role only (no public access)
CREATE POLICY "Free queue service only"
  ON free_channel_queue FOR ALL
  USING (false);

-- ============================================================
-- STEP 10: Helper views for common queries
-- ============================================================

-- Active approved tipsters view
CREATE OR REPLACE VIEW active_tipsters AS
SELECT 
  p.id as profile_id,
  p.email,
  p.username,
  tp.id as tipster_id,
  tp.alias,
  tp.stripe_account_id,
  tp.telegram_chat_id,
  tp.tip_count_total,
  tp.approved_at
FROM profiles p
JOIN tipster_profiles tp ON tp.profile_id = p.id
WHERE p.role = 'tipster'
  AND tp.active = true
  AND tp.application_status = 'approved';

-- Upcoming matches with league info
CREATE OR REPLACE VIEW upcoming_matches AS
SELECT 
  m.*,
  l.name as league_name,
  l.country as league_country,
  l.logo_url as league_logo
FROM matches m
JOIN leagues l ON l.id = m.league_id
WHERE m.status = 'upcoming'
  AND m.kickoff_time > NOW()
  AND l.active = true
ORDER BY m.kickoff_time ASC;

-- ============================================================
-- DONE
-- ============================================================
