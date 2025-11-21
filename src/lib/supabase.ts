import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Helper types
export interface DBGameSession {
  id: string;
  session_code: string;
  game_status: 'setup' | 'lobby' | 'active' | 'paused' | 'ended';
  active_player_id: string | null;
  round_index: number;
  max_steals_per_gift: number;
  randomize_order: boolean;
  allow_immediate_stealback: boolean;
  turn_timer_enabled: boolean;
  turn_timer_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface DBPlayer {
  id: string;
  session_id: string;
  display_name: string;
  order_index: number;
  current_gift_id: string | null;
  is_admin: boolean;
  has_completed_turn: boolean;
  joined_at: string;
}

export interface DBGift {
  id: string;
  session_id: string;
  name: string;
  image_url: string;
  link: string | null;
  description: string | null;
  status: 'hidden' | 'revealed' | 'locked' | 'stolen';
  steal_count: number;
  current_owner_id: string | null;
  created_at: string;
}

export interface DBGameAction {
  id: string;
  session_id: string;
  player_id: string | null;
  action_type: 'pick' | 'steal' | 'reveal' | 'lock';
  gift_id: string | null;
  previous_owner_id: string | null;
  created_at: string;
}
