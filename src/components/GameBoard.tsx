import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Pause, Play, SkipForward, AlertCircle } from "lucide-react";
import GiftGrid from "./GiftGrid";
import PlayerTurnPanel from "./PlayerTurnPanel";
import { useGame } from "@/contexts/GameContext";
import { useSearchParams } from "react-router-dom";

interface Gift {
  id: string;
  name: string;
  imageUrl?: string;
  status: "hidden" | "revealed" | "locked";
  ownerPlayerId?: string;
  ownerName?: string;
  stealCount: number;
}

interface Player {
  id: string;
  displayName: string;
  orderIndex: number;
  joinTime: Date;
  isAdmin?: boolean;
  eliminated?: boolean;
}

interface GameBoardProps {
  sessionId?: string;
  sessionCode?: string;
  gifts?: Gift[];
  players?: Player[];
  activePlayerId?: string;
  roundIndex?: number;
  gameStatus?: "draft" | "lobby" | "active" | "paused" | "ended";
  isAdmin?: boolean;
  onPauseGame?: () => void;
  onResumeGame?: () => void;
  onEndGame?: () => void;
  onSkipTurn?: () => void;
}

const GameBoard = () => {
  const [searchParams] = useSearchParams();
  const playerId = searchParams.get("playerId");
  const { gameState, pickGift, stealGift, updateGameStatus } = useGame();
  const [activeTab, setActiveTab] = useState("board");
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null);

  const { gifts, players, gameStatus, activePlayerId, currentPlayerId, sessionCode } = gameState;

  // Calculate round index
  const roundIndex = players.filter(p => p.hasCompletedTurn).length + 1;

  // Determine if it's this player's turn
  const isMyTurn = playerId && activePlayerId === playerId;
  const currentPlayer = players.find(p => p.id === playerId);
  const activePlayer = players.find(p => p.id === activePlayerId);

  const handleGiftSelect = async (giftId: string) => {
    if (!isMyTurn) return;

    const gift = gifts.find(g => g.id === giftId);
    if (!gift) return;

    try {
      if (gift.status === "hidden") {
        // Pick a new gift
        await pickGift(giftId);
      } else if (gift.status === "revealed" && gift.stealCount < 2) {
        // Steal a revealed gift
        await stealGift(giftId);
      }
    } catch (error) {
      console.error("Error selecting gift:", error);
      alert("Failed to select gift. Please try again.");
    }
  };

  const handlePauseGame = async () => {
    try {
      await updateGameStatus("paused");
    } catch (error) {
      console.error("Error pausing game:", error);
    }
  };

  const handleResumeGame = async () => {
    try {
      await updateGameStatus("active");
    } catch (error) {
      console.error("Error resuming game:", error);
    }
  };

  const handleEndGame = async () => {
    try {
      await updateGameStatus("ended");
    } catch (error) {
      console.error("Error ending game:", error);
    }
  };

  const handleSkipTurn = () => console.log("Turn skipped");

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <Card className="border-2 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  White Elephant Game
                </h1>
                <p className="text-sm text-gray-600">
                  Session Code: <span className="font-mono font-bold">{sessionCode}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant={
                    gameStatus === "active"
                      ? "default"
                      : gameStatus === "paused"
                        ? "secondary"
                        : "outline"
                  }
                  className="text-sm px-3 py-1"
                >
                  {gameStatus === "active" && "🎮 Active"}
                  {gameStatus === "paused" && "⏸️ Paused"}
                  {gameStatus === "setup" && "⚙️ Setup"}
                  {gameStatus === "ended" && "🏁 Ended"}
                </Badge>
                {gameStatus === "active" && (
                  <Button onClick={handlePauseGame} variant="outline" size="sm">
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                )}
                {gameStatus === "paused" && (
                  <Button onClick={handleResumeGame} size="sm">
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </Button>
                )}
              </div>
            </div>

            {activePlayer && (
              <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Current Turn</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {activePlayer.displayName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-1">Round</p>
                    <p className="text-2xl font-bold text-gray-900">{roundIndex}</p>
                  </div>
                </div>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="board">Game Board</TabsTrigger>
                <TabsTrigger value="players">
                  Players ({players.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="board" className="mt-4">
                <GiftGrid 
                  gifts={gifts} 
                  onGiftSelect={handleGiftSelect}
                  activePlayerId={activePlayerId}
                  isPlayerTurn={isMyTurn || false}
                  gameStatus={gameStatus}
                />
              </TabsContent>

              <TabsContent value="players" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {players.map((player) => (
                    <Card
                      key={player.id}
                      className={
                        player.id === activePlayerId
                          ? "border-2 border-purple-500 bg-purple-50"
                          : ""
                      }
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-lg">
                              {player.displayName}
                            </p>
                            <p className="text-sm text-gray-600">
                              Order: #{player.orderIndex}
                            </p>
                          </div>
                          {player.id === activePlayerId && (
                            <Badge>Current Turn</Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GameBoard;