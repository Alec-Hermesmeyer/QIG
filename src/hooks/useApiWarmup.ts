'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
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

  // Use refs to avoid dependency cycles
  const isWarmingRef = useRef(false);
  const hasAutoWarmedRef = useRef(false);

  // Update status from service
  const updateStatus = useCallback(() => {
    const serviceStatus = apiWarmupService.getWarmupStatus();
    const newStatus = {
      isWarming: serviceStatus.inProgress,
      lastWarmupTime: serviceStatus.lastWarmupTime,
      shouldWarmup: serviceStatus.shouldWarmup
    };
    setStatus(newStatus);
    isWarmingRef.current = serviceStatus.inProgress;
  }, []);

  // Warm up APIs manually
  const warmupApis = useCallback(async () => {
    if (isWarmingRef.current) {
      if (debug) console.log('Warmup already in progress');
      return [];
    }

    isWarmingRef.current = true;
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
  }, [debug, updateStatus]);

  // Warm up APIs in background (fire and forget) - fixed to break dependency cycle
  const warmupApisBackground = useCallback(() => {
    if (isWarmingRef.current) return;
    
    isWarmingRef.current = true;
    setStatus(prev => ({ ...prev, isWarming: true }));
    apiWarmupService.warmupApisBackground();
    
    // Update status after a short delay
    setTimeout(updateStatus, 1000);
  }, [updateStatus]); // Removed status.isWarming dependency

  // Warm up APIs before chat usage
  const warmupBeforeChat = useCallback(async () => {
    if (!warmupOnChatNavigation) return;
    
    if (status.shouldWarmup || !status.lastWarmupTime) {
      if (debug) {
        console.log('Warming up APIs before chat usage...');
      }
      await warmupApis();
    } else if (debug) {
      // Only log this once per session to reduce spam
      const lastLogTime = sessionStorage.getItem('warmup_skip_logged');
      const now = Date.now().toString();
      if (!lastLogTime || (Date.now() - parseInt(lastLogTime)) > 60000) { // Only log once per minute
        console.log('APIs warmed up recently, skipping...');
        sessionStorage.setItem('warmup_skip_logged', now);
      }
    }
  }, [warmupOnChatNavigation, status.shouldWarmup, status.lastWarmupTime, warmupApis, debug]);

  // Auto warmup on mount - only once per component lifecycle
  useEffect(() => {
    if (autoWarmup && !hasAutoWarmedRef.current) {
      hasAutoWarmedRef.current = true;
      // Only log in debug mode to reduce console spam
      if (debug) {
        console.log('Auto-warming APIs on mount...');
      }
      warmupApisBackground();
    }
  }, [autoWarmup, debug]); // Removed warmupApisBackground dependency

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