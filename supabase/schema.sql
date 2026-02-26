-- TipstersKing Database Schema
-- Run this in your Supabase SQL Editor

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Bets table
CREATE TABLE IF NOT EXISTS bets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  event_name TEXT NOT NULL,
  selection TEXT NOT NULL,
  odds DECIMAL(10, 2) NOT NULL,
  stake DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'void')),
  profit_loss DECIMAL(10, 2),
  notes TEXT,
  sport TEXT,
  bookmaker TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  settled_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;

-- Bets policies
CREATE POLICY "Users can view their own bets"
  ON bets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view bets for public profiles"
  ON bets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = bets.user_id
    )
  );

CREATE POLICY "Users can insert their own bets"
  ON bets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bets"
  ON bets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bets"
  ON bets FOR DELETE
  USING (auth.uid() = user_id);

-- Function to calculate profit/loss on bet update
CREATE OR REPLACE FUNCTION calculate_bet_profit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'won' THEN
    NEW.profit_loss = (NEW.odds - 1) * NEW.stake;
    NEW.settled_at = NOW();
  ELSIF NEW.status = 'lost' THEN
    NEW.profit_loss = -NEW.stake;
    NEW.settled_at = NOW();
  ELSIF NEW.status = 'void' THEN
    NEW.profit_loss = 0;
    NEW.settled_at = NOW();
  ELSE
    NEW.profit_loss = NULL;
    NEW.settled_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profit calculation
CREATE TRIGGER bet_profit_trigger
  BEFORE INSERT OR UPDATE ON bets
  FOR EACH ROW
  EXECUTE FUNCTION calculate_bet_profit();

-- Index for faster queries
CREATE INDEX IF NOT EXISTS bets_user_id_idx ON bets(user_id);
CREATE INDEX IF NOT EXISTS bets_created_at_idx ON bets(created_at DESC);
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);
