'use client';

import { useEffect, useCallback, useState } from 'react';
import { apiWarmupService } from '../services/apiWarmupService';

interface WarmupStatus {
  isWarming: boolean;
  lastWarmupTime: number | null;
  shouldWarmup: boolean;
}

interface UseApiWarmupOptions {
  /**
   * Automatically warm up APIs when the hook mounts
   */
  autoWarmup?: boolean;
  
  /**
   * Warm up APIs when user navigates to chat-related pages
   */
  warmupOnChatNavigation?: boolean;
  
  /**
   * Interval to check if warmup is needed (in milliseconds)
   */
  checkInterval?: number;
  
  /**
   * Enable debug logging
   */
  debug?: boolean;
}

/**
 * Hook to manage API warmup functionality
 * 
 * This hook provides methods to warm up Azure RAG APIs and track warmup status.
 * It can automatically warm up APIs on mount, before chat usage, or on demand.
 */
export function useApiWarmup(options: UseApiWarmupOptions = {}) {
  const {
    autoWarmup = false,
    warmupOnChatNavigation = true,
    checkInterval = 60000, // 1 minute
    debug = false
  } = options;

  const [status, setStatus] = useState<WarmupStatus>({
    isWarming: false,
    lastWarmupTime: null,
    shouldWarmup: true
  });

  // Update status from service
  const updateStatus = useCallback(() => {
    const serviceStatus = apiWarmupService.getWarmupStatus();
    setStatus({
      isWarming: serviceStatus.inProgress,
      lastWarmupTime: serviceStatus.lastWarmupTime,
      shouldWarmup: serviceStatus.shouldWarmup
    });
  }, []);

  // Warm up APIs manually
  const warmupApis = useCallback(async () => {
    if (status.isWarming) {
      if (debug) console.log('Warmup already in progress');
      return [];
    }

    setStatus(prev => ({ ...prev, isWarming: true }));
    
    try {
      const results = await apiWarmupService.warmupApis();
      updateStatus();
      
      if (debug) {
        console.log('API warmup completed:', results);
      }
      
      return results;
    } catch (error) {
      if (debug) {
        console.error('API warmup failed:', error);
      }
      updateStatus();
      throw error;
    }
  }, [status.isWarming, debug, updateStatus]);

  // Warm up APIs in background (fire and forget)
  const warmupApisBackground = useCallback(() => {
    if (status.isWarming) return;
    
    setStatus(prev => ({ ...prev, isWarming: true }));
    apiWarmupService.warmupApisBackground();
    
    // Update status after a short delay
    setTimeout(updateStatus, 1000);
  }, [status.isWarming, updateStatus]);

  // Warm up APIs before chat usage
  const warmupBeforeChat = useCallback(async () => {
    if (!warmupOnChatNavigation) return;
    
    if (status.shouldWarmup || !status.lastWarmupTime) {
      if (debug) {
        console.log('Warming up APIs before chat usage...');
      }
      await warmupApis();
    } else if (debug) {
      console.log('APIs already warmed up recently, skipping...');
    }
  }, [warmupOnChatNavigation, status.shouldWarmup, status.lastWarmupTime, warmupApis, debug]);

  // Auto warmup on mount
  useEffect(() => {
    if (autoWarmup) {
      if (debug) {
        console.log('Auto-warming APIs on mount...');
      }
      warmupApisBackground();
    }
  }, [autoWarmup, warmupApisBackground, debug]);

  // Periodic status updates
  useEffect(() => {
    updateStatus(); // Initial update
    
    const interval = setInterval(updateStatus, checkInterval);
    return () => clearInterval(interval);
  }, [updateStatus, checkInterval]);

  // Return hook interface
  return {
    // Status
    status,
    
    // Actions
    warmupApis,
    warmupApisBackground,
    warmupBeforeChat,
    
    // Utilities
    updateStatus,
    
    // Computed status
    isWarming: status.isWarming,
    shouldWarmup: status.shouldWarmup,
    lastWarmupTime: status.lastWarmupTime,
    
    // Time since last warmup (in minutes)
    minutesSinceWarmup: status.lastWarmupTime 
      ? Math.floor((Date.now() - status.lastWarmupTime) / 60000)
      : null
  };
} 