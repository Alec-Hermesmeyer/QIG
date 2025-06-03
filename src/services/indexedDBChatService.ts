'use client';

import { v4 as uuidv4 } from 'uuid';
import { SearchResults } from '@/types/groundx';

// Define interfaces for type safety
export interface ChatMessage {
  id?: string;
  sessionId?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  searchResults?: SearchResults;
  thoughts?: any;
  supportingContent?: any;
  enhancedResults?: any;
  documentExcerpts?: any[];
  result?: any;
  rawResponse?: any;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messageCount: number; // Track count for performance
  createdAt: string;
  updatedAt: string;
}

// IndexedDB configuration
const DB_NAME = 'ChatHistoryDB';
const DB_VERSION = 1;
const SESSIONS_STORE = 'sessions';
const MESSAGES_STORE = 'messages';

class IndexedDBChatService {
  private dbName = 'chatHistoryDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isClientSide = false;

  constructor() {
    // Only initialize on client side
    if (typeof window !== 'undefined') {
      this.isClientSide = true;
      this.initDB();
    }
  }

  private initDB(): Promise<IDBDatabase> | null {
    if (!this.isClientSide) return null;
    
    if (this.dbPromise) {
      return this.dbPromise;
    }
    
    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        // Don't reject, just return null to handle gracefully
        resolve(null as any);
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create sessions store
        if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
          const sessionsStore = db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
          sessionsStore.createIndex('userId', 'userId', { unique: false });
          sessionsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // Create messages store
        if (!db.objectStoreNames.contains(MESSAGES_STORE)) {
          const messagesStore = db.createObjectStore(MESSAGES_STORE, { keyPath: 'id', autoIncrement: true });
          messagesStore.createIndex('sessionId', 'sessionId', { unique: false });
          messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });

    return this.dbPromise;
  }

  // Get database instance
  private async getDB(): Promise<IDBDatabase | null> {
    if (!this.isClientSide) {
      return null;
    }
    
    if (!this.dbPromise) {
      const initResult = this.initDB();
      if (!initResult) return null;
      this.dbPromise = initResult;
    }
    
    return this.dbPromise;
  }

  // Generic method to perform IndexedDB operations
  async performDBOperation<T>(
    storeName: string,
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest
  ): Promise<T> {
    const db = await this.getDB();
    const transaction = db.transaction([storeName], mode);
    const store = transaction.objectStore(storeName);
    const request = operation(store);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Session management methods
  async createSession(title: string = 'New Chat', userId: string = 'default-user-id'): Promise<ChatSession> {
    const newSession: ChatSession = {
      id: uuidv4(),
      userId,
      title,
      messageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await this.performDBOperation<ChatSession>(
        SESSIONS_STORE,
        'readwrite',
        (store) => store.add(newSession)
      );

      // Set as active session in localStorage for tab sync
      localStorage.setItem('active_session_id', newSession.id);

      return newSession;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  async getAllSessions(userId: string = 'default-user-id'): Promise<ChatSession[]> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([SESSIONS_STORE], 'readonly');
      const store = transaction.objectStore(SESSIONS_STORE);
      const index = store.index('userId');
      const request = index.getAll(userId);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const sessions = request.result as ChatSession[];
          // Sort by updatedAt descending
          sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          resolve(sessions);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }
  }

  async getSession(sessionId: string): Promise<ChatSession | null> {
    try {
      const session = await this.performDBOperation<ChatSession>(
        SESSIONS_STORE,
        'readonly',
        (store) => store.get(sessionId)
      );
      return session || null;
    } catch (error) {
      console.error('Error fetching session:', error);
      return null;
    }
  }

  async updateSessionTitle(sessionId: string, title: string): Promise<boolean> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) return false;

      session.title = title;
      session.updatedAt = new Date().toISOString();

      await this.performDBOperation<ChatSession>(
        SESSIONS_STORE,
        'readwrite',
        (store) => store.put(session)
      );

      return true;
    } catch (error) {
      console.error('Error updating session title:', error);
      return false;
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      // Delete all messages first
      await this.clearSessionMessages(sessionId);

      // Delete the session
      await this.performDBOperation<undefined>(
        SESSIONS_STORE,
        'readwrite',
        (store) => store.delete(sessionId)
      );

      // Clear active session if it was deleted
      const activeSessionId = localStorage.getItem('active_session_id');
      if (activeSessionId === sessionId) {
        localStorage.removeItem('active_session_id');
      }

      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }

  // Message management methods
  async addMessage(sessionId: string, message: Omit<ChatMessage, 'id'>): Promise<boolean> {
    try {
      const messageWithId: ChatMessage = {
        ...message,
        sessionId,
        timestamp: message.timestamp || new Date().toISOString(),
      };

      // Add message to database
      await this.performDBOperation<ChatMessage>(
        MESSAGES_STORE,
        'readwrite',
        (store) => store.add(messageWithId)
      );

      // Update session's message count and timestamp
      const session = await this.getSession(sessionId);
      if (session) {
        session.messageCount += 1;
        session.updatedAt = new Date().toISOString();

        // Auto-generate title from first user message
        if (session.messageCount === 1 && message.role === 'user') {
          session.title = this.generateTitle(message.content);
        }

        await this.performDBOperation<ChatSession>(
          SESSIONS_STORE,
          'readwrite',
          (store) => store.put(session)
        );
      }

      return true;
    } catch (error) {
      console.error('Error adding message:', error);
      return false;
    }
  }

  async getMessages(sessionId: string, limit?: number): Promise<ChatMessage[]> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([MESSAGES_STORE], 'readonly');
      const store = transaction.objectStore(MESSAGES_STORE);
      const index = store.index('sessionId');
      const request = index.getAll(sessionId);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          let messages = request.result as ChatMessage[];
          
          // Sort by timestamp
          messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
          
          // Apply limit if specified
          if (limit && messages.length > limit) {
            messages = messages.slice(-limit);
          }
          
          resolve(messages);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  }

  async clearSessionMessages(sessionId: string): Promise<boolean> {
    try {
      const db = await this.getDB();
      const transaction = db.transaction([MESSAGES_STORE], 'readwrite');
      const store = transaction.objectStore(MESSAGES_STORE);
      const index = store.index('sessionId');
      const request = index.getAllKeys(sessionId);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const keys = request.result;
          const deletePromises = keys.map(key => 
            new Promise<void>((deleteResolve, deleteReject) => {
              const deleteRequest = store.delete(key);
              deleteRequest.onsuccess = () => deleteResolve();
              deleteRequest.onerror = () => deleteReject(deleteRequest.error);
            })
          );

          Promise.all(deletePromises)
            .then(() => {
              // Update session message count
              this.getSession(sessionId).then(session => {
                if (session) {
                  session.messageCount = 0;
                  session.updatedAt = new Date().toISOString();
                  this.performDBOperation<ChatSession>(
                    SESSIONS_STORE,
                    'readwrite',
                    (store) => store.put(session)
                  );
                }
              });
              resolve(true);
            })
            .catch(() => reject(new Error('Failed to delete messages')));
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error clearing messages:', error);
      return false;
    }
  }

  // Utility methods
  private generateTitle(content: string): string {
    if (!content || content.length < 5) return 'New Chat';
    
    // Take first 30 characters or the first sentence, whichever is shorter
    const firstSentence = content.split(/[.!?]/)[0].trim();
    let title = firstSentence.length <= 30 ? firstSentence : content.substring(0, 30);
    
    // Add ellipsis if truncated
    if (title.length < content.length) {
      title += '...';
    }
    
    return title;
  }

  // Active session management (using localStorage for tab sync)
  setActiveSession(sessionId: string): boolean {
    try {
      localStorage.setItem('active_session_id', sessionId);
      return true;
    } catch (error) {
      console.error('Error setting active session:', error);
      return false;
    }
  }

  getActiveSessionId(): string | null {
    try {
      return localStorage.getItem('active_session_id');
    } catch (error) {
      console.error('Error getting active session:', error);
      return null;
    }
  }

  async getActiveSession(): Promise<ChatSession | null> {
    const activeSessionId = this.getActiveSessionId();
    if (!activeSessionId) return null;
    
    return await this.getSession(activeSessionId);
  }

  // Context management for AI
  async getSessionContext(sessionId: string, maxMessages: number = 10): Promise<ChatMessage[]> {
    return await this.getMessages(sessionId, maxMessages);
  }

  // Performance optimization - batch operations
  async batchAddMessages(sessionId: string, messages: Omit<ChatMessage, 'id'>[]): Promise<boolean> {
    if (!messages || messages.length === 0) return true;

    try {
      const db = await this.getDB();
      const transaction = db.transaction([MESSAGES_STORE, SESSIONS_STORE], 'readwrite');
      const messageStore = transaction.objectStore(MESSAGES_STORE);
      const sessionStore = transaction.objectStore(SESSIONS_STORE);

      // Add all messages
      for (const message of messages) {
        const messageWithId: ChatMessage = {
          ...message,
          sessionId,
          timestamp: message.timestamp || new Date().toISOString(),
        };
        messageStore.add(messageWithId);
      }

      // Update session
      const session = await this.getSession(sessionId);
      if (session) {
        session.messageCount += messages.length;
        session.updatedAt = new Date().toISOString();
        sessionStore.put(session);
      }

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (error) {
      console.error('Error batch adding messages:', error);
      return false;
    }
  }

  // Database maintenance
  async getStorageStats(): Promise<{ sessionsCount: number; messagesCount: number; estimatedSize: string }> {
    try {
      const sessions = await this.getAllSessions();
      let totalMessages = 0;

      for (const session of sessions) {
        totalMessages += session.messageCount;
      }

      // Rough estimate - each message ~1KB, each session ~0.1KB
      const estimatedBytes = (totalMessages * 1024) + (sessions.length * 100);
      const estimatedSize = estimatedBytes > 1024 * 1024 
        ? `${(estimatedBytes / (1024 * 1024)).toFixed(1)}MB`
        : `${(estimatedBytes / 1024).toFixed(1)}KB`;

      return {
        sessionsCount: sessions.length,
        messagesCount: totalMessages,
        estimatedSize
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return { sessionsCount: 0, messagesCount: 0, estimatedSize: '0KB' };
    }
  }

  // Cleanup old data
  async cleanupOldSessions(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const sessions = await this.getAllSessions();
      const oldSessions = sessions.filter(session => 
        new Date(session.updatedAt) < cutoffDate
      );

      let deletedCount = 0;
      for (const session of oldSessions) {
        const success = await this.deleteSession(session.id);
        if (success) deletedCount++;
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old sessions:', error);
      return 0;
    }
  }
}

// Create a default instance that handles SSR gracefully
export const indexedDBChatService = (() => {
  if (typeof window === 'undefined') {
    // Return a mock service for SSR
    return {
      async getAllSessions() { return []; },
      async getSession() { return null; },
      async createSession() { return null; },
      async updateSessionTitle() { return false; },
      async deleteSession() { return false; },
      async getMessages() { return []; },
      async addMessage() { return false; },
      async batchAddMessages() { return false; },
      async clearSessionMessages() { return false; },
      async getStorageStats() { return { sessionsCount: 0, messagesCount: 0, estimatedSize: '0 B' }; },
      async cleanupOldSessions() { return 0; },
      async exportData() { return { sessions: [], messages: [] }; },
      async importData() { return { success: false, sessionsImported: 0, messagesImported: 0 }; }
    } as any;
  }
  
  return new IndexedDBChatService();
})(); 