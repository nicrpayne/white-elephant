ALTER TABLE gifts ADD COLUMN IF NOT EXISTS position INTEGER;

CREATE INDEX IF NOT EXISTS idx_gifts_position ON gifts(session_id, position);
