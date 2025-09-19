import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Clock, Gift, Pause, Play, SkipForward, Trophy } from "lucide-react";

interface Player {
  id: string;
  displayName: string;
  orderIndex: number;
  isActive?: boolean;
  isAdmin?: boolean;
  avatarUrl?: string;
}

interface TurnHistoryItem {
  id: string;
  playerName: string;
  action: "pick" | "steal";
  giftName: string;
  timestamp: string;
}

interface PlayerTurnPanelProps {
  players: Player[];
  activePlayerId?: string;
  turnHistory?: TurnHistoryItem[];
  gameStatus: "draft" | "lobby" | "active" | "paused" | "ended";
  isAdmin?: boolean;
  onPauseGame?: () => void;
  onResumeGame?: () => void;
  onEndGame?: () => void;
  onSkipTurn?: () => void;
}

const PlayerTurnPanel = ({
  players = [],
  activePlayerId = "",
  turnHistory = [],
  gameStatus = "lobby",
  isAdmin = false,
  onPauseGame = () => {},
  onResumeGame = () => {},
  onEndGame = () => {},
  onSkipTurn = () => {},
}: PlayerTurnPanelProps) => {
  const activePlayer = players.find((player) => player.id === activePlayerId);
  const sortedPlayers = [...players].sort(
    (a, b) => a.orderIndex - b.orderIndex,
  );

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Active Player Section */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span>Current Turn</span>
            <Badge variant={gameStatus === "active" ? "default" : "secondary"}>
              {gameStatus === "active"
                ? "Active"
                : gameStatus === "paused"
                  ? "Paused"
                  : gameStatus === "ended"
                    ? "Game Over"
                    : "Waiting"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activePlayer ? (
            <div className="flex items-center space-x-4">
              <Avatar className="h-12 w-12 border-2 border-primary">
                <AvatarImage src={activePlayer.avatarUrl} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {activePlayer.displayName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium text-lg">
                  {activePlayer.displayName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  It's their turn to{" "}
                  {gameStatus === "active" ? "pick or steal a gift" : "wait"}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-4 text-muted-foreground">
              <p>Waiting for game to start...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admin Controls */}
      {isAdmin && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle>Game Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {gameStatus === "active" ? (
                <Button
                  onClick={onPauseGame}
                  variant="outline"
                  className="flex-1"
                >
                  <Pause className="mr-2 h-4 w-4" /> Pause
                </Button>
              ) : gameStatus === "paused" ? (
                <Button
                  onClick={onResumeGame}
                  variant="outline"
                  className="flex-1"
                >
                  <Play className="mr-2 h-4 w-4" /> Resume
                </Button>
              ) : null}

              <Button
                onClick={onSkipTurn}
                variant="outline"
                className="flex-1"
                disabled={gameStatus !== "active"}
              >
                <SkipForward className="mr-2 h-4 w-4" /> Skip
              </Button>

              <Button
                onClick={onEndGame}
                variant="destructive"
                className="flex-1"
                disabled={gameStatus === "ended"}
              >
                <Trophy className="mr-2 h-4 w-4" /> End Game
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Player Order List */}
      <Card className="mb-4 flex-grow">
        <CardHeader className="pb-2">
          <CardTitle>Player Order</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[200px] px-4">
            <ul className="space-y-2 py-2">
              {sortedPlayers.map((player) => (
                <li
                  key={player.id}
                  className={`flex items-center p-2 rounded-md ${player.id === activePlayerId ? "bg-accent" : ""}`}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={player.avatarUrl} />
                      <AvatarFallback
                        className={player.isAdmin ? "bg-amber-500" : "bg-muted"}
                      >
                        {player.displayName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={`${player.id === activePlayerId ? "font-medium" : ""}`}
                    >
                      {player.displayName}
                    </span>
                  </div>
                  {player.isAdmin && <Badge variant="outline">Host</Badge>}
                  {player.id === activePlayerId && <Badge>Active</Badge>}
                </li>
              ))}
            </ul>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Turn History */}
      <Card className="flex-grow">
        <CardHeader className="pb-2">
          <CardTitle>Turn History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[200px]">
            {turnHistory.length > 0 ? (
              <ul className="space-y-1 p-4">
                {turnHistory.map((turn) => (
                  <li key={turn.id} className="text-sm">
                    <div className="flex items-start">
                      <div className="mr-2 mt-0.5">
                        {turn.action === "pick" ? (
                          <Gift className="h-4 w-4 text-blue-500" />
                        ) : (
                          <Gift className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium">{turn.playerName}</span>
                        <span className="text-muted-foreground">
                          {turn.action === "pick" ? " picked " : " stole "}
                        </span>
                        <span className="font-medium">{turn.giftName}</span>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {turn.timestamp}
                      </div>
                    </div>
                    <Separator className="my-2" />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>No turns yet</p>
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlayerTurnPanel;
