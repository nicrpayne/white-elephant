import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase, DBGameSession, DBPlayer, DBGift } from "@/lib/supabase";
import { RealtimeChannel } from "@supabase/supabase-js";

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
}

interface Player {
  id: string;
  displayName: string;
  orderIndex: number;
  joinTime: string;
  currentGiftId: string | null;
  isAdmin: boolean;
  hasCompletedTurn: boolean;
}

interface GameConfig {
  maxStealsPerGift: number;
  randomizeOrder: boolean;
  allowImmediateStealback: boolean;
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
}

interface GameContextType {
  gameState: GameState;
  isLoading: boolean;
  createSession: () => Promise<string>;
  joinSession: (sessionCode: string, playerName: string) => Promise<string>;
  addGift: (gift: Omit<Gift, 'id' | 'stealCount' | 'currentOwnerId' | 'status'>) => Promise<void>;
  removeGift: (giftId: string) => Promise<void>;
  updateGift: (giftId: string, updates: Partial<Gift>) => Promise<void>;
  updateGameStatus: (status: GameState['gameStatus']) => Promise<void>;
  updateGameConfig: (config: Partial<GameConfig>) => Promise<void>;
  startGame: () => Promise<void>;
  setGifts: (gifts: Gift[]) => void;
  setPlayers: (players: Player[]) => void;
  setGameStatus: (status: GameState['gameStatus']) => void;
  setActivePlayerId: (playerId: string | null) => void;
  setRoundIndex: (round: number) => void;
  setGameConfig: (config: GameConfig) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
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
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null);

  // Subscribe to real-time updates when sessionId changes
  useEffect(() => {
    if (!gameState.sessionId) return;

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
        async () => {
          await loadPlayers(gameState.sessionId!);
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
        async () => {
          await loadGifts(gameState.sessionId!);
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
        async () => {
          await loadSession(gameState.sessionId!);
        }
      )
      .subscribe();

    setRealtimeChannel(channel);

    return () => {
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
        gameConfig: {
          maxStealsPerGift: session.max_steals_per_gift,
          randomizeOrder: session.randomize_order,
          allowImmediateStealback: session.allow_immediate_stealback,
        },
      }));
    }
  };

  // Load players
  const loadPlayers = async (sessionId: string) => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('session_id', sessionId)
      .order('order_index');

    if (!error && data) {
      const players: Player[] = data.map((p: DBPlayer) => ({
        id: p.id,
        displayName: p.display_name,
        orderIndex: p.order_index,
        joinTime: p.joined_at,
        currentGiftId: p.current_gift_id,
        isAdmin: p.is_admin,
        hasCompletedTurn: p.has_completed_turn,
      }));
      setGameState(prev => ({ ...prev, players }));
    }
  };

  // Load gifts
  const loadGifts = async (sessionId: string) => {
    const { data, error } = await supabase
      .from('gifts')
      .select('*')
      .eq('session_id', sessionId);

    if (!error && data) {
      const gifts: Gift[] = data.map((g: DBGift) => ({
        id: g.id,
        name: g.name,
        imageUrl: g.image_url,
        link: g.link || undefined,
        description: g.description || undefined,
        status: g.status,
        stealCount: g.steal_count,
        currentOwnerId: g.current_owner_id,
      }));
      setGameState(prev => ({ ...prev, gifts }));
    }
  };

  // Create a new game session
  const createSession = async (): Promise<string> => {
    setIsLoading(true);
    try {
      const sessionCode = generateSessionCode();
      
      const { data, error } = await supabase
        .from('game_sessions')
        .insert({
          session_code: sessionCode,
          game_status: 'setup',
          max_steals_per_gift: gameState.gameConfig.maxStealsPerGift,
          randomize_order: gameState.gameConfig.randomizeOrder,
          allow_immediate_stealback: gameState.gameConfig.allowImmediateStealback,
        })
        .select()
        .single();

      if (error) throw error;

      const session = data as DBGameSession;
      setGameState(prev => ({
        ...prev,
        sessionId: session.id,
        sessionCode: session.session_code,
      }));

      // Load initial data for the new session
      await loadGifts(session.id);
      await loadPlayers(session.id);

      return session.id;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Join an existing session
  const joinSession = async (sessionCode: string, playerName: string): Promise<string> => {
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

      // Add player
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .insert({
          session_id: session.id,
          display_name: playerName,
          order_index: (count || 0) + 1,
          is_admin: false,
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

      return playerData.id;
    } catch (error) {
      console.error('Error joining session:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Add gift
  const addGift = async (gift: Omit<Gift, 'id' | 'stealCount' | 'currentOwnerId' | 'status'>) => {
    let sessionId = gameState.sessionId;
    
    if (!sessionId) {
      sessionId = await createSession();
    }

    const { error } = await supabase.from('gifts').insert({
      session_id: sessionId,
      name: gift.name,
      image_url: gift.imageUrl,
      link: gift.link || null,
      description: gift.description || null,
      status: 'hidden',
      steal_count: 0,
    });

    if (error) {
      console.error('Error adding gift:', error);
      throw error;
    }

    // Manually refresh gifts list (realtime subscription will also update)
    await loadGifts(sessionId);
  };

  // Remove gift
  const removeGift = async (giftId: string) => {
    const { error } = await supabase.from('gifts').delete().eq('id', giftId);

    if (error) {
      console.error('Error removing gift:', error);
      throw error;
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
  };

  // Update game config
  const updateGameConfig = async (config: Partial<GameConfig>) => {
    if (!gameState.sessionId) return;

    const updates: Record<string, any> = {};
    if (config.maxStealsPerGift !== undefined) updates.max_steals_per_gift = config.maxStealsPerGift;
    if (config.randomizeOrder !== undefined) updates.randomize_order = config.randomizeOrder;
    if (config.allowImmediateStealback !== undefined) updates.allow_immediate_stealback = config.allowImmediateStealback;

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

    const { data: players } = await supabase
      .from('players')
      .select('*')
      .eq('session_id', gameState.sessionId)
      .order('order_index');

    if (!players || players.length < 2) {
      throw new Error('Need at least 2 players to start');
    }

    // Randomize if configured
    if (gameState.gameConfig.randomizeOrder) {
      const shuffled = [...players].sort(() => Math.random() - 0.5);
      for (let i = 0; i < shuffled.length; i++) {
        await supabase
          .from('players')
          .update({ order_index: i + 1 })
          .eq('id', shuffled[i].id);
      }
    }

    // Set first player as active
    const firstPlayer = players.sort((a, b) => a.order_index - b.order_index)[0];

    await supabase
      .from('game_sessions')
      .update({
        game_status: 'active',
        active_player_id: firstPlayer.id,
      })
      .eq('id', gameState.sessionId);
  };

  // Local setters (for backward compatibility, but prefer async methods)
  const setGifts = (gifts: Gift[]) => setGameState(prev => ({ ...prev, gifts }));
  const setPlayers = (players: Player[]) => setGameState(prev => ({ ...prev, players }));
  const setGameStatus = (status: GameState['gameStatus']) => setGameState(prev => ({ ...prev, gameStatus: status }));
  const setActivePlayerId = (playerId: string | null) => setGameState(prev => ({ ...prev, activePlayerId: playerId }));
  const setRoundIndex = (round: number) => setGameState(prev => ({ ...prev, roundIndex: round }));
  const setGameConfig = (config: GameConfig) => setGameState(prev => ({ ...prev, gameConfig: config }));
  const addPlayer = (player: Player) => setGameState(prev => ({ ...prev, players: [...prev.players, player] }));
  const removePlayer = (playerId: string) => setGameState(prev => ({ ...prev, players: prev.players.filter(p => p.id !== playerId) }));

  return (
    <GameContext.Provider
      value={{
        gameState,
        isLoading,
        createSession,
        joinSession,
        addGift,
        removeGift,
        updateGift,
        updateGameStatus,
        updateGameConfig,
        startGame,
        setGifts,
        setPlayers,
        setGameStatus,
        setActivePlayerId,
        setRoundIndex,
        setGameConfig,
        addPlayer,
        removePlayer,
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