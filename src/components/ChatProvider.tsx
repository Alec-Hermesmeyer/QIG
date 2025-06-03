'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useIndexedDBChat } from '@/hooks/useIndexedDBChat';
import { MigrationPrompt } from './MigrationPrompt';
import { ChatSession, ChatMessage } from '@/services/indexedDBChatService';

interface ChatContextType {
  // Session state
  sessions: ChatSession[];
  activeSession: ChatSession | null;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;

  // Session actions
  createSession: (title?: string) => Promise<ChatSession | null>;
  selectSession: (sessionId: string) => Promise<boolean>;
  updateSessionTitle: (sessionId: string, title: string) => Promise<boolean>;
  deleteSession: (sessionId: string) => Promise<boolean>;

  // Message actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'sessionId'>) => Promise<boolean>;
  clearSessionMessages: (sessionId?: string) => Promise<boolean>;

  // UI state
  showChatHistory: boolean;
  setShowChatHistory: (show: boolean) => void;

  // Utilities
  getStorageStats: () => Promise<{ sessionsCount: number; messagesCount: number; estimatedSize: string }>;
  cleanupOldSessions: (daysToKeep?: number) => Promise<number>;
  clearError: () => void;
}

// Default context value for SSR
const defaultContextValue: ChatContextType = {
  sessions: [],
  activeSession: null,
  messages: [],
  isLoading: false,
  error: null,
  createSession: async () => null,
  selectSession: async () => false,
  updateSessionTitle: async () => false,
  deleteSession: async () => false,
  addMessage: async () => false,
  clearSessionMessages: async () => false,
  showChatHistory: false,
  setShowChatHistory: () => {},
  getStorageStats: async () => ({ sessionsCount: 0, messagesCount: 0, estimatedSize: '0 B' }),
  cleanupOldSessions: async () => 0,
  clearError: () => {}
};

const ChatContext = createContext<ChatContextType>(defaultContextValue);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  return context;
};

interface ChatProviderProps {
  children: React.ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // During SSR or before client hydration, provide default context
  if (!isClient) {
    return (
      <ChatContext.Provider value={defaultContextValue}>
        {children}
      </ChatContext.Provider>
    );
  }

  return <ChatProviderInner>{children}</ChatProviderInner>;
};

const ChatProviderInner: React.FC<ChatProviderProps> = ({ children }) => {
  const {
    sessions,
    activeSession,
    messages,
    isLoading,
    error,
    migration,
    runMigration,
    createSession,
    selectSession,
    updateSessionTitle,
    deleteSession,
    addMessage,
    clearSessionMessages,
    getStorageStats,
    cleanupOldSessions,
    clearError
  } = useIndexedDBChat();

  const [showChatHistory, setShowChatHistory] = useState(false);
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);

  // Auto-show migration prompt if needed
  useEffect(() => {
    if (migration.isNeeded && !migration.result) {
      setShowMigrationPrompt(true);
    }
  }, [migration.isNeeded, migration.result]);

  // Enhanced createSession that creates session if none exists
  const enhancedCreateSession = useCallback(async (title?: string): Promise<ChatSession | null> => {
    const session = await createSession(title);
    if (session) {
      setShowChatHistory(false); // Close history panel when creating new session
    }
    return session;
  }, [createSession]);

  // Enhanced selectSession that closes history panel
  const enhancedSelectSession = useCallback(async (sessionId: string): Promise<boolean> => {
    const success = await selectSession(sessionId);
    if (success) {
      setShowChatHistory(false);
    }
    return success;
  }, [selectSession]);

  // Auto-create session if none exists when adding a message
  const enhancedAddMessage = useCallback(async (message: Omit<ChatMessage, 'id' | 'sessionId'>): Promise<boolean> => {
    let currentSession = activeSession;
    
    // If no active session, create one
    if (!currentSession) {
      currentSession = await createSession();
      if (!currentSession) {
        return false;
      }
    }

    return await addMessage(message);
  }, [activeSession, createSession, addMessage]);

  const contextValue: ChatContextType = {
    // Session state
    sessions,
    activeSession,
    messages,
    isLoading,
    error,

    // Session actions
    createSession: enhancedCreateSession,
    selectSession: enhancedSelectSession,
    updateSessionTitle,
    deleteSession,

    // Message actions
    addMessage: enhancedAddMessage,
    clearSessionMessages,

    // UI state
    showChatHistory,
    setShowChatHistory,

    // Utilities
    getStorageStats,
    cleanupOldSessions,
    clearError
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
      
      {/* Migration Prompt */}
      <MigrationPrompt
        isVisible={showMigrationPrompt}
        onMigrate={runMigration}
        onDismiss={() => setShowMigrationPrompt(false)}
        isInProgress={migration.isInProgress}
      />
    </ChatContext.Provider>
  );
}; 