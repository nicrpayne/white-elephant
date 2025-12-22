-- Atomic game action functions to prevent race conditions
-- These functions handle all updates in a single transaction

-- Pick a hidden gift (reveal and assign to player)
CREATE OR REPLACE FUNCTION pick_gift(
  p_session_id UUID,
  p_player_id UUID,
  p_gift_id UUID
) RETURNS JSON AS $$
DECLARE
  v_gift RECORD;
  v_player RECORD;
  v_session RECORD;
  v_next_player_id UUID;
  v_all_done BOOLEAN;
  v_result JSON;
BEGIN
  -- Lock the session to prevent concurrent modifications
  SELECT * INTO v_session FROM game_sessions WHERE id = p_session_id FOR UPDATE;
  
  IF v_session IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Session not found');
  END IF;
  
  IF v_session.active_player_id != p_player_id THEN
    RETURN json_build_object('success', false, 'error', 'Not your turn');
  END IF;
  
  -- Lock and check the gift
  SELECT * INTO v_gift FROM gifts WHERE id = p_gift_id AND session_id = p_session_id FOR UPDATE;
  
  IF v_gift IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Gift not found');
  END IF;
  
  IF v_gift.status != 'hidden' THEN
    RETURN json_build_object('success', false, 'error', 'Gift is not available to pick');
  END IF;
  
  -- Lock the player
  SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
  
  IF v_player.has_completed_turn AND NOT COALESCE(v_session.is_final_round, false) THEN
    RETURN json_build_object('success', false, 'error', 'You have already picked a gift this round');
  END IF;
  
  -- In final round, players can only steal - not pick new gifts
  IF COALESCE(v_session.is_final_round, false) THEN
    RETURN json_build_object('success', false, 'error', 'In the final round, you can only steal or keep your gift');
  END IF;
  
  -- Update the gift
  UPDATE gifts SET
    status = 'revealed',
    current_owner_id = p_player_id
  WHERE id = p_gift_id;
  
  -- Update the player
  UPDATE players SET
    current_gift_id = p_gift_id,
    has_completed_turn = true
  WHERE id = p_player_id;
  
  -- Log the action
  INSERT INTO game_actions (session_id, player_id, action_type, gift_id)
  VALUES (p_session_id, p_player_id, 'pick', p_gift_id);
  
  -- Check if this is the final round - if someone picks new gift, game ends
  IF COALESCE(v_session.is_final_round, false) THEN
    UPDATE game_sessions SET
      game_status = 'ended',
      active_player_id = NULL,
      is_final_round = false
    WHERE id = p_session_id;
    
    RETURN json_build_object(
      'success', true, 
      'action', 'game_ended',
      'gift_id', p_gift_id
    );
  END IF;
  
  -- Find next player who hasn't completed their turn
  SELECT id INTO v_next_player_id
  FROM players
  WHERE session_id = p_session_id
    AND has_completed_turn = false
    AND id != p_player_id
  ORDER BY order_index
  LIMIT 1;
  
  IF v_next_player_id IS NULL THEN
    -- All players have completed their initial turn - start final round
    UPDATE game_sessions SET
      is_final_round = true,
      active_player_id = v_session.first_player_id
    WHERE id = p_session_id;
    
    RETURN json_build_object(
      'success', true,
      'action', 'final_round_started',
      'gift_id', p_gift_id,
      'next_player_id', v_session.first_player_id
    );
  ELSE
    -- Move to next player
    UPDATE game_sessions SET
      active_player_id = v_next_player_id
    WHERE id = p_session_id;
    
    RETURN json_build_object(
      'success', true,
      'action', 'next_turn',
      'gift_id', p_gift_id,
      'next_player_id', v_next_player_id
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Steal a revealed gift from another player
CREATE OR REPLACE FUNCTION steal_gift(
  p_session_id UUID,
  p_player_id UUID,
  p_gift_id UUID
) RETURNS JSON AS $$
DECLARE
  v_gift RECORD;
  v_player RECORD;
  v_victim RECORD;
  v_session RECORD;
  v_stealer_old_gift_id UUID;
  v_new_steal_count INTEGER;
  v_last_steal RECORD;
BEGIN
  -- Lock the session
  SELECT * INTO v_session FROM game_sessions WHERE id = p_session_id FOR UPDATE;
  
  IF v_session IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Session not found');
  END IF;
  
  IF v_session.active_player_id != p_player_id THEN
    RETURN json_build_object('success', false, 'error', 'Not your turn');
  END IF;
  
  -- Lock and check the gift
  SELECT * INTO v_gift FROM gifts WHERE id = p_gift_id AND session_id = p_session_id FOR UPDATE;
  
  IF v_gift IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Gift not found');
  END IF;
  
  IF v_gift.status = 'hidden' THEN
    RETURN json_build_object('success', false, 'error', 'Cannot steal a hidden gift');
  END IF;
  
  IF v_gift.status = 'locked' OR v_gift.steal_count >= v_session.max_steals_per_gift THEN
    RETURN json_build_object('success', false, 'error', 'This gift is locked and cannot be stolen');
  END IF;
  
  IF v_gift.current_owner_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Gift has no owner to steal from');
  END IF;
  
  IF v_gift.current_owner_id = p_player_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot steal your own gift');
  END IF;
  
  -- Lock the stealing player
  SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
  
  IF v_player.has_completed_turn AND NOT COALESCE(v_session.is_final_round, false) THEN
    RETURN json_build_object('success', false, 'error', 'You have already taken your turn this round');
  END IF;
  
  -- Check for immediate steal-back prevention
  IF NOT v_session.allow_immediate_stealback THEN
    SELECT * INTO v_last_steal
    FROM game_actions
    WHERE session_id = p_session_id
      AND gift_id = p_gift_id
      AND action_type = 'steal'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_last_steal IS NOT NULL AND v_last_steal.previous_owner_id = p_player_id THEN
      RETURN json_build_object('success', false, 'error', 'Cannot immediately steal back a gift that was just stolen from you');
    END IF;
  END IF;
  
  -- Lock the victim
  SELECT * INTO v_victim FROM players WHERE id = v_gift.current_owner_id FOR UPDATE;
  
  -- Calculate new steal count
  v_new_steal_count := v_gift.steal_count + 1;
  v_stealer_old_gift_id := v_player.current_gift_id;
  
  -- Log the steal action
  INSERT INTO game_actions (session_id, player_id, action_type, gift_id, previous_owner_id)
  VALUES (p_session_id, p_player_id, 'steal', p_gift_id, v_gift.current_owner_id);
  
  -- Update the stolen gift
  UPDATE gifts SET
    current_owner_id = p_player_id,
    steal_count = v_new_steal_count,
    status = CASE WHEN v_new_steal_count >= v_session.max_steals_per_gift THEN 'locked' ELSE 'revealed' END
  WHERE id = p_gift_id;
  
  -- If stealer had a gift (final round swap), transfer it to victim
  IF v_stealer_old_gift_id IS NOT NULL THEN
    UPDATE gifts SET
      current_owner_id = v_gift.current_owner_id
    WHERE id = v_stealer_old_gift_id;
    
    UPDATE players SET
      current_gift_id = v_stealer_old_gift_id,
      has_completed_turn = false
    WHERE id = v_gift.current_owner_id;
  ELSE
    UPDATE players SET
      current_gift_id = NULL,
      has_completed_turn = false
    WHERE id = v_gift.current_owner_id;
  END IF;
  
  -- Update stealer
  UPDATE players SET
    current_gift_id = p_gift_id,
    has_completed_turn = true
  WHERE id = p_player_id;
  
  -- The victim gets the next turn
  UPDATE game_sessions SET
    active_player_id = v_gift.current_owner_id
  WHERE id = p_session_id;
  
  RETURN json_build_object(
    'success', true,
    'action', 'stolen',
    'gift_id', p_gift_id,
    'gift_name', v_gift.name,
    'previous_owner_id', v_gift.current_owner_id,
    'steals_remaining', v_session.max_steals_per_gift - v_new_steal_count,
    'is_locked', v_new_steal_count >= v_session.max_steals_per_gift,
    'next_player_id', v_gift.current_owner_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Keep current gift (ends the game in final round)
CREATE OR REPLACE FUNCTION keep_gift(
  p_session_id UUID,
  p_player_id UUID
) RETURNS JSON AS $$
DECLARE
  v_session RECORD;
  v_player RECORD;
BEGIN
  -- Lock the session
  SELECT * INTO v_session FROM game_sessions WHERE id = p_session_id FOR UPDATE;
  
  IF v_session IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Session not found');
  END IF;
  
  IF v_session.active_player_id != p_player_id THEN
    RETURN json_build_object('success', false, 'error', 'Not your turn');
  END IF;
  
  IF NOT COALESCE(v_session.is_final_round, false) THEN
    RETURN json_build_object('success', false, 'error', 'Can only keep gift during final round');
  END IF;
  
  -- Verify player actually has a gift to keep
  SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
  
  IF v_player.current_gift_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'You do not have a gift to keep');
  END IF;
  
  -- End the game
  UPDATE game_sessions SET
    game_status = 'ended',
    active_player_id = NULL,
    is_final_round = false
  WHERE id = p_session_id;
  
  RETURN json_build_object(
    'success', true,
    'action', 'game_ended',
    'reason', 'player_kept_gift'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create storage bucket for gift images if it doesn't exist
-- Note: This needs to be run separately as it's a storage API call, not SQL
-- The bucket should be created via Supabase dashboard or API
