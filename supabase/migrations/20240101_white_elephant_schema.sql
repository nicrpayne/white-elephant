-- Create game_sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code TEXT UNIQUE NOT NULL,
  game_status TEXT NOT NULL DEFAULT 'setup' CHECK (game_status IN ('setup', 'lobby', 'active', 'paused', 'ended')),
  active_player_id UUID,
  round_index INTEGER DEFAULT 0,
  max_steals_per_gift INTEGER DEFAULT 2,
  randomize_order BOOLEAN DEFAULT true,
  allow_immediate_stealback BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  current_gift_id UUID,
  is_admin BOOLEAN DEFAULT false,
  has_completed_turn BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, order_index)
);

-- Create gifts table
CREATE TABLE IF NOT EXISTS gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  link TEXT,
  description TEXT,
  status TEXT DEFAULT 'hidden' CHECK (status IN ('hidden', 'revealed', 'locked', 'stolen')),
  steal_count INTEGER DEFAULT 0,
  current_owner_id UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create game_actions table for history/audit
CREATE TABLE IF NOT EXISTS game_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('pick', 'steal', 'reveal', 'lock')),
  gift_id UUID REFERENCES gifts(id) ON DELETE SET NULL,
  previous_owner_id UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_session ON players(session_id);
CREATE INDEX IF NOT EXISTS idx_gifts_session ON gifts(session_id);
CREATE INDEX IF NOT EXISTS idx_game_actions_session ON game_actions(session_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_code ON game_sessions(session_code);

-- Add foreign key for active_player_id after players table exists
ALTER TABLE game_sessions ADD CONSTRAINT fk_active_player 
  FOREIGN KEY (active_player_id) REFERENCES players(id) ON DELETE SET NULL;

-- Add foreign key for current_gift_id
ALTER TABLE players ADD CONSTRAINT fk_current_gift 
  FOREIGN KEY (current_gift_id) REFERENCES gifts(id) ON DELETE SET NULL;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for game_sessions
CREATE TRIGGER update_game_sessions_updated_at BEFORE UPDATE ON game_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
