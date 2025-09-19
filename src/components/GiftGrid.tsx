import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
          {gifts.map((gift) => (
            <GiftCard
              key={gift.id}
              gift={gift}
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
  onClick: () => void;
  isSelectable: boolean;
}

const GiftCard = ({ gift, onClick, isSelectable }: GiftCardProps) => {
  const isClickable = isSelectable && gift.status !== "locked";

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
        className={`overflow-hidden ${isClickable ? "cursor-pointer" : "cursor-default"} h-full`}
        onClick={isClickable ? onClick : undefined}
      >
        <CardContent className="p-0 relative h-full flex flex-col">
          {gift.status === "hidden" ? (
            <div className="bg-muted flex items-center justify-center aspect-square w-full">
              <Gift size={32} className="text-muted-foreground" />
            </div>
          ) : (
            <div className="relative aspect-square w-full">
              {gift.imageUrl ? (
                <img
                  src={gift.imageUrl}
                  alt={gift.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="bg-muted flex items-center justify-center h-full w-full">
                  <Gift size={32} className="text-muted-foreground" />
                </div>
              )}
              {gift.status === "locked" && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Lock size={24} className="text-white" />
                </div>
              )}
            </div>
          )}

          <div className="p-2 flex-grow">
            <div className="flex flex-col gap-1">
              <h3 className="font-medium text-xs truncate">
                {gift.status === "hidden" ? "Mys..." : gift.name}
              </h3>
              
              {gift.status !== "hidden" && gift.stealCount > 0 && (
                <Badge variant="secondary" className="text-xs px-1 py-0 h-auto self-start">
                  {gift.stealCount}/2 steals
                </Badge>
              )}
            </div>

            {gift.status !== "hidden" && gift.ownerName && (
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <User size={10} className="mr-1 flex-shrink-0" />
                <span className="truncate">{gift.ownerName}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default GiftGrid;