import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Switch } from "./ui/switch";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { 
  Users, 
  Gift, 
  Play, 
  Pause, 
  Square, 
  UserPlus, 
  Share2, 
  Copy,
  QrCode,
  Upload,
  Trash2,
  Settings,
  Plus,
  Download,
  ExternalLink,
  Loader2,
  Edit,
  Image as ImageIcon
} from "lucide-react";
import QRCode from 'qrcode';

interface Gift {
  id: string;
  name: string;
  imageUrl: string;
  link?: string;
  status: "hidden" | "revealed" | "locked" | "final";
  ownerPlayerId?: string;
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

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("setup");
  const [gameStatus, setGameStatus] = useState<"setup" | "active" | "paused" | "ended">("setup");
  const [sessionCode] = useState("ABCD1234");
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [newGiftUrl, setNewGiftUrl] = useState("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState<{
    title: string;
    description: string;
    image: string;
    url: string;
  } | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState("");
  const [showImageEdit, setShowImageEdit] = useState(false);
  const [editingGiftId, setEditingGiftId] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [showQrCode, setShowQrCode] = useState(false);

  // Game configuration
  const [gameConfig, setGameConfig] = useState<GameConfig>({
    maxStealsPerGift: 2,
    allowImmediateStealback: false,
    randomizeOrder: true,
  });

  const handleFetchPreview = async () => {
    if (!newGiftUrl) return;
    
    setIsLoadingPreview(true);
    try {
      // Try multiple approaches to get link preview data
      console.log('Fetching preview for:', newGiftUrl);
      
      // Approach 1: Try using a CORS proxy with Open Graph scraper
      const corsProxy = 'https://api.allorigins.win/raw?url=';
      const response = await fetch(corsProxy + encodeURIComponent(newGiftUrl));
      const html = await response.text();
      
      console.log('Received HTML response');
      
      // Parse Open Graph tags from HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Extract Open Graph meta tags
      const getMetaContent = (property: string) => {
        const meta = doc.querySelector(`meta[property="${property}"]`) || 
                     doc.querySelector(`meta[name="${property}"]`);
        return meta?.getAttribute('content') || '';
      };
      
      const title = getMetaContent('og:title') || 
                   doc.querySelector('title')?.textContent || 
                   'Product';
      
      const description = getMetaContent('og:description') || 
                         getMetaContent('description') || 
                         '';
      
      let image = getMetaContent('og:image') || 
                   getMetaContent('twitter:image') || 
                   doc.querySelector('img')?.src ||
                   'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80';
      
      // Fix relative URLs - make them absolute
      if (image.startsWith('/')) {
        const url = new URL(newGiftUrl);
        image = `${url.protocol}//${url.host}${image}`;
      } else if (!image.startsWith('http')) {
        const url = new URL(newGiftUrl);
        image = `${url.protocol}//${url.host}/${image}`;
      }
      
      console.log('Extracted data:', { title, description, image });
      
      setPreviewData({
        title: title.trim(),
        description: description.trim(),
        image: image,
        url: newGiftUrl,
      });
    } catch (error) {
      console.error("Error fetching preview:", error);
      
      // Fallback: Ask user to manually provide image
      setPreviewData({
        title: "Gift Item",
        description: "Could not fetch preview. Please add image URL manually.",
        image: "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80",
        url: newGiftUrl,
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleAddGift = () => {
    if (previewData) {
      const gift: Gift = {
        id: `${Date.now()}`,
        name: previewData.title,
        imageUrl: previewData.image,
        link: previewData.url,
        description: previewData.description,
        status: "hidden",
        stealCount: 0,
      };
      setGifts([...gifts, gift]);
      setNewGiftUrl("");
      setPreviewData(null);
    }
  };

  const handleQuickAddGift = async () => {
    if (newGiftUrl) {
      // Automatically fetch metadata before adding
      setIsLoadingPreview(true);
      
      try {
        console.log('Quick adding gift, fetching preview for:', newGiftUrl);
        
        const corsProxy = 'https://api.allorigins.win/raw?url=';
        const response = await fetch(corsProxy + encodeURIComponent(newGiftUrl));
        const html = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const getMetaContent = (property: string) => {
          const meta = doc.querySelector(`meta[property="${property}"]`) || 
                       doc.querySelector(`meta[name="${property}"]`);
          return meta?.getAttribute('content') || '';
        };
        
        const title = getMetaContent('og:title') || 
                     doc.querySelector('title')?.textContent || 
                     'Gift Item';
        
        let image = getMetaContent('og:image') || 
                   getMetaContent('twitter:image') || 
                   'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80';
        
        // Fix relative URLs - make them absolute
        if (image.startsWith('/')) {
          const url = new URL(newGiftUrl);
          image = `${url.protocol}//${url.host}${image}`;
        } else if (!image.startsWith('http')) {
          const url = new URL(newGiftUrl);
          image = `${url.protocol}//${url.host}/${image}`;
        }
        
        console.log('Quick add extracted data:', { title, image });
        
        const gift: Gift = {
          id: `${Date.now()}`,
          name: title.trim() || 'Gift Item',
          imageUrl: image,
          link: newGiftUrl,
          description: newGiftUrl,
          status: "hidden",
          stealCount: 0,
        };
        
        setGifts([...gifts, gift]);
        setNewGiftUrl("");
        setPreviewData(null);
      } catch (error) {
        console.error('Error in quick add:', error);
        
        // Fallback: add with placeholder
        const gift: Gift = {
          id: `${Date.now()}`,
          name: "Gift Item",
          imageUrl: "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80",
          link: newGiftUrl,
          description: newGiftUrl,
          status: "hidden",
          stealCount: 0,
        };
        setGifts([...gifts, gift]);
        setNewGiftUrl("");
        setPreviewData(null);
      } finally {
        setIsLoadingPreview(false);
      }
    }
  };

  const handleUpdatePreviewImage = () => {
    if (previewData && editingImageUrl) {
      setPreviewData({
        ...previewData,
        image: editingImageUrl,
      });
      setEditingImageUrl("");
      setShowImageEdit(false);
    }
  };

  const handleUpdateGiftImage = () => {
    if (editingGiftId && editingImageUrl) {
      setGifts(gifts.map(gift => 
        gift.id === editingGiftId 
          ? { ...gift, imageUrl: editingImageUrl }
          : gift
      ));
      setEditingImageUrl("");
      setEditingGiftId(null);
      setShowImageEdit(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isPreview: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (isPreview && previewData) {
          setPreviewData({
            ...previewData,
            image: base64String,
          });
        } else if (editingGiftId) {
          setGifts(gifts.map(gift => 
            gift.id === editingGiftId 
              ? { ...gift, imageUrl: base64String }
              : gift
          ));
          setEditingGiftId(null);
        }
      };
      reader.readAsDataURL(file);
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
    // Open GameBoard in a new window
    const gameUrl = `${window.location.origin}/game/${sessionCode}`;
    window.open(gameUrl, '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
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

  const handleShareInvite = () => {
    const inviteUrl = `${window.location.origin}/join?code=${sessionCode}`;
    const inviteText = `Join my White Elephant gift exchange! Use code: ${sessionCode} or visit: ${inviteUrl}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'White Elephant Game Invite',
        text: inviteText,
        url: inviteUrl,
      }).catch(console.error);
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(inviteText).then(() => {
        // You could add a toast notification here
        alert('Invite link copied to clipboard!');
      }).catch(() => {
        // Fallback: show the invite text in an alert
        alert(`Share this invite:\n\n${inviteText}`);
      });
    }
  };

  const handleCopyLink = async () => {
    const inviteUrl = `${window.location.origin}/join?code=${sessionCode}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      alert('Invite link copied to clipboard!');
    } catch (err) {
      alert(`Copy this link:\n\n${inviteUrl}`);
    }
  };

  const handleGenerateQrCode = async () => {
    const inviteUrl = `${window.location.origin}/join?code=${sessionCode}`;
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(inviteUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrCodeDataUrl);
      setShowQrCode(true);
    } catch (err) {
      console.error('Error generating QR code:', err);
      alert('Failed to generate QR code');
    }
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
              gameStatus === "setup"
                ? "outline"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div></div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="allowStealback">
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
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Note: Immediate stealbacks are not allowed in standard White
                    Elephant rules
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => setGameStatus("active")}>
                Save Configuration & Start Game
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
                Paste a product link from Amazon, Etsy, or any website
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="giftUrl">Product Link</Label>
                  <div className="flex gap-2">
                    <Input
                      id="giftUrl"
                      value={newGiftUrl}
                      onChange={(e) => setNewGiftUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.shiftKey) {
                          handleQuickAddGift();
                        } else if (e.key === 'Enter') {
                          handleFetchPreview();
                        }
                      }}
                      placeholder="https://amazon.com/product/..."
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleFetchPreview}
                      disabled={!newGiftUrl || isLoadingPreview}
                      variant="outline"
                    >
                      {isLoadingPreview ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Preview"
                      )}
                    </Button>
                    <Button 
                      onClick={handleQuickAddGift}
                      disabled={!newGiftUrl}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Press Enter to preview, or Shift+Enter to add directly
                  </p>
                </div>

                {previewData && (
                  <Card className="overflow-hidden border-2 border-primary">
                    <div className="flex flex-col sm:flex-row">
                      <div className="sm:w-1/3 min-h-[200px] bg-muted relative group flex items-center justify-center p-4">
                        <img
                          src={previewData.image}
                          alt={previewData.title}
                          className="max-w-full max-h-[300px] object-contain"
                          onError={(e) => {
                            console.error('Image failed to load:', previewData.image);
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80';
                          }}
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Dialog open={showImageEdit && !editingGiftId} onOpenChange={setShowImageEdit}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="secondary"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Image
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Update Gift Image</DialogTitle>
                                <DialogDescription>
                                  Upload an image or paste an image URL
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="imageUrl">Image URL</Label>
                                  <Input
                                    id="imageUrl"
                                    value={editingImageUrl}
                                    onChange={(e) => setEditingImageUrl(e.target.value)}
                                    placeholder="https://example.com/image.jpg"
                                  />
                                  <Button 
                                    onClick={handleUpdatePreviewImage}
                                    disabled={!editingImageUrl}
                                    className="w-full"
                                  >
                                    Update Image
                                  </Button>
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                  <Label htmlFor="imageUpload">Upload Image</Label>
                                  <Input
                                    id="imageUpload"
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      handleImageUpload(e, true);
                                      setShowImageEdit(false);
                                    }}
                                  />
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                      <div className="flex-1 p-4">
                        <h3 className="font-semibold text-lg mb-2">
                          {previewData.title}
                        </h3>
                        {previewData.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {previewData.description}
                          </p>
                        )}
                        <a
                          href={previewData.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          View Product
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </CardContent>
            {previewData && (
              <CardFooter>
                <Button 
                  onClick={handleAddGift}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Gift to Game
                </Button>
              </CardFooter>
            )}
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
                      <div className="aspect-video relative bg-muted group flex items-center justify-center p-2">
                        <img
                          src={gift.imageUrl}
                          alt={gift.name}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            console.error('Gift image failed to load:', gift.imageUrl);
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80';
                          }}
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
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Dialog 
                            open={showImageEdit && editingGiftId === gift.id} 
                            onOpenChange={(open) => {
                              setShowImageEdit(open);
                              if (!open) setEditingGiftId(null);
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => setEditingGiftId(gift.id)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Image
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Update Gift Image</DialogTitle>
                                <DialogDescription>
                                  Upload an image or paste an image URL
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor={`imageUrl-${gift.id}`}>Image URL</Label>
                                  <Input
                                    id={`imageUrl-${gift.id}`}
                                    value={editingImageUrl}
                                    onChange={(e) => setEditingImageUrl(e.target.value)}
                                    placeholder="https://example.com/image.jpg"
                                  />
                                  <Button 
                                    onClick={handleUpdateGiftImage}
                                    disabled={!editingImageUrl}
                                    className="w-full"
                                  >
                                    Update Image
                                  </Button>
                                </div>
                                <Separator />
                                <div className="space-y-2">
                                  <Label htmlFor={`imageUpload-${gift.id}`}>Upload Image</Label>
                                  <Input
                                    id={`imageUpload-${gift.id}`}
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      handleImageUpload(e, false);
                                      setShowImageEdit(false);
                                    }}
                                  />
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <h3 className="font-medium line-clamp-1">{gift.name}</h3>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Remove Gift</DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to remove this gift?
                                    This action cannot be undone.
                                  </DialogDescription>
                                </DialogHeader>
                                <Button
                                  onClick={() => handleRemoveGift(gift.id)}
                                  className="w-full"
                                >
                                  Remove
                                </Button>
                              </DialogContent>
                            </Dialog>
                          </div>
                          {gift.link && (
                            <a
                              href={gift.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              View Product
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
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
                  <Button variant="outline" onClick={handleShareInvite}>
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
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>
                                  Remove Player
                                </DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to remove this player
                                  from the game?
                                </DialogDescription>
                              </DialogHeader>
                              <Button
                                onClick={() => handleRemovePlayer(player.id)}
                                className="w-full"
                              >
                                Remove
                              </Button>
                            </DialogContent>
                          </Dialog>
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
                            gameStatus === "setup"
                              ? "outline"
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
                  {gameStatus === "setup" ? (
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

                  {gameStatus !== "setup" && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="destructive" className="w-full">
                          End Game
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>End Game</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to end the game? This will
                            finalize all gift assignments and cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <Button
                          onClick={handleEndGame}
                          className="w-full"
                        >
                          End Game
                        </Button>
                      </DialogContent>
                    </Dialog>
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
                <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="text-3xl font-bold text-primary mb-2">{sessionCode}</div>
                  <p className="text-sm text-muted-foreground mb-4">Share this code with players</p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button variant="outline" onClick={handleCopyLink}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </Button>
                    <Button variant="outline" onClick={handleGenerateQrCode}>
                      <QrCode className="h-4 w-4 mr-2" />
                      Show QR Code
                    </Button>
                    <Button variant="outline" onClick={handleShareInvite}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Invite
                    </Button>
                  </div>
                </div>

                <Dialog open={showQrCode} onOpenChange={setShowQrCode}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>QR Code Invite</DialogTitle>
                      <DialogDescription>
                        Players can scan this QR code to join the game
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center space-y-4">
                      {qrCodeUrl && (
                        <img 
                          src={qrCodeUrl} 
                          alt="QR Code for game invite" 
                          className="border rounded-lg"
                        />
                      )}
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-2">Game Code:</p>
                        <p className="text-2xl font-bold">{sessionCode}</p>
                      </div>
                      <Button onClick={handleCopyLink} className="w-full">
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Invite Link
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{players.length}</div>
                    <div className="text-sm text-muted-foreground">Players Joined</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{gifts.length}</div>
                    <div className="text-sm text-muted-foreground">Gifts Added</div>
                  </div>
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