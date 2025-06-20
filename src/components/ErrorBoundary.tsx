'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'page' | 'component' | 'critical';
  context?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

/**
 * Centralized Error Boundary Component
 * 
 * Provides systematic error handling with:
 * - Automatic error logging and reporting
 * - Context-aware fallback UIs
 * - Error recovery mechanisms
 * - Development vs production behavior
 * 
 * @example
 * ```tsx
 * <ErrorBoundary level="page" context="admin-dashboard">
 *   <AdminDashboard />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error with context
    this.logError(error, errorInfo);
    
    // Update state with error info
    this.setState({
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Centralized error logging with structured data
   */
  private logError(error: Error, errorInfo: ErrorInfo) {
    const errorData = {
      errorId: this.state.errorId,
      timestamp: new Date().toISOString(),
      level: this.props.level || 'component',
      context: this.props.context || 'unknown',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      errorInfo: {
        componentStack: errorInfo.componentStack
      },
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'SSR',
      url: typeof window !== 'undefined' ? window.location.href : 'SSR',
      retryCount: this.retryCount
    };

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Boundary Caught Error [${this.props.level}]`);
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Context:', this.props.context);
      console.error('Full Error Data:', errorData);
      console.groupEnd();
    }

    // Production logging - send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to monitoring service (e.g., Sentry, LogRocket, etc.)
      console.error('[ERROR_BOUNDARY]', JSON.stringify(errorData));
    }

    // Store in localStorage for debugging
    try {
      const errorHistory = JSON.parse(localStorage.getItem('qig_error_history') || '[]');
      errorHistory.unshift(errorData);
      // Keep only last 10 errors
      if (errorHistory.length > 10) {
        errorHistory.splice(10);
      }
      localStorage.setItem('qig_error_history', JSON.stringify(errorHistory));
    } catch (e) {
      console.warn('Failed to store error in localStorage:', e);
    }
  }

  /**
   * Attempt to recover from error by re-rendering
   */
  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null
      });
    }
  };

  /**
   * Navigate to home page as last resort
   */
  private handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  /**
   * Report bug to development team
   */
  private handleReportBug = () => {
    const errorData = {
      errorId: this.state.errorId,
      error: this.state.error?.message,
      context: this.props.context,
      stack: this.state.error?.stack
    };

    // In a real app, this would open a bug report form or send to issue tracker
    console.log('Bug report data:', errorData);
    
    // For now, copy to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(JSON.stringify(errorData, null, 2));
      alert('Error details copied to clipboard');
    }
  };

  private renderFallbackUI() {
    const { level = 'component', context } = this.props;
    const { error, errorId } = this.state;
    const canRetry = this.retryCount < this.maxRetries;

    // Custom fallback if provided
    if (this.props.fallback) {
      return this.props.fallback;
    }

    // Different UIs based on error level
    switch (level) {
      case 'critical':
        return (
          <div className="min-h-screen flex items-center justify-center bg-red-50">
            <Card className="w-full max-w-md mx-4 border-red-200">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <CardTitle className="text-red-800">Critical Error</CardTitle>
                <CardDescription className="text-red-600">
                  The application encountered a critical error and cannot continue.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">
                  <strong>Error ID:</strong> {errorId}<br />
                  <strong>Context:</strong> {context}<br />
                  <strong>Message:</strong> {error?.message}
                </div>
                <div className="flex flex-col gap-2">
                  <Button onClick={this.handleGoHome} className="w-full">
                    <Home className="w-4 h-4 mr-2" />
                    Return to Home
                  </Button>
                  <Button onClick={this.handleReportBug} variant="outline" className="w-full">
                    <Bug className="w-4 h-4 mr-2" />
                    Report Bug
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'page':
        return (
          <div className="min-h-96 flex items-center justify-center p-8">
            <Card className="w-full max-w-lg">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle className="text-orange-800">Page Error</CardTitle>
                <CardDescription>
                  This page encountered an error. You can try refreshing or return to the home page.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {process.env.NODE_ENV === 'development' && (
                  <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded border">
                    <strong>Error:</strong> {error?.message}<br />
                    <strong>Context:</strong> {context}
                  </div>
                )}
                <div className="flex gap-2">
                  {canRetry && (
                    <Button onClick={this.handleRetry} variant="default" className="flex-1">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again ({this.maxRetries - this.retryCount} left)
                    </Button>
                  )}
                  <Button onClick={this.handleGoHome} variant="outline" className="flex-1">
                    <Home className="w-4 h-4 mr-2" />
                    Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'component':
      default:
        return (
          <div className="border border-red-200 bg-red-50 rounded-lg p-4 my-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-red-800">
                  Component Error
                </h3>
                <p className="text-sm text-red-600 mt-1">
                  A component in {context || 'this section'} failed to render.
                </p>
                {process.env.NODE_ENV === 'development' && (
                  <p className="text-xs text-red-500 mt-2 font-mono">
                    {error?.message}
                  </p>
                )}
                {canRetry && (
                  <Button 
                    onClick={this.handleRetry} 
                    size="sm" 
                    variant="outline" 
                    className="mt-3 text-red-700 border-red-200 hover:bg-red-100"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
    }
  }

  render() {
    if (this.state.hasError) {
      return this.renderFallbackUI();
    }

    return this.props.children;
  }
}

/**
 * Hook for error boundary integration in functional components
 */
export function useErrorHandler() {
  return (error: Error, context?: string) => {
    // This will be caught by the nearest error boundary
    throw error;
  };
}

/**
 * Higher-order component for automatic error boundary wrapping
 */
export function withErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: T) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
} 