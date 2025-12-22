-- Performance indexes for handling 20+ concurrent players
-- These prevent query timeouts when loading gifts

-- Composite index for gifts filtered by session and ordered by position
CREATE INDEX IF NOT EXISTS idx_gifts_session_position ON gifts(session_id, position);

-- Index for looking up gifts by owner (used in JOINs)
CREATE INDEX IF NOT EXISTS idx_gifts_current_owner ON gifts(current_owner_id);

-- Index for players by session (for faster player loading)
CREATE INDEX IF NOT EXISTS idx_players_session_order ON players(session_id, order_index);
