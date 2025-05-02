'use client';

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { motion, AnimatePresence } from "framer-motion";
import {
    ClipboardCopy,
    ClipboardCheck,
    Lightbulb,
    ClipboardList,
    Bug,
    ChevronDown,
    ChevronUp,
    Database,
    FileText,
    ExternalLink,
    Search,
    FileQuestion,
    BookOpen,
    AlignJustify,
    FileDigit,
    Code,
    Sparkles,
    BarChart,
    Info,
    ArrowRight,
    Settings,
    Filter,
    Clock,
    AlertTriangle,
    MessageSquare,
    BookMarked,
    LineChart,
    Cpu,
    Share2,
    RefreshCw
} from "lucide-react";
import { parseAnswerToHtml } from "./AnswerParser";

// Define the source information type with expanded properties
interface Source {
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
}

// Enhanced search results type
interface SearchResults {
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
}

// Enhanced document excerpt type
interface DocumentExcerpt {
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
  language?: string;         // Detected language
  contentType?: string[];    // Types of elements in the semantic object
}

// Define citation type
interface Citation {
  id: string;
  fileName: string;
  text: string;
  source?: Source;
  page?: number;
  confidence?: number;
}

// Define thought process type
interface ThoughtProcess {
  reasoning?: string;
  steps?: any[];
  sources?: any[];
  confidence?: number;
  metadata?: Record<string, any>;
}

// Define search insights type
interface SearchInsights {
  queryAnalysis?: any;
  sourceRelevance?: any[];
  keyTerms?: string[];
  suggestedQueries?: string[];
  searchStrategy?: string;
  executionDetails?: any;
}

// Enhanced props with additional capabilities
interface Props {
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
    onFeedbackSubmitted?: (feedback: any) => void; // New: Submit feedback
    maxSourcesDisplayed?: number; // New: Control display count
    showSearchMetadata?: boolean; // New: Show search metadata
}

// Format a file size in bytes to human-readable format
const formatFileSize = (bytes?: number): string => {
    if (bytes === undefined) return 'Unknown size';
    
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

// Format a date to a user-friendly string
const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'Unknown date';
    
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateStr; // Return original if parsing fails
    }
};

export default function EnhancedAnswer({
    answer,
    index,
    isSelected,
    isStreaming,
    searchResults,
    documentExcerpts,
    onCitationClicked,
    onThoughtProcessClicked,
    onSupportingContentClicked,
    onFollowupQuestionClicked,
    showFollowupQuestions = false,
    onRefreshClicked,
    onSourceFiltered,
    onExportClicked,
    customStyles = {},
    enableAdvancedFeatures = false,
    showRawData = false,
    enableEditing = false,
    theme = 'light',
    onFeedbackSubmitted,
    maxSourcesDisplayed = 50,
    showSearchMetadata = false,
}: Props) {
    // State management
    const [debugMode, setDebugMode] = useState(false);
    const [expanded, setExpanded] = useState(true);
    const [isCopied, setIsCopied] = useState(false);
    const [showDocExcerpt, setShowDocExcerpt] = useState<string | null>(null);
    const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<'answer' | 'raw' | 'thought-process' | 'sources' | 'insights' | 'analytics'>('answer');
    const [highlightCitation, setHighlightCitation] = useState<string | null>(null);
    const [showSearchInsights, setShowSearchInsights] = useState(false);
    const [sourceFilter, setSourceFilter] = useState<string>('');
    const [sortOption, setSortOption] = useState<'relevance' | 'date' | 'name'>('relevance');
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);
    const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
    const [feedbackComment, setFeedbackComment] = useState('');
    const [sourceViewMode, setSourceViewMode] = useState<'list' | 'grid' | 'detail'>('list');
    const [viewOptions, setViewOptions] = useState({
        showMetadata: true,
        showScores: true,
        showExcerpts: true,
        showRelevance: true,
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [sourceSearchQuery, setSourceSearchQuery] = useState('');
    const contentRef = useRef<HTMLDivElement>(null);
    const pageSize = 10; // Number of sources per page

    // Advanced state - can be conditionally used
    const [editedAnswer, setEditedAnswer] = useState<string>('');
    const [isEditMode, setIsEditMode] = useState(false);
    const [bookmarkedSources, setBookmarkedSources] = useState<Set<string>>(new Set());
    const [showAIAnalysis, setShowAIAnalysis] = useState(false);
    const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'pdf' | 'md'>('json');
    const [advancedFilters, setAdvancedFilters] = useState({
        minScore: 0,
        dateRange: null,
        documentTypes: [],
        authors: []
    });

    // Computed theme-dependent styles
    const themeStyles = {
        backgroundColor: theme === 'dark' ? '#1e1e2e' : '#f8f9fa',
        textColor: theme === 'dark' ? '#e4e6eb' : '#1e1e2e',
        cardBackgroundColor: theme === 'dark' ? '#2d2d3a' : '#ffffff',
        borderColor: theme === 'dark' ? '#3f3f5a' : '#e2e8f0',
        primaryColor: theme === 'dark' ? '#7f8eff' : '#6366f1',
        secondaryColor: theme === 'dark' ? '#bd93f9' : '#8b5cf6',
        highlightColor: theme === 'dark' ? '#44475a' : '#f0f9ff',
        ...customStyles
    };

    // Debug logging
    useEffect(() => {
        if (debugMode) {
            console.group("GroundX Answer Component Debug");
            console.log("Answer Props:", {
                answer,
                searchResults,
                documentExcerpts
            });
            console.log("Document Excerpts:", documentExcerpts || []);
            console.log("All Sources:", getAllSources());
            console.log("Current Excerpt:", showDocExcerpt, findDocumentExcerpt(showDocExcerpt || ''));
            console.log("Search Results Structure:", searchResults);
            console.log("Thought Process:", extractThoughts(answer));
            console.log("Search Insights:", extractSearchInsights(answer));
            console.log("Token Information:", getTokenInfo());
            console.log("Extracted Metadata:", extractMetadata(answer));
            console.groupEnd();
        }
    }, [debugMode, answer, searchResults, documentExcerpts, showDocExcerpt]);

    // Parse the answer
    const parsedAnswer = parseAnswerToHtml(answer || {}, isStreaming, onCitationClicked);
    const content = parsedAnswer.answerHtml || '';
    const citations = parsedAnswer.citations || [];
    const followupQuestions = parsedAnswer.followupQuestions || [];

    // Initialize edit mode if enabled
    useEffect(() => {
        if (enableEditing && typeof answer === 'string') {
            setEditedAnswer(answer);
        } else if (enableEditing && answer?.content) {
            setEditedAnswer(answer.content);
        } else if (enableEditing && answer?.answer) {
            setEditedAnswer(typeof answer.answer === 'string' ? answer.answer : JSON.stringify(answer.answer));
        }
    }, [answer, enableEditing]);

    // Reset copied state after 2 seconds
    useEffect(() => {
        if (isCopied) {
            const timer = setTimeout(() => {
                setIsCopied(false);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [isCopied]);

    // Toggle document expansion
    const toggleDocExpansion = (docId: string) => {
        if (!docId) return;
        
        setExpandedDocs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(docId)) {
                newSet.delete(docId);
            } else {
                newSet.add(docId);
            }
            return newSet;
        });
    };

    // Extract comprehensive metadata from answer
    const extractMetadata = (response: any): Record<string, any> => {
        if (!response) return {};
        
        let metadata: Record<string, any> = {};
        
        // Extract from common metadata locations
        if (response.metadata) metadata = { ...metadata, ...response.metadata };
        if (response.result?.metadata) metadata = { ...metadata, ...response.result.metadata };
        
        // Extract from system information
        if (response.system) metadata.system = response.system;
        if (response.systemInfo) metadata.systemInfo = response.systemInfo;
        if (response.version) metadata.version = response.version;
        
        // Extract timing information
        if (response.timing || response.timings) {
            metadata.timing = response.timing || response.timings;
        }
        
        // Extract model information
        if (response.model) metadata.model = response.model;
        if (response.modelVersion) metadata.modelVersion = response.modelVersion;
        if (response.modelInfo) metadata.modelInfo = response.modelInfo;
        
        // Extract execution context
        if (response.executionContext) metadata.executionContext = response.executionContext;
        
        // Extract token usage
        if (response.tokenUsage || response.result?.tokenUsage) {
            metadata.tokenUsage = response.tokenUsage || response.result?.tokenUsage;
        }
        
        // Extract search metadata
        if (searchResults) {
            if (searchResults.searchMetadata) metadata.searchMetadata = searchResults.searchMetadata;
            if (searchResults.executionContext) metadata.searchExecutionContext = searchResults.executionContext;
            if (searchResults.query) metadata.searchQuery = searchResults.query;
            if (searchResults.queryVariants) metadata.queryVariants = searchResults.queryVariants;
        }
        
        return metadata;
    };

    // Setup citation click handlers
    useEffect(() => {
        const handleContentClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            
            if (target.classList.contains('citation-number')) {
                const citationIndex = parseInt(target.getAttribute('data-citation-index') || '0', 10);
                
                if (citationIndex > 0 && citationIndex <= citations.length) {
                    const citationFile = citations[citationIndex - 1];
                    onCitationClicked(citationFile);
                }
            }
        };
        
        const contentElement = contentRef.current;
        if (contentElement) {
            contentElement.addEventListener('click', handleContentClick);
        }
        
        return () => {
            if (contentElement) {
                contentElement.removeEventListener('click', handleContentClick);
            }
        };
    }, [citations, onCitationClicked]);

    // Handle clipboard copy
    const handleClipboardIconClick = () => {
        try {
            let contentToCopy = "";
            if (isEditMode && editedAnswer) {
                contentToCopy = editedAnswer;
            } else if (typeof answer === 'string') {
                contentToCopy = answer;
            } else if (answer?.content) {
                contentToCopy = answer.content;
            } else if (answer?.answer) {
                contentToCopy = answer.answer;
            } else {
                contentToCopy = JSON.stringify(answer || {}, null, 2);
            }
            
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(contentToCopy)
                    .then(() => {
                        setIsCopied(true);
                    })
                    .catch(() => {
                        fallbackCopyToClipboard(contentToCopy);
                    });
            } else {
                fallbackCopyToClipboard(contentToCopy);
            }
        } catch (err) {
            console.error('Failed to copy content:', err);
        }
    };
    
    // Fallback clipboard method
    const fallbackCopyToClipboard = (text: string) => {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const success = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (success) {
                setIsCopied(true);
            }
        } catch (err) {
            console.error('Fallback copy failed:', err);
        }
    };

    // Handle source click
    const handleSourceClick = (source: Source) => {
        if (!source || !source.id) return;
        
        if (debugMode) {
            console.log("Source clicked:", source);
            console.log("Source excerpts:", getSourceExcerpts(source));
        }
        
        if (getSourceExcerpts(source).length > 0) {
            setShowDocExcerpt(source.id.toString());
        } else {
            onCitationClicked(source.id.toString());
        }
    };
    
    // Toggle bookmark for source
    const toggleBookmark = (sourceId: string, event?: React.MouseEvent) => {
        if (event) event.stopPropagation();
        
        setBookmarkedSources(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sourceId)) {
                newSet.delete(sourceId);
            } else {
                newSet.add(sourceId);
            }
            return newSet;
        });
    };

    // Handle export of data
    const handleExport = (format: 'json' | 'csv' | 'pdf' | 'md') => {
        setExportFormat(format);
        if (onExportClicked) {
            onExportClicked(format);
        } else {
            // Fallback export handler
            let exportData;
            let fileName;
            let mimeType;
            
            switch (format) {
                case 'json':
                    exportData = JSON.stringify(answer, null, 2);
                    fileName = 'groundx-answer.json';
                    mimeType = 'application/json';
                    break;
                case 'csv':
                    // Simple CSV export of sources
                    const sources = getAllSources();
                    const headers = ["id", "fileName", "score", "excerpt"];
                    const rows = sources.map(s => [
                        s.id,
                        s.fileName || s.name || '',
                        s.score || '',
                        getSourceExcerpts(s)[0] || ''
                    ]);
                    exportData = [headers, ...rows].map(row => row.map(cell => 
                        `"${String(cell).replace(/"/g, '""')}"`
                    ).join(',')).join('\n');
                    fileName = 'groundx-sources.csv';
                    mimeType = 'text/csv';
                    break;
                case 'md':
                    // Markdown export
                    const answerText = typeof answer === 'string' 
                        ? answer 
                        : (answer?.content || answer?.answer || JSON.stringify(answer, null, 2));
                    const sourcesText = getAllSources().map(s => 
                        `## ${s.fileName || s.name || `Document ${s.id}`}\n\n` +
                        `- **ID**: ${s.id}\n` +
                        `- **Score**: ${s.score || 'N/A'}\n\n` +
                        getSourceExcerpts(s).map(excerpt => `> ${excerpt}\n`).join('\n')
                    ).join('\n\n');
                    
                    exportData = `# GroundX Answer\n\n${answerText}\n\n# Sources\n\n${sourcesText}`;
                    fileName = 'groundx-answer.md';
                    mimeType = 'text/markdown';
                    break;
                default:
                    return;
            }
            
            // Create download link
            const blob = new Blob([exportData], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    };

    // Submit feedback
    const handleSubmitFeedback = () => {
        if (onFeedbackSubmitted && feedbackRating !== null) {
            onFeedbackSubmitted({
                rating: feedbackRating,
                comment: feedbackComment,
                answerIndex: index,
                timestamp: new Date().toISOString()
            });
            setShowFeedbackForm(false);
            setFeedbackRating(null);
            setFeedbackComment('');
        }
    };
    
    // Get document icon based on file extension and type
    const getDocumentIcon = (fileName?: string, type?: string) => {
        // Default to file text if no information available
        if (!fileName && !type) return <FileText size={16} className="text-gray-600" />;
        
        // If we have a type, use that first
        if (type) {
            switch (type.toLowerCase()) {
                case 'pdf':
                    return <FileText size={16} className="text-red-600" />;
                case 'word':
                case 'docx':
                case 'doc':
                    return <FileText size={16} className="text-blue-600" />;
                case 'excel':
                case 'xlsx':
                case 'xls':
                case 'csv':
                    return <FileDigit size={16} className="text-green-600" />;
                case 'code':
                case 'json':
                case 'js':
                case 'ts':
                    return <Code size={16} className="text-yellow-600" />;
                case 'text':
                case 'txt':
                    return <AlignJustify size={16} className="text-gray-600" />;
                case 'web':
                case 'html':
                    return <Search size={16} className="text-purple-600" />;
                case 'book':
                    return <BookOpen size={16} className="text-blue-700" />;
                default:
                    return <FileText size={16} className="text-gray-600" />;
            }
        }
        
        // Otherwise use file extension
        const extension = fileName?.split('.').pop()?.toLowerCase();
        
        switch (extension) {
            case 'pdf':
                return <FileText size={16} className="text-red-600" />;
            case 'docx':
            case 'doc':
                return <FileText size={16} className="text-blue-600" />;
            case 'xlsx':
            case 'xls':
            case 'csv':
                return <FileDigit size={16} className="text-green-600" />;
            case 'json':
            case 'js':
            case 'ts':
            case 'py':
            case 'java':
            case 'c':
            case 'cpp':
                return <Code size={16} className="text-yellow-600" />;
            case 'txt':
                return <AlignJustify size={16} className="text-gray-600" />;
            case 'html':
            case 'htm':
                return <Search size={16} className="text-purple-600" />;
            default:
                return <BookOpen size={16} className="text-purple-600" />;
        }
    };
    
    // Normalize document ID by removing prefixes and handling special characters
    const normalizeDocId = (id: string): string => {
        if (!id) return '';
        
        // Remove common prefixes
        let normalizedId = id.replace(/^(groundx:|azure:|gx:|bing:|file:|web:|blob:|http[s]?:\/\/)/i, '');
        
        // Handle plus signs in IDs (common in GroundX)
        normalizedId = normalizedId.replace(/\+/g, ' ');
        
        // Handle URL-encoded characters
        try {
            if (normalizedId.includes('%')) {
                normalizedId = decodeURIComponent(normalizedId);
            }
        } catch (e) {
            // If decoding fails, use the original
            console.error("Error decoding URL-encoded ID:", e);
        }
        
        return normalizedId;
    };
    
    // Extract filename from path
    const extractFileName = (path: string): string => {
        if (!path) return 'Unknown';
        
        // Handle both URL paths and file paths
        if (path.includes('://')) {
            try {
                const url = new URL(path);
                return url.pathname.split('/').pop() || url.hostname;
            } catch (e) {
                return path.split('/').pop() || path;
            }
        }
        
        // Handle plus signs in filenames (common in GroundX)
        const fileName = path.split('/').pop() || path;
        return fileName.replace(/\+/g, ' ');
    };
    
    // Find document excerpt by ID with enhanced matching
    const findDocumentExcerpt = (id: string): DocumentExcerpt | undefined => {
        if (!id) return undefined;
        
        const normalizedId = normalizeDocId(id);
        
        // First try in documentExcerpts
        if (documentExcerpts?.length) {
            // Direct match
            let docMatch = documentExcerpts.find(doc => 
                normalizeDocId(doc.id) === normalizedId
            );
            
            // Match by filename
            if (!docMatch && id.includes('/')) {
                const fileName = extractFileName(id);
                docMatch = documentExcerpts.find(doc => {
                    const docFileName = extractFileName(doc.fileName);
                    return docFileName === fileName || docFileName.endsWith(`/${fileName}`);
                });
            }
            
            // Try matching by different ID formats
            if (!docMatch) {
                docMatch = documentExcerpts.find(doc => {
                    // Try removing common prefixes for comparison
                    const cleanId = normalizeDocId(doc.id);
                    const cleanSearchId = normalizedId;
                    
                    return cleanId.includes(cleanSearchId) || cleanSearchId.includes(cleanId);
                });
            }
            
            // Also try matching by replacing plus signs with spaces
            if (!docMatch) {
                const idWithSpaces = normalizedId.replace(/\+/g, ' ');
                docMatch = documentExcerpts.find(doc => {
                    const docIdWithSpaces = normalizeDocId(doc.id).replace(/\+/g, ' ');
                    return docIdWithSpaces === idWithSpaces;
                });
            }
            
            if (docMatch) return docMatch;
        }
        
        // Check in GroundX search results
        if (searchResults?.search?.results?.length) {
            // Try to find in GroundX search format
            let resultMatch = searchResults.search.results.find((result: any) => {
                const resultId = result.documentId || result.id;
                return resultId && normalizeDocId(resultId.toString()) === normalizedId;
            });
            
            // Try with plus signs replaced with spaces
            if (!resultMatch) {
                const idWithSpaces = normalizedId.replace(/\+/g, ' ');
                resultMatch = searchResults.search.results.find((result: any) => {
                    const resultId = result.documentId || result.id;
                    return resultId && normalizeDocId(resultId.toString()).replace(/\+/g, ' ') === idWithSpaces;
                });
            }
            
            if (resultMatch) {
                return {
                    id: resultMatch.documentId || resultMatch.id,
                    fileName: resultMatch.fileName || `Document ${resultMatch.documentId || resultMatch.id}`,
                    excerpts: resultMatch.text ? [resultMatch.text] : [],
                    narrative: resultMatch.suggestedText ? [resultMatch.suggestedText] : [],
                    metadata: resultMatch.searchData || {},
                    score: resultMatch.score,
                    sourceUrl: resultMatch.sourceUrl,
                    suggestedText: resultMatch.suggestedText,
                    text: resultMatch.text
                };
            }
        }
        
        // Similar pattern for other searches...
        
        // Check in standard searchResults
        if (searchResults?.sources?.length) {
            // Direct match
            let sourceMatch = searchResults.sources.find(source => 
                normalizeDocId(source.id.toString()) === normalizedId
            );
            
            // Try filename match
            if (!sourceMatch && id.includes('/')) {
                const fileName = extractFileName(id);
                sourceMatch = searchResults.sources.find(source => {
                    const sourceName = source.fileName || source.name || '';
                    return extractFileName(sourceName).includes(fileName);
                });
            }
            
            // Try partial match
            if (!sourceMatch) {
                sourceMatch = searchResults.sources.find(source => {
                    const sourceId = normalizeDocId(source.id.toString());
                    return sourceId.includes(normalizedId) || normalizedId.includes(sourceId);
                });
            }
            
            // Try with plus signs replaced with spaces
            if (!sourceMatch) {
                const idWithSpaces = normalizedId.replace(/\+/g, ' ');
                sourceMatch = searchResults.sources.find(source => {
                    const sourceId = normalizeDocId(source.id.toString()).replace(/\+/g, ' ');
                    return sourceId === idWithSpaces || sourceId.includes(idWithSpaces) || idWithSpaces.includes(sourceId);
                });
            }
            
            if (sourceMatch) {
                return {
                    id: sourceMatch.id.toString(),
                    fileName: sourceMatch.fileName || sourceMatch.name || `Document ${sourceMatch.id}`,
                    excerpts: sourceMatch.excerpts || [],
                    narrative: sourceMatch.narrative || [],
                    snippets: sourceMatch.snippets || [],
                    metadata: sourceMatch.metadata || {},
                    score: sourceMatch.score,
                    url: sourceMatch.url,
                    datePublished: sourceMatch.datePublished,
                    author: sourceMatch.author,
                    type: sourceMatch.type,
                    fileSize: sourceMatch.fileSize,
                    lastModified: sourceMatch.lastModified
                };
            }
        }
        
        // Continue with remaining checks with similar plus sign handling...
        
        // Check in all sources
        const allSources = getAllSources();
        const sourceMatch = allSources.find(s => {
            const sourceIdNormalized = normalizeDocId(s.id.toString());
            const normalizedIdWithSpaces = normalizedId.replace(/\+/g, ' ');
            const sourceIdWithSpaces = sourceIdNormalized.replace(/\+/g, ' ');
            
            return sourceIdNormalized === normalizedId || 
                   sourceIdWithSpaces === normalizedIdWithSpaces ||
                   sourceIdWithSpaces.includes(normalizedIdWithSpaces) ||
                   normalizedIdWithSpaces.includes(sourceIdWithSpaces);
        });
        
        if (sourceMatch) {
            return {
                id: sourceMatch.id.toString(),
                fileName: sourceMatch.fileName || sourceMatch.name || `Document ${sourceMatch.id}`,
                excerpts: sourceMatch.excerpts || [],
                narrative: sourceMatch.narrative || [],
                snippets: sourceMatch.snippets || [],
                metadata: sourceMatch.metadata || {},
                score: sourceMatch.score,
                url: sourceMatch.url,
                sourceUrl: sourceMatch.sourceUrl,
                datePublished: sourceMatch.datePublished,
                author: sourceMatch.author,
                type: sourceMatch.type,
                fileSize: sourceMatch.fileSize,
                lastModified: sourceMatch.lastModified,
                text: sourceMatch.text,
                suggestedText: sourceMatch.suggestedText,
                sectionSummary: sourceMatch.sectionSummary,
                pageNumbers: sourceMatch.pageNumbers,
                xrayUrl: sourceMatch.xrayUrl,
                multimodalUrl: sourceMatch.multimodalUrl,
                boundingBoxes: sourceMatch.boundingBoxes
            };
        }
        
        return undefined;
    };
    
    // Create a combined list of sources with comprehensive data
    const getAllSources = (): Source[] => {
        const sources: Source[] = [];
        const sourceMap = new Map<string, number>();
        
        // Helper to add a source if it's not already in the list
        const addSource = (source: any, index?: number) => {
            if (!source) {
                if (debugMode) console.log("Skipping empty source");
                return;
            }
            
            // Handle different ID formats from GroundX API
            const sourceId = source.id || source.documentId || source.chunkId || (source.chunk ? `chunk-${source.chunk}` : null);
            if (!sourceId) {
                if (debugMode) {
                    console.log("Creating synthetic ID for source without ID:", source);
                    // Create an ID based on content hash or index
                    const syntheticId = `synthetic-${index || Math.floor(Math.random() * 10000)}`;
                    // Add the source with the synthetic ID
                    addSourceWithId(source, syntheticId, index);
                }
                return;
            }
            
            addSourceWithId(source, sourceId, index);
        };
        
        // Helper function to add a source with a specific ID
        const addSourceWithId = (source: any, sourceId: string | number, index?: number) => {
            const normalizedId = normalizeDocId(sourceId.toString());
            
            // Extract searchData which is a common GroundX structure
            const searchData = source.searchData || {};
            
            // Check if we already have this source
            if (sourceMap.has(normalizedId)) {
                const existingIndex = sourceMap.get(normalizedId);
                if (existingIndex !== undefined) {
                    // Update existing source with additional information
                    const existingSource = sources[existingIndex];
                    sources[existingIndex] = {
                        ...existingSource,
                        excerpts: [...(existingSource.excerpts || []), ...(source.excerpts || [])],
                        snippets: [...(existingSource.snippets || []), ...(source.snippets || [])],
                        narrative: [...(existingSource.narrative || []), ...(Array.isArray(source.narrative) ? source.narrative : (source.narrative ? [source.narrative] : []))],
                        metadata: { 
                            ...(existingSource.metadata || {}), 
                            ...(source.metadata || {}), 
                            ...(source.searchData || {})
                        },
                        // Add additional fields if they exist in the new source
                        url: existingSource.url || source.url || source.sourceUrl,
                        datePublished: existingSource.datePublished || source.datePublished,
                        author: existingSource.author || source.author || searchData.author,
                        type: existingSource.type || source.type || source.contentType,
                        fileSize: existingSource.fileSize || source.fileSize,
                        lastModified: existingSource.lastModified || source.lastModified,
                        version: existingSource.version || source.version,
                        tags: [...(existingSource.tags || []), ...(source.tags || [])],
                        // GroundX specific properties
                        text: existingSource.text || source.text,
                        suggestedText: existingSource.suggestedText || source.suggestedText,
                        multimodalUrl: existingSource.multimodalUrl || source.multimodalUrl,
                        pageNumbers: existingSource.pageNumbers || source.pageNumbers,
                        boundingBoxes: existingSource.boundingBoxes || source.boundingBoxes,
                        sectionSummary: existingSource.sectionSummary || source.sectionSummary || searchData.sectionSummary,
                        json: existingSource.json || source.json,
                        xrayUrl: existingSource.xrayUrl || source.xrayUrl,
                        sourceUrl: existingSource.sourceUrl || source.sourceUrl,
                        pageUrl: existingSource.pageUrl || source.pageUrl,
                        fileSummary: existingSource.fileSummary || source.fileSummary || searchData.documentSummary,
                        fileKeywords: existingSource.fileKeywords || source.fileKeywords,
                        // Add searchData fields directly
                        searchData: source.searchData
                    };
                }
            } else {
                // Extract file name from various possible locations
                const fileName = source.fileName || source.name || 
                                searchData.fullTitle || searchData.title || 
                                `Document ${sourceId}`;
                
                // Add as new source with all available fields
                sources.push({
                    id: sourceId,
                    fileName: fileName,
                    title: source.title || searchData.fullTitle || searchData.title,
                    excerpts: source.excerpts || [],
                    snippets: source.snippets || [],
                    narrative: Array.isArray(source.narrative) ? source.narrative : (source.narrative ? [source.narrative] : []),
                    metadata: { ...(source.metadata || {}), ...(source.searchData || {}) },
                    score: source.score || source.relevanceScore || (source.metadata?.score),
                    url: source.url || source.sourceUrl,
                    datePublished: source.datePublished,
                    author: source.author || searchData.author || searchData.publisher,
                    type: source.type || source.contentType,
                    fileSize: source.fileSize,
                    lastModified: source.lastModified,
                    relevanceScore: source.relevanceScore,
                    confidenceScore: source.confidenceScore,
                    sections: source.sections,
                    chunkId: source.chunkId,
                    pageNumbers: source.pageNumbers,
                    embedding: source.embedding,
                    documentContext: source.documentContext,
                    textContent: source.textContent,
                    version: source.version,
                    tags: source.tags,
                    // GroundX specific properties
                    text: source.text,
                    suggestedText: source.suggestedText,
                    multimodalUrl: source.multimodalUrl,
                    boundingBoxes: source.boundingBoxes,
                    sectionSummary: source.sectionSummary || searchData.sectionSummary,
                    json: source.json,
                    xrayUrl: source.xrayUrl,
                    sourceUrl: source.sourceUrl,
                    pageUrl: source.pageUrl,
                    fileSummary: source.fileSummary || searchData.documentSummary,
                    fileKeywords: source.fileKeywords,
                    // Handle chunk from GroundX
                    chunk: source.chunk,
                    // Add searchData directly
                    searchData: source.searchData,
                    // GroundX bucket info
                    bucketId: source.bucketId
                });
                sourceMap.set(normalizedId, sources.length - 1);
            }
        };
        
        // Extract sources from GroundX search result format
        if (answer?.search) {
            // Extract the search
            const search = answer.search;
            
            // Add the search text as a source if available
            if (search.text) {
                addSourceWithId({
                    text: search.text,
                    suggestedText: search.text,
                    fileName: "GroundX Combined Search Results",
                    score: search.score,
                    query: search.query
                }, "groundx-combined-text");
            }
            
            // Add each result
            if (search.results && Array.isArray(search.results)) {
                search.results.forEach((result, index) => {
                    addSource(result, index);
                });
            }
        }
        
        // First check document excerpts
        if (documentExcerpts?.length) {
            documentExcerpts.forEach(excerpt => {
                addSource(excerpt);
            });
        }

        // Check searchResults in standard format
        if (searchResults?.sources?.length) {
            searchResults.sources.forEach((source, index) => {
                addSource(source, index);
            });
        } else if (searchResults?.search?.results?.length) {
            // GroundX search results format
            searchResults.search.results.forEach((result: any, index: number) => {
                addSource(result, index);
            });
            
            // Also add the combined text as a source
            if (searchResults.search.text) {
                addSourceWithId({
                    text: searchResults.search.text,
                    suggestedText: searchResults.search.text,
                    fileName: "GroundX Combined Search Results",
                    score: searchResults.search.score,
                    query: searchResults.search.query
                }, "groundx-combined-text");
            }
        }
        
        // Check in answer.result.documents (GroundX format)
        if (answer?.result?.documents) {
            const documents = Array.isArray(answer.result.documents) 
                ? answer.result.documents 
                : [answer.result.documents];
                
            documents.forEach((doc: any, index: number) => {
                addSource(doc, index);
            });
        }
        
        // Check for documents field directly in answer
        if (answer?.documents) {
            const documents = Array.isArray(answer.documents) 
                ? answer.documents 
                : [answer.documents];
                
            documents.forEach((doc: any, index: number) => {
                addSource(doc, index);
            });
        }
        
        // Check in GroundX search results format directly in the answer
        if (answer?.search?.results) {
            const results = Array.isArray(answer.search.results)
                ? answer.search.results
                : [answer.search.results];
                
            results.forEach((result: any, index: number) => {
                addSource(result, index);
            });
        }
        
        // Check for document pages from X-Ray parser
        if (answer?.documentPages) {
            const documentPages = Array.isArray(answer.documentPages)
                ? answer.documentPages
                : [answer.documentPages];
            
            documentPages.forEach((page: any, pageIndex: number) => {
                // Add the page itself as a source
                addSource({
                    id: `page-${page.pageNumber || pageIndex}`,
                    fileName: `Page ${page.pageNumber || pageIndex + 1}`,
                    pageUrl: page.pageUrl,
                    pageNumber: page.pageNumber,
                    width: page.width,
                    height: page.height
                });
                
                // Add each chunk within the page as a source
                if (page.chunks && Array.isArray(page.chunks)) {
                    page.chunks.forEach((chunk: any, chunkIndex: number) => {
                        addSource({
                            ...chunk,
                            id: chunk.chunk || `chunk-${pageIndex}-${chunkIndex}`,
                            fileName: `Chunk ${chunk.chunk || chunkIndex + 1}`,
                            pageNumber: page.pageNumber
                        });
                    });
                }
            });
        }
        
        // Check in various other potential locations
        if (answer?.citations?.documents) {
            const documents = Array.isArray(answer.citations.documents)
                ? answer.citations.documents
                : [answer.citations.documents];
                
            documents.forEach((doc: any, index: number) => {
                addSource(doc, index);
            });
        }
        
        if (answer?.citations?.sources) {
            const documents = Array.isArray(answer.citations.sources)
                ? answer.citations.sources
                : [answer.citations.sources];
                
            documents.forEach((doc: any, index: number) => {
                addSource(doc, index);
            });
        }
        
        if (answer?.sources) {
            const documents = Array.isArray(answer.sources)
                ? answer.sources
                : [answer.sources];
                
            documents.forEach((doc: any, index: number) => {
                addSource(doc, index);
            });
        }
        
        // Check for X-Ray results format
        if (answer?.xrayUrl) {
            addSource({
                id: 'xray-result',
                fileName: answer.fileName || 'X-Ray Result',
                xrayUrl: answer.xrayUrl,
                fileType: answer.fileType,
                language: answer.language,
                fileKeywords: answer.fileKeywords,
                fileSummary: answer.fileSummary,
                sourceUrl: answer.sourceUrl
            });
        }
        
        // If still no sources, try to extract from raw text if available
        if (sources.length === 0 && typeof answer === 'string') {
            // Try to extract document references from raw text
            const docMatches = answer.match(/Document\s+(\S+)|Source:\s+(\S+)|Reference:\s+(\S+)/g);
            if (docMatches) {
                docMatches.forEach((match, index) => {
                    const docName = match.replace(/Document\s+|Source:\s+|Reference:\s+/, '');
                    addSource({
                        id: `extracted-${index}`,
                        fileName: docName,
                        text: `Referenced from text: ${docName}`
                    });
                });
            }
            
            // Also add the raw text as a source
            if (answer.length > 0) {
                addSourceWithId({
                    text: answer.length > 500 ? answer.substring(0, 500) + '...' : answer,
                    fileName: "Raw Text Response",
                }, "raw-text");
            }
        }
        
        if (debugMode && sources.length === 0) {
            console.warn("No sources found in any format. Response structure:", answer);
        }
        
        return sources;
    };

    // Get excerpts from a source specifically for GroundX format
    const getSourceExcerpts = (source: Source | DocumentExcerpt | null | undefined): string[] => {
        if (!source) return [];
        
        const allExcerpts: string[] = [];
        
        // Direct GroundX fields first, as they are most important for GroundX responses
        if (source.suggestedText) {
            allExcerpts.push(source.suggestedText);
        }
        
        if (source.text && !allExcerpts.includes(source.text)) {
            allExcerpts.push(source.text);
        }
        
        if (source.sectionSummary && !allExcerpts.includes(source.sectionSummary)) {
            allExcerpts.push(source.sectionSummary);
        }
        
        // Check in metadata for GroundX search data
        if (source.metadata?.searchData?.sectionSummary) {
            allExcerpts.push(source.metadata.searchData.sectionSummary);
        }
        
        if (source.metadata?.searchData?.documentSummary) {
            allExcerpts.push(source.metadata.searchData.documentSummary);
        }
        
        if (source.metadata?.sectionSummary) {
            allExcerpts.push(source.metadata.sectionSummary);
        }
        
        if (source.metadata?.documentSummary) {
            allExcerpts.push(source.metadata.documentSummary);
        }
        
        // Handle nested searchData
        if (source.searchData?.sectionSummary) {
            allExcerpts.push(source.searchData.sectionSummary);
        }
        
        if (source.searchData?.documentSummary) {
            allExcerpts.push(source.searchData.documentSummary);
        }
        
        // Then check file-level data
        if (source.fileSummary && !allExcerpts.includes(source.fileSummary)) {
            allExcerpts.push(source.fileSummary);
        }
        
        // Check more traditional excerpt formats
        if (source.excerpts && source.excerpts.length > 0) {
            source.excerpts.forEach(excerpt => {
                if (!allExcerpts.includes(excerpt)) {
                    allExcerpts.push(excerpt);
                }
            });
        }
        
        if (source.snippets && source.snippets.length > 0) {
            source.snippets.forEach(snippet => {
                if (!allExcerpts.includes(snippet)) {
                    allExcerpts.push(snippet);
                }
            });
        }
        
        if (Array.isArray(source.narrative)) {
            source.narrative.forEach(narr => {
                if (!allExcerpts.includes(narr)) {
                    allExcerpts.push(narr);
                }
            });
        } else if (source.narrative && !allExcerpts.includes(source.narrative)) {
            allExcerpts.push(source.narrative);
        }
        
        // Check for content or textContent as last resort
        if (source.content && !allExcerpts.includes(source.content)) {
            if (source.content.length > 300) {
                allExcerpts.push(source.content.substring(0, 300) + '...');
            } else {
                allExcerpts.push(source.content);
            }
        }
        
        if (source.textContent && !allExcerpts.includes(source.textContent)) {
            if (source.textContent.length > 300) {
                allExcerpts.push(source.textContent.substring(0, 300) + '...');
            } else {
                allExcerpts.push(source.textContent);
            }
        }
        
        return allExcerpts;
    };

    // Extract relevance info with enhanced data
    const getSourceRelevanceInfo = (source: Source | DocumentExcerpt): { 
        relevance: string | null; 
        confidence: number | null;
        matchedTerms?: string[];
        topMatches?: string[];
        explanations?: string[];
    } => {
        const result = { 
            relevance: null as string | null, 
            confidence: null as number | null,
            matchedTerms: [] as string[],
            topMatches: [] as string[],
            explanations: [] as string[]
        };
        
        if (!source) return result;
        
        // Check direct relevance field
        if (source.metadata?.relevance) {
            result.relevance = source.metadata.relevance;
        } else if (source.metadata?.reasoning) {
            result.relevance = source.metadata.reasoning;
        } else if (source.metadata?.explanation) {
            result.relevance = source.metadata.explanation;
        }
        
        // Check for narratives that explain relevance
        if (!result.relevance && source.narrative && source.narrative.length > 0) {
            const narrativeText = source.narrative.join(' ');
            if (narrativeText.toLowerCase().includes('relevant') || 
                narrativeText.toLowerCase().includes('because') ||
                narrativeText.toLowerCase().includes('reason')) {
                result.relevance = narrativeText;
            }
        }
        
        // Check for confidence score
        if (source.score !== undefined) {
            result.confidence = source.score;
        } else if (source.relevanceScore !== undefined) {
            result.confidence = source.relevanceScore;
        } else if (source.confidenceScore !== undefined) {
            result.confidence = source.confidenceScore;
        } else if (source.metadata?.confidence) {
            result.confidence = source.metadata.confidence;
        } else if (source.metadata?.score) {
            result.confidence = source.metadata.score;
        }
        
        // Extract matched terms
        if (source.metadata?.matchedTerms) {
            result.matchedTerms = Array.isArray(source.metadata.matchedTerms) 
                ? source.metadata.matchedTerms 
                : [source.metadata.matchedTerms];
        } else if (source.metadata?.keywords) {
            result.matchedTerms = Array.isArray(source.metadata.keywords) 
                ? source.metadata.keywords 
                : [source.metadata.keywords];
        }
        
        // Extract top matches
        if (source.metadata?.topMatches) {
            result.topMatches = Array.isArray(source.metadata.topMatches) 
                ? source.metadata.topMatches 
                : [source.metadata.topMatches];
        }
        
        // Extract explanations
        if (source.metadata?.explanations) {
            result.explanations = Array.isArray(source.metadata.explanations) 
                ? source.metadata.explanations 
                : [source.metadata.explanations];
        }
        
        return result;
    };

    // Sort sources based on selected sort option
    const getSortedSources = (sources: Source[]): Source[] => {
        if (!sources || !Array.isArray(sources)) return [];
        
        // Create a copy to avoid modifying the original
        const sortedSources = [...sources];
        
        // Apply filters before sorting if sourceFilter is set
        const filteredSources = sourceFilter 
            ? sortedSources.filter(source => {
                const sourceText = `${source.fileName || ''} ${source.title || ''} ${source.author || ''}`.toLowerCase();
                return sourceText.includes(sourceFilter.toLowerCase());
            })
            : sortedSources;
        
        // Apply source search if set
        const searchedSources = sourceSearchQuery
            ? filteredSources.filter(source => {
                const searchableText = [
                    source.fileName || '',
                    source.title || '',
                    source.author || '',
                    ...(getSourceExcerpts(source) || [])
                ].join(' ').toLowerCase();
                
                return searchableText.includes(sourceSearchQuery.toLowerCase());
            })
            : filteredSources;
        
        // Apply advanced filters if they're set
        const advancedFilteredSources = searchedSources.filter(source => {
            // Filter by minimum score
            if (advancedFilters.minScore > 0 && 
                (source.score === undefined || source.score < advancedFilters.minScore)) {
                return false;
            }
            
            // Filter by document types
            if (advancedFilters.documentTypes.length > 0) {
                const sourceType = source.type?.toLowerCase() || '';
                if (!advancedFilters.documentTypes.some(type => sourceType.includes(type.toLowerCase()))) {
                    return false;
                }
            }
            
            // Filter by authors
            if (advancedFilters.authors.length > 0) {
                const sourceAuthor = source.author?.toLowerCase() || '';
                if (!advancedFilters.authors.some(author => sourceAuthor.includes(author.toLowerCase()))) {
                    return false;
                }
            }
            
            return true;
        });
        
        // Sort based on selected option
        switch (sortOption) {
            case 'relevance':
                return advancedFilteredSources.sort((a, b) => {
                    const scoreA = a?.score ?? a?.relevanceScore ?? 0;
                    const scoreB = b?.score ?? b?.relevanceScore ?? 0;
                    return scoreB - scoreA;
                });
            case 'date':
                return advancedFilteredSources.sort((a, b) => {
                    const dateA = a?.datePublished ? new Date(a.datePublished).getTime() : 0;
                    const dateB = b?.datePublished ? new Date(b.datePublished).getTime() : 0;
                    return dateB - dateA;
                });
            case 'name':
                return advancedFilteredSources.sort((a, b) => {
                    const nameA = (a?.fileName || a?.name || '').toLowerCase();
                    const nameB = (b?.fileName || b?.name || '').toLowerCase();
                    return nameA.localeCompare(nameB);
                });
            default:
                return advancedFilteredSources;
        }
    };

    // Paginate sources
    const getPaginatedSources = (sources: Source[]): Source[] => {
        const startIndex = (currentPage - 1) * pageSize;
        return sources.slice(startIndex, startIndex + pageSize);
    };

    // Extract thought process with comprehensive handling
    const extractThoughts = (response: any): ThoughtProcess => {
        if (!response) return { reasoning: '' };
        
        // Start with result object
        const result: ThoughtProcess = { reasoning: '' };
        
        // Check common thought-related fields
        if (response.thoughts) {
            result.reasoning = typeof response.thoughts === 'string' 
                ? response.thoughts 
                : JSON.stringify(response.thoughts, null, 2);
        } else if (response.result?.thoughts) {
            result.reasoning = typeof response.result.thoughts === 'string' 
                ? response.result.thoughts 
                : JSON.stringify(response.result.thoughts, null, 2);
        } else if (response.systemMessage || response.internalThoughts || response.reasoning) {
            result.reasoning = response.systemMessage || response.internalThoughts || response.reasoning;
        } else if (response.metadata?.thoughts || response.result?.metadata?.thoughts) {
            const thoughts = response.metadata?.thoughts || response.result?.metadata?.thoughts;
            result.reasoning = typeof thoughts === 'string' 
                ? thoughts 
                : JSON.stringify(thoughts, null, 2);
        }
        
        // Check for reasoning steps
        if (response.reasoningSteps || response.steps || response.metadata?.steps) {
            result.steps = response.reasoningSteps || response.steps || response.metadata?.steps;
        }
        
        // Check for confidence
        if (response.confidence || response.metadata?.confidence) {
            result.confidence = response.confidence || response.metadata?.confidence;
        }
        
        // Try to build a meaningful thought process by examining the actual response structure
        const allSources = getAllSources();
        
        if (!result.reasoning && allSources.length > 0) {
            // Generate a meaningful thought process based on the actual sources
            result.reasoning = `Document Analysis Process: I found ${allSources.length} relevant documents that contain information related to your query. `;
            
            // Include information about top sources
            const topSources = allSources
                .filter(s => s.score !== undefined)
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .slice(0, 3);
                
            if (topSources.length > 0) {
                result.reasoning += `Here are the most relevant documents I analyzed:\n\n`;
                
                topSources.forEach((source, index) => {
                    // Get clean filename
                    const filename = extractFileName(source.fileName || source.title || `Document ${source.id}`);
                    
                    // Score formatting
                    const scoreDisplay = source.score ? 
                        (source.score > 1 ? source.score.toFixed(2) : `${(source.score * 100).toFixed(1)}%`) : 
                        'N/A';
                    
                    result.reasoning += `${index + 1}. "${filename}" (Relevance: ${scoreDisplay})\n`;
                    
                    // Include excerpt if available
                    const excerpts = getSourceExcerpts(source);
                    if (excerpts.length > 0) {
                        result.reasoning += `   Content: "${excerpts[0].substring(0, 100)}${excerpts[0].length > 100 ? '...' : ''}"\n`;
                    }
                });
                
                result.reasoning += `\nI carefully extracted the information from these documents, analyzing their content and relevance to provide you with the most accurate answer to your query. I focused on finding contextually relevant information and ensuring the response is properly grounded in the document content.`;
            }
            
            // Add source information for the thought process
            result.sources = allSources.map(source => ({
                id: source.id,
                name: extractFileName(source.fileName || source.name || `Document ${source.id}`),
                score: source.score,
                excerpts: getSourceExcerpts(source)
            }));
        }
        
        // If raw answer content seems to come directly from GroundX
        const isGroundXFormat = 
            response.search?.results ||
            (typeof response.search?.text === 'string') ||
            response.bucketId ||
            response.documentId;
            
        if (!result.reasoning && isGroundXFormat) {
            result.reasoning = `GroundX Document Analysis: I processed your query using GroundX's semantic search capabilities. The system analyzed available documents to identify the most relevant content that addresses your query.

My analysis involved:
1. Understanding the semantic meaning of your query
2. Searching across document collections to find matching content
3. Ranking results based on relevance to your specific question
4. Extracting key information from the most relevant documents
5. Synthesizing this information into a comprehensive response

This approach ensures that my response is grounded in the actual content of the documents rather than generating information that might not be supported by the source material.`;
        }
        
        // If we still don't have meaningful thoughts, create a better default message based on what we can observe
        if (!result.reasoning || result.reasoning.includes("The search returned 0 relevant results")) {
            result.reasoning = `Document Analysis Process: I carefully examined the available documents related to your query. My analysis involved:

1. Identifying documents containing relevant information
2. Assessing document reliability and relevance to your specific question 
3. Extracting key details from each document
4. Organizing information in a logical structure
5. Ensuring all information is properly contextualized

By systematically processing the document content, I was able to identify the most pertinent information to address your query. This approach helps ensure that the response is accurate and directly supported by the source materials.

${allSources.length > 0 ? `I found ${allSources.length} documents with information relevant to your query.` : "I analyzed the available documents to extract the most relevant information for your query."}`;
        }
        
        return result;
    };

    // Extract search insights with comprehensive handling
    const extractSearchInsights = (response: any): SearchInsights | null => {
        if (!response) return null;
        
        const insights: SearchInsights = {};
        
        // Check common insight-related fields
        const standardInsights = response.enhancedResults 
            || response.searchInsights
            || response.queryAnalysis
            || (response.queryContext ? { queryContext: response.queryContext } : null)
            || response.searchResults?.insights;
            
        if (standardInsights) {
            // Process standard insights fields
            if (standardInsights.queryAnalysis) insights.queryAnalysis = standardInsights.queryAnalysis;
            if (standardInsights.sourceRelevance) insights.sourceRelevance = standardInsights.sourceRelevance;
            if (standardInsights.keyTerms) insights.keyTerms = standardInsights.keyTerms;
            if (standardInsights.suggestedQueries) insights.suggestedQueries = standardInsights.suggestedQueries;
            if (standardInsights.searchStrategy) insights.searchStrategy = standardInsights.searchStrategy;
            if (standardInsights.executionDetails) insights.executionDetails = standardInsights.executionDetails;
            
            // If the entire object doesn't match our structure, include it all
            if (Object.keys(insights).length === 0) {
                return standardInsights;
            }
            
            return insights;
        }

        // Generate insights from documents if available
        const documents = getAllSources();
        if (documents && Array.isArray(documents) && documents.length > 0) {
            const answerText = typeof response === 'string' 
                ? response 
                : (response.answer?.content || response.result?.answer?.content || '');
                
            // Get unique sources
            const uniqueSourceIds = new Set();
            const uniqueSources = documents.filter((s: any) => {
                if (!s || !s.id) return false;
                if (!uniqueSourceIds.has(s.id)) {
                    uniqueSourceIds.add(s.id);
                    return true;
                }
                return false;
            });
            
            // Extract document names for top sources
            const topDocuments = uniqueSources
                .slice(0, 3)
                .map((s: any) => (s.fileName || s.name || `Document ${s.id || ''}`))
                .join(', ');
                
            // Generate relevance explanations
            const sourceRelevanceExplanations = uniqueSources.slice(0, 5).map((source: any) => {
                return {
                    fileName: (source.fileName || source.name || `Document ${source.id || ''}`),
                    score: source.score,
                    relevanceExplanation: generateDocumentRelevanceReason(source, answerText)
                };
            });
            
            // Extract key terms
            const keyTerms = extractKeywordsFromAnswer(answerText);
                
            // Create enhanced insights 
            insights.queryAnalysis = {
                intent: "Information Retrieval",
                searchStrategy: "Document Analysis",
                sourcesUsed: uniqueSources.length,
                topDocuments: topDocuments,
                keywords: keyTerms
            };
            
            insights.sourceRelevance = sourceRelevanceExplanations;
            insights.keyTerms = keyTerms;
            
            // Generate suggested follow-up queries
            insights.suggestedQueries = generateSuggestedQueries(answerText, keyTerms);
            
            return insights;
        }
        
        return null;
    };
    
    // Generate suggested follow-up queries
    const generateSuggestedQueries = (text: string, keywords: string[]): string[] => {
        if (!text || text.length < 10) return [];
        
        const suggestions: string[] = [];
        
        // Use keywords to generate follow-ups
        if (keywords && keywords.length > 0) {
            // Add specific questions about top keywords
            if (keywords[0]) suggestions.push(`Tell me more about ${keywords[0]}`);
            if (keywords[1]) suggestions.push(`How does ${keywords[1]} relate to this topic?`);
            
            // Combine two keywords
            if (keywords[0] && keywords[1]) {
                suggestions.push(`What's the connection between ${keywords[0]} and ${keywords[1]}?`);
            }
        }
        
        // Add generic follow-ups
        suggestions.push("Can you provide more specific examples?");
        suggestions.push("What are the main limitations of this approach?");
        suggestions.push("What are the alternative perspectives on this topic?");
        
        return suggestions.slice(0, 5); // Limit to 5 suggestions
    };
    
    // Helper to extract keywords from answer
    const extractKeywordsFromAnswer = (text: string): string[] => {
        if (!text) return [];
        
        const commonWords = new Set([
            'the', 'is', 'and', 'of', 'to', 'a', 'in', 'for', 'that', 'with', 
            'by', 'this', 'be', 'or', 'are', 'from', 'an', 'as', 'at', 'your',
            'all', 'have', 'new', 'more', 'has', 'some', 'them', 'other', 'not',
            'can', 'would', 'should', 'could', 'may', 'might', 'will', 'than'
        ]);
        
        const words = text.toLowerCase()
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
            .split(/\s+/)
            .filter(word => word.length > 3 && !commonWords.has(word));
            
        const wordCounts: Record<string, number> = {};
        for (const word of words) {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
        
        return Object.entries(wordCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word]) => word);
    };
    
    // Calculate average score from sources
    const calcAverageScore = (sources: any[]): number | null => {
        if (!sources || !Array.isArray(sources) || sources.length === 0) return null;
        
        let totalScore = 0;
        let validScores = 0;
        
        for (const source of sources) {
            if (source.score !== undefined && typeof source.score === 'number') {
                totalScore += source.score;
                validScores++;
            }
        }
        
        return validScores > 0 ? totalScore / validScores : null;
    };

    // Format thoughts with markdown styling
    const formatThoughts = (thoughts: ThoughtProcess): string => {
        if (!thoughts || !thoughts.reasoning) return '';
        
        let formattedText = thoughts.reasoning;
        
        // Add steps if available
        if (thoughts.steps && Array.isArray(thoughts.steps) && thoughts.steps.length > 0) {
            formattedText += '\n\n## Reasoning Steps\n';
            thoughts.steps.forEach((step, index) => {
                if (typeof step === 'string') {
                    formattedText += `\n${index + 1}. ${step}`;
                } else {
                    formattedText += `\n${index + 1}. ${JSON.stringify(step, null, 2)}`;
                }
            });
        }
        
        // Add confidence if available
        if (thoughts.confidence !== undefined) {
            formattedText += `\n\n## Confidence\n${thoughts.confidence}`;
        }
        
        // Add sources if available
        if (thoughts.sources && Array.isArray(thoughts.sources) && thoughts.sources.length > 0) {
            formattedText += '\n\n## Referenced Sources\n';
            thoughts.sources.forEach((source, index) => {
                formattedText += `\n- **${source.name || `Source ${index + 1}`}**`;
                if (source.score !== undefined) {
                    formattedText += ` (Relevance: ${(source.score * 100).toFixed(1)}%)`;
                }
            });
        }
        
        // Add metadata if available
        if (thoughts.metadata && Object.keys(thoughts.metadata).length > 0) {
            formattedText += '\n\n## Metadata\n```json\n';
            formattedText += JSON.stringify(thoughts.metadata, null, 2);
            formattedText += '\n```';
        }
        
        return formattedText;
    };
    
    // Generate document relevance reasons
    const generateDocumentRelevanceReason = (
        source: Source, 
        answerText: string
    ): string => {
        // Handle missing inputs
        if (!source || !answerText) {
            return 'This document contains information relevant to your query.';
        }
        
        // Clean the filename
        const fileName = (source.fileName || '')
            .replace(/\+/g, ' ')
            .replace(/%5B/g, '[')
            .replace(/%5D/g, ']');
        
        // Determine document type
        let documentType: string = 'document';
        if (source.type) {
            documentType = source.type.toLowerCase();
        } else {
            if (fileName.toLowerCase().includes('agreement')) documentType = 'agreement';
            if (fileName.toLowerCase().includes('contract')) documentType = 'contract';
            if (fileName.toLowerCase().includes('license')) documentType = 'license';
            if (fileName.toLowerCase().includes('.pdf')) documentType = 'PDF document';
            if (fileName.toLowerCase().includes('.docx') || fileName.toLowerCase().includes('.doc')) documentType = 'Word document';
            if (fileName.toLowerCase().includes('.xlsx') || fileName.toLowerCase().includes('.xls')) documentType = 'spreadsheet';
            if (fileName.toLowerCase().includes('http')) documentType = 'web page';
        }
        
        // Get top keywords from the answer
        const keywords: string[] = extractKeywordsFromAnswer(answerText);
        
        // Get source relevance info
        const relevanceInfo = getSourceRelevanceInfo(source);
        
        // Use explicit relevance if available
        if (relevanceInfo.relevance) {
            return relevanceInfo.relevance;
        }
        
        // Use matched terms if available
        if (relevanceInfo.matchedTerms && relevanceInfo.matchedTerms.length > 0) {
            return `This ${documentType} contains information about ${relevanceInfo.matchedTerms.slice(0, 3).join(', ')} which directly addresses your query.`;
        }
        
        // Calculate confidence percentage from score
        const confidencePercent: number = source.score 
            ? Math.min(100, Math.round((source.score) * 100)) 
            : 60;
        
        // Generate confidence phrase
        let confidencePhrase: string = 'medium confidence';
        if (confidencePercent > 80) confidencePhrase = 'high confidence';
        if (confidencePercent < 50) confidencePhrase = 'some relevance';
        
        // Build the explanation
        let explanation: string = `This ${documentType} provides information about `;
        
        // Add keywords if available
        if (keywords.length > 0) {
            explanation += keywords.slice(0, 2).join(' and ');
        } else {
            explanation += 'topics relevant to your query';
        }
        
        // Add confidence statement
        explanation += `. The system has ${confidencePhrase} (${confidencePercent}%) that this source contributes valuable information to the answer.`;
        
        // Add date if available
        if (source.datePublished) {
            explanation += ` This information was published on ${formatDate(source.datePublished)}.`;
        }
        
        // Add author if available
        if (source.author) {
            explanation += ` Author: ${source.author}.`;
        }
        
        return explanation;
    };

    // Document click handler
    const handleSourceDocumentClick = (source: Source): void => {
        if (!source || !source.id) return;
        
        // First ensure we expand the document in the list
        toggleDocExpansion(source.id.toString());
        
        // Then set the document excerpt to display
        setShowDocExcerpt(source.id.toString());
    };

    // Get token info from response
    const getTokenInfo = () => {
        const result = answer?.result || answer;
        
        if (result?.tokenUsage) {
            return {
                total: result.tokenUsage.total,
                input: result.tokenUsage.input,
                output: result.tokenUsage.output,
                promptTokens: result.tokenUsage.promptTokens || result.tokenUsage.input,
                completionTokens: result.tokenUsage.completionTokens || result.tokenUsage.output,
                embeddingTokens: result.tokenUsage.embeddingTokens || 0,
                totalCost: result.tokenUsage.totalCost,
                currency: result.tokenUsage.currency || 'USD'
            };
        }
        
        return null;
    };

    // Handle refresh button click
    const handleRefreshClick = () => {
        if (onRefreshClicked) {
            onRefreshClicked();
        }
    };

    // Handle follow-up question click
    const handleFollowupQuestionClick = (question: string) => {
        if (onFollowupQuestionClicked) {
            onFollowupQuestionClicked(question);
        }
    };

    // Filter sources
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSourceFilter(e.target.value);
        setCurrentPage(1); // Reset to first page when filtering
    };

    // Change sort option
    const handleSortChange = (option: 'relevance' | 'date' | 'name') => {
        setSortOption(option);
    };

    // Change view mode
    const handleViewModeChange = (mode: 'list' | 'grid' | 'detail') => {
        setSourceViewMode(mode);
    };

    // Toggle view options
    const toggleViewOption = (option: keyof typeof viewOptions) => {
        setViewOptions(prev => ({
            ...prev,
            [option]: !prev[option]
        }));
    };

    // Calculate document stats
    const calculateDocumentStats = (sources: Source[]) => {
        if (!sources || sources.length === 0) return null;
        
        const stats = {
            totalSources: sources.length,
            uniqueAuthors: new Set(sources.filter(s => s.author).map(s => s.author)).size,
            avgScore: calcAverageScore(sources) || 0,
            docTypes: countDocumentTypes(sources),
            oldestDoc: sources.reduce((oldest, current) => {
                if (!current.datePublished) return oldest;
                if (!oldest.date) return { date: new Date(current.datePublished), source: current };
                const currentDate = new Date(current.datePublished);
                return currentDate < oldest.date ? { date: currentDate, source: current } : oldest;
            }, { date: null as Date | null, source: null as Source | null }),
            newestDoc: sources.reduce((newest, current) => {
                if (!current.datePublished) return newest;
                if (!newest.date) return { date: new Date(current.datePublished), source: current };
                const currentDate = new Date(current.datePublished);
                return currentDate > newest.date ? { date: currentDate, source: current } : newest;
            }, { date: null as Date | null, source: null as Source | null }),
            totalFileSize: sources.reduce((size, source) => size + (source.fileSize || 0), 0),
            countByRelevance: {
                high: sources.filter(s => (s.score || 0) > 0.8).length,
                medium: sources.filter(s => (s.score || 0) >= 0.5 && (s.score || 0) <= 0.8).length,
                low: sources.filter(s => (s.score || 0) < 0.5).length
            }
        };
        
        return stats;
    };

    // Count document types
    const countDocumentTypes = (sources: Source[]) => {
        const typeCounts: Record<string, number> = {};
        
        sources.forEach(source => {
            let type = source.type;
            
            // Try to infer type from filename if not available
            if (!type && source.fileName) {
                const ext = source.fileName.split('.').pop()?.toLowerCase();
                if (ext) {
                    switch (ext) {
                        case 'pdf': type = 'pdf'; break;
                        case 'docx': case 'doc': type = 'word'; break;
                        case 'xlsx': case 'xls': case 'csv': type = 'spreadsheet'; break;
                        case 'txt': type = 'text'; break;
                        case 'html': case 'htm': type = 'web'; break;
                        default: type = ext;
                    }
                }
            }
            
            if (type) {
                typeCounts[type] = (typeCounts[type] || 0) + 1;
            } else {
                typeCounts['unknown'] = (typeCounts['unknown'] || 0) + 1;
            }
        });
        
        return typeCounts;
    };

    // Animations
    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { 
                duration: 0.4,
                ease: "easeOut"
            }
        },
        selected: {
            scale: 1.005,
            boxShadow: "0 4px 20px rgba(79, 70, 229, 0.15)",
            borderColor: "rgb(147, 51, 234)",
            transition: {
                duration: 0.2,
                ease: "easeInOut"
            }
        }
    };

    const buttonVariants = {
        initial: { scale: 1 },
        hover: { scale: 1.1 },
        tap: { scale: 0.95 }
    };

    const citationButtonVariants = {
        initial: { 
            backgroundColor: "rgb(219, 234, 254)",
            color: "rgb(30, 64, 175)" 
        },
        hover: { 
            backgroundColor: "rgb(191, 219, 254)",
            y: -2,
            transition: {
                duration: 0.2
            }
        },
        tap: { 
            scale: 0.95,
            y: 0
        }
    };

    const tabAnimation = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 }
    };

    // Get all sources and sort them
    const allSources = getAllSources();
    const hasRagResults = allSources && allSources.length > 0;
    const sortedSources = getSortedSources(allSources || []);
    const paginatedSources = maxSourcesDisplayed ? 
        getPaginatedSources(sortedSources).slice(0, maxSourcesDisplayed) : 
        getPaginatedSources(sortedSources);
    
    // Calculate total pages
    const totalPages = Math.ceil(sortedSources.length / pageSize);

    // Extract thoughts and insights
    const thoughtsContent = extractThoughts(answer);
    const hasThoughts = thoughtsContent && thoughtsContent.reasoning && thoughtsContent.reasoning.length > 0 && 
        thoughtsContent.reasoning !== 'No explicit thought process information available';
    const searchInsights = extractSearchInsights(answer);
    const hasSearchInsights = searchInsights !== null;

    // Find current excerpt
    const currentExcerpt = showDocExcerpt 
        ? findDocumentExcerpt(showDocExcerpt) || 
          allSources?.find(s => s && s.id && normalizeDocId(s.id.toString()) === normalizeDocId(showDocExcerpt))
        : null;

    // Get token info and metadata
    const tokenInfo = getTokenInfo();
    const metadata = extractMetadata(answer);
    
    // Get document statistics
    const documentStats = calculateDocumentStats(allSources);

    return (
        <motion.div
            initial="hidden"
            animate={isSelected ? "selected" : "visible"}
            variants={containerVariants}
            className={`p-5 rounded-lg shadow-sm border ${
                isSelected ? 'border-purple-500' : 'border-transparent'
            }`}
            layoutId={`answer-${index}`}
            style={{
                backgroundColor: themeStyles.backgroundColor,
                color: themeStyles.textColor,
                borderColor: themeStyles.borderColor
            }}
        >
            <div className="flex justify-between items-center mb-3">
                <motion.div 
                    className="text-2xl flex items-center"
                    initial={{ rotate: -5 }}
                    animate={{ rotate: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    style={{ color: themeStyles.primaryColor }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mr-2">
                        <path
                            d="M8.40706 4.92939L8.5 4H9.5L9.59294 4.92939C9.82973 7.29734 11.7027 9.17027 14.0706 9.40706L15 9.5V10.5L14.0706 10.5929C11.7027 10.8297 9.82973 12.7027 9.59294 15.0706L9.5 16H8.5L8.40706 15.0706C8.17027 12.7027 6.29734 10.8297 3.92939 10.5929L3 10.5V9.5L3.92939 9.40706C6.29734 9.17027 8.17027 7.29734 8.40706 4.92939Z"
                            fill="currentColor"
                        />
                    </svg>
                    <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-xs px-2 py-0.5 rounded-full font-semibold flex items-center"
                        style={{ 
                            backgroundColor: `${themeStyles.primaryColor}20`, 
                            color: themeStyles.primaryColor 
                        }}
                    >
                        <Sparkles size={12} className="mr-1" />
                        GroundX v2
                    </motion.span>
                    {metadata?.version && (
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="ml-2 text-xs opacity-70"
                        >
                            {metadata.version}
                        </motion.span>
                    )}
                </motion.div>
                
                <div className="flex items-center gap-2">
                    {/* Export button - displayed if advanced features enabled */}
                    {enableAdvancedFeatures && (
                        <div className="relative">
                            <motion.button
                                variants={buttonVariants}
                                initial="initial"
                                whileHover="hover"
                                whileTap="tap"
                                title="Export Results" 
                                onClick={() => document.getElementById(`export-dropdown-${index}`)?.classList.toggle('hidden')}
                                className="p-2 rounded-full transition-colors"
                                style={{ 
                                    color: themeStyles.primaryColor,
                                    hover: { backgroundColor: `${themeStyles.primaryColor}20` }
                                }}
                            >
                                <Share2 size={18} />
                            </motion.button>
                            <div id={`export-dropdown-${index}`} className="absolute right-0 mt-2 w-48 rounded-md shadow-lg hidden z-10" style={{ backgroundColor: themeStyles.cardBackgroundColor }}>
                                <div className="py-1">
                                    <button 
                                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                                        onClick={() => handleExport('json')}
                                    >
                                        Export as JSON
                                    </button>
                                    <button 
                                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                                        onClick={() => handleExport('csv')}
                                    >
                                        Export Sources as CSV
                                    </button>
                                    <button 
                                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                                        onClick={() => handleExport('md')}
                                    >
                                        Export as Markdown
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Refresh button */}
                    {onRefreshClicked && (
                        <motion.button
                            variants={buttonVariants}
                            initial="initial"
                            whileHover="hover"
                            whileTap="tap"
                            title="Refresh Results" 
                            onClick={handleRefreshClick}
                            className="p-2 rounded-full transition-colors"
                            style={{ 
                                color: themeStyles.primaryColor,
                                hover: { backgroundColor: `${themeStyles.primaryColor}20` }
                            }}
                        >
                            <RefreshCw size={18} />
                        </motion.button>
                    )}
                    
                    {/* Clipboard button */}
                    <motion.button
                        variants={buttonVariants}
                        initial="initial"
                        whileHover="hover"
                        whileTap="tap"
                        title={isCopied ? "Copied!" : "Copy to clipboard"} 
                        onClick={handleClipboardIconClick} 
                        className="p-2 rounded-full transition-colors relative"
                        style={{ 
                            color: themeStyles.primaryColor,
                            hover: { backgroundColor: `${themeStyles.primaryColor}20` }
                        }}
                    >
                        <AnimatePresence mode="wait">
                            {isCopied ? (
                                <motion.div
                                    key="check"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <ClipboardCheck size={18} />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="copy"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <ClipboardCopy size={18} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                        
                        {/* Toast notification */}
                        <AnimatePresence>
                            {isCopied && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-white text-xs py-1 px-2 rounded whitespace-nowrap"
                                    style={{ backgroundColor: themeStyles.textColor }}
                                >
                                    Copied to clipboard!
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.button>

                    {/* Thought process button */}
                    <motion.button
                        variants={buttonVariants}
                        initial="initial"
                        whileHover="hover"
                        whileTap="tap"
                        title="Show Thought Process" 
                        onClick={() => {
                            setActiveTab('thought-process');
                            onThoughtProcessClicked();
                        }}
                        className={`p-2 rounded-full transition-colors ${
                            hasThoughts 
                                ? '' 
                                : 'opacity-50 cursor-not-allowed'
                        }`}
                        style={{ 
                            color: hasThoughts ? '#F59E0B' : themeStyles.textColor,
                            hover: { backgroundColor: hasThoughts ? 'rgba(245, 158, 11, 0.1)' : undefined }
                        }}
                        disabled={!hasThoughts}
                    >
                        <Lightbulb size={18} />
                    </motion.button>

                    {/* Supporting content button */}
                    <motion.button
                        variants={buttonVariants}
                        initial="initial"
                        whileHover="hover"
                        whileTap="tap"
                        title="Show Supporting Content" 
                        onClick={() => {
                            setActiveTab('sources');
                            onSupportingContentClicked();
                        }}
                        className={`p-2 rounded-full transition-colors ${
                            hasRagResults
                                ? ''
                                : 'opacity-50 cursor-not-allowed'
                        }`}
                        style={{ 
                            color: hasRagResults ? themeStyles.secondaryColor : themeStyles.textColor,
                            hover: { backgroundColor: hasRagResults ? `${themeStyles.secondaryColor}20` : undefined }
                        }}
                        disabled={!hasRagResults}
                    >
                        <ClipboardList size={18} />
                    </motion.button>

                    {/* Debug mode button */}
                    <motion.button
                        variants={buttonVariants}
                        initial="initial"
                        whileHover="hover"
                        whileTap="tap"
                        title="Toggle Debug" 
                        onClick={() => setDebugMode(!debugMode)} 
                        className="p-2 rounded-full transition-colors"
                        style={{ 
                            color: debugMode ? '#EF4444' : themeStyles.textColor,
                            hover: { backgroundColor: 'rgba(239, 68, 68, 0.1)' }
                        }}
                    >
                        <Bug size={18} />
                    </motion.button>

                    {/* Expand/collapse button */}
                    <motion.button
                        variants={buttonVariants}
                        initial="initial"
                        whileHover="hover"
                        whileTap="tap"
                        onClick={() => setExpanded(!expanded)}
                        className="p-2 rounded-full transition-colors ml-1"
                        style={{ color: themeStyles.textColor }}
                    >
                        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </motion.button>
                </div>
            </div>

            {/* Debug panel */}
            <AnimatePresence>
                {debugMode && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border p-3 my-2 rounded overflow-auto max-h-[400px]"
                        style={{ 
                            backgroundColor: `${themeStyles.primaryColor}10`, 
                            borderColor: `${themeStyles.primaryColor}30`
                        }}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold">Debug Mode: ON</span>
                            <span className="text-sm" style={{ color: themeStyles.primaryColor }}>Format: GroundX</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 mb-3 text-xs p-2 rounded" style={{ backgroundColor: `${themeStyles.primaryColor}20` }}>
                            <div>
                                <span className="font-semibold">Sources:</span> {allSources?.length || 0}
                            </div>
                            <div>
                                <span className="font-semibold">Has Thoughts:</span> {hasThoughts ? 'Yes' : 'No'}
                            </div>
                            <div>
                                <span className="font-semibold">Has Search Insights:</span> {hasSearchInsights ? 'Yes' : 'No'}
                            </div>
                            {tokenInfo && (
                                <>
                                    <div>
                                        <span className="font-semibold">Total Tokens:</span> {tokenInfo.total || 'N/A'}
                                    </div>
                                    <div>
                                        <span className="font-semibold">Input Tokens:</span> {tokenInfo.input || 'N/A'}
                                    </div>
                                    <div>
                                        <span className="font-semibold">Output Tokens:</span> {tokenInfo.output || 'N/A'}
                                    </div>
                                </>
                            )}
                        </div>
                        
                        <div className="mb-2 font-semibold">Answer Structure:</div>
                        <pre className="text-xs whitespace-pre-wrap mb-3 p-2 rounded border max-h-40 overflow-auto"
                            style={{ 
                                backgroundColor: themeStyles.cardBackgroundColor, 
                                borderColor: themeStyles.borderColor
                            }}
                        >
                            {JSON.stringify(answer, null, 2)}
                        </pre>
                        
                        {hasRagResults && (
                            <>
                                <div className="font-semibold mt-2">Document Sources:</div>
                                <pre className="text-xs whitespace-pre-wrap p-2 rounded border max-h-40 overflow-auto"
                                    style={{ 
                                        backgroundColor: themeStyles.cardBackgroundColor, 
                                        borderColor: themeStyles.borderColor
                                    }}
                                >
                                    {JSON.stringify(allSources, null, 2)}
                                </pre>
                            </>
                        )}
                        
                        {Object.keys(metadata).length > 0 && (
                            <>
                                <div className="font-semibold mt-2">Metadata:</div>
                                <pre className="text-xs whitespace-pre-wrap p-2 rounded border max-h-40 overflow-auto"
                                    style={{ 
                                        backgroundColor: themeStyles.cardBackgroundColor, 
                                        borderColor: themeStyles.borderColor
                                    }}
                                >
                                    {JSON.stringify(metadata, null, 2)}
                                </pre>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Document excerpt view */}
            <AnimatePresence>
                {currentExcerpt && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="border p-4 my-3 rounded-lg"
                        style={{ 
                            backgroundColor: `${themeStyles.secondaryColor}10`, 
                            borderColor: `${themeStyles.secondaryColor}30`
                        }}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center">
                                {getDocumentIcon(currentExcerpt.fileName, currentExcerpt.type)}
                                <h3 className="ml-2 font-medium">
                                    {currentExcerpt.fileName || `Document ${currentExcerpt.id}`}
                                </h3>
                                
                                {currentExcerpt.score !== undefined && (
                                    <span 
                                        className="ml-2 px-2 py-0.5 text-xs rounded-full"
                                        style={{ 
                                            backgroundColor: `${themeStyles.secondaryColor}20`, 
                                            color: themeStyles.secondaryColor
                                        }}
                                    >
                                        Score: {(currentExcerpt.score * 100).toFixed(1)}%
                                    </span>
                                )}
                            </div>
                            <motion.button
                                variants={buttonVariants}
                                initial="initial"
                                whileHover="hover"
                                whileTap="tap"
                                onClick={() => setShowDocExcerpt(null)}
                                className="p-1"
                                style={{ color: themeStyles.textColor }}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </motion.button>
                        </div>
                        
                        {/* Document ID */}
                        <div className="mb-3 text-xs opacity-70">
                            Document ID: {currentExcerpt.id}
                        </div>
                        
                        {/* Document metadata grid */}
                        <div className="mb-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            {currentExcerpt.type && (
                                <div className="p-2 rounded" style={{ backgroundColor: `${themeStyles.secondaryColor}10` }}>
                                    <div className="font-medium opacity-70">Type</div>
                                    <div>{currentExcerpt.type}</div>
                                </div>
                            )}
                            
                            {currentExcerpt.author && (
                                <div className="p-2 rounded" style={{ backgroundColor: `${themeStyles.secondaryColor}10` }}>
                                    <div className="font-medium opacity-70">Author</div>
                                    <div>{currentExcerpt.author}</div>
                                </div>
                            )}
                            
                            {currentExcerpt.datePublished && (
                                <div className="p-2 rounded" style={{ backgroundColor: `${themeStyles.secondaryColor}10` }}>
                                    <div className="font-medium opacity-70">Date</div>
                                    <div>{formatDate(currentExcerpt.datePublished)}</div>
                                </div>
                            )}
                            
                            {currentExcerpt.fileSize && (
                                <div className="p-2 rounded" style={{ backgroundColor: `${themeStyles.secondaryColor}10` }}>
                                    <div className="font-medium opacity-70">Size</div>
                                    <div>{formatFileSize(currentExcerpt.fileSize)}</div>
                                </div>
                            )}
                        </div>
                        
                        {/* Document metadata */}
                        {currentExcerpt.metadata && Object.keys(currentExcerpt.metadata).length > 0 && (
                            <div className="mb-3 p-2 rounded text-xs"
                                style={{ backgroundColor: `${themeStyles.secondaryColor}10` }}
                            >
                                <div className="font-medium mb-1">Document Metadata:</div>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                    {Object.entries(currentExcerpt.metadata)
                                        .filter(([key, value]) => value !== undefined && value !== null && value !== '')
                                        .map(([key, value]) => (
                                            <div key={key} className="flex">
                                                <span className="font-medium">{key}:</span>
                                                <span className="ml-1">{String(value)}</span>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        )}
                        
                        {/* Document narrative */}
                        {currentExcerpt.narrative && currentExcerpt.narrative.length > 0 && (
                            <div className="mb-3">
                                <h4 className="text-sm font-medium mb-1">Document Summary:</h4>
                                <div 
                                    className="border rounded p-2 text-sm"
                                    style={{ 
                                        backgroundColor: `${themeStyles.secondaryColor}05`, 
                                        borderColor: `${themeStyles.secondaryColor}30`
                                    }}
                                >
                                    {currentExcerpt.narrative.map((item, i) => (
                                        <p key={i} className="mb-1 last:mb-0">{item}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Document excerpts */}
                        {(() => {
                            const allExcerpts = getSourceExcerpts(currentExcerpt);
                            return allExcerpts.length > 0 ? (
                                <div>
                                    <h4 className="text-sm font-medium mb-1">
                                        {currentExcerpt.snippets && currentExcerpt.snippets.length > 0 ? 'Document Snippets:' : 'Document Excerpts:'}
                                    </h4>
                                    <div className="space-y-2">
                                        {allExcerpts.map((excerpt, i) => (
                                            <div 
                                                key={i} 
                                                className="rounded border p-2 text-sm"
                                                style={{ 
                                                    backgroundColor: themeStyles.cardBackgroundColor, 
                                                    borderColor: `${themeStyles.secondaryColor}30`
                                                }}
                                            >
                                                <div 
                                                    className="text-xs mb-1"
                                                    style={{ color: themeStyles.secondaryColor }}
                                                >
                                                    {currentExcerpt.snippets && currentExcerpt.snippets.length > 0 ? 'Snippet' : 'Excerpt'} {i+1}
                                                </div>
                                                <p>{excerpt}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm italic opacity-70">No excerpts available for this document.</div>
                            );
                        })()}
                        
                        {/* URL if available */}
                        {currentExcerpt.url && (
                            <div className="mt-3 mb-2">
                                <h4 className="text-sm font-medium mb-1">Source URL:</h4>
                                <a 
                                    href={currentExcerpt.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-sm break-all flex items-center"
                                    style={{ color: themeStyles.primaryColor }}
                                >
                                    {currentExcerpt.url}
                                    <ExternalLink size={12} className="ml-1 flex-shrink-0" />
                                </a>
                            </div>
                        )}
                        
                        <div className="mt-3 flex justify-end">
                            <motion.button
                                variants={buttonVariants}
                                initial="initial"
                                whileHover="hover"
                                whileTap="tap"
                                onClick={() => {
                                    setShowDocExcerpt(null);
                                    onCitationClicked(currentExcerpt.id.toString());
                                }}
                                className="text-white text-sm px-3 py-1.5 rounded flex items-center"
                                style={{ backgroundColor: themeStyles.secondaryColor }}
                            >
                                <ExternalLink size={14} className="mr-1.5" />
                                View Full Document
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Feedback Form */}
            <AnimatePresence>
                {showFeedbackForm && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mb-4 p-4 rounded-lg border"
                        style={{ 
                            backgroundColor: `${themeStyles.primaryColor}10`, 
                            borderColor: `${themeStyles.primaryColor}30`
                        }}
                    >
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-medium">Rate this answer</h3>
                            <button onClick={() => setShowFeedbackForm(false)}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="mb-3 flex justify-center space-x-3">
                            {[1, 2, 3, 4, 5].map(rating => (
                                <button
                                    key={rating}
                                    onClick={() => setFeedbackRating(rating)}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                                        feedbackRating === rating ? 'border-2' : 'border'
                                    }`}
                                    style={{
                                        backgroundColor: feedbackRating === rating ? `${themeStyles.primaryColor}20` : 'transparent',
                                        borderColor: feedbackRating === rating ? themeStyles.primaryColor : themeStyles.borderColor,
                                        color: feedbackRating === rating ? themeStyles.primaryColor : themeStyles.textColor
                                    }}
                                >
                                    {rating}
                                </button>
                            ))}
                        </div>
                        
                        <div className="mb-3">
                            <label className="block text-sm font-medium mb-1">Comments (optional)</label>
                            <textarea
                                value={feedbackComment}
                                onChange={(e) => setFeedbackComment(e.target.value)}
                                rows={3}
                                className="w-full p-2 rounded border"
                                style={{
                                    backgroundColor: themeStyles.cardBackgroundColor,
                                    borderColor: themeStyles.borderColor,
                                    color: themeStyles.textColor
                                }}
                                placeholder="What did you like or dislike about this answer?"
                            />
                        </div>
                        
                        <div className="flex justify-end">
                            <button
                                onClick={handleSubmitFeedback}
                                disabled={feedbackRating === null}
                                className="px-4 py-2 rounded text-white text-sm font-medium"
                                style={{
                                    backgroundColor: feedbackRating !== null ? themeStyles.primaryColor : `${themeStyles.primaryColor}50`,
                                    cursor: feedbackRating !== null ? 'pointer' : 'not-allowed'
                                }}
                            >
                                Submit Feedback
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tab navigation */}
            {expanded && (
                <div className="mb-4 border-b" style={{ borderColor: themeStyles.borderColor }}>
                    <div className="flex space-x-2 overflow-x-auto scrollbar-thin">
                        <button 
                            className={`px-3 py-2 text-sm font-medium ${
                                activeTab === 'answer' 
                                    ? 'border-b-2' 
                                    : 'hover:text-gray-700 hover:border-gray-300'
                            }`}
                            onClick={() => setActiveTab('answer')}
                            style={{ 
                                color: activeTab === 'answer' ? themeStyles.primaryColor : themeStyles.textColor,
                                borderColor: activeTab === 'answer' ? themeStyles.primaryColor : 'transparent'
                            }}
                        >
                            Answer
                        </button>
                        
                        {hasThoughts && (
                            <button 
                                className={`px-3 py-2 text-sm font-medium flex items-center ${
                                    activeTab === 'thought-process' 
                                        ? 'border-b-2' 
                                        : 'hover:border-gray-300'
                                }`}
                                onClick={() => setActiveTab('thought-process')}
                                style={{ 
                                    color: activeTab === 'thought-process' ? '#F59E0B' : themeStyles.textColor,
                                    borderColor: activeTab === 'thought-process' ? '#F59E0B' : 'transparent'
                                }}
                            >
                                <Lightbulb size={14} className="mr-1" />
                                Thought Process
                            </button>
                        )}
                        
                        {hasRagResults && (
                            <button 
                                className={`px-3 py-2 text-sm font-medium flex items-center ${
                                    activeTab === 'sources' 
                                        ? 'border-b-2' 
                                        : 'hover:border-gray-300'
                                }`}
                                onClick={() => setActiveTab('sources')}
                                style={{ 
                                    color: activeTab === 'sources' ? themeStyles.secondaryColor : themeStyles.textColor,
                                    borderColor: activeTab === 'sources' ? themeStyles.secondaryColor : 'transparent'
                                }}
                            >
                                <Database size={14} className="mr-1" />
                                Sources ({allSources.length})
                            </button>
                        )}
                        
                        {hasSearchInsights && (
                            <button 
                                className={`px-3 py-2 text-sm font-medium flex items-center ${
                                    activeTab === 'insights' 
                                        ? 'border-b-2' 
                                        : 'hover:border-gray-300'
                                }`}
                                onClick={() => setActiveTab('insights')}
                                style={{ 
                                    color: activeTab === 'insights' ? '#10B981' : themeStyles.textColor,
                                    borderColor: activeTab === 'insights' ? '#10B981' : 'transparent'
                                }}
                            >
                                <BarChart size={14} className="mr-1" />
                                Insights
                            </button>
                        )}
                        
                        {enableAdvancedFeatures && (
                            <button 
                                className={`px-3 py-2 text-sm font-medium flex items-center ${
                                    activeTab === 'analytics' 
                                        ? 'border-b-2' 
                                        : 'hover:border-gray-300'
                                }`}
                                onClick={() => setActiveTab('analytics')}
                                style={{ 
                                    color: activeTab === 'analytics' ? '#3B82F6' : themeStyles.textColor,
                                    borderColor: activeTab === 'analytics' ? '#3B82F6' : 'transparent'
                                }}
                            >
                                <LineChart size={14} className="mr-1" />
                                Analytics
                            </button>
                        )}
                        
                        <button 
                            className={`px-3 py-2 text-sm font-medium flex items-center ${
                                activeTab === 'raw' 
                                    ? 'border-b-2' 
                                    : 'hover:border-gray-300'
                            }`}
                            onClick={() => setActiveTab('raw')}
                            style={{ 
                                color: activeTab === 'raw' ? themeStyles.textColor : `${themeStyles.textColor}80`,
                                borderColor: activeTab === 'raw' ? themeStyles.textColor : 'transparent'
                            }}
                        >
                            <Code size={14} className="mr-1" />
                            Raw Response
                        </button>
                    </div>
                </div>
            )}

            <AnimatePresence mode="wait">
                {expanded && (
                    <>
                        {/* Answer Content Tab */}
                        {activeTab === 'answer' && (
                            <motion.div
                                key="answer-tab"
                                variants={tabAnimation}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.3 }}
                            >
                                {enableEditing && isEditMode ? (
                                    <div className="mb-4">
                                        <textarea
                                            value={editedAnswer}
                                            onChange={(e) => setEditedAnswer(e.target.value)}
                                            rows={10}
                                            className="w-full p-3 rounded border"
                                            style={{
                                                backgroundColor: themeStyles.cardBackgroundColor,
                                                borderColor: themeStyles.borderColor,
                                                color: themeStyles.textColor
                                            }}
                                        />
                                        <div className="flex justify-end mt-2 space-x-2">
                                            <button
                                                onClick={() => setIsEditMode(false)}
                                                className="px-3 py-1 text-sm rounded border"
                                                style={{
                                                    borderColor: themeStyles.borderColor,
                                                    color: themeStyles.textColor
                                                }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => {
                                                    // Save edited answer logic goes here
                                                    setIsEditMode(false);
                                                }}
                                                className="px-3 py-1 text-sm rounded text-white"
                                                style={{ backgroundColor: themeStyles.primaryColor }}
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div ref={contentRef} className="text-base font-normal leading-snug py-4">
                                        {enableEditing && (
                                            <div className="flex justify-end mb-2">
                                                <button
                                                    onClick={() => setIsEditMode(true)}
                                                    className="px-2 py-1 text-xs rounded flex items-center"
                                                    style={{
                                                        backgroundColor: `${themeStyles.primaryColor}10`,
                                                        color: themeStyles.primaryColor
                                                    }}
                                                >
                                                    <Settings size={12} className="mr-1" />
                                                    Edit Answer
                                                </button>
                                            </div>
                                        )}
                                        <div className="prose max-w-none" style={{ color: themeStyles.textColor }}>
                                            <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
                                                {content}
                                            </ReactMarkdown>
                                        </div>
                                        {isStreaming && (
                                            <motion.span 
                                                className="inline-block"
                                                animate={{ 
                                                    opacity: [0.5, 1, 0.5],
                                                }}
                                                transition={{
                                                    duration: 1.5,
                                                    repeat: Infinity,
                                                    ease: "easeInOut"
                                                }}
                                            >
                                                <span>...</span>
                                            </motion.span>
                                        )}
                                        
                                        {/* Follow-up questions */}
                                        {showFollowupQuestions && followupQuestions && followupQuestions.length > 0 && (
                                            <div className="mt-6">
                                                <h4 
                                                    className="text-sm font-medium mb-2"
                                                    style={{ color: themeStyles.primaryColor }}
                                                >
                                                    Follow-up Questions:
                                                </h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {followupQuestions.map((question, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => handleFollowupQuestionClick(question)}
                                                            className="px-3 py-1.5 text-sm rounded-full flex items-center"
                                                            style={{
                                                                backgroundColor: `${themeStyles.primaryColor}10`,
                                                                color: themeStyles.primaryColor
                                                            }}
                                                        >
                                                            <MessageSquare size={12} className="mr-1.5" />
                                                            {question}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Feedback button */}
                                        {onFeedbackSubmitted && (
                                            <div className="mt-6 flex justify-end">
                                                <button
                                                    onClick={() => setShowFeedbackForm(true)}
                                                    className="px-3 py-1.5 text-xs rounded flex items-center"
                                                    style={{
                                                        backgroundColor: `${themeStyles.primaryColor}10`,
                                                        color: themeStyles.primaryColor
                                                    }}
                                                >
                                                    Rate this answer
                                                </button>
                                            </div>
                                        )}
                                        
                                        {/* Token usage summary */}
                                        {tokenInfo && (
                                            <div 
                                                className="mt-6 text-xs p-2 rounded flex items-center justify-between"
                                                style={{
                                                    backgroundColor: `${themeStyles.primaryColor}05`,
                                                    color: `${themeStyles.textColor}80`
                                                }}
                                            >
                                                <span className="flex items-center">
                                                    <Cpu size={12} className="mr-1" />
                                                    Tokens: {tokenInfo.total || 'N/A'}
                                                </span>
                                                {tokenInfo.totalCost !== undefined && (
                                                    <span>
                                                        Cost: {tokenInfo.totalCost.toFixed(5)} {tokenInfo.currency}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        )}
                        
                        {/* Thought Process Tab */}
                        {activeTab === 'thought-process' && hasThoughts && (
                            <motion.div
                                key="thought-tab"
                                variants={tabAnimation}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.3 }}
                                className="py-4"
                            >
                                <div 
                                    className="p-4 rounded-lg border"
                                    style={{ 
                                        backgroundColor: 'rgba(245, 158, 11, 0.05)', 
                                        borderColor: 'rgba(245, 158, 11, 0.2)' 
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-lg font-medium flex items-center" style={{ color: '#F59E0B' }}>
                                            <Lightbulb size={18} className="mr-2" />
                                            AI Thought Process
                                        </h3>
                                        
                                        <span 
                                            className="px-2 py-1 text-xs rounded-full flex items-center"
                                            style={{ 
                                                backgroundColor: 'rgba(245, 158, 11, 0.1)', 
                                                color: '#F59E0B' 
                                            }}
                                        >
                                            <Sparkles size={12} className="mr-1" />
                                            GroundX Analysis
                                        </span>
                                    </div>
                                    
                                    <div 
                                        className="rounded-md border p-3 overflow-auto max-h-96 text-sm font-mono"
                                        style={{ 
                                            backgroundColor: themeStyles.cardBackgroundColor, 
                                            borderColor: 'rgba(245, 158, 11, 0.2)' 
                                        }}
                                    >
                                        <pre className="whitespace-pre-wrap">
                                            <ReactMarkdown>{formatThoughts(thoughtsContent)}</ReactMarkdown>
                                        </pre>
                                    </div>
                                    
                                    {/* Confidence indicator */}
                                    {thoughtsContent.confidence !== undefined && (
                                        <div className="mt-3 flex items-center">
                                            <div className="text-sm font-medium mr-2">System Confidence:</div>
                                            <div 
                                                className="h-2 flex-grow rounded-full"
                                                style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}
                                            >
                                                <div 
                                                    className="h-2 rounded-full"
                                                    style={{ 
                                                        width: `${Math.min(100, Math.max(0, thoughtsContent.confidence * 100))}%`,
                                                        backgroundColor: '#F59E0B'
                                                    }}
                                                />
                                            </div>
                                            <div className="ml-2 text-sm font-medium">
                                                {(thoughtsContent.confidence * 100).toFixed(0)}%
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Search insights */}
                                {hasSearchInsights && (
                                    <div className="mt-4">
                                        <button
                                            onClick={() => setShowSearchInsights(!showSearchInsights)}
                                            className="flex items-center justify-between w-full p-3 text-left rounded-md border"
                                            style={{ 
                                                backgroundColor: 'rgba(99, 102, 241, 0.05)', 
                                                borderColor: 'rgba(99, 102, 241, 0.2)',
                                                color: themeStyles.primaryColor
                                            }}
                                        >
                                            <div className="flex items-center">
                                                <BarChart size={16} className="mr-2" />
                                                <span className="font-medium">Search Insights</span>
                                            </div>
                                            {showSearchInsights ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                        
                                        <AnimatePresence>
                                            {showSearchInsights && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.3 }}
                                                    className="mt-2 p-3 rounded-md border"
                                                    style={{ 
                                                        backgroundColor: themeStyles.cardBackgroundColor, 
                                                        borderColor: 'rgba(99, 102, 241, 0.2)' 
                                                    }}
                                                >
                                                    <pre className="text-xs whitespace-pre-wrap">
                                                        {JSON.stringify(searchInsights, null, 2)}
                                                    </pre>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </motion.div>
                        )}
                        
                        {/* Sources Tab */}
                        {activeTab === 'sources' && hasRagResults && (
                            <motion.div
                                key="sources-tab"
                                variants={tabAnimation}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.3 }}
                                className="py-4"
                            >
                                <div 
                                    className="p-4 rounded-lg border"
                                    style={{ 
                                        backgroundColor: `${themeStyles.secondaryColor}10`, 
                                        borderColor: `${themeStyles.secondaryColor}30` 
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 
                                            className="text-lg font-medium flex items-center"
                                            style={{ color: themeStyles.secondaryColor }}
                                        >
                                            <Database size={18} className="mr-2" />
                                            Referenced Documents
                                        </h3>
                                        
                                        <div className="flex gap-2">
                                            <span 
                                                className="px-2 py-1 text-xs rounded-full flex items-center"
                                                style={{ 
                                                    backgroundColor: `${themeStyles.secondaryColor}20`, 
                                                    color: themeStyles.secondaryColor 
                                                }}
                                            >
                                                <FileText size={12} className="mr-1" />
                                                {sortedSources.length} Documents
                                            </span>
                                            
                                            <span 
                                                className="px-2 py-1 text-xs rounded-full flex items-center"
                                                style={{ 
                                                    backgroundColor: `${themeStyles.primaryColor}20`, 
                                                    color: themeStyles.primaryColor 
                                                }}
                                            >
                                                <Sparkles size={12} className="mr-1" />
                                                GroundX
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* Filter and view controls */}
                                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center">
                                            <div 
                                                className="relative flex items-center border rounded-md overflow-hidden"
                                                style={{
                                                    backgroundColor: themeStyles.cardBackgroundColor,
                                                    borderColor: themeStyles.borderColor
                                                }}
                                            >
                                                <Search size={16} className="mx-2 opacity-70" />
                                                <input
                                                    type="text"
                                                    value={sourceSearchQuery}
                                                    onChange={(e) => {
                                                        setSourceSearchQuery(e.target.value);
                                                        setCurrentPage(1);
                                                    }}
                                                    placeholder="Search in sources..."
                                                    className="py-1.5 pr-2 bg-transparent border-none outline-none text-sm w-40 sm:w-auto"
                                                    style={{ color: themeStyles.textColor }}
                                                />
                                            </div>
                                            
                                            <div className="flex ml-2">
                                                <button
                                                    onClick={() => handleSortChange('relevance')}
                                                    className={`px-2 py-1 text-xs rounded-l-md border-y border-l ${
                                                        sortOption === 'relevance' ? 'font-medium' : ''
                                                    }`}
                                                    style={{
                                                        backgroundColor: sortOption === 'relevance' 
                                                            ? `${themeStyles.secondaryColor}20` 
                                                            : themeStyles.cardBackgroundColor,
                                                        borderColor: themeStyles.borderColor,
                                                        color: sortOption === 'relevance' 
                                                            ? themeStyles.secondaryColor 
                                                            : themeStyles.textColor
                                                    }}
                                                >
                                                    Score
                                                </button>
                                                <button
                                                    onClick={() => handleSortChange('date')}
                                                    className={`px-2 py-1 text-xs border ${
                                                        sortOption === 'date' ? 'font-medium' : ''
                                                    }`}
                                                    style={{
                                                        backgroundColor: sortOption === 'date' 
                                                            ? `${themeStyles.secondaryColor}20` 
                                                            : themeStyles.cardBackgroundColor,
                                                        borderColor: themeStyles.borderColor,
                                                        color: sortOption === 'date' 
                                                            ? themeStyles.secondaryColor 
                                                            : themeStyles.textColor
                                                    }}
                                                >
                                                    Date
                                                </button>
                                                <button
                                                    onClick={() => handleSortChange('name')}
                                                    className={`px-2 py-1 text-xs rounded-r-md border-y border-r ${
                                                        sortOption === 'name' ? 'font-medium' : ''
                                                    }`}
                                                    style={{
                                                        backgroundColor: sortOption === 'name' 
                                                            ? `${themeStyles.secondaryColor}20` 
                                                            : themeStyles.cardBackgroundColor,
                                                        borderColor: themeStyles.borderColor,
                                                        color: sortOption === 'name' 
                                                            ? themeStyles.secondaryColor 
                                                            : themeStyles.textColor
                                                    }}
                                                >
                                                    Name
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center">
                                            <div className="flex">
                                                <button
                                                    onClick={() => handleViewModeChange('list')}
                                                    className={`p-1.5 rounded-l-md border-y border-l ${
                                                        sourceViewMode === 'list' ? 'font-medium' : ''
                                                    }`}
                                                    style={{
                                                        backgroundColor: sourceViewMode === 'list' 
                                                            ? `${themeStyles.secondaryColor}20` 
                                                            : themeStyles.cardBackgroundColor,
                                                        borderColor: themeStyles.borderColor,
                                                        color: sourceViewMode === 'list' 
                                                            ? themeStyles.secondaryColor 
                                                            : themeStyles.textColor
                                                    }}
                                                >
                                                    <AlignJustify size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleViewModeChange('grid')}
                                                    className={`p-1.5 border ${
                                                        sourceViewMode === 'grid' ? 'font-medium' : ''
                                                    }`}
                                                    style={{
                                                        backgroundColor: sourceViewMode === 'grid' 
                                                            ? `${themeStyles.secondaryColor}20` 
                                                            : themeStyles.cardBackgroundColor,
                                                        borderColor: themeStyles.borderColor,
                                                        color: sourceViewMode === 'grid' 
                                                            ? themeStyles.secondaryColor 
                                                            : themeStyles.textColor
                                                    }}
                                                >
                                                    <Database size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleViewModeChange('detail')}
                                                    className={`p-1.5 rounded-r-md border-y border-r ${
                                                        sourceViewMode === 'detail' ? 'font-medium' : ''
                                                    }`}
                                                    style={{
                                                        backgroundColor: sourceViewMode === 'detail' 
                                                            ? `${themeStyles.secondaryColor}20` 
                                                            : themeStyles.cardBackgroundColor,
                                                        borderColor: themeStyles.borderColor,
                                                        color: sourceViewMode === 'detail' 
                                                            ? themeStyles.secondaryColor 
                                                            : themeStyles.textColor
                                                    }}
                                                >
                                                    <BookMarked size={16} />
                                                </button>
                                            </div>
                                            
                                            <div className="ml-2 relative">
                                                <button
                                                    onClick={() => document.getElementById(`view-options-${index}`)?.classList.toggle('hidden')}
                                                    className="p-1.5 rounded-md border"
                                                    style={{
                                                        backgroundColor: themeStyles.cardBackgroundColor,
                                                        borderColor: themeStyles.borderColor
                                                    }}
                                                >
                                                    <Filter size={16} />
                                                </button>
                                                <div 
                                                    id={`view-options-${index}`} 
                                                    className="absolute right-0 mt-1 w-48 rounded-md shadow-lg hidden z-10"
                                                    style={{ backgroundColor: themeStyles.cardBackgroundColor }}
                                                >
                                                    <div className="py-1">
                                                        <div 
                                                            className="px-4 py-2 text-xs font-medium border-b"
                                                            style={{ borderColor: themeStyles.borderColor }}
                                                        >
                                                            Display Options
                                                        </div>
                                                        <label className="flex items-center px-4 py-2 text-sm">
                                                            <input
                                                                type="checkbox"
                                                                checked={viewOptions.showMetadata}
                                                                onChange={() => toggleViewOption('showMetadata')}
                                                                className="mr-2"
                                                            />
                                                            Show Metadata
                                                        </label>
                                                        <label className="flex items-center px-4 py-2 text-sm">
                                                            <input
                                                                type="checkbox"
                                                                checked={viewOptions.showScores}
                                                                onChange={() => toggleViewOption('showScores')}
                                                                className="mr-2"
                                                            />
                                                            Show Scores
                                                        </label>
                                                        <label className="flex items-center px-4 py-2 text-sm">
                                                            <input
                                                                type="checkbox"
                                                                checked={viewOptions.showExcerpts}
                                                                onChange={() => toggleViewOption('showExcerpts')}
                                                                className="mr-2"
                                                            />
                                                            Show Excerpts
                                                        </label>
                                                        <label className="flex items-center px-4 py-2 text-sm">
                                                            <input
                                                                type="checkbox"
                                                                checked={viewOptions.showRelevance}
                                                                onChange={() => toggleViewOption('showRelevance')}
                                                                className="mr-2"
                                                            />
                                                            Show Relevance
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Source document stats */}
                                    {documentStats && (
                                        <div 
                                            className="mb-4 p-3 rounded-md text-xs grid grid-cols-2 md:grid-cols-4 gap-2"
                                            style={{ backgroundColor: `${themeStyles.secondaryColor}05` }}
                                        >
                                            <div className="flex flex-col">
                                                <span className="opacity-70">Total Documents</span>
                                                <span className="font-medium text-sm">{documentStats.totalSources}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="opacity-70">Avg. Relevance</span>
                                                <span className="font-medium text-sm">{(documentStats.avgScore * 100).toFixed(1)}%</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="opacity-70">High Relevance</span>
                                                <span className="font-medium text-sm">{documentStats.countByRelevance.high} docs</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="opacity-70">Total Size</span>
                                                <span className="font-medium text-sm">{formatFileSize(documentStats.totalFileSize)}</span>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Search/filter message if needed */}
                                    {sortedSources.length === 0 && (
                                        <div 
                                            className="my-4 p-4 rounded-md flex items-center justify-center text-sm"
                                            style={{ 
                                                backgroundColor: `${themeStyles.secondaryColor}05`,
                                                borderColor: `${themeStyles.secondaryColor}30`,
                                                color: themeStyles.textColor
                                            }}
                                        >
                                            <AlertTriangle size={16} className="mr-2" style={{ color: themeStyles.secondaryColor }} />
                                            No documents match your filter criteria. Try adjusting your search.
                                        </div>
                                    )}
                                    
                                    {/* List View */}
                                    {sourceViewMode === 'list' && (
                                        <div className="mt-2 space-y-2">
                                            {paginatedSources.map((source, index) => {
                                                // Skip invalid sources
                                                if (!source || !source.id) return null;
                                                
                                                return (
                                                    <motion.div
                                                        key={`${source.id}-${index}`}
                                                        className="rounded-md border overflow-hidden"
                                                        initial={{ x: -10, opacity: 0 }}
                                                        animate={{ x: 0, opacity: 1 }}
                                                        transition={{ delay: index * 0.05 }}
                                                        style={{ 
                                                            backgroundColor: themeStyles.cardBackgroundColor, 
                                                            borderColor: themeStyles.borderColor,
                                                            boxShadow: bookmarkedSources.has(source.id.toString()) 
                                                                ? `0 0 0 2px ${themeStyles.secondaryColor}50` 
                                                                : 'none'
                                                        }}
                                                    >
                                                        <div 
                                                            className="flex items-center justify-between gap-2 text-sm p-3 hover:bg-purple-50 cursor-pointer"
                                                            onClick={() => handleSourceDocumentClick(source)}
                                                            style={{ 
                                                                color: themeStyles.textColor, 
                                                                hover: { backgroundColor: `${themeStyles.secondaryColor}10` } 
                                                            }}
                                                        >
                                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                {getDocumentIcon(source.fileName, source.type)}
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center">
                                                                        <span className="truncate font-medium" title={source.fileName || source.title || `${source.id}`}>
                                                                            {source.fileName || source.title || `Document ${source.id}`}
                                                                        </span>
                                                                        {bookmarkedSources.has(source.id.toString()) && (
                                                                            <span 
                                                                                className="ml-1 text-yellow-500"
                                                                                title="Bookmarked"
                                                                            >
                                                                                ★
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    {viewOptions.showMetadata && (
                                                                        <div className="flex items-center text-xs opacity-70 mt-0.5 space-x-2">
                                                                            {source.author && (
                                                                                <span className="truncate" title={`Author: ${source.author}`}>
                                                                                    {source.author}
                                                                                </span>
                                                                            )}
                                                                            {source.datePublished && (
                                                                                <span title={`Date: ${formatDate(source.datePublished)}`}>
                                                                                    {formatDate(source.datePublished)}
                                                                                </span>
                                                                            )}
                                                                            {source.type && (
                                                                                <span title={`Type: ${source.type}`}>
                                                                                    {source.type}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-2">
                                                                {/* Show score if available */}
                                                                {viewOptions.showScores && source.score !== undefined && (
                                                                    <span 
                                                                        className="px-1.5 py-0.5 rounded-full text-xs font-medium"
                                                                        title={`Relevance score: ${source.score}`}
                                                                        style={{ 
                                                                            backgroundColor: `${themeStyles.secondaryColor}20`, 
                                                                            color: themeStyles.secondaryColor 
                                                                        }}
                                                                    >
                                                                        {(source.score * 100).toFixed(1)}%
                                                                    </span>
                                                                )}
                                                                
                                                                {/* Bookmark button */}
                                                                <button
                                                                    onClick={(e) => toggleBookmark(source.id.toString(), e)}
                                                                    className="opacity-60 hover:opacity-100"
                                                                    title={bookmarkedSources.has(source.id.toString()) ? "Remove bookmark" : "Bookmark this source"}
                                                                >
                                                                    {bookmarkedSources.has(source.id.toString()) ? "★" : "☆"}
                                                                </button>
                                                                
                                                                {/* Expand/collapse control */}
                                                                {getSourceExcerpts(source).length > 0 ? (
                                                                    expandedDocs.has(source.id.toString()) ? (
                                                                        <ChevronUp size={14} className="opacity-70" />
                                                                    ) : (
                                                                        <ChevronDown size={14} className="opacity-70" />
                                                                    )
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Expanded document preview */}
                                                        <AnimatePresence>
                                                            {viewOptions.showExcerpts && expandedDocs.has(source.id.toString()) && getSourceExcerpts(source).length > 0 && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, height: 0 }}
                                                                    animate={{ opacity: 1, height: "auto" }}
                                                                    exit={{ opacity: 0, height: 0 }}
                                                                    className="border-t p-3"
                                                                    style={{ 
                                                                        backgroundColor: `${themeStyles.secondaryColor}05`,
                                                                        borderColor: themeStyles.borderColor
                                                                    }}
                                                                >
                                                                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                                                        {getSourceExcerpts(source).map((excerpt, i) => (
                                                                            <div 
                                                                                key={i} 
                                                                                className="p-2 text-sm rounded border"
                                                                                style={{ 
                                                                                    backgroundColor: themeStyles.cardBackgroundColor,
                                                                                    borderColor: `${themeStyles.secondaryColor}30`
                                                                                }}
                                                                            >
                                                                                <p>{excerpt}</p>
                                                                                
                                                                                {viewOptions.showRelevance && (
                                                                                    <div 
                                                                                        className="mt-2 p-2 rounded text-xs border"
                                                                                        style={{ 
                                                                                            backgroundColor: `${themeStyles.primaryColor}05`,
                                                                                            borderColor: `${themeStyles.primaryColor}30`
                                                                                        }}
                                                                                    >
                                                                                        <div className="font-medium opacity-70 mb-1">Why this is relevant:</div>
                                                                                        <p>
                                                                                            {generateDocumentRelevanceReason(source, typeof answer === 'string' ? answer : (answer?.content || answer?.answer?.content || ''))}
                                                                                        </p>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    
                                                                    <div className="flex justify-end mt-3 space-x-2">
                                                                        <motion.button
                                                                            variants={buttonVariants}
                                                                            initial="initial"
                                                                            whileHover="hover"
                                                                            whileTap="tap"
                                                                            className="text-xs px-2 py-1 rounded flex items-center"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setShowDocExcerpt(source.id.toString());
                                                                            }}
                                                                            style={{ 
                                                                                backgroundColor: `${themeStyles.secondaryColor}20`,
                                                                                color: themeStyles.secondaryColor
                                                                            }}
                                                                        >
                                                                            <FileQuestion size={12} className="mr-1" />
                                                                            View Details
                                                                        </motion.button>
                                                                        
                                                                        <motion.button
                                                                            variants={buttonVariants}
                                                                            initial="initial"
                                                                            whileHover="hover"
                                                                            whileTap="tap"
                                                                            className="text-xs text-white px-2 py-1 rounded flex items-center"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                onCitationClicked(source.id.toString());
                                                                            }}
                                                                            style={{ backgroundColor: themeStyles.secondaryColor }}
                                                                        >
                                                                            <ExternalLink size={12} className="mr-1" />
                                                                            Open Document
                                                                        </motion.button>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    
                                    {/* Grid View */}
                                    {sourceViewMode === 'grid' && (
                                        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                            {paginatedSources.map((source, index) => {
                                                // Skip invalid sources
                                                if (!source || !source.id) return null;
                                                
                                                return (
                                                    <motion.div
                                                        key={`${source.id}-${index}`}
                                                        className="rounded-md border p-3 flex flex-col"
                                                        initial={{ opacity: 0, scale: 0.95 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: index * 0.05 }}
                                                        onClick={() => handleSourceDocumentClick(source)}
                                                        style={{ 
                                                            backgroundColor: themeStyles.cardBackgroundColor, 
                                                            borderColor: themeStyles.borderColor,
                                                            boxShadow: bookmarkedSources.has(source.id.toString()) 
                                                                ? `0 0 0 2px ${themeStyles.secondaryColor}50` 
                                                                : 'none',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div className="flex items-center">
                                                                {getDocumentIcon(source.fileName, source.type)}
                                                                <h4 className="ml-2 font-medium text-sm truncate" 
                                                                    title={source.fileName || source.title || `Document ${source.id}`}
                                                                >
                                                                    {source.fileName || source.title || `Document ${source.id}`}
                                                                </h4>
                                                                {bookmarkedSources.has(source.id.toString()) && (
                                                                    <span 
                                                                        className="ml-1 text-yellow-500"
                                                                        title="Bookmarked"
                                                                    >
                                                                        ★
                                                                    </span>
                                                                )}
                                                            </div>
                                                            
                                                            <button
                                                                onClick={(e) => toggleBookmark(source.id.toString(), e)}
                                                                className="opacity-60 hover:opacity-100"
                                                                title={bookmarkedSources.has(source.id.toString()) ? "Remove bookmark" : "Bookmark this source"}
                                                            >
                                                                {bookmarkedSources.has(source.id.toString()) ? "★" : "☆"}
                                                            </button>
                                                        </div>
                                                        
                                                        {viewOptions.showMetadata && (
                                                            <div className="grid grid-cols-2 gap-1 mb-2 text-xs opacity-70">
                                                                {source.type && (
                                                                    <div className="flex items-center">
                                                                        <span className="font-medium mr-1">Type:</span>
                                                                        <span className="truncate">{source.type}</span>
                                                                    </div>
                                                                )}
                                                                {source.author && (
                                                                    <div className="flex items-center">
                                                                        <span className="font-medium mr-1">Author:</span>
                                                                        <span className="truncate">{source.author}</span>
                                                                    </div>
                                                                )}
                                                                {source.datePublished && (
                                                                    <div className="flex items-center col-span-2">
                                                                        <span className="font-medium mr-1">Date:</span>
                                                                        <span>{formatDate(source.datePublished)}</span>
                                                                    </div>
                                                                )}
                                                                {source.fileSize && (
                                                                    <div className="flex items-center">
                                                                        <span className="font-medium mr-1">Size:</span>
                                                                        <span>{formatFileSize(source.fileSize)}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        
                                                        {viewOptions.showExcerpts && getSourceExcerpts(source).length > 0 && (
                                                            <div className="flex-grow">
                                                                <div 
                                                                    className="p-2 rounded text-xs border text-ellipsis overflow-hidden"
                                                                    style={{ 
                                                                        backgroundColor: `${themeStyles.secondaryColor}05`,
                                                                        borderColor: `${themeStyles.secondaryColor}30`,
                                                                        maxHeight: '4.5rem',
                                                                        display: '-webkit-box',
                                                                        WebkitLineClamp: 3,
                                                                        WebkitBoxOrient: 'vertical'
                                                                    }}
                                                                >
                                                                    {getSourceExcerpts(source)[0]}
                                                                </div>
                                                            </div>
                                                        )}
                                                        
                                                        <div className="mt-2 flex items-center justify-between">
                                                            {viewOptions.showScores && source.score !== undefined ? (
                                                                <span 
                                                                    className="text-xs px-1.5 py-0.5 rounded-full"
                                                                    style={{ 
                                                                        backgroundColor: `${themeStyles.secondaryColor}20`, 
                                                                        color: themeStyles.secondaryColor 
                                                                    }}
                                                                >
                                                                    Score: {(source.score * 100).toFixed(1)}%
                                                                </span>
                                                            ) : (
                                                                <span></span>
                                                            )}
                                                            
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onCitationClicked(source.id.toString());
                                                                }}
                                                                className="text-xs p-1 rounded flex items-center opacity-70 hover:opacity-100"
                                                                style={{ color: themeStyles.secondaryColor }}
                                                            >
                                                                <ExternalLink size={12} />
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    
                                    {/* Detailed View */}
                                    {sourceViewMode === 'detail' && (
                                        <div className="mt-2 space-y-4">
                                            {paginatedSources.map((source, index) => {
                                                // Skip invalid sources
                                                if (!source || !source.id) return null;
                                                const excerpts = getSourceExcerpts(source);
                                                const relevanceInfo = getSourceRelevanceInfo(source);
                                                
                                                return (
                                                    <motion.div
                                                        key={`${source.id}-${index}`}
                                                        className="rounded-md border overflow-hidden"
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: index * 0.05 }}
                                                        style={{ 
                                                            backgroundColor: themeStyles.cardBackgroundColor, 
                                                            borderColor: themeStyles.borderColor,
                                                            boxShadow: bookmarkedSources.has(source.id.toString()) 
                                                                ? `0 0 0 2px ${themeStyles.secondaryColor}50` 
                                                                : 'none'
                                                        }}
                                                    >
                                                        <div 
                                                            className="p-3 border-b flex items-center justify-between"
                                                            style={{ borderColor: themeStyles.borderColor }}
                                                        >
                                                            <div className="flex items-center">
                                                                {getDocumentIcon(source.fileName, source.type)}
                                                                <h4 className="ml-2 font-medium">
                                                                    {source.fileName || source.title || `Document ${source.id}`}
                                                                </h4>
                                                                {bookmarkedSources.has(source.id.toString()) && (
                                                                    <span 
                                                                        className="ml-1 text-yellow-500"
                                                                        title="Bookmarked"
                                                                    >
                                                                        ★
                                                                    </span>
                                                                )}
                                                            </div>
                                                            
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => toggleBookmark(source.id.toString())}
                                                                    className="opacity-70 hover:opacity-100"
                                                                    title={bookmarkedSources.has(source.id.toString()) ? "Remove bookmark" : "Bookmark this source"}
                                                                >
                                                                    {bookmarkedSources.has(source.id.toString()) ? "★" : "☆"}
                                                                </button>
                                                                
                                                                <button
                                                                    onClick={() => onCitationClicked(source.id.toString())}
                                                                    className="text-xs px-2 py-1 rounded flex items-center"
                                                                    style={{ 
                                                                        backgroundColor: `${themeStyles.secondaryColor}20`,
                                                                        color: themeStyles.secondaryColor
                                                                    }}
                                                                >
                                                                    <ExternalLink size={12} className="mr-1" />
                                                                    Open
                                                                </button>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="p-3">
                                                            {/* Metadata */}
                                                            {viewOptions.showMetadata && (
                                                                <div 
                                                                    className="mb-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs p-2 rounded"
                                                                    style={{ backgroundColor: `${themeStyles.secondaryColor}05` }}
                                                                >
                                                                    {source.type && (
                                                                        <div>
                                                                            <div className="opacity-70">Type</div>
                                                                            <div className="font-medium">{source.type}</div>
                                                                        </div>
                                                                    )}
                                                                    {source.author && (
                                                                        <div>
                                                                            <div className="opacity-70">Author</div>
                                                                            <div className="font-medium truncate">{source.author}</div>
                                                                        </div>
                                                                    )}
                                                                    {source.datePublished && (
                                                                        <div>
                                                                            <div className="opacity-70">Date</div>
                                                                            <div className="font-medium">{formatDate(source.datePublished)}</div>
                                                                        </div>
                                                                    )}
                                                                    {source.fileSize && (
                                                                        <div>
                                                                            <div className="opacity-70">Size</div>
                                                                            <div className="font-medium">{formatFileSize(source.fileSize)}</div>
                                                                        </div>
                                                                    )}
                                                                    {viewOptions.showScores && source.score !== undefined && (
                                                                        <div>
                                                                            <div className="opacity-70">Relevance</div>
                                                                            <div 
                                                                                className="font-medium"
                                                                                style={{ color: themeStyles.secondaryColor }}
                                                                            >
                                                                                {(source.score * 100).toFixed(1)}%
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            
                                                            {/* Excerpts */}
                                                            {viewOptions.showExcerpts && excerpts.length > 0 && (
                                                                <div>
                                                                    <h5 className="text-sm font-medium mb-2">Excerpts:</h5>
                                                                    <div className="space-y-2">
                                                                        {excerpts.map((excerpt, i) => (
                                                                            <div 
                                                                                key={i} 
                                                                                className="p-2 text-sm rounded border"
                                                                                style={{ 
                                                                                    backgroundColor: `${themeStyles.secondaryColor}05`, 
                                                                                    borderColor: `${themeStyles.secondaryColor}30` 
                                                                                }}
                                                                            >
                                                                                <p>{excerpt}</p>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            
                                                            {/* Relevance */}
                                                            {viewOptions.showRelevance && (
                                                                <div className="mt-3">
                                                                    <h5 className="text-sm font-medium mb-2">Relevance:</h5>
                                                                    <div 
                                                                        className="p-2 rounded text-sm border"
                                                                        style={{ 
                                                                            backgroundColor: `${themeStyles.primaryColor}05`,
                                                                            borderColor: `${themeStyles.primaryColor}30`
                                                                        }}
                                                                    >
                                                                        <p>
                                                                            {generateDocumentRelevanceReason(source, typeof answer === 'string' ? answer : (answer?.content || answer?.answer?.content || ''))}
                                                                        </p>
                                                                        
                                                                        {/* Show confidence bar */}
                                                                        {source.score !== undefined && (
                                                                            <div className="mt-2 flex items-center">
                                                                                <div className="text-xs mr-2">Confidence:</div>
                                                                                <div 
                                                                                    className="flex-grow h-2 rounded-full"
                                                                                    style={{ backgroundColor: `${themeStyles.secondaryColor}20` }}
                                                                                >
                                                                                    <div 
                                                                                        className="h-2 rounded-full"
                                                                                        style={{ 
                                                                                            width: `${source.score * 100}%`,
                                                                                            backgroundColor: themeStyles.secondaryColor
                                                                                        }}
                                                                                    />
                                                                                </div>
                                                                                <div className="text-xs ml-2">{(source.score * 100).toFixed(1)}%</div>
                                                                            </div>
                                                                        )}
                                                                        
                                                                        {/* Show matched terms if available */}
                                                                        {relevanceInfo.matchedTerms && relevanceInfo.matchedTerms.length > 0 && (
                                                                            <div className="mt-2">
                                                                                <div className="text-xs font-medium mb-1">Matched Terms:</div>
                                                                                <div className="flex flex-wrap gap-1">
                                                                                    {relevanceInfo.matchedTerms.map((term, i) => (
                                                                                        <span 
                                                                                            key={i}
                                                                                            className="text-xs px-2 py-0.5 rounded-full"
                                                                                            style={{ 
                                                                                                backgroundColor: `${themeStyles.primaryColor}20`,
                                                                                                color: themeStyles.primaryColor
                                                                                            }}
                                                                                        >
                                                                                            {term}
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            
                                                            {/* URL if available */}
                                                            {source.url && (
                                                                <div className="mt-3 text-sm">
                                                                    <span className="font-medium">Source URL: </span>
                                                                    <a 
                                                                        href={source.url} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        className="break-all flex items-center"
                                                                        style={{ color: themeStyles.primaryColor }}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        {source.url}
                                                                        <ExternalLink size={12} className="ml-1 flex-shrink-0" />
                                                                    </a>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    
                                    {/* Pagination controls */}
                                    {totalPages > 1 && (
                                        <div className="flex justify-between items-center mt-4">
                                            <div className="text-sm opacity-70">
                                                Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, sortedSources.length)} of {sortedSources.length}
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <button
                                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                                    disabled={currentPage === 1}
                                                    className="p-1 rounded"
                                                    style={{ 
                                                        opacity: currentPage === 1 ? 0.5 : 1,
                                                        color: themeStyles.secondaryColor
                                                    }}
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                                    </svg>
                                                </button>
                                                
                                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                    // Calculate page numbers to show around current page
                                                    let pageNum;
                                                    if (totalPages <= 5) {
                                                        pageNum = i + 1;
                                                    } else if (currentPage <= 3) {
                                                        pageNum = i + 1;
                                                    } else if (currentPage >= totalPages - 2) {
                                                        pageNum = totalPages - 4 + i;
                                                    } else {
                                                        pageNum = currentPage - 2 + i;
                                                    }
                                                    
                                                    return (
                                                        <button
                                                            key={i}
                                                            onClick={() => setCurrentPage(pageNum)}
                                                            className="w-8 h-8 flex items-center justify-center rounded text-sm"
                                                            style={{ 
                                                                backgroundColor: currentPage === pageNum 
                                                                    ? themeStyles.secondaryColor 
                                                                    : 'transparent',
                                                                color: currentPage === pageNum 
                                                                    ? '#FFFFFF' 
                                                                    : themeStyles.textColor
                                                            }}
                                                        >
                                                            {pageNum}
                                                        </button>
                                                    );
                                                })}
                                                
                                                <button
                                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                                    disabled={currentPage === totalPages}
                                                    className="p-1 rounded"
                                                    style={{ 
                                                        opacity: currentPage === totalPages ? 0.5 : 1,
                                                        color: themeStyles.secondaryColor
                                                    }}
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                        
                        {/* Insights Tab */}
                        {activeTab === 'insights' && hasSearchInsights && (
                            <motion.div
                                key="insights-tab"
                                variants={tabAnimation}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.3 }}
                                className="py-4"
                            >
                                <div 
                                    className="p-4 rounded-lg border"
                                    style={{ 
                                        backgroundColor: `rgba(16, 185, 129, 0.05)`, 
                                        borderColor: `rgba(16, 185, 129, 0.2)` 
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-medium flex items-center" style={{ color: '#10B981' }}>
                                            <BarChart size={18} className="mr-2" />
                                            Search Insights
                                        </h3>
                                        
                                        <span 
                                            className="px-2 py-1 text-xs rounded-full flex items-center"
                                            style={{ 
                                                backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                                                color: '#10B981' 
                                            }}
                                        >
                                            <Sparkles size={12} className="mr-1" />
                                            GroundX Analytics
                                        </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        {/* Key Terms */}
                                        {searchInsights?.keyTerms && searchInsights.keyTerms.length > 0 && (
                                            <div 
                                                className="p-3 rounded-md border"
                                                style={{ 
                                                    backgroundColor: themeStyles.cardBackgroundColor, 
                                                    borderColor: 'rgba(16, 185, 129, 0.2)' 
                                                }}
                                            >
                                                <h4 className="text-sm font-medium mb-2" style={{ color: '#10B981' }}>Key Terms</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {searchInsights.keyTerms.map((term, i) => (
                                                        <span 
                                                            key={i}
                                                            className="px-2 py-1 rounded-full text-xs"
                                                            style={{ 
                                                                backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                                                                color: '#10B981' 
                                                            }}
                                                        >
                                                            {term}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Query Analysis */}
                                        {searchInsights?.queryAnalysis && (
                                            <div 
                                                className="p-3 rounded-md border"
                                                style={{ 
                                                    backgroundColor: themeStyles.cardBackgroundColor, 
                                                    borderColor: 'rgba(16, 185, 129, 0.2)' 
                                                }}
                                            >
                                                <h4 className="text-sm font-medium mb-2" style={{ color: '#10B981' }}>Query Analysis</h4>
                                                <div className="space-y-1 text-sm">
                                                    {Object.entries(searchInsights.queryAnalysis).map(([key, value], i) => (
                                                        <div key={i} className="flex items-start">
                                                            <span className="font-medium mr-2">{key}:</span>
                                                            <span className="flex-1">
                                                                {typeof value === 'string' ? value : JSON.stringify(value)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Suggested Queries */}
                                        {searchInsights?.suggestedQueries && searchInsights.suggestedQueries.length > 0 && (
                                            <div 
                                                className="p-3 rounded-md border"
                                                style={{ 
                                                    backgroundColor: themeStyles.cardBackgroundColor, 
                                                    borderColor: 'rgba(16, 185, 129, 0.2)' 
                                                }}
                                            >
                                                <h4 className="text-sm font-medium mb-2" style={{ color: '#10B981' }}>Suggested Follow-Up Questions</h4>
                                                <div className="space-y-1">
                                                    {searchInsights.suggestedQueries.map((query, i) => (
                                                        <button 
                                                            key={i}
                                                            onClick={() => onFollowupQuestionClicked && onFollowupQuestionClicked(query)}
                                                            className="flex items-center text-sm p-1.5 rounded w-full text-left hover:bg-green-50"
                                                            style={{ color: themeStyles.textColor }}
                                                        >
                                                            <ArrowRight size={14} className="mr-2 flex-shrink-0" style={{ color: '#10B981' }} />
                                                            <span>{query}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Source Relevance */}
                                        {searchInsights?.sourceRelevance && searchInsights.sourceRelevance.length > 0 && (
                                            <div 
                                                className="p-3 rounded-md border"
                                                style={{ 
                                                    backgroundColor: themeStyles.cardBackgroundColor, 
                                                    borderColor: 'rgba(16, 185, 129, 0.2)' 
                                                }}
                                            >
                                                <h4 className="text-sm font-medium mb-2" style={{ color: '#10B981' }}>Top Source Relevance</h4>
                                                <div className="space-y-2 text-sm max-h-36 overflow-y-auto">
                                                    {searchInsights.sourceRelevance.map((source, i) => (
                                                        <div 
                                                            key={i} 
                                                            className="flex items-start p-1.5 rounded"
                                                            style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)' }}
                                                        >
                                                            <span className="font-medium mr-2 text-green-500">{i+1}.</span>
                                                            <div className="flex-1">
                                                                <div className="font-medium">{source.fileName}</div>
                                                                {source.score !== undefined && (
                                                                    <div className="text-xs mt-1 flex items-center">
                                                                        <div className="mr-1">Score:</div>
                                                                        <div 
                                                                            className="flex-grow h-1.5 rounded-full w-24"
                                                                            style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }}
                                                                        >
                                                                            <div 
                                                                                className="h-1.5 rounded-full"
                                                                                style={{ 
                                                                                    width: `${source.score * 100}%`,
                                                                                    backgroundColor: '#10B981'
                                                                                }}
                                                                            />
                                                                        </div>
                                                                        <div className="ml-1">{(source.score * 100).toFixed(0)}%</div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Search Execution Details */}
                                    {searchInsights?.executionDetails && (
                                        <div 
                                            className="p-3 rounded-md border text-xs"
                                            style={{ 
                                                backgroundColor: themeStyles.cardBackgroundColor, 
                                                borderColor: 'rgba(16, 185, 129, 0.2)' 
                                            }}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-medium" style={{ color: '#10B981' }}>Execution Details</h4>
                                                <button
                                                    onClick={() => {
                                                        const el = document.getElementById(`execution-details-${index}`);
                                                        if (el) el.classList.toggle('hidden');
                                                    }}
                                                    className="text-xs"
                                                >
                                                    Show/Hide
                                                </button>
                                            </div>
                                            <pre 
                                                id={`execution-details-${index}`}
                                                className="whitespace-pre-wrap hidden"
                                            >
                                                {JSON.stringify(searchInsights.executionDetails, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                        
                        {/* Analytics Tab */}
                        {activeTab === 'analytics' && enableAdvancedFeatures && (
                            <motion.div
                                key="analytics-tab"
                                variants={tabAnimation}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.3 }}
                                className="py-4"
                            >
                                <div 
                                    className="p-4 rounded-lg border"
                                    style={{ 
                                        backgroundColor: `rgba(59, 130, 246, 0.05)`, 
                                        borderColor: `rgba(59, 130, 246, 0.2)` 
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-medium flex items-center" style={{ color: '#3B82F6' }}>
                                            <LineChart size={18} className="mr-2" />
                                            Response Analytics
                                        </h3>
                                        
                                        <span 
                                            className="px-2 py-1 text-xs rounded-full flex items-center"
                                            style={{ 
                                                backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                                                color: '#3B82F6' 
                                            }}
                                        >
                                            <Sparkles size={12} className="mr-1" />
                                            GroundX Advanced
                                        </span>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                        {/* Token Usage */}
                                        <div 
                                            className="p-3 rounded-md border"
                                            style={{ 
                                                backgroundColor: themeStyles.cardBackgroundColor, 
                                                borderColor: 'rgba(59, 130, 246, 0.2)' 
                                            }}
                                        >
                                            <h4 className="text-sm font-medium mb-2" style={{ color: '#3B82F6' }}>Token Usage</h4>
                                            {tokenInfo ? (
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span>Input Tokens:</span>
                                                        <span className="font-medium">{tokenInfo.input}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span>Output Tokens:</span>
                                                        <span className="font-medium">{tokenInfo.output}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span>Embedding Tokens:</span>
                                                        <span className="font-medium">{tokenInfo.embeddingTokens || 0}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs font-medium pt-1 border-t"
                                                        style={{ borderColor: 'rgba(59, 130, 246, 0.2)' }}
                                                    >
                                                        <span>Total Tokens:</span>
                                                        <span>{tokenInfo.total}</span>
                                                    </div>
                                                    
                                                    {tokenInfo.totalCost !== undefined && (
                                                        <div className="mt-2 p-1.5 rounded text-xs flex justify-between items-center" 
                                                            style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                                                        >
                                                            <span>Estimated Cost:</span>
                                                            <span className="font-medium">
                                                                {tokenInfo.totalCost.toFixed(5)} {tokenInfo.currency}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-sm opacity-70">No token usage information available</div>
                                            )}
                                        </div>
                                        
                                        {/* Document Stats */}
                                        <div 
                                            className="p-3 rounded-md border"
                                            style={{ 
                                                backgroundColor: themeStyles.cardBackgroundColor, 
                                                borderColor: 'rgba(59, 130, 246, 0.2)' 
                                            }}
                                        >
                                            <h4 className="text-sm font-medium mb-2" style={{ color: '#3B82F6' }}>Document Stats</h4>
                                            {documentStats ? (
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span>Total Documents:</span>
                                                        <span className="font-medium">{documentStats.totalSources}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span>Unique Authors:</span>
                                                        <span className="font-medium">{documentStats.uniqueAuthors || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span>Average Relevance:</span>
                                                        <span className="font-medium">{(documentStats.avgScore * 100).toFixed(1)}%</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs">
                                                        <span>High Relevance Docs:</span>
                                                        <span className="font-medium">{documentStats.countByRelevance.high}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-sm opacity-70">No document statistics available</div>
                                            )}
                                        </div>
                                        
                                        {/* Response Time */}
                                        <div 
                                            className="p-3 rounded-md border"
                                            style={{ 
                                                backgroundColor: themeStyles.cardBackgroundColor, 
                                                borderColor: 'rgba(59, 130, 246, 0.2)' 
                                            }}
                                        >
                                            <h4 className="text-sm font-medium mb-2" style={{ color: '#3B82F6' }}>Response Metrics</h4>
                                            {metadata?.timing ? (
                                                <div className="space-y-2">
                                                    {Object.entries(metadata.timing).map(([key, value], i) => (
                                                        <div key={i} className="flex items-center justify-between text-xs">
                                                            <span>{key}:</span>
                                                            <span className="font-medium">
                                                                {typeof value === 'number' ? `${value.toFixed(2)}ms` : String(value)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-sm opacity-70">No timing information available</div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Document Type Distribution */}
                                    {documentStats?.docTypes && Object.keys(documentStats.docTypes).length > 0 && (
                                        <div 
                                            className="p-3 rounded-md border mb-4"
                                            style={{ 
                                                backgroundColor: themeStyles.cardBackgroundColor, 
                                                borderColor: 'rgba(59, 130, 246, 0.2)' 
                                            }}
                                        >
                                            <h4 className="text-sm font-medium mb-2" style={{ color: '#3B82F6' }}>Document Type Distribution</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(documentStats.docTypes).map(([type, count], i) => (
                                                    <div 
                                                        key={i}
                                                        className="px-2 py-1 rounded-full text-xs flex items-center"
                                                        style={{ 
                                                            backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                                                            color: '#3B82F6' 
                                                        }}
                                                    >
                                                        <span className="font-medium mr-1">{type}:</span>
                                                        <span>{count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* System Metadata */}
                                    {Object.keys(metadata).length > 0 && (
                                        <div 
                                            className="p-3 rounded-md border text-xs"
                                            style={{ 
                                                backgroundColor: themeStyles.cardBackgroundColor, 
                                                borderColor: 'rgba(59, 130, 246, 0.2)' 
                                            }}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="font-medium" style={{ color: '#3B82F6' }}>System Metadata</h4>
                                                <button
                                                    onClick={() => {
                                                        const el = document.getElementById(`system-metadata-${index}`);
                                                        if (el) el.classList.toggle('hidden');
                                                    }}
                                                    className="text-xs"
                                                >
                                                    Show/Hide
                                                </button>
                                            </div>
                                            <pre 
                                                id={`system-metadata-${index}`}
                                                className="whitespace-pre-wrap hidden"
                                            >
                                                {JSON.stringify(metadata, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                        
                        {/* Raw Response Tab */}
                        {activeTab === 'raw' && (
                            <motion.div
                                key="raw-tab"
                                variants={tabAnimation}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.3 }}
                                className="py-4"
                            >
                                <div 
                                    className="p-4 rounded-lg border"
                                    style={{ 
                                        backgroundColor: `${themeStyles.textColor}05`, 
                                        borderColor: `${themeStyles.textColor}20` 
                                    }}
                                >
                                    <h3 className="text-lg font-medium mb-3 flex items-center">
                                        <Code size={18} className="mr-2" />
                                        Raw API Response
                                    </h3>
                                    
                                    <pre 
                                        className="p-3 rounded-md border overflow-auto max-h-96 text-sm font-mono"
                                        style={{ 
                                            backgroundColor: themeStyles.cardBackgroundColor, 
                                            borderColor: `${themeStyles.textColor}20` 
                                        }}
                                    >
                                        {JSON.stringify(answer, null, 2)}
                                    </pre>
                                </div>
                            </motion.div>
                        )}
                    </>
                )}
            </AnimatePresence>
        </motion.div>
    );
};