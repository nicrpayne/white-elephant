import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Pause, Play, SkipForward, AlertCircle } from "lucide-react";
import GiftGrid from "./GiftGrid";
import PlayerTurnPanel from "./PlayerTurnPanel";

interface Gift {
  id: string;
  name: string;
  imageUrl: string;
  link?: string;
  status: "hidden" | "revealed" | "locked" | "final";
  ownerPlayerId?: string;
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
  onPauseGame?: () => void;
  onResumeGame?: () => void;
  onEndGame?: () => void;
  onSkipTurn?: () => void;
}

const GameBoard = ({
  sessionId = "sample-session",
  sessionCode = "ABC123",
  gifts = sampleGifts,
  players = samplePlayers,
  activePlayerId = "player-1",
  roundIndex = 1,
  gameStatus = "active",
  onPauseGame = () => console.log("Game paused"),
  onResumeGame = () => console.log("Game resumed"),
  onEndGame = () => console.log("Game ended"),
  onSkipTurn = () => console.log("Turn skipped"),
}: GameBoardProps) => {
  const [activeTab, setActiveTab] = useState("board");

  const activePlayer = players.find((player) => player.id === activePlayerId);

  return (
    <div className="bg-background min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">White Elephant</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">Session: {sessionCode}</Badge>
              <Badge
                variant={gameStatus === "active" ? "default" : "secondary"}
              >
                {gameStatus.charAt(0).toUpperCase() + gameStatus.slice(1)}
              </Badge>
              <Badge variant="outline">Round {roundIndex}</Badge>
            </div>
          </div>

          <div className="flex gap-2">
            {gameStatus === "active" ? (
              <Button variant="outline" onClick={onPauseGame}>
                <Pause className="h-4 w-4 mr-2" /> Pause Game
              </Button>
            ) : gameStatus === "paused" ? (
              <Button variant="outline" onClick={onResumeGame}>
                <Play className="h-4 w-4 mr-2" /> Resume Game
              </Button>
            ) : null}

            <Button variant="outline" onClick={onSkipTurn}>
              <SkipForward className="h-4 w-4 mr-2" /> Skip Turn
            </Button>

            <Button variant="destructive" onClick={onEndGame}>
              End Game
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="board">Game Board</TabsTrigger>
            <TabsTrigger value="players">Players</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="board" className="w-full">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                <Card>
                  <CardContent className="p-4">
                    <GiftGrid
                      gifts={gifts}
                      activePlayerId={activePlayerId}
                      gameStatus={gameStatus}
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-1">
                <PlayerTurnPanel
                  players={players}
                  activePlayerId={activePlayerId}
                  gameStatus={gameStatus}
                  roundIndex={roundIndex}
                />
              </div>
            </div>

            {activePlayer && gameStatus === "active" && (
              <div className="mt-6 p-4 bg-muted rounded-lg flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-primary" />
                <span className="font-medium">
                  {activePlayer.displayName}'s turn:
                </span>
                <span className="ml-2">
                  Pick a new gift or steal an available gift
                </span>
              </div>
            )}
          </TabsContent>

          <TabsContent value="players">
            <Card>
              <CardContent className="p-4">
                <h2 className="text-xl font-semibold mb-4">
                  Players ({players.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {players.map((player) => (
                    <Card key={player.id} className="overflow-hidden">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold">
                          {player.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">
                            {player.displayName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Order: {player.orderIndex + 1}
                          </div>
                        </div>
                        {player.id === activePlayerId && (
                          <Badge className="ml-auto">Current Turn</Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardContent className="p-4">
                <h2 className="text-xl font-semibold mb-4">Game History</h2>
                <div className="space-y-2">
                  {/* Placeholder for turn history */}
                  <div className="p-3 border rounded-md">
                    <div className="font-medium">
                      Round {roundIndex}, Turn 3
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Player 2 stole "Mystery Box" from Player 1
                    </div>
                  </div>
                  <div className="p-3 border rounded-md">
                    <div className="font-medium">
                      Round {roundIndex}, Turn 2
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Player 1 picked "Gift Card"
                    </div>
                  </div>
                  <div className="p-3 border rounded-md">
                    <div className="font-medium">
                      Round {roundIndex}, Turn 1
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Player 3 picked "Chocolate Box"
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Sample data for default props
const sampleGifts: Gift[] = [
  {
    id: "gift-1",
    name: "Mystery Box",
    imageUrl:
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&q=80",
    status: "revealed",
    ownerPlayerId: "player-2",
    stealCount: 1,
  },
  {
    id: "gift-2",
    name: "Gift Card",
    imageUrl:
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&q=80",
    status: "revealed",
    ownerPlayerId: "player-1",
    stealCount: 0,
  },
  {
    id: "gift-3",
    name: "Chocolate Box",
    imageUrl:
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&q=80",
    status: "revealed",
    ownerPlayerId: "player-3",
    stealCount: 0,
  },
  {
    id: "gift-4",
    name: "Tech Gadget",
    imageUrl:
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&q=80",
    status: "hidden",
    stealCount: 0,
  },
  {
    id: "gift-5",
    name: "Coffee Mug",
    imageUrl:
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&q=80",
    status: "hidden",
    stealCount: 0,
  },
  {
    id: "gift-6",
    name: "Board Game",
    imageUrl:
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&q=80",
    status: "locked",
    ownerPlayerId: "player-4",
    stealCount: 2,
  },
  {
    id: "gift-7",
    name: "Scented Candle",
    imageUrl:
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&q=80",
    status: "hidden",
    stealCount: 0,
  },
  {
    id: "gift-8",
    name: "Wireless Earbuds",
    imageUrl:
      "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&q=80",
    status: "hidden",
    stealCount: 0,
  },
];

const samplePlayers: Player[] = [
  { id: "player-1", displayName: "Alice", orderIndex: 0, joinTime: new Date() },
  { id: "player-2", displayName: "Bob", orderIndex: 1, joinTime: new Date() },
  {
    id: "player-3",
    displayName: "Charlie",
    orderIndex: 2,
    joinTime: new Date(),
  },
  { id: "player-4", displayName: "Diana", orderIndex: 3, joinTime: new Date() },
  { id: "player-5", displayName: "Evan", orderIndex: 4, joinTime: new Date() },
  { id: "player-6", displayName: "Fiona", orderIndex: 5, joinTime: new Date() },
];

export default GameBoard;
