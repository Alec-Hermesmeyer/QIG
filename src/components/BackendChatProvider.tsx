'use client';

import React, { createContext, useContext, useCallback } from 'react';
import { useBackendChatSessions } from '@/hooks/useBackendChatSessions';
import { BackendChatSession, BackendChatMessage, CreateSessionRequest } from '@/services/backendChatSessionService';

// Adapted interface to match existing ChatContext structure
interface BackendChatContextType {
  // Session state
  sessions: BackendChatSession[];
  activeSession: BackendChatSession | null;
  messages: BackendChatMessage[];
  isLoading: boolean;
  error: string | null;

  // Session actions
  createSession: (title?: string) => Promise<BackendChatSession | null>;
  selectSession: (sessionId: string) => Promise<boolean>;
  updateSessionTitle: (sessionId: string, title: string) => Promise<boolean>;
  deleteSession: (sessionId: string) => Promise<boolean>;

  // Message actions
  addMessage: (message: Omit<BackendChatMessage, 'id' | 'sessionId'>) => Promise<boolean>;
  clearSessionMessages: (sessionId?: string) => Promise<boolean>;

  // UI state
  showChatHistory: boolean;
  setShowChatHistory: (show: boolean) => void;

  // Utilities
  refreshActiveSession: () => Promise<void>;
  clearError: () => void;
}

const BackendChatContext = createContext<BackendChatContextType | null>(null);

interface BackendChatProviderProps {
  children: React.ReactNode;
  showChatHistory?: boolean;
  onShowChatHistoryChange?: (show: boolean) => void;
}

export const BackendChatProvider: React.FC<BackendChatProviderProps> = ({ 
  children, 
  showChatHistory: externalShowChatHistory,
  onShowChatHistoryChange
}) => {
  const {
    sessions,
    activeSession,
    messages,
    isLoading,
    error,
    loadSessions,
    createSession: backendCreateSession,
    selectSession: backendSelectSession,
    updateSessionTitle: backendUpdateSessionTitle,
    deleteSession: backendDeleteSession,
    addMessage: backendAddMessage,
    refreshActiveSession,
    clearError,
  } = useBackendChatSessions();

  const [internalShowChatHistory, setInternalShowChatHistory] = React.useState(false);
  
  // Use external state if provided, otherwise use internal state
  const showChatHistory = externalShowChatHistory ?? internalShowChatHistory;
  const setShowChatHistory = onShowChatHistoryChange ?? setInternalShowChatHistory;

  // Enhanced createSession that creates session with optional title
  const createSession = useCallback(async (title?: string): Promise<BackendChatSession | null> => {
    console.log('🔄 BackendChatProvider: Creating session with title:', title);
    const sessionData: CreateSessionRequest = title ? { title } : {};
    const session = await backendCreateSession(sessionData);
    if (session) {
      console.log('✅ BackendChatProvider: Session created successfully:', {
        sessionId: session.id,
        title: session.title,
        hasId: !!session.id
      });
      setShowChatHistory(false); // Close history panel when creating new session
      
      // The useBackendChatSessions hook should automatically set this as active
      // No need to call selectSession again
    } else {
      console.error('❌ BackendChatProvider: Session creation returned null/undefined');
    }
    return session;
  }, [backendCreateSession, setShowChatHistory]);

  // Enhanced selectSession that closes history panel
  const selectSession = useCallback(async (sessionId: string): Promise<boolean> => {
    const success = await backendSelectSession(sessionId);
    if (success) {
      setShowChatHistory(false);
    }
    return success;
  }, [backendSelectSession, setShowChatHistory]);

  // Auto-create session if none exists when adding a message
  const addMessage = useCallback(async (
    message: Omit<BackendChatMessage, 'id' | 'sessionId'>
  ): Promise<boolean> => {
    console.log('🚀 BackendChatProvider.addMessage called with:', {
      messageRole: message.role,
      messagePreview: message.content.substring(0, 50) + '...'
    });
    
    let currentSession = activeSession;
    
    console.log('📝 Current state before adding message:', {
      hasActiveSession: !!currentSession,
      activeSessionId: currentSession?.id,
      messageRole: message.role,
      messagePreview: message.content.substring(0, 50) + '...',
      allSessionsCount: sessions.length,
      allSessions: sessions.map(s => ({ id: s.id, title: s.title }))
    });
    
    // If no active session OR current session has no ID, create one
    if (!currentSession || !currentSession.id) {
      console.log('🔄 No valid active session, creating new one...', {
        hasSession: !!currentSession,
        sessionId: currentSession?.id,
        reason: !currentSession ? 'no session' : 'session has no ID'
      });
      
      // Use the backend service directly to avoid state dependency
      console.log('🔄 Creating session directly via backend service...');
      currentSession = await backendCreateSession({});
      
      if (!currentSession) {
        console.error('❌ Failed to create new session via backend service');
        return false;
      }
      
      if (!currentSession.id) {
        console.error('❌ Created session has no ID!', {
          session: currentSession,
          sessionKeys: Object.keys(currentSession || {})
        });
        return false;
      }
      
      console.log('✅ Created new session for message:', currentSession.id);
      
      // The session was created but state hasn't updated yet - that's ok
      // We'll use the session object directly for this message
    }

    console.log('📤 Sending message to backend for session:', currentSession.id);
    
    try {
      const backendMessage = await backendAddMessage(currentSession.id, {
        role: message.role,
        content: message.content,
        metadata: message.metadata,
      });

      const success = backendMessage !== null;
      console.log('📝 Message save result:', success);
      
      return success;
    } catch (error) {
      console.error('❌ Failed to save message to backend:', error);
      return false;
    }
  }, [activeSession, backendCreateSession, backendAddMessage, sessions]);

  // Clear session messages (backend sessions don't support clearing messages separately)
  const clearSessionMessages = useCallback(async (sessionId?: string): Promise<boolean> => {
    // For backend sessions, we'd need to implement a clear messages endpoint
    // For now, we'll just return false to indicate this isn't supported
    console.warn('Clear session messages not implemented for backend sessions');
    return false;
  }, []);

  const contextValue: BackendChatContextType = {
    // Session state
    sessions,
    activeSession,
    messages,
    isLoading,
    error,

    // Session actions
    createSession,
    selectSession,
    updateSessionTitle: backendUpdateSessionTitle,
    deleteSession: backendDeleteSession,

    // Message actions
    addMessage,
    clearSessionMessages,

    // UI state
    showChatHistory,
    setShowChatHistory,

    // Utilities
    refreshActiveSession,
    clearError,
  };

  return (
    <BackendChatContext.Provider value={contextValue}>
      {children}
    </BackendChatContext.Provider>
  );
};

// Hook to use the backend chat context
export const useBackendChatContext = (): BackendChatContextType => {
  const context = useContext(BackendChatContext);
  if (!context) {
    throw new Error('useBackendChatContext must be used within a BackendChatProvider');
  }
  return context;
};

// Component to wrap your app with backend chat support
export const BackendChatWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <BackendChatProvider>
      {children}
    </BackendChatProvider>
  );
}; 