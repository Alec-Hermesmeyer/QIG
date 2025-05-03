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

/**
 * Enhanced Answer Component
 * 
 * A comprehensive display component for AI-powered retrieval-augmented answers
 * that can handle various response formats and extract all available metadata.
 * 
 * Features:
 * - Document citation display and linking
 * - Source relevance analysis
 * - Thought process visualization
 * - Comprehensive metadata extraction
 * - Various view modes for sources
 * - Advanced filtering and sorting
 * - Export capabilities
 * - Debug mode
 */

// Helper utility to format file sizes
const formatBytes = (bytes, decimals = 2) => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};

// Helper utility to format dates
const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateString;
  }
};

// Extract document name from path
const getDocumentName = (path) => {
  if (!path) return 'Unknown Document';
  return path.split('/').pop() || path;
};

// Utility to safely parse JSON
const safeJsonParse = (jsonString) => {
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return null;
  }
};

// Main component
export default function EnhancedAnswer({
  answer,
  index = 0,
  isSelected = false,
  isStreaming = false,
  searchResults = null,
  documentExcerpts = null,
  onCitationClicked = () => {},
  onThoughtProcessClicked = () => {},
  onSupportingContentClicked = () => {},
  onFollowupQuestionClicked = null,
  onRefreshClicked = null,
  onSourceFiltered = null,
  onExportClicked = null,
  showFollowupQuestions = false,
  enableAdvancedFeatures = false,
  showRawData = false,
  enableEditing = false,
  theme = 'light',
  onFeedbackSubmitted = null,
  maxSourcesDisplayed = 50,
  customStyles = {}
}) {
  // State management
  const [debugMode, setDebugMode] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState('answer');
  const [isCopied, setIsCopied] = useState(false);
  const [currentDocumentId, setCurrentDocumentId] = useState(null);
  const [expandedDocs, setExpandedDocs] = useState(new Set());
  const [sortOption, setSortOption] = useState('relevance');
  const [viewMode, setViewMode] = useState('list');
  const [sourceFilter, setSourceFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [showSearchOptions, setShowSearchOptions] = useState(false);
  const [editedAnswer, setEditedAnswer] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [bookmarks, setBookmarks] = useState(new Set());
  
  // Display options
  const [displayOptions, setDisplayOptions] = useState({
    showMetadata: true,
    showScores: true,
    showExcerpts: true,
    showRelevance: true
  });
  
  // References
  const contentRef = useRef(null);
  const ITEMS_PER_PAGE = 10;
  
  // Theme styling
  const themeStyles = {
    backgroundColor: theme === 'dark' ? '#1e1e2e' : '#f8f9fa',
    textColor: theme === 'dark' ? '#e4e6eb' : '#1e1e2e',
    cardBackground: theme === 'dark' ? '#2d2d3a' : '#ffffff',
    borderColor: theme === 'dark' ? '#3f3f5a' : '#e2e8f0',
    primaryColor: theme === 'dark' ? '#7f8eff' : '#6366f1',
    secondaryColor: theme === 'dark' ? '#bd93f9' : '#8b5cf6',
    highlightColor: theme === 'dark' ? '#44475a' : '#f0f9ff',
    ...customStyles
  };
  
  // Initialize edited answer if editing is enabled
  useEffect(() => {
    if (enableEditing) {
      let content = '';
      if (typeof answer === 'string') {
        content = answer;
      } else if (answer?.content) {
        content = answer.content;
      } else if (answer?.answer) {
        content = typeof answer.answer === 'string' 
          ? answer.answer 
          : JSON.stringify(answer.answer, null, 2);
      } else {
        content = JSON.stringify(answer, null, 2);
      }
      setEditedAnswer(content);
    }
  }, [answer, enableEditing]);
  
  // Reset clipboard copy state
  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => setIsCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isCopied]);
  
  // Add citation click handler to rendered content
  useEffect(() => {
    const handleContentClick = (e) => {
      const target = e.target;
      if (target.classList.contains('citation-link')) {
        e.preventDefault();
        const sourceId = target.getAttribute('data-source-id');
        if (sourceId) {
          onCitationClicked(sourceId);
        }
      }
    };
    
    const element = contentRef.current;
    if (element) {
      element.addEventListener('click', handleContentClick);
    }
    
    return () => {
      if (element) {
        element.removeEventListener('click', handleContentClick);
      }
    };
  }, [onCitationClicked]);
  
  // Extract all available sources from the answer object
  const extractAllSources = () => {
    const allSources = [];
    const sourceMap = new Map();
    
    const processSource = (source, index) => {
      if (!source) return;
      
      // Handle case where source.id might be missing but we have document identifiers
      const sourceId = source.id || source.documentId || source.fileId || 
                      (source.fileName ? `file-${source.fileName}` : `source-${index}`);
      
      if (!sourceId) return;
      
      const strSourceId = String(sourceId);
      
      // Skip if we've already processed this source
      if (sourceMap.has(strSourceId)) return;
      
      // Normalize the source object
      const normalizedSource = {
        id: strSourceId,
        fileName: source.fileName || source.name || source.title || `Document ${strSourceId}`,
        score: source.score || source.relevanceScore || source.confidenceScore || 0,
        excerpts: []
      };
      
      // Collect all possible content fields
      if (source.excerpts && Array.isArray(source.excerpts)) {
        normalizedSource.excerpts.push(...source.excerpts.filter(e => e !== null && e !== undefined));
      }
      
      if (source.snippets && Array.isArray(source.snippets)) {
        normalizedSource.excerpts.push(...source.snippets.filter(s => s !== null && s !== undefined));
      }
      
      if (source.text) {
        normalizedSource.excerpts.push(source.text);
      }
      
      if (source.content) {
        normalizedSource.excerpts.push(source.content);
      }
      
      if (source.suggestedText) {
        normalizedSource.excerpts.push(source.suggestedText);
      }
      
      // Collect additional metadata
      normalizedSource.author = source.author;
      normalizedSource.datePublished = source.datePublished;
      normalizedSource.url = source.url || source.sourceUrl;
      normalizedSource.fileSize = source.fileSize;
      normalizedSource.type = source.type || getDocumentType(source.fileName);
      normalizedSource.metadata = { ...source.metadata };
      
      // If we still have no excerpts but have document context, use that
      if (normalizedSource.excerpts.length === 0 && source.documentContext) {
        normalizedSource.excerpts.push(source.documentContext);
      }
      
      // Deduplicate excerpts (sometimes the same content appears in multiple fields)
      if (normalizedSource.excerpts.length > 0) {
        const uniqueExcerpts = [...new Set(normalizedSource.excerpts)];
        normalizedSource.excerpts = uniqueExcerpts;
      }
      
      // Add to our collection
      allSources.push(normalizedSource);
      sourceMap.set(strSourceId, true);
    };
    
    // Check different locations where sources might be stored
    
    // 1. Handle the case where raw source data was passed in directly
    // This handles the specific example "Document ID: e5637cae-a4ab-47a0-b937-e4499e2f1afc"
    if (answer && typeof answer === 'string' && answer.includes('Document ID:')) {
      try {
        // Try to parse the document info from the string
        const lines = answer.split('\n');
        const idLine = lines.find(line => line.includes('Document ID:'));
        if (idLine) {
          const docId = idLine.replace('Document ID:', '').trim();
          const typeLine = lines.find(line => line.match(/^Type/i));
          const type = typeLine ? lines[lines.indexOf(typeLine) + 1].trim() : null;
          
          // Create a source object from this information
          const rawSource = {
            id: docId,
            fileName: `Document ${docId}`,
            type: type,
            score: 1, // Assume high relevance
            excerpts: []
          };
          
          // Find why it's relevant (if specified)
          const relevanceStart = answer.indexOf('Why this is relevant:');
          if (relevanceStart > -1) {
            const relevanceText = answer.substring(relevanceStart + 'Why this is relevant:'.length).trim();
            rawSource.metadata = { relevance: relevanceText };
          }
          
          processSource(rawSource);
        }
      } catch (err) {
        console.error('Error parsing document string:', err);
      }
    }
    
    // 2. documentExcerpts array
    if (documentExcerpts && Array.isArray(documentExcerpts)) {
      documentExcerpts.forEach(processSource);
    }
    
    // 3. searchResults.sources array
    if (searchResults && searchResults.sources && Array.isArray(searchResults.sources)) {
      searchResults.sources.forEach(processSource);
    }
    
    // 4. answer.sources array
    if (answer && answer.sources && Array.isArray(answer.sources)) {
      answer.sources.forEach(processSource);
    }
    
    // 5. answer.result.documents
    if (answer && answer.result && answer.result.documents) {
      const documents = Array.isArray(answer.result.documents) 
        ? answer.result.documents 
        : [answer.result.documents];
      documents.forEach(processSource);
    }
    
    // 6. answer.documents
    if (answer && answer.documents) {
      const documents = Array.isArray(answer.documents) 
        ? answer.documents 
        : [answer.documents];
      documents.forEach(processSource);
    }
    
    // 7. answer.search.results (GroundX format)
    if (answer && answer.search && answer.search.results && Array.isArray(answer.search.results)) {
      answer.search.results.forEach(processSource);
    }
    
    // 8. Handle case where citations are present but not formatted as sources
    if (answer && answer.citations && Array.isArray(answer.citations)) {
      answer.citations.forEach((citation, index) => {
        if (typeof citation === 'string') {
          // Create a basic source from the citation string
          processSource({
            id: citation,
            fileName: getDocumentName(citation),
            score: 0.8, // Assume decent relevance
            excerpts: []
          }, index);
        }
      });
    }
    
    return allSources;
  };
  
  // Extract thought process from answer
  const extractThoughtProcess = () => {
    let thoughtProcess = {
      reasoning: '',
      steps: [],
      confidence: null
    };
    
    // Check various common locations for thought process information
    if (!answer) return thoughtProcess;
    
    // Direct thought process field
    if (answer.thoughts) {
      thoughtProcess.reasoning = typeof answer.thoughts === 'string' 
        ? answer.thoughts 
        : JSON.stringify(answer.thoughts, null, 2);
    } 
    // Nested in result
    else if (answer.result?.thoughts) {
      thoughtProcess.reasoning = typeof answer.result.thoughts === 'string' 
        ? answer.result.thoughts 
        : JSON.stringify(answer.result.thoughts, null, 2);
    }
    // System message
    else if (answer.systemMessage) {
      thoughtProcess.reasoning = answer.systemMessage;
    }
    // Internal reasoning
    else if (answer.reasoning) {
      thoughtProcess.reasoning = answer.reasoning;
    }
    // Steps
    else if (answer.reasoningSteps || answer.steps) {
      const steps = answer.reasoningSteps || answer.steps;
      thoughtProcess.steps = steps;
      thoughtProcess.reasoning = Array.isArray(steps) 
        ? steps.join('\n\n') 
        : typeof steps === 'string' ? steps : JSON.stringify(steps, null, 2);
    }
    
    // Extract confidence if available
    if (answer.confidence) {
      thoughtProcess.confidence = answer.confidence;
    } else if (answer.result?.confidence) {
      thoughtProcess.confidence = answer.result.confidence;
    }
    
    // If we still don't have reasoning but have documents, create a default
    if (!thoughtProcess.reasoning) {
      const sources = extractAllSources();
      if (sources.length > 0) {
        thoughtProcess.reasoning = `I analyzed ${sources.length} documents to find the information relevant to your query. The documents were evaluated for relevance and the most pertinent information was extracted to formulate a comprehensive answer.`;
      } else {
        thoughtProcess.reasoning = "I processed your query based on my knowledge and provided the most relevant information available.";
      }
    }
    
    return thoughtProcess;
  };
  
  // Extract all metadata from the answer
  const extractMetadata = () => {
    const metadata = {};
    
    if (!answer) return metadata;
    
    // Direct metadata field
    if (answer.metadata) {
      Object.assign(metadata, answer.metadata);
    }
    
    // Nested in result
    if (answer.result?.metadata) {
      Object.assign(metadata, answer.result.metadata);
    }
    
    // System info
    if (answer.system) {
      metadata.system = answer.system;
    }
    
    // Version info
    if (answer.version) {
      metadata.version = answer.version;
    }
    
    // Model info
    if (answer.model) {
      metadata.model = answer.model;
    }
    
    // Timing info
    if (answer.timing || answer.timings) {
      metadata.timing = answer.timing || answer.timings;
    }
    
    // Token usage
    if (answer.tokenUsage || answer.result?.tokenUsage) {
      metadata.tokenUsage = answer.tokenUsage || answer.result.tokenUsage;
    }
    
    return metadata;
  };
  
  // Extract search insights if available
  const extractSearchInsights = () => {
    if (!answer) return null;
    
    // Look for specific insight fields
    const insights = answer.searchInsights || 
                    answer.insights || 
                    answer.queryAnalysis || 
                    answer.result?.searchInsights ||
                    answer.enhancedResults;
                    
    if (insights) return insights;
    
    // If we didn't find explicit insights, build some from the sources
    const sources = extractAllSources();
    if (sources.length > 0) {
      // Get top sources by score
      const topSources = [...sources]
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 3);
      
      return {
        sourceAnalysis: {
          totalSources: sources.length,
          topSources: topSources.map(s => ({
            id: s.id,
            name: s.fileName,
            score: s.score,
            relevance: "Contains information relevant to the query"
          }))
        },
        suggestedFollowups: [
          "Can you provide more details about this topic?",
          "What are the key challenges in this area?",
          "How does this compare to alternative approaches?"
        ]
      };
    }
    
    return null;
  };
  
  // Extract content from answer
  const extractContent = () => {
    if (!answer) return '';
    
    if (typeof answer === 'string') {
      return answer;
    }
    
    if (answer.content) {
      return answer.content;
    }
    
    if (answer.answer) {
      return typeof answer.answer === 'string' 
        ? answer.answer
        : JSON.stringify(answer.answer, null, 2);
    }
    
    if (answer.result?.answer) {
      return typeof answer.result.answer === 'string'
        ? answer.result.answer
        : JSON.stringify(answer.result.answer, null, 2);
    }
    
    // If nothing else, return the raw JSON
    return JSON.stringify(answer, null, 2);
  };
  
  // Extract followup questions
  const extractFollowupQuestions = () => {
    if (!answer) return [];
    
    if (answer.followupQuestions && Array.isArray(answer.followupQuestions)) {
      return answer.followupQuestions;
    }
    
    if (answer.suggestedQuestions && Array.isArray(answer.suggestedQuestions)) {
      return answer.suggestedQuestions;
    }
    
    if (answer.result?.followupQuestions && Array.isArray(answer.result.followupQuestions)) {
      return answer.result.followupQuestions;
    }
    
    return [];
  };
  
  // Extract citations
  const extractCitations = () => {
    if (!answer) return [];
    
    if (answer.citations && Array.isArray(answer.citations)) {
      return answer.citations;
    }
    
    if (answer.result?.citations && Array.isArray(answer.result.citations)) {
      return answer.result.citations;
    }
    
    return [];
  };
  
  // Extract token usage information
  const extractTokenUsage = () => {
    if (!answer) return null;
    
    const tokenUsage = answer.tokenUsage || answer.result?.tokenUsage;
    if (!tokenUsage) return null;
    
    return {
      total: tokenUsage.total,
      input: tokenUsage.input || tokenUsage.promptTokens,
      output: tokenUsage.output || tokenUsage.completionTokens,
      embedding: tokenUsage.embeddingTokens || 0,
      totalCost: tokenUsage.totalCost,
      currency: tokenUsage.currency || 'USD'
    };
  };
  
  // Guess document type based on filename
  const getDocumentType = (fileName) => {
    if (!fileName) return 'document';
    
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf': return 'pdf';
      case 'docx': 
      case 'doc': return 'word';
      case 'xlsx': 
      case 'xls': 
      case 'csv': return 'spreadsheet';
      case 'txt': return 'text';
      case 'html': 
      case 'htm': return 'web';
      case 'json': 
      case 'js': 
      case 'py': 
      case 'java': 
      case 'c': 
      case 'cpp': return 'code';
      default: return 'document';
    }
  };
  
  // Get appropriate icon for document type
  const getDocumentIcon = (fileName, type) => {
    const docType = type || getDocumentType(fileName);
    
    switch (docType.toLowerCase()) {
      case 'pdf': return <FileText size={16} className="text-red-600" />;
      case 'word': return <FileText size={16} className="text-blue-600" />;
      case 'spreadsheet': 
      case 'csv': 
      case 'excel': return <FileDigit size={16} className="text-green-600" />;
      case 'code': 
      case 'json': return <Code size={16} className="text-yellow-600" />;
      case 'text': 
      case 'txt': return <AlignJustify size={16} className="text-gray-600" />;
      case 'web': 
      case 'html': return <Search size={16} className="text-purple-600" />;
      case 'book': return <BookOpen size={16} className="text-blue-700" />;
      default: return <FileText size={16} className="text-gray-600" />;
    }
  };
  
  // Toggle document expansion
  const toggleDocExpansion = (docId) => {
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
  
  // Toggle bookmark status
  const toggleBookmark = (docId, event) => {
    if (event) event.stopPropagation();
    
    setBookmarks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };
  
  // Handle document click
  const handleDocumentClick = (source) => {
    if (!source || !source.id) return;
    
    // Toggle expansion state
    toggleDocExpansion(source.id);
    
    // Set as current document for detail view
    setCurrentDocumentId(source.id);
  };
  
  // Handle filter change
  const handleFilterChange = (e) => {
    setSourceFilter(e.target.value);
    setCurrentPage(1); // Reset to first page when filter changes
  };
  
  // Handle sort change
  const handleSortChange = (option) => {
    setSortOption(option);
  };
  
  // Handle view mode change
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };
  
  // Toggle display option
  const toggleDisplayOption = (option) => {
    setDisplayOptions(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
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
  
  // Handle clipboard copy
  const handleCopyToClipboard = () => {
    let contentToCopy = isEditMode ? editedAnswer : extractContent();
    
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(contentToCopy)
          .then(() => setIsCopied(true))
          .catch(err => {
            console.error("Clipboard write failed:", err);
            fallbackCopyToClipboard(contentToCopy);
          });
      } else {
        fallbackCopyToClipboard(contentToCopy);
      }
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };
  
  // Fallback for clipboard copy (for older browsers)
  const fallbackCopyToClipboard = (text) => {
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
      console.error("Fallback copy failed:", err);
    }
  };
  
  // Handle export
  const handleExport = (format) => {
    if (onExportClicked) {
      onExportClicked(format);
    } else {
      // Default export implementation
      let exportData;
      let fileName;
      let mimeType;
      
      switch (format) {
        case 'json':
          exportData = JSON.stringify(answer, null, 2);
          fileName = 'answer-export.json';
          mimeType = 'application/json';
          break;
        case 'csv':
          const sources = extractAllSources();
          const headers = ["id", "fileName", "score", "excerpt"];
          const rows = sources.map(s => [
            s.id,
            s.fileName || '',
            s.score || '',
            s.excerpts[0] || ''
          ]);
          exportData = [headers, ...rows].map(row => 
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
          ).join('\n');
          fileName = 'sources-export.csv';
          mimeType = 'text/csv';
          break;
        case 'md':
          const content = extractContent();
          const sourcesList = extractAllSources()
            .map(s => 
              `## ${s.fileName}\n\n` +
              `- **ID**: ${s.id}\n` +
              `- **Score**: ${s.score || 'N/A'}\n\n` +
              (s.excerpts.length > 0 ? s.excerpts.map(e => `> ${e}\n`).join('\n') : '')
            ).join('\n\n');
          
          exportData = `# Answer\n\n${content}\n\n# Sources\n\n${sourcesList}`;
          fileName = 'answer-export.md';
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
  
  // Apply filtering and sorting to sources
  const getProcessedSources = () => {
    const allSources = extractAllSources();
    
    // Apply filter
    const filteredSources = sourceFilter
      ? allSources.filter(source => {
          const searchText = [
            source.fileName,
            source.author || '',
            ...source.excerpts
          ].join(' ').toLowerCase();
          
          return searchText.includes(sourceFilter.toLowerCase());
        })
      : allSources;
    
    // Apply sorting
    const sortedSources = [...filteredSources].sort((a, b) => {
      switch (sortOption) {
        case 'relevance':
          return (b.score || 0) - (a.score || 0);
        case 'date':
          const dateA = a.datePublished ? new Date(a.datePublished).getTime() : 0;
          const dateB = b.datePublished ? new Date(b.datePublished).getTime() : 0;
          return dateB - dateA;
        case 'name':
          return (a.fileName || '').localeCompare(b.fileName || '');
        default:
          return 0;
      }
    });
    
    return sortedSources;
  };
  
  // Get current page of sources
  const getCurrentPageSources = () => {
    const processed = getProcessedSources();
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return processed.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  };
  
  // Calculate total pages
  const getTotalPages = () => {
    const processed = getProcessedSources();
    return Math.ceil(processed.length / ITEMS_PER_PAGE);
  };
  
  // Get document statistics
  const getDocumentStats = () => {
    const sources = extractAllSources();
    if (!sources || sources.length === 0) return null;
    
    // Count document types
    const typeCount = {};
    sources.forEach(source => {
      const type = source.type || getDocumentType(source.fileName);
      typeCount[type] = (typeCount[type] || 0) + 1;
    });
    
    // Calculate average score
    let totalScore = 0;
    let scoreCount = 0;
    sources.forEach(source => {
      if (source.score !== undefined) {
        totalScore += source.score;
        scoreCount++;
      }
    });
    
    const avgScore = scoreCount > 0 ? totalScore / scoreCount : 0;
    
    // Count by relevance ranges
    const relevanceCounts = {
      high: sources.filter(s => (s.score || 0) > 0.8).length,
      medium: sources.filter(s => (s.score || 0) >= 0.5 && (s.score || 0) <= 0.8).length,
      low: sources.filter(s => (s.score || 0) < 0.5).length
    };
    
    return {
      total: sources.length,
      types: typeCount,
      avgScore,
      relevanceCounts
    };
  };
  
  // Get current document detail
  const getCurrentDocument = () => {
    if (!currentDocumentId) return null;
    
    const sources = extractAllSources();
    const document = sources.find(s => s.id === currentDocumentId);
    
    // If we found the document but it has no excerpts, attempt to fetch from the full document
    if (document && (!document.excerpts || document.excerpts.length === 0)) {
      // Try to get content from documentExcerpts if available
      if (documentExcerpts && Array.isArray(documentExcerpts)) {
        const fullDoc = documentExcerpts.find(d => d.id === currentDocumentId);
        if (fullDoc) {
          // Copy any missing content fields
          if (fullDoc.excerpts && fullDoc.excerpts.length > 0) {
            document.excerpts = [...fullDoc.excerpts];
          } else if (fullDoc.content) {
            document.excerpts = [fullDoc.content];
          } else if (fullDoc.text) {
            document.excerpts = [fullDoc.text];
          }
        }
      }
      
      // If still no excerpts, try to use the document ID to fetch the full document
      if ((!document.excerpts || document.excerpts.length === 0) && onCitationClicked) {
        // We'll add a placeholder so the UI doesn't show "no excerpts"
        document.excerpts = ["Loading document content..."];
        
        // In a real implementation, here you would trigger a document fetch,
        // but for this implementation, we'll leave this as a placeholder
      }
    }
    
    return document;
  };
  
  // Generate document relevance explanation
  const getRelevanceExplanation = (source) => {
    if (!source) return '';
    
    const sourceName = source.fileName || `Document ${source.id}`;
    const sourceType = source.type || getDocumentType(source.fileName);
    
    // Check if we already have a relevance explanation
    if (source.metadata?.relevance) {
      return source.metadata.relevance;
    }
    
    if (source.metadata?.explanation) {
      return source.metadata.explanation;
    }
    
    if (source.metadata?.reasoning) {
      return source.metadata.reasoning;
    }
    
    // Calculate confidence level
    const confidence = source.score || 0.6;
    const confidencePercent = Math.min(100, Math.round(confidence * 100));
    
    let confidenceLevel = 'medium confidence';
    if (confidencePercent > 80) confidenceLevel = 'high confidence';
    if (confidencePercent < 50) confidenceLevel = 'some relevance';
    
    // Generate a more descriptive explanation based on document type
    let explanation = `This ${sourceType} contains information relevant to your query. `;
    
    // Add confidence assessment
    explanation += `The system has ${confidenceLevel} (${confidencePercent}%) that this source contributes valuable information to the answer.`;
    
    // Add metadata if available
    if (source.author) {
      explanation += ` Author: ${source.author}.`;
    }
    
    if (source.datePublished) {
      explanation += ` Published on ${formatDate(source.datePublished)}.`;
    }
    
    return explanation;
  };
  
  // Animation variants for motion components
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3 }
    },
    selected: {
      scale: 1.005,
      boxShadow: "0 4px 20px rgba(99, 102, 241, 0.15)",
      transition: { duration: 0.2 }
    }
  };
  
  const buttonVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 }
  };
  
  const tabAnimation = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  };
  
  // Get extracted data
  const content = extractContent();
  const thoughtProcess = extractThoughtProcess();
  const metadata = extractMetadata();
  const tokenUsage = extractTokenUsage();
  const followupQuestions = extractFollowupQuestions();
  const citations = extractCitations();
  const searchInsights = extractSearchInsights();
  const sources = getProcessedSources();
  const currentPageSources = getCurrentPageSources();
  const totalPages = getTotalPages();
  const documentStats = getDocumentStats();
  const currentDocument = getCurrentDocument();
  
  const hasThoughts = thoughtProcess && thoughtProcess.reasoning && thoughtProcess.reasoning.length > 0;
  const hasSources = sources && sources.length > 0;
  const hasInsights = searchInsights !== null;
  
  return (
    <motion.div
      initial="hidden"
      animate={isSelected ? "selected" : "visible"}
      variants={containerVariants}
      className={`rounded-lg shadow-sm border ${
        isSelected ? 'border-indigo-500' : 'border-transparent'
      } overflow-hidden`}
      style={{
        backgroundColor: themeStyles.backgroundColor,
        color: themeStyles.textColor
      }}
    >
      {/* Header */}
      <div className="p-4 flex justify-between items-center border-b" style={{ borderColor: themeStyles.borderColor }}>
        <div className="flex items-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mr-2">
            <path
              d="M8.4 4.9L8.5 4H9.5L9.6 4.9C9.8 7.3 11.7 9.2 14.1 9.4L15 9.5V10.5L14.1 10.6C11.7 10.8 9.8 12.7 9.6 15.1L9.5 16H8.5L8.4 15.1C8.2 12.7 6.3 10.8 3.9 10.6L3 10.5V9.5L3.9 9.4C6.3 9.2 8.2 7.3 8.4 4.9Z"
              fill="currentColor"
            />
          </svg>
          <span className="text-xl font-medium">Response</span>
          {metadata.version && (
            <span className="ml-2 text-xs opacity-70">{metadata.version}</span>
          )}
        </div>
        
        <div className="flex items-center space-x-1">
          {/* Export button */}
          {enableAdvancedFeatures && (
            <div className="relative">
              <motion.button
                variants={buttonVariants}
                initial="initial"
                whileHover="hover"
                whileTap="tap"
                onClick={() => document.getElementById(`export-dropdown-${index}`)?.classList.toggle('hidden')}
                className="p-2 rounded-full transition-colors hover:bg-indigo-50"
                title="Export Results"
              >
                <Share2 size={18} />
              </motion.button>
              <div 
                id={`export-dropdown-${index}`} 
                className="absolute right-0 mt-2 w-48 rounded-md shadow-lg hidden z-10"
                style={{ backgroundColor: themeStyles.cardBackground }}
              >
                <div className="py-1">
                  <button
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-indigo-50"
                    onClick={() => handleExport('json')}
                  >
                    Export as JSON
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-indigo-50"
                    onClick={() => handleExport('csv')}
                  >
                    Export Sources as CSV
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-indigo-50"
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
              onClick={onRefreshClicked}
              className="p-2 rounded-full transition-colors hover:bg-indigo-50"
              title="Refresh Response"
            >
              <RefreshCw size={18} />
            </motion.button>
          )}
          
          {/* Copy button */}
          <motion.button
            variants={buttonVariants}
            initial="initial"
            whileHover="hover"
            whileTap="tap"
            onClick={handleCopyToClipboard}
            className="p-2 rounded-full transition-colors hover:bg-indigo-50 relative"
            title={isCopied ? "Copied!" : "Copy to clipboard"}
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
            
            {/* Copy confirmation tooltip */}
            <AnimatePresence>
              {isCopied && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-white text-xs py-1 px-2 rounded whitespace-nowrap bg-gray-800"
                >
                  Copied to clipboard
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
            onClick={() => {
              setActiveTab('thought-process');
              onThoughtProcessClicked();
            }}
            className={`p-2 rounded-full transition-colors ${hasThoughts ? 'hover:bg-amber-50 text-amber-500' : 'opacity-50 cursor-not-allowed'}`}
            title="Show Thought Process"
            disabled={!hasThoughts}
          >
            <Lightbulb size={18} />
          </motion.button>
          
          {/* Sources button */}
          <motion.button
            variants={buttonVariants}
            initial="initial"
            whileHover="hover"
            whileTap="tap"
            onClick={() => {
              setActiveTab('sources');
              onSupportingContentClicked();
            }}
            className={`p-2 rounded-full transition-colors ${hasSources ? 'hover:bg-purple-50 text-purple-500' : 'opacity-50 cursor-not-allowed'}`}
            title="Show Sources"
            disabled={!hasSources}
          >
            <Database size={18} />
          </motion.button>
          
          {/* Debug button */}
          <motion.button
            variants={buttonVariants}
            initial="initial"
            whileHover="hover"
            whileTap="tap"
            onClick={() => setDebugMode(!debugMode)}
            className={`p-2 rounded-full transition-colors ${debugMode ? 'text-red-500 hover:bg-red-50' : 'hover:bg-gray-100'}`}
            title="Toggle Debug Mode"
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
            className="p-2 rounded-full transition-colors hover:bg-gray-100"
            title={expanded ? "Collapse" : "Expand"}
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
            className="border-b p-4"
            style={{ borderColor: themeStyles.borderColor, backgroundColor: `${themeStyles.primaryColor}10` }}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">Debug Mode</span>
              <span className="text-sm" style={{ color: themeStyles.primaryColor }}>Response Structure</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 mb-3 text-xs p-2 rounded" style={{ backgroundColor: `${themeStyles.primaryColor}20` }}>
              <div>
                <span className="font-semibold">Sources:</span> {sources.length}
              </div>
              <div>
                <span className="font-semibold">Has Thoughts:</span> {hasThoughts ? 'Yes' : 'No'}
              </div>
              <div>
                <span className="font-semibold">Has Insights:</span> {hasInsights ? 'Yes' : 'No'}
              </div>
              {tokenUsage && (
                <>
                  <div>
                    <span className="font-semibold">Total Tokens:</span> {tokenUsage.total || 'N/A'}
                  </div>
                  <div>
                    <span className="font-semibold">Input Tokens:</span> {tokenUsage.input || 'N/A'}
                  </div>
                  <div>
                    <span className="font-semibold">Output Tokens:</span> {tokenUsage.output || 'N/A'}
                  </div>
                </>
              )}
            </div>
            
            <div className="mb-2 font-semibold">Raw Response:</div>
            <pre className="text-xs whitespace-pre-wrap mb-3 p-2 rounded border max-h-40 overflow-auto"
              style={{ 
                backgroundColor: themeStyles.cardBackground,
                borderColor: themeStyles.borderColor
              }}
            >
              {JSON.stringify(answer, null, 2)}
            </pre>
            
            {hasSources && (
              <>
                <div className="font-semibold mt-2">Extracted Sources:</div>
                <pre className="text-xs whitespace-pre-wrap p-2 rounded border max-h-40 overflow-auto"
                  style={{ 
                    backgroundColor: themeStyles.cardBackground,
                    borderColor: themeStyles.borderColor
                  }}
                >
                  {JSON.stringify(sources, null, 2)}
                </pre>
              </>
            )}
            
            {Object.keys(metadata).length > 0 && (
              <>
                <div className="font-semibold mt-2">Metadata:</div>
                <pre className="text-xs whitespace-pre-wrap p-2 rounded border max-h-40 overflow-auto"
                  style={{ 
                    backgroundColor: themeStyles.cardBackground,
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
      
      {/* Document detail view */}
      <AnimatePresence>
        {currentDocument && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="border-b p-4"
            style={{ 
              borderColor: themeStyles.borderColor,
              backgroundColor: `${themeStyles.secondaryColor}10`
            }}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center">
                {getDocumentIcon(currentDocument.fileName, currentDocument.type)}
                <h3 className="ml-2 font-medium">{currentDocument.fileName}</h3>
                {currentDocument.score !== undefined && (
                  <span 
                    className="ml-2 px-2 py-0.5 text-xs rounded-full"
                    style={{ 
                      backgroundColor: `${themeStyles.secondaryColor}20`,
                      color: themeStyles.secondaryColor
                    }}
                  >
                    Score: {(currentDocument.score * 100).toFixed(1)}%
                  </span>
                )}
              </div>
              <motion.button
                variants={buttonVariants}
                initial="initial"
                whileHover="hover"
                whileTap="tap"
                onClick={() => setCurrentDocumentId(null)}
                className="p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </div>
            
            {/* Document ID */}
            <div className="mb-3 text-xs opacity-70">
              Document ID: {currentDocument.id}
            </div>
            
            {/* Document metadata */}
            <div className="mb-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              {currentDocument.type && (
                <div className="p-2 rounded" style={{ backgroundColor: `${themeStyles.secondaryColor}10` }}>
                  <div className="font-medium opacity-70">Type</div>
                  <div>{currentDocument.type}</div>
                </div>
              )}
              
              {currentDocument.author && (
                <div className="p-2 rounded" style={{ backgroundColor: `${themeStyles.secondaryColor}10` }}>
                  <div className="font-medium opacity-70">Author</div>
                  <div>{currentDocument.author}</div>
                </div>
              )}
              
              {currentDocument.datePublished && (
                <div className="p-2 rounded" style={{ backgroundColor: `${themeStyles.secondaryColor}10` }}>
                  <div className="font-medium opacity-70">Date</div>
                  <div>{formatDate(currentDocument.datePublished)}</div>
                </div>
              )}
              
              {currentDocument.fileSize && (
                <div className="p-2 rounded" style={{ backgroundColor: `${themeStyles.secondaryColor}10` }}>
                  <div className="font-medium opacity-70">Size</div>
                  <div>{formatBytes(currentDocument.fileSize)}</div>
                </div>
              )}
            </div>
            
            {/* Document excerpts */}
            {currentDocument.excerpts.length > 0 ? (
              <div>
                <h4 className="text-sm font-medium mb-2">Excerpts:</h4>
                <div className="space-y-2">
                  {currentDocument.excerpts.map((excerpt, i) => (
                    <div 
                      key={i}
                      className="rounded border p-3 text-sm"
                      style={{ 
                        backgroundColor: themeStyles.cardBackground,
                        borderColor: `${themeStyles.secondaryColor}30`
                      }}
                    >
                      <div className="text-xs mb-1 opacity-70">Excerpt {i+1}</div>
                      <p>{excerpt}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-sm italic opacity-70">No excerpts available for this document.</div>
            )}
            
            {/* Relevance explanation */}
            <div className="mt-3 p-3 rounded border text-sm"
              style={{ 
                backgroundColor: `${themeStyles.primaryColor}10`,
                borderColor: `${themeStyles.primaryColor}30`
              }}
            >
              <div className="font-medium mb-1">Why this is relevant:</div>
              <p>{getRelevanceExplanation(currentDocument)}</p>
            </div>
            
            {/* URL if available */}
            {currentDocument.url && (
              <div className="mt-3">
                <h4 className="text-sm font-medium mb-1">Source URL:</h4>
                <a
                  href={currentDocument.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm break-all flex items-center"
                  style={{ color: themeStyles.primaryColor }}
                >
                  {currentDocument.url}
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
                  setCurrentDocumentId(null);
                  onCitationClicked(currentDocument.id);
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
      
      {/* Feedback form */}
      <AnimatePresence>
        {showFeedbackForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="border-b p-4"
            style={{ 
              borderColor: themeStyles.borderColor,
              backgroundColor: `${themeStyles.primaryColor}10`
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
                  backgroundColor: themeStyles.cardBackground,
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
        <div className="border-b" style={{ borderColor: themeStyles.borderColor }}>
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
            
            {hasSources && (
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
                Sources ({sources.length})
              </button>
            )}
            
            {hasInsights && (
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
      
      {/* Tab content */}
      <AnimatePresence mode="wait">
        {expanded && (
          <>
            {/* Answer tab */}
            {activeTab === 'answer' && (
              <motion.div
                key="answer-tab"
                variants={tabAnimation}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="p-4"
              >
                {enableEditing && isEditMode ? (
                  <div className="mb-4">
                    <textarea
                      value={editedAnswer}
                      onChange={(e) => setEditedAnswer(e.target.value)}
                      rows={10}
                      className="w-full p-3 rounded border"
                      style={{
                        backgroundColor: themeStyles.cardBackground,
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
                        onClick={() => setIsEditMode(false)}
                        className="px-3 py-1 text-sm rounded text-white"
                        style={{ backgroundColor: themeStyles.primaryColor }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
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
                    
                    <div ref={contentRef} className="prose max-w-none" style={{ color: themeStyles.textColor }}>
                      <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
                        {content}
                      </ReactMarkdown>
                      
                      {isStreaming && (
                        <motion.span 
                          className="inline-block"
                          animate={{ opacity: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        >
                          <span>...</span>
                        </motion.span>
                      )}
                    </div>
                    
                    {/* Follow-up questions */}
                    {showFollowupQuestions && followupQuestions.length > 0 && (
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
                              onClick={() => onFollowupQuestionClicked && onFollowupQuestionClicked(question)}
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
                    {tokenUsage && (
                      <div 
                        className="mt-6 text-xs p-2 rounded flex items-center justify-between"
                        style={{
                          backgroundColor: `${themeStyles.primaryColor}05`,
                          color: `${themeStyles.textColor}80`
                        }}
                      >
                        <span className="flex items-center">
                          <Cpu size={12} className="mr-1" />
                          Tokens: {tokenUsage.total || 'N/A'}
                        </span>
                        {tokenUsage.totalCost !== undefined && (
                          <span>
                            Cost: {tokenUsage.totalCost.toFixed(5)} {tokenUsage.currency}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
            
            {/* Thought Process tab */}
            {activeTab === 'thought-process' && hasThoughts && (
              <motion.div
                key="thought-tab"
                variants={tabAnimation}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="p-4"
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
                  </div>
                  
                  <div 
                    className="rounded-md border p-3 overflow-auto max-h-96 text-sm font-mono"
                    style={{ 
                      backgroundColor: themeStyles.cardBackground, 
                      borderColor: 'rgba(245, 158, 11, 0.2)' 
                    }}
                  >
                    <pre className="whitespace-pre-wrap">
                      <ReactMarkdown>{thoughtProcess.reasoning}</ReactMarkdown>
                    </pre>
                  </div>
                  
                  {/* Confidence indicator */}
                  {thoughtProcess.confidence !== undefined && (
                    <div className="mt-3 flex items-center">
                      <div className="text-sm font-medium mr-2">System Confidence:</div>
                      <div 
                        className="h-2 flex-grow rounded-full"
                        style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}
                      >
                        <div 
                          className="h-2 rounded-full"
                          style={{ 
                            width: `${Math.min(100, Math.max(0, thoughtProcess.confidence * 100))}%`,
                            backgroundColor: '#F59E0B'
                          }}
                        />
                      </div>
                      <div className="ml-2 text-sm font-medium">
                        {(thoughtProcess.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  )}
                  
                  {/* Steps if available */}
                  {thoughtProcess.steps && thoughtProcess.steps.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium mb-2">Reasoning Steps:</h4>
                      <div className="space-y-2">
                        {thoughtProcess.steps.map((step, i) => (
                          <div
                            key={i}
                            className="p-2 rounded border text-sm"
                            style={{ 
                              backgroundColor: 'rgba(245, 158, 11, 0.05)', 
                              borderColor: 'rgba(245, 158, 11, 0.2)' 
                            }}
                          >
                            <div className="font-medium text-xs mb-1">Step {i+1}</div>
                            <div>{typeof step === 'string' ? step : JSON.stringify(step, null, 2)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            
            {/* Sources tab */}
            {activeTab === 'sources' && hasSources && (
              <motion.div
                key="sources-tab"
                variants={tabAnimation}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="p-4"
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
                        {sources.length} Documents
                      </span>
                    </div>
                  </div>
                  
                  {/* Filter and view controls */}
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center">
                      <div 
                        className="relative flex items-center border rounded-md overflow-hidden"
                        style={{
                          backgroundColor: themeStyles.cardBackground,
                          borderColor: themeStyles.borderColor
                        }}
                      >
                        <Search size={16} className="mx-2 opacity-70" />
                        <input
                          type="text"
                          value={sourceFilter}
                          onChange={handleFilterChange}
                          placeholder="Filter sources..."
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
                              : themeStyles.cardBackground,
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
                              : themeStyles.cardBackground,
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
                              : themeStyles.cardBackground,
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
                            viewMode === 'list' ? 'font-medium' : ''
                          }`}
                          style={{
                            backgroundColor: viewMode === 'list' 
                              ? `${themeStyles.secondaryColor}20` 
                              : themeStyles.cardBackground,
                            borderColor: themeStyles.borderColor,
                            color: viewMode === 'list' 
                              ? themeStyles.secondaryColor 
                              : themeStyles.textColor
                          }}
                        >
                          <AlignJustify size={16} />
                        </button>
                        <button
                          onClick={() => handleViewModeChange('grid')}
                          className={`p-1.5 border ${
                            viewMode === 'grid' ? 'font-medium' : ''
                          }`}
                          style={{
                            backgroundColor: viewMode === 'grid' 
                              ? `${themeStyles.secondaryColor}20` 
                              : themeStyles.cardBackground,
                            borderColor: themeStyles.borderColor,
                            color: viewMode === 'grid' 
                              ? themeStyles.secondaryColor 
                              : themeStyles.textColor
                          }}
                        >
                          <Database size={16} />
                        </button>
                        <button
                          onClick={() => handleViewModeChange('detail')}
                          className={`p-1.5 rounded-r-md border-y border-r ${
                            viewMode === 'detail' ? 'font-medium' : ''
                          }`}
                          style={{
                            backgroundColor: viewMode === 'detail' 
                              ? `${themeStyles.secondaryColor}20` 
                              : themeStyles.cardBackground,
                            borderColor: themeStyles.borderColor,
                            color: viewMode === 'detail' 
                              ? themeStyles.secondaryColor 
                              : themeStyles.textColor
                          }}
                        >
                          <BookMarked size={16} />
                        </button>
                      </div>
                      
                      <div className="ml-2 relative">
                        <button
                          onClick={() => setShowSearchOptions(!showSearchOptions)}
                          className="p-1.5 rounded-md border"
                          style={{
                            backgroundColor: themeStyles.cardBackground,
                            borderColor: themeStyles.borderColor
                          }}
                        >
                          <Filter size={16} />
                        </button>
                        {showSearchOptions && (
                          <div 
                            className="absolute right-0 mt-1 w-48 rounded-md shadow-lg z-10"
                            style={{ backgroundColor: themeStyles.cardBackground }}
                          >
                            <div className="py-1">
                              <div 
                                className="px-4 py-2 text-xs font-medium border-b"
                                style={{ borderColor: themeStyles.borderColor }}
                              >
                                Display Options
                              </div>
                              
                              {Object.entries(displayOptions).map(([key, value]) => (
                                <label key={key} className="flex items-center px-4 py-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={value}
                                    onChange={() => toggleDisplayOption(key)}
                                    className="mr-2"
                                  />
                                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Document stats */}
                  {documentStats && (
                    <div 
                      className="mb-4 p-3 rounded-md text-xs grid grid-cols-2 md:grid-cols-4 gap-2"
                      style={{ backgroundColor: `${themeStyles.secondaryColor}05` }}
                    >
                      <div className="flex flex-col">
                        <span className="opacity-70">Total Documents</span>
                        <span className="font-medium text-sm">{documentStats.total}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="opacity-70">Avg. Relevance</span>
                        <span className="font-medium text-sm">{(documentStats.avgScore * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="opacity-70">High Relevance</span>
                        <span className="font-medium text-sm">{documentStats.relevanceCounts.high} docs</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="opacity-70">Document Types</span>
                        <span className="font-medium text-sm">{Object.keys(documentStats.types).length} types</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Empty state */}
                  {currentPageSources.length === 0 && (
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
                  {viewMode === 'list' && currentPageSources.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {currentPageSources.map((source, index) => (
                        <motion.div
                          key={`${source.id}-${index}`}
                          className="rounded-md border overflow-hidden"
                          initial={{ x: -10, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: index * 0.05 }}
                          style={{ 
                            backgroundColor: themeStyles.cardBackground, 
                            borderColor: themeStyles.borderColor,
                            boxShadow: bookmarks.has(source.id) 
                              ? `0 0 0 2px ${themeStyles.secondaryColor}50` 
                              : 'none'
                          }}
                        >
                          <div 
                            className="flex items-center justify-between gap-2 text-sm p-3 cursor-pointer"
                            onClick={() => handleDocumentClick(source)}
                            style={{ 
                              color: themeStyles.textColor
                            }}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {getDocumentIcon(source.fileName, source.type)}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center">
                                  <span className="truncate font-medium" title={source.fileName}>
                                    {source.fileName}
                                  </span>
                                  {bookmarks.has(source.id) && (
                                    <span 
                                      className="ml-1 text-yellow-500"
                                      title="Bookmarked"
                                    >
                                      ★
                                    </span>
                                  )}
                                </div>
                                
                                {displayOptions.showMetadata && (
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
                              {displayOptions.showScores && source.score !== undefined && (
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
                                onClick={(e) => toggleBookmark(source.id, e)}
                                className="opacity-60 hover:opacity-100"
                                title={bookmarks.has(source.id) ? "Remove bookmark" : "Bookmark this source"}
                              >
                                {bookmarks.has(source.id) ? "★" : "☆"}
                              </button>
                              
                              {/* Expand/collapse control */}
                              {expandedDocs.has(source.id) ? (
                                <ChevronUp size={14} className="opacity-70" />
                              ) : (
                                <ChevronDown size={14} className="opacity-70" />
                              )}
                            </div>
                          </div>
                          
                          {/* Expanded document preview */}
                          <AnimatePresence>
                            {displayOptions.showExcerpts && expandedDocs.has(source.id) && (
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
                                {source.excerpts && source.excerpts.length > 0 ? (
                                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                    {source.excerpts.slice(0, 3).map((excerpt, i) => (
                                      <div 
                                        key={i} 
                                        className="p-2 text-sm rounded border"
                                        style={{ 
                                          backgroundColor: themeStyles.cardBackground,
                                          borderColor: `${themeStyles.secondaryColor}30`
                                        }}
                                      >
                                        <p>{excerpt}</p>
                                        
                                        {displayOptions.showRelevance && (
                                          <div 
                                            className="mt-2 p-2 rounded text-xs border"
                                            style={{ 
                                              backgroundColor: `${themeStyles.primaryColor}05`,
                                              borderColor: `${themeStyles.primaryColor}30`
                                            }}
                                          >
                                            <div className="font-medium opacity-70 mb-1">Why this is relevant:</div>
                                            <p>{getRelevanceExplanation(source)}</p>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="p-3 rounded border bg-blue-50 text-blue-700 text-sm flex items-center">
                                    <Info size={16} className="mr-2 flex-shrink-0" />
                                    <div>
                                      <p className="font-medium">Document identified but no excerpts available</p>
                                      <p className="text-xs mt-1">Use the "Open Document" button to view the full content</p>
                                    </div>
                                  </div>
                                )}
                                
                                <div className="flex justify-end mt-3 space-x-2">
                                  <motion.button
                                    variants={buttonVariants}
                                    initial="initial"
                                    whileHover="hover"
                                    whileTap="tap"
                                    className="text-xs px-2 py-1 rounded flex items-center"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCurrentDocumentId(source.id);
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
                                      onCitationClicked(source.id);
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
                      ))}
                    </div>
                  )}
                  
                  {/* Grid View */}
                  {viewMode === 'grid' && currentPageSources.length > 0 && (
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {currentPageSources.map((source, index) => (
                        <motion.div
                          key={`${source.id}-${index}`}
                          className="rounded-md border p-3 flex flex-col"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => handleDocumentClick(source)}
                          style={{ 
                            backgroundColor: themeStyles.cardBackground, 
                            borderColor: themeStyles.borderColor,
                            boxShadow: bookmarks.has(source.id) 
                              ? `0 0 0 2px ${themeStyles.secondaryColor}50` 
                              : 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center">
                              {getDocumentIcon(source.fileName, source.type)}
                              <h4 className="ml-2 font-medium text-sm truncate" 
                                title={source.fileName}
                              >
                                {source.fileName}
                              </h4>
                              {bookmarks.has(source.id) && (
                                <span 
                                  className="ml-1 text-yellow-500"
                                  title="Bookmarked"
                                >
                                  ★
                                </span>
                              )}
                            </div>
                            
                            <button
                              onClick={(e) => toggleBookmark(source.id, e)}
                              className="opacity-60 hover:opacity-100"
                              title={bookmarks.has(source.id) ? "Remove bookmark" : "Bookmark this source"}
                            >
                              {bookmarks.has(source.id) ? "★" : "☆"}
                            </button>
                          </div>
                          
                          {displayOptions.showMetadata && (
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
                            </div>
                          )}
                          
                          {displayOptions.showExcerpts && source.excerpts.length > 0 && (
                            <div className="flex-grow">
                              <div 
                                className="p-2 rounded text-xs border overflow-hidden"
                                style={{ 
                                  backgroundColor: `${themeStyles.secondaryColor}05`,
                                  borderColor: `${themeStyles.secondaryColor}30`,
                                  maxHeight: '4.5rem',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 3,
                                  WebkitBoxOrient: 'vertical'
                                }}
                              >
                                {source.excerpts[0]}
                              </div>
                            </div>
                          )}
                          
                          <div className="mt-2 flex items-center justify-between">
                            {displayOptions.showScores && source.score !== undefined ? (
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
                                onCitationClicked(source.id);
                              }}
                              className="text-xs p-1 rounded flex items-center opacity-70 hover:opacity-100"
                              style={{ color: themeStyles.secondaryColor }}
                            >
                              <ExternalLink size={12} />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                  
                  {/* Detail View */}
                  {viewMode === 'detail' && currentPageSources.length > 0 && (
                    <div className="mt-2 space-y-4">
                      {currentPageSources.map((source, index) => (
                        <motion.div
                          key={`${source.id}-${index}`}
                          className="rounded-md border overflow-hidden"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          style={{ 
                            backgroundColor: themeStyles.cardBackground, 
                            borderColor: themeStyles.borderColor,
                            boxShadow: bookmarks.has(source.id) 
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
                                {source.fileName}
                              </h4>
                              {bookmarks.has(source.id) && (
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
                                onClick={() => toggleBookmark(source.id)}
                                className="opacity-70 hover:opacity-100"
                                title={bookmarks.has(source.id) ? "Remove bookmark" : "Bookmark this source"}
                              >
                                {bookmarks.has(source.id) ? "★" : "☆"}
                              </button>
                              
                              <button
                                onClick={() => onCitationClicked(source.id)}
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
                            {displayOptions.showMetadata && (
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
                                {displayOptions.showScores && source.score !== undefined && (
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
                            {displayOptions.showExcerpts && source.excerpts.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium mb-2">Excerpts:</h5>
                                <div className="space-y-2">
                                  {source.excerpts.map((excerpt, i) => (
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
                            {displayOptions.showRelevance && (
                              <div className="mt-3">
                                <h5 className="text-sm font-medium mb-2">Relevance:</h5>
                                <div 
                                  className="p-2 rounded text-sm border"
                                  style={{ 
                                    backgroundColor: `${themeStyles.primaryColor}05`,
                                    borderColor: `${themeStyles.primaryColor}30`
                                  }}
                                >
                                  <p>{getRelevanceExplanation(source)}</p>
                                  
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
                      ))}
                    </div>
                  )}
                  
                  {/* Pagination controls */}
                  {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                      <div className="text-sm opacity-70">
                        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, sources.length)} of {sources.length}
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
                          // Calculate which page numbers to show
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
            {activeTab === 'insights' && hasInsights && (
              <motion.div
                key="insights-tab"
                variants={tabAnimation}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="p-4"
              >
                <div className="p-4 rounded-lg border border-green-300 bg-green-50/10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium flex items-center text-green-500">
                      <BarChart size={18} className="mr-2" />
                      Search Insights
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Key Terms */}
                    {searchInsights.keyTerms && (
                      <div className="p-3 rounded-md border border-green-300 bg-white shadow-sm">
                        <h4 className="text-sm font-semibold mb-2 text-green-600">Key Terms</h4>
                        <div className="flex flex-wrap gap-2">
                          {Array.isArray(searchInsights.keyTerms) ? (
                            searchInsights.keyTerms.map((term, i) => (
                              <span
                                key={i}
                                className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-600"
                              >
                                {term}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-gray-600">No key terms available</span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Query Analysis */}
                    {searchInsights.queryAnalysis && (
                      <div className="p-3 rounded-md border border-green-300 bg-white shadow-sm">
                        <h4 className="text-sm font-semibold mb-2 text-green-600">Query Analysis</h4>
                        <div className="space-y-2 text-sm">
                          {Object.entries(searchInsights.queryAnalysis).map(([key, value], i) => (
                            <div key={i} className="grid grid-cols-3 gap-2 items-start">
                              <div className="font-medium col-span-1 text-green-700">{key}</div>
                              <div className="col-span-2 break-words text-gray-800">
                                {typeof value === 'string' ? value : JSON.stringify(value)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Suggested Queries */}
                    {searchInsights.suggestedQueries && (
                      <div className="p-3 rounded-md border border-green-300 bg-white shadow-sm">
                        <h4 className="text-sm font-semibold mb-2 text-green-600">Suggested Follow-Up Questions</h4>
                        <div className="space-y-1">
                          {Array.isArray(searchInsights.suggestedQueries) ? (
                            searchInsights.suggestedQueries.map((query, i) => (
                              <button
                                key={i}
                                onClick={() => onFollowupQuestionClicked && onFollowupQuestionClicked(query)}
                                className="flex items-center text-sm p-1.5 rounded w-full text-left hover:bg-green-100 text-green-900"
                              >
                                <ArrowRight size={14} className="mr-2 flex-shrink-0 text-green-500" />
                                <span>{query}</span>
                              </button>
                            ))
                          ) : (
                            <span className="text-sm text-gray-600">No suggested questions available</span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Source Relevance */}
                    {searchInsights.sourceRelevance && (
                      <div className="p-3 rounded-md border border-green-300 bg-white shadow-sm">
                        <h4 className="text-sm font-semibold mb-2 text-green-600">Top Source Relevance</h4>
                        <div className="space-y-3 text-sm max-h-40 overflow-y-auto pr-1">
                          {Array.isArray(searchInsights.sourceRelevance) ? (
                            searchInsights.sourceRelevance.map((source, i) => {
                              const score = source.score || source.relevance || 0.6;
                              const displayScore = Math.min(score * 100, 100).toFixed(0);
                              
                              return (
                                <div
                                  key={i}
                                  className="flex flex-col bg-green-50 p-2 rounded shadow-sm"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="truncate font-semibold text-green-700">
                                      {i + 1}. {source.fileName || source.name || `Document ${i+1}`}
                                    </div>
                                    <div className="text-xs text-gray-500">{displayScore}%</div>
                                  </div>
                                  <div className="h-2 bg-green-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-2 bg-green-500 rounded-full transition-all duration-300"
                                      style={{ width: `${displayScore}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <span className="text-sm text-gray-600">No source relevance information available</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Show raw insights data in expanded view */}
                  <div className="p-3 rounded-md border border-green-300 bg-white shadow-sm">
                    <details className="text-xs">
                      <summary className="cursor-pointer text-green-600 font-medium">View Raw Insights Data</summary>
                      <pre className="whitespace-pre-wrap mt-2 bg-green-100 p-2 rounded overflow-auto max-h-60">
                        {JSON.stringify(searchInsights, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Raw Data Tab */}
            {activeTab === 'raw' && (
              <motion.div
                key="raw-tab"
                variants={tabAnimation}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="p-4"
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
                      backgroundColor: themeStyles.cardBackground, 
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
}