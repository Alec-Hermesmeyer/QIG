'use client';

import { useEffect } from 'react';
import { useApiWarmup } from '@/hooks/useApiWarmup';

interface ApiWarmupProviderProps {
  children: React.ReactNode;
}

/**
 * Provider that automatically warms up APIs in the background
 * 
 * This provider:
 * 1. Automatically warms up APIs when the component mounts
 * 2. Periodically checks if APIs need warming up
 * 3. Ensures APIs are ready before users start chatting
 */
export function ApiWarmupProvider({ children }: ApiWarmupProviderProps) {
  const { warmupApisBackground, status, minutesSinceWarmup } = useApiWarmup({
    autoWarmup: false,
    warmupOnChatNavigation: true,
    debug: process.env.NODE_ENV === 'development'
  });

  // Warm up APIs on component mount with a delay to let the app settle
  useEffect(() => {
    const timer = setTimeout(() => {
      warmupApisBackground();
    }, 3000); // 3 second delay to let the app fully load

    return () => clearTimeout(timer);
  }, []); // Removed warmupApisBackground dependency to prevent re-runs

  // Development logging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && status.lastWarmupTime) {
      console.log(`[API Warmup] Last warmup: ${minutesSinceWarmup} minutes ago`);
    }
  }, [status.lastWarmupTime, minutesSinceWarmup]);

  return <>{children}</>;
} 