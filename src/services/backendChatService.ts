// Enhanced backend chat service with streaming support
import { authService } from './authService';

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface StreamingChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  includeThoughts?: boolean;
  streamResponse?: boolean;
  useRAG?: boolean;
  bucketId?: string;
  sessionId?: string;
  onChunk?: (chunk: string) => void;
  onThoughts?: (thoughts: string) => void;
  onSearchResults?: (results: any) => void;
  onComplete?: (fullContent: string, metadata?: any) => void;
  onError?: (error: Error) => void;
}

interface ChatResponse {
  success: boolean;
  message?: string;
  error?: string;
  content?: string;
  data?: {
    response: string;
    sources?: any[];
  };
  searchResults?: any;
  thoughts?: string;
  metadata?: any;
}

interface StreamingChatResponse {
  success: boolean;
  content: string;
  done: boolean;
  metadata?: any;
  error?: string;
}

interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  stream?: boolean;
  includeThoughts?: boolean;
  includeSearchResults?: boolean;
  bucketId?: string;
}

interface ChatCallbacks {
  onChunk?: (chunk: string) => void;
  onThoughts?: (thoughts: string) => void;
  onSearchResults?: (results: any) => void;
  onComplete?: (fullContent: string, metadata?: any) => void;
  onError?: (error: Error) => void;
}

// Helper to get headers with auth token
async function getHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = await authService.getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

// Main backend chat service class
export class BackendChatService {
  private baseUrl: string;
  private abortController: AbortController | null = null;

  constructor() {
    this.baseUrl = BACKEND_BASE_URL;
  }

  // Streaming chat with enhanced processing
  async streamChat(options: StreamingChatOptions): Promise<ChatResponse> {
    const {
      messages,
      temperature = 0.3,
      includeThoughts = false,
      useRAG = false,
      bucketId,
      sessionId,
      onChunk,
      onThoughts,
      onSearchResults,
      onComplete,
      onError
    } = options;

    try {
      const token = await authService.getToken();
      
      // Check if this should use Ground-X RAG
      if (useRAG && bucketId) {
        console.log('🔄 Routing to Ground-X RAG (non-streaming)...');
        return await this.handleGroundXRag(messages, bucketId, temperature, {
          onChunk,
          onThoughts,
          onSearchResults,
          onComplete,
          onError
        }, sessionId);
      }
      
      // Regular streaming chat for non-RAG requests
      const url = `${this.baseUrl}/api/chat-stream`;
      console.log('🔄 Starting backend streaming chat...');
      console.log('📧 Session ID for chat request:', sessionId || 'None');

      const response = await fetch(url, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({
          messages,
          temperature,
          include_thought_process: includeThoughts,
          stream: true,
          sessionId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend chat stream failed: ${response.status} - ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response body available for streaming');
      }

      // Process the streaming response
      return await this.processStreamingResponse(response.body, {
        onChunk,
        onThoughts,
        onSearchResults,
        onComplete,
        onError
      });

    } catch (error) {
      console.error('Backend streaming chat error:', error);
      if (onError) {
        onError(error instanceof Error ? error : new Error('Unknown streaming error'));
      }
      throw error;
    }
  }

  // Non-streaming chat
  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResponse> {
    try {
      const url = `${this.baseUrl}/api/chat`;
      
      console.log('💬 Backend chat request...');

      const response = await fetch(url, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({
          messages,
          ...options
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend chat failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Chat request failed');
      }

      return {
        success: true,
        content: data.content,
        searchResults: data.searchResults,
        thoughts: data.thoughts,
        metadata: data.metadata
      };

    } catch (error) {
      console.error('Backend chat error:', error);
      throw error;
    }
  }

  // Process streaming response with enhanced chunk handling
  private async processStreamingResponse(
    body: ReadableStream<Uint8Array>,
    callbacks: {
      onChunk?: (chunk: string) => void;
      onThoughts?: (thoughts: string) => void;
      onSearchResults?: (results: any) => void;
      onComplete?: (fullContent: string, metadata?: any) => void;
      onError?: (error: Error) => void;
    }
  ): Promise<ChatResponse> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    
    let fullContent = '';
    let searchResults = null;
    let thoughts = '';
    let metadata = {};
    let receivedFirstContentChunk = false;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('✅ Stream processing complete');
          break;
        }

        const text = decoder.decode(value, { stream: true });
        const lines = text.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            // Try to parse as JSON
            const data = JSON.parse(line);
            
            // Handle different types of streaming data
            if (data.type === 'content' || (data.delta && data.delta.content)) {
              const content = data.content || data.delta.content;
              fullContent += content;
              receivedFirstContentChunk = true;
              
              if (callbacks.onChunk) {
                callbacks.onChunk(content);
              }
            }
            else if (data.type === 'thoughts' || data.thoughts) {
              thoughts += data.thoughts || data.content;
              if (callbacks.onThoughts) {
                callbacks.onThoughts(data.thoughts || data.content);
              }
            }
            else if (data.type === 'search_results' || data.searchResults) {
              searchResults = data.searchResults || data.search_results;
              if (callbacks.onSearchResults) {
                callbacks.onSearchResults(searchResults);
              }
            }
            else if (data.type === 'citation' && data.citation) {
              // Handle citations
              if (!(metadata as any).citations) (metadata as any).citations = [];
              (metadata as any).citations.push(data.citation);
            }

          } catch (parseError) {
            // Not JSON - might be raw content
            if (!receivedFirstContentChunk && line.includes('I found information')) {
              receivedFirstContentChunk = true;
              fullContent += line;
              if (callbacks.onChunk) {
                callbacks.onChunk(line);
              }
            } else if (receivedFirstContentChunk) {
              fullContent += line;
              if (callbacks.onChunk) {
                callbacks.onChunk(line);
              }
            }
          }
        }
      }

      // Clean up content
      fullContent = this.cleanContent(fullContent);

      const finalResponse: ChatResponse = {
        success: true,
        content: fullContent,
        searchResults,
        thoughts,
        metadata
      };

      if (callbacks.onComplete) {
        callbacks.onComplete(fullContent, { searchResults, thoughts, metadata });
      }

      return finalResponse;

    } catch (error) {
      console.error('Stream processing error:', error);
      if (callbacks.onError) {
        callbacks.onError(error instanceof Error ? error : new Error('Stream processing failed'));
      }
      throw error;
    } finally {
      reader.releaseLock();
    }
  }

  // Extract content from various response formats
  private extractContent(data: any): string {
    if (typeof data === 'string') {
      return data;
    }
    
    if (data.content) {
      return data.content;
    }
    
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message?.content || '';
    }
    
    if (data.answer) {
      return data.answer;
    }
    
    if (data.response) {
      return typeof data.response === 'string' ? data.response : JSON.stringify(data.response);
    }
    
    return 'No content found in response';
  }

  // Clean content by removing document tags and metadata
  private cleanContent(content: string): string {
    return content
      .replace(/<\/?document.*?>/g, '')
      .replace(/<\/?source>/g, '')
      .replace(/<\/?document_content>/g, '')
      .replace(/<userStyle>.*?<\/userStyle>/g, '')
      .replace(/<search_reminders>.*?<\/search_reminders>/g, '')
      .trim();
  }

  // Handle Ground-X RAG requests (non-streaming)
  async handleGroundXRag(
    messages: ChatMessage[], 
    bucketId: string, 
    temperature: number,
    callbacks: {
      onChunk?: (chunk: string) => void;
      onThoughts?: (thoughts: string) => void;
      onSearchResults?: (results: any) => void;
      onComplete?: (fullContent: string, metadata?: any) => void;
      onError?: (error: Error) => void;
    },
    sessionId?: string
  ): Promise<ChatResponse> {
    try {
      const url = `${this.baseUrl}/api/groundx/rag`;
      
      // Get the user's query (last message) for the search
      const userQuery = messages[messages.length - 1]?.content || '';
      
      console.log('🔄 Using Ground-X RAG from backend...');
      console.log('📝 Conversation context:', messages.length, 'messages');
      console.log('🔍 Search query:', userQuery);
      console.log('📧 Session ID for RAG request:', sessionId || 'None');

      const response = await fetch(url, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({
          query: userQuery,
          bucketId: bucketId,
          messages: messages, // Send full conversation context
          includeThoughts: true,
          temperature,
          conversationContext: true, // Flag to indicate this needs context handling
          sessionId
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ground-X RAG failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Ground-X RAG request failed');
      }

      const fullContent = data.response || '';
      const searchResults = data.searchResults || null;
      const thoughts = data.thoughts || '';
      
      // Extract rich metadata from the response
      const enhancedMetadata = {
        supportingContent: searchResults?.sources || [],
        thoughtProcess: thoughts,
        searchResults: searchResults,
        sources: searchResults?.sources || [],
        executionTime: data.executionTime,
        timestamp: data.timestamp,
        query: data.query,
        // Pass through any additional metadata
        ...data
      };

      // Call callbacks if provided
      if (searchResults) {
        callbacks.onSearchResults?.(searchResults);
      }
      if (thoughts) {
        callbacks.onThoughts?.(thoughts);
      }
      callbacks.onComplete?.(fullContent, enhancedMetadata);

      return {
        success: true,
        content: fullContent,
        metadata: enhancedMetadata
      };

    } catch (error) {
      console.error('Ground-X RAG error:', error);
      callbacks.onError?.(error as Error);
      throw error;
    }
  }

  // Handle streaming chat requests
  async chatStream(
    messages: ChatMessage[], 
    options: ChatOptions = {}, 
    callbacks: ChatCallbacks = {}
  ): Promise<void> {
    try {
      // Create new abort controller for this request
      this.abortController = new AbortController();
      
      const url = `${this.baseUrl}/api/chat-stream`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: await getHeaders(),
        body: JSON.stringify({
          messages,
          ...options
        }),
        signal: this.abortController.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Chat stream request failed: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      let fullContent = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          callbacks.onComplete?.(fullContent);
          break;
        }

        const chunk = decoder.decode(value);
        fullContent += chunk;
        callbacks.onChunk?.(chunk);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Chat stream aborted');
      } else {
        console.error('Chat stream error:', error);
        callbacks.onError?.(error as Error);
      }
    } finally {
      this.abortController = null;
    }
  }

  // Stop any ongoing streaming request
  stopStream() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}

// Export singleton instance
export const backendChatService = new BackendChatService();

// Convenience functions for backward compatibility
export async function streamBackendChat(options: StreamingChatOptions): Promise<ChatResponse> {
  return backendChatService.streamChat(options);
}

export async function sendBackendChat(messages: ChatMessage[], temperature: number = 0.3): Promise<ChatResponse> {
  return backendChatService.chat(messages, { temperature });
}

// Send chat message and get response
export async function sendChatMessage(messages: ChatMessage[]): Promise<ChatResponse> {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chat API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return {
      success: true,
      ...data
    };
  } catch (error) {
    console.error('Chat error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Stream chat response
export async function streamChatResponse(messages: ChatMessage[]): Promise<Response> {
  const response = await fetch(`${BACKEND_BASE_URL}/api/chat-stream`, {
    method: 'POST',
    headers: await getHeaders(),
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Chat stream error: ${response.status} - ${errorText}`);
  }

  return response;
} 