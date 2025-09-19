import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Copy,
  Download,
  Gift,
  Plus,
  QrCode,
  Settings,
  Share2,
  Trash2,
  Upload,
  Users,
} from "lucide-react";

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

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("setup");
  const [sessionCode, setSessionCode] = useState("ABCD1234");
  const [gameStatus, setGameStatus] = useState<
    "draft" | "lobby" | "active" | "paused" | "ended"
  >("draft");

  // Mock data for gifts
  const [gifts, setGifts] = useState<Gift[]>([
    {
      id: "1",
      name: "Mystery Box",
      imageUrl:
        "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=400&q=80",
      status: "hidden",
      stealCount: 0,
    },
    {
      id: "2",
      name: "Tech Gadget",
      imageUrl:
        "https://images.unsplash.com/photo-1550029402-226115b7c579?w=400&q=80",
      status: "hidden",
      stealCount: 0,
    },
    {
      id: "3",
      name: "Cozy Blanket",
      imageUrl:
        "https://images.unsplash.com/photo-1580301762395-21ce84d00bc6?w=400&q=80",
      status: "hidden",
      stealCount: 0,
    },
  ]);

  // Mock data for players
  const [players, setPlayers] = useState<Player[]>([
    {
      id: "1",
      displayName: "Alice",
      joinTime: "2023-12-01T12:00:00Z",
      isAdmin: true,
      orderIndex: 1,
      eliminated: false,
    },
    {
      id: "2",
      displayName: "Bob",
      joinTime: "2023-12-01T12:05:00Z",
      isAdmin: false,
      orderIndex: 2,
      eliminated: false,
    },
    {
      id: "3",
      displayName: "Charlie",
      joinTime: "2023-12-01T12:10:00Z",
      isAdmin: false,
      orderIndex: 3,
      eliminated: false,
    },
  ]);

  // Game configuration
  const [gameConfig, setGameConfig] = useState<GameConfig>({
    maxStealsPerGift: 2,
    allowImmediateStealback: false,
    randomizeOrder: true,
  });

  // Form states
  const [newGift, setNewGift] = useState({
    name: "",
    imageUrl: "",
    link: "",
  });

  const handleAddGift = () => {
    if (newGift.name && newGift.imageUrl) {
      const gift: Gift = {
        id: `${gifts.length + 1}`,
        name: newGift.name,
        imageUrl: newGift.imageUrl,
        link: newGift.link || undefined,
        status: "hidden",
        stealCount: 0,
      };
      setGifts([...gifts, gift]);
      setNewGift({ name: "", imageUrl: "", link: "" });
    }
  };

  const handleRemoveGift = (id: string) => {
    setGifts(gifts.filter((gift) => gift.id !== id));
  };

  const handleRemovePlayer = (id: string) => {
    setPlayers(players.filter((player) => player.id !== id));
  };

  const handleStartGame = () => {
    setGameStatus("active");
  };

  const handlePauseGame = () => {
    setGameStatus("paused");
  };

  const handleResumeGame = () => {
    setGameStatus("active");
  };

  const handleEndGame = () => {
    setGameStatus("ended");
  };

  const handleExportReport = () => {
    // Logic to export game report
    console.log("Exporting game report...");
  };

  const copySessionCode = () => {
    navigator.clipboard.writeText(sessionCode);
    // You could add a toast notification here
  };

  return (
    <div className="container mx-auto p-4 bg-background">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">White Elephant Admin</h1>
          <p className="text-muted-foreground">
            Manage your gift exchange session
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-muted p-2 rounded-md">
            <span className="text-sm font-medium">Session Code:</span>
            <span className="font-mono font-bold">{sessionCode}</span>
            <Button variant="ghost" size="sm" onClick={copySessionCode}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <QrCode className="h-4 w-4" />
            </Button>
          </div>
          <Badge
            variant={
              gameStatus === "draft"
                ? "outline"
                : gameStatus === "lobby"
                  ? "secondary"
                  : gameStatus === "active"
                    ? "default"
                    : gameStatus === "paused"
                      ? "outline"
                      : "destructive"
            }
          >
            {gameStatus.charAt(0).toUpperCase() + gameStatus.slice(1)}
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 mb-6">
          <TabsTrigger value="setup">Session Setup</TabsTrigger>
          <TabsTrigger value="gifts">Gift Management</TabsTrigger>
          <TabsTrigger value="players">Player Management</TabsTrigger>
          <TabsTrigger value="controls">Game Controls</TabsTrigger>
        </TabsList>

        {/* Session Setup Tab */}
        <TabsContent value="setup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Game Configuration</CardTitle>
              <CardDescription>
                Set up the rules for your White Elephant game
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="maxSteals">Maximum Steals Per Gift</Label>
                  <Input
                    id="maxSteals"
                    type="number"
                    value={gameConfig.maxStealsPerGift}
                    onChange={(e) =>
                      setGameConfig({
                        ...gameConfig,
                        maxStealsPerGift: parseInt(e.target.value),
                      })
                    }
                    min="1"
                    max="5"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="randomizeOrder">
                      Randomize Player Order
                    </Label>
                    <Switch
                      id="randomizeOrder"
                      checked={gameConfig.randomizeOrder}
                      onCheckedChange={(checked) =>
                        setGameConfig({
                          ...gameConfig,
                          randomizeOrder: checked,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="allowStealback"
                    className="text-muted-foreground"
                  >
                    Allow Immediate Stealback
                  </Label>
                  <Switch
                    id="allowStealback"
                    checked={gameConfig.allowImmediateStealback}
                    onCheckedChange={(checked) =>
                      setGameConfig({
                        ...gameConfig,
                        allowImmediateStealback: checked,
                      })
                    }
                    disabled={true}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Note: Immediate stealbacks are not allowed in standard White
                  Elephant rules
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => setGameStatus("lobby")}>
                Save Configuration & Create Lobby
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Gift Management Tab */}
        <TabsContent value="gifts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add New Gift</CardTitle>
              <CardDescription>
                Enter gift details to add to the game
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="giftName">Gift Name</Label>
                  <Input
                    id="giftName"
                    value={newGift.name}
                    onChange={(e) =>
                      setNewGift({ ...newGift, name: e.target.value })
                    }
                    placeholder="Mystery Box"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="giftLink">Gift Link (Optional)</Label>
                  <Input
                    id="giftLink"
                    value={newGift.link}
                    onChange={(e) =>
                      setNewGift({ ...newGift, link: e.target.value })
                    }
                    placeholder="https://example.com/product"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="giftImage">Gift Image URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="giftImage"
                      value={newGift.imageUrl}
                      onChange={(e) =>
                        setNewGift({ ...newGift, imageUrl: e.target.value })
                      }
                      placeholder="https://example.com/image.jpg"
                      className="flex-1"
                    />
                    <Button variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleAddGift}>
                <Plus className="h-4 w-4 mr-2" />
                Add Gift
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gift List</CardTitle>
              <CardDescription>
                Manage gifts for this session ({gifts.length} gifts)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {gifts.map((gift) => (
                    <Card key={gift.id} className="overflow-hidden">
                      <div className="aspect-square relative">
                        <img
                          src={gift.imageUrl}
                          alt={gift.name}
                          className="object-cover w-full h-full"
                        />
                        <Badge
                          className="absolute top-2 right-2"
                          variant={
                            gift.status === "hidden"
                              ? "outline"
                              : gift.status === "revealed"
                                ? "secondary"
                                : gift.status === "locked"
                                  ? "default"
                                  : "destructive"
                          }
                        >
                          {gift.status}
                        </Badge>
                      </div>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{gift.name}</h3>
                            {gift.link && (
                              <a
                                href={gift.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-500 hover:underline truncate block max-w-[200px]"
                              >
                                {gift.link}
                              </a>
                            )}
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Gift</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove this gift?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveGift(gift.id)}
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Player Management Tab */}
        <TabsContent value="players" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Player Management</CardTitle>
              <CardDescription>
                Manage players in your session ({players.length} players)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center mb-4">
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Reorder Players
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Invite
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-3 bg-card rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.displayName}`}
                          />
                          <AvatarFallback>
                            {player.displayName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{player.displayName}</p>
                            {player.isAdmin && (
                              <Badge variant="outline">Admin</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Joined{" "}
                            {new Date(player.joinTime).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">#{player.orderIndex}</Badge>
                        {!player.isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Remove Player
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove this player
                                  from the game?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemovePlayer(player.id)}
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Game Controls Tab */}
        <TabsContent value="controls" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Game Controls</CardTitle>
              <CardDescription>
                Manage the flow of your White Elephant game
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Game Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge
                          variant={
                            gameStatus === "draft"
                              ? "outline"
                              : gameStatus === "lobby"
                                ? "secondary"
                                : gameStatus === "active"
                                  ? "default"
                                  : gameStatus === "paused"
                                    ? "outline"
                                    : "destructive"
                          }
                        >
                          {gameStatus.charAt(0).toUpperCase() +
                            gameStatus.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Players:</span>
                        <span>{players.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Gifts:</span>
                        <span>{gifts.length}</span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Session Code:
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold">
                            {sessionCode}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={copySessionCode}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-lg">Game Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Max Steals Per Gift:
                        </span>
                        <span>{gameConfig.maxStealsPerGift}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Randomize Order:
                        </span>
                        <span>{gameConfig.randomizeOrder ? "Yes" : "No"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Allow Immediate Stealback:
                        </span>
                        <span>
                          {gameConfig.allowImmediateStealback ? "Yes" : "No"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {gameStatus === "draft" || gameStatus === "lobby" ? (
                    <Button
                      onClick={handleStartGame}
                      className="w-full"
                      disabled={gifts.length === 0 || players.length < 2}
                    >
                      <Gift className="h-4 w-4 mr-2" />
                      Start Game
                    </Button>
                  ) : gameStatus === "active" ? (
                    <Button
                      onClick={handlePauseGame}
                      variant="outline"
                      className="w-full"
                    >
                      Pause Game
                    </Button>
                  ) : gameStatus === "paused" ? (
                    <Button onClick={handleResumeGame} className="w-full">
                      Resume Game
                    </Button>
                  ) : null}

                  {gameStatus !== "draft" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full">
                          End Game
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>End Game</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to end the game? This will
                            finalize all gift assignments and cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleEndGame}>
                            End Game
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>

                {gameStatus === "ended" && (
                  <Button
                    onClick={handleExportReport}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Final Report
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Additional configuration options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="showGiftLinks">
                      Show Gift Links in Game
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Display product links during gameplay
                    </p>
                  </div>
                  <Switch id="showGiftLinks" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="collectShipping">
                      Collect Shipping Info
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Ask players for shipping details at game end
                    </p>
                  </div>
                  <Switch id="collectShipping" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="observerMode">Enable Observer Mode</Label>
                    <p className="text-xs text-muted-foreground">
                      Allow view-only participants
                    </p>
                  </div>
                  <Switch id="observerMode" />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
