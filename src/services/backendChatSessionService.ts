'use client';

// Backend Chat Session Service
// Interfaces with the backend chat session management endpoints

export interface BackendChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackendChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: any;
}

export interface CreateSessionRequest {
  title?: string;
}

export interface UpdateSessionRequest {
  title: string;
}

export interface CreateMessageRequest {
  role: 'user' | 'assistant';
  content: string;
  metadata?: any;
}

class BackendChatSessionService {
  private baseUrl: string;

  constructor() {
    // Get the base URL from environment or default to localhost
    this.baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
    console.log('🔍 BackendChatSessionService: Base URL set to:', this.baseUrl);
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Get auth token using the same pattern as other services
    const authService = (await import('@/services/authService')).authService;
    const token = await authService.getToken();
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    
    // Add authorization header if token is available
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      console.log('🔑 Backend chat request: Adding auth token');
    } else {
      console.warn('⚠️ Backend chat request: No auth token available');
    }
    
    console.log('📡 Backend chat request:', {
      method: options.method || 'GET',
      url,
      hasAuth: !!token
    });
    
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend chat request failed:', {
        status: response.status,
        statusText: response.statusText,
        url,
        hasAuth: !!token,
        error: errorText
      });
      throw new Error(`Backend request failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  // Session management methods
  async getSessions(): Promise<BackendChatSession[]> {
    const response = await this.makeRequest<{success: boolean, sessions: BackendChatSession[]}>('/api/chat-sessions/sessions');
    
    console.log('🔍 Raw getSessions response:', response);
    
    if (response.success && Array.isArray(response.sessions)) {
      console.log('✅ Extracted sessions from response:', response.sessions.length, 'sessions');
      return response.sessions;
    } else {
      console.error('❌ Invalid getSessions response format:', response);
      throw new Error('Invalid sessions list response format');
    }
  }

  async createSession(data: CreateSessionRequest = {}): Promise<BackendChatSession> {
    const response = await this.makeRequest<{success: boolean, session: BackendChatSession}>('/api/chat-sessions/sessions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    console.log('🔍 Raw createSession response:', response);
    
    if (response.success && response.session) {
      console.log('✅ Extracted session from response:', response.session);
      return response.session;
    } else {
      console.error('❌ Invalid createSession response format:', response);
      throw new Error('Invalid session creation response format');
    }
  }

  async updateSession(sessionId: string, data: UpdateSessionRequest): Promise<BackendChatSession> {
    return this.makeRequest<BackendChatSession>(`/api/chat-sessions/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSession(sessionId: string): Promise<void> {
    return this.makeRequest<void>(`/api/chat-sessions/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  // Message management methods
  async getMessages(sessionId: string): Promise<BackendChatMessage[]> {
    const response = await this.makeRequest<{success: boolean, messages: BackendChatMessage[]}>(`/api/chat-sessions/sessions/${sessionId}/messages`);
    
    console.log('🔍 Raw getMessages response:', response);
    
    if (response.success && Array.isArray(response.messages)) {
      console.log('✅ Extracted messages from response:', response.messages.length, 'messages');
      return response.messages;
    } else {
      console.error('❌ Invalid getMessages response format:', response);
      throw new Error('Invalid messages list response format');
    }
  }

  async addMessage(sessionId: string, data: CreateMessageRequest): Promise<BackendChatMessage> {
    const response = await this.makeRequest<{success: boolean, message: BackendChatMessage}>(`/api/chat-sessions/sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    console.log('🔍 Raw addMessage response:', response);
    
    if (response.success && response.message) {
      console.log('✅ Extracted message from response:', response.message);
      return response.message;
    } else {
      console.error('❌ Invalid addMessage response format:', response);
      throw new Error('Invalid message creation response format');
    }
  }

  // Utility methods
  async getSessionWithMessages(sessionId: string): Promise<{
    session: BackendChatSession;
    messages: BackendChatMessage[];
  }> {
    const [session, messages] = await Promise.all([
      this.getSessions().then(sessions => sessions.find(s => s.id === sessionId)),
      this.getMessages(sessionId),
    ]);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return { session, messages };
  }

  async createSessionWithFirstMessage(
    sessionData: CreateSessionRequest,
    messageData: CreateMessageRequest
  ): Promise<{
    session: BackendChatSession;
    message: BackendChatMessage;
  }> {
    const session = await this.createSession(sessionData);
    const message = await this.addMessage(session.id, messageData);
    
    return { session, message };
  }
}

// Export singleton instance
export const backendChatSessionService = new BackendChatSessionService(); 