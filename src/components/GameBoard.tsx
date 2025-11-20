import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pause, Play, SkipForward, AlertCircle, Download, Trophy, PartyPopper } from "lucide-react";
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
  const [showTurnAlert, setShowTurnAlert] = useState(false);
  const [showStealAlert, setShowStealAlert] = useState(false);
  const [stealAlertData, setStealAlertData] = useState<{
    giftName: string;
    stealerName: string;
    victimName: string;
    stealsRemaining: number;
    isLocked: boolean;
  } | null>(null);

  const { gifts, players, gameStatus, activePlayerId, currentPlayerId, sessionCode } = gameState;

  // Calculate round index
  const roundIndex = players.filter(p => p.hasCompletedTurn).length + 1;

  // Determine if it's this player's turn
  const isMyTurn = playerId && activePlayerId === playerId;
  const currentPlayer = players.find(p => p.id === playerId);
  const isAdmin = currentPlayer?.isAdmin || false;
  const activePlayer = players.find(p => p.id === activePlayerId);

  // Listen for turn changes
  useEffect(() => {
    const handleTurnChange = (event: CustomEvent) => {
      const { newPlayerId } = event.detail;
      // Show alert if it's this player's turn
      if (playerId && newPlayerId === playerId) {
        setShowTurnAlert(true);
      }
    };

    window.addEventListener('turnChanged', handleTurnChange as EventListener);
    return () => {
      window.removeEventListener('turnChanged', handleTurnChange as EventListener);
    };
  }, [playerId]);
  
  // Listen for steal events
  useEffect(() => {
    const handleSteal = (event: CustomEvent) => {
      setStealAlertData(event.detail);
      setShowStealAlert(true);
    };

    window.addEventListener('giftStolen', handleSteal as EventListener);
    return () => {
      window.removeEventListener('giftStolen', handleSteal as EventListener);
    };
  }, []);

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

  // Export game results as CSV
  const exportResultsCSV = () => {
    const csvRows = [
      ['Player Name', 'Gift Name', 'Gift Image URL', 'Order'],
      ...players.map(player => {
        const playerGift = gifts.find(g => g.currentOwnerId === player.id);
        return [
          player.displayName,
          playerGift?.name || 'No Gift',
          playerGift?.imageUrl || '',
          player.orderIndex
        ];
      })
    ];
    
    const csvContent = csvRows.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `white-elephant-results-${sessionCode}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // If game has ended, show results screen
  if (gameStatus === "ended") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <Card className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Trophy size={48} />
                <h1 className="text-4xl font-bold">Game Over!</h1>
                <PartyPopper size={48} />
              </div>
              <p className="text-xl text-white/90">
                Thanks for playing White Elephant! Here's who got what:
              </p>
            </CardContent>
          </Card>

          {/* Admin Export Button */}
          {isAdmin && (
            <Card>
              <CardContent className="p-4">
                <Button 
                  onClick={exportResultsCSV}
                  className="w-full"
                  size="lg"
                >
                  <Download className="h-5 w-5 mr-2" />
                  Export Results as CSV
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Final Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Final Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {players.map((player) => {
                  const playerGift = gifts.find(g => g.currentOwnerId === player.id);
                  
                  return (
                    <Card key={player.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Player Info */}
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-bold text-lg">
                              {player.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-lg">{player.displayName}</p>
                              <p className="text-sm text-gray-600">Order #{player.orderIndex}</p>
                            </div>
                          </div>

                          {/* Gift Display */}
                          {playerGift ? (
                            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-3 border-2 border-green-200">
                              <p className="text-xs text-gray-600 mb-2 font-medium">Received:</p>
                              {playerGift.imageUrl && (
                                <img 
                                  src={playerGift.imageUrl} 
                                  alt={playerGift.name}
                                  className="w-full h-32 rounded object-cover mb-2"
                                />
                              )}
                              <p className="font-medium text-sm">{playerGift.name}</p>
                              <Badge variant="secondary" className="mt-2">
                                Stolen {playerGift.stealCount} time{playerGift.stealCount !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                          ) : (
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
                              <p className="text-sm text-gray-500">No gift received</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Session Info */}
          <Card>
            <CardContent className="p-4 text-center text-sm text-gray-600">
              <p>Session Code: <span className="font-mono font-bold">{sessionCode}</span></p>
              <p className="mt-1">Total Players: {players.length} | Total Gifts: {gifts.length}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
                {isAdmin && gameStatus === "active" && (
                  <Button onClick={handlePauseGame} variant="outline" size="sm">
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                )}
                {isAdmin && gameStatus === "paused" && (
                  <Button onClick={handleResumeGame} size="sm">
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </Button>
                )}
              </div>
            </div>

            {activePlayer && (
              <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-lg p-6 mb-4 shadow-lg animate-pulse">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/90 mb-1 font-medium">🎯 Current Turn</p>
                    <p className="text-3xl font-bold text-white drop-shadow-lg">
                      {activePlayer.displayName}
                    </p>
                    <p className="text-sm text-white/80 mt-1">
                      Pick a hidden gift or steal a revealed one
                    </p>
                  </div>
                  <div className="text-right bg-white/20 backdrop-blur-sm rounded-lg p-4">
                    <p className="text-sm text-white/90 mb-1 font-medium">Round</p>
                    <p className="text-4xl font-bold text-white drop-shadow-lg">{roundIndex}</p>
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
                  {players.map((player) => {
                    const playerGift = gifts.find(g => g.currentOwnerId === player.id);
                    
                    return (
                      <Card
                        key={player.id}
                        className={
                          player.id === activePlayerId
                            ? "border-2 border-purple-500 bg-purple-50"
                            : ""
                        }
                      >
                        <CardContent className="p-4">
                          <div className="space-y-3">
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
                            
                            {/* Gift Display */}
                            {playerGift ? (
                              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-200">
                                <p className="text-xs text-gray-600 mb-1">Current Gift:</p>
                                <div className="flex items-start gap-2">
                                  {playerGift.imageUrl && (
                                    <img 
                                      src={playerGift.imageUrl} 
                                      alt={playerGift.name}
                                      className="w-12 h-12 rounded object-cover"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">
                                      {playerGift.name}
                                    </p>
                                    {playerGift.stealCount >= 2 ? (
                                      <Badge variant="destructive" className="text-xs mt-1">
                                        🔒 Locked
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="text-xs mt-1">
                                        {2 - playerGift.stealCount} steal{2 - playerGift.stealCount !== 1 ? 's' : ''} left
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <p className="text-xs text-gray-500 text-center">
                                  {player.hasCompletedTurn ? "No gift" : "Waiting for turn..."}
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Turn Alert Dialog */}
      <AlertDialog open={showTurnAlert} onOpenChange={setShowTurnAlert}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">🎁 It's Your Turn!</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              You can now pick a hidden gift or steal a revealed gift from another player.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowTurnAlert(false)}>
              Let's Go!
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Steal Alert Dialog */}
      <AlertDialog open={showStealAlert} onOpenChange={setShowStealAlert}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">🎯 Gift Stolen!</AlertDialogTitle>
            <AlertDialogDescription className="text-base space-y-2">
              <p className="font-semibold text-foreground">
                {stealAlertData?.stealerName} stole "{stealAlertData?.giftName}" from {stealAlertData?.victimName}!
              </p>
              {stealAlertData?.isLocked ? (
                <p className="text-orange-600 font-medium">
                  🔒 This gift is now LOCKED and cannot be stolen again!
                </p>
              ) : (
                <p className="text-blue-600">
                  ⚡ {stealAlertData?.stealsRemaining} steal{stealAlertData?.stealsRemaining !== 1 ? 's' : ''} remaining before this gift locks
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowStealAlert(false)}>
              Got it!
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GameBoard;