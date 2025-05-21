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

export interface DocumentMetadata {
  author?: string;
  datePublished?: string;
  page?: number;
  pages?: number[];
  totalPages?: number;
  sourceUrl?: string;
  sourceURL?: string;
  url?: string;
  URL?: string;
  title?: string;
  type?: string;
  mimeType?: string;
  [key: string]: any;
}

export interface XRayData {
  chunks: XRayChunk[];
  summary?: string;
  analysis?: string;
  keywords?: string | string[];
  language?: string;
}

export interface XRayChunk {
  id?: string;
  contentType?: string[];
  text?: string;
  suggestedText?: string;
  sectionSummary?: string;
  pageNumbers?: number[];
  boundingBoxes?: Array<{
    pageNumber: number;
    topLeftX: number;
    topLeftY: number;
    bottomRightX: number;
    bottomRightY: number;
  }>;
  parsedData?: {
    summary?: string;
    Summary?: string;
    keywords?: string[];
    Keywords?: string[];
    data?: any;
    Data?: any;
    [key: string]: any;
  };
  json?: any;
  narrative?: string[];
  originalText?: string;
}

export interface Source {
  id?: string;
  fileName?: string;
  title?: string;
  text?: string;
  metadata?: DocumentMetadata;
  sourceUrl?: string;
  score?: number;
  rawScore?: number;
  scoreSource?: string;
  highlights?: string[];
  hasXray?: boolean;
  excerpts?: string[];
  excerptScores?: number[];
  pageImages?: string[];
  imageLabels?: string[];
  xray?: XRayData;
  documentContext?: string;
  page?: number | string;
  isAnalyzed?: boolean;
  suggestedText?: string;
  json?: any;
  narrative?: string[];
  [key: string]: any;
}

/**
 * Search results from GroundX
 */
export interface SearchResults {
  count: number;
  sources: Source[];
  query?: string;
  queryVariants?: string[];
  totalResults?: number;
  searchTime?: number;
  searchStrategy?: string;
  relevanceThreshold?: number;
  filters?: any;
  pagination?: {
    pageSize: number;
    currentPage: number;
    totalPages: number;
  };
  searchMetadata?: Record<string, any>;
  executionContext?: any;
  analysisResults?: any;
  search?: any;
}

export interface SearchResultItem {
  documentId?: string;
  fileName?: string;
  score?: number;
  relevanceScore?: number;
  rankingScore?: number;
  text?: string;
  metadata?: DocumentMetadata;
  highlight?: {
    text?: string[];
  };
  searchData?: Record<string, any>;
  sourceUrl?: string;
  suggestedText?: string;
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
  timestamp: string;
  query?: string;
  response: string;
  thoughts?: string;
  searchResults: {
    count: number;
    sources: Source[];
  };
  executionTime?: {
    totalMs: number;
    searchMs: number;
    llmMs: number;
  };
  error?: string;
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
  metadata?: DocumentMetadata;
  highlight?: {
    text?: string[];
  };
  sourceUrl?: string;
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

// Add helper type for document excerpts
export interface DocumentExcerpt {
  id: string;
  fileName: string;
  text?: string;
  content?: string;
  metadata?: DocumentMetadata;
  page?: number | string;
  excerpts?: string[];
}

// Add Citation type
export interface Citation {
  id: string;
  fileName: string;
  index: number;
  text: string;
  url?: string;
  title?: string;
  source?: string;
  content?: string;
  page?: string | number;
}

export interface DocumentDetail {
  document?: {
    metadata?: DocumentMetadata;
    title?: string;
    fileName?: string;
    content?: string;
    mimeType?: string;
    xrayUrl?: string;
    pages?: Array<{
      pageNumber: number;
      imageUrl?: string;
      thumbnailUrl?: string;
    }>;
  };
}