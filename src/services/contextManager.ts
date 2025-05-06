'use client';

// Define types for context messages
export interface ContextMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

/**
 * A simple context manager that maintains conversation context
 * without the overhead of a full chat history system
 */
export const contextManager = {
  // Maximum number of messages to keep in context
  maxContextMessages: 10,
  
  // Get the current conversation context from memory
  getCurrentContext: (): ContextMessage[] => {
    // Try to get from session storage (persists only for current tab)
    if (typeof window !== 'undefined') {
      try {
        const storedContext = sessionStorage.getItem('conversation_context');
        if (storedContext) {
          return JSON.parse(storedContext);
        }
      } catch (error) {
        console.error('Error reading context from session storage:', error);
      }
    }
    return [];
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
    
    // Save to session storage
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('conversation_context', JSON.stringify(updatedContext));
      } catch (error) {
        console.error('Error saving context to session storage:', error);
      }
    }
    
    return updatedContext;
  },
  
  // Clear the conversation context
  clearContext: (): void => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('conversation_context');
      } catch (error) {
        console.error('Error clearing context from session storage:', error);
      }
    }
  },
  
  // Format context for sending to RAG API
  // Returns context in the format expected by the RAG system
  getFormattedContextForRAG: (): any => {
    const context = contextManager.getCurrentContext();
    
    // Format context for RAG system - adapt this to match your API's expected format
    return context.map(message => ({
      role: message.role,
      content: message.content
    }));
  }
};