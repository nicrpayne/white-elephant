-- Enable realtime replication for all game tables
ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE gifts;
ALTER PUBLICATION supabase_realtime ADD TABLE game_actions;
