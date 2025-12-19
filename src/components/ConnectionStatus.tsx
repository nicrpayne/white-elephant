import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConnectionStatusProps {
  onRefresh?: () => void;
  showRefreshButton?: boolean;
}

export default function ConnectionStatus({ onRefresh, showRefreshButton = true }: ConnectionStatusProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'error'>('connected');
  const [lastError, setLastError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-refresh when coming back online
      if (onRefresh) {
        handleRefresh();
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };
    
    const handleRealtimeIssue = (event: CustomEvent) => {
      setRealtimeStatus('error');
      setLastError(event.detail?.error || 'Connection issue');
      
      // Auto-clear error after 10 seconds if it resolves
      setTimeout(() => {
        if (navigator.onLine) {
          setRealtimeStatus('connected');
          setLastError(null);
        }
      }, 10000);
    };
    
    const handlePartialFailure = (event: CustomEvent) => {
      setLastError(`Some items failed to save (${event.detail?.failedCount} of ${event.detail?.totalCount})`);
      
      setTimeout(() => setLastError(null), 8000);
    };
    
    const handleRefreshComplete = () => {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('realtimeConnectionIssue', handleRealtimeIssue as EventListener);
    window.addEventListener('giftInsertPartialFailure', handlePartialFailure as EventListener);
    window.addEventListener('gameStateRefreshed', handleRefreshComplete);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('realtimeConnectionIssue', handleRealtimeIssue as EventListener);
      window.removeEventListener('giftInsertPartialFailure', handlePartialFailure as EventListener);
      window.removeEventListener('gameStateRefreshed', handleRefreshComplete);
    };
  }, [onRefresh]);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
        setRealtimeStatus('connected');
        setLastError(null);
      } catch (err) {
        console.error('Refresh failed:', err);
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  // Don't show anything if everything is fine and no success message
  if (isOnline && realtimeStatus === 'connected' && !lastError && !showSuccess) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {showSuccess && (
        <Badge variant="outline" className="flex items-center gap-2 px-3 py-2 text-sm shadow-lg bg-green-50 border-green-300 text-green-800 animate-in fade-in duration-300">
          <CheckCircle className="h-4 w-4" />
          Synced!
        </Badge>
      )}
      
      {!isOnline && (
        <Badge variant="destructive" className="flex items-center gap-2 px-3 py-2 text-sm shadow-lg">
          <WifiOff className="h-4 w-4" />
          No internet connection
        </Badge>
      )}
      
      {isOnline && realtimeStatus === 'error' && (
        <Badge variant="outline" className="flex items-center gap-2 px-3 py-2 text-sm shadow-lg bg-yellow-50 border-yellow-300 text-yellow-800">
          <Wifi className="h-4 w-4" />
          Reconnecting...
        </Badge>
      )}
      
      {lastError && (
        <Badge variant="outline" className="flex items-center gap-2 px-3 py-2 text-sm shadow-lg bg-orange-50 border-orange-300 text-orange-800 max-w-xs">
          {lastError}
        </Badge>
      )}
      
      {showRefreshButton && isOnline && (realtimeStatus === 'error' || lastError) && (
        <Button 
          size="sm" 
          variant="outline" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="shadow-lg"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      )}
    </div>
  );
}
