'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  backendChatSessionService, 
  BackendChatSession, 
  BackendChatMessage,
  CreateSessionRequest,
  CreateMessageRequest,
  UpdateSessionRequest
} from '@/services/backendChatSessionService';

interface UseBackendChatSessionsState {
  sessions: BackendChatSession[];
  activeSession: BackendChatSession | null;
  messages: BackendChatMessage[];
  isLoading: boolean;
  error: string | null;
}

interface UseBackendChatSessionsReturn extends UseBackendChatSessionsState {
  // Session management
  loadSessions: () => Promise<void>;
  createSession: (data?: CreateSessionRequest) => Promise<BackendChatSession | null>;
  selectSession: (sessionId: string) => Promise<boolean>;
  updateSessionTitle: (sessionId: string, title: string) => Promise<boolean>;
  deleteSession: (sessionId: string) => Promise<boolean>;
  
  // Message management
  loadMessages: (sessionId: string) => Promise<void>;
  addMessage: (sessionId: string, message: CreateMessageRequest) => Promise<BackendChatMessage | null>;
  
  // Utility functions
  refreshActiveSession: () => Promise<void>;
  clearError: () => void;
}

export const useBackendChatSessions = (): UseBackendChatSessionsReturn => {
  const [state, setState] = useState<UseBackendChatSessionsState>({
    sessions: [],
    activeSession: null,
    messages: [],
    isLoading: false,
    error: null,
  });

  // Helper to update state safely
  const updateState = useCallback((updates: Partial<UseBackendChatSessionsState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Error handling helper
  const handleError = useCallback((error: unknown, action: string) => {
    const errorMessage = error instanceof Error ? error.message : `Failed to ${action}`;
    console.error(`Backend chat session error (${action}):`, error);
    updateState({ error: errorMessage, isLoading: false });
  }, [updateState]);

  // Load all sessions
  const loadSessions = useCallback(async () => {
    try {
      updateState({ isLoading: true, error: null });
      const sessions = await backendChatSessionService.getSessions();
      
      // Ensure sessions is always an array
      const safeSessions = Array.isArray(sessions) ? sessions : [];
      console.log('📋 Loaded sessions:', safeSessions.length, 'sessions');
      
      updateState({ sessions: safeSessions, isLoading: false });
    } catch (error) {
      console.error('❌ Failed to load sessions:', error);
      // Set empty array on error to prevent UI crashes
      updateState({ sessions: [], isLoading: false });
      handleError(error, 'load sessions');
    }
  }, [updateState, handleError]);

  // Create new session
  const createSession = useCallback(async (data: CreateSessionRequest = {}): Promise<BackendChatSession | null> => {
    try {
      console.log('🔄 useBackendChatSessions: Creating session with data:', data);
      updateState({ isLoading: true, error: null });
      const session = await backendChatSessionService.createSession(data);
      
      console.log('✅ useBackendChatSessions: Session created:', {
        session,
        sessionId: session?.id,
        sessionKeys: Object.keys(session || {}),
        hasId: !!session?.id
      });
      
      if (!session) {
        console.error('❌ useBackendChatSessions: createSession returned null/undefined');
        updateState({ isLoading: false, error: 'Failed to create session' });
        return null;
      }
      
      if (!session.id) {
        console.error('❌ useBackendChatSessions: Session created but has no ID!', {
          session,
          sessionKeys: Object.keys(session)
        });
        updateState({ isLoading: false, error: 'Session created without ID' });
        return null;
      }
      
      setState(prev => ({
        ...prev,
        sessions: [session, ...prev.sessions],
        activeSession: session,
        messages: [],
        isLoading: false
      }));
      
      console.log('✅ useBackendChatSessions: State updated with new active session:', session.id);
      
      return session;
    } catch (error) {
      console.error('❌ useBackendChatSessions: Create session failed:', error);
      handleError(error, 'create session');
      return null;
    }
  }, [updateState, handleError]);

  // Select and load a session
  const selectSession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      console.log('🔄 useBackendChatSessions: Selecting session:', sessionId);
      updateState({ isLoading: true, error: null });
      
      const session = state.sessions.find(s => s.id === sessionId);
      if (!session) {
        console.error('❌ useBackendChatSessions: Session not found in sessions list:', sessionId);
        throw new Error(`Session ${sessionId} not found`);
      }

      console.log('✅ useBackendChatSessions: Session found, loading messages...');
      const messages = await backendChatSessionService.getMessages(sessionId);
      
      updateState({
        activeSession: session,
        messages,
        isLoading: false
      });
      
      console.log('✅ useBackendChatSessions: Session selected and messages loaded:', session.id);
      
      return true;
    } catch (error) {
      console.error('❌ useBackendChatSessions: Select session failed:', error);
      handleError(error, 'select session');
      return false;
    }
  }, [state.sessions, updateState, handleError]);

  // Update session title
  const updateSessionTitle = useCallback(async (sessionId: string, title: string): Promise<boolean> => {
    try {
      updateState({ error: null });
      
      const updatedSession = await backendChatSessionService.updateSession(sessionId, { title });
      
      setState(prev => ({
        ...prev,
        sessions: prev.sessions.map(s => s.id === sessionId ? updatedSession : s),
        activeSession: prev.activeSession?.id === sessionId ? updatedSession : prev.activeSession
      }));
      
      return true;
    } catch (error) {
      handleError(error, 'update session title');
      return false;
    }
  }, [updateState, handleError]);

  // Delete session
  const deleteSession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      updateState({ error: null });
      
      await backendChatSessionService.deleteSession(sessionId);
      
      setState(prev => {
        const newSessions = prev.sessions.filter(s => s.id !== sessionId);
        let newActiveSession = prev.activeSession;
        let newMessages = prev.messages;

        // If we deleted the active session, clear it or select another
        if (prev.activeSession?.id === sessionId) {
          newActiveSession = newSessions.length > 0 ? newSessions[0] : null;
          newMessages = [];
          
          // Auto-load messages for new active session
          if (newActiveSession) {
            backendChatSessionService.getMessages(newActiveSession.id).then(messages => {
              updateState({ messages });
            });
          }
        }

        return {
          ...prev,
          sessions: newSessions,
          activeSession: newActiveSession,
          messages: newMessages
        };
      });
      
      return true;
    } catch (error) {
      handleError(error, 'delete session');
      return false;
    }
  }, [updateState, handleError]);

  // Load messages for current session
  const loadMessages = useCallback(async (sessionId: string) => {
    try {
      updateState({ isLoading: true, error: null });
      const messages = await backendChatSessionService.getMessages(sessionId);
      updateState({ messages, isLoading: false });
    } catch (error) {
      handleError(error, 'load messages');
    }
  }, [updateState, handleError]);

  // Add message to session
  const addMessage = useCallback(async (
    sessionId: string, 
    messageData: CreateMessageRequest
  ): Promise<BackendChatMessage | null> => {
    try {
      updateState({ error: null });
      
      const message = await backendChatSessionService.addMessage(sessionId, messageData);
      
      // Update messages if this is for the active session
      if (state.activeSession?.id === sessionId) {
        setState(prev => ({
          ...prev,
          messages: [...prev.messages, message]
        }));
      }
      
      return message;
    } catch (error) {
      handleError(error, 'add message');
      return null;
    }
  }, [state.activeSession, updateState, handleError]);

  // Refresh the active session and its messages
  const refreshActiveSession = useCallback(async () => {
    if (state.activeSession) {
      await loadMessages(state.activeSession.id);
    }
  }, [state.activeSession, loadMessages]);

  // Clear error
  const clearError = useCallback(() => {
    updateState({ error: null });
  }, [updateState]);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return {
    // State
    ...state,
    
    // Actions
    loadSessions,
    createSession,
    selectSession,
    updateSessionTitle,
    deleteSession,
    loadMessages,
    addMessage,
    refreshActiveSession,
    clearError,
  };
}; 