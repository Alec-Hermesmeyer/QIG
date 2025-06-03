'use client';

import { indexedDBChatService, ChatSession as IDBChatSession, ChatMessage as IDBChatMessage } from './indexedDBChatService';
import { ChatSession as LocalChatSession, ChatMessage as LocalChatMessage } from './chatHistoryService';

export interface MigrationResult {
  success: boolean;
  migratedSessions: number;
  migratedMessages: number;
  errors: string[];
}

export class ChatHistoryMigration {
  
  /**
   * Migrate chat history from localStorage to IndexedDB
   */
  static async migrateFromLocalStorage(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      migratedSessions: 0,
      migratedMessages: 0,
      errors: []
    };

    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        result.errors.push('Migration can only run in browser environment');
        return result;
      }

      // Get existing localStorage data
      const sessionsJson = localStorage.getItem('chat_sessions');
      if (!sessionsJson) {
        result.success = true;
        return result; // No data to migrate
      }

      let localSessions: LocalChatSession[];
      try {
        localSessions = JSON.parse(sessionsJson);
        if (!Array.isArray(localSessions)) {
          result.errors.push('Invalid localStorage data format');
          return result;
        }
      } catch (error) {
        result.errors.push('Failed to parse localStorage data');
        return result;
      }

      // Check if IndexedDB already has data
      const existingSessions = await indexedDBChatService.getAllSessions();
      if (existingSessions.length > 0) {
        result.errors.push('IndexedDB already contains chat data. Migration skipped to prevent duplicates.');
        return result;
      }

      // Migrate each session
      for (const localSession of localSessions) {
        try {
          // Convert localStorage session to IndexedDB format
          const idbSession: IDBChatSession = {
            id: localSession.id,
            userId: localSession.userId || 'default-user-id',
            title: localSession.title,
            messageCount: localSession.messages?.length || 0,
            createdAt: localSession.createdAt,
            updatedAt: localSession.updatedAt
          };

          // Create session in IndexedDB
          await indexedDBChatService.createSession(idbSession.title, idbSession.userId);
          
          // Update with correct ID and metadata
          await indexedDBChatService.performDBOperation(
            'sessions',
            'readwrite',
            (store) => store.put(idbSession)
          );

          result.migratedSessions++;

          // Migrate messages if they exist
          if (localSession.messages && Array.isArray(localSession.messages)) {
            const idbMessages: Omit<IDBChatMessage, 'id'>[] = localSession.messages.map((msg: LocalChatMessage) => ({
              sessionId: localSession.id,
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp,
              searchResults: msg.searchResults,
              thoughts: (msg as any).thoughts,
              supportingContent: (msg as any).supportingContent,
              enhancedResults: (msg as any).enhancedResults,
              documentExcerpts: (msg as any).documentExcerpts,
              result: (msg as any).result,
              rawResponse: (msg as any).rawResponse
            }));

            // Batch add messages
            const messagesAdded = await indexedDBChatService.batchAddMessages(localSession.id, idbMessages);
            if (messagesAdded) {
              result.migratedMessages += idbMessages.length;
            } else {
              result.errors.push(`Failed to migrate messages for session: ${localSession.title}`);
            }
          }

        } catch (error) {
          result.errors.push(`Failed to migrate session "${localSession.title}": ${error}`);
        }
      }

      // Migration completed successfully
      result.success = result.errors.length === 0;

      // If successful, backup localStorage data and optionally clear it
      if (result.success && result.migratedSessions > 0) {
        // Create backup
        const backupKey = `chat_sessions_backup_${Date.now()}`;
        localStorage.setItem(backupKey, sessionsJson);
        
        // Optionally clear original data (uncomment if desired)
        // localStorage.removeItem('chat_sessions');
        // localStorage.removeItem('active_session_id');
      }

    } catch (error) {
      result.errors.push(`Migration failed: ${error}`);
    }

    return result;
  }

  /**
   * Check if there's localStorage data that needs migration
   */
  static hasLocalStorageData(): boolean {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false;
    }

    const sessionsJson = localStorage.getItem('chat_sessions');
    if (!sessionsJson) return false;

    try {
      const sessions = JSON.parse(sessionsJson);
      return Array.isArray(sessions) && sessions.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get storage usage statistics
   */
  static async getStorageComparison(): Promise<{
    localStorage: { sessions: number; estimatedSize: string };
    indexedDB: { sessionsCount: number; messagesCount: number; estimatedSize: string };
  }> {
    const result = {
      localStorage: { sessions: 0, estimatedSize: '0KB' },
      indexedDB: { sessionsCount: 0, messagesCount: 0, estimatedSize: '0KB' }
    };

    // localStorage stats
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const sessionsJson = localStorage.getItem('chat_sessions');
      if (sessionsJson) {
        try {
          const sessions = JSON.parse(sessionsJson);
          if (Array.isArray(sessions)) {
            result.localStorage.sessions = sessions.length;
            const sizeBytes = new Blob([sessionsJson]).size;
            result.localStorage.estimatedSize = sizeBytes > 1024 
              ? `${(sizeBytes / 1024).toFixed(1)}KB`
              : `${sizeBytes}B`;
          }
        } catch {
          // Ignore parsing errors
        }
      }
    }

    // IndexedDB stats
    try {
      result.indexedDB = await indexedDBChatService.getStorageStats();
    } catch {
      // Ignore IndexedDB errors
    }

    return result;
  }

  /**
   * Cleanup localStorage backup files older than specified days
   */
  static cleanupLocalStorageBackups(daysToKeep: number = 7): number {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return 0;
    }

    const cutoffTime = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    const keysToDelete: string[] = [];

    // Find backup keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('chat_sessions_backup_')) {
        const timestamp = parseInt(key.replace('chat_sessions_backup_', ''), 10);
        if (!isNaN(timestamp) && timestamp < cutoffTime) {
          keysToDelete.push(key);
        }
      }
    }

    // Delete old backups
    keysToDelete.forEach(key => localStorage.removeItem(key));
    
    return keysToDelete.length;
  }
} 