import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Gift, Users, Play, Info, RefreshCw, X, Loader2 } from "lucide-react";
import { useGame } from "@/contexts/GameContext";

const Home = () => {
  const [gamePin, setGamePin] = React.useState("");
  const [playerName, setPlayerName] = React.useState("");
  const navigate = useNavigate();
  const { getStoredSessionInfo, restoreSession, clearSession, isLoading } = useGame();
  const [storedSession, setStoredSession] = useState<{ sessionCode: string; playerId: string | null; isAdmin: boolean } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showResumeBanner, setShowResumeBanner] = useState(false);

  // Check for stored session on mount
  useEffect(() => {
    const stored = getStoredSessionInfo();
    if (stored) {
      setStoredSession(stored);
      setShowResumeBanner(true);
    }
  }, []);

  const handleResumeSession = async () => {
    if (!storedSession) return;
    
    setIsRestoring(true);
    try {
      const result = await restoreSession();
      if (result.restored) {
        // Navigate to the appropriate page
        if (result.isAdmin) {
          navigate(`/create`);
        } else if (result.playerId && result.sessionCode) {
          navigate(`/game/${result.sessionCode}?playerId=${result.playerId}`);
        }
      } else {
        // Session no longer valid
        setShowResumeBanner(false);
        setStoredSession(null);
      }
    } catch (error) {
      console.error('Error resuming session:', error);
      setShowResumeBanner(false);
      setStoredSession(null);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDismissResume = () => {
    clearSession();
    setShowResumeBanner(false);
    setStoredSession(null);
  };

  const handleCreateGame = () => {
    // Clear any existing session to start fresh
    clearSession();
    setShowResumeBanner(false);
    setStoredSession(null);
    navigate("/admin/create");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/90">
      {/* Resume Session Banner */}
      {showResumeBanner && storedSession && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-500 to-emerald-500 text-white"
        >
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5" />
              <div>
                <p className="font-medium">
                  {storedSession.isAdmin ? "You have an active game session" : "You're in an active game"}
                </p>
                <p className="text-sm text-white/80">
                  Session: {storedSession.sessionCode} • {storedSession.isAdmin ? "Host" : "Player"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="secondary"
                onClick={handleResumeSession}
                disabled={isRestoring}
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Resuming...
                  </>
                ) : (
                  "Resume Game"
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/20"
                onClick={handleDismissResume}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img src="/elephant-icon.png" alt="White Elephant" className="h-12 w-12" />
          <h1 className="text-2xl font-bold">White Elephant</h1>
        </div>
        <nav>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/about">How to Play</Link>
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-20 flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Host your White Elephant{" "}
              <span className="text-primary">gift exchange</span> online
            </h1>
            <p className="mt-4 text-xl text-muted-foreground">
              A fun, interactive way to run your gift exchange party with
              friends, family, or coworkers.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 pt-4"
          >
            <Button size="lg" onClick={handleCreateGame}>
              Create a Game
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/join">Join a Game</Link>
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex-1"
        >
          <img
            src="https://images.unsplash.com/photo-1482517967863-00e15c9b44be?w=800&q=80"
            alt="Gift boxes"
            className="rounded-lg shadow-xl w-full max-w-md mx-auto"
          />
        </motion.div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">How It Works</h2>
          <p className="text-muted-foreground mt-2">
            Simple steps to run your White Elephant gift exchange
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="bg-card/50">
            <CardHeader>
              <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <Gift className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>1. Setup</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Host creates a game, adds gifts with images, and configures game
                rules.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardHeader>
              <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>2. Join</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Players join via PIN code or QR code using their mobile devices.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardHeader>
              <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <Play className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>3. Play</CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Take turns picking or stealing gifts. The app enforces all game
                rules automatically.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/30 py-12 mt-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Gift className="h-6 w-6 text-primary" />
              <span className="font-bold">White Elephant</span>
            </div>
            <div className="flex gap-6">
              <Link
                to="/about"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                About
              </Link>
              <Link
                to="/privacy"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy
              </Link>
              <Link
                to="/terms"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms
              </Link>
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} White Elephant Gift Exchange. All
            rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;