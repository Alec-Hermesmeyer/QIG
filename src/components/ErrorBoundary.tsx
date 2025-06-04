'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Copy, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { loggingService } from '@/services/loggingService';

interface Props {
  children: ReactNode;
  level?: 'critical' | 'page' | 'component';
  context?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
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
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Generate correlation ID for this error
    const correlationId = loggingService.generateCorrelationId();
    
    // Log the error with comprehensive context
    const errorId = loggingService.logErrorBoundary(
      error,
      errorInfo,
      this.props.context || 'unknown',
      this.props.level
    );

    // Log additional error context
    loggingService.error('Error boundary activated', {
      errorId,
      correlationId,
      component: this.props.context,
      level: this.props.level,
      retryCount: this.state.retryCount,
      errorName: error.name,
      errorMessage: error.message,
      componentStack: errorInfo.componentStack,
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      timestamp: new Date().toISOString()
    }, {
      errorStack: error.stack,
      props: this.props,
      state: this.state,
      errorInfo
    });

    // Store error for debugging
    this.storeErrorLocally(error, errorInfo, errorId, correlationId);

    this.setState({
      errorInfo,
      errorId,
      retryCount: this.state.retryCount + 1
    });

    // Report critical errors
    if (this.props.level === 'critical') {
      this.reportCriticalError(error, errorInfo, errorId, correlationId);
    }
  }

  private storeErrorLocally(error: Error, errorInfo: ErrorInfo, errorId: string, correlationId: string) {
    try {
      const errorData = {
        id: errorId,
        correlationId,
        timestamp: new Date().toISOString(),
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        errorInfo,
        context: this.props.context,
        level: this.props.level,
        url: window.location.href,
        userAgent: navigator.userAgent,
        retryCount: this.state.retryCount
      };

      const errors = JSON.parse(localStorage.getItem('qig-error-history') || '[]');
      errors.push(errorData);
      
      // Keep only last 50 errors
      if (errors.length > 50) {
        errors.splice(0, errors.length - 50);
      }
      
      localStorage.setItem('qig-error-history', JSON.stringify(errors));
    } catch (e) {
      console.warn('Failed to store error locally:', e);
    }
  }

  private async reportCriticalError(error: Error, errorInfo: ErrorInfo, errorId: string, correlationId: string) {
    try {
      // In a real app, this would send to an error reporting service
      loggingService.critical('Critical error reported', {
        errorId,
        correlationId,
        component: this.props.context,
        errorName: error.name,
        errorMessage: error.message
      });
    } catch (e) {
      loggingService.error('Failed to report critical error', { 
        originalErrorId: errorId,
        reportingError: e 
      });
    }
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      loggingService.info('Error boundary retry attempt', {
        errorId: this.state.errorId,
        retryCount: this.state.retryCount + 1,
        maxRetries: this.maxRetries,
        component: this.props.context
      });

      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null
      });
    }
  };

  private handleGoHome = () => {
    loggingService.userAction('Error boundary - navigate home', {
      errorId: this.state.errorId,
      component: this.props.context,
      level: this.props.level
    });
    
    window.location.href = '/';
  };

  private handleReportBug = () => {
    loggingService.userAction('Error boundary - report bug', {
      errorId: this.state.errorId,
      component: this.props.context
    });

    const errorData = {
      errorId: this.state.errorId,
      component: this.props.context,
      level: this.props.level,
      error: this.state.error?.message,
      stack: this.state.error?.stack,
      url: window.location.href,
      timestamp: new Date().toISOString()
    };

    // Copy error details to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorData, null, 2));
    
    // In a real app, open bug reporting form or mailto
    alert('Error details copied to clipboard. Please report this to support.');
  };

  private handleCopyError = () => {
    loggingService.userAction('Error boundary - copy error details', {
      errorId: this.state.errorId
    });

    const errorText = `Error ID: ${this.state.errorId}\nComponent: ${this.props.context}\nError: ${this.state.error?.message}\nStack: ${this.state.error?.stack}`;
    navigator.clipboard.writeText(errorText);
  };

  private handleDownloadLogs = () => {
    loggingService.userAction('Error boundary - download logs', {
      errorId: this.state.errorId
    });

    const logs = loggingService.exportLogs();
    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qig-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const canRetry = this.state.retryCount < this.maxRetries;
      const isCritical = this.props.level === 'critical';

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${isCritical ? 'bg-red-100' : 'bg-yellow-100'}`}>
                  <AlertTriangle className={`w-6 h-6 ${isCritical ? 'text-red-600' : 'text-yellow-600'}`} />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {isCritical ? 'Critical Error' : 'Something went wrong'}
                  </CardTitle>
                  <CardDescription>
                    {this.props.context ? `Error in ${this.props.context}` : 'An unexpected error occurred'}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Error Level Badge */}
              <div className="flex items-center space-x-2">
                <Badge variant={isCritical ? 'destructive' : 'secondary'}>
                  {this.props.level?.toUpperCase() || 'UNKNOWN'}
                </Badge>
                {this.state.errorId && (
                  <Badge variant="outline" className="font-mono text-xs">
                    ID: {this.state.errorId.slice(0, 8)}
                  </Badge>
                )}
              </div>

              {/* Error Message */}
              {this.state.error && (
                <Alert>
                  <AlertDescription className="text-sm">
                    <strong>Error:</strong> {this.state.error.message}
                  </AlertDescription>
                </Alert>
              )}

              {/* Retry Information */}
              {this.state.retryCount > 0 && (
                <Alert>
                  <AlertDescription className="text-sm">
                    This error has occurred {this.state.retryCount} time{this.state.retryCount > 1 ? 's' : ''}.
                    {canRetry && ` You can try ${this.maxRetries - this.state.retryCount} more time${this.maxRetries - this.state.retryCount > 1 ? 's' : ''}.`}
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col space-y-2">
                {canRetry && (
                  <Button onClick={this.handleRetry} className="w-full">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                )}
                
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={this.handleGoHome} variant="outline">
                    <Home className="w-4 h-4 mr-2" />
                    Go Home
                  </Button>
                  
                  <Button onClick={this.handleReportBug} variant="outline">
                    <Bug className="w-4 h-4 mr-2" />
                    Report Bug
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={this.handleCopyError} variant="ghost" size="sm">
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Error
                  </Button>
                  
                  <Button onClick={this.handleDownloadLogs} variant="ghost" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Download Logs
                  </Button>
                </div>
              </div>

              {/* Development Info */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium">
                    Development Details
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
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