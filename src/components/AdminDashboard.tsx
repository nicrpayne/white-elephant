import React, { useState, useEffect } from "react";
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
import BulkGiftLoader from "./BulkGiftLoader";
import GiftManagementTab from "./GiftManagementTab";
import ReportExport from "./ReportExport";
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
  Monitor,
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
import GameBoard from "./GameBoard";

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
  avatarSeed?: string;
}

interface GameConfig {
  maxStealsPerGift: number;
  allowImmediateStealback: boolean;
  randomizeOrder: boolean;
  turnTimerEnabled: boolean;
  turnTimerSeconds: number;
}

const AdminDashboard = () => {
  const { 
    gameState, 
    isLoading,
    createSession,
    addGift: addGiftAsync, 
    addGiftsBatch: addGiftsBatchAsync,
    removeGift: removeGiftAsync, 
    updateGift: updateGiftAsync,
    updateGameStatus,
    updateGameConfig: updateGameConfigAsync,
    startGame: startGameAsync,
    setGifts, 
    setPlayers, 
    setGameStatus, 
    setGameConfig, 
    setActivePlayerId,
    loadPlayers,
    getStoredSessionInfo,
    restoreSession,
    clearSession
  } = useGame();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [activeTab, setActiveTab] = useState("setup");
  const [newGiftUrl, setNewGiftUrl] = useState("");
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [previewData, setPreviewData] = useState<{
    title: string;
    description: string;
    image: string;
    url: string;
  } | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState("");
  const [showImageEdit, setShowImageEdit] = useState(false);
  const [editingGiftId, setEditingGiftId] = useState<string | null>(null);
  const [newPlayerName] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [showQrCode, setShowQrCode] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedGiftIds, setSelectedGiftIds] = useState<Set<string>>(new Set());
  const [draggedGiftId, setDraggedGiftId] = useState<string | null>(null);

  // Get values from context
  const { gifts, players, gameStatus, sessionCode, gameConfig } = gameState;

  // Clear any existing session when creating a new game
  // This ensures "Create Game" always starts fresh
  useEffect(() => {
    // Clear existing session to start fresh when user clicks "Create Game"
    clearSession();
    setIsRestoringSession(false);
  }, []);

  // Auto-load players when in lobby status
  useEffect(() => {
    if (gameStatus === "lobby" && gameState.sessionId && loadPlayers) {
      console.log('Lobby opened, loading players for session:', gameState.sessionId);
      loadPlayers(gameState.sessionId).catch(err => {
        console.error('Failed to load players in lobby:', err);
      });
    }
  }, [gameStatus, gameState.sessionId, loadPlayers]);

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
      let sessionId = gameState.sessionId;
      if (!sessionId) {
        sessionId = await createSession();
      }
      
      // Force load players to ensure we have the latest data
      if (sessionId && loadPlayers) {
        await loadPlayers(sessionId);
      }
      
      await updateGameStatus("lobby");
      
      // Generate QR code immediately
      const inviteUrl = `${window.location.origin}/join?code=${sessionCode}`;
      try {
        const qrCodeDataUrl = await QRCode.toDataURL(inviteUrl, {
          width: 400,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeUrl(qrCodeDataUrl);
      } catch (err) {
        console.error('Error generating QR code:', err);
        const fallbackQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(inviteUrl)}`;
        setQrCodeUrl(fallbackQrUrl);
      }
      
      setShowQrCode(true);
      setCurrentStep(3);
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

  // Reorder gifts via drag and drop
  const reorderGifts = (draggedId: string, targetId: string) => {
    const draggedIndex = gifts.findIndex(g => g.id === draggedId);
    const targetIndex = gifts.findIndex(g => g.id === targetId);

    const newGifts = [...gifts];
    const [removed] = newGifts.splice(draggedIndex, 1);
    newGifts.splice(targetIndex, 0, removed);

    setGifts(newGifts);
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
            
            // Extract product name from URL slug (the part before /dp/)
            const urlParts = url.split('/');
            const dpIndex = urlParts.findIndex(part => part === 'dp' || part === 'product');
            
            if (dpIndex > 0 && urlParts[dpIndex - 1]) {
              const slug = urlParts[dpIndex - 1];
              // Convert URL slug to readable title
              // Example: "like-new-amazon-kindle" → "Like New Amazon Kindle"
              title = slug
                .split('-')
                .map(word => {
                  // Capitalize first letter of each word
                  const capitalized = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                  return capitalized;
                })
                .join(' ')
                .substring(0, 80); // Limit length
              
              // Clean up common words to look more natural
              title = title
                .replace(/\bAnd\b/g, 'and')
                .replace(/\bOr\b/g, 'or')
                .replace(/\bThe\b/g, 'the')
                .replace(/\bA\b/g, 'a')
                .replace(/\bAn\b/g, 'an')
                .replace(/\bIn\b/g, 'in')
                .replace(/\bOn\b/g, 'on')
                .replace(/\bAt\b/g, 'at')
                .replace(/\bTo\b/g, 'to')
                .replace(/\bFor\b/g, 'for')
                .replace(/\bOf\b/g, 'of')
                .replace(/\bWith\b/g, 'with');
              
              console.log('Extracted title from URL:', title);
            } else {
              title = 'Amazon Product';
            }
            
            description = `Amazon product preview unavailable (Amazon blocks automated requests). The product link works perfectly - players will see the full details when they click "View Product".`;
            
            // Use nice fallback image
            image = 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80';
            
            console.log('Amazon URL processed:', { title, asin });
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
        console.log('Calling addGiftAsync with:', previewData);
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
        
        // Show more helpful error message
        if (error instanceof Error) {
          if (error.message.includes('Load failed') || error.message.includes('network')) {
            alert('Network error: Unable to connect to the database. Please check your internet connection and try again. If the problem persists, the Supabase project may be paused.');
          } else {
            alert(`Failed to add gift: ${error.message}`);
          }
        } else {
          alert('Failed to add gift. Please try again.');
        }
      }
    }
  };

  const handleQuickAddGift = async () => {
    if (!newGiftUrl.trim() || !previewData) return;
    
    try {
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

    const draggedIndex = gifts.findIndex(g => g.id === draggedId);
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
      if (endGame) {
        await endGame();
      }
    } catch (error) {
      console.error('Error ending game:', error);
    }
  };

  const handleExportReport = () => {
    // Export game results as CSV
    const csvRows = [
      ['Player Name', 'Gift Name', 'Gift Image URL', 'Order Index', 'Steal Count'],
      ...players.map(player => {
        const playerGift = gifts.find(g => g.currentOwnerId === player.id);
        return [
          player.displayName,
          playerGift?.name || 'No gift',
          playerGift?.imageUrl || '',
          player.orderIndex.toString(),
          playerGift?.stealCount?.toString() || '0'
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
      // Fallback: use online QR code generator
      const fallbackQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(inviteUrl)}`;
      setQrCodeUrl(fallbackQrUrl);
      setShowQrCode(true);
    }
  };

  // Show loading while restoring session
  if (isRestoringSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 bg-background">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <img src="/elephant-icon.png" alt="White Elephant" className="h-14 w-14" />
          <div>
            <h1 className="text-3xl font-bold">White Elephant Admin</h1>
            <p className="text-muted-foreground">
              {gameStatus === "setup" ? "Set up your gift exchange" : "Manage your gift exchange session"}
            </p>
          </div>
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
                    <Label htmlFor="max-steals">Maximum Steals Per Gift</Label>
                    <Input
                      id="max-steals"
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
                      <Label htmlFor="randomize-order">
                        Randomize Player Order
                      </Label>
                      <Switch
                        id="randomize-order"
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
                      <Label htmlFor="allow-stealback">
                        Allow Immediate Steal-back
                      </Label>
                      <Switch
                        id="allow-stealback"
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div></div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="turn-timer">Turn Timer</Label>
                      <Switch
                        id="turn-timer"
                        checked={gameConfig.turnTimerEnabled}
                        onCheckedChange={async (checked) => {
                          setGameConfig({
                            ...gameConfig,
                            turnTimerEnabled: checked,
                          });
                          if (gameState.sessionId) {
                            await updateGameConfigAsync({ turnTimerEnabled: checked });
                          }
                        }}
                      />
                    </div>
                    
                    {gameConfig.turnTimerEnabled && (
                      <div className="flex items-center gap-2 pl-4">
                        <Input
                          type="number"
                          min="10"
                          max="300"
                          value={gameConfig.turnTimerSeconds}
                          onChange={async (e) => {
                            const value = parseInt(e.target.value) || 60;
                            setGameConfig({
                              ...gameConfig,
                              turnTimerSeconds: value,
                            });
                            if (gameState.sessionId) {
                              await updateGameConfigAsync({ turnTimerSeconds: value });
                            }
                          }}
                          className="w-20"
                        />
                        <span className="text-sm text-muted-foreground">seconds</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 1 && (
            <GiftManagementTab
              gifts={gifts}
              addGiftAsync={addGiftAsync}
              addGiftsBatchAsync={addGiftsBatchAsync}
              removeGift={removeGiftAsync}
              updateGift={updateGiftAsync}
              reorderGifts={reorderGifts}
            />
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
        // Admin Lobby Control Center
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Players Queue */}
          <div className="lg:col-span-2 space-y-6">
            {/* Join Code Banner */}
            <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium mb-1">Join Code</p>
                    <div className="text-5xl font-bold tracking-wider">{sessionCode}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="secondary" size="sm" onClick={handleCopyLink}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleGenerateQrCode}>
                      <QrCode className="h-4 w-4 mr-2" />
                      QR Code
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleShareInvite}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Players Queue */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Players in Lobby
                    </CardTitle>
                    <CardDescription>
                      {players.length} player{players.length !== 1 ? 's' : ''} waiting • Need at least 2 to start
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={players.length >= 2 ? "default" : "secondary"} className="text-lg px-4 py-2">
                      {players.length >= 2 ? "Ready!" : "Waiting..."}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={async () => {
                        if (gameState.sessionId && loadPlayers) {
                          try {
                            await loadPlayers(gameState.sessionId);
                          } catch (err) {
                            console.error('Failed to refresh players:', err);
                          }
                        }
                      }}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {players.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                          <Users className="h-8 w-8 opacity-50" />
                        </div>
                        <p className="font-medium">No players have joined yet</p>
                        <p className="text-sm">Share the code above to invite players</p>
                      </div>
                    ) : (
                      players.map((player, index) => (
                        <div
                          key={player.id}
                          className="flex items-center justify-between p-4 bg-card rounded-lg border hover:border-primary/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              <Avatar className="h-12 w-12">
                                <AvatarImage
                                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.avatarSeed || player.displayName}`}
                                />
                                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                  {player.displayName.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                                {index + 1}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-lg">{player.displayName}</p>
                                {player.isAdmin && (
                                  <Badge variant="outline" className="text-xs">Admin</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Joined {new Date(player.joinTime).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                          <Badge variant="secondary" className="text-sm">
                            Turn #{player.orderIndex}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Start Game Button */}
            <Card className={players.length >= 2 ? "border-green-500 bg-green-50 dark:bg-green-950/20" : ""}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {players.length >= 2 ? "Ready to Start!" : "Waiting for Players"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {players.length >= 2 
                        ? `${players.length} players are ready. Click to release everyone into the game!`
                        : `Need at least 2 players to start (${players.length}/2)`
                      }
                    </p>
                  </div>
                  <Button
                    onClick={handleStartGame}
                    disabled={players.length < 2}
                    size="lg"
                    className="px-8 py-6 text-lg"
                  >
                    <Play className="h-6 w-6 mr-2" />
                    Start Game
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Settings & Controls */}
          <div className="space-y-6">
            {/* Presentation View */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Presentation View
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Open the presentation view on a big screen for everyone to see the game board.
                </p>
                <Button
                  onClick={() => {
                    const presentationUrl = `${window.location.origin}/presentation/${sessionCode}`;
                    window.open(presentationUrl, '_blank', 'width=1920,height=1080');
                  }}
                  variant="outline"
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Presentation
                </Button>
              </CardContent>
            </Card>

            {/* Game Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Game Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="lobby-max-steals" className="text-sm">Max Steals Per Gift</Label>
                  <Input
                    id="lobby-max-steals"
                    type="number"
                    value={gameConfig.maxStealsPerGift}
                    onChange={async (e) => {
                      const value = parseInt(e.target.value);
                      setGameConfig({ ...gameConfig, maxStealsPerGift: value });
                      if (gameState.sessionId) {
                        await updateGameConfigAsync({ maxStealsPerGift: value });
                      }
                    }}
                    min="1"
                    max="5"
                    className="h-9"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="lobby-randomize" className="text-sm">Randomize Order</Label>
                  <Switch
                    id="lobby-randomize"
                    checked={gameConfig.randomizeOrder}
                    onCheckedChange={async (checked) => {
                      setGameConfig({ ...gameConfig, randomizeOrder: checked });
                      if (gameState.sessionId) {
                        await updateGameConfigAsync({ randomizeOrder: checked });
                      }
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="lobby-stealback" className="text-sm">Allow Steal-back</Label>
                  <Switch
                    id="lobby-stealback"
                    checked={gameConfig.allowImmediateStealback}
                    onCheckedChange={async (checked) => {
                      setGameConfig({ ...gameConfig, allowImmediateStealback: checked });
                      if (gameState.sessionId) {
                        await updateGameConfigAsync({ allowImmediateStealback: checked });
                      }
                    }}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <Label htmlFor="lobby-timer" className="text-sm">Turn Timer</Label>
                  <Switch
                    id="lobby-timer"
                    checked={gameConfig.turnTimerEnabled}
                    onCheckedChange={async (checked) => {
                      setGameConfig({ ...gameConfig, turnTimerEnabled: checked });
                      if (gameState.sessionId) {
                        await updateGameConfigAsync({ turnTimerEnabled: checked });
                      }
                    }}
                  />
                </div>

                {gameConfig.turnTimerEnabled && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="10"
                      max="300"
                      value={gameConfig.turnTimerSeconds}
                      onChange={async (e) => {
                        const value = parseInt(e.target.value) || 60;
                        setGameConfig({ ...gameConfig, turnTimerSeconds: value });
                        if (gameState.sessionId) {
                          await updateGameConfigAsync({ turnTimerSeconds: value });
                        }
                      }}
                      className="w-20 h-9"
                    />
                    <span className="text-sm text-muted-foreground">seconds</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    setGameStatus("setup");
                    setCurrentStep(1);
                  }}
                >
                  <Gift className="h-4 w-4 mr-2" />
                  Edit Gifts ({gifts.length})
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    setGameStatus("setup");
                    setCurrentStep(0);
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Back to Setup
                </Button>
              </CardContent>
            </Card>

            {/* Game Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Game Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Players</span>
                    <span className="font-medium">{players.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gifts</span>
                    <span className="font-medium">{gifts.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Steals</span>
                    <span className="font-medium">{gameConfig.maxStealsPerGift}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Timer</span>
                    <span className="font-medium">
                      {gameConfig.turnTimerEnabled ? `${gameConfig.turnTimerSeconds}s` : "Off"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        // Existing tabs for active game management
        <div className="space-y-6">
          {/* Show GameBoard when game is active, paused, or ended */}
          {(gameStatus === "active" || gameStatus === "paused" || gameStatus === "ended") && (
            <GameBoard isAdmin={true} />
          )}
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-6">
              <TabsTrigger value="gifts">Gift Management</TabsTrigger>
              <TabsTrigger value="players">Player Management</TabsTrigger>
              <TabsTrigger value="controls">Game Controls</TabsTrigger>
            </TabsList>

            {/* Gift Management Tab */}
            <TabsContent value="gifts" className="space-y-4">
              <GiftManagementTab
                gifts={gifts}
                addGiftAsync={addGiftAsync}
                addGiftsBatchAsync={addGiftsBatchAsync}
                removeGift={removeGiftAsync}
                updateGift={updateGiftAsync}
                reorderGifts={reorderGifts}
              />
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
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.avatarSeed || player.displayName}`}
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
                    <div className="flex flex-col gap-3">
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
                        <>
                          <Button
                            onClick={() => {
                              const presentationUrl = `${window.location.origin}/presentation/${sessionCode}`;
                              window.open(presentationUrl, '_blank', 'width=1920,height=1080');
                            }}
                            variant="outline"
                            className="w-full"
                          >
                            <Monitor className="h-4 w-4 mr-2" />
                            Open Presentation View
                          </Button>
                          
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
                        </>
                      )}
                    </div>

                    {gameStatus === "ended" && (
                      <ReportExport
                        players={players}
                        gifts={gifts}
                        sessionCode={sessionCode}
                        variant="outline"
                        className="w-full"
                      />
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
      )}

      {/* QR Code Dialog - Large for Screen Sharing */}
      <Dialog open={showQrCode} onOpenChange={setShowQrCode}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Share with Players via Teams</DialogTitle>
            <DialogDescription>
              Players can scan the QR code or use the link/code to join
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-6 py-4">
            {/* Large QR Code */}
            {qrCodeUrl && (
              <div className="bg-white p-6 rounded-lg border-4 border-primary shadow-lg">
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code for game invite" 
                  className="w-80 h-80"
                />
              </div>
            )}
            
            {/* Session Code - Large Display */}
            <div className="text-center w-full">
              <p className="text-sm text-muted-foreground mb-2">Game Code:</p>
              <div className="text-6xl font-bold text-primary tracking-wider mb-4 bg-primary/10 py-4 px-8 rounded-lg">
                {sessionCode}
              </div>
            </div>

            {/* Copy Link Button - Prominent */}
            <div className="w-full space-y-3">
              <Button 
                onClick={() => {
                  const inviteUrl = `${window.location.origin}/join?code=${sessionCode}`;
                  navigator.clipboard.writeText(inviteUrl);
                  alert('Link copied! Paste it in Teams chat.');
                }}
                className="w-full h-14 text-lg"
                size="lg"
              >
                <Copy className="h-5 w-5 mr-2" />
                Copy Link for Teams Chat
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                <p>Players can join at: <span className="font-mono">{window.location.origin}/join?code={sessionCode}</span></p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;