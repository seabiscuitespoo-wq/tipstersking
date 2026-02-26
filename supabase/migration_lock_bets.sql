-- Tipin lukitus: Vain status voidaan päivittää, ei muita kenttiä
-- Aja tämä Supabase SQL Editorissa

-- Poista vanha update policy
DROP POLICY IF EXISTS "Users can update their own bets" ON bets;

-- Uusi policy: Sallii vain statuksen päivityksen
CREATE POLICY "Users can only update bet status"
  ON bets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
  );

-- Trigger joka estää muiden kenttien muuttamisen
CREATE OR REPLACE FUNCTION prevent_bet_modification()
RETURNS TRIGGER AS $$
BEGIN
  -- Salli vain status-kentän muutos
  IF OLD.event_name IS DISTINCT FROM NEW.event_name OR
     OLD.selection IS DISTINCT FROM NEW.selection OR
     OLD.odds IS DISTINCT FROM NEW.odds OR
     OLD.stake IS DISTINCT FROM NEW.stake OR
     OLD.sport IS DISTINCT FROM NEW.sport OR
     OLD.bookmaker IS DISTINCT FROM NEW.bookmaker OR
     OLD.notes IS DISTINCT FROM NEW.notes OR
     OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Bets are locked after creation. Only status can be updated.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Poista vanha trigger jos on
DROP TRIGGER IF EXISTS prevent_bet_modification_trigger ON bets;

-- Luo trigger
CREATE TRIGGER prevent_bet_modification_trigger
  BEFORE UPDATE ON bets
  FOR EACH ROW
  EXECUTE FUNCTION prevent_bet_modification();

-- Lisää locked_at timestamp näyttämään milloin veto lukittiin
ALTER TABLE bets ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
