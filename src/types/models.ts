// Chat message types
export interface Message {
    role: "user" | "assistant" | "system";
    content: string;
  }
  
  // Chat request structure for API
  export interface ChatAppRequest {
    messages: Message[];
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    stop?: string[];
    stream?: boolean;
    retrieval_mode?: RetrievalMode;
  }
  
  // Chat response structure from API
  export interface ChatAppResponse {
    answer: string;
    context?: {
      thoughts?: string[];
      data_points?: string[];
      followup_questions?: string[];
      [key: string]: any;
    };
    message?: {
      role?: string;
      content?: string;
      [key: string]: any;
    };
    [key: string]: any;
  }
  
  // Error response structure
  export interface ChatAppError {
    error: string;
  }
  
  // Combined type for API responses
  export type ChatAppResponseOrError = ChatAppResponse | ChatAppError;
  
  // Configuration structure
  export interface Config {
    model: string;
    temperature: number;
    top_p: number;
    max_tokens: number;
    stop: string[];
    stream: boolean;
    retrieval_mode: RetrievalMode;
  }
  
  // Simple API response
  export interface SimpleAPIResponse {
    message: string;
    [key: string]: any;
  }
  
  // History List API response
  export interface HistoryListApiResponse {
    items: any[];
    continuation_token?: string;
  }
  
  // History API response
  export interface HistroyApiResponse {
    id: string;
    user_id: string;
    history_item: any;
    created_at: string;
    updated_at: string;
  }
  
  // Retrieval modes
  export enum RetrievalMode {
    Hybrid = "hybrid",
    Vectors = "vectors",
    Text = "text",
    None = "none"
  }
  export interface Thoughts {
    title: string;
    props?: Record<string, any>;
    description: string | any[];
  }