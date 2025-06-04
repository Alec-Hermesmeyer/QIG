'use client';

import { useCallback } from 'react';
import { loggingService } from '@/services/loggingService';
import { useLogging } from '@/contexts/LoggingContext';

interface ApiCallOptions {
  method?: string;
  body?: any;
  headers?: HeadersInit;
  timeout?: number;
  retries?: number;
  logRequest?: boolean;
  logResponse?: boolean;
}

interface ApiLogContext {
  endpoint: string;
  method: string;
  correlationId: string;
  startTime: number;
  requestData?: any;
  metadata?: Record<string, any>;
}

export function useApiLogging() {
  const { generateCorrelationId } = useLogging();

  const loggedFetch = useCallback(async (
    url: string, 
    options: ApiCallOptions = {}
  ): Promise<Response> => {
    const {
      method = 'GET',
      body,
      headers = {},
      timeout = 30000,
      retries = 0,
      logRequest = true,
      logResponse = true
    } = options;

    // Generate correlation ID and set up context
    const correlationId = generateCorrelationId();
    const startTime = performance.now();
    
    const context: ApiLogContext = {
      endpoint: url,
      method,
      correlationId,
      startTime,
      requestData: body,
      metadata: {
        timeout,
        retries,
        userAgent: navigator.userAgent
      }
    };

    // Add correlation ID to headers
    const requestHeaders: HeadersInit = {
      'X-Correlation-ID': correlationId,
      ...headers
    };

    // Log request start
    if (logRequest) {
      loggingService.api(`Starting ${method} request to ${url}`, {
        endpoint: url,
        method,
        correlationId,
        hasBody: !!body,
        bodySize: body ? JSON.stringify(body).length : 0
      }, {
        headers: requestHeaders,
        requestData: body
      });
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= retries) {
      try {
        // Make the API call
        const response = await fetch(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        const duration = performance.now() - startTime;

        // Determine response data for logging
        let responseData = null;
        if (logResponse && response.headers.get('content-type')?.includes('application/json')) {
          try {
            responseData = await response.clone().json();
          } catch (e) {
            // Ignore JSON parsing errors for logging
          }
        }

        // Log the API call result
        loggingService.logApiCall(
          url,
          method,
          response.status,
          duration,
          logRequest ? body : undefined,
          logResponse ? responseData : undefined
        );

        // Log success with additional context
        if (response.ok) {
          loggingService.api(`${method} ${url} completed successfully`, {
            endpoint: url,
            method,
            statusCode: response.status,
            duration,
            correlationId,
            attempt: attempt + 1,
            success: true
          });
        } else {
          loggingService.error(`${method} ${url} failed with ${response.status}`, {
            endpoint: url,
            method,
            statusCode: response.status,
            statusText: response.statusText,
            duration,
            correlationId,
            attempt: attempt + 1,
            success: false
          }, {
            responseData
          });
        }

        return response;

      } catch (error) {
        lastError = error as Error;
        attempt++;
        
        const duration = performance.now() - startTime;
        
        if (attempt <= retries) {
          // Log retry attempt
          loggingService.warn(`${method} ${url} failed, retrying (${attempt}/${retries})`, {
            endpoint: url,
            method,
            correlationId,
            attempt,
            retries,
            duration,
            error: lastError.message
          });
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        } else {
          // Log final failure
          clearTimeout(timeoutId);
          
          loggingService.error(`${method} ${url} failed after ${retries + 1} attempts`, {
            endpoint: url,
            method,
            correlationId,
            totalAttempts: attempt,
            duration,
            error: lastError.message,
            success: false
          }, {
            errorStack: lastError.stack,
            requestData: body
          });
        }
      }
    }

    // If we get here, all retries failed
    throw lastError;
  }, [generateCorrelationId]);

  // Convenience methods for different HTTP verbs
  const get = useCallback((url: string, options?: Omit<ApiCallOptions, 'method'>) => 
    loggedFetch(url, { ...options, method: 'GET' }), [loggedFetch]);

  const post = useCallback((url: string, data?: any, options?: Omit<ApiCallOptions, 'method' | 'body'>) => 
    loggedFetch(url, { ...options, method: 'POST', body: data }), [loggedFetch]);

  const put = useCallback((url: string, data?: any, options?: Omit<ApiCallOptions, 'method' | 'body'>) => 
    loggedFetch(url, { ...options, method: 'PUT', body: data }), [loggedFetch]);

  const del = useCallback((url: string, options?: Omit<ApiCallOptions, 'method'>) => 
    loggedFetch(url, { ...options, method: 'DELETE' }), [loggedFetch]);

  const patch = useCallback((url: string, data?: any, options?: Omit<ApiCallOptions, 'method' | 'body'>) => 
    loggedFetch(url, { ...options, method: 'PATCH', body: data }), [loggedFetch]);

  return {
    loggedFetch,
    get,
    post,
    put,
    delete: del,
    patch
  };
}

// Performance timing hook for components
export function usePerformanceLogging() {
  const { logPerformance } = useLogging();

  const measureComponent = useCallback((componentName: string) => {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      logPerformance(`Component render: ${componentName}`, duration, {
        component: componentName
      });
    };
  }, [logPerformance]);

  const measureOperation = useCallback((operationName: string) => {
    const timerId = loggingService.startTimer(operationName);
    
    return (additionalContext?: Record<string, any>) => {
      return loggingService.endTimer(timerId, additionalContext);
    };
  }, []);

  return {
    measureComponent,
    measureOperation
  };
}

export default useApiLogging; 