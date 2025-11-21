import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { Users, GamepadIcon, Loader2, Clock, Gift } from "lucide-react";
import { useGame } from "@/contexts/GameContext";

export default function JoinGame() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { gameState, isLoading: contextLoading, joinSession } = useGame();
  const [gameCode, setGameCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);

  // Pre-populate game code from URL parameter
  useEffect(() => {
    const codeFromUrl = searchParams.get("code");
    if (codeFromUrl) {
      setGameCode(codeFromUrl.toUpperCase());
    }
  }, [searchParams]);

  // Check if game has started
  useEffect(() => {
    if (hasJoined && gameState.gameStatus === "active") {
      // Navigate to game board when game starts
      navigate(`/game/${gameState.sessionCode}?playerId=${playerId}`);
    }
  }, [hasJoined, gameState.gameStatus, navigate, gameState.sessionCode, playerId]);

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!gameCode.trim()) {
      setError("Please enter a game code");
      return;
    }
    
    if (!playerName.trim()) {
      setError("Please enter your name");
      return;
    }

    if (gameCode.length !== 8) {
      setError("Game code must be 8 characters long");
      return;
    }

    setIsJoining(true);
    
    try {
      const newPlayerId = await joinSession(gameCode.toUpperCase(), playerName.trim());
      setPlayerId(newPlayerId);
      setHasJoined(true);
    } catch (err: any) {
      setError(err.message || "Failed to join game. Please check the code and try again.");
    } finally {
      setIsJoining(false);
    }
  };

  const formatGameCode = (value: string) => {
    const cleaned = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    return cleaned.slice(0, 8);
  };

  const handleGameCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatGameCode(e.target.value);
    setGameCode(formatted);
  };

  // Lobby waiting screen
  if (hasJoined) {
    const currentPlayer = gameState.players.find(p => p.id === playerId);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-green-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
              <Clock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">You're in the Lobby!</CardTitle>
            <CardDescription>
              Waiting for the host to start the game
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center p-6 bg-primary/5 rounded-lg border-2 border-primary/20">
              <p className="text-sm text-muted-foreground mb-2">You joined as</p>
              <div className="flex items-center justify-center gap-3 mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentPlayer?.avatarSeed || currentPlayer?.displayName}`} />
                  <AvatarFallback>
                    {currentPlayer?.displayName?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="font-bold text-xl">{currentPlayer?.displayName}</p>
                  <p className="text-sm text-muted-foreground">Player #{currentPlayer?.orderIndex}</p>
                </div>
              </div>
              <Badge variant="secondary" className="text-base px-4 py-1">
                Game Code: {gameState.sessionCode}
              </Badge>
            </div>

            <Separator />

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Players in Lobby ({gameState.players.length})</h3>
                <Badge variant="outline">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Waiting
                </Badge>
              </div>
              <ScrollArea className="h-[250px]">
                <div className="space-y-2">
                  {gameState.players.map((player) => (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        player.id === playerId ? 'bg-primary/5 border-primary/30' : 'bg-card'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.avatarSeed || player.displayName}`}
                          />
                          <AvatarFallback>
                            {player.displayName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {player.displayName}
                              {player.id === playerId && " (You)"}
                            </p>
                            {player.isAdmin && (
                              <Badge variant="outline" className="text-xs">Host</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Joined {new Date(player.joinTime).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">#{player.orderIndex}</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Gift className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">What's next?</p>
                  <p className="text-sm text-muted-foreground">
                    The host will start the game once everyone has joined. You'll automatically be taken to the game board.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              variant="outline" 
              onClick={() => {
                setHasJoined(false);
                setPlayerId(null);
                // Note: Should also remove player from context, but keeping them for now
              }}
              className="w-full"
            >
              Leave Lobby
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Join form
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-green-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <GamepadIcon className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Join White Elephant Game</CardTitle>
          <CardDescription>
            Enter your details to join the gift exchange
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoinGame} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gameCode">Game Code</Label>
              <Input
                id="gameCode"
                type="text"
                placeholder="ABCD1234"
                value={gameCode}
                onChange={handleGameCodeChange}
                className="text-center text-lg font-mono tracking-wider"
                maxLength={8}
                required
              />
              <p className="text-xs text-muted-foreground text-center">
                Enter the 8-character game code
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="playerName">Your Name</Label>
              <Input
                id="playerName"
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={50}
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isJoining}
            >
              {isJoining ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Joining Game...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Join Game
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-sm text-muted-foreground mb-2">
              Don't have a game code?
            </p>
            <Button 
              variant="outline" 
              onClick={() => navigate("/")}
              className="w-full"
            >
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}