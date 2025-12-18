import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { supabase, DBGameSession, DBPlayer, DBGift } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";
import { storeSession, getStoredSession, clearStoredSession, refreshSessionTimestamp } from "@/lib/sessionStorage";

// Helper function to generate an 8-character session code
const generateSessionCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

interface Gift {
  id: string;
  name: string;
  imageUrl: string;
  link?: string;
  description?: string;
  status: "hidden" | "revealed" | "locked" | "stolen";
  stealCount: number;
  currentOwnerId: string | null;
  ownerName?: string;
  ownerAvatarSeed?: string;
}

interface Player {
  id: string;
  displayName: string;
  orderIndex: number;
  joinTime: string;
  currentGiftId: string | null;
  isAdmin: boolean;
  hasCompletedTurn: boolean;
  avatarSeed: string;
}

interface GameConfig {
  maxStealsPerGift: number;
  randomizeOrder: boolean;
  allowImmediateStealback: boolean;
  turnTimerEnabled: boolean;
  turnTimerSeconds: number;
}

interface GameState {
  sessionId: string | null;
  sessionCode: string;
  gifts: Gift[];
  players: Player[];
  gameStatus: "setup" | "lobby" | "active" | "paused" | "ended";
  activePlayerId: string | null;
  roundIndex: number;
  gameConfig: GameConfig;
  isFinalRound: boolean;
  firstPlayerId: string | null;
}

interface GameContextType {
  gameState: GameState;
  isLoading: boolean;
  createSession: () => Promise<string>;
  joinSession: (sessionCode: string, displayName: string) => Promise<string>;
  restoreSession: () => Promise<{ restored: boolean; sessionCode?: string; playerId?: string; isAdmin?: boolean }>;
  restoreSessionFromUrl: (sessionCode: string, playerId: string) => Promise<{ restored: boolean; sessionCode?: string; playerId?: string }>;
  clearSession: () => void;
  getStoredSessionInfo: () => { sessionCode: string; playerId: string | null; isAdmin: boolean } | null;
  addGift: (gift: Omit<Gift, 'id' | 'status' | 'stealCount' | 'currentOwnerId'>) => Promise<void>;
  addGiftsBatch: (gifts: Omit<Gift, 'id' | 'status' | 'stealCount' | 'currentOwnerId'>[]) => Promise<void>;
  removeGift: (giftId: string) => Promise<void>;
  updateGift: (giftId: string, updates: Partial<Gift>) => Promise<void>;
  updateGameStatus: (status: GameState['gameStatus']) => Promise<void>;
  updateGameConfig: (config: Partial<GameConfig>) => Promise<void>;
  startGame: () => Promise<void>;
  pickGift: (giftId: string) => Promise<void>;
  stealGift: (giftId: string) => Promise<void>;
  keepGift: () => Promise<void>;
  setGifts: (gifts: Gift[]) => void;
  setPlayers: (players: Player[]) => void;
  setGameStatus: (status: GameState['gameStatus']) => void;
  setActivePlayerId: (playerId: string | null) => void;
  setRoundIndex: (round: number) => void;
  setGameConfig: (config: GameConfig) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => Promise<void>;
  loadPlayers: (sessionId: string) => Promise<void>;
  loadGifts: (sessionId: string) => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [gameState, setGameState] = useState<GameState>({
    sessionId: null,
    sessionCode: generateSessionCode(),
    gifts: [],
    players: [],
    gameStatus: "setup",
    activePlayerId: null,
    roundIndex: 0,
    gameConfig: {
      maxStealsPerGift: 2,
      randomizeOrder: true,
      allowImmediateStealback: false,
      turnTimerEnabled: false,
      turnTimerSeconds: 60,
    },
    isFinalRound: false,
    firstPlayerId: null,
  });

  const [isLoading, setIsLoading] = useState(true); // Start as true to handle initial session check
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);
  
  // Track previous gift states to detect changes
  const previousGiftsRef = useRef<Map<string, { status: string; ownerId: string | null }>>(new Map());

  // Subscribe to real-time updates when sessionId changes
  useEffect(() => {
    if (!gameState.sessionId) return;

    console.log('Setting up real-time subscription for session:', gameState.sessionId);

    const channel = supabase
      .channel(`game:${gameState.sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `session_id=eq.${gameState.sessionId}`,
        },
        (payload) => {
          console.log('Players table changed:', payload);
          // Load players without await to prevent blocking
          loadPlayers(gameState.sessionId!).catch(err => 
            console.error('Error loading players after change:', err)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gifts',
          filter: `session_id=eq.${gameState.sessionId}`,
        },
        (payload) => {
          console.log('Gifts table changed:', payload);
          
          // Check if a gift was just revealed (picked) or stolen
          if (payload.eventType === 'UPDATE') {
            const newGift = payload.new as DBGift;
            
            // Get previous state from our ref
            const prevState = previousGiftsRef.current.get(newGift.id);
            
            console.log('Gift update - prev:', prevState, 'new:', { status: newGift.status, ownerId: newGift.current_owner_id });
            
            // Gift was just revealed (picked from hidden)
            if (prevState && prevState.status === 'hidden' && newGift.status === 'revealed') {
              console.log('🎵 Dispatching giftPickedSound event');
              window.dispatchEvent(new CustomEvent('giftPickedSound', { 
                detail: { giftId: newGift.id } 
              }));
            }
            
            // Gift was stolen (owner changed on a revealed gift)
            if (prevState && newGift.status === 'revealed' && 
                prevState.ownerId && 
                newGift.current_owner_id && 
                prevState.ownerId !== newGift.current_owner_id) {
              console.log('🎭 Dispatching giftStolenSound event');
              window.dispatchEvent(new CustomEvent('giftStolenSound', { 
                detail: { giftId: newGift.id } 
              }));
            }
            
            // Update previous state
            previousGiftsRef.current.set(newGift.id, {
              status: newGift.status,
              ownerId: newGift.current_owner_id
            });
          }
          
          loadGifts(gameState.sessionId!).catch(err => 
            console.error('Error loading gifts after change:', err)
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${gameState.sessionId}`,
        },
        (payload) => {
          console.log('Game session changed:', payload);
          const newData = payload.new as DBGameSession;
          const oldData = payload.old as DBGameSession;
          
          // Check if active player changed
          if (newData.active_player_id !== oldData.active_player_id && newData.active_player_id) {
            // Dispatch custom event for turn change
            window.dispatchEvent(new CustomEvent('turnChanged', { 
              detail: { 
                newPlayerId: newData.active_player_id,
                oldPlayerId: oldData.active_player_id 
              } 
            }));
          }
          
          loadSession(gameState.sessionId!).catch(err => 
            console.error('Error loading session after change:', err)
          );
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to real-time updates');
        }
      });

    setRealtimeChannel(channel);

    return () => {
      console.log('Unsubscribing from real-time channel');
      channel.unsubscribe();
    };
  }, [gameState.sessionId]);

  // Load session data
  const loadSession = async (sessionId: string) => {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (!error && data) {
      const session = data as DBGameSession;
      setGameState(prev => ({
        ...prev,
        sessionCode: session.session_code,
        gameStatus: session.game_status,
        activePlayerId: session.active_player_id,
        roundIndex: session.round_index,
        isFinalRound: session.is_final_round ?? false,
        firstPlayerId: session.first_player_id ?? null,
        gameConfig: {
          maxStealsPerGift: session.max_steals_per_gift,
          randomizeOrder: session.randomize_order,
          allowImmediateStealback: session.allow_immediate_stealback,
          turnTimerEnabled: session.turn_timer_enabled ?? false,
          turnTimerSeconds: session.turn_timer_seconds ?? 60,
        },
      }));
    }
  };

  // Load players
  const loadPlayers = async (sessionId: string) => {
    console.log('Loading players for session:', sessionId);
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('session_id', sessionId)
      .order('order_index');

    if (!error && data) {
      console.log('Players loaded:', data);
      const players: Player[] = data.map((p: any) => ({
        id: p.id,
        displayName: p.display_name,
        orderIndex: p.order_index,
        joinTime: p.joined_at,
        currentGiftId: p.current_gift_id,
        isAdmin: p.is_admin,
        hasCompletedTurn: p.has_completed_turn,
        avatarSeed: p.avatar_seed,
      }));
      setGameState(prev => ({ ...prev, players }));
    } else if (error) {
      console.error('Error loading players:', error);
    }
  };

  // Load gifts
  const loadGifts = async (sessionId: string) => {
    console.log('Loading gifts for session:', sessionId);
    const { data, error } = await supabase
      .from('gifts')
      .select(`
        *,
        owner:players!gifts_current_owner_id_fkey(display_name, avatar_seed)
      `)
      .eq('session_id', sessionId)
      .order('position', { nullsFirst: false })
      .order('created_at');

    if (!error && data) {
      console.log('Gifts loaded from DB:', data);
      console.log('Number of gifts:', data.length);
      console.log('First gift (if any):', data[0]);
      
      const gifts: Gift[] = data.map((g: any) => {
        console.log('Mapping gift:', g);
        return {
          id: g.id,
          name: g.name,
          imageUrl: g.image_url,
          link: g.link || undefined,
          description: g.description || undefined,
          status: g.status,
          stealCount: g.steal_count,
          currentOwnerId: g.current_owner_id,
          ownerName: g.owner?.display_name || undefined,
          ownerAvatarSeed: g.owner?.avatar_seed || undefined,
        };
      });
      console.log('Mapped gifts array:', gifts);
      console.log('Setting gifts in state:', gifts);
      
      // Update previous gifts ref for sound detection
      gifts.forEach(gift => {
        previousGiftsRef.current.set(gift.id, {
          status: gift.status,
          ownerId: gift.currentOwnerId
        });
      });
      
      setGameState(prev => ({ ...prev, gifts }));
    } else if (error) {
      console.error('Error loading gifts:', error);
    }
  };

  // Create a new game session with retry logic
  const createSession = async (retryCount = 0): Promise<string> => {
    setIsLoading(true);
    try {
      const sessionCode = generateSessionCode();
      
      console.log('Creating session with code:', sessionCode);
      
      const { data, error } = await supabase
        .from('game_sessions')
        .insert({
          session_code: sessionCode,
          game_status: 'setup',
          max_steals_per_gift: gameState.gameConfig.maxStealsPerGift,
          randomize_order: gameState.gameConfig.randomizeOrder,
          allow_immediate_stealback: gameState.gameConfig.allowImmediateStealback,
          turn_timer_enabled: gameState.gameConfig.turnTimerEnabled,
          turn_timer_seconds: gameState.gameConfig.turnTimerSeconds,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating session:', error);
        
        // Retry up to 2 times on network errors
        if (retryCount < 2 && (error.message?.includes('Load failed') || error.message?.includes('network'))) {
          console.log(`Retrying session creation (attempt ${retryCount + 1}/2)...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          return createSession(retryCount + 1);
        }
        
        throw error;
      }
      
      console.log('Session created successfully:', data);

      const session = data as DBGameSession;
      setGameState(prev => ({
        ...prev,
        sessionId: session.id,
        sessionCode: session.session_code,
      }));

      // Load initial data for the new session
      await loadGifts(session.id);
      await loadPlayers(session.id);

      // Store admin session in localStorage for persistence across refreshes
      storeSession({
        sessionId: session.id,
        sessionCode: session.session_code,
        playerId: null,
        isAdmin: true,
        displayName: null,
      });

      return session.id;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Join an existing session
  const joinSession = async (sessionCode: string, displayName: string, avatarSeed?: string): Promise<string> => {
    setIsLoading(true);
    try {
      // Find session by code
      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('session_code', sessionCode.toUpperCase())
        .single();

      if (sessionError || !sessionData) {
        throw new Error('Game not found');
      }

      const session = sessionData as DBGameSession;

      if (session.game_status !== 'lobby') {
        throw new Error('Game is not accepting players');
      }

      // Get current player count
      const { count } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', session.id);

      // Generate a unique avatar seed for this player (or use provided one)
      const finalAvatarSeed = avatarSeed || `${displayName}-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // Add player
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .insert({
          session_id: session.id,
          display_name: displayName,
          order_index: (count || 0) + 1,
          is_admin: false,
          avatar_seed: finalAvatarSeed,
        })
        .select()
        .single();

      if (playerError) throw playerError;

      setGameState(prev => ({
        ...prev,
        sessionId: session.id,
        sessionCode: session.session_code,
      }));

      // Load all session data
      await loadSession(session.id);
      await loadPlayers(session.id);
      await loadGifts(session.id);

      // Store session in localStorage for persistence across refreshes
      storeSession({
        sessionId: session.id,
        sessionCode: session.session_code,
        playerId: playerData.id,
        isAdmin: false,
        displayName: displayName,
      });

      return playerData.id;
    } catch (error) {
      console.error('Error joining session:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Restore session from localStorage
  const restoreSession = async (): Promise<{ restored: boolean; sessionCode?: string; playerId?: string; isAdmin?: boolean }> => {
    const stored = getStoredSession();
    if (!stored) {
      return { restored: false };
    }

    setIsLoading(true);
    try {
      // Verify the session still exists and is valid
      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('id', stored.sessionId)
        .single();

      if (sessionError || !sessionData) {
        console.log('Stored session no longer exists, clearing...');
        clearStoredSession();
        return { restored: false };
      }

      const session = sessionData as DBGameSession;

      // If the session has ended, clear it
      if (session.game_status === 'ended') {
        console.log('Stored session has ended, clearing...');
        clearStoredSession();
        return { restored: false };
      }

      // If player session, verify player still exists
      if (stored.playerId && !stored.isAdmin) {
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .select('*')
          .eq('id', stored.playerId)
          .single();

        if (playerError || !playerData) {
          console.log('Stored player no longer exists, clearing...');
          clearStoredSession();
          return { restored: false };
        }
      }

      // Session is valid, load it
      setGameState(prev => ({
        ...prev,
        sessionId: session.id,
        sessionCode: session.session_code,
      }));

      await loadSession(session.id);
      await loadPlayers(session.id);
      await loadGifts(session.id);

      // Refresh the session timestamp
      refreshSessionTimestamp();

      console.log('Session restored successfully:', stored.sessionCode);
      return { 
        restored: true, 
        sessionCode: stored.sessionCode,
        playerId: stored.playerId || undefined,
        isAdmin: stored.isAdmin,
      };
    } catch (error) {
      console.error('Error restoring session:', error);
      clearStoredSession();
      return { restored: false };
    } finally {
      setIsLoading(false);
    }
  };

  // Restore session from URL parameters (sessionCode + playerId)
  // This is used when a player refreshes and has URL params but no localStorage
  const restoreSessionFromUrl = async (sessionCode: string, playerId: string): Promise<{ restored: boolean; sessionCode?: string; playerId?: string }> => {
    setIsLoading(true);
    try {
      console.log('Attempting to restore session from URL:', { sessionCode, playerId });
      
      // Find session by code
      const { data: sessionData, error: sessionError } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('session_code', sessionCode.toUpperCase())
        .single();

      if (sessionError || !sessionData) {
        console.log('Session not found for code:', sessionCode);
        return { restored: false };
      }

      const session = sessionData as DBGameSession;

      // Check if session has ended
      if (session.game_status === 'ended') {
        console.log('Session has ended');
        return { restored: false };
      }

      // Verify player exists in this session
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .eq('session_id', session.id)
        .single();

      if (playerError || !playerData) {
        console.log('Player not found in session:', playerId);
        return { restored: false };
      }

      const player = playerData as DBPlayer;

      // Session and player are valid, load everything
      setGameState(prev => ({
        ...prev,
        sessionId: session.id,
        sessionCode: session.session_code,
        currentPlayerId: playerId,
      }));

      await loadSession(session.id);
      await loadPlayers(session.id);
      await loadGifts(session.id);

      // Store session in localStorage for future refreshes
      storeSession({
        sessionId: session.id,
        sessionCode: session.session_code,
        playerId: playerId,
        isAdmin: player.is_admin ?? false,
        displayName: player.display_name,
      });

      console.log('Session restored from URL successfully');
      return { 
        restored: true, 
        sessionCode: session.session_code,
        playerId: playerId,
      };
    } catch (error) {
      console.error('Error restoring session from URL:', error);
      return { restored: false };
    } finally {
      setIsLoading(false);
    }
  };

  // Clear stored session
  const clearSession = (): void => {
    clearStoredSession();
    setGameState({
      sessionId: null,
      sessionCode: generateSessionCode(),
      gifts: [],
      players: [],
      gameStatus: "setup",
      activePlayerId: null,
      roundIndex: 0,
      gameConfig: {
        maxStealsPerGift: 2,
        randomizeOrder: true,
        allowImmediateStealback: false,
        turnTimerEnabled: false,
        turnTimerSeconds: 60,
      },
      isFinalRound: false,
      firstPlayerId: null,
    });
  };

  // Get stored session info without restoring
  const getStoredSessionInfo = (): { sessionCode: string; playerId: string | null; isAdmin: boolean } | null => {
    const stored = getStoredSession();
    if (!stored) return null;
    return {
      sessionCode: stored.sessionCode,
      playerId: stored.playerId,
      isAdmin: stored.isAdmin,
    };
  };

  // Add gift
  const addGift = async (gift: Omit<Gift, 'id' | 'status' | 'stealCount' | 'currentOwnerId'>) => {
    let sessionId = gameState.sessionId;
    
    if (!sessionId) {
      console.log('No session ID, creating new session...');
      sessionId = await createSession();
    }

    console.log('Adding gift to session:', sessionId, gift);

    // Get next position
    const { data: maxPosData } = await supabase
      .from('gifts')
      .select('position')
      .eq('session_id', sessionId)
      .order('position', { ascending: false })
      .limit(1);
    
    const nextPosition = (maxPosData?.[0]?.position ?? 0) + 1;

    const giftData = {
      session_id: sessionId,
      name: gift.name,
      image_url: gift.imageUrl,
      link: gift.link || null,
      description: gift.description || null,
      status: 'hidden',
      steal_count: 0,
      position: nextPosition,
    };
    
    console.log('Inserting gift data:', giftData);

    const { data, error } = await supabase.from('gifts').insert(giftData).select();

    if (error) {
      console.error('Supabase error adding gift:', error);
      throw error;
    }
    
    console.log('Gift added successfully, returned data:', data);

    // Don't reload here - let the realtime subscription handle it
    // This prevents race conditions when adding multiple gifts
  };

  // Batch add gifts - more reliable for bulk operations
  const addGiftsBatch = async (gifts: Omit<Gift, 'id' | 'status' | 'stealCount' | 'currentOwnerId'>[], retryCount = 0) => {
    let sessionId = gameState.sessionId;
    
    if (!sessionId) {
      console.log('No session ID, creating new session...');
      sessionId = await createSession();
    }

    console.log('Batch adding gifts to session:', sessionId, gifts.length);

    // Get next position
    const { data: maxPosData } = await supabase
      .from('gifts')
      .select('position')
      .eq('session_id', sessionId)
      .order('position', { ascending: false })
      .limit(1);
    
    const startPosition = (maxPosData?.[0]?.position ?? 0) + 1;

    const giftsData = gifts.map((gift, index) => ({
      session_id: sessionId,
      name: gift.name,
      image_url: gift.imageUrl,
      link: gift.link || null,
      description: gift.description || null,
      status: 'hidden',
      steal_count: 0,
      position: startPosition + index,
    }));
    
    console.log('Batch inserting gift data:', giftsData);

    const { data, error } = await supabase.from('gifts').insert(giftsData).select();

    if (error) {
      console.error('Supabase error batch adding gifts:', error);
      
      // Retry up to 2 times on network errors
      if (retryCount < 2 && (error.message?.includes('Load failed') || error.message?.includes('network'))) {
        console.log(`Retrying batch add (attempt ${retryCount + 1}/2)...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        return addGiftsBatch(gifts, retryCount + 1);
      }
      
      throw error;
    }
    
    console.log('Gifts batch added successfully, count:', data?.length);

    // Manually reload to ensure we have the latest data
    await loadGifts(sessionId);
  };

  // Remove gift
  const removeGift = async (giftId: string) => {
    const { error } = await supabase.from('gifts').delete().eq('id', giftId);

    if (error) {
      console.error('Error removing gift:', error);
      throw error;
    }

    // Manually refresh gifts list (realtime subscription will also update)
    if (gameState.sessionId) {
      await loadGifts(gameState.sessionId);
    }
  };

  // Update gift
  const updateGift = async (giftId: string, updates: Partial<Gift>) => {
    const dbUpdates: Record<string, any> = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.imageUrl) dbUpdates.image_url = updates.imageUrl;
    if (updates.link !== undefined) dbUpdates.link = updates.link || null;
    if (updates.description !== undefined) dbUpdates.description = updates.description || null;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.stealCount !== undefined) dbUpdates.steal_count = updates.stealCount;
    if (updates.currentOwnerId !== undefined) dbUpdates.current_owner_id = updates.currentOwnerId;

    const { error } = await supabase.from('gifts').update(dbUpdates).eq('id', giftId);

    if (error) {
      console.error('Error updating gift:', error);
      throw error;
    }

    // Manually refresh gifts list (realtime subscription will also update)
    if (gameState.sessionId) {
      await loadGifts(gameState.sessionId);
    }
  };

  // Update game status
  const updateGameStatus = async (status: GameState['gameStatus']) => {
    if (!gameState.sessionId) return;

    const { error } = await supabase
      .from('game_sessions')
      .update({ game_status: status })
      .eq('id', gameState.sessionId);

    if (error) {
      console.error('Error updating game status:', error);
      throw error;
    }

    // Clear stored session when game ends (players will need to join a new game)
    // Note: We don't clear admin sessions as they may want to view reports
    if (status === 'ended') {
      const stored = getStoredSession();
      if (stored && !stored.isAdmin) {
        // Keep player session for a bit so they can see final results
        // It will auto-expire or be cleared when they join a new game
      }
    }
  };

  // Update game config
  const updateGameConfig = async (config: Partial<GameConfig>) => {
    if (!gameState.sessionId) return;

    const updates: Record<string, any> = {};
    if (config.maxStealsPerGift !== undefined) updates.max_steals_per_gift = config.maxStealsPerGift;
    if (config.randomizeOrder !== undefined) updates.randomize_order = config.randomizeOrder;
    if (config.allowImmediateStealback !== undefined) updates.allow_immediate_stealback = config.allowImmediateStealback;
    if (config.turnTimerEnabled !== undefined) updates.turn_timer_enabled = config.turnTimerEnabled;
    if (config.turnTimerSeconds !== undefined) updates.turn_timer_seconds = config.turnTimerSeconds;

    const { error } = await supabase
      .from('game_sessions')
      .update(updates)
      .eq('id', gameState.sessionId);

    if (error) {
      console.error('Error updating game config:', error);
      throw error;
    }
  };

  // Start game
  const startGame = async () => {
    if (!gameState.sessionId) return;

    try {
      const { data: players } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', gameState.sessionId)
        .order('order_index');

      if (!players || players.length < 2) {
        throw new Error('Need at least 2 players to start');
      }

      console.log('Original player order:', players.map(p => ({ name: p.display_name, order: p.order_index })));

      // Randomize if configured
      if (gameState.gameConfig.randomizeOrder) {
        console.log('Randomizing player order...');
        const shuffled = [...players].sort(() => Math.random() - 0.5);
        console.log('Shuffled order:', shuffled.map(p => ({ name: p.display_name, oldOrder: p.order_index })));
        
        for (let i = 0; i < shuffled.length; i++) {
          await supabase
            .from('players')
            .update({ order_index: i + 1 })
            .eq('id', shuffled[i].id);
        }
        
        // Reload players after randomization to get updated order
        const { data: updatedPlayers } = await supabase
          .from('players')
          .select('*')
          .eq('session_id', gameState.sessionId)
          .order('order_index');
        
        console.log('New randomized order:', updatedPlayers?.map(p => ({ name: p.display_name, order: p.order_index })));
        
        if (updatedPlayers) {
          const firstPlayer = updatedPlayers[0];
          console.log('First player to go:', firstPlayer.display_name);
          
          await supabase
            .from('game_sessions')
            .update({
              game_status: 'active',
              active_player_id: firstPlayer.id,
              first_player_id: firstPlayer.id,
              is_final_round: false,
            })
            .eq('id', gameState.sessionId);
        }
      } else {
        // Set first player as active (no randomization)
        const firstPlayer = players[0];
        console.log('No randomization - first player:', firstPlayer.display_name);

        await supabase
          .from('game_sessions')
          .update({
            game_status: 'active',
            active_player_id: firstPlayer.id,
            first_player_id: firstPlayer.id,
            is_final_round: false,
          })
          .eq('id', gameState.sessionId);
      }

      // The real-time subscriptions will automatically update the state
    } catch (error) {
      console.error('Error starting game:', error);
      throw error;
    }
  };

  // Pick a hidden gift
  const pickGift = async (giftId: string) => {
    if (!gameState.sessionId || !gameState.activePlayerId) return;

    try {
      // Check if current player has already completed their turn (but allow in final round)
      const currentPlayer = gameState.players.find(p => p.id === gameState.activePlayerId);
      if (currentPlayer?.hasCompletedTurn && !gameState.isFinalRound) {
        console.log('Player has already completed their turn');
        throw new Error('You have already picked a gift this round');
      }

      // Update gift status to revealed and assign to current player
      await supabase
        .from('gifts')
        .update({
          status: 'revealed',
          current_owner_id: gameState.activePlayerId,
        })
        .eq('id', giftId);

      // Play jingle sound for gift picking
      console.log('🎵 pickGift: Dispatching giftPickedSound event for gift:', giftId);
      window.dispatchEvent(new CustomEvent('giftPickedSound', { detail: { giftId } }));

      // Update player's current gift
      await supabase
        .from('players')
        .update({
          current_gift_id: giftId,
          has_completed_turn: true,
        })
        .eq('id', gameState.activePlayerId);

      // If we're in the final round and someone picks a new gift, the game ends
      if (gameState.isFinalRound) {
        console.log('Final round: Player picked a new gift, game ends');
        await supabase
          .from('game_sessions')
          .update({
            game_status: 'ended',
            active_player_id: null,
            is_final_round: false,
          })
          .eq('id', gameState.sessionId);
        return;
      }

      // Find next player who hasn't completed their turn
      // Reload players to get fresh data
      const { data: players } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', gameState.sessionId)
        .order('order_index');

      if (!players) return;

      // Find next player who hasn't completed their initial turn
      const currentPlayerIndex = players.findIndex(p => p.id === gameState.activePlayerId);
      let nextPlayerId = null;

      // Look for next player who hasn't completed turn (starting from current position)
      for (let i = 1; i <= players.length; i++) {
        const checkIndex = (currentPlayerIndex + i) % players.length;
        const player = players[checkIndex];
        if (!player.has_completed_turn) {
          nextPlayerId = player.id;
          break;
        }
      }

      // If all players have completed their turn, start the final round
      // The first player gets one more chance to steal or keep their gift
      if (!nextPlayerId) {
        // Get the session to find the first player
        const { data: session } = await supabase
          .from('game_sessions')
          .select('first_player_id')
          .eq('id', gameState.sessionId)
          .single();

        if (session?.first_player_id) {
          console.log('All players done - starting final round for first player');
          await supabase
            .from('game_sessions')
            .update({
              is_final_round: true,
              active_player_id: session.first_player_id,
            })
            .eq('id', gameState.sessionId);
          
          // Dispatch event for final round notification
          window.dispatchEvent(new CustomEvent('finalRoundStarted', { 
            detail: { firstPlayerId: session.first_player_id } 
          }));
        } else {
          // Fallback: end game if no first player found
          await supabase
            .from('game_sessions')
            .update({
              game_status: 'ended',
              active_player_id: null,
            })
            .eq('id', gameState.sessionId);
        }
      } else {
        await supabase
          .from('game_sessions')
          .update({
            active_player_id: nextPlayerId,
          })
          .eq('id', gameState.sessionId);
      }
    } catch (error) {
      console.error('Error picking gift:', error);
      throw error;
    }
  };

  // Steal a revealed gift
  const stealGift = async (giftId: string) => {
    if (!gameState.sessionId || !gameState.activePlayerId) return;

    try {
      // Check if current player has already completed their turn (but allow in final round)
      const currentPlayer = gameState.players.find(p => p.id === gameState.activePlayerId);
      if (currentPlayer?.hasCompletedTurn && !gameState.isFinalRound) {
        console.log('Player has already completed their turn');
        throw new Error('You have already taken your turn this round');
      }

      const gift = gameState.gifts.find(g => g.id === giftId);
      if (!gift || !gift.currentOwnerId) return;

      const previousOwnerId = gift.currentOwnerId;

      // Check for immediate steal-back if the rule is disabled
      if (!gameState.gameConfig.allowImmediateStealback) {
        // Query the most recent steal action for this gift
        const { data: lastStealAction, error: actionError } = await supabase
          .from('game_actions')
          .select('*')
          .eq('session_id', gameState.sessionId)
          .eq('gift_id', giftId)
          .eq('action_type', 'steal')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (actionError && actionError.code !== 'PGRST116') {
          console.error('Error checking last steal action:', actionError);
        }

        // If the last steal was FROM the current player, don't allow immediate steal-back
        if (lastStealAction && lastStealAction.previous_owner_id === gameState.activePlayerId) {
          throw new Error('You cannot immediately steal back a gift that was just stolen from you');
        }
      }
      const newStealCount = gift.stealCount + 1;
      
      // Get player names for the notification
      const stealer = gameState.players.find(p => p.id === gameState.activePlayerId);
      const victim = gameState.players.find(p => p.id === previousOwnerId);
      
      // Check if the stealer already has a gift (for swap during final round)
      const stealerCurrentGiftId = currentPlayer?.currentGiftId;
      const stealerCurrentGift = stealerCurrentGiftId 
        ? gameState.gifts.find(g => g.id === stealerCurrentGiftId) 
        : null;

      // Log the steal action to game_actions table
      await supabase
        .from('game_actions')
        .insert({
          session_id: gameState.sessionId,
          player_id: gameState.activePlayerId,
          action_type: 'steal',
          gift_id: giftId,
          previous_owner_id: previousOwnerId,
        });

      // Update stolen gift - assign to new owner and increment steal count
      await supabase
        .from('gifts')
        .update({
          current_owner_id: gameState.activePlayerId,
          steal_count: newStealCount,
          status: newStealCount >= 2 ? 'locked' : 'revealed',
        })
        .eq('id', giftId);

      // Play steal sound
      console.log('🎭 stealGift: Dispatching giftStolenSound event for gift:', giftId);
      window.dispatchEvent(new CustomEvent('giftStolenSound', { detail: { giftId } }));

      // If stealer had a gift, transfer it to the victim (swap)
      if (stealerCurrentGiftId && stealerCurrentGift) {
        console.log('Final round swap: transferring gift', stealerCurrentGiftId, 'to victim', previousOwnerId);
        
        // Update the stealer's old gift to belong to the victim
        await supabase
          .from('gifts')
          .update({
            current_owner_id: previousOwnerId,
          })
          .eq('id', stealerCurrentGiftId);
        
        // Update victim to have the stealer's old gift
        await supabase
          .from('players')
          .update({
            current_gift_id: stealerCurrentGiftId,
            has_completed_turn: false,
          })
          .eq('id', previousOwnerId);
      } else {
        // No swap needed - just clear previous owner's gift
        await supabase
          .from('players')
          .update({
            current_gift_id: null,
            has_completed_turn: false,
          })
          .eq('id', previousOwnerId);
      }

      // Update current player's gift
      await supabase
        .from('players')
        .update({
          current_gift_id: giftId,
          has_completed_turn: true,
        })
        .eq('id', gameState.activePlayerId);
        
      // Dispatch steal event for notification
      window.dispatchEvent(new CustomEvent('giftStolen', { 
        detail: { 
          giftName: gift.name,
          stealerName: stealer?.displayName || 'Someone',
          victimName: victim?.displayName || 'Someone',
          stealsRemaining: 2 - newStealCount,
          isLocked: newStealCount >= 2,
          isFinalRound: gameState.isFinalRound
        } 
      }));

      // Previous owner gets the next turn (this continues the final round chain)
      await supabase
        .from('game_sessions')
        .update({
          active_player_id: previousOwnerId,
        })
        .eq('id', gameState.sessionId);
    } catch (error) {
      console.error('Error stealing gift:', error);
      throw error;
    }
  };

  // Keep current gift (used in final round to end the game)
  const keepGift = async () => {
    if (!gameState.sessionId || !gameState.activePlayerId) return;

    try {
      // Only allow keeping gift during final round
      if (!gameState.isFinalRound) {
        throw new Error('Can only keep gift during final round');
      }

      console.log('Player chose to keep their gift - ending game');
      
      await supabase
        .from('game_sessions')
        .update({
          game_status: 'ended',
          active_player_id: null,
          is_final_round: false,
        })
        .eq('id', gameState.sessionId);

      // Dispatch event for game ended
      window.dispatchEvent(new CustomEvent('gameEnded', { 
        detail: { reason: 'playerKeptGift' } 
      }));
    } catch (error) {
      console.error('Error keeping gift:', error);
      throw error;
    }
  };

  // Local setters (for backward compatibility, but prefer async methods)
  const setGifts = (gifts: Gift[]) => setGameState(prev => ({ ...prev, gifts }));
  const setPlayers = (players: Player[]) => setGameState(prev => ({ ...prev, players }));
  const setGameStatus = (status: GameState['gameStatus']) => setGameState(prev => ({ ...prev, gameStatus: status }));
  const setActivePlayerId = (playerId: string | null) => setGameState(prev => ({ ...prev, activePlayerId: playerId }));
  const setRoundIndex = (round: number) => setGameState(prev => ({ ...prev, roundIndex: round }));
  const setGameConfig = (config: GameConfig) => setGameState(prev => ({ ...prev, gameConfig: config }));
  const addPlayer = (player: Player) => setGameState(prev => ({ ...prev, players: [...prev.players, player] }));
  
  const removePlayer = async (playerId: string) => {
    if (!gameState.sessionId) return;

    try {
      // Check if the removed player is the active player
      const isActivePlayer = gameState.activePlayerId === playerId;
      
      // Get current players to find next player if needed
      const currentPlayers = gameState.players.filter(p => p.id !== playerId);
      
      // If the removed player has a gift, release it back to the pool
      const removedPlayer = gameState.players.find(p => p.id === playerId);
      if (removedPlayer?.currentGiftId) {
        await supabase
          .from('gifts')
          .update({ 
            current_owner_id: null,
            status: 'revealed'
          })
          .eq('id', removedPlayer.currentGiftId);
      }

      // Delete the player from the database
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId);

      if (error) {
        console.error('Error removing player:', error);
        throw error;
      }

      // Update local state
      setGameState(prev => ({ 
        ...prev, 
        players: prev.players.filter(p => p.id !== playerId) 
      }));

      // If the removed player was the active player, advance to the next player
      if (isActivePlayer && currentPlayers.length > 0 && gameState.gameStatus === 'active') {
        // Find the next player in order
        const sortedPlayers = [...currentPlayers].sort((a, b) => a.orderIndex - b.orderIndex);
        const nextPlayer = sortedPlayers.find(p => !p.hasCompletedTurn) || sortedPlayers[0];
        
        if (nextPlayer) {
          await supabase
            .from('game_sessions')
            .update({ 
              active_player_id: nextPlayer.id,
              turn_started_at: new Date().toISOString()
            })
            .eq('id', gameState.sessionId);
        }
      }

      console.log('Player removed successfully:', playerId);
    } catch (error) {
      console.error('Failed to remove player:', error);
      throw error;
    }
  };

  // Auto-restore session on mount
  useEffect(() => {
    const initSession = async () => {
      const stored = getStoredSession();
      
      // Only restore if we don't already have a session loaded and there's a stored session
      if (!gameState.sessionId && stored) {
        console.log('Auto-restoring session on mount:', stored.sessionCode);
        try {
          await restoreSession();
        } catch (error) {
          console.error('Failed to auto-restore session:', error);
          setIsLoading(false);
        }
      } else {
        // No stored session to restore, set loading to false
        setIsLoading(false);
      }
    };

    initSession();
  }, []); // Run once on mount

  return (
    <GameContext.Provider
      value={{
        gameState,
        isLoading,
        createSession,
        joinSession,
        restoreSession,
        restoreSessionFromUrl,
        clearSession,
        getStoredSessionInfo,
        addGift,
        addGiftsBatch,
        removeGift,
        updateGift,
        updateGameStatus,
        updateGameConfig,
        startGame,
        pickGift,
        stealGift,
        keepGift,
        setGifts,
        setPlayers,
        setGameStatus,
        setActivePlayerId,
        setRoundIndex,
        setGameConfig,
        addPlayer,
        removePlayer,
        loadPlayers,
        loadGifts,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};