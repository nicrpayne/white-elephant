import React from "react";
import { Link } from "react-router-dom";
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
import { Gift, Users, Play, Info } from "lucide-react";

const Home = () => {
  const [gamePin, setGamePin] = React.useState("");
  const [playerName, setPlayerName] = React.useState("");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/90">
      {/* Header */}
      <header className="container mx-auto py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img src="/elephant-icon.png" alt="White Elephant" className="h-8 w-8" />
          <h1 className="text-2xl font-bold">White Elephant</h1>
        </div>
        <nav>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/about">How to Play</Link>
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto py-12 md:py-24 flex flex-col md:flex-row items-center gap-8">
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
            <Button size="lg" asChild>
              <Link to="/create">Create a Game</Link>
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

      {/* Join Game Section */}
      <section className="container mx-auto py-16 bg-card rounded-lg shadow-lg p-8 mb-16">
        <div className="max-w-3xl mx-auto">
          <Tabs defaultValue="join" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="join" className="text-lg py-3">
                <Users className="mr-2 h-5 w-5" /> Join a Game
              </TabsTrigger>
              <TabsTrigger value="create" className="text-lg py-3">
                <Play className="mr-2 h-5 w-5" /> Create a Game
              </TabsTrigger>
            </TabsList>

            <TabsContent value="join" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Join an Existing Game</CardTitle>
                  <CardDescription>
                    Enter the game PIN provided by the host to join a White
                    Elephant gift exchange.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="game-pin" className="text-sm font-medium">
                        Game PIN
                      </label>
                      <Input
                        id="game-pin"
                        placeholder="Enter 6-digit PIN"
                        value={gamePin}
                        onChange={(e) => setGamePin(e.target.value)}
                        className="text-lg py-6"
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="player-name"
                        className="text-sm font-medium"
                      >
                        Your Name
                      </label>
                      <Input
                        id="player-name"
                        placeholder="Enter your display name"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        className="text-lg py-6"
                      />
                    </div>
                  </form>
                </CardContent>
                <CardFooter>
                  <Button size="lg" className="w-full text-lg py-6">
                    Join Game
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="create">
              <Card>
                <CardHeader>
                  <CardTitle>Create a New Game</CardTitle>
                  <CardDescription>
                    Set up a new White Elephant gift exchange as the host.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p>As the host, you'll be able to:</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>Add gifts with images and descriptions</li>
                      <li>Set game rules and options</li>
                      <li>Control the game flow</li>
                      <li>Generate a final report</li>
                    </ul>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button size="lg" className="w-full text-lg py-6" asChild>
                    <Link to="/admin/create">Create New Game</Link>
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto py-16">
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
      <footer className="bg-muted/30 py-12">
        <div className="container mx-auto">
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