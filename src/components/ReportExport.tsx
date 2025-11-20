import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface Player {
  id: string;
  displayName: string;
  orderIndex: number;
}

interface Gift {
  id: string;
  name: string;
  imageUrl?: string;
  currentOwnerId?: string;
  stealCount: number;
}

interface ReportExportProps {
  players: Player[];
  gifts: Gift[];
  sessionCode: string;
  variant?: "default" | "outline";
  className?: string;
  showIcon?: boolean;
}

export default function ReportExport({
  players = [],
  gifts = [],
  sessionCode = "session",
  variant = "outline",
  className = "",
  showIcon = true,
}: ReportExportProps) {
  const handleExport = () => {
    const csvRows = [
      ['Rank', 'Player Name', 'Gift Name', 'Gift Image URL', 'Order Index', 'Steal Count'],
      ...players.map((player, index) => {
        const playerGift = gifts.find(g => g.currentOwnerId === player.id);
        return [
          (index + 1).toString(),
          player.displayName,
          playerGift?.name || 'No gift',
          playerGift?.imageUrl || '',
          player.orderIndex.toString(),
          playerGift?.stealCount?.toString() || '0'
        ];
      })
    ];
    
    // Properly escape CSV cells: replace quotes with double quotes and wrap in quotes
    const escapeCsvCell = (cell: string) => {
      // Replace any quotes with double quotes and wrap the whole cell in quotes
      return `"${cell.replace(/"/g, '""')}"`;
    };
    
    const csvContent = csvRows.map(row => 
      row.map(cell => escapeCsvCell(cell)).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `white-elephant-results-${sessionCode}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Button
      onClick={handleExport}
      variant={variant}
      className={className}
    >
      {showIcon && <Download className="h-4 w-4 mr-2" />}
      Export CSV
    </Button>
  );
}