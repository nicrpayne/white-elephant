import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { Lock, Gift, User } from "lucide-react";

type GiftStatus = "hidden" | "revealed" | "locked" | "final";

interface GiftItem {
  id: string;
  name: string;
  imageUrl?: string;
  status: GiftStatus;
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
            <div className="bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center aspect-square w-full relative overflow-hidden">
              {/* Cover image */}
              <img
                src="https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=80"
                alt="Mystery Gift"
                className="absolute inset-0 w-full h-full object-cover opacity-40"
              />
              {/* Gift number */}
              <div className="absolute top-2 left-2 bg-white/90 rounded-full w-8 h-8 flex items-center justify-center shadow-md z-10">
                <span className="text-sm font-bold text-purple-600">{giftNumber}</span>
              </div>
              {/* Gift icon */}
              <Gift size={48} className="text-purple-500 relative z-10" />
            </div>
          ) : (
            <div className="relative aspect-square w-full bg-white">
              {gift.imageUrl ? (
                <img
                  src={gift.imageUrl}
                  alt={gift.name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="bg-muted flex items-center justify-center h-full w-full">
                  <Gift size={32} className="text-muted-foreground" />
                </div>
              )}
              
              {/* Owner name bubble at bottom */}
              {gift.status !== "hidden" && gift.ownerName && (
                <div className="absolute bottom-2 left-2 right-2">
                  <div className={`${getAvatarColor(gift.ownerName)} text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2`}>
                    <Avatar className="h-5 w-5 border border-white/50">
                      <AvatarImage 
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${gift.ownerAvatarSeed || gift.ownerName}`}
                      />
                      <AvatarFallback className="text-white text-[10px] font-medium bg-white/20">
                        {getInitials(gift.ownerName)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium truncate">{gift.ownerName}</span>
                  </div>
                </div>
              )}
              
              {/* Steal count badge - top right */}
              {gift.status !== "hidden" && (
                <div className="absolute top-2 right-2">
                  <Badge 
                    variant={gift.stealCount >= 2 ? "destructive" : gift.stealCount === 1 ? "default" : "secondary"}
                    className="text-xs font-bold shadow-lg"
                  >
                    {gift.stealCount >= 2 ? (
                      <span className="flex items-center gap-1">
                        <Lock size={12} /> Locked
                      </span>
                    ) : (
                      <span>{2 - gift.stealCount} steal{2 - gift.stealCount !== 1 ? 's' : ''} left</span>
                    )}
                  </Badge>
                </div>
              )}
              
              {gift.status === "locked" && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Lock size={24} className="text-white" />
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