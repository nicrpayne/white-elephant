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
import { Checkbox } from "./ui/checkbox";
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
  Image as ImageIcon,
  Grid3x3,
  List,
  GripVertical,
  ChevronRight,
  ChevronLeft,
  Check
} from "lucide-react";
import QRCode from 'qrcode';
import { useGame } from "@/contexts/GameContext";

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
  const { 
    gameState, 
    isLoading,
    createSession,
    addGift: addGiftAsync, 
    removeGift: removeGiftAsync, 
    updateGift: updateGiftAsync,
    updateGameStatus,
    updateGameConfig: updateGameConfigAsync,
    startGame: startGameAsync,
    setGifts, 
    setPlayers, 
    setGameStatus, 
    setGameConfig, 
    setActivePlayerId 
  } = useGame();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [activeTab, setActiveTab] = useState("setup");
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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedGiftIds, setSelectedGiftIds] = useState<Set<string>>(new Set());
  const [draggedGiftId, setDraggedGiftId] = useState<string | null>(null);

  // Get values from context
  const { gifts, players, gameStatus, sessionCode, gameConfig } = gameState;

  // Stepper configuration
  const steps = [
    { id: 0, title: "Game Rules", description: "Configure game settings" },
    { id: 1, title: "Add Gifts", description: "Add gifts to the exchange" },
    { id: 2, title: "Open Lobby", description: "Let players join" },
    { id: 3, title: "Start Game", description: "Begin the exchange" }
  ];

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 0: return true; // Rules can always proceed
      case 1: return gifts.length > 0; // Need at least 1 gift
      case 2: return true; // Can always open lobby
      case 3: return players.length >= 2; // Need at least 2 players to start
      default: return false;
    }
  };

  const handleOpenLobby = async () => {
    try {
      // Create session if not exists
      if (!gameState.sessionId) {
        await createSession();
      }
      await updateGameStatus("lobby");
      setCurrentStep(2);
    } catch (error) {
      console.error('Error opening lobby:', error);
      alert('Failed to open lobby. Please try again.');
    }
  };

  const handleStartGame = async () => {
    if (players.length < 2) {
      alert("Need at least 2 players to start the game!");
      return;
    }
    
    try {
      await startGameAsync();
    } catch (error) {
      console.error('Error starting game:', error);
      alert('Failed to start game. Please try again.');
    }
  };

  // Auto-fetch preview when URL is pasted
  const handleUrlChange = async (url: string) => {
    setNewGiftUrl(url);
    
    // Check if it's a valid URL
    if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
      setIsLoadingPreview(true);
      
      try {
        console.log('Auto-fetching preview for:', url);
        
        // For Amazon, try to extract ASIN and use a more reliable approach
        let title = 'Product';
        let description = '';
        let image = 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80';
        
        if (url.includes('amazon.com')) {
          // Extract ASIN from Amazon URL
          const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/i) || url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
          
          if (asinMatch) {
            const asin = asinMatch[1];
            console.log('Found Amazon ASIN:', asin);
            
            // Try to fetch the page directly (some proxies work better for Amazon)
            try {
              const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, {
                signal: AbortSignal.timeout(8000)
              });
              const html = await response.text();
              
              // Extract title from various possible locations
              const titleMatch = html.match(/<span id="productTitle"[^>]*>([^<]+)<\/span>/i) ||
                                html.match(/<title>([^<]+)<\/title>/i);
              
              if (titleMatch) {
                title = titleMatch[1].trim().replace(/\s+/g, ' ').replace(' : Amazon.com', '').replace(' - Amazon.com', '');
              }
              
              // Extract image - Amazon uses specific patterns
              const imageMatch = html.match(/"hiRes":"([^"]+)"/i) ||
                                html.match(/"large":"([^"]+)"/i) ||
                                html.match(/data-old-hires="([^"]+)"/i) ||
                                html.match(/data-a-dynamic-image="[^"]*([^"]+\.jpg)/i);
              
              if (imageMatch) {
                image = imageMatch[1].replace(/\\u0026/g, '&').replace(/\\/g, '');
              }
              
              // Try to get description
              const descMatch = html.match(/<meta name="description" content="([^"]+)"/i);
              if (descMatch) {
                description = descMatch[1].trim();
              }
              
              console.log('Extracted Amazon data:', { title, image, description });
            } catch (e) {
              console.log('Direct fetch failed, using ASIN fallback');
              title = `Amazon Product (${asin})`;
            }
          }
        } else {
          // For non-Amazon sites, use the existing approach
          const corsProxies = [
            'https://corsproxy.io/?',
            'https://api.allorigins.win/raw?url=',
          ];
          
          let html = '';
          let fetchSuccess = false;
          
          for (const proxy of corsProxies) {
            try {
              const response = await fetch(proxy + encodeURIComponent(url), {
                signal: AbortSignal.timeout(8000)
              });
              html = await response.text();
              fetchSuccess = true;
              break;
            } catch (proxyError) {
              console.log(`Proxy ${proxy} failed, trying next...`);
              continue;
            }
          }
          
          if (fetchSuccess) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            const getMetaContent = (property: string) => {
              const meta = doc.querySelector(`meta[property="${property}"]`) || 
                           doc.querySelector(`meta[name="${property}"]`);
              return meta?.getAttribute('content') || '';
            };
            
            title = getMetaContent('og:title') || 
                   getMetaContent('twitter:title') ||
                   doc.querySelector('title')?.textContent || 
                   'Product';
            
            description = getMetaContent('og:description') || 
                         getMetaContent('description') || 
                         getMetaContent('twitter:description') ||
                         '';
            
            let imgSrc = getMetaContent('og:image') || 
                        getMetaContent('twitter:image') || 
                        doc.querySelector('img')?.src ||
                        'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80';
            
            // Fix relative URLs
            if (imgSrc.startsWith('/')) {
              const urlObj = new URL(url);
              image = `${urlObj.protocol}//${urlObj.host}${imgSrc}`;
            } else if (!imgSrc.startsWith('http')) {
              const urlObj = new URL(url);
              image = `${urlObj.protocol}//${urlObj.host}/${imgSrc}`;
            } else {
              image = imgSrc;
            }
          }
        }
        
        setPreviewData({
          title: title.trim(),
          description: description.trim(),
          image: image,
          url: url,
        });
      } catch (error) {
        console.error('Error auto-fetching preview:', error);
        
        // Extract domain name for better fallback
        let siteName = 'Gift Item';
        try {
          const urlObj = new URL(url);
          siteName = urlObj.hostname.replace('www.', '').split('.')[0];
          siteName = siteName.charAt(0).toUpperCase() + siteName.slice(1) + ' Product';
        } catch (e) {
          // ignore
        }
        
        setPreviewData({
          title: siteName,
          description: "Preview unavailable. You can still add this gift - the link will work for players.",
          image: "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80",
          url: url,
        });
      } finally {
        setIsLoadingPreview(false);
      }
    } else {
      setPreviewData(null);
    }
  };

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

  const handleAddGift = async () => {
    if (previewData) {
      try {
        // Ensure session exists
        if (!gameState.sessionId) {
          await createSession();
        }

        await addGiftAsync({
          name: previewData.title,
          imageUrl: previewData.image,
          link: previewData.url,
          description: previewData.description,
        });
        setNewGiftUrl("");
        setPreviewData(null);
      } catch (error) {
        console.error('Error adding gift:', error);
        alert('Failed to add gift. Please try again.');
      }
    }
  };

  const handleQuickAddGift = async () => {
    if (!newGiftUrl.trim() || !previewData) return;
    
    try {
      // Ensure session exists
      if (!gameState.sessionId) {
        await createSession();
      }

      await addGiftAsync({
        name: previewData.title,
        imageUrl: previewData.image,
        link: previewData.url,
        description: previewData.description,
      });
      
      setNewGiftUrl("");
      setPreviewData(null);
    } catch (error) {
      console.error('Error adding gift:', error);
      alert('Failed to add gift. Please try again.');
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

  const handleUpdateGiftImage = async () => {
    if (!editingGiftId || !editingImageUrl) return;
    
    try {
      await updateGiftAsync(editingGiftId, { imageUrl: editingImageUrl });
      setShowImageEdit(false);
      setEditingGiftId(null);
      setEditingImageUrl("");
    } catch (error) {
      console.error('Error updating gift image:', error);
      alert('Failed to update image. Please try again.');
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
          updateGiftAsync(editingGiftId, { imageUrl: base64String });
          setEditingGiftId(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveGift = async (giftId: string) => {
    try {
      await removeGiftAsync(giftId);
    } catch (error) {
      console.error('Error removing gift:', error);
      alert('Failed to remove gift. Please try again.');
    }
  };

  const handleBulkDeleteGifts = async () => {
    try {
      await Promise.all(
        Array.from(selectedGiftIds).map(id => removeGiftAsync(id))
      );
      setSelectedGiftIds(new Set());
    } catch (error) {
      console.error('Error deleting gifts:', error);
      alert('Failed to delete some gifts. Please try again.');
    }
  };

  const toggleGiftSelection = (id: string) => {
    const newSelected = new Set(selectedGiftIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedGiftIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedGiftIds.size === gifts.length) {
      setSelectedGiftIds(new Set());
    } else {
      setSelectedGiftIds(new Set(gifts.map(g => g.id)));
    }
  };

  const handleDragStart = (e: React.DragEvent, giftId: string) => {
    setDraggedGiftId(giftId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetGiftId: string) => {
    e.preventDefault();
    if (!draggedGiftId || draggedGiftId === targetGiftId) return;

    const draggedIndex = gifts.findIndex(g => g.id === draggedGiftId);
    const targetIndex = gifts.findIndex(g => g.id === targetGiftId);

    const newGifts = [...gifts];
    const [removed] = newGifts.splice(draggedIndex, 1);
    newGifts.splice(targetIndex, 0, removed);

    setGifts(newGifts);
    setDraggedGiftId(null);
  };

  const handleDragEnd = () => {
    setDraggedGiftId(null);
  };

  const handleRemovePlayer = (id: string) => {
    removePlayer(id);
  };

  const handlePauseGame = async () => {
    try {
      await updateGameStatus("paused");
    } catch (error) {
      console.error('Error pausing game:', error);
    }
  };

  const handleResumeGame = async () => {
    try {
      await updateGameStatus("active");
    } catch (error) {
      console.error('Error resuming game:', error);
    }
  };

  const handleEndGame = async () => {
    try {
      await updateGameStatus("ended");
    } catch (error) {
      console.error('Error ending game:', error);
    }
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
            {gameStatus === "setup" ? "Set up your gift exchange" : "Manage your gift exchange session"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-muted p-2 rounded-md">
            <span className="text-sm font-medium">Session Code:</span>
            <span className="font-mono font-bold">{sessionCode}</span>
            <Button variant="ghost" size="sm" onClick={copySessionCode}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleGenerateQrCode}>
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

      {gameStatus === "setup" ? (
        // Stepper UI for setup
        <div className="space-y-6">
          {/* Progress Stepper */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <button
                        onClick={() => {
                          // Can only go back to completed steps or current step
                          if (step.id <= currentStep) {
                            setCurrentStep(step.id);
                          }
                        }}
                        disabled={step.id > currentStep}
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                          currentStep === step.id
                            ? "bg-primary text-primary-foreground"
                            : currentStep > step.id
                              ? "bg-primary/20 text-primary cursor-pointer hover:bg-primary/30"
                              : "bg-muted text-muted-foreground cursor-not-allowed"
                        }`}
                      >
                        {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id + 1}
                      </button>
                      <div className="mt-2 text-center">
                        <p className={`text-sm font-medium ${currentStep === step.id ? "text-foreground" : "text-muted-foreground"}`}>
                          {step.title}
                        </p>
                        <p className="text-xs text-muted-foreground hidden sm:block">{step.description}</p>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`h-0.5 flex-1 mx-2 ${currentStep > step.id ? "bg-primary" : "bg-muted"}`} />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Step Content */}
          {currentStep === 0 && (
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
                      onChange={async (e) => {
                        const value = parseInt(e.target.value);
                        setGameConfig({
                          ...gameConfig,
                          maxStealsPerGift: value,
                        });
                        if (gameState.sessionId) {
                          await updateGameConfigAsync({ maxStealsPerGift: value });
                        }
                      }}
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
                        onCheckedChange={async (checked) => {
                          setGameConfig({
                            ...gameConfig,
                            randomizeOrder: checked,
                          });
                          if (gameState.sessionId) {
                            await updateGameConfigAsync({ randomizeOrder: checked });
                          }
                        }}
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
                        onCheckedChange={async (checked) => {
                          setGameConfig({
                            ...gameConfig,
                            allowImmediateStealback: checked,
                          });
                          if (gameState.sessionId) {
                            await updateGameConfigAsync({ allowImmediateStealback: checked });
                          }
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Note: Immediate stealbacks are not allowed in standard White
                      Elephant rules
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 1 && (
            <>
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
                          onChange={(e) => handleUrlChange(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && previewData) {
                              handleAddGift();
                            }
                          }}
                          placeholder="https://amazon.com/product/..."
                          className="flex-1"
                        />
                        {isLoadingPreview && (
                          <div className="flex items-center px-3">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Paste a product link and the preview will load automatically
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
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Gift List ({gifts.length})</CardTitle>
                      <CardDescription>
                        Gifts added to this session
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedGiftIds.size > 0 && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete ({selectedGiftIds.size})
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete Selected Gifts</DialogTitle>
                              <DialogDescription>
                                Are you sure you want to delete {selectedGiftIds.size} selected gift(s)?
                                This action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <Button
                              onClick={handleBulkDeleteGifts}
                              variant="destructive"
                              className="w-full"
                            >
                              Delete {selectedGiftIds.size} Gift(s)
                            </Button>
                          </DialogContent>
                        </Dialog>
                      )}
                      <div className="flex items-center gap-1 border rounded-md">
                        <Button
                          variant={viewMode === "grid" ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => setViewMode("grid")}
                          className="rounded-r-none"
                        >
                          <Grid3x3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={viewMode === "list" ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => setViewMode("list")}
                          className="rounded-l-none"
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-4">
                    {viewMode === "grid" ? (
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
                    ) : (
                      <div className="space-y-2">
                        {gifts.length > 0 && (
                          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg border font-medium text-sm">
                            <Checkbox
                              checked={selectedGiftIds.size === gifts.length && gifts.length > 0}
                              onCheckedChange={toggleSelectAll}
                            />
                            <div className="w-12 text-center">Image</div>
                            <div className="flex-1">Name</div>
                            <div className="w-24">Status</div>
                            <div className="w-20 text-center">Actions</div>
                          </div>
                        )}
                        {gifts.map((gift, index) => (
                          <div
                            key={gift.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, gift.id)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, gift.id)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center gap-3 p-3 bg-card rounded-lg border hover:bg-accent/50 transition-colors cursor-move ${
                              draggedGiftId === gift.id ? 'opacity-50' : ''
                            }`}
                          >
                            <Checkbox
                              checked={selectedGiftIds.has(gift.id)}
                              onCheckedChange={() => toggleGiftSelection(gift.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                              <img
                                src={gift.imageUrl}
                                alt={gift.name}
                                className="max-w-full max-h-full object-contain"
                                onError={(e) => {
                                  console.error('Gift image failed to load:', gift.imageUrl);
                                  e.currentTarget.src = 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80';
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">{gift.name}</h3>
                              {gift.link && (
                                <a
                                  href={gift.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View Product
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                            <Badge
                              className="w-24 justify-center"
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
                            <div className="flex items-center gap-1">
                              <Dialog 
                                open={showImageEdit && editingGiftId === gift.id} 
                                onOpenChange={(open) => {
                                  setShowImageEdit(open);
                                  if (!open) setEditingGiftId(null);
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingGiftId(gift.id);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
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
                                      <Label htmlFor={`imageUrl-list-${gift.id}`}>Image URL</Label>
                                      <Input
                                        id={`imageUrl-list-${gift.id}`}
                                        value={editingImageUrl}
                                        onChange={(e) => setEditingGiftId(e.target.value)}
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
                                      <Label htmlFor={`imageUpload-list-${gift.id}`}>Upload Image</Label>
                                      <Input
                                        id={`imageUpload-list-${gift.id}`}
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
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive"
                                    onClick={(e) => e.stopPropagation()}
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
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          )}

          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Open Lobby</CardTitle>
                    <CardDescription>
                      Ready to let players join? Open the lobby to share the code.
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentStep(1)}
                  >
                    <Gift className="h-4 w-4 mr-2" />
                    Edit Gifts
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center p-8 border-2 border-dashed border-primary/50 rounded-lg bg-primary/5">
                  <div className="text-5xl font-bold text-primary mb-3">{sessionCode}</div>
                  <p className="text-muted-foreground mb-6">Players will use this code to join</p>
                  <Button 
                    onClick={handleOpenLobby}
                    size="lg"
                    className="w-full max-w-md"
                  >
                    <Users className="h-5 w-5 mr-2" />
                    Open Lobby for Players
                  </Button>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">What happens next?</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✓ Lobby opens and players can join using the code</li>
                    <li>✓ You can still edit gifts while waiting</li>
                    <li>✓ Once 2+ players join, you can start the game</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Ready to Start!</CardTitle>
                    <CardDescription>
                      Review your setup and start the game
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCurrentStep(1)}
                  >
                    <Gift className="h-4 w-4 mr-2" />
                    Edit Gifts
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-muted/50">
                    <CardContent className="pt-6 text-center">
                      <Settings className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <div className="text-2xl font-bold">{gameConfig.maxStealsPerGift}</div>
                      <div className="text-sm text-muted-foreground">Max Steals</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-6 text-center">
                      <Gift className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <div className="text-2xl font-bold">{gifts.length}</div>
                      <div className="text-sm text-muted-foreground">Gifts Added</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-6 text-center">
                      <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <div className="text-2xl font-bold">{players.length}</div>
                      <div className="text-sm text-muted-foreground">Players Joined</div>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <h3 className="font-semibold">Game Rules</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✓ Maximum {gameConfig.maxStealsPerGift} steals per gift</li>
                    <li>✓ Player order will be {gameConfig.randomizeOrder ? "randomized" : "kept as joined"}</li>
                    <li>✓ Immediate stealback is {gameConfig.allowImmediateStealback ? "allowed" : "not allowed"}</li>
                  </ul>
                </div>

                {(gifts.length === 0 || players.length < 2) && (
                  <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                    <p className="text-sm text-destructive font-medium">
                      ⚠️ Cannot start game:
                    </p>
                    <ul className="text-sm text-destructive/80 mt-2 space-y-1">
                      {gifts.length === 0 && <li>• Add at least 1 gift</li>}
                      {players.length < 2 && <li>• Need at least 2 players</li>}
                    </ul>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleStartGame}
                  className="w-full"
                  size="lg"
                  disabled={gifts.length === 0 || players.length < 2}
                >
                  <Play className="h-5 w-5 mr-2" />
                  Start Game
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={() => {
                if (currentStep === 3) {
                  handleStartGame();
                } else {
                  setCurrentStep(Math.min(steps.length - 1, currentStep + 1));
                }
              }}
              disabled={!canProceedToNextStep()}
            >
              {currentStep === 3 ? (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Game
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      ) : gameStatus === "lobby" ? (
        // Lobby waiting room
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Lobby Open - Waiting for Players</CardTitle>
                  <CardDescription>
                    {players.length} player{players.length !== 1 ? 's' : ''} joined • Need at least 2 to start
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  Lobby Open
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center p-8 border-2 border-dashed border-primary/50 rounded-lg bg-primary/5">
                <div className="text-5xl font-bold text-primary mb-3">{sessionCode}</div>
                <p className="text-muted-foreground mb-6">Share this code with players</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
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

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Players Joined ({players.length})</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setGameStatus("setup");
                      setCurrentStep(1);
                    }}
                  >
                    <Gift className="h-4 w-4 mr-2" />
                    Edit Gifts
                  </Button>
                </div>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {players.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No players have joined yet</p>
                        <p className="text-sm">Share the code above to invite players</p>
                      </div>
                    ) : (
                      players.map((player) => (
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
                          <Badge variant="secondary">#{player.orderIndex}</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setGameStatus("setup");
                    setCurrentStep(2);
                  }}
                  className="flex-1"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back to Setup
                </Button>
                <Button
                  onClick={handleStartGame}
                  disabled={players.length < 2}
                  className="flex-1"
                  size="lg"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Start Game ({players.length}/2+ players)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        // Existing tabs for active game management
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-6">
            <TabsTrigger value="gifts">Gift Management</TabsTrigger>
            <TabsTrigger value="players">Player Management</TabsTrigger>
            <TabsTrigger value="controls">Game Controls</TabsTrigger>
          </TabsList>

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
                        onChange={(e) => handleUrlChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && previewData) {
                            handleAddGift();
                          }
                        }}
                        placeholder="https://amazon.com/product/..."
                        className="flex-1"
                      />
                      {isLoadingPreview && (
                        <div className="flex items-center px-3">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Paste a product link and the preview will load automatically
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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Gift List</CardTitle>
                    <CardDescription>
                      Manage gifts for this session ({gifts.length} gifts)
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedGiftIds.size > 0 && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete ({selectedGiftIds.size})
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete Selected Gifts</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to delete {selectedGiftIds.size} selected gift(s)?
                              This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <Button
                            onClick={handleBulkDeleteGifts}
                            variant="destructive"
                            className="w-full"
                          >
                            Delete {selectedGiftIds.size} Gift(s)
                          </Button>
                        </DialogContent>
                      </Dialog>
                    )}
                    <div className="flex items-center gap-1 border rounded-md">
                      <Button
                        variant={viewMode === "grid" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("grid")}
                        className="rounded-r-none"
                      >
                        <Grid3x3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === "list" ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className="rounded-l-none"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  {viewMode === "grid" ? (
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
                  ) : (
                    <div className="space-y-2">
                      {gifts.length > 0 && (
                        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg border font-medium text-sm">
                          <Checkbox
                            checked={selectedGiftIds.size === gifts.length && gifts.length > 0}
                            onCheckedChange={toggleSelectAll}
                          />
                          <div className="w-12 text-center">Image</div>
                          <div className="flex-1">Name</div>
                          <div className="w-24">Status</div>
                          <div className="w-20 text-center">Actions</div>
                        </div>
                      )}
                      {gifts.map((gift, index) => (
                        <div
                          key={gift.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, gift.id)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, gift.id)}
                          onDragEnd={handleDragEnd}
                          className={`flex items-center gap-3 p-3 bg-card rounded-lg border hover:bg-accent/50 transition-colors cursor-move ${
                            draggedGiftId === gift.id ? 'opacity-50' : ''
                          }`}
                        >
                          <Checkbox
                            checked={selectedGiftIds.has(gift.id)}
                            onCheckedChange={() => toggleGiftSelection(gift.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                            <img
                              src={gift.imageUrl}
                              alt={gift.name}
                              className="max-w-full max-h-full object-contain"
                              onError={(e) => {
                                console.error('Gift image failed to load:', gift.imageUrl);
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80';
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{gift.name}</h3>
                            {gift.link && (
                              <a
                                href={gift.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Product
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                          <Badge
                            className="w-24 justify-center"
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
                          <div className="flex items-center gap-1">
                            <Dialog 
                              open={showImageEdit && editingGiftId === gift.id} 
                              onOpenChange={(open) => {
                                setShowImageEdit(open);
                                if (!open) setEditingGiftId(null);
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingGiftId(gift.id);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
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
                                    <Label htmlFor={`imageUrl-list-${gift.id}`}>Image URL</Label>
                                    <Input
                                      id={`imageUrl-list-${gift.id}`}
                                      value={editingImageUrl}
                                      onChange={(e) => setEditingGiftId(e.target.value)}
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
                                    <Label htmlFor={`imageUpload-list-${gift.id}`}>Upload Image</Label>
                                    <Input
                                      id={`imageUpload-list-${gift.id}`}
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
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={(e) => e.stopPropagation()}
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
                        </div>
                      ))}
                    </div>
                  )}
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
      )}

      {/* QR Code Dialog */}
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
    </div>
  );
};

export default AdminDashboard;