'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Clock, Wifi, WifiOff, Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StaleDataIndicatorProps {
  isLoading?: boolean;
  isValidating?: boolean;
  error?: Error | null;
  lastUpdated?: Date | null;
  onRefresh?: () => void;
  dataSource?: string;
  showDetails?: boolean;
  className?: string;
}

export function StaleDataIndicator({
  isLoading = false,
  isValidating = false,
  error = null,
  lastUpdated = null,
  onRefresh,
  dataSource = 'Data',
  showDetails = true,
  className = ''
}: StaleDataIndicatorProps) {
  
  const getStatus = () => {
    if (error) return 'error';
    if (isLoading && !lastUpdated) return 'initial-loading';
    if (isValidating) return 'refreshing';
    if (lastUpdated) return 'fresh';
    return 'unknown';
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'error':
        return {
          icon: WifiOff,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Connection Error',
          description: 'Failed to load fresh data'
        };
      case 'initial-loading':
        return {
          icon: RefreshCw,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          label: 'Loading',
          description: 'Loading fresh data...'
        };
      case 'refreshing':
        return {
          icon: RefreshCw,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          label: 'Updating',
          description: 'Refreshing data in background'
        };
      case 'fresh':
        return {
          icon: Database,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: 'Up to date',
          description: 'Data is current'
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Unknown',
          description: 'Status unknown'
        };
    }
  };

  const formatLastUpdated = (date: Date) => {
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const status = getStatus();
  const config = getStatusConfig(status);
  const Icon = config.icon;

  if (!showDetails && status === 'fresh' && !isValidating) {
    return null; // Hide when everything is working fine
  }

  return (
    <TooltipProvider>
      <div className={`flex items-center space-x-2 ${className}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={status}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className={`flex items-center space-x-2 px-2 py-1 rounded-md border ${config.bgColor} ${config.borderColor}`}
          >
            <Icon 
              className={`w-4 h-4 ${config.color} ${isValidating || (isLoading && !lastUpdated) ? 'animate-spin' : ''}`} 
            />
            
            {showDetails && (
              <div className="flex flex-col">
                <span className={`text-xs font-medium ${config.color}`}>
                  {config.label}
                </span>
                {lastUpdated && (
                  <span className="text-xs text-gray-500">
                    {formatLastUpdated(lastUpdated)}
                  </span>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {onRefresh && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Refresh {dataSource}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {error && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="destructive" className="text-xs">
                Error
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs text-sm">{error.message}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

/**
 * Compact version for smaller spaces
 */
export function CompactStaleDataIndicator({
  isValidating = false,
  error = null,
  onRefresh
}: Pick<StaleDataIndicatorProps, 'isValidating' | 'error' | 'onRefresh'>) {
  
  if (!isValidating && !error) return null;

  return (
    <div className="flex items-center space-x-1">
      {isValidating && (
        <RefreshCw className="w-3 h-3 text-blue-500 animate-spin" />
      )}
      {error && (
        <WifiOff className="w-3 h-3 text-red-500" />
      )}
      {onRefresh && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          className="h-6 w-6 p-0"
        >
          <RefreshCw className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}

/**
 * Page-level indicator that shows in header or toolbar
 */
export function PageStaleDataIndicator({
  isLoading = false,
  isValidating = false,
  error = null,
  lastUpdated = null,
  onRefresh,
  dataSource = 'Page data'
}: StaleDataIndicatorProps) {
  
  // Only show if there's something to indicate
  if (!isLoading && !isValidating && !error && lastUpdated) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg px-4 py-2 shadow-sm"
    >
      <StaleDataIndicator
        isLoading={isLoading}
        isValidating={isValidating}
        error={error}
        lastUpdated={lastUpdated}
        onRefresh={onRefresh}
        dataSource={dataSource}
        showDetails={true}
      />
    </motion.div>
  );
} 