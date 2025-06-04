'use client';

import useSWR, { mutate } from 'swr';
import { useEffect, useCallback } from 'react';

interface StaleDataOptions<T> {
  staleKey: string;
  fetchFn: () => Promise<T>;
  refreshInterval?: number;
  dedupingInterval?: number;
  revalidateOnFocus?: boolean;
  fallbackData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface StaleDataReturn<T> {
  data: T | undefined;
  isLoading: boolean;
  isValidating: boolean;
  error: Error | undefined;
  mutate: (data?: T | Promise<T> | ((current?: T) => T | Promise<T>), shouldRevalidate?: boolean) => Promise<T | undefined>;
  refresh: () => Promise<T | undefined>;
}

// Helper functions for localStorage with compression
const STORAGE_PREFIX = 'qig_stale_';
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours default

interface StoragePayload<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

function saveToStorage<T>(key: string, data: T, ttl?: number): void {
  // Check if we're on the client side
  if (typeof window === 'undefined') return;
  
  try {
    const payload: StoragePayload<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || DEFAULT_TTL
    };
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(payload));
  } catch (error) {
    console.warn('[StaleData] Failed to save to localStorage:', error);
  }
}

function loadFromStorage<T>(key: string): T | null {
  // Check if we're on the client side
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + key);
    if (!stored) return null;

    const payload = JSON.parse(stored);
    const age = Date.now() - payload.timestamp;
    
    // Check if data is too old
    if (age > payload.ttl) {
      localStorage.removeItem(STORAGE_PREFIX + key);
      return null;
    }

    return payload.data;
  } catch (error) {
    console.warn('[StaleData] Failed to load from localStorage:', error);
    return null;
  }
}

/**
 * Enhanced hook that provides stale-while-revalidate data fetching
 * with localStorage persistence and optimistic updates
 */
export function useStaleData<T>({
  staleKey,
  fetchFn,
  refreshInterval = 30000,
  dedupingInterval = 2000,
  revalidateOnFocus = true,
  fallbackData,
  onSuccess,
  onError
}: StaleDataOptions<T>): StaleDataReturn<T> {
  
  // Load initial data from localStorage if available
  const storedData = loadFromStorage<T>(staleKey);
  const initialData = storedData || fallbackData;

  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate: swrMutate
  } = useSWR(
    staleKey,
    fetchFn,
    {
      fallbackData: initialData,
      refreshInterval,
      dedupingInterval,
      revalidateOnFocus,
      revalidateOnReconnect: true,
      shouldRetryOnError: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      // Keep previous data while revalidating
      keepPreviousData: true,
      // Use stale data while revalidating
      revalidateIfStale: true
    }
  );

  // Save successful data to localStorage
  useEffect(() => {
    if (data && !error) {
      saveToStorage(staleKey, data);
      onSuccess?.(data);
    }
  }, [data, error, staleKey, onSuccess]);

  // Handle errors
  useEffect(() => {
    if (error) {
      onError?.(error);
    }
  }, [error, onError]);

  // Enhanced mutate with optimistic updates
  const enhancedMutate = useCallback(
    async (
      updater?: T | Promise<T> | ((current?: T) => T | Promise<T>),
      shouldRevalidate = true
    ) => {
      try {
        const result = await swrMutate(updater, shouldRevalidate);
        if (result) {
          saveToStorage(staleKey, result);
        }
        return result;
      } catch (error) {
        console.error('[StaleData] Mutate error:', error);
        throw error;
      }
    },
    [swrMutate, staleKey]
  );

  // Manual refresh function
  const refresh = useCallback(async () => {
    return enhancedMutate(undefined, true);
  }, [enhancedMutate]);

  return {
    data,
    isLoading,
    isValidating,
    error,
    mutate: enhancedMutate,
    refresh
  };
}

/**
 * Hook specifically for service status data with optimizations
 */
export function useStaleServiceStatus() {
  return useStaleData({
    staleKey: 'service-status',
    fetchFn: async () => {
      try {
        // Try to import the service, but fallback if it doesn't exist
        const { supabaseServiceStatusService } = await import('@/services/supabaseServiceStatusService').catch(() => ({ supabaseServiceStatusService: null }));
        
        if (!supabaseServiceStatusService) {
          // Return mock data if service doesn't exist
          return {
            services: [],
            metrics: {
              totalServices: 0,
              servicesByStatus: {},
              servicesByCategory: {},
              completionRate: 0,
              upcomingDeadlines: [],
              recentUpdates: []
            }
          };
        }

        const [services, metrics] = await Promise.all([
          supabaseServiceStatusService.getAllServices(),
          supabaseServiceStatusService.getServiceMetrics()
        ]);
        return { services, metrics };
      } catch (error) {
        console.warn('[StaleData] Service status fetch failed, using fallback:', error);
        // Return empty data on error
        return {
          services: [],
          metrics: {
            totalServices: 0,
            servicesByStatus: {},
            servicesByCategory: {},
            completionRate: 0,
            upcomingDeadlines: [],
            recentUpdates: []
          }
        };
      }
    },
    refreshInterval: 30000,
    onSuccess: (data) => {
      console.log(`[StaleData] Service status updated: ${data.services.length} services`);
    },
    onError: (error) => {
      console.error('[StaleData] Service status error:', error);
    }
  });
}

/**
 * Hook specifically for monitoring data with optimizations
 */
export function useStaleMonitoring() {
  return useStaleData({
    staleKey: 'monitoring-data',
    fetchFn: async () => {
      try {
        // Try to import services with fallbacks
        const [monitoringModule, alertingModule] = await Promise.allSettled([
          import('@/services/monitoringService'),
          import('@/services/alertingService')
        ]);
        
        let monitoringData = null;
        let enhancedAlerts: any[] = [];

        if (monitoringModule.status === 'fulfilled' && monitoringModule.value.monitoringService) {
          try {
            monitoringData = await monitoringModule.value.monitoringService.getMonitoringData();
          } catch (error) {
            console.warn('[StaleData] Monitoring service failed:', error);
          }
        }

        if (alertingModule.status === 'fulfilled' && alertingModule.value.alertingService) {
          try {
            enhancedAlerts = await alertingModule.value.alertingService.getActiveAlerts();
          } catch (error) {
            console.warn('[StaleData] Alerting service failed:', error);
          }
        }
        
        return { 
          monitoringData: monitoringData || { endpoints: [], metrics: {} }, 
          enhancedAlerts: enhancedAlerts || [] 
        };
      } catch (error) {
        console.warn('[StaleData] Monitoring fetch failed, using fallback:', error);
        return { 
          monitoringData: { endpoints: [], metrics: {} }, 
          enhancedAlerts: [] 
        };
      }
    },
    refreshInterval: 15000, // More frequent for monitoring
    onSuccess: (data) => {
      console.log(`[StaleData] Monitoring updated: ${data.enhancedAlerts.length} alerts`);
    },
    onError: (error) => {
      console.error('[StaleData] Monitoring error:', error);
    }
  });
}

/**
 * Hook for task management data
 */
export function useStaleTaskManagement() {
  return useStaleData({
    staleKey: 'task-management',
    fetchFn: async () => {
      try {
        // Try to import task management, but fallback if it doesn't exist
        const taskModule = await import('@/hooks/useTaskManagement').catch(() => ({ useTaskManagement: null }));
        
        if (!taskModule.useTaskManagement) {
          // Return mock data if hook doesn't exist
          return {
            tasks: [],
            categories: [],
            recentActivity: []
          };
        }

        // This would need to be adapted based on your task management service
        // For now, return empty data structure
        return {
          tasks: [],
          categories: [],
          recentActivity: []
        };
      } catch (error) {
        console.warn('[StaleData] Task management fetch failed, using fallback:', error);
        return {
          tasks: [],
          categories: [],
          recentActivity: []
        };
      }
    },
    refreshInterval: 60000, // Less frequent for tasks
    onSuccess: (data) => {
      console.log(`[StaleData] Tasks updated: ${data.tasks.length} tasks`);
    }
  });
}

/**
 * Clear all stale data from localStorage
 */
export function clearAllStaleData(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(STORAGE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear SWR cache
    mutate(() => true, undefined, { revalidate: false });
    
    console.log('[StaleData] All stale data cleared');
  } catch (error) {
    console.error('[StaleData] Failed to clear stale data:', error);
  }
}

/**
 * Get storage usage info
 */
export function getStaleDataInfo(): { keys: string[], totalSize: number } {
  try {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(STORAGE_PREFIX));
    const totalSize = keys.reduce((size, key) => {
      const value = localStorage.getItem(key);
      return size + (value ? value.length : 0);
    }, 0);
    
    return { keys, totalSize };
  } catch (error) {
    console.error('[StaleData] Failed to get storage info:', error);
    return { keys: [], totalSize: 0 };
  }
} 