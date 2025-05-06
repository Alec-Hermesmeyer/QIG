'use client';

// Define types for context messages
export interface ContextMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/**
 * A Safari-compatible context manager that maintains conversation context
 * without the overhead of a full chat history system
 */
export const contextManager = {
  // Maximum number of messages to keep in context
  maxContextMessages: 10,
  
  // Storage key for conversation context
  storageKey: 'conversation_context',
  
  // Safe storage access with error handling and fallbacks
  safeStorageAccess: {
    get: (key: string): any => {
      if (typeof window === 'undefined') return null;
      
      try {
        const value = sessionStorage.getItem(key);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        console.error(`Error reading from sessionStorage (${key}):`, error);
        // Fallback to memory storage when sessionStorage fails
        return null;
      }
    },
    
    set: (key: string, value: any): boolean => {
      if (typeof window === 'undefined') return false;
      
      try {
        sessionStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.error(`Error writing to sessionStorage (${key}):`, error);
        return false;
      }
    },
    
    remove: (key: string): boolean => {
      if (typeof window === 'undefined') return false;
      
      try {
        sessionStorage.removeItem(key);
        return true;
      } catch (error) {
        console.error(`Error removing from sessionStorage (${key}):`, error);
        return false;
      }
    }
  },
  
  // Memory fallback when sessionStorage isn't available
  memoryStorage: [] as ContextMessage[],
  
  // Get the current conversation context
  getCurrentContext: (): ContextMessage[] => {
    // Try to get from sessionStorage
    const storedContext = contextManager.safeStorageAccess.get(contextManager.storageKey);
    
    if (Array.isArray(storedContext)) {
      return storedContext;
    }
    
    // Fallback to memory storage
    return contextManager.memoryStorage;
  },
  
  // Add a message to the conversation context
  addMessage: (role: 'user' | 'assistant', content: string): ContextMessage[] => {
    // Get current context
    const currentContext = contextManager.getCurrentContext();
    
    // Create new message
    const newMessage: ContextMessage = {
      role,
      content,
      timestamp: new Date().toISOString()
    };
    
    // Add to context and limit size
    const updatedContext = [...currentContext, newMessage].slice(-contextManager.maxContextMessages);
    
    // Try to save to sessionStorage
    const saveSuccess = contextManager.safeStorageAccess.set(contextManager.storageKey, updatedContext);
    
    // Update memory fallback if sessionStorage fails
    if (!saveSuccess) {
      contextManager.memoryStorage = updatedContext;
    }
    
    return updatedContext;
  },
  
  // Clear the conversation context
  clearContext: (): void => {
    contextManager.safeStorageAccess.remove(contextManager.storageKey);
    contextManager.memoryStorage = [];
  },
  
  // Format context for sending to RAG API
  getFormattedContextForRAG: (): any => {
    const context = contextManager.getCurrentContext();
    
    // Format context for RAG system - adapt this to match your API's expected format
    return context.map(message => ({
      role: message.role,
      content: message.content
    }));
  },
  
  // Check if storage is available
  isStorageAvailable: (): boolean => {
    if (typeof window === 'undefined') return false;
    
    try {
      const testKey = '__storage_test__';
      sessionStorage.setItem(testKey, testKey);
      sessionStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }
};