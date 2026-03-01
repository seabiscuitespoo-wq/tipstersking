-- ============================================================
-- TipstersKing: Tipster Applications Table
-- ============================================================

-- Store application data separately from tipster_profiles
-- This allows tracking full application history and details
CREATE TABLE IF NOT EXISTS tipster_applications (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  alias VARCHAR(50) NOT NULL,
  telegram_username VARCHAR(100) NOT NULL,
  leagues TEXT[] NOT NULL,
  experience TEXT NOT NULL,
  track_record_url VARCHAR(500),
  
  -- Application status
  status VARCHAR(20) DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  
  -- If approved, links to the created profile
  profile_id UUID REFERENCES profiles(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Status values: 'pending' | 'approved' | 'rejected'
COMMENT ON COLUMN tipster_applications.status IS 'pending, approved, or rejected';
COMMENT ON COLUMN tipster_applications.leagues IS 'Array of league names the applicant specializes in';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_applications_status ON tipster_applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_email ON tipster_applications(email);
CREATE INDEX IF NOT EXISTS idx_applications_created ON tipster_applications(created_at DESC);

-- Enable RLS
ALTER TABLE tipster_applications ENABLE ROW LEVEL SECURITY;

-- Policies: anyone can insert (apply), only admins can read/update
CREATE POLICY "Anyone can submit application"
  ON tipster_applications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view applications"
  ON tipster_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update applications"
  ON tipster_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_application_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS application_updated_at ON tipster_applications;
CREATE TRIGGER application_updated_at
  BEFORE UPDATE ON tipster_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_application_timestamp();
