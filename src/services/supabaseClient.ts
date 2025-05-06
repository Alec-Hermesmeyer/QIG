// services/supabaseClient.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Define types for chat data
export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id?: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  search_results?: any;
  thoughts?: any;
  supporting_content?: any;
  enhanced_results?: any;
  document_excerpts?: any[];
  result?: any;
  raw_response?: any;
}

// Define payload type for realtime subscriptions
interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: ChatMessage;
  old: ChatMessage | null;
}

// Initialize the Supabase client with proper type checking
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if environment variables are defined
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create a single instance of the Supabase client to be used throughout the app
export const supabaseClient: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    // Configuration for real-time subscriptions
  },
  // Improves performance by reducing console debug output
//   debug: process.env.NODE_ENV === 'development',
});

// Export utility functions for chat history management
export const chatHistoryService = {
  // Chat sessions methods
  async createSession(userId: string, title: string = 'New Chat'): Promise<ChatSession | null> {
    try {
      const { data, error } = await supabaseClient
        .from('chat_sessions')
        .insert({
          user_id: userId,
          title
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Set as active session in localStorage for syncing across tabs
      localStorage.setItem('activeSessionId', data.id);
      
      return data;
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  },

  async getSessions(userId: string): Promise<ChatSession[]> {
    try {
      const { data, error } = await supabaseClient
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }
  },

  async getSession(sessionId: string): Promise<ChatSession | null> {
    try {
      const { data, error } = await supabaseClient
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error fetching session:', error);
      return null;
    }
  },

  async updateSessionTitle(sessionId: string, title: string): Promise<ChatSession | null> {
    try {
      const { data, error } = await supabaseClient
        .from('chat_sessions')
        .update({ title })
        .eq('id', sessionId)
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error updating session title:', error);
      return null;
    }
  },

  // Chat messages methods
  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabaseClient
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  },

  async addMessage(sessionId: string, message: Omit<ChatMessage, 'id' | 'session_id'> & { session_id?: string }): Promise<ChatMessage | null> {
    try {
      const { data, error } = await supabaseClient
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          role: message.role,
          content: message.content,
          timestamp: message.timestamp || new Date().toISOString(),
          search_results: message.search_results,
          thoughts: message.thoughts,
          supporting_content: message.supporting_content,
          enhanced_results: message.enhanced_results,
          document_excerpts: message.document_excerpts,
          result: message.result,
          raw_response: message.raw_response
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error adding message:', error);
      return null;
    }
  },

  async deleteMessage(messageId: string): Promise<boolean> {
    try {
      const { error } = await supabaseClient
        .from('chat_messages')
        .delete()
        .eq('id', messageId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  },

  async clearMessages(sessionId: string): Promise<boolean> {
    try {
      const { error } = await supabaseClient
        .from('chat_messages')
        .delete()
        .eq('session_id', sessionId);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error clearing messages:', error);
      return false;
    }
  },

  // Session management
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      // Delete messages first (foreign key constraint)
      await this.clearMessages(sessionId);
      
      // Then delete the session
      const { error } = await supabaseClient
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);
      
      if (error) throw error;
      
      // Clear active session if it was deleted
      if (localStorage.getItem('activeSessionId') === sessionId) {
        localStorage.removeItem('activeSessionId');
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  },

  // Local storage helpers for active session management
  setActiveSession(sessionId: string): void {
    localStorage.setItem('activeSessionId', sessionId);
  },

  getActiveSessionId(): string | null {
    return localStorage.getItem('activeSessionId');
  },

  // Realtime subscription for multi-device sync
  subscribeToSessionMessages(sessionId: string, callback: (payload: RealtimePayload) => void) {
    return supabaseClient
      .channel(`messages:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          callback(payload as unknown as RealtimePayload);
        }
      )
      .subscribe();
  },

  // Performance optimization - batch insert messages
  async batchAddMessages(sessionId: string, messages: Omit<ChatMessage, 'id' | 'session_id'>[]): Promise<ChatMessage[]> {
    if (!messages || messages.length === 0) return [];
    
    try {
      const messagesToInsert = messages.map(msg => ({
        session_id: sessionId,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp || new Date().toISOString(),
        search_results: msg.search_results || null,
        thoughts: msg.thoughts || null,
        supporting_content: msg.supporting_content || null,
        enhanced_results: msg.enhanced_results || null,
        document_excerpts: msg.document_excerpts  || null,
        result: msg.result || null,
        raw_response: msg.raw_response  || null
      }));
      
      const { data, error } = await supabaseClient
        .from('chat_messages')
        .insert(messagesToInsert)
        .select();
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error batch adding messages:', error);
      return [];
    }
  }
};