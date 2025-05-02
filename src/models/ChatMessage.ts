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
}
  
  // models/ChatSession.ts
  export interface ChatSession {
    id: string;
    userId: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
  }
  
  