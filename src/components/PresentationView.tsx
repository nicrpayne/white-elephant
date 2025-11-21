import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Gift, User } from 'lucide-react';

interface Gift {
  id: string;
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
  game_status: string;
  active_player_id: string | null;
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
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [revealedGiftId, setRevealedGiftId] = useState<string | null>(null);
  const [stealAnimation, setStealAnimation] = useState<StealAnimation | null>(null);

  useEffect(() => {
    if (!sessionCode) return;

    const fetchData = async () => {
      // Fetch session
      const { data: sessionData } = await supabase
        .from('game_sessions')
        .select('*')
        .eq('session_code', sessionCode)
        .single();

      if (sessionData) {
        setSession(sessionData);

        // Fetch gifts
        const { data: giftsData } = await supabase
          .from('gifts')
          .select('*')
          .eq('session_id', sessionData.id)
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
      }
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
          
          if (action.action_type === 'steal') {
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
            setGifts((prev) =>
              prev.map((g) => (g.id === updatedGift.id ? updatedGift : g))
            );

            // Trigger reveal animation if gift was just revealed (but not stolen - steal has its own animation)
            if (updatedGift.status === 'revealed' && !stealAnimation) {
              setRevealedGiftId(updatedGift.id);
              setTimeout(() => setRevealedGiftId(null), 3000);
            }
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
  }, [sessionCode, stealAnimation]);

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
        {session?.game_status === 'active' && currentPlayer && (
          <Badge className="text-sm px-4 py-2 bg-green-600">
            <User className="h-4 w-4 mr-2" />
            {currentPlayer.display_name}'s Turn
          </Badge>
        )}
        {session?.game_status === 'ended' && (
          <Badge className="text-sm px-4 py-2 bg-blue-600">
            Game Complete!
          </Badge>
        )}
      </div>

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