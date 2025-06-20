// models/ChatMessage.ts
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  // GroundX specific fields
  searchResults?: any;
  thoughts?: any;
  supportingContent?: any;
  enhancedResults?: any;
  documentExcerpts?: any[];
  result?: any;
  rawResponse?: any; // The complete raw response
  // Enhanced metadata for improved formatting (supports Kernel Memory and other backends)
  metadata?: {
    supportingContent?: any[];
    thoughtProcess?: string;
    citations?: any[];
    searchResults?: any;
    sources?: any[];
    sourceCount?: number;
    hasResults?: boolean;
    backend?: string;
    streamingComplete?: boolean;
    streamProgress?: any;
    raw?: any;
    [key: string]: any; // Allow additional metadata properties
  };
}
  
  // models/ChatSession.ts
  export interface ChatSession {
    id: string;
    userId: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
  }
  
  