import { generateUUID } from '@/utils/crypto';

// Log levels in order of severity
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

// Log categories for filtering and organization
export enum LogCategory {
  AUTHENTICATION = 'auth',
  API = 'api',
  UI = 'ui',
  PERFORMANCE = 'performance',
  ERROR = 'error',
  USER_ACTION = 'user_action',
  SYSTEM = 'system',
  SECURITY = 'security',
  DATA = 'data'
}

// Structured log entry interface
export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  context?: Record<string, any>;
  correlationId?: string;
  sessionId?: string;
  userId?: string;
  organizationId?: string;
  page?: string;
  component?: string;
  stack?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

// Performance timing interface
export interface PerformanceTiming {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

// Logger configuration
interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableRemote: boolean;
  enableStorage: boolean;
  maxStorageEntries: number;
  remoteEndpoint?: string;
  environment: 'development' | 'production' | 'staging';
  correlationIdHeader: string;
}

class LoggingService {
  private config: LoggerConfig;
  private currentContext: Record<string, any> = {};
  private correlationId: string = '';
  private sessionId: string = '';
  private storageKey = 'qig-logs';
  private performanceTimers: Map<string, PerformanceTiming> = new Map();

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      minLevel: LogLevel.DEBUG,
      enableConsole: true,
      enableRemote: false,
      enableStorage: true,
      maxStorageEntries: 1000,
      environment: process.env.NODE_ENV as any || 'development',
      correlationIdHeader: 'X-Correlation-ID',
      ...config
    };

    // Generate initial session ID
    this.sessionId = generateUUID();
    
    // Set up global error tracking
    this.setupGlobalErrorTracking();

    // Clean up old logs on initialization
    this.cleanupOldLogs();
  }

  // Set global context that applies to all logs
  setContext(context: Record<string, any>): void {
    this.currentContext = { ...this.currentContext, ...context };
  }

  // Update specific context field
  updateContext(key: string, value: any): void {
    this.currentContext[key] = value;
  }

  // Clear context
  clearContext(): void {
    this.currentContext = {};
  }

  // Set correlation ID for request tracking
  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  // Generate new correlation ID
  generateCorrelationId(): string {
    const id = generateUUID();
    this.setCorrelationId(id);
    return id;
  }

  // Core logging method
  private log(
    level: LogLevel, 
    category: LogCategory, 
    message: string, 
    context?: Record<string, any>,
    metadata?: Record<string, any>
  ): string {
    // Check if we should log at this level
    if (level < this.config.minLevel) {
      return '';
    }

    const logId = generateUUID();
    const timestamp = new Date().toISOString();

    const entry: LogEntry = {
      id: logId,
      timestamp,
      level,
      category,
      message,
      context: { ...this.currentContext, ...context },
      correlationId: this.correlationId,
      sessionId: this.sessionId,
      metadata
    };

    // Add stack trace for errors
    if (level >= LogLevel.ERROR) {
      entry.stack = new Error().stack;
    }

    // Output to console in development
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // Store locally for debugging
    if (this.config.enableStorage) {
      this.storeLog(entry);
    }

    // Send to remote logging service
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      this.sendToRemote(entry);
    }

    return logId;
  }

  // Public logging methods
  debug(message: string, context?: Record<string, any>, metadata?: Record<string, any>): string {
    return this.log(LogLevel.DEBUG, LogCategory.SYSTEM, message, context, metadata);
  }

  info(message: string, context?: Record<string, any>, metadata?: Record<string, any>): string {
    return this.log(LogLevel.INFO, LogCategory.SYSTEM, message, context, metadata);
  }

  warn(message: string, context?: Record<string, any>, metadata?: Record<string, any>): string {
    return this.log(LogLevel.WARN, LogCategory.SYSTEM, message, context, metadata);
  }

  error(message: string, context?: Record<string, any>, metadata?: Record<string, any>): string {
    return this.log(LogLevel.ERROR, LogCategory.ERROR, message, context, metadata);
  }

  critical(message: string, context?: Record<string, any>, metadata?: Record<string, any>): string {
    return this.log(LogLevel.CRITICAL, LogCategory.ERROR, message, context, metadata);
  }

  // Category-specific logging methods
  auth(message: string, context?: Record<string, any>): string {
    return this.log(LogLevel.INFO, LogCategory.AUTHENTICATION, message, context);
  }

  api(message: string, context?: Record<string, any>, metadata?: Record<string, any>): string {
    return this.log(LogLevel.INFO, LogCategory.API, message, context, metadata);
  }

  performance(message: string, context?: Record<string, any>, metadata?: Record<string, any>): string {
    return this.log(LogLevel.INFO, LogCategory.PERFORMANCE, message, context, metadata);
  }

  userAction(message: string, context?: Record<string, any>): string {
    return this.log(LogLevel.INFO, LogCategory.USER_ACTION, message, context);
  }

  security(message: string, context?: Record<string, any>): string {
    return this.log(LogLevel.WARN, LogCategory.SECURITY, message, context);
  }

  // Performance timing methods
  startTimer(operation: string): string {
    const timerId = this.generateCorrelationId();
    this.performanceTimers.set(timerId, {
      operation,
      startTime: performance.now()
    });
    return timerId;
  }

  endTimer(timerId: string, additionalContext?: Record<string, any>): void {
    const timer = this.performanceTimers.get(timerId);
    if (timer) {
      const duration = performance.now() - timer.startTime;
      this.performance(timer.operation, {
        duration: Math.round(duration),
        timerId,
        ...additionalContext
      });
      this.performanceTimers.delete(timerId);
    }
  }

  // Track API calls specifically for performance monitoring
  trackApiCall(method: string, endpoint: string, duration: number, statusCode: number, error?: string): void {
    const context = {
      method,
      endpoint,
      duration,
      statusCode,
      timestamp: new Date().toISOString(),
      error
    };

    if (statusCode >= 400) {
      this.error(`${method} ${endpoint} ${statusCode} in ${duration}ms`, context);
    } else {
      this.api(`${method} ${endpoint} ${statusCode} in ${duration}ms`, context);
    }
  }

  // API call logging helper
  logApiCall(
    endpoint: string, 
    method: string, 
    statusCode: number, 
    duration: number,
    requestData?: any,
    responseData?: any,
    error?: any
  ): string {
    const level = statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    const context = {
      endpoint,
      method,
      statusCode,
      duration,
      success: statusCode < 400
    };

    const metadata = {
      request: requestData,
      response: responseData,
      error: error?.message
    };

    return this.log(level, LogCategory.API, 
      `API ${method} ${endpoint} - ${statusCode} (${duration}ms)`, 
      context, metadata);
  }

  // Error boundary integration
  logErrorBoundary(
    error: Error, 
    errorInfo: any, 
    component: string, 
    level: 'critical' | 'page' | 'component' = 'component'
  ): string {
    return this.log(
      level === 'critical' ? LogLevel.CRITICAL : LogLevel.ERROR,
      LogCategory.ERROR,
      `Error boundary caught: ${error.message}`,
      {
        component,
        boundaryLevel: level,
        errorName: error.name,
        componentStack: errorInfo.componentStack
      },
      {
        errorStack: error.stack,
        errorInfo
      }
    );
  }

  // Console output with nice formatting
  private logToConsole(entry: LogEntry): void {
    const levelNames = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'];
    const levelColors = ['#888', '#007acc', '#ff8c00', '#dc3545', '#8b0000'];
    
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const level = levelNames[entry.level];
    const color = levelColors[entry.level];

    if (this.config.environment === 'development') {
      // Rich console formatting for development
      console.groupCollapsed(
        `%c[${timestamp}] %c${level} %c${entry.category} %c${entry.message}`,
        'color: #666; font-size: 11px',
        `color: ${color}; font-weight: bold`,
        'color: #0066cc; font-weight: bold',
        'color: #333'
      );
      
      if (entry.context && Object.keys(entry.context).length > 0) {
        console.log('Context:', entry.context);
      }
      
      if (entry.metadata && Object.keys(entry.metadata).length > 0) {
        console.log('Metadata:', entry.metadata);
      }
      
      if (entry.correlationId) {
        console.log('Correlation ID:', entry.correlationId);
      }
      
      if (entry.stack && entry.level >= LogLevel.ERROR) {
        console.log('Stack:', entry.stack);
      }
      
      console.groupEnd();
    } else {
      // Simple JSON output for production
      const consoleMethod = entry.level >= LogLevel.ERROR ? 'error' : 
                           entry.level >= LogLevel.WARN ? 'warn' : 'log';
      console[consoleMethod](JSON.stringify(entry));
    }
  }

  // Store log in localStorage
  private storeLog(entry: LogEntry): void {
    // Only store in browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      let logs: LogEntry[] = stored ? JSON.parse(stored) : [];
      
      logs.push(entry);
      
      // Keep only recent logs
      if (logs.length > this.config.maxStorageEntries) {
        logs = logs.slice(-this.config.maxStorageEntries);
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(logs));
    } catch (error) {
      // Storage failed - don't log this to avoid infinite loop
      console.warn('Failed to store log entry:', error);
    }
  }

  // Send to remote logging service
  private async sendToRemote(entry: LogEntry): Promise<void> {
    try {
      if (!this.config.remoteEndpoint) return;

      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          [this.config.correlationIdHeader]: entry.correlationId || ''
        },
        body: JSON.stringify(entry)
      });
    } catch (error) {
      // Remote logging failed - don't log this to avoid infinite loop
      console.warn('Failed to send log to remote service:', error);
    }
  }

  // Set up global error tracking
  private setupGlobalErrorTracking(): void {
    // Only set up in browser environment
    if (typeof window === 'undefined') return;
    
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.critical('Unhandled promise rejection', {
        reason: event.reason,
        promise: event.promise
      });
    });

    // Catch global errors
    window.addEventListener('error', (event) => {
      this.critical('Global error caught', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.message
      });
    });
  }

  // Clean up old logs
  private cleanupOldLogs(): void {
    // Only cleanup in browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return;

      const logs: LogEntry[] = JSON.parse(stored);
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      const recentLogs = logs.filter(log => 
        new Date(log.timestamp).getTime() > oneWeekAgo
      );
      
      if (recentLogs.length !== logs.length) {
        localStorage.setItem(this.storageKey, JSON.stringify(recentLogs));
      }
    } catch (error) {
      console.warn('Failed to cleanup old logs:', error);
    }
  }

  // Get stored logs for debugging
  getStoredLogs(): LogEntry[] {
    // Return empty array in SSR
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to retrieve stored logs:', error);
      return [];
    }
  }

  // Clear stored logs
  clearStoredLogs(): void {
    // Only clear in browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn('Failed to clear stored logs:', error);
    }
  }

  // Export logs for debugging
  exportLogs(): string {
    const logs = this.getStoredLogs();
    return JSON.stringify(logs, null, 2);
  }

  // Get logging statistics
  getStats(): Record<string, any> {
    const logs = this.getStoredLogs();
    const stats = {
      totalLogs: logs.length,
      byLevel: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      timeRange: {
        oldest: logs.length > 0 ? logs[0].timestamp : null,
        newest: logs.length > 0 ? logs[logs.length - 1].timestamp : null
      },
      errorRate: 0,
      averagesByCategory: {} as Record<string, number>
    };

    logs.forEach(log => {
      // Count by level
      const levelName = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'CRITICAL'][log.level];
      stats.byLevel[levelName] = (stats.byLevel[levelName] || 0) + 1;
      
      // Count by category
      stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
    });

    // Calculate error rate
    const errorCount = (stats.byLevel.ERROR || 0) + (stats.byLevel.CRITICAL || 0);
    stats.errorRate = logs.length > 0 ? (errorCount / logs.length) * 100 : 0;

    return stats;
  }
}

// Create singleton instance
const loggingService = new LoggingService();

// Export singleton and class
export { loggingService, LoggingService }; 