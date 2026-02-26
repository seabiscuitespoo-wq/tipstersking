-- Odds screenshot -tuki
-- Aja tämä Supabase SQL Editorissa

-- Lisää screenshot_url kenttä
ALTER TABLE bets ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Luo storage bucket kuville
INSERT INTO storage.buckets (id, name, public)
VALUES ('bet-screenshots', 'bet-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: kuka tahansa voi lukea
CREATE POLICY "Public read access for screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'bet-screenshots');

-- Storage policy: kirjautuneet voivat ladata
CREATE POLICY "Authenticated users can upload screenshots"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'bet-screenshots' 
  AND auth.role() = 'authenticated'
);

-- Storage policy: käyttäjät voivat poistaa omansa
CREATE POLICY "Users can delete own screenshots"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'bet-screenshots' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
