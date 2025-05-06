'use client';

import { v4 as uuidv4 } from 'uuid';
import { SearchResults } from '@/types/groundx';

// Define interfaces for type safety
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  searchResults?: SearchResults;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: any[]; // Add the missing properties
  createdAt: string;
  updatedAt: string;
}

// A client-side service to manage chat sessions and messages
export const chatHistoryService = {
  // Create a new session
  createSession: (title: string = 'New Chat'): ChatSession => {
    const newSession: ChatSession = {
      id: uuidv4(),
      userId: 'default-user-id', // Replace with actual user ID logic
      title,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Get existing sessions
    const sessions = chatHistoryService.getAllSessions();
    
    // Add new session to the beginning of the array
    const updatedSessions = [newSession, ...sessions];
    
    // Save to localStorage
    localStorage.setItem('chat_sessions', JSON.stringify(updatedSessions));
    
    // Set as active session
    localStorage.setItem('active_session_id', newSession.id);
    
    return newSession;
  },

  // Get all sessions
  getAllSessions: (): ChatSession[] => {
    const sessionsJson = localStorage.getItem('chat_sessions');
    if (!sessionsJson) return [];
    
    try {
      const sessions = JSON.parse(sessionsJson);
      return Array.isArray(sessions) ? sessions : [];
    } catch (error) {
      console.error('Error parsing sessions from localStorage:', error);
      return [];
    }
  },

  // Get a specific session by ID
  getSession: (sessionId: string): ChatSession | null => {
    const sessions = chatHistoryService.getAllSessions();
    const session = sessions.find(s => s.id === sessionId);
    return session || null;
  },

  // Get the active session
  getActiveSession: (): ChatSession | null => {
    const activeSessionId = localStorage.getItem('active_session_id');
    if (!activeSessionId) return null;
    
    return chatHistoryService.getSession(activeSessionId);
  },

  // Set active session
  setActiveSession: (sessionId: string): boolean => {
    const session = chatHistoryService.getSession(sessionId);
    if (!session) return false;
    
    localStorage.setItem('active_session_id', sessionId);
    return true;
  },

  // Update session title
  updateSessionTitle: (sessionId: string, title: string): boolean => {
    const sessions = chatHistoryService.getAllSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex === -1) return false;
    
    sessions[sessionIndex].title = title;
    sessions[sessionIndex].updatedAt = new Date().toISOString();
    
    localStorage.setItem('chat_sessions', JSON.stringify(sessions));
    return true;
  },

  // Delete a session
  deleteSession: (sessionId: string): boolean => {
    const sessions = chatHistoryService.getAllSessions();
    const newSessions = sessions.filter(s => s.id !== sessionId);
    
    if (sessions.length === newSessions.length) return false;
    
    localStorage.setItem('chat_sessions', JSON.stringify(newSessions));
    
    // If we deleted the active session, set a new active session
    const activeSessionId = localStorage.getItem('active_session_id');
    if (activeSessionId === sessionId) {
      if (newSessions.length > 0) {
        localStorage.setItem('active_session_id', newSessions[0].id);
      } else {
        localStorage.removeItem('active_session_id');
      }
    }
    
    return true;
  },

  // Add a message to a session
  addMessage: (sessionId: string, message: ChatMessage): boolean => {
    const sessions = chatHistoryService.getAllSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex === -1) return false;
    
    sessions[sessionIndex].messages.push(message);
    sessions[sessionIndex].updatedAt = new Date().toISOString();
    
    // If it's the first message, update the session title based on user message
    if (sessions[sessionIndex].messages.length === 1 && message.role === 'user') {
      sessions[sessionIndex].title = chatHistoryService.generateTitle(message.content);
    }
    
    localStorage.setItem('chat_sessions', JSON.stringify(sessions));
    return true;
  },

  // Clear messages from a session
  clearSessionMessages: (sessionId: string): boolean => {
    const sessions = chatHistoryService.getAllSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex === -1) return false;
    
    sessions[sessionIndex].messages = [];
    sessions[sessionIndex].updatedAt = new Date().toISOString();
    
    localStorage.setItem('chat_sessions', JSON.stringify(sessions));
    return true;
  },

  // Generate a title based on the first message
  generateTitle: (content: string): string => {
    if (!content || content.length < 5) return 'New Chat';
    
    // Take first 30 characters or the first sentence, whichever is shorter
    const firstSentence = content.split(/[.!?]/)[0].trim();
    let title = firstSentence.length <= 30 ? firstSentence : content.substring(0, 30);
    
    // Add ellipsis if truncated
    if (title.length < content.length) {
      title += '...';
    }
    
    return title;
  },

  // Get messages from a session as context for the AI
  getSessionContext: (sessionId: string, maxMessages: number = 10): ChatMessage[] => {
    const session = chatHistoryService.getSession(sessionId);
    if (!session) return [];
    
    // Return the last N messages for context
    return session.messages.slice(-maxMessages);
  }
};