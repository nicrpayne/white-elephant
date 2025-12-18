import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Pause, Play, SkipForward, AlertCircle, Download, Gift, TreePine, Loader2, Clock, Bell, Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Slider } from "@/components/ui/slider";
import GiftGrid from "./GiftGrid";
import PlayerTurnPanel from "./PlayerTurnPanel";
import ReportExport from "./ReportExport";
import { useGame } from "@/contexts/GameContext";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { getSoundVolume, setSoundVolume } from "@/lib/sessionStorage";

interface Gift {
  id: string;
  name: string;
  imageUrl?: string;
  status: "hidden" | "revealed" | "locked";
  ownerPlayerId?: string;
  ownerName?: string;
  ownerAvatarSeed?: string;
  stealCount: number;
}

interface Player {
  id: string;
  displayName: string;
  orderIndex: number;
  joinTime: Date;
  isAdmin?: boolean;
  eliminated?: boolean;
  avatarSeed?: string;
}

interface GameBoardProps {
  sessionId?: string;
  sessionCode?: string;
  gifts?: Gift[];
  players?: Player[];
  activePlayerId?: string;
  roundIndex?: number;
  gameStatus?: "draft" | "lobby" | "active" | "paused" | "ended";
  isAdmin?: boolean;
  onPauseGame?: () => void;
  onResumeGame?: () => void;
  onEndGame?: () => void;
  onSkipTurn?: () => void;
}

const GameBoard = ({ isAdmin: isAdminProp }: GameBoardProps = {}) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { sessionCode: urlSessionCode } = useParams();
  const playerId = searchParams.get("playerId");
  const { gameState, isLoading: contextLoading, pickGift, stealGift, keepGift, updateGameStatus, getStoredSessionInfo, restoreSession, restoreSessionFromUrl } = useGame();
  const [activeTab, setActiveTab] = useState("board");
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null);
  const [showTurnAlert, setShowTurnAlert] = useState(false);
  const [showStealAlert, setShowStealAlert] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true); // Start as true until we verify session
  const { toast } = useToast();
  const [stealAlertData, setStealAlertData] = useState<{
    giftName: string;
    stealerName: string;
    victimName: string;
    stealsRemaining: number;
    isLocked: boolean;
  } | null>(null);

  const { gifts, players, gameStatus, activePlayerId, currentPlayerId, sessionCode, isFinalRound, firstPlayerId, gameConfig } = gameState;
  
  // Timer state
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivePlayerRef = useRef<string | null>(null);
  
  // Sound volume state
  const [soundVolume, setSoundVolumeState] = useState<number>(getSoundVolume);
  
  // Reset timer when active player changes
  useEffect(() => {
    if (gameConfig.turnTimerEnabled && activePlayerId && gameStatus === "active") {
      // Only reset timer if the active player actually changed
      if (lastActivePlayerRef.current !== activePlayerId) {
        lastActivePlayerRef.current = activePlayerId;
        setTimeRemaining(gameConfig.turnTimerSeconds);
      }
    } else {
      setTimeRemaining(null);
      lastActivePlayerRef.current = null;
    }
  }, [activePlayerId, gameConfig.turnTimerEnabled, gameConfig.turnTimerSeconds, gameStatus]);
  
  // Countdown timer
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || gameStatus !== "active") {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timeRemaining, gameStatus]);
  
  // Format time for display
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  }, []);

  // Track if we've already attempted restoration
  const hasAttemptedRestore = useRef(false);

  // Auto-restore session if player navigates directly to game URL
  useEffect(() => {
    const tryRestoreSession = async () => {
      // Wait for context to finish loading first
      if (contextLoading) {
        console.log('GameBoard: Context still loading, waiting...');
        return;
      }
      
      // Prevent multiple restoration attempts
      if (hasAttemptedRestore.current) {
        // If we already attempted and have a session, clear the restoring flag
        if (gameState.sessionId) {
          setIsRestoringSession(false);
        }
        return;
      }
      
      // If session is already loaded (context auto-restored it), check if it matches URL
      if (gameState.sessionId) {
        hasAttemptedRestore.current = true;
        setIsRestoringSession(false);
        console.log('GameBoard: Session already loaded:', gameState.sessionCode);
        
        // If URL has a different session code than what's loaded, redirect to join for the new session
        if (urlSessionCode && gameState.sessionCode && urlSessionCode.toUpperCase() !== gameState.sessionCode.toUpperCase()) {
          console.log('GameBoard: URL session differs from loaded session, redirecting to join');
          navigate(`/join?code=${urlSessionCode}`, { replace: true });
          return;
        }
        
        // If we have a session but URL doesn't have playerId, add it
        const stored = getStoredSessionInfo();
        if (stored && stored.playerId && !playerId) {
          navigate(`/game/${gameState.sessionCode}?playerId=${stored.playerId}`, { replace: true });
        }
        return;
      }
      
      // Mark that we're attempting restoration
      hasAttemptedRestore.current = true;
      setIsRestoringSession(true);
      
      const stored = getStoredSessionInfo();
      console.log('GameBoard: Checking for stored session...', stored);
      
      // PRIORITY 1: If URL has valid params (sessionCode + playerId), try to restore from URL first
      // This is the most reliable method on browser refresh since the URL is always available
      if (urlSessionCode && playerId) {
        console.log('GameBoard: URL has params. Attempting to restore from URL...');
        try {
          const result = await restoreSessionFromUrl(urlSessionCode, playerId);
          if (result.restored) {
            console.log('GameBoard: Successfully restored session from URL params');
            // Keep isRestoringSession true - it will be cleared when gameState.sessionId updates
            // and the effect re-runs
            return;
          } else {
            console.log('GameBoard: Could not restore from URL params');
            // Fall through to try localStorage or redirect
          }
        } catch (error) {
          console.error('Error restoring from URL:', error);
          // Fall through to try localStorage or redirect
        }
      }
      
      // PRIORITY 2: If URL has a session code that differs from stored session, redirect to join for the new session
      if (urlSessionCode && stored && stored.sessionCode && urlSessionCode.toUpperCase() !== stored.sessionCode.toUpperCase()) {
        console.log('GameBoard: URL session differs from stored session, redirecting to join for new game');
        setIsRestoringSession(false);
        navigate(`/join?code=${urlSessionCode}`, { replace: true });
        return;
      }
      
      // PRIORITY 3: If user has a stored player session, try to restore it
      if (stored && stored.playerId && !stored.isAdmin) {
        try {
          console.log('GameBoard: Attempting to restore player session from localStorage...');
          const result = await restoreSession();
          console.log('GameBoard: Restore result:', result);
          if (result.restored && result.playerId && result.sessionCode) {
            // Redirect to the user's actual session (may differ from URL)
            navigate(`/game/${result.sessionCode}?playerId=${result.playerId}`, { replace: true });
            return;
          } else {
            // Session couldn't be restored, redirect to join
            console.log('GameBoard: Session restore failed, redirecting to join');
            setIsRestoringSession(false);
            navigate(`/join`, { replace: true });
            return;
          }
        } catch (error) {
          console.error('Error restoring session:', error);
          setIsRestoringSession(false);
          navigate(`/join`, { replace: true });
          return;
        }
      }
      
      // PRIORITY 4: If user has admin session stored, redirect to admin
      if (stored && stored.isAdmin) {
        try {
          console.log('GameBoard: Attempting to restore admin session...');
          const result = await restoreSession();
          if (result.restored && result.isAdmin) {
            navigate('/create', { replace: true });
            return;
          }
        } catch (error) {
          console.error('Error restoring admin session:', error);
        }
      }
      
      // No stored session and no valid URL params - redirect to join page
      console.log('GameBoard: No stored session found, redirecting to join');
      setIsRestoringSession(false);
      navigate(`/join`, { replace: true });
    };

    tryRestoreSession();
  }, [contextLoading, gameState.sessionId, urlSessionCode, playerId]);

  // Calculate round index
  const roundIndex = players.filter(p => p.hasCompletedTurn).length + 1;

  // Determine if it's this player's turn
  const isMyTurn = playerId && activePlayerId === playerId;
  const currentPlayer = players.find(p => p.id === playerId);
  // Use prop if provided, otherwise check player data
  const isAdmin = isAdminProp ?? (currentPlayer?.isAdmin || false);
  const activePlayer = players.find(p => p.id === activePlayerId);

  // Update document title when it's player's turn
  useEffect(() => {
    if (isMyTurn && gameStatus === "active") {
      document.title = "🎁 YOUR TURN! - White Elephant";
    } else {
      document.title = "White Elephant Game";
    }
    return () => {
      document.title = "White Elephant Game";
    };
  }, [isMyTurn, gameStatus]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Listen for turn changes
  useEffect(() => {
    const handleTurnChange = (event: CustomEvent) => {
      const { newPlayerId } = event.detail;
      // Show alert if it's this player's turn
      if (playerId && newPlayerId === playerId) {
        setShowTurnAlert(true);
        
        // Show toast notification
        toast({
          title: "🎉 It's Your Turn!",
          description: "Pick a new gift or steal from another player",
          duration: 5000,
        });

        // Vibrate on mobile devices
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200, 100, 200]);
        }

        // Play sound alert
        try {
          const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.frequency.value = 800;
          oscillator.type = 'sine';
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
          console.log('Audio notification not available');
        }

        // Browser notification (for when tab is in background)
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification("🎁 It's Your Turn!", {
            body: "Pick a new gift or steal from another player",
            icon: '/elephant-icon.png',
            tag: 'turn-notification',
            requireInteraction: true,
          });
        }
      }
    };

    window.addEventListener('turnChanged', handleTurnChange as EventListener);
    return () => {
      window.removeEventListener('turnChanged', handleTurnChange as EventListener);
    };
  }, [playerId, toast]);
  
  // Handle volume change
  const handleVolumeChange = useCallback((value: number[]) => {
    const newVolume = value[0];
    setSoundVolumeState(newVolume);
    setSoundVolume(newVolume);
  }, []);

  // Play jingle sound for gift picking
  const playJingleSound = useCallback(() => {
    if (soundVolume === 0) return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
      gainNode.gain.setValueAtTime(0.3 * soundVolume, audioContext.currentTime);
      
      // Jingle bell melody - cheerful ascending notes
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const durations = [0.15, 0.15, 0.15, 0.3];
      let time = audioContext.currentTime;
      
      notes.forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        const noteGain = audioContext.createGain();
        osc.connect(noteGain);
        noteGain.connect(gainNode);
        osc.frequency.value = freq;
        osc.type = 'triangle';
        noteGain.gain.setValueAtTime(0.4 * soundVolume, time);
        noteGain.gain.exponentialRampToValueAtTime(0.01, time + durations[i]);
        osc.start(time);
        osc.stop(time + durations[i]);
        time += durations[i] * 0.8;
      });
    } catch (e) {
      console.log('Jingle sound not available');
    }
  }, [soundVolume]);

  // Play sneaky steal sound
  const playStealSound = useCallback(() => {
    if (soundVolume === 0) return;
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
      gainNode.gain.setValueAtTime(0.25 * soundVolume, audioContext.currentTime);
      
      // Sneaky descending "dun dun dunnnn" sound
      const notes = [392, 349.23, 261.63]; // G4, F4, C4 - dramatic descending
      const durations = [0.2, 0.2, 0.5];
      let time = audioContext.currentTime;
      
      notes.forEach((freq, i) => {
        const osc = audioContext.createOscillator();
        const noteGain = audioContext.createGain();
        osc.connect(noteGain);
        noteGain.connect(gainNode);
        osc.frequency.value = freq;
        osc.type = 'sawtooth';
        noteGain.gain.setValueAtTime(0.3 * soundVolume, time);
        noteGain.gain.exponentialRampToValueAtTime(0.01, time + durations[i]);
        osc.start(time);
        osc.stop(time + durations[i]);
        time += durations[i] * 0.9;
      });
    } catch (e) {
      console.log('Steal sound not available');
    }
  }, [soundVolume]);

  // Listen for gift picked sound events (from realtime subscription)
  useEffect(() => {
    const handleGiftPickedSound = () => {
      console.log('🎵 Received giftPickedSound event, playing jingle');
      playJingleSound();
    };

    window.addEventListener('giftPickedSound', handleGiftPickedSound as EventListener);
    return () => {
      window.removeEventListener('giftPickedSound', handleGiftPickedSound as EventListener);
    };
  }, [playJingleSound]);

  // Listen for gift stolen sound events (from realtime subscription)
  useEffect(() => {
    const handleGiftStolenSound = () => {
      console.log('🎭 Received giftStolenSound event, playing steal sound');
      playStealSound();
    };

    window.addEventListener('giftStolenSound', handleGiftStolenSound as EventListener);
    return () => {
      window.removeEventListener('giftStolenSound', handleGiftStolenSound as EventListener);
    };
  }, [playStealSound]);
  
  // Listen for steal events (for the visual alert)
  useEffect(() => {
    const handleSteal = (event: CustomEvent) => {
      setStealAlertData(event.detail);
      setShowStealAlert(true);
      // Auto-close after 6 seconds (doubled from 3)
      setTimeout(() => {
        setShowStealAlert(false);
      }, 6000);
    };

    window.addEventListener('giftStolen', handleSteal as EventListener);
    return () => {
      window.removeEventListener('giftStolen', handleSteal as EventListener);
    };
  }, []);

  // Show loading while restoring session or context is loading
  if (isRestoringSession || contextLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-green-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Restoring your session...</p>
        </div>
      </div>
    );
  }

  // If no session is loaded after restoration attempt, show a message with redirect option
  // Only show this if we're truly done trying to restore (not restoring AND attempted AND no session)
  if (!gameState.sessionId && !contextLoading && !isRestoringSession && hasAttemptedRestore.current) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-green-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <img src="/elephant-icon.png" alt="White Elephant" className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Session Not Found</h2>
          <p className="text-gray-500 mb-4">Your session may have expired or been cleared.</p>
          <button
            onClick={() => navigate('/join', { replace: true })}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Join a Game
          </button>
        </div>
      </div>
    );
  }

  const handleGiftSelect = async (giftId: string) => {
    if (!isMyTurn) return;

    const gift = gifts.find(g => g.id === giftId);
    if (!gift) return;

    // Check if gift is locked
    if (gift.status === "locked" || gift.stealCount >= 2) {
      toast({
        title: "Gift is Locked 🔒",
        description: "This gift has been stolen the maximum number of times and cannot be stolen again.",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    try {
      if (gift.status === "hidden") {
        // Pick a new gift
        await pickGift(giftId);
      } else if (gift.status === "revealed" && gift.stealCount < 2) {
        // Steal a revealed gift
        await stealGift(giftId);
      }
    } catch (error) {
      console.error("Error selecting gift:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to select gift. Please try again.";
      toast({
        title: "Cannot Select Gift",
        description: errorMessage,
        variant: "destructive",
        duration: 4000,
      });
    }
  };

  const handlePauseGame = async () => {
    try {
      await updateGameStatus("paused");
    } catch (error) {
      console.error("Error pausing game:", error);
    }
  };

  const handleResumeGame = async () => {
    try {
      await updateGameStatus("active");
    } catch (error) {
      console.error("Error resuming game:", error);
    }
  };

  const handleEndGame = async () => {
    try {
      await updateGameStatus("ended");
    } catch (error) {
      console.error("Error ending game:", error);
    }
  };

  const handleSkipTurn = () => console.log("Turn skipped");

  // Export game results as CSV
  const exportResultsCSV = () => {
    const csvRows = [
      ['Player Name', 'Gift Name', 'Gift Image URL', 'Order'],
      ...players.map(player => {
        const playerGift = gifts.find(g => g.currentOwnerId === player.id);
        return [
          player.displayName,
          playerGift?.name || 'No Gift',
          playerGift?.imageUrl || '',
          player.orderIndex
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

  // If game has ended, show results screen
  if (gameStatus === "ended") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-2 sm:p-4">
        <div className="max-w-6xl mx-auto space-y-3 sm:space-y-4">
          {/* Header */}
          <Card className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white">
            <CardContent className="p-4 sm:p-8 text-center">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 sm:mb-4">
                <h1 className="text-2xl sm:text-4xl font-bold">Game Over!</h1>
                <TreePine className="w-8 h-8 sm:w-12 sm:h-12" />
              </div>
              <p className="text-sm sm:text-xl text-white/90">
                Thanks for playing White Elephant! Here's who got what:
              </p>
            </CardContent>
          </Card>

          {/* Final Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl sm:text-2xl">Final Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 sm:space-y-3">
                {players.map((player, index) => {
                  const playerGift = gifts.find(g => g.currentOwnerId === player.id);
                  
                  return (
                    <div 
                      key={player.id} 
                      className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-purple-300 transition-colors"
                    >
                      {/* Mobile: Rank + Player in row */}
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        {/* Rank */}
                        <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-bold text-lg sm:text-xl">
                          #{index + 1}
                        </div>

                        {/* Player Info */}
                        <div className="flex items-center gap-3 flex-grow min-w-0">
                          <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.avatarSeed || player.displayName}`} />
                            <AvatarFallback className="bg-gradient-to-br from-green-400 to-teal-400 text-white font-bold text-base sm:text-lg">
                              {player.displayName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-grow min-w-0">
                            <p className="font-semibold text-base sm:text-lg truncate">{player.displayName}</p>
                            <p className="text-xs sm:text-sm text-gray-600">Order #{player.orderIndex}</p>
                          </div>
                        </div>
                      </div>

                      {/* Gift Display */}
                      {playerGift ? (
                        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto sm:flex-shrink-0 pl-13 sm:pl-0">
                          {playerGift.imageUrl && (
                            <img 
                              src={playerGift.imageUrl} 
                              alt={playerGift.name}
                              className="w-12 h-12 sm:w-16 sm:h-16 rounded object-contain border-2 border-green-200 flex-shrink-0"
                            />
                          )}
                          <div className="min-w-0 flex-grow sm:max-w-xs">
                            <p className="font-medium text-xs sm:text-sm truncate">{playerGift.name}</p>
                            <Badge variant="secondary" className="mt-1 text-xs">
                              Stolen {playerGift.stealCount}x
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs sm:text-sm text-gray-500 italic pl-13 sm:pl-0 sm:flex-shrink-0">
                          No gift received
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
            {isAdmin && (
              <CardFooter className="flex justify-center pt-4 sm:pt-6 border-t">
                <ReportExport
                  players={players}
                  gifts={gifts}
                  sessionCode={sessionCode}
                  variant="default"
                  className="gap-2 w-full sm:w-auto"
                />
              </CardFooter>
            )}
          </Card>

          {/* Session Info */}
          <Card>
            <CardContent className="p-3 sm:p-4 text-center text-xs sm:text-sm text-gray-600">
              <p>Session Code: <span className="font-mono font-bold">{sessionCode}</span></p>
              <p className="mt-1">Total Players: {players.length} | Total Gifts: {gifts.length}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-2 sm:p-4">
      {/* Pulsing "Your Turn" Banner */}
      {isMyTurn && gameStatus === "active" && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-green-500 via-emerald-500 to-green-500 text-white py-3 px-4 text-center animate-pulse shadow-lg">
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl">🎁</span>
            <span className="text-lg sm:text-xl font-bold">IT'S YOUR TURN!</span>
            <span className="text-2xl">🎁</span>
          </div>
          <p className="text-sm opacity-90">Pick a gift or steal from another player</p>
        </div>
      )}
      
      <div className={`max-w-7xl mx-auto space-y-3 sm:space-y-4 ${isMyTurn && gameStatus === "active" ? "pt-20" : ""}`}>
        <Card className="border-2 shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
              <div className="flex items-center gap-3">
                <img src="/elephant-icon.png" alt="White Elephant" className="h-10 w-10 sm:h-12 sm:w-12" />
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                    White Elephant Game
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Session Code: <span className="font-mono font-bold">{sessionCode}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                {/* Volume Control */}
                <div className="flex items-center gap-2 bg-white/80 rounded-lg px-2 py-1 border">
                  <button
                    onClick={() => handleVolumeChange([soundVolume === 0 ? 0.5 : 0])}
                    className="text-gray-600 hover:text-gray-900"
                    title={soundVolume === 0 ? "Unmute" : "Mute"}
                  >
                    {soundVolume === 0 ? (
                      <VolumeX className="h-4 w-4" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                  </button>
                  <Slider
                    value={[soundVolume]}
                    onValueChange={handleVolumeChange}
                    max={1}
                    step={0.1}
                    className="w-16 sm:w-20"
                  />
                </div>
                <Badge
                  variant={
                    gameStatus === "active"
                      ? "default"
                      : gameStatus === "paused"
                        ? "secondary"
                        : "outline"
                  }
                  className="text-xs sm:text-sm px-2 sm:px-3 py-1"
                >
                  {gameStatus === "active" && "🎮 Active"}
                  {gameStatus === "paused" && "⏸️ Paused"}
                  {gameStatus === "setup" && "⚙️ Setup"}
                  {gameStatus === "ended" && "🏁 Ended"}
                </Badge>
                {isAdmin && gameStatus === "active" && (
                  <Button onClick={handlePauseGame} variant="outline" size="sm" className="text-xs sm:text-sm">
                    <Pause className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Pause</span>
                  </Button>
                )}
                {isAdmin && gameStatus === "paused" && (
                  <Button onClick={handleResumeGame} size="sm" className="text-xs sm:text-sm">
                    <Play className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Resume</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Final Round Banner */}
            {isFinalRound && (
              <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-lg p-3 sm:p-6 mb-3 sm:mb-4 shadow-lg border-4 border-yellow-300">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                  <div className="flex-grow">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-xs sm:text-sm text-white/90 mb-1 font-medium">🏆 FINAL ROUND!</p>
                        <p className="text-xl sm:text-3xl font-bold text-white drop-shadow-lg">
                          {activePlayer?.displayName}'s Last Chance
                        </p>
                        <p className="text-xs sm:text-sm text-white/80 mt-1">
                          Steal a gift or keep your current one to end the game
                        </p>
                      </div>
                      {/* Timer Display for Final Round */}
                      {gameConfig.turnTimerEnabled && timeRemaining !== null && (
                        <div className={`text-center bg-white/20 backdrop-blur-sm rounded-lg p-3 sm:p-4 ${timeRemaining <= 10 ? 'bg-red-500/40' : ''}`}>
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-white/90" />
                            <p className="text-xs sm:text-sm text-white/90 font-medium">Time</p>
                          </div>
                          <p className={`text-2xl sm:text-3xl font-bold text-white drop-shadow-lg ${timeRemaining <= 10 ? 'animate-pulse' : ''}`}>
                            {formatTime(timeRemaining)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  {isMyTurn && (
                    <Button 
                      onClick={keepGift}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 text-lg shadow-lg"
                    >
                      ✅ Keep My Gift
                    </Button>
                  )}
                </div>
              </div>
            )}

            {activePlayer && !isFinalRound && (
              <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-lg p-3 sm:p-6 mb-3 sm:mb-4 shadow-lg animate-pulse">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                  <div className="flex-grow">
                    <p className="text-xs sm:text-sm text-white/90 mb-1 font-medium">🎯 Current Turn</p>
                    <p className="text-xl sm:text-3xl font-bold text-white drop-shadow-lg">
                      {activePlayer.displayName}
                    </p>
                    <p className="text-xs sm:text-sm text-white/80 mt-1">
                      Pick a hidden gift or steal a revealed one
                    </p>
                  </div>
                  <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                    {/* Timer Display */}
                    {gameConfig.turnTimerEnabled && timeRemaining !== null && (
                      <div className={`text-center bg-white/20 backdrop-blur-sm rounded-lg p-3 sm:p-4 flex-1 sm:flex-initial ${timeRemaining <= 10 ? 'bg-red-500/40' : ''}`}>
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-white/90" />
                          <p className="text-xs sm:text-sm text-white/90 font-medium">Time</p>
                        </div>
                        <p className={`text-2xl sm:text-3xl font-bold text-white drop-shadow-lg ${timeRemaining <= 10 ? 'animate-pulse' : ''}`}>
                          {formatTime(timeRemaining)}
                        </p>
                      </div>
                    )}
                    <div className="text-center bg-white/20 backdrop-blur-sm rounded-lg p-3 sm:p-4 flex-1 sm:flex-initial">
                      <p className="text-xs sm:text-sm text-white/90 mb-1 font-medium">Round</p>
                      <p className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg">{roundIndex}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="board" className="text-xs sm:text-sm">
                  <span className="hidden sm:inline">Game Board</span>
                  <span className="sm:hidden">Board</span>
                </TabsTrigger>
                <TabsTrigger value="players" className="text-xs sm:text-sm">
                  Players ({players.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="board" className="mt-3 sm:mt-4">
                <GiftGrid 
                  gifts={gifts} 
                  onGiftSelect={handleGiftSelect}
                  activePlayerId={activePlayerId}
                  isPlayerTurn={isMyTurn || false}
                  gameStatus={gameStatus}
                />
              </TabsContent>

              <TabsContent value="players" className="mt-3 sm:mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {players.map((player) => {
                    const playerGift = gifts.find(g => g.currentOwnerId === player.id);
                    
                    return (
                      <Card
                        key={player.id}
                        className={
                          player.id === activePlayerId
                            ? "border-2 border-purple-500 bg-purple-50"
                            : ""
                        }
                      >
                        <CardContent className="p-3 sm:p-4">
                          <div className="space-y-2 sm:space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.avatarSeed || player.displayName}`} />
                                  <AvatarFallback className="bg-gradient-to-br from-green-400 to-teal-400 text-white font-bold">
                                    {player.displayName.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-semibold text-base sm:text-lg">
                                    {player.displayName}
                                  </p>
                                  <p className="text-xs sm:text-sm text-gray-600">
                                    Order: #{player.orderIndex}
                                  </p>
                                </div>
                              </div>
                              {player.id === activePlayerId && (
                                <Badge className="text-xs">Current Turn</Badge>
                              )}
                            </div>
                            
                            {/* Gift Display */}
                            {playerGift ? (
                              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-2 sm:p-3 border border-blue-200">
                                <p className="text-xs text-gray-600 mb-1">Current Gift:</p>
                                <div className="flex items-start gap-2">
                                  {playerGift.imageUrl && (
                                    <img 
                                      src={playerGift.imageUrl} 
                                      alt={playerGift.name}
                                      className="w-10 h-10 sm:w-12 sm:h-12 rounded object-contain flex-shrink-0"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-xs sm:text-sm truncate">
                                      {playerGift.name}
                                    </p>
                                    {playerGift.stealCount >= 2 ? (
                                      <Badge variant="destructive" className="text-xs mt-1">
                                        🔒 Locked
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="text-xs mt-1">
                                        {2 - playerGift.stealCount} steal{2 - playerGift.stealCount !== 1 ? 's' : ''} left
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-gray-50 rounded-lg p-2 sm:p-3 border border-gray-200">
                                <p className="text-xs text-gray-500 text-center">
                                  {player.hasCompletedTurn ? "No gift" : "Waiting for turn..."}
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Turn Alert Dialog */}
      <AlertDialog open={showTurnAlert} onOpenChange={setShowTurnAlert}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl sm:text-2xl">
              {isFinalRound ? "🏆 Final Round - Your Last Chance!" : "🎁 It's Your Turn!"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base">
              {isFinalRound 
                ? "You can steal a gift from another player, or keep your current gift to end the game."
                : "You can now pick a hidden gift or steal a revealed gift from another player."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowTurnAlert(false)} className="w-full sm:w-auto">
              Let's Go!
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Steal Alert Dialog */}
      <AlertDialog open={showStealAlert} onOpenChange={setShowStealAlert}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl sm:text-2xl">🎯 Gift Stolen!</AlertDialogTitle>
            <AlertDialogDescription className="text-sm sm:text-base space-y-2">
              <p className="font-semibold text-foreground">
                {stealAlertData?.stealerName} stole "{stealAlertData?.giftName}" from {stealAlertData?.victimName}!
              </p>
              {stealAlertData?.isLocked ? (
                <p className="text-orange-600 font-medium">
                  🔒 This gift is now LOCKED and cannot be stolen again!
                </p>
              ) : (
                <p className="text-blue-600">
                  ⚡ {stealAlertData?.stealsRemaining} steal{stealAlertData?.stealsRemaining !== 1 ? 's' : ''} remaining before this gift locks
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowStealAlert(false)} className="w-full sm:w-auto">
              Got it!
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GameBoard;