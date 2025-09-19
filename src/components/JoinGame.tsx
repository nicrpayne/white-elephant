import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { Users, GamepadIcon } from "lucide-react";

export default function JoinGame() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [gameCode, setGameCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");

  // Pre-populate game code from URL parameter
  useEffect(() => {
    const codeFromUrl = searchParams.get("code");
    if (codeFromUrl) {
      setGameCode(codeFromUrl.toUpperCase());
    }
  }, [searchParams]);

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
      // Simulate joining game (in real app, this would be an API call)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Navigate to game board with player info
      navigate(`/game/${gameCode}?player=${encodeURIComponent(playerName)}`);
    } catch (err) {
      setError("Failed to join game. Please check your game code and try again.");
    } finally {
      setIsJoining(false);
    }
  };

  const formatGameCode = (value: string) => {
    // Remove non-alphanumeric characters and convert to uppercase
    const cleaned = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    // Limit to 8 characters
    return cleaned.slice(0, 8);
  };

  const handleGameCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatGameCode(e.target.value);
    setGameCode(formatted);
  };

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
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
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