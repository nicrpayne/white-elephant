import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = supabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 20,
        },
      },
      global: {
        fetch: (url, options) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);
          
          return fetch(url, {
            ...options,
            signal: controller.signal,
          }).finally(() => clearTimeout(timeoutId));
        },
      },
      db: {
        schema: 'public',
      },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    })
  : null as any;

// Utility function for retrying database operations
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.warn(`Operation failed (attempt ${attempt + 1}/${maxRetries}):`, error.message);
      
      // Don't retry on certain errors
      if (error.code === 'PGRST116' || // Not found
          error.code === '23505' || // Unique violation
          error.message?.includes('permission denied')) {
        throw error;
      }
      
      if (attempt < maxRetries - 1) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
      }
    }
  }
  
  throw lastError;
};

// Utility for batching operations
export const batchOperations = async <T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  batchSize = 5,
  delayBetweenBatches = 100
): Promise<R[]> => {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(operation));
    results.push(...batchResults);
    
    // Small delay between batches to avoid overwhelming the server
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }
  
  return results;
};

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
  is_final_round: boolean | null;
  first_player_id: string | null;
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
