'use client';

import { useEffect } from 'react';
import { useApiWarmup } from '@/hooks/useApiWarmup';

interface ApiWarmupProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that handles API warmup initialization
 * 
 * This component:
 * 1. Automatically warms up APIs when the app loads
 * 2. Provides background warmup functionality
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

  // Periodic warmup check - temporarily disabled to prevent loops
  /*
  useEffect(() => {
    const interval = setInterval(() => {
      // Only warm up if it's been more than 5 minutes since last warmup
      if (minutesSinceWarmup === null || minutesSinceWarmup >= 5) {
        warmupApisBackground();
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [warmupApisBackground, minutesSinceWarmup]);
  */

  // Development logging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && status.lastWarmupTime) {
      console.log(`[API Warmup] Last warmup: ${minutesSinceWarmup} minutes ago`);
    }
  }, [status.lastWarmupTime, minutesSinceWarmup]);

  return <>{children}</>;
} 