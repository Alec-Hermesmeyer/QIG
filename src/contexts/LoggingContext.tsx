'use client';

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useOrganizationSwitch } from '@/contexts/OrganizationSwitchContext';
import { useRouter, usePathname } from 'next/navigation';
import { loggingService } from '@/services/loggingService';

interface LoggingContextValue {
  logUserAction: (action: string, context?: Record<string, any>) => void;
  logPageView: (page: string, metadata?: Record<string, any>) => void;
  logPerformance: (operation: string, duration: number, context?: Record<string, any>) => void;
  generateCorrelationId: () => string;
  setPageContext: (page: string, component?: string) => void;
}

const LoggingContext = createContext<LoggingContextValue | undefined>(undefined);

export function LoggingProvider({ children }: { children: React.ReactNode }) {
  const { user, organization } = useAuth();
  const { activeOrganization } = useOrganizationSwitch();
  const pathname = usePathname();
  const router = useRouter();
  
  // Track page navigation timing
  const pageStartTime = useRef<number>(Date.now());
  const currentPage = useRef<string>('');

  // Update logging context when user/org changes
  useEffect(() => {
    const context = {
      userId: user?.id,
      userEmail: user?.email,
      organizationId: organization?.id || activeOrganization?.id,
      organizationName: organization?.name || activeOrganization?.name,
      page: pathname
    };

    loggingService.setContext(context);

    // Log context changes
    if (user) {
      loggingService.auth('User context updated', {
        userId: user.id,
        organizationId: context.organizationId,
        organizationName: context.organizationName
      });
    }
  }, [user, organization, activeOrganization, pathname]);

  // Track page navigation
  useEffect(() => {
    const startTime = Date.now();
    
    // Log previous page duration if we have one
    if (currentPage.current && currentPage.current !== pathname) {
      const previousDuration = startTime - pageStartTime.current;
      loggingService.performance('Page session completed', {
        page: currentPage.current,
        duration: previousDuration,
        nextPage: pathname
      });
    }

    // Set new page context
    currentPage.current = pathname;
    pageStartTime.current = startTime;
    
    // Update context and log page view
    loggingService.updateContext('page', pathname);
    loggingService.userAction('Page viewed', { 
      page: pathname,
      timestamp: new Date().toISOString()
    });

  }, [pathname]);

  // Generate correlation ID for requests
  const generateCorrelationId = (): string => {
    return loggingService.generateCorrelationId();
  };

  // Log user actions
  const logUserAction = (action: string, context?: Record<string, any>): void => {
    loggingService.userAction(action, {
      page: pathname,
      timestamp: new Date().toISOString(),
      ...context
    });
  };

  // Log page views with metadata
  const logPageView = (page: string, metadata?: Record<string, any>): void => {
    loggingService.userAction('Page view', {
      page,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      ...metadata
    });
  };

  // Log performance metrics
  const logPerformance = (operation: string, duration: number, context?: Record<string, any>): void => {
    loggingService.performance(`Performance: ${operation}`, {
      operation,
      duration,
      page: pathname,
      ...context
    });
  };

  // Set page/component context
  const setPageContext = (page: string, component?: string): void => {
    loggingService.updateContext('page', page);
    if (component) {
      loggingService.updateContext('component', component);
    }
  };

  const value: LoggingContextValue = {
    logUserAction,
    logPageView,
    logPerformance,
    generateCorrelationId,
    setPageContext
  };

  return (
    <LoggingContext.Provider value={value}>
      {children}
    </LoggingContext.Provider>
  );
}

// Hook to use logging context
export function useLogging(): LoggingContextValue {
  const context = useContext(LoggingContext);
  if (context === undefined) {
    throw new Error('useLogging must be used within a LoggingProvider');
  }
  return context;
}

// Direct access to logging service for advanced usage
export { loggingService }; 