# Backend Chat Session Management Integration

This document explains how to integrate and use the backend chat session management system with your frontend.

## Overview

Your backend provides the following chat session management endpoints:
- `GET /api/chat-sessions/sessions` - List user's chat sessions
- `POST /api/chat-sessions/sessions` - Create new chat session
- `GET /api/chat-sessions/sessions/:sessionId/messages` - Get messages for a session
- `POST /api/chat-sessions/sessions/:sessionId/messages` - Add message to session
- `PUT /api/chat-sessions/sessions/:sessionId` - Update session (rename)
- `DELETE /api/chat-sessions/sessions/:sessionId` - Delete session

## Frontend Integration Components

### 1. Backend Chat Session Service (`/services/backendChatSessionService.ts`)
Core service that interfaces with your backend endpoints.

### 2. React Hook (`/hooks/useBackendChatSessions.ts`)
Provides React state management for backend chat sessions.

### 3. Provider Component (`/components/BackendChatProvider.tsx`)
React context provider that wraps your app with backend chat functionality.

### 4. Unified Storage Provider (`/components/ChatStorage/ChatStorageProvider.tsx`)
Allows switching between IndexedDB (local) and backend storage.

## Setup

### Environment Variables
Add to your `.env.local` file:

```bash
# Backend URL for chat session management
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Chat storage type: 'backend' or 'indexeddb'
NEXT_PUBLIC_CHAT_STORAGE_TYPE=backend
```

**Note**: Your app is now configured to use backend storage by default. The deep-rag page will automatically use your backend chat session management!

### Basic Usage

#### Option 1: Use Backend Chat Provider Directly

```tsx
import { BackendChatProvider, useBackendChatContext } from '@/components/BackendChatProvider';

function MyApp() {
  return (
    <BackendChatProvider>
      <MyChatComponent />
    </BackendChatProvider>
  );
}

function MyChatComponent() {
  const {
    sessions,
    activeSession,
    messages,
    createSession,
    selectSession,
    addMessage,
    updateSessionTitle,
    deleteSession,
  } = useBackendChatContext();

  // Use the chat functionality...
}
```

#### Option 2: Use Unified Storage Provider (Recommended)

```tsx
import { ChatStorageProvider, useUnifiedChatContext, StorageSwitcher } from '@/components/ChatStorage/ChatStorageProvider';

function MyApp() {
  return (
    <ChatStorageProvider defaultConfig={{ storageType: 'backend' }}>
      <MyChatComponent />
    </ChatStorageProvider>
  );
}

function MyChatComponent() {
  const {
    sessions,
    activeSession,
    messages,
    createSession,
    selectSession,
    addMessage,
    // ... all the same methods work regardless of storage type
  } = useUnifiedChatContext();

  return (
    <div>
      {/* Optional: Add storage switcher */}
      <StorageSwitcher />
      
      {/* Your chat UI */}
    </div>
  );
}
```

## Demo Page

Visit `/backend-chat` to see a full working demo of the backend chat session management.

## Existing Page Integration

### Deep RAG Page Integration

To integrate with your existing deep-rag page, update the provider:

```tsx
// In your app layout or deep-rag page
import { ChatStorageProvider } from '@/components/ChatStorage/ChatStorageProvider';

// Wrap your existing page content
<ChatStorageProvider defaultConfig={{ storageType: 'backend' }}>
  {/* Your existing deep-rag page content */}
</ChatStorageProvider>
```

Then in your deep-rag page, replace:
```tsx
import { useChatContext } from '@/components/ChatProvider';
```

With:
```tsx
import { useUnifiedChatContext as useChatContext } from '@/components/ChatStorage/ChatStorageProvider';
```

This maintains compatibility while adding backend support.

## API Interface

### Session Management
```typescript
// Create new session
const session = await createSession({ title: 'My Chat' });

// Select/load session
await selectSession(sessionId);

// Update session title
await updateSessionTitle(sessionId, 'New Title');

// Delete session
await deleteSession(sessionId);
```

### Message Management
```typescript
// Add user message
await addMessage({
  role: 'user',
  content: 'Hello!',
  timestamp: new Date().toISOString(),
});

// Add assistant message with metadata
await addMessage({
  role: 'assistant',
  content: 'Hi there!',
  timestamp: new Date().toISOString(),
  metadata: { /* any additional data */ }
});
```

## Data Types

### BackendChatSession
```typescript
interface BackendChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}
```

### BackendChatMessage
```typescript
interface BackendChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: any;
}
```

## Error Handling

The integration includes comprehensive error handling:

```typescript
const {
  error,
  clearError,
  isLoading
} = useBackendChatContext();

if (error) {
  console.error('Chat error:', error);
  // Handle error in UI
}
```

## Migration from IndexedDB

The unified provider allows you to switch between storage types without changing your component code. Users can migrate their data using the existing migration tools, or you can maintain both storage options.

## Authentication

The backend service automatically includes credentials in requests. Ensure your backend:

1. Supports CORS for your frontend domain
2. Handles authentication/authorization for chat sessions
3. Associates sessions with the correct user ID

## Testing

Test the integration:

1. Start your backend server with chat session endpoints
2. Set `NEXT_PUBLIC_BACKEND_URL` to your backend URL
3. Visit `/backend-chat` to test all functionality
4. Check browser network tab to verify API calls

## Production Considerations

1. **Environment Variables**: Set `NEXT_PUBLIC_BACKEND_URL` to your production backend
2. **Authentication**: Ensure backend properly authenticates users
3. **Error Handling**: Implement proper error boundaries in your UI
4. **Performance**: Consider pagination for large session lists
5. **Caching**: Backend responses are not cached; implement caching if needed

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure backend allows requests from your frontend domain
2. **Authentication Errors**: Check that backend receives proper auth credentials
3. **Network Errors**: Verify `NEXT_PUBLIC_BACKEND_URL` is correct
4. **Type Errors**: Ensure backend response format matches TypeScript interfaces

### Debug Mode

Enable debug logging in the service:

```typescript
// In backendChatSessionService.ts, add console.log statements
// Or use browser dev tools to monitor network requests
``` 