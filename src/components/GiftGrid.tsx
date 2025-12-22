import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { Lock, Gift, User } from "lucide-react";

type GiftStatus = "hidden" | "revealed" | "locked" | "stolen" | "final";

interface GiftItem {
  id: string;
  name: string;
  imageUrl?: string;
  status: GiftStatus;
  currentOwnerId?: string | null;
  ownerPlayerId?: string;
  ownerName?: string;
  ownerAvatarSeed?: string;
  stealCount: number;
}

interface GiftGridProps {
  gifts: GiftItem[];
  onGiftSelect?: (giftId: string) => void;
  activePlayerId?: string;
  isPlayerTurn?: boolean;
  gameStatus?: string;
}

const GiftGrid = ({
  gifts = [],
  onGiftSelect,
  activePlayerId,
  isPlayerTurn = false,
  gameStatus,
}: GiftGridProps) => {
  const handleGiftClick = (gift: GiftItem) => {
    if (isPlayerTurn && onGiftSelect) {
      onGiftSelect(gift.id);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">
          {gifts.map((gift, index) => (
            <GiftCard
              key={gift.id}
              gift={gift}
              giftNumber={index + 1}
              onClick={() => handleGiftClick(gift)}
              isSelectable={isPlayerTurn}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

interface GiftCardProps {
  gift: GiftItem;
  giftNumber: number;
  onClick: () => void;
  isSelectable: boolean;
}

const GiftCard = ({ gift, giftNumber, onClick, isSelectable }: GiftCardProps) => {
  const isClickable = isSelectable && gift.status !== "locked";
  
  // Generate initials from owner name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
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

  return (
    <motion.div
      whileHover={isClickable ? { scale: 1.02 } : {}}
      whileTap={isClickable ? { scale: 0.98 } : {}}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <Card
        className={`overflow-hidden ${
          isClickable 
            ? "cursor-pointer hover:shadow-lg hover:border-primary transition-all" 
            : "cursor-default"
        } h-full`}
        onClick={isClickable ? onClick : undefined}
      >
        <CardContent className="p-0 relative h-full flex flex-col">
          {gift.status === "hidden" ? (
            /* Hidden Gift - Show Present Image with Number (matching PresentationView) */
            <div className="relative aspect-square w-full flex items-center justify-center overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80"
                alt="Wrapped Gift"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white/90 rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shadow-lg">
                  <span className="text-lg sm:text-xl font-bold text-gray-800">{giftNumber}</span>
                </div>
              </div>
            </div>
          ) : (
            /* Revealed Gift - Show Image (matching PresentationView) */
            <div className="relative aspect-square w-full bg-white">
              {gift.imageUrl ? (
                <img
                  src={gift.imageUrl}
                  alt={gift.name}
                  loading="lazy"
                  className="h-full w-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80';
                  }}
                />
              ) : (
                <div className="bg-muted flex items-center justify-center h-full w-full">
                  <Gift size={32} className="text-muted-foreground" />
                </div>
              )}
              
              {/* Locked indicator - top right (matching PresentationView) */}
              {(gift.status === "locked" || gift.stealCount >= 2) && (
                <div className="absolute top-1 right-1 bg-yellow-500 text-white px-1.5 py-0.5 rounded-full text-xs font-bold">
                  🔒
                </div>
              )}
              
              {/* Steals Left indicator - top left for revealed gifts */}
              {gift.status !== "locked" && gift.status !== "final" && gift.stealCount < 2 && (
                <div className="absolute top-1 left-1 bg-blue-500 text-white px-1.5 py-0.5 rounded-full text-xs font-bold">
                  {2 - gift.stealCount} steal{2 - gift.stealCount !== 1 ? 's' : ''} left
                </div>
              )}
              
              {/* Owner name bubble at bottom (matching PresentationView) */}
              {gift.ownerName && (
                <div className="absolute bottom-1 left-1 right-1">
                  <div className={`${getAvatarColor(gift.ownerName)} text-white px-2 py-1 rounded-full shadow-lg flex items-center gap-1.5`}>
                    <Avatar className="h-4 w-4 border border-white/50">
                      <AvatarImage 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${gift.ownerAvatarSeed || gift.ownerName}`}
                      />
                      <AvatarFallback className="text-white text-[8px] font-medium bg-white/20">
                        {getInitials(gift.ownerName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] font-medium truncate">{gift.ownerName}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="p-3 flex-grow">
            <div className="flex flex-col gap-1">
              <h3 className="font-medium text-sm line-clamp-2 min-h-[2.5rem]">
                {gift.status === "hidden" ? "Mystery Gift" : gift.name}
              </h3>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default GiftGrid;