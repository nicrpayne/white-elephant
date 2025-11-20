import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gift, User } from 'lucide-react';

interface Gift {
  id: string;
  name: string;
  imageUrl: string;
  isRevealed: boolean;
  stealCount: number;
  currentOwnerId: string | null;
  orderIndex: number;
}

interface Player {
  id: string;
  displayName: string;
  orderIndex: number;
  hasCompletedTurn: boolean;
}

interface Session {
  status: string;
  currentTurnPlayerId: string | null;
}

export default function PresentationView() {
  const { sessionCode } = useParams<{ sessionCode: string }>();
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [revealedGiftId, setRevealedGiftId] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionCode) return;

    const fetchData = async () => {
      // Fetch session
      const { data: sessionData } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', sessionCode)
        .single();

      if (sessionData) {
        setSession(sessionData);

        // Fetch gifts
        const { data: giftsData } = await supabase
          .from('gifts')
          .select('*')
          .eq('sessionId', sessionData.id)
          .order('orderIndex');

        if (giftsData) setGifts(giftsData);

        // Fetch players
        const { data: playersData } = await supabase
          .from('players')
          .select('*')
          .eq('sessionId', sessionData.id)
          .order('orderIndex');

        if (playersData) setPlayers(playersData);
      }
    };

    fetchData();

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

            // Trigger reveal animation if gift was just revealed
            if (updatedGift.isRevealed) {
              setRevealedGiftId(updatedGift.id);
              setTimeout(() => setRevealedGiftId(null), 4000);
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
          table: 'sessions',
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
      giftsChannel.unsubscribe();
      sessionChannel.unsubscribe();
      playersChannel.unsubscribe();
    };
  }, [sessionCode]);

  const currentPlayer = players.find((p) => p.id === session?.currentTurnPlayerId);
  const giftCount = gifts.length;
  
  // Calculate grid columns based on gift count
  const getGridCols = () => {
    if (giftCount <= 6) return 3;
    if (giftCount <= 12) return 4;
    if (giftCount <= 20) return 5;
    if (giftCount <= 30) return 6;
    return 7;
  };

  const gridCols = getGridCols();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-green-50 to-blue-50 p-4">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <img src="/elephant-icon.png" alt="White Elephant" className="h-16 w-16" />
          <h1 className="text-5xl font-bold text-gray-900">White Elephant</h1>
        </div>
        <div className="flex items-center justify-center gap-6 text-lg">
          <Badge variant="outline" className="text-lg px-4 py-2">
            Session: <span className="font-mono font-bold ml-2">{sessionCode}</span>
          </Badge>
          {session?.status === 'active' && currentPlayer && (
            <Badge className="text-lg px-4 py-2 bg-green-600">
              <User className="h-5 w-5 mr-2" />
              Current Turn: {currentPlayer.displayName}
            </Badge>
          )}
          {session?.status === 'completed' && (
            <Badge className="text-lg px-4 py-2 bg-blue-600">
              Game Complete!
            </Badge>
          )}
        </div>
      </div>

      {/* Gifts Grid */}
      <div 
        className="grid gap-3 mx-auto max-w-7xl"
        style={{
          gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`
        }}
      >
        {gifts.map((gift) => {
          const owner = players.find((p) => p.id === gift.currentOwnerId);
          const isRevealing = revealedGiftId === gift.id;
          const isLocked = gift.stealCount >= 2;

          return (
            <Card
              key={gift.id}
              className={`
                relative overflow-hidden transition-all duration-500
                ${isRevealing ? 'scale-150 z-50 shadow-2xl ring-4 ring-yellow-400' : 'scale-100'}
                ${isLocked ? 'ring-2 ring-yellow-500' : ''}
                ${!gift.isRevealed ? 'bg-gray-200' : 'bg-white'}
              `}
            >
              <div className="aspect-square relative">
                {gift.isRevealed ? (
                  <>
                    <img
                      src={gift.imageUrl}
                      alt={gift.name}
                      className="w-full h-full object-cover"
                    />
                    {isLocked && (
                      <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                        LOCKED
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-300">
                    <Gift className="h-12 w-12 text-gray-500" />
                  </div>
                )}
              </div>
              
              {gift.isRevealed && (
                <div className="p-2 bg-white">
                  <p className="font-semibold text-sm truncate">{gift.name}</p>
                  {owner && (
                    <p className="text-xs text-gray-600 truncate">{owner.displayName}</p>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Reveal Overlay */}
      {revealedGiftId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 pointer-events-none">
          <div className="bg-white rounded-lg p-8 max-w-2xl animate-pulse">
            {gifts.find((g) => g.id === revealedGiftId) && (
              <>
                <img
                  src={gifts.find((g) => g.id === revealedGiftId)!.imageUrl}
                  alt={gifts.find((g) => g.id === revealedGiftId)!.name}
                  className="w-full h-96 object-contain mb-4"
                />
                <h2 className="text-3xl font-bold text-center">
                  {gifts.find((g) => g.id === revealedGiftId)!.name}
                </h2>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
