import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Gift, User, Clock } from 'lucide-react';
import { getSoundVolume, setSoundVolume } from '@/lib/sessionStorage';

interface Gift {
  id: string;
  session_id: string;
  name: string;
  image_url: string;
  status: string;
  steal_count: number;
  current_owner_id: string | null;
  order_index?: number;
}

interface Player {
  id: string;
  display_name: string;
  order_index: number;
  has_completed_turn: boolean;
  avatar_seed: string;
}

interface Session {
  id: string;
  game_status: string;
  active_player_id: string | null;
  is_final_round: boolean | null;
  first_player_id: string | null;
  turn_timer_enabled: boolean | null;
  turn_timer_seconds: number | null;
}

interface StealAnimation {
  giftId: string;
  thiefName: string;
  victimName: string;
  giftName: string;
  giftImageUrl: string;
  phrase: string;
}

// Fun phrases for steal animations
const STEAL_PHRASES = [
  "Ho Ho NO! Gift stolen!",
  "Yoink! Mine now!",
  "Sneaky steal incoming!",
  "The old switcheroo!",
  "White Elephant strikes again!",
  "Plot twist!",
  "That's cold blooded!",
  "No gift is safe!",
  "The heist is on!",
  "Surprise! It's mine now!",
  "Highway robbery!",
  "Santa's watching this betrayal!",
];

export default function PresentationView() {
  const { sessionCode } = useParams<{ sessionCode: string }>();
  const navigate = useNavigate();
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [revealedGiftId, setRevealedGiftId] = useState<string | null>(null);
  const [stealAnimation, setStealAnimation] = useState<StealAnimation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Timer state
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivePlayerRef = useRef<string | null>(null);
  
  // Refs for subscription callbacks
  const stealAnimationRef = useRef<StealAnimation | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  
  // Keep refs in sync with state
  stealAnimationRef.current = stealAnimation;
  sessionRef.current = session;
  if (session?.id) {
    sessionIdRef.current = session.id;
  }
  
  // Sound volume state
  const [soundVolume, setSoundVolumeState] = useState<number>(getSoundVolume);

  // Play jingle sound for gift picking
  const playJingleSound = useCallback(() => {
    console.log('🎵 PresentationView playJingleSound called, soundVolume:', soundVolume);
    if (soundVolume === 0) {
      console.log('🎵 Sound volume is 0, skipping');
      return;
    }
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      console.log('🎵 AudioContext state:', audioContext.state);
      const gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
      gainNode.gain.setValueAtTime(0.4 * soundVolume, audioContext.currentTime);
      
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
        noteGain.gain.setValueAtTime(0.5 * soundVolume, time);
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
    console.log('🎭 PresentationView playStealSound called, soundVolume:', soundVolume);
    if (soundVolume === 0) {
      console.log('🎭 Sound volume is 0, skipping');
      return;
    }
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      console.log('🎭 AudioContext state:', audioContext.state);
      const gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
      gainNode.gain.setValueAtTime(0.35 * soundVolume, audioContext.currentTime);
      
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
        noteGain.gain.setValueAtTime(0.4 * soundVolume, time);
        noteGain.gain.exponentialRampToValueAtTime(0.01, time + durations[i]);
        osc.start(time);
        osc.stop(time + durations[i]);
        time += durations[i] * 0.9;
      });
    } catch (e) {
      console.log('Steal sound not available');
    }
  }, [soundVolume]);
  
  // Format time for display
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  }, []);
  
  // Reset timer when active player changes
  useEffect(() => {
    if (session?.turn_timer_enabled && session?.active_player_id && session?.game_status === 'active') {
      // Only reset timer if the active player actually changed
      if (lastActivePlayerRef.current !== session.active_player_id) {
        lastActivePlayerRef.current = session.active_player_id;
        setTimeRemaining(session.turn_timer_seconds ?? 60);
      }
    } else {
      setTimeRemaining(null);
      lastActivePlayerRef.current = null;
    }
  }, [session?.active_player_id, session?.turn_timer_enabled, session?.turn_timer_seconds, session?.game_status]);
  
  // Countdown timer
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0 || session?.game_status !== 'active') {
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
  }, [timeRemaining, session?.game_status]);

  useEffect(() => {
    if (!sessionCode) {
      navigate('/join');
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      // Fetch session
      const { data: sessionData, error } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('session_code', sessionCode)
        .single();

      if (error || !sessionData) {
        // Session doesn't exist - redirect to join page (will check for stored session)
        navigate(`/join`, { replace: true });
        return;
      }

      setSession(sessionData);
      sessionIdRef.current = sessionData.id;
      console.log('🎮 Session loaded, ID:', sessionData.id);

      // Fetch gifts
      const { data: giftsData } = await supabase
        .from('gifts')
        .select('*')
        .eq('session_id', sessionData.id)
        .order('position', { nullsFirst: false })
        .order('created_at');

      if (giftsData) {
        console.log('PresentationView - Gifts loaded:', giftsData);
        console.log('PresentationView - Gift statuses:', giftsData.map(g => ({ name: g.name, status: g.status })));
        setGifts(giftsData);
      }

      // Fetch players
      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .eq('session_id', sessionData.id)
        .order('order_index');

      if (playersData) setPlayers(playersData);
      
      setIsLoading(false);
    };

    fetchData();

    // Subscribe to game_actions for steal notifications
    const actionsChannel = supabase
      .channel(`actions-${sessionCode}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_actions',
        },
        async (payload) => {
          const action = payload.new as any;
          console.log('🎭 game_actions INSERT received:', action);
          
          if (action.action_type === 'steal') {
            console.log('🎭 Processing steal action');
            // Fetch all current data to get names
            const { data: sessionData } = await supabase
              .from('game_sessions')
              .select('*')
              .eq('session_code', sessionCode)
              .single();

            if (sessionData) {
              const [giftData, playersData] = await Promise.all([
                supabase.from('gifts').select('*').eq('id', action.gift_id).single(),
                supabase.from('players').select('*').eq('session_id', sessionData.id)
              ]);

              if (giftData.data && playersData.data) {
                const thief = playersData.data.find((p: Player) => p.id === action.player_id);
                const victim = playersData.data.find((p: Player) => p.id === action.previous_owner_id);
                
                if (thief && victim && giftData.data) {
                  const randomPhrase = STEAL_PHRASES[Math.floor(Math.random() * STEAL_PHRASES.length)];
                  
                  setStealAnimation({
                    giftId: giftData.data.id,
                    thiefName: thief.display_name,
                    victimName: victim.display_name,
                    giftName: giftData.data.name,
                    giftImageUrl: giftData.data.image_url,
                    phrase: randomPhrase,
                  });

                  playStealSound(); // Play dramatic steal sound

                  setTimeout(() => setStealAnimation(null), 4000);
                }
              }
            }
          }
        }
      )
      .subscribe();

    // Subscribe to real-time updates
    const giftsChannel = supabase
      .channel(`gifts-${sessionCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'gifts',
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updatedGift = payload.new as Gift;
            
            // Only process updates for gifts in this session
            if (updatedGift.session_id !== sessionIdRef.current) {
              console.log('🎁 Gift update ignored - different session:', updatedGift.session_id, 'vs', sessionIdRef.current);
              return;
            }
            
            setGifts((prev) => {
              // Find the old gift status from current state
              const oldGift = prev.find(g => g.id === updatedGift.id);
              const wasHidden = oldGift?.status === 'hidden';
              
              console.log('🎁 Gift update in PresentationView:', {
                giftId: updatedGift.id,
                wasHidden,
                newStatus: updatedGift.status,
                stealAnimationActive: !!stealAnimationRef.current,
                gameStatus: sessionRef.current?.game_status
              });
              
              // Trigger reveal animation and jingle only if gift was just revealed from hidden (not stolen)
              // Steals have their own animation and sound via game_actions subscription
              // Don't show reveal animation if game has ended
              if (wasHidden && updatedGift.status === 'revealed' && !stealAnimationRef.current && sessionRef.current?.game_status !== 'ended') {
                console.log('🎵 Triggering jingle for revealed gift');
                setRevealedGiftId(updatedGift.id);
                playJingleSound(); // Play jingle when gift is picked/revealed
                setTimeout(() => setRevealedGiftId(null), 5000);
              }
              
              return prev.map((g) => (g.id === updatedGift.id ? updatedGift : g));
            });
          }
        }
      )
      .subscribe();

    const sessionChannel = supabase
      .channel(`session-${sessionCode}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'game_sessions',
        },
        (payload) => {
          setSession(payload.new as Session);
        }
      )
      .subscribe();

    const playersChannel = supabase
      .channel(`players-${sessionCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setPlayers((prev) =>
              prev.map((p) => (p.id === payload.new.id ? payload.new as Player : p))
            );
          }
        }
      )
      .subscribe();

    return () => {
      actionsChannel.unsubscribe();
      giftsChannel.unsubscribe();
      sessionChannel.unsubscribe();
      playersChannel.unsubscribe();
    };
  }, [sessionCode]);

  // Generate initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Generate a consistent color based on the owner name
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const currentPlayer = players.find((p) => p.id === session?.active_player_id);
  const giftCount = gifts.length;
  
  // Calculate optimal grid layout based on gift count to fit on screen
  const getGridLayout = () => {
    if (giftCount === 0) return { cols: 0, rows: 0, maxWidth: '6xl' };
    if (giftCount <= 4) return { cols: 2, rows: 2, maxWidth: '3xl' }; // 2x2
    if (giftCount <= 6) return { cols: 3, rows: 2, maxWidth: '4xl' }; // 3x2
    if (giftCount <= 9) return { cols: 3, rows: 3, maxWidth: '5xl' }; // 3x3
    if (giftCount <= 12) return { cols: 4, rows: 3, maxWidth: '6xl' }; // 4x3
    if (giftCount <= 16) return { cols: 4, rows: 4, maxWidth: '7xl' }; // 4x4
    if (giftCount <= 20) return { cols: 5, rows: 4, maxWidth: '7xl' }; // 5x4
    if (giftCount <= 25) return { cols: 5, rows: 5, maxWidth: '7xl' }; // 5x5
    return { cols: 6, rows: Math.ceil(giftCount / 6), maxWidth: '7xl' }; // 6xN
  };

  const gridLayout = getGridLayout();

  // Show loading state while fetching session
  if (isLoading) {
    return (
      <div className="h-screen bg-gradient-to-br from-red-50 via-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading game session...</p>
        </div>
      </div>
    );
  }

  // If no session found, this will have already redirected via useEffect
  if (!session) {
    return null;
  }

  // If game has ended, show results screen with game board
  if (session?.game_status === 'ended') {
    return (
      <div className="h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex flex-col overflow-hidden p-4">
        {/* Header */}
        <div className="flex-shrink-0 mb-4">
          <Card className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 text-white">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <h1 className="text-4xl font-bold">Game Over!</h1>
              </div>
              <p className="text-xl text-white/90">
                Thanks for playing White Elephant! Here's who got what:
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout: Results + Game Board */}
        <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
          {/* Left: Final Results */}
          <div className="overflow-y-auto">
            <Card className="h-full">
              <CardContent className="p-4">
                <h2 className="text-2xl font-bold mb-4">Final Results</h2>
                <div className="space-y-3">
                  {players.map((player, index) => {
                    const playerGift = gifts.find(g => g.current_owner_id === player.id);
                    
                    return (
                      <div 
                        key={player.id} 
                        className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-gray-200"
                      >
                        {/* Rank */}
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-blue-400 flex items-center justify-center text-white font-bold text-lg">
                          #{index + 1}
                        </div>

                        {/* Player Info */}
                        <div className="flex items-center gap-2 flex-grow min-w-0">
                          <Avatar className="h-10 w-10 flex-shrink-0">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.avatar_seed || player.display_name}`} />
                            <AvatarFallback className="bg-gradient-to-br from-green-400 to-teal-400 text-white font-bold">
                              {player.display_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-grow min-w-0">
                            <p className="font-semibold text-base truncate">{player.display_name}</p>
                          </div>
                        </div>

                        {/* Gift Display */}
                        {playerGift ? (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {playerGift.image_url && (
                              <img 
                                src={playerGift.image_url} 
                                alt={playerGift.name}
                                className="w-12 h-12 rounded object-contain border-2 border-green-200"
                              />
                            )}
                            <div className="min-w-0 max-w-[150px]">
                              <p className="font-medium text-sm truncate">{playerGift.name}</p>
                              <Badge variant="secondary" className="text-xs">
                                Stolen {playerGift.steal_count}x
                              </Badge>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500 italic flex-shrink-0">
                            No gift
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Game Board */}
          <div className="overflow-hidden">
            <Card className="h-full">
              <CardContent className="p-4 h-full flex flex-col">
                <h2 className="text-2xl font-bold mb-4">Final Board</h2>
                <div className="flex-1 overflow-hidden">
                  <div 
                    className="grid gap-2 h-full"
                    style={{
                      gridTemplateColumns: `repeat(${gridLayout.cols}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${gridLayout.rows}, minmax(0, 1fr))`
                    }}
                  >
                    {gifts.filter(gift => gift.status !== 'hidden').map((gift) => {
                      const owner = players.find((p) => p.id === gift.current_owner_id);
                      const isLocked = gift.status === 'locked' || gift.steal_count >= 2;

                      return (
                        <div
                          key={gift.id}
                          className="relative rounded-lg overflow-hidden bg-white shadow-lg flex flex-col items-center justify-center"
                        >
                          <img
                            src={gift.image_url}
                            alt={gift.name}
                            className="w-full h-full object-contain"
                          />
                          
                          {isLocked && (
                            <div className="absolute top-1 right-1 bg-yellow-500 text-white px-1.5 py-0.5 rounded-full text-xs font-bold">
                              🔒
                            </div>
                          )}
                          
                          {owner && (
                            <div className="absolute bottom-1 left-1 right-1">
                              <div className={`${getAvatarColor(owner.display_name)} text-white px-2 py-1 rounded-full shadow-lg flex items-center gap-1.5`}>
                                <Avatar className="h-4 w-4 border border-white/50">
                                  <AvatarImage 
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${owner.avatar_seed || owner.display_name}`}
                                  />
                                  <AvatarFallback className="text-white text-[8px] font-medium bg-white/20">
                                    {getInitials(owner.display_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-[10px] font-medium truncate">{owner.display_name}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-red-50 via-green-50 to-blue-50 flex flex-col overflow-hidden p-4">
      {/* Compact Header */}
      <div className="flex-shrink-0 flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <img src="/elephant-icon.png" alt="White Elephant" className="h-8 w-8" />
          <h1 className="text-2xl font-bold text-gray-900">White Elephant</h1>
          <Badge variant="outline" className="text-sm px-3 py-1">
            {sessionCode}
          </Badge>
        </div>
        {session?.is_final_round && currentPlayer && (
          <div className="flex items-center gap-3">
            <Badge className="text-sm px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 animate-pulse">
              🏆 FINAL ROUND - {currentPlayer.display_name}'s Last Chance!
            </Badge>
            {session?.turn_timer_enabled && timeRemaining !== null && (
              <Badge className={`text-sm px-4 py-2 ${timeRemaining <= 10 ? 'bg-red-600 animate-pulse' : 'bg-gray-700'}`}>
                <Clock className="h-4 w-4 mr-2" />
                {formatTime(timeRemaining)}
              </Badge>
            )}
          </div>
        )}
        {session?.game_status === 'active' && currentPlayer && !session?.is_final_round && (
          <div className="flex items-center gap-3">
            <Badge className="text-sm px-4 py-2 bg-green-600">
              <User className="h-4 w-4 mr-2" />
              {currentPlayer.display_name}'s Turn
            </Badge>
            {session?.turn_timer_enabled && timeRemaining !== null && (
              <Badge className={`text-sm px-4 py-2 ${timeRemaining <= 10 ? 'bg-red-600 animate-pulse' : 'bg-gray-700'}`}>
                <Clock className="h-4 w-4 mr-2" />
                {formatTime(timeRemaining)}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Large Turn Banner - More Prominent */}
      {session?.game_status === 'active' && currentPlayer && (
        <div className="flex-shrink-0 mb-4">
          <Card className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 border-4 border-white shadow-2xl animate-pulse">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center gap-4">
                <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
                  <AvatarImage 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentPlayer.avatar_seed || currentPlayer.display_name}`}
                  />
                  <AvatarFallback className="text-2xl font-bold bg-white text-green-600">
                    {getInitials(currentPlayer.display_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-white/90 text-lg font-medium">Current Turn:</p>
                  <h2 className="text-4xl font-bold text-white drop-shadow-lg">
                    {currentPlayer.display_name}
                  </h2>
                </div>
                {session?.is_final_round && (
                  <Badge className="ml-4 text-lg px-4 py-2 bg-amber-500 text-white font-bold">
                    🏆 FINAL ROUND
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gifts Grid - Dynamically sized to fit all on screen */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <div 
          className={`grid gap-2 w-full max-w-${gridLayout.maxWidth} h-full max-h-full p-2`}
          style={{
            gridTemplateColumns: `repeat(${gridLayout.cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${gridLayout.rows}, minmax(0, 1fr))`
          }}
        >
          {gifts.map((gift, index) => {
            const owner = players.find((p) => p.id === gift.current_owner_id);
            const isRevealing = revealedGiftId === gift.id;
            const isLocked = gift.status === 'locked' || gift.steal_count >= 2;
            const isHidden = gift.status === 'hidden';

            return (
              <div
                key={gift.id}
                className={`
                  relative rounded-lg transition-all duration-500 overflow-hidden
                  ${isRevealing ? 'scale-110 z-50 shadow-2xl ring-4 ring-yellow-400' : 'scale-100'}
                  ${isLocked ? 'ring-2 ring-yellow-500' : ''}
                  ${isHidden ? 'bg-white' : 'bg-white'}
                  shadow-lg flex flex-col items-center justify-center
                `}
              >
                {isHidden ? (
                  /* Hidden Gift - Show Present Image with Number */
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img
                      src="https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80"
                      alt="Wrapped Gift"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-white/90 rounded-full w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center shadow-lg">
                        <span className="text-xl sm:text-3xl font-bold text-gray-800">
                          {index + 1}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Revealed Gift - Show Image */
                  <img
                    src={gift.image_url}
                    alt={gift.name}
                    className="w-full h-full object-contain"
                  />
                )}
                
                {/* Status Indicator */}
                {isLocked && (
                  <div className="absolute top-1 right-1 bg-yellow-500 text-white px-1.5 py-0.5 rounded-full text-xs font-bold">
                    🔒
                  </div>
                )}
                
                {/* Steals Left indicator - top left for revealed gifts */}
                {!isHidden && !isLocked && gift.steal_count < 2 && (
                  <div className="absolute top-1 left-1 bg-blue-500 text-white px-1.5 py-0.5 rounded-full text-xs font-bold">
                    {2 - gift.steal_count} steal{2 - gift.steal_count !== 1 ? 's' : ''} left
                  </div>
                )}
                
                {/* Owner Name with Avatar */}
                {owner && (
                  <div className="absolute bottom-1 left-1 right-1">
                    <div className={`${getAvatarColor(owner.display_name)} text-white px-2 py-1 rounded-full shadow-lg flex items-center gap-1.5`}>
                      <Avatar className="h-4 w-4 border border-white/50">
                        <AvatarImage 
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${owner.avatar_seed || owner.display_name}`}
                        />
                        <AvatarFallback className="text-white text-[8px] font-medium bg-white/20">
                          {getInitials(owner.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[10px] font-medium truncate">{owner.display_name}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Reveal Overlay - Shows gift details when revealed */}
      {revealedGiftId && !stealAnimation && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white rounded-lg p-8 max-w-2xl shadow-2xl">
            {gifts.find((g) => g.id === revealedGiftId) && (
              <>
                <img
                  src={gifts.find((g) => g.id === revealedGiftId)!.image_url}
                  alt={gifts.find((g) => g.id === revealedGiftId)!.name}
                  className="w-full h-96 object-contain mb-4"
                />
                <h2 className="text-4xl font-bold text-center">
                  {gifts.find((g) => g.id === revealedGiftId)!.name}
                </h2>
              </>
            )}
          </div>
        </div>
      )}

      {/* Steal Animation Overlay */}
      {stealAnimation && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 pointer-events-none animate-in fade-in duration-300">
          <div className="bg-gradient-to-br from-red-600 via-red-500 to-orange-500 rounded-2xl p-12 max-w-3xl shadow-2xl border-4 border-yellow-400 animate-in zoom-in duration-500">
            <div className="text-center space-y-6">
              {/* Funny phrase at the top */}
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 animate-pulse">
                <h2 className="text-5xl font-black text-white drop-shadow-lg">
                  {stealAnimation.phrase}
                </h2>
              </div>
              
              {/* Gift image */}
              <div className="bg-white rounded-lg p-4 shadow-2xl">
                <img
                  src={stealAnimation.giftImageUrl}
                  alt={stealAnimation.giftName}
                  className="w-full h-80 object-contain"
                />
              </div>
              
              {/* Steal details */}
              <div className="bg-white/90 rounded-xl p-6 space-y-2">
                <h3 className="text-3xl font-bold text-gray-900">
                  {stealAnimation.giftName}
                </h3>
                <div className="flex items-center justify-center gap-3 text-2xl font-semibold">
                  <span className="text-red-600">{stealAnimation.thiefName}</span>
                  <span className="text-gray-600">steals from</span>
                  <span className="text-blue-600">{stealAnimation.victimName}</span>
                  <span className="text-4xl">😈</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}