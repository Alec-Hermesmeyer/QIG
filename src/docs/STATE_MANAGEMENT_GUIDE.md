# State Management & Loading Coordination

## Overview

This application now uses a centralized state management system to coordinate loading states, prevent instability, and provide better error handling across all components and providers.

## Architecture

### Core Components

1. **AppStateContext** (`/contexts/AppStateContext.tsx`)
   - Central state coordinator
   - Manages initialization phases
   - Handles global error states
   - Tracks performance metrics

2. **LoadingScreen** (`/components/LoadingScreen.tsx`)
   - Full-screen loading interface
   - Shows initialization progress
   - Handles error states with retry functionality

3. **SystemStatusIndicator** (`/components/SystemStatusIndicator.tsx`)
   - Corner status indicator for debugging
   - Shows current initialization state
   - Development performance metrics

### Initialization Phases

The system progresses through these phases in order:

1. **auth** - Authentication setup
2. **organization** - Workspace/organization loading
3. **chat** - Chat system initialization
4. **services** - Backend service connectivity
5. **warmup** - API warmup completion
6. **complete** - Fully initialized

## Key Features

### Loading State Coordination
- All providers report their loading state to the central coordinator
- Progress bar shows overall initialization progress
- Prevents race conditions between providers

### Error Handling
- Centralized error reporting and display
- Automatic retry functionality with exponential backoff
- Maximum retry limits to prevent infinite loops
- Component-level error isolation

### Performance Monitoring
- Track initialization timing for each phase
- Development metrics for optimization
- Real-time performance feedback

## Usage

### For Component Developers

#### Registering Component State
```tsx
import { useComponentState } from '@/contexts/AppStateContext';

const MyComponent = () => {
  const { setComponentReady } = useComponentState('my-component');
  
  useEffect(() => {
    // When your component is ready
    setComponentReady(true);
  }, [setComponentReady]);
};
```

#### Reporting Errors
```tsx
import { useAppState } from '@/contexts/AppStateContext';

const MyComponent = () => {
  const { setError } = useAppState();
  
  const handleError = (error: Error) => {
    setError(error.message, 'my-component', true); // canRetry = true
  };
};
```

### For Provider Developers

#### Phase Management
```tsx
import { useAppState, useComponentState } from '@/contexts/AppStateContext';

const MyProvider = ({ children }) => {
  const { setLoadingPhase } = useAppState();
  const { setComponentReady } = useComponentState('my-phase');
  
  useEffect(() => {
    setLoadingPhase('my-phase', 'Initializing my service...');
    
    // Do initialization work
    initializeService()
      .then(() => setComponentReady(true))
      .catch(error => setError(error.message, 'my-provider'));
  }, []);
};
```

## Provider Integration

### Updated Providers

1. **AuthProvider** - Reports authentication state
2. **OrganizationSwitchProvider** - Reports workspace loading
3. **ChatProvider** - Reports chat system initialization
4. **ApiWarmupProvider** - Reports API warmup status
5. **ServiceMonitorWrapper** - Checks backend connectivity

### Integration Pattern

Each provider wrapper follows this pattern:
1. Register with the component state system
2. Set the appropriate loading phase
3. Perform initialization work
4. Report completion or errors
5. Clean up on unmount

## Benefits

### Stability
- Prevents UI flashing and layout shifts
- Coordinates loading states across components
- Reduces race conditions

### User Experience
- Clear progress indication
- Informative error messages
- Automatic retry functionality
- Smooth transitions between states

### Developer Experience
- Centralized error handling
- Performance monitoring
- Debug-friendly status indicators
- Consistent loading patterns

## Configuration

### Environment Variables
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_CLIENT_ID=your-client-id
NODE_ENV=development
```

### Customization

You can customize the initialization phases by modifying the `phaseOrder` array in `AppStateContext.tsx`:

```tsx
const phaseOrder: InitializationPhase[] = [
  'auth',
  'organization', 
  'chat',
  'services',
  'warmup',
  'complete'
];
```

## Troubleshooting

### Common Issues

1. **Stuck Loading**
   - Check console for component registration logs
   - Verify all providers are calling `setComponentReady(true)`
   - Check for unhandled errors in initialization

2. **Race Conditions**
   - Ensure proper dependency arrays in useEffect
   - Use refs for values that shouldn't trigger re-renders
   - Follow the established provider wrapper patterns

3. **Performance Issues**
   - Check initialization timing in development
   - Optimize slow providers
   - Consider lazy loading for non-critical components

### Debug Tools

- **System Status Indicator**: Shows real-time status in development
- **Console Logging**: Detailed phase transition logs
- **Performance Metrics**: Timing data for optimization
- **Error Reporting**: Centralized error tracking

## Migration Guide

### Updating Existing Providers

1. Wrap your provider with state integration:
```tsx
const MyProviderWrapper = ({ children }) => {
  const { setComponentReady } = useComponentState('my-provider');
  const { setError } = useAppState();
  
  return (
    <OriginalProvider>
      <StateReporter setComponentReady={setComponentReady} setError={setError}>
        {children}
      </StateReporter>
    </OriginalProvider>
  );
};
```

2. Report loading states and errors appropriately
3. Test initialization flow end-to-end

### Best Practices

- Always clean up in useEffect returns
- Use meaningful component IDs for registration
- Provide helpful error messages with retry options
- Test error scenarios and recovery paths
- Monitor performance impact of state changes

## Future Enhancements

- Offline state detection
- Background sync status
- Progressive loading hints
- Custom loading animations
- State persistence across sessions 