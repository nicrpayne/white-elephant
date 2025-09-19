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
  columns?: number;
}

const GiftGrid = ({
  gifts = [],
  onGiftSelect,
  activePlayerId,
  isPlayerTurn = false,
  columns = 4,
}: GiftGridProps) => {
  const handleGiftClick = (gift: GiftItem) => {
    if (isPlayerTurn && onGiftSelect) {
      onGiftSelect(gift.id);
    }
  };

  return (
    <div className="w-full bg-background p-4 rounded-lg">
      <div
        className={`grid gap-4`}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {gifts.map((gift) => (
          <GiftCard
            key={gift.id}
            gift={gift}
            onClick={() => handleGiftClick(gift)}
            isSelectable={isPlayerTurn}
          />
        ))}
      </div>
    </div>
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
      whileHover={isClickable ? { scale: 1.05 } : {}}
      whileTap={isClickable ? { scale: 0.98 } : {}}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={`overflow-hidden ${isClickable ? "cursor-pointer" : "cursor-default"} h-full`}
        onClick={isClickable ? onClick : undefined}
      >
        <CardContent className="p-0 relative h-full flex flex-col">
          {gift.status === "hidden" ? (
            <div className="bg-muted flex items-center justify-center h-40 w-full">
              <Gift size={48} className="text-muted-foreground" />
            </div>
          ) : (
            <div className="relative h-40 w-full">
              {gift.imageUrl ? (
                <img
                  src={gift.imageUrl}
                  alt={gift.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="bg-muted flex items-center justify-center h-full w-full">
                  <Gift size={48} className="text-muted-foreground" />
                </div>
              )}
              {gift.status === "locked" && (
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <Lock size={32} className="text-white" />
                </div>
              )}
            </div>
          )}

          <div className="p-3 flex-grow">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium truncate">
                {gift.status === "hidden" ? "Mystery Gift" : gift.name}
              </h3>
              {gift.status !== "hidden" && gift.stealCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {gift.stealCount}/2 steals
                </Badge>
              )}
            </div>

            {gift.status !== "hidden" && gift.ownerName && (
              <div className="flex items-center text-sm text-muted-foreground">
                <User size={14} className="mr-1" />
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
