// types/groundx.ts
/**
 * TypeScript interfaces for working with the GroundX API
 * These interfaces define the structure of data returned from GroundX
 * and used throughout the RAG implementation
 */

/**
 * Source information returned from search
 * 
 */

export interface Source {
    id: string | number;
    fileName: string;
    title?: string;
    text?: string;
    score?: number;
  }
  
  /**
   * Search results from GroundX
   */
  export interface SearchResults {
    count: number;
    sources: Source[];
  }
  export interface SearchResultItem {
    documentId?: string;
  
  }
  
  /**
   * GroundX Bucket information
   */
  export interface BucketInfo {
    id: number;
    name: string;
    documentCount: number;
  }
  
  /**
   * GroundX Document information
   */
  export interface DocumentInfo {
    id: number | string;
    fileName: string;
    contentType: string;
    size: number;
    pages: number;
    uploadedAt: string;
  }
  
  /**
   * Configuration for RAG requests
   */
  export interface RAGConfig {
    temperature?: number;
    stream?: boolean;
  }
  
  /**
   * Request body for RAG API
   */
  export interface RAGRequestBody {
    query: string;
    bucketId: number;
    messages?: Array<{
      role: 'user' | 'assistant' | 'system';
      content: string;
    }>;
    config?: RAGConfig;
  }
  
  /**
   * Response from the RAG API
   */
  export interface RAGResponse {
    success: boolean;
    response?: string;
    error?: string;
    searchResults?: SearchResults;
  }
  
  /**
   * Raw search result from GroundX API
   */
  export interface RawSearchResult {
    documentId: string | number;
    fileName: string;
    score: number;
    text?: string;
    suggestedText?: string;
    pageImages?: string[];
    json?: any;
    narrative?: string;
  }
  
  /**
   * Raw search response from GroundX API
   */
  export interface RawSearchResponse {
    search: {
      count: number;
      text: string;
      results?: RawSearchResult[];
    };
  }
  
  /**
   * Enhanced message type with search results
   */
  export interface MessageWithSearchResults {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
    searchResults?: SearchResults;
  }