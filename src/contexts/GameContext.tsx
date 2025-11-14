import React, { createContext, useContext, useState, ReactNode } from 'react';

// Helper function to generate an 8-character session code
const generateSessionCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing characters like 0, O, I, 1
  let code = '';
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
  status: "hidden" | "revealed" | "locked" | "final";
  ownerPlayerId?: string;
  ownerName?: string;
  stealCount: number;
  description?: string;
}

interface Player {
  id: string;
  displayName: string;
  joinTime: string;
  isAdmin: boolean;
  orderIndex: number;
  eliminated: boolean;
}

interface GameConfig {
  maxStealsPerGift: number;
  allowImmediateStealback: boolean;
  randomizeOrder: boolean;
}

interface GameState {
  sessionCode: string;
  gifts: Gift[];
  players: Player[];
  gameStatus: "setup" | "active" | "paused" | "ended";
  activePlayerId: string | null;
  roundIndex: number;
  gameConfig: GameConfig;
}

interface GameContextType {
  gameState: GameState;
  setGifts: (gifts: Gift[]) => void;
  setPlayers: (players: Player[]) => void;
  setGameStatus: (status: "setup" | "active" | "paused" | "ended") => void;
  setActivePlayerId: (playerId: string | null) => void;
  setRoundIndex: (round: number) => void;
  setGameConfig: (config: GameConfig) => void;
  addGift: (gift: Gift) => void;
  removeGift: (giftId: string) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  updateGift: (giftId: string, updates: Partial<Gift>) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [gameState, setGameState] = useState<GameState>({
    sessionCode: generateSessionCode(),
    gifts: [],
    players: [],
    gameStatus: "setup",
    activePlayerId: null,
    roundIndex: 1,
    gameConfig: {
      maxStealsPerGift: 2,
      allowImmediateStealback: false,
      randomizeOrder: true,
    },
  });

  const setGifts = (gifts: Gift[]) => {
    setGameState((prev) => ({ ...prev, gifts }));
  };

  const setPlayers = (players: Player[]) => {
    setGameState((prev) => ({ ...prev, players }));
  };

  const setGameStatus = (status: "setup" | "active" | "paused" | "ended") => {
    setGameState((prev) => ({ ...prev, gameStatus: status }));
  };

  const setActivePlayerId = (playerId: string | null) => {
    setGameState((prev) => ({ ...prev, activePlayerId: playerId }));
  };

  const setRoundIndex = (round: number) => {
    setGameState((prev) => ({ ...prev, roundIndex: round }));
  };

  const setGameConfig = (config: GameConfig) => {
    setGameState((prev) => ({ ...prev, gameConfig: config }));
  };

  const addGift = (gift: Gift) => {
    setGameState((prev) => ({ ...prev, gifts: [...prev.gifts, gift] }));
  };

  const removeGift = (giftId: string) => {
    setGameState((prev) => ({
      ...prev,
      gifts: prev.gifts.filter((g) => g.id !== giftId),
    }));
  };

  const addPlayer = (player: Player) => {
    setGameState((prev) => ({ ...prev, players: [...prev.players, player] }));
  };

  const removePlayer = (playerId: string) => {
    setGameState((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p.id !== playerId),
    }));
  };

  const updateGift = (giftId: string, updates: Partial<Gift>) => {
    setGameState((prev) => ({
      ...prev,
      gifts: prev.gifts.map((g) => (g.id === giftId ? { ...g, ...updates } : g)),
    }));
  };

  return (
    <GameContext.Provider
      value={{
        gameState,
        setGifts,
        setPlayers,
        setGameStatus,
        setActivePlayerId,
        setRoundIndex,
        setGameConfig,
        addGift,
        removeGift,
        addPlayer,
        removePlayer,
        updateGift,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};