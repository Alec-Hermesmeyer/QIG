# Comprehensive Logging System

## Overview

The comprehensive logging system provides structured, contextual logging throughout the QIG application with multiple output targets, correlation tracking, and performance monitoring.

## Features

### ✅ Core Logging Service
- **5 Log Levels**: DEBUG, INFO, WARN, ERROR, CRITICAL
- **9 Categories**: AUTH, API, UI, PERFORMANCE, ERROR, USER_ACTION, SYSTEM, SECURITY, DATA
- **Structured Context**: User, organization, page, component tracking
- **Correlation IDs**: Request tracing across systems
- **Multiple Outputs**: Console (dev), localStorage (debug), remote endpoint (prod)

### ✅ Auto Context Tracking
- **User Context**: Automatic user ID and email tracking
- **Organization Context**: Active organization tracking
- **Page Context**: Automatic page navigation tracking
- **Session Context**: Persistent session IDs
- **Performance Context**: Page load and navigation timing

### ✅ Error Boundary Integration
- **Error Correlation**: Link errors to specific log entries
- **Context Preservation**: Full component and user context
- **Recovery Tracking**: Retry attempts and success rates
- **Debug Support**: Log export and error history

### ✅ API Call Logging
- **Automatic Timing**: Start to finish request timing
- **Correlation Headers**: X-Correlation-ID header injection
- **Retry Logic**: Exponential backoff with logging
- **Request/Response**: Optional request/response body logging
- **Error Handling**: Structured error logging with context

### ✅ Performance Monitoring
- **Component Timing**: Render performance tracking
- **Operation Timing**: Custom operation measurement
- **Page Session Tracking**: Time spent on each page
- **API Performance**: Request duration and success rates

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Components                    │
├─────────────────────────────────────────────────────────────┤
│  LoggingProvider (Context + Auto-tracking)                  │
├─────────────────────────────────────────────────────────────┤
│  useLogging() │ useApiLogging() │ usePerformanceLogging()   │
├─────────────────────────────────────────────────────────────┤
│                   LoggingService (Core)                     │
├─────────────────────────────────────────────────────────────┤
│  Console     │  localStorage    │  Remote Endpoint          │
│  (Dev)       │  (Debug)         │  (Production)            │
└─────────────────────────────────────────────────────────────┘
```

## Implementation

### 1. Core Service (`loggingService.ts`)

```typescript
import { loggingService, LogLevel, LogCategory } from '@/services/loggingService';

// Basic logging
loggingService.info('User logged in', { userId: '123' });
loggingService.error('API call failed', { endpoint: '/api/data' });

// Category-specific logging
loggingService.auth('Authentication successful');
loggingService.api('API request completed');
loggingService.performance('Page load completed');

// Performance timing
const timerId = loggingService.startTimer('data-processing');
// ... do work ...
const duration = loggingService.endTimer(timerId);

// Context management
loggingService.setContext({ userId: '123', orgId: '456' });
loggingService.updateContext('page', '/dashboard');
```

### 2. React Context (`LoggingProvider`)

```typescript
import { LoggingProvider, useLogging } from '@/contexts/LoggingContext';

// In your app root
<LoggingProvider>
  <YourApp />
</LoggingProvider>

// In components
function MyComponent() {
  const { logUserAction, generateCorrelationId } = useLogging();
  
  const handleClick = () => {
    logUserAction('Button clicked', { buttonId: 'submit' });
  };
}
```

### 3. API Logging Hook (`useApiLogging`)

```typescript
import { useApiLogging } from '@/hooks/useApiLogging';

function MyComponent() {
  const { loggedFetch, post } = useApiLogging();
  
  const fetchData = async () => {
    try {
      // Automatic logging with correlation IDs
      const response = await loggedFetch('/api/data');
      const data = await response.json();
    } catch (error) {
      // Error automatically logged with context
    }
  };
  
  const submitData = async () => {
    // POST with automatic logging
    const response = await post('/api/submit', { data: 'value' });
  };
}
```

### 4. Error Boundary Integration

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Automatic error logging with correlation
<ErrorBoundary level="page" context="user-dashboard">
  <UserDashboard />
</ErrorBoundary>

// Logs include:
// - Error details and stack trace
// - User and organization context
// - Page and component context
// - Correlation ID for tracking
// - Retry attempt history
```

### 5. Performance Monitoring

```typescript
import { usePerformanceLogging } from '@/hooks/useApiLogging';

function MyComponent() {
  const { measureComponent, measureOperation } = usePerformanceLogging();
  
  useEffect(() => {
    const endMeasure = measureComponent('MyComponent');
    return endMeasure; // Called on unmount
  }, []);
  
  const processData = async () => {
    const endTimer = measureOperation('data-processing');
    // ... do work ...
    endTimer({ dataSize: data.length });
  };
}
```

## Configuration

### Development Mode
- **Rich Console Logging**: Grouped, colored output with context
- **Full Request/Response**: Complete API call logging
- **Component Stack Traces**: Detailed error information
- **localStorage Storage**: Debug history available

### Production Mode  
- **JSON Output**: Structured logs for log aggregation
- **Remote Endpoints**: Send to monitoring services
- **Minimal Context**: Sensitive data filtering
- **Error Reporting**: Automatic critical error reporting

### Log Levels
```typescript
enum LogLevel {
  DEBUG = 0,    // Development debugging
  INFO = 1,     // General information
  WARN = 2,     // Warning conditions
  ERROR = 3,    // Error conditions
  CRITICAL = 4  // Critical failures
}
```

### Categories
```typescript
enum LogCategory {
  AUTHENTICATION = 'auth',    // Login/logout/session
  API = 'api',               // API requests/responses
  UI = 'ui',                 // User interface events
  PERFORMANCE = 'performance', // Timing and metrics
  ERROR = 'error',           // Error conditions
  USER_ACTION = 'user_action', // User interactions
  SYSTEM = 'system',         // System events
  SECURITY = 'security',     // Security events
  DATA = 'data'              // Data operations
}
```

## Log Structure

```json
{
  "id": "log_abc123",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "level": 1,
  "category": "api",
  "message": "API GET /api/data completed successfully",
  "context": {
    "userId": "user_123",
    "organizationId": "org_456", 
    "page": "/dashboard",
    "endpoint": "/api/data",
    "method": "GET",
    "statusCode": 200,
    "duration": 450
  },
  "correlationId": "corr_xyz789",
  "sessionId": "sess_abc123",
  "metadata": {
    "requestData": null,
    "responseSize": 1024
  }
}
```

## Correlation ID Flow

1. **Request Initiated**: Generate correlation ID
2. **Header Injection**: Add `X-Correlation-ID` header
3. **Context Tracking**: Associate with all related logs
4. **Error Linking**: Connect errors to original request
5. **Cross-Service**: Track through multiple API calls

## Browser DevTools Integration

### Console Output (Development)
```
[12:34:56] INFO api Starting GET request to /api/data
  Context: { userId: "123", page: "/dashboard" }
  Correlation ID: corr_abc123
  
[12:34:56] INFO api API GET /api/data completed successfully  
  Context: { duration: 450, statusCode: 200 }
  Correlation ID: corr_abc123
```

### localStorage Debug Storage
- Last 1000 log entries stored locally
- Automatic cleanup after 1 week
- Export functionality for debugging
- Search and filter capabilities

### Error Boundary Integration
- Copy error details to clipboard
- Download full log history
- Error correlation tracking
- Retry attempt monitoring

## Best Practices

### 1. Context Management
```typescript
// Set global context early
loggingService.setContext({
  userId: user.id,
  organizationId: org.id
});

// Update context as needed
loggingService.updateContext('page', '/new-page');

// Component-specific context
const { setPageContext } = useLogging();
setPageContext('/dashboard', 'UserProfile');
```

### 2. Correlation IDs
```typescript
// Generate for API calls
const { generateCorrelationId } = useLogging();
const correlationId = generateCorrelationId();

// Use in fetch headers
fetch('/api/data', {
  headers: { 'X-Correlation-ID': correlationId }
});

// Link related operations
loggingService.info('Processing started', { correlationId });
```

### 3. Performance Monitoring
```typescript
// Component performance
useEffect(() => {
  const endMeasure = measureComponent('ExpensiveComponent');
  return endMeasure;
}, []);

// Operation timing
const processData = async () => {
  const timerId = loggingService.startTimer('data-processing');
  try {
    // ... processing ...
    loggingService.endTimer(timerId, { recordsProcessed: data.length });
  } catch (error) {
    loggingService.endTimer(timerId, { error: error.message });
    throw error;
  }
};
```

### 4. Error Handling
```typescript
// Structured error logging
try {
  await riskyOperation();
} catch (error) {
  loggingService.error('Operation failed', {
    operation: 'riskyOperation',
    userId: user.id,
    attempt: attemptNumber
  }, {
    errorStack: error.stack,
    errorMessage: error.message
  });
  
  throw error;
}
```

## Debugging Tools

### 1. Log Retrieval
```typescript
// Get all stored logs
const logs = loggingService.getStoredLogs();

// Export for analysis
const exportData = loggingService.exportLogs();

// Get statistics
const stats = loggingService.getStats();
```

### 2. Filter and Search
```typescript
// Filter by level
const errors = logs.filter(log => log.level >= LogLevel.ERROR);

// Filter by category
const apiLogs = logs.filter(log => log.category === LogCategory.API);

// Filter by correlation ID
const relatedLogs = logs.filter(log => log.correlationId === 'corr_123');
```

### 3. Performance Analysis
```typescript
// API performance
const apiStats = stats.byCategory.api;
const averageApiTime = apiStats.averageDuration;

// Error rates
const errorRate = stats.errorRate; // Percentage

// Time analysis
const timeRange = stats.timeRange;
```

## Integration Points

### 1. Error Boundaries
- Automatic error correlation
- Context preservation
- Recovery tracking
- Debug information export

### 2. API Services
- Request/response logging
- Performance monitoring
- Error tracking
- Correlation ID injection

### 3. User Actions
- Click tracking
- Navigation monitoring
- Form submissions
- Performance metrics

### 4. System Events
- Authentication flows
- Data operations
- Security events
- System errors

## Monitoring Integration

### Remote Endpoints
```typescript
const loggingService = new LoggingService({
  enableRemote: true,
  remoteEndpoint: 'https://logs.example.com/api/logs',
  environment: 'production'
});
```

### Log Aggregation
- Compatible with ELK stack
- Supports Datadog integration  
- Works with Splunk
- Custom endpoint support

### Alerting
- Critical error detection
- Performance threshold alerts
- Error rate monitoring
- Custom metric alerts

## Testing

### Unit Tests
```typescript
import { loggingService } from '@/services/loggingService';

describe('LoggingService', () => {
  it('should log with correlation ID', () => {
    const correlationId = loggingService.generateCorrelationId();
    const logId = loggingService.info('Test message');
    
    const logs = loggingService.getStoredLogs();
    const log = logs.find(l => l.id === logId);
    
    expect(log?.correlationId).toBe(correlationId);
  });
});
```

### Integration Tests
```typescript
import { useApiLogging } from '@/hooks/useApiLogging';

describe('API Logging', () => {
  it('should add correlation headers', async () => {
    const { loggedFetch } = useApiLogging();
    
    // Mock fetch to check headers
    const mockFetch = jest.fn();
    global.fetch = mockFetch;
    
    await loggedFetch('/api/test');
    
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Correlation-ID': expect.any(String)
        })
      })
    );
  });
});
```

## Security Considerations

### 1. Data Filtering
- Remove sensitive data from logs
- Mask PII information
- Filter authentication tokens
- Sanitize user inputs

### 2. Storage Security
- Encrypt remote log transmission
- Secure localStorage access
- Log retention policies
- Access controls

### 3. Privacy Compliance
- GDPR compliance for EU users
- User consent tracking
- Data anonymization
- Right to deletion

## Performance Impact

### Overhead Analysis
- **Console Logging**: ~0.1ms per log entry
- **localStorage Storage**: ~1-2ms per entry
- **Remote Transmission**: Async, no blocking
- **Context Tracking**: Minimal React overhead

### Optimization Strategies
- Lazy log formatting
- Batch remote transmission
- Configurable log levels
- Optional request/response logging

## Future Enhancements

### Phase 3 Considerations
1. **Real-time Dashboards**: Live log monitoring
2. **Advanced Analytics**: Log pattern analysis
3. **AI-Powered Insights**: Automated issue detection
4. **Performance Baselines**: Regression detection
5. **User Journey Tracking**: End-to-end flows 