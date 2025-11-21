ALTER TABLE players ADD COLUMN IF NOT EXISTS avatar_seed TEXT;

UPDATE players SET avatar_seed = display_name WHERE avatar_seed IS NULL;
