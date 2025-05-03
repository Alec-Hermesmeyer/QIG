// types.ts
export interface Source {
    id: string | number;
    fileName?: string;
    title?: string;
    score?: number;
    excerpts?: string[];
    narrative?: string[];
    metadata?: Record<string, any>;
    snippets?: string[]; // For GroundX
    content?: string;    // For GroundX
    name?: string;       // For GroundX
    url?: string;        // For web sources
    datePublished?: string; // Publication date
    author?: string;     // Author information
    type?: string;       // Document type
    fileSize?: number;   // File size in bytes
    lastModified?: string; // Last modified date
    relevanceScore?: number; // Alternative score name
    confidenceScore?: number; // Confidence score
    sections?: any[];    // Document sections
    chunkId?: string;    // Chunk identifier
    pageNumbers?: number[]; // Page numbers where content appears
    embedding?: number[]; // Vector embedding if available
    documentContext?: string; // Additional context
    textContent?: string; // Extracted text content
    version?: string;    // Version information
    tags?: string[];     // Associated tags
    
    // GroundX specific properties
    text?: string;                // Original text from GroundX
    suggestedText?: string;       // Text suggested for LLM by GroundX
    sourceUrl?: string;           // Source URL for documents
    xrayUrl?: string;             // X-Ray parsing results URL
    pageUrl?: string;             // URL for page image
    multimodalUrl?: string;       // URL for multimodal processing
    boundingBoxes?: any[];        // Bounding boxes for document elements
    sectionSummary?: string;      // Auto-generated section summary
    json?: any[];                 // JSON representation of tables/figures
    fileSummary?: string;         // Auto-generated document summary
    fileKeywords?: string;        // Keywords describing the document
    language?: string;            // Detected language
    chunk?: number;               // Chunk number in GroundX
    contentType?: string[];       // Types of elements in semantic object
    searchData?: any;             // GroundX search data
    bucketId?: string;            // GroundX bucket ID
}

export interface SearchResults {
    count: number;
    sources: Source[];
    query?: string;      // The original query
    queryVariants?: string[]; // Query variations
    totalResults?: number; // Total number of results
    searchTime?: number; // Search execution time
    searchStrategy?: string; // Strategy used for search
    relevanceThreshold?: number; // Minimum relevance threshold
    filters?: any;       // Applied filters
    pagination?: {       // Pagination info
      pageSize: number;
      currentPage: number;
      totalPages: number;
    };
    searchMetadata?: Record<string, any>; // Additional search metadata
    executionContext?: any; // Execution context
    analysisResults?: any; // Analysis of search results
    search?: any; // GroundX search object
}

export interface DocumentExcerpt {
    id: string;
    fileName: string;
    excerpts: string[];
    narrative?: string[];
    metadata?: Record<string, any>;
    snippets?: string[]; // For GroundX
    content?: string;    // Full content if available
    score?: number;      // Relevance score
    name?: string;       // Alternative name field
    url?: string;        // Source URL if web content
    datePublished?: string; // Publication date
    author?: string;     // Author information
    type?: string;       // Document type
    fileSize?: number;   // File size
    lastModified?: string; // Last modified date
    relevanceScore?: number; // Alternative score name
    confidenceScore?: number; // Confidence score
    sections?: any[];    // Document sections
    chunkId?: string;    // Chunk identifier
    pageNumbers?: number[]; // Page numbers
    embedding?: number[]; // Vector embedding
    documentContext?: string; // Additional context
    textContent?: string; // Extracted text content
    version?: string;    // Version information
    tags?: string[];     // Associated tags
    highlightedText?: string[]; // Text with highlights
    matchedTerms?: string[]; // Terms matched in search
    sentiment?: string;  // Document sentiment
    language?: string;   // Document language
    classification?: string; // Document classification
    
    // GroundX specific fields
    text?: string;             // Original text from search results
    suggestedText?: string;    // Rewritten text for LLM completions
    sourceUrl?: string;        // Source document URL
    xrayUrl?: string;          // X-Ray parsing results URL
    pageUrl?: string;          // URL for the page image
    multimodalUrl?: string;    // Element image for multimodal processing
    boundingBoxes?: any[];     // Boxes containing semantic object elements
    sectionSummary?: string;   // Auto-generated section summary
    json?: any[];              // Element text in JSON format
    fileSummary?: string;      // Auto-generated document summary
    fileKeywords?: string[];   // Keywords describing the document
    fileType?: string;         // File type
    contentType?: string[];    // Types of elements in the semantic object
}

export interface Citation {
    id: string;
    fileName: string;
    text: string;
    source?: Source;
    page?: number;
    confidence?: number;
}

export interface ThoughtProcess {
    reasoning?: string;
    steps?: any[];
    sources?: any[];
    confidence?: number;
    metadata?: Record<string, any>;
}

export interface SearchInsights {
    queryAnalysis?: any;
    sourceRelevance?: any[];
    keyTerms?: string[];
    suggestedQueries?: string[];
    searchStrategy?: string;
    executionDetails?: any;
}

export interface DocumentStats {
    totalSources: number;
    uniqueAuthors: number;
    avgScore: number;
    docTypes: Record<string, number>;
    oldestDoc: { date: Date | null; source: Source | null };
    newestDoc: { date: Date | null; source: Source | null };
    totalFileSize: number;
    countByRelevance: {
        high: number;
        medium: number;
        low: number;
    };
}

export interface FeedbackData {
    rating: number;
    comment: string;
    answerIndex: number;
    timestamp: string;
}

export interface ThemeStyles {
    backgroundColor: string;
    textColor: string;
    cardBackgroundColor: string;
    borderColor: string;
    primaryColor: string;
    secondaryColor: string;
    highlightColor: string;
    [key: string]: string;
}

export interface SourceRelevanceInfo {
    relevance: string | null;
    confidence: number | null;
    matchedTerms?: string[];
    topMatches?: string[];
    explanations?: string[];
}

export interface AdvancedFilters {
    minScore: number;
    dateRange: any;
    documentTypes: string[];
    authors: string[];
}

export interface Props {
    answer: any;
    index: number;
    isSelected?: boolean;
    isStreaming: boolean;
    searchResults?: SearchResults;
    documentExcerpts?: DocumentExcerpt[];
    onCitationClicked: (filePath: string) => void;
    onThoughtProcessClicked: () => void;
    onSupportingContentClicked: () => void;
    onFollowupQuestionClicked?: (question: string) => void;
    showFollowupQuestions?: boolean; // Default to false
    onRefreshClicked?: () => void; // New: Allow refreshing
    onSourceFiltered?: (filter: any) => void; // New: Filter sources
    onExportClicked?: (format: string) => void; // New: Export functionality
    customStyles?: Record<string, any>; // New: Allow custom styling
    enableAdvancedFeatures?: boolean; // New: Toggle advanced features
    showRawData?: boolean; // New: Option to show raw data
    enableEditing?: boolean; // New: Allow editing
    theme?: 'light' | 'dark' | 'auto'; // New: Theme support
    onFeedbackSubmitted?: (feedback: FeedbackData) => void; // New: Submit feedback
    maxSourcesDisplayed?: number; // New: Control display count
    showSearchMetadata?: boolean; // New: Show search metadata
}

export interface ViewOptions {
    showMetadata: boolean;
    showScores: boolean;
    showExcerpts: boolean;
    showRelevance: boolean;
}

export interface TokenInfo {
    total: number;
    input: number;
    output: number;
    promptTokens?: number;
    completionTokens?: number;
    embeddingTokens?: number;
    totalCost?: number;
    currency?: string;
}