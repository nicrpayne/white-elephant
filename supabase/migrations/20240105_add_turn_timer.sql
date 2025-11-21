ALTER TABLE game_sessions
ADD COLUMN turn_timer_enabled BOOLEAN DEFAULT false,
ADD COLUMN turn_timer_seconds INTEGER DEFAULT 60;