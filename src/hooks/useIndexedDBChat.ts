'use client';

import { useState, useEffect, useCallback } from 'react';
import { indexedDBChatService, ChatSession, ChatMessage } from '@/services/indexedDBChatService';
import { ChatHistoryMigration, MigrationResult } from '@/services/chatHistoryMigration';

interface ChatState {
  sessions: ChatSession[];
  activeSession: ChatSession | null;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

interface MigrationState {
  isNeeded: boolean;
  isInProgress: boolean;
  result: MigrationResult | null;
}

export const useIndexedDBChat = () => {
  const [chatState, setChatState] = useState<ChatState>({
    sessions: [],
    activeSession: null,
    messages: [],
    isLoading: true,
    error: null
  });

  const [migrationState, setMigrationState] = useState<MigrationState>({
    isNeeded: false,
    isInProgress: false,
    result: null
  });

  // Initialize and check for migration
  useEffect(() => {
    const initialize = async () => {
      try {
        setChatState(prev => ({ ...prev, isLoading: true, error: null }));

        // Check if migration is needed
        const needsMigration = ChatHistoryMigration.hasLocalStorageData();
        setMigrationState(prev => ({ ...prev, isNeeded: needsMigration }));

        // Load existing sessions from IndexedDB
        const sessions = await indexedDBChatService.getAllSessions();
        const activeSession = await indexedDBChatService.getActiveSession();

        setChatState(prev => ({
          ...prev,
          sessions,
          activeSession,
          isLoading: false
        }));

        // Load messages for active session
        if (activeSession) {
          const messages = await indexedDBChatService.getMessages(activeSession.id);
          setChatState(prev => ({ ...prev, messages }));
        }

      } catch (error) {
        setChatState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to initialize chat'
        }));
      }
    };

    initialize();
  }, []);

  // Migration functions
  const runMigration = useCallback(async (): Promise<MigrationResult> => {
    setMigrationState(prev => ({ ...prev, isInProgress: true }));
    
    try {
      const result = await ChatHistoryMigration.migrateFromLocalStorage();
      setMigrationState(prev => ({
        ...prev,
        isInProgress: false,
        isNeeded: false,
        result
      }));

      // Reload sessions after successful migration
      if (result.success && result.migratedSessions > 0) {
        const sessions = await indexedDBChatService.getAllSessions();
        setChatState(prev => ({ ...prev, sessions }));
      }

      return result;
    } catch (error) {
      const failedResult: MigrationResult = {
        success: false,
        migratedSessions: 0,
        migratedMessages: 0,
        errors: [error instanceof Error ? error.message : 'Migration failed']
      };

      setMigrationState(prev => ({
        ...prev,
        isInProgress: false,
        result: failedResult
      }));

      return failedResult;
    }
  }, []);

  // Session management
  const createSession = useCallback(async (title?: string): Promise<ChatSession | null> => {
    try {
      const session = await indexedDBChatService.createSession(title);
      setChatState(prev => ({
        ...prev,
        sessions: [session, ...prev.sessions],
        activeSession: session,
        messages: []
      }));
      return session;
    } catch (error) {
      setChatState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create session'
      }));
      return null;
    }
  }, []);

  const selectSession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const session = await indexedDBChatService.getSession(sessionId);
      if (!session) return false;

      const messages = await indexedDBChatService.getMessages(sessionId);
      indexedDBChatService.setActiveSession(sessionId);

      setChatState(prev => ({
        ...prev,
        activeSession: session,
        messages
      }));

      return true;
    } catch (error) {
      setChatState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to select session'
      }));
      return false;
    }
  }, []);

  const updateSessionTitle = useCallback(async (sessionId: string, title: string): Promise<boolean> => {
    try {
      const success = await indexedDBChatService.updateSessionTitle(sessionId, title);
      if (success) {
        setChatState(prev => ({
          ...prev,
          sessions: prev.sessions.map(s => 
            s.id === sessionId ? { ...s, title } : s
          ),
          activeSession: prev.activeSession?.id === sessionId 
            ? { ...prev.activeSession, title }
            : prev.activeSession
        }));
      }
      return success;
    } catch (error) {
      setChatState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update session title'
      }));
      return false;
    }
  }, []);

  const deleteSession = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const success = await indexedDBChatService.deleteSession(sessionId);
      if (success) {
        setChatState(prev => {
          const updatedSessions = prev.sessions.filter(s => s.id !== sessionId);
          let newActiveSession = prev.activeSession;
          let newMessages = prev.messages;

          // If we deleted the active session, select another one
          if (prev.activeSession?.id === sessionId) {
            newActiveSession = updatedSessions.length > 0 ? updatedSessions[0] : null;
            newMessages = [];
            
            // Load messages for new active session
            if (newActiveSession) {
              indexedDBChatService.getMessages(newActiveSession.id).then(messages => {
                setChatState(current => ({ ...current, messages }));
              });
              indexedDBChatService.setActiveSession(newActiveSession.id);
            }
          }

          return {
            ...prev,
            sessions: updatedSessions,
            activeSession: newActiveSession,
            messages: newMessages
          };
        });
      }
      return success;
    } catch (error) {
      setChatState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to delete session'
      }));
      return false;
    }
  }, []);

  // Message management
  const addMessage = useCallback(async (
    message: Omit<ChatMessage, 'id' | 'sessionId'>
  ): Promise<boolean> => {
    if (!chatState.activeSession) return false;

    try {
      const success = await indexedDBChatService.addMessage(chatState.activeSession.id, message);
      if (success) {
        const messageWithSessionId: ChatMessage = {
          ...message,
          sessionId: chatState.activeSession.id,
          timestamp: message.timestamp || new Date().toISOString()
        };

        setChatState(prev => ({
          ...prev,
          messages: [...prev.messages, messageWithSessionId],
          sessions: prev.sessions.map(s => 
            s.id === prev.activeSession?.id 
              ? { ...s, messageCount: s.messageCount + 1, updatedAt: new Date().toISOString() }
              : s
          )
        }));
      }
      return success;
    } catch (error) {
      setChatState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to add message'
      }));
      return false;
    }
  }, [chatState.activeSession]);

  const clearSessionMessages = useCallback(async (sessionId?: string): Promise<boolean> => {
    const targetSessionId = sessionId || chatState.activeSession?.id;
    if (!targetSessionId) return false;

    try {
      const success = await indexedDBChatService.clearSessionMessages(targetSessionId);
      if (success) {
        setChatState(prev => ({
          ...prev,
          messages: prev.activeSession?.id === targetSessionId ? [] : prev.messages,
          sessions: prev.sessions.map(s => 
            s.id === targetSessionId 
              ? { ...s, messageCount: 0, updatedAt: new Date().toISOString() }
              : s
          )
        }));
      }
      return success;
    } catch (error) {
      setChatState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to clear messages'
      }));
      return false;
    }
  }, [chatState.activeSession]);

  // Utility functions
  const getStorageStats = useCallback(async () => {
    try {
      return await indexedDBChatService.getStorageStats();
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return { sessionsCount: 0, messagesCount: 0, estimatedSize: '0KB' };
    }
  }, []);

  const cleanupOldSessions = useCallback(async (daysToKeep: number = 30): Promise<number> => {
    try {
      const deletedCount = await indexedDBChatService.cleanupOldSessions(daysToKeep);
      
      // Refresh sessions after cleanup
      const sessions = await indexedDBChatService.getAllSessions();
      setChatState(prev => ({ ...prev, sessions }));
      
      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup old sessions:', error);
      return 0;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setChatState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    ...chatState,
    migration: migrationState,

    // Actions
    runMigration,
    createSession,
    selectSession,
    updateSessionTitle,
    deleteSession,
    addMessage,
    clearSessionMessages,
    
    // Utilities
    getStorageStats,
    cleanupOldSessions,
    clearError
  };
}; 