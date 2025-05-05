'use client';

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardCopy, ClipboardCheck, Lightbulb, ChevronDown, ChevronUp,
  Database, FileText, ExternalLink, Search, Code, BarChart, Info,
  ArrowRight, MessageSquare, BookMarked, Cpu, Image as ImageIcon,
  FileImage, X, ChevronLeft, ChevronRight, ZoomIn, Download,
  FileJson, Table, List, PieChart, AlignLeft
} from "lucide-react";

// Helper utilities
const formatDate = (dateString?: string) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) { return dateString; }
};

const getDocumentName = (path?: string) => (!path) ? 'Unknown Document' : path.split('/').pop() || path;

const getDocumentType = (fileName?: string) => {
  if (!fileName) return 'document';
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf': return 'pdf';
    case 'docx': case 'doc': return 'word';
    case 'xlsx': case 'xls': case 'csv': return 'spreadsheet';
    case 'txt': return 'text';
    case 'html': case 'htm': return 'web';
    case 'json': case 'js': case 'py': return 'code';
    case 'jpg': case 'jpeg': case 'png': case 'gif': case 'bmp': case 'svg': return 'image';
    default: return 'document';
  }
};

interface XRayChunk {
  id: number;
  contentType?: string[];
  text?: string;
  suggestedText?: string;
  sectionSummary?: string;
  narrative?: string[];
  json?: any[];
  pageNumbers?: number[];
  boundingBoxes?: Array<{
    pageNumber: number;
    topLeftX: number;
    topLeftY: number;
    bottomRightX: number;
    bottomRightY: number;
  }>;
  parsedData?: any; // Add support for parsed JSON data
  originalText?: string; // Store original text when parsed
}

interface XRayData {
  summary?: string;
  keywords?: string;
  language?: string;
  chunks?: XRayChunk[];
}

interface Source {
  id: string;
  fileName: string;
  score?: number;
  excerpts: string[];
  author?: string;
  datePublished?: string;
  url?: string;
  fileSize?: number;
  type?: string;
  metadata?: Record<string, any>;
  pageImages?: string[];
  thumbnails?: string[];
  imageLabels?: string[];
  pageCount?: number;
  highlights?: string[];
  xray?: XRayData;
}

interface EnhancedAnswerProps {
  answer: any;
  index?: number;
  isSelected?: boolean;
  isStreaming?: boolean;
  searchResults?: any;
  documentExcerpts?: any[];
  onCitationClicked?: (id: string) => void;
  onThoughtProcessClicked?: () => void;
  onSupportingContentClicked?: () => void;
  onFollowupQuestionClicked?: (question: string) => void;
  onRefreshClicked?: () => void;
  onImageClicked?: (url: string, sourceId: string, imageIndex: number) => void;
  showFollowupQuestions?: boolean;
  enableAdvancedFeatures?: boolean;
  theme?: string;
  customStyles?: Record<string, any>;
}

export default function EnhancedAnswer({
  answer,
  index = 0,
  isSelected = false,
  isStreaming = false,
  searchResults = null,
  documentExcerpts = [],
  onCitationClicked = () => {},
  onThoughtProcessClicked = () => {},
  onSupportingContentClicked = () => {},
  onFollowupQuestionClicked = () => {},
  onRefreshClicked = () => {},
  onImageClicked = () => {},
  showFollowupQuestions = false,
  enableAdvancedFeatures = false,
  theme = 'light',
  customStyles = {}
}: EnhancedAnswerProps) {
  // State management
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState('answer');
  const [isCopied, setIsCopied] = useState(false);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [imageViewMode, setImageViewMode] = useState<'grid' | 'single'>('grid');
  const [imageSortBy, setImageSortBy] = useState<'document' | 'relevance'>('document');
  const [activeXrayChunk, setActiveXrayChunk] = useState<XRayChunk | null>(null);
  const [xrayViewMode, setXrayViewMode] = useState<'summary' | 'detail'>('summary');
  const [xrayContentFilter, setXrayContentFilter] = useState<string | null>(null);
  
  // References
  const contentRef = useRef<HTMLDivElement>(null);
  const imageViewerRef = useRef<HTMLDivElement>(null);
  
  // Theme styling
  const themeStyles = {
    backgroundColor: theme === 'dark' ? '#1e1e2e' : '#f8f9fa',
    textColor: theme === 'dark' ? '#e4e6eb' : '#1e1e2e',
    cardBackground: theme === 'dark' ? '#2d2d3a' : '#ffffff',
    borderColor: theme === 'dark' ? '#3f3f5a' : '#e2e8f0',
    primaryColor: theme === 'dark' ? '#ff3f3f' : '#e53e3e', // Changed to red
    secondaryColor: theme === 'dark' ? '#cc0000' : '#b91c1c', // Changed to darker red
    accentColor: theme === 'dark' ? '#ff4d4d' : '#f87171', // Changed to lighter red
    xrayColor: theme === 'dark' ? '#e02020' : '#dc2626', // Changed to vibrant red
    ...customStyles
  };
  
  // Effects
  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => setIsCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isCopied]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showImageViewer && imageViewerRef.current && !imageViewerRef.current.contains(event.target as Node)) {
        setShowImageViewer(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, [showImageViewer]);
  
  useEffect(() => {
    const handleContentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('citation-link')) {
        e.preventDefault();
        const sourceId = target.getAttribute('data-source-id');
        if (sourceId) { onCitationClicked(sourceId); }
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
  
  // Extract sources from answer
  const extractAllSources = (): Source[] => {
    const allSources: Source[] = [];
    const sourceMap = new Map<string, boolean>();
    
    const processSource = (source: any, index: number) => {
      if (!source) return;
      
      const sourceId = source.id || source.documentId || source.fileId || 
                      (source.fileName ? `file-${source.fileName}` : `source-${index}`);
      
      if (!sourceId) return;
      const strSourceId = String(sourceId);
      if (sourceMap.has(strSourceId)) return;
      
      const normalizedSource: Source = {
        id: strSourceId,
        fileName: source.fileName || source.name || source.title || `Document ${strSourceId}`,
        score: source.score || source.relevanceScore || source.confidenceScore || 0,
        excerpts: []
      };
      
      // Handle document images
      normalizedSource.pageImages = source.pageImages || source.images || source.pages || [];
      normalizedSource.thumbnails = source.thumbnails || source.pageImages || source.images || [];
      normalizedSource.imageLabels = source.imageLabels || source.pageLabels || [];
      normalizedSource.pageCount = source.pageCount || 
                                  (source.pageImages ? source.pageImages.length : 0) || 
                                  (source.pages ? source.pages.length : 0);
      
      // Extract all types of text content
      if (source.excerpts && Array.isArray(source.excerpts)) {
        normalizedSource.excerpts.push(...source.excerpts.filter((e: any) => e !== null && e !== undefined));
      }
      
      if (source.snippets && Array.isArray(source.snippets)) {
        normalizedSource.excerpts.push(...source.snippets.filter((s: any) => s !== null && s !== undefined));
      }
      
      if (source.text) normalizedSource.excerpts.push(source.text);
      if (source.content) normalizedSource.excerpts.push(source.content);
      
      // Extract X-Ray data with improved JSON parsing
      if (source.xray) {
        try {
          // Handle the case where the entire xray field might be a stringified JSON
          let xrayData = source.xray;
          if (typeof source.xray === 'string' && source.xray.trim().startsWith('{')) {
            try {
              xrayData = JSON.parse(source.xray);
            } catch (e) {
              console.warn('Failed to parse X-Ray data as JSON string', e);
            }
          }
          
          // Initialize normalized xray data
          let parsedSummary = xrayData.summary;
          let parsedKeywords = xrayData.keywords;
          let parsedChunks = xrayData.chunks || [];
          
          // Try to parse summary if it's a JSON string
          if (typeof parsedSummary === 'string' && parsedSummary.trim().startsWith('{')) {
            try {
              const summaryObj = JSON.parse(parsedSummary);
              parsedSummary = summaryObj.summary || summaryObj.Summary || summaryObj.text || summaryObj.content || parsedSummary;
              // If keywords weren't already set but are in the JSON, use those
              if (!parsedKeywords && (summaryObj.keywords || summaryObj.Keywords)) {
                parsedKeywords = summaryObj.keywords || summaryObj.Keywords;
              }
            } catch (e) {
              console.warn('Failed to parse X-Ray summary as JSON', e);
            }
          }
          
          // Process chunks - this is where the JSON parsing needs improvement
          if (parsedChunks && Array.isArray(parsedChunks)) {
            parsedChunks = parsedChunks.map(chunk => {
              const processedChunk = { ...chunk };
              
              // Parse text field if it looks like JSON
              if (chunk.text && typeof chunk.text === 'string') {
                if (chunk.text.trim().startsWith('{')) {
                  try {
                    const parsedText = JSON.parse(chunk.text);
                    
                    // Store the original text for reference
                    processedChunk.originalText = chunk.text;
                    
                    // Set parsed data for reference
                    processedChunk.parsedData = parsedText;
                    
                    // If we have structured data, use it for display
                    if (parsedText.summary || parsedText.Summary) {
                      processedChunk.sectionSummary = processedChunk.sectionSummary || 
                                                      parsedText.summary || 
                                                      parsedText.Summary;
                    }
                    
                    // Extract JSON data if present
                    if (parsedText.data || parsedText.Data) {
                      processedChunk.json = processedChunk.json || 
                                            parsedText.data || 
                                            parsedText.Data;
                    }
                    
                    // Keep original text in text field for compatibility
                  } catch (e) {
                    // If parsing fails, keep the original text
                    console.warn('Failed to parse chunk text as JSON', e);
                  }
                }
              }
              
              // Parse JSON field if it's a string
              if (chunk.json && typeof chunk.json === 'string') {
                try {
                  processedChunk.json = JSON.parse(chunk.json);
                } catch (e) {
                  console.warn('Failed to parse chunk.json as JSON', e);
                }
              }
              
              return processedChunk;
            });
          }
          
          normalizedSource.xray = {
            summary: parsedSummary,
            keywords: parsedKeywords,
            language: xrayData.language,
            chunks: parsedChunks
          };
        } catch (e) {
          console.error('Error processing X-Ray data', e);
          // Keep the original data if parsing fails
          normalizedSource.xray = {
            summary: source.xray.summary,
            keywords: source.xray.keywords,
            language: source.xray.language,
            chunks: source.xray.chunks
          };
        }
      }
      
      // Extract highlights
      normalizedSource.highlights = source.highlights || [];
      
      // Extract metadata
      normalizedSource.author = source.author;
      normalizedSource.datePublished = source.datePublished;
      normalizedSource.url = source.url || source.sourceUrl;
      normalizedSource.fileSize = source.fileSize;
      normalizedSource.type = source.type || getDocumentType(source.fileName);
      normalizedSource.metadata = { ...source.metadata };
      
      // If no excerpts but have context, use that
      if (normalizedSource.excerpts.length === 0 && source.documentContext) {
        normalizedSource.excerpts.push(source.documentContext);
      }
      
      // If no excerpts but have X-Ray text chunks, use those
      if (normalizedSource.excerpts.length === 0 && normalizedSource.xray?.chunks) {
        const textChunks = normalizedSource.xray.chunks
          .filter(chunk => chunk.text)
          .map(chunk => chunk.text);
          
        if (textChunks.length > 0) {
          normalizedSource.excerpts.push(...textChunks);
        }
      }
      
      // Deduplicate excerpts
      if (normalizedSource.excerpts.length > 0) {
        const uniqueExcerpts = [...new Set(normalizedSource.excerpts)];
        normalizedSource.excerpts = uniqueExcerpts;
      }
      
      allSources.push(normalizedSource);
      sourceMap.set(strSourceId, true);
    };
    
    // Check different locations where sources might be stored
    if (documentExcerpts && Array.isArray(documentExcerpts)) {
      documentExcerpts.forEach(processSource);
    }
    
    if (searchResults && searchResults.sources && Array.isArray(searchResults.sources)) {
      searchResults.sources.forEach(processSource);
    }
    
    if (answer && answer.sources && Array.isArray(answer.sources)) {
      answer.sources.forEach(processSource);
    }
    
    if (answer && answer.documents) {
      const documents = Array.isArray(answer.documents) ? answer.documents : [answer.documents];
      documents.forEach(processSource);
    }
    
    // Handle Ground X format
    if (answer && answer.search && answer.search.results && Array.isArray(answer.search.results)) {
      answer.search.results.forEach(processSource);
    }
    
    // Handle GroundX RAG format
    if (answer && answer.searchResults && answer.searchResults.sources && 
        Array.isArray(answer.searchResults.sources)) {
      answer.searchResults.sources.forEach(processSource);
    }
    
    return allSources;
  };
  
  // Utility functions
  const extractThoughtProcess = () => {
    let reasoning = '';
    if (!answer) return reasoning;
    if (answer.thoughts) {
      reasoning = typeof answer.thoughts === 'string' ? answer.thoughts : JSON.stringify(answer.thoughts, null, 2);
    } 
    else if (answer.result?.thoughts) {
      reasoning = typeof answer.result.thoughts === 'string' ? answer.result.thoughts : JSON.stringify(answer.result.thoughts, null, 2);
    }
    else if (answer.systemMessage) { reasoning = answer.systemMessage; }
    else if (answer.reasoning) { reasoning = answer.reasoning; }
    return reasoning;
  };
  
  const extractContent = () => {
    if (!answer) return '';
    if (typeof answer === 'string') return answer;
    if (answer.content) return answer.content;
    if (answer.answer) {
      return typeof answer.answer === 'string' ? answer.answer : JSON.stringify(answer.answer, null, 2);
    }
    if (answer.response) return answer.response;
    return JSON.stringify(answer, null, 2);
  };
  
  const extractFollowupQuestions = () => {
    if (!answer) return [];
    if (answer.followupQuestions && Array.isArray(answer.followupQuestions)) {
      return answer.followupQuestions;
    }
    if (answer.suggestedQuestions && Array.isArray(answer.suggestedQuestions)) {
      return answer.suggestedQuestions;
    }
    return [];
  };
  
  const getRelevanceExplanation = (source: Source) => {
    if (!source) return '';
    if (source.metadata?.relevance) return source.metadata.relevance;
    
    const confidence = source.score || 0.6;
    const confidencePercent = Math.min(100, Math.round(confidence * 100));
    
    let confidenceLevel = 'medium confidence';
    if (confidencePercent > 80) confidenceLevel = 'high confidence';
    if (confidencePercent < 50) confidenceLevel = 'some relevance';
    
    return `This ${source.type} contains information relevant to your query. The system has ${confidenceLevel} (${confidencePercent}%) that this source contributes valuable information to the answer.`;
  };
  
  // Enhanced JSON display function
  const renderJsonData = (jsonData: any) => {
    if (!jsonData) return null;
    
    // Handle array data
    if (Array.isArray(jsonData)) {
      return (
        <div className="space-y-2">
          {jsonData.map((item, index) => (
            <div key={index} className="border-b pb-2" style={{ borderColor: `${themeStyles.borderColor}30` }}>
              {typeof item === 'object' ? (
                <div>
                  {Object.entries(item).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-3 gap-2 text-xs">
                      <div className="font-medium">{key}:</div>
                      <div className="col-span-2">
                        {typeof value === 'object' 
                          ? JSON.stringify(value) 
                          : String(value)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs">{String(item)}</div>
              )}
            </div>
          ))}
        </div>
      );
    }
    
    // Handle object data
    if (typeof jsonData === 'object' && jsonData !== null) {
      return (
        <div className="space-y-1">
          {Object.entries(jsonData).map(([key, value]) => (
            <div key={key} className="grid grid-cols-3 gap-2 text-xs">
              <div className="font-medium">{key}:</div>
              <div className="col-span-2">
                {typeof value === 'object' 
                  ? JSON.stringify(value)
                  : String(value)}
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    // Handle primitive values
    return <div className="text-xs">{String(jsonData)}</div>;
  };
  
  // Handlers
  const toggleDocExpansion = (docId: string) => {
    setExpandedDocs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) { newSet.delete(docId); } 
      else { newSet.add(docId); }
      return newSet;
    });
  };
  
  const handleDocumentClick = (source: Source) => {
    if (!source || !source.id) return;
    toggleDocExpansion(source.id);
    setCurrentDocumentId(source.id);
  };
  
  const handleImageClick = (source: Source, imageIndex: number) => {
    if (!source || !source.pageImages || !source.pageImages.length) return;
    setSelectedSourceId(source.id);
    setSelectedImageIndex(imageIndex);
    setShowImageViewer(true);
    if (onImageClicked) {
      onImageClicked(source.pageImages[imageIndex], source.id, imageIndex);
    }
  };
  
  const navigateImage = (direction: 'prev' | 'next') => {
    if (!selectedSourceId) return;
    const sources = extractAllSources();
    const currentSource = sources.find(s => s.id === selectedSourceId);
    if (!currentSource || !currentSource.pageImages || !currentSource.pageImages.length) return;
    const totalImages = currentSource.pageImages.length;
    
    if (direction === 'prev') {
      setSelectedImageIndex(prev => (prev > 0 ? prev - 1 : totalImages - 1));
    } else {
      setSelectedImageIndex(prev => (prev < totalImages - 1 ? prev + 1 : 0));
    }
  };
  
  const getAllImages = () => {
    const sources = extractAllSources();
    const allImages: {url: string, sourceId: string, index: number, source: Source}[] = [];
    
    sources.forEach(source => {
      if (source.pageImages && source.pageImages.length) {
        source.pageImages.forEach((url, index) => {
          allImages.push({
            url, sourceId: source.id, index, source
          });
        });
      }
    });
    
    if (imageSortBy === 'relevance') {
      return allImages.sort((a, b) => (b.source.score || 0) - (a.source.score || 0));
    }
    return allImages;
  };
  
  const getAllXrayChunks = () => {
    const sources = extractAllSources();
    let allChunks: {chunk: XRayChunk, sourceId: string, source: Source}[] = [];
    
    sources.forEach(source => {
      if (source.xray?.chunks && source.xray.chunks.length) {
        source.xray.chunks.forEach(chunk => {
          allChunks.push({
            chunk, sourceId: source.id, source
          });
        });
      }
    });
    
    if (xrayContentFilter) {
      allChunks = allChunks.filter(item => 
        item.chunk.contentType?.includes(xrayContentFilter)
      );
    }
    
    return allChunks;
  };
  
  const hasXrayData = () => {
    const sources = extractAllSources();
    return sources.some(source => source.xray && (
      source.xray.summary || 
      source.xray.keywords || 
      (source.xray.chunks && source.xray.chunks.length > 0)
    ));
  };
  
  const handleCopyToClipboard = () => {
    const contentToCopy = extractContent();
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(contentToCopy)
          .then(() => setIsCopied(true))
          .catch(err => {
            console.error("Copy failed:", err);
          });
      }
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };
  
  const getCurrentDocument = () => {
    if (!currentDocumentId) return null;
    const sources = extractAllSources();
    return sources.find(s => s.id === currentDocumentId);
  };
  
  // UI Components
  const getDocumentIcon = (fileName?: string, type?: string) => {
    const docType = type || getDocumentType(fileName);
    switch (docType.toLowerCase()) {
      case 'pdf': return <FileText size={16} className="text-red-600" />;
      case 'word': return <FileText size={16} className="text-blue-600" />;
      case 'spreadsheet': case 'csv': return <Code size={16} className="text-green-600" />;
      case 'code': case 'json': return <Code size={16} className="text-yellow-600" />;
      case 'text': case 'txt': return <FileText size={16} className="text-gray-600" />;
      case 'web': case 'html': return <Search size={16} className="text-purple-600" />;
      case 'image': return <FileImage size={16} className="text-pink-600" />;
      default: return <FileText size={16} className="text-gray-600" />;
    }
  };
  
  const getContentTypeIcon = (contentType?: string[]) => {
    if (!contentType || contentType.length === 0) return <AlignLeft size={16} />;
    if (contentType.includes('table')) return <Table size={16} />;
    if (contentType.includes('figure')) return <PieChart size={16} />;
    if (contentType.includes('list')) return <List size={16} />;
    if (contentType.includes('code')) return <Code size={16} />;
    if (contentType.includes('json')) return <FileJson size={16} />;
    return <AlignLeft size={16} />;
  };
  
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    selected: {
      scale: 1.005,
      boxShadow: "0 4px 20px rgba(99, 102, 241, 0.15)",
      transition: { duration: 0.2 }
    }
  };
  
  const tabAnimation = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  };
  
  const modalAnimation = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 }
  };
  
  // Get extracted data
  const content = extractContent();
  const thoughtProcess = extractThoughtProcess();
  const followupQuestions = extractFollowupQuestions();
  const sources = extractAllSources();
  const currentDocument = getCurrentDocument();
  const allImages = getAllImages();
  const allXrayChunks = getAllXrayChunks();
  
  const hasThoughts = thoughtProcess && thoughtProcess.length > 0;
  const hasSources = sources && sources.length > 0;
  const hasImages = allImages.length > 0;
  const hasXray = hasXrayData();
  
  // Get current image for image viewer
  const currentImage = () => {
    if (!selectedSourceId || selectedImageIndex === undefined) return null;
    const source = sources.find(s => s.id === selectedSourceId);
    if (!source || !source.pageImages || !source.pageImages.length) return null;
    
    return {
      url: source.pageImages[selectedImageIndex],
      label: source.imageLabels && source.imageLabels[selectedImageIndex] 
          ? source.imageLabels[selectedImageIndex] 
          : `Page ${selectedImageIndex + 1}`,
      source
    };
  };
  
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
        </div>
        
        <div className="flex items-center space-x-1">
          {onRefreshClicked && (
            <button
              onClick={onRefreshClicked}
              className="p-2 rounded-full transition-colors hover:bg-indigo-50"
              title="Refresh Response"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2v6h-6"></path>
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                <path d="M3 22v-6h6"></path>
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
              </svg>
            </button>
          )}
          
          <button
            onClick={handleCopyToClipboard}
            className="p-2 rounded-full transition-colors hover:bg-indigo-50 relative"
            title={isCopied ? "Copied!" : "Copy to clipboard"}
          >
            {isCopied ? <ClipboardCheck size={18} /> : <ClipboardCopy size={18} />}
          </button>
          
          <button
            onClick={() => {
              setActiveTab('thought-process');
              onThoughtProcessClicked();
            }}
            className={`p-2 rounded-full transition-colors ${hasThoughts ? 'hover:bg-amber-50 text-amber-500' : 'opacity-50 cursor-not-allowed'}`}
            title="Show Thought Process"
            disabled={!hasThoughts}
          >
            <Lightbulb size={18} />
          </button>
          
          <button
            onClick={() => {
              setActiveTab('sources');
              onSupportingContentClicked();
            }}
            className={`p-2 rounded-full transition-colors ${hasSources ? 'hover:bg-purple-50 text-purple-500' : 'opacity-50 cursor-not-allowed'}`}
            title="Show Sources"
            disabled={!hasSources}
          >
            <Database size={18} />
          </button>
          
          {hasXray && (
            <button
              onClick={() => setActiveTab('xray')}
              className="p-2 rounded-full transition-colors hover:bg-blue-50 text-blue-500"
              title="X-Ray Document Analysis"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                <path d="M12 12 6 6"/>
                <path d="M12 6v6"/>
                <path d="M21 9V3h-6"/>
              </svg>
            </button>
          )}
          
          {hasImages && (
            <button
              onClick={() => setActiveTab('images')}
              className="p-2 rounded-full transition-colors hover:bg-pink-50 text-pink-500"
              title="Document Images"
            >
              <ImageIcon size={18} />
            </button>
          )}
          
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 rounded-full transition-colors hover:bg-gray-100"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>
      
      {/* Document detail view */}
      {currentDocument && (
        <div
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
              
              {currentDocument.xray && (
                <span 
                  className="ml-2 px-2 py-0.5 text-xs rounded-full"
                  style={{ 
                    backgroundColor: `${themeStyles.xrayColor}20`,
                    color: themeStyles.xrayColor
                  }}
                >
                  X-Ray Analysis
                </span>
              )}
            </div>
            <button onClick={() => setCurrentDocumentId(null)} className="p-1">
              <X size={16} />
            </button>
          </div>
          
          <div className="mb-3 text-xs opacity-70">
            Document ID: {currentDocument.id}
          </div>
          
          {/* X-Ray Summary */}
          {currentDocument.xray?.summary && (
            <div 
              className="mb-4 p-3 rounded-lg border"
              style={{ 
                backgroundColor: `${themeStyles.xrayColor}05`,
                borderColor: `${themeStyles.xrayColor}30`
              }}
            >
              <h4 
                className="text-sm font-medium mb-2 flex items-center"
                style={{ color: themeStyles.xrayColor }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  <path d="M12 12 6 6"/>
                  <path d="M12 6v6"/>
                  <path d="M21 9V3h-6"/>
                </svg>
                X-Ray Document Summary
              </h4>
              <p className="text-sm">{currentDocument.xray.summary}</p>
              
              {currentDocument.xray.keywords && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {currentDocument.xray.keywords.split(',').map((keyword, i) => (
                    <span 
                      key={i}
                      className="px-2 py-0.5 text-xs rounded-full"
                      style={{ 
                        backgroundColor: `${themeStyles.xrayColor}15`,
                        color: themeStyles.xrayColor
                      }}
                    >
                      {keyword.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Document images if available */}
          {currentDocument.pageImages && currentDocument.pageImages.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Document Pages:</h4>
              <div className="flex flex-wrap gap-2">
                {currentDocument.pageImages.slice(0, 6).map((imageUrl, index) => (
                  <div 
                    key={index}
                    onClick={() => handleImageClick(currentDocument, index)}
                    className="relative border rounded overflow-hidden cursor-pointer group"
                    style={{
                      width: '100px', 
                      height: '120px',
                      borderColor: themeStyles.borderColor
                    }}
                  >
                    <img 
                      src={imageUrl} 
                      alt={currentDocument.imageLabels?.[index] || `Page ${index + 1}`}
                      className="w-full h-full object-cover object-top"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200" />
                    <div className="absolute bottom-0 left-0 right-0 text-xs bg-black bg-opacity-50 text-white text-center py-1">
                      {currentDocument.imageLabels?.[index] || `Page ${index + 1}`}
                    </div>
                  </div>
                ))}
                
                {currentDocument.pageImages.length > 6 && (
                  <div 
                    className="relative border rounded overflow-hidden cursor-pointer flex items-center justify-center"
                    onClick={() => setActiveTab('images')}
                    style={{
                      width: '100px', 
                      height: '120px',
                      backgroundColor: `${themeStyles.accentColor}10`,
                      borderColor: themeStyles.borderColor
                    }}
                  >
                    <div className="text-center">
                      <span className="block font-medium" style={{ color: themeStyles.accentColor }}>
                        +{currentDocument.pageImages.length - 6}
                      </span>
                      <span className="text-xs opacity-70">more pages</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* X-Ray chunks if available */}
          {currentDocument.xray?.chunks && currentDocument.xray.chunks.length > 0 && (
            <div className="mb-4">
              <h4 
                className="text-sm font-medium mb-2 flex items-center"
                style={{ color: themeStyles.xrayColor }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M9 3v18" />
                  <path d="M15 3v18" />
                  <path d="M3 9h18" />
                  <path d="M3 15h18" />
                </svg>
                X-Ray Content Chunks
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                {currentDocument.xray.chunks.slice(0, 4).map((chunk, index) => (
                  <div 
                    key={index}
                    className="p-2 border rounded cursor-pointer hover:shadow-sm transition-shadow"
                    onClick={() => {
                      setActiveTab('xray');
                      setActiveXrayChunk(chunk);
                    }}
                    style={{ 
                      borderColor: themeStyles.borderColor,
                      backgroundColor: `${themeStyles.cardBackground}`
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center">
                        {getContentTypeIcon(chunk.contentType)}
                        <span 
                          className="ml-1.5 text-xs font-medium"
                          style={{ color: themeStyles.xrayColor }}
                        >
                          {chunk.contentType?.join(', ') || 'Text'} 
                        </span>
                      </div>
                      <span className="text-xs opacity-60">#{chunk.id}</span>
                    </div>
                    
                    <div className="text-xs line-clamp-2 mt-1">
                      {/* Display parsed summary if available */}
                      {chunk.parsedData?.summary || chunk.parsedData?.Summary || 
                       chunk.sectionSummary || chunk.text?.substring(0, 100) || 'No preview available'}
                      {(!chunk.parsedData?.summary && !chunk.parsedData?.Summary && 
                        !chunk.sectionSummary && chunk.text && chunk.text.length > 100) ? '...' : ''}
                    </div>
                    
                    {chunk.pageNumbers && chunk.pageNumbers.length > 0 && (
                      <div className="mt-1 text-xs opacity-60">
                        Page{chunk.pageNumbers.length > 1 ? 's' : ''}: {chunk.pageNumbers.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {currentDocument.xray.chunks.length > 4 && (
                <button
                  onClick={() => {
                    setActiveTab('xray');
                    setSelectedSourceId(currentDocument.id);
                  }}
                  className="text-xs px-2 py-1 rounded"
                  style={{ 
                    backgroundColor: `${themeStyles.xrayColor}10`,
                    color: themeStyles.xrayColor
                  }}
                >
                  View all {currentDocument.xray.chunks.length} content chunks
                </button>
              )}
            </div>
          )}
          
          {/* Document excerpts */}
          {currentDocument.excerpts.length > 0 ? (
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center">
                <span className="mr-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </span>
                Excerpts from {currentDocument.fileName}
              </h4>
              
              <div className="space-y-4">
                {currentDocument.excerpts.map((excerpt, i) => (
                  <div
                    key={i}
                    className="rounded-lg border-l-4 shadow-sm p-4 text-sm relative overflow-hidden transition-all duration-150 hover:shadow-md"
                    style={{
                      backgroundColor: themeStyles.cardBackground,
                      borderLeftColor: themeStyles.secondaryColor,
                      borderTop: `1px solid ${themeStyles.borderColor}`,
                      borderRight: `1px solid ${themeStyles.borderColor}`,
                      borderBottom: `1px solid ${themeStyles.borderColor}`
                    }}
                  >
                    <div 
                      className="absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full"
                      style={{ 
                        backgroundColor: `${themeStyles.secondaryColor}15`,
                        color: themeStyles.secondaryColor
                      }}
                    >
                      Excerpt {i+1}
                    </div>
                    
                    <div className="prose prose-sm max-w-none mt-1" style={{ color: themeStyles.textColor }}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{excerpt}</ReactMarkdown>
                    </div>
                    
                    {currentDocument.highlights && currentDocument.highlights[i] && (
                      <div 
                        className="mt-3 pt-3 text-sm rounded-md p-2" 
                        style={{ 
                          backgroundColor: `${themeStyles.primaryColor}08`,
                          borderTop: `1px dashed ${themeStyles.borderColor}`
                        }}
                      >
                        <div className="flex items-center mb-1 text-xs font-medium" style={{ color: themeStyles.primaryColor }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                            <path d="M11.467 11.467 3.799 19.135a2.5 2.5 0 0 0 3.536 3.536l7.668-7.668"></path>
                            <path d="M18.006 4.828 3.799 19.035"></path>
                            <path d="m23 4-6 2 2-6"></path>
                            <path d="m13 19 8-8"></path>
                          </svg>
                          Highlighted Match
                        </div>
                        <div className="text-sm italic ml-4" style={{ color: `${themeStyles.primaryColor}` }}>
                          "{currentDocument.highlights[i]}"
                        </div>
                      </div>
                    )}
                    
                    {currentDocument.metadata && Object.keys(currentDocument.metadata).length > 0 && (
                      <div 
                        className="mt-3 pt-2 flex flex-wrap gap-2 text-xs" 
                        style={{ borderTop: `1px dashed ${themeStyles.borderColor}` }}
                      >
                        {currentDocument.score !== undefined && (
                          <span 
                            className="px-2 py-1 rounded-full flex items-center"
                            style={{ 
                              backgroundColor: `${themeStyles.secondaryColor}15`, 
                              color: themeStyles.secondaryColor
                            }}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                              <path d="M12 2v20"></path>
                              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                            </svg>
                            Relevance: {(currentDocument.score * 100).toFixed(1)}%
                          </span>
                        )}
                        
                        {currentDocument.metadata.page && (
                          <span 
                            className="px-2 py-1 rounded-full flex items-center"
                            style={{ 
                              backgroundColor: `${themeStyles.primaryColor}15`, 
                              color: themeStyles.primaryColor
                            }}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                              <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
                            </svg>
                            Page {currentDocument.metadata.page}
                          </span>
                        )}
                        
                        {currentDocument.datePublished && (
                          <span 
                            className="px-2 py-1 rounded-full flex items-center"
                            style={{ 
                              backgroundColor: `${themeStyles.textColor}10`, 
                              color: themeStyles.textColor
                            }}
                          >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                              <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
                              <line x1="16" x2="16" y1="2" y2="6"></line>
                              <line x1="8" x2="8" y1="2" y2="6"></line>
                              <line x1="3" x2="21" y1="10" y2="10"></line>
                            </svg>
                            {formatDate(currentDocument.datePublished)}
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => onCitationClicked && onCitationClicked(currentDocument.id)}
                        className="text-xs px-2 py-1 rounded flex items-center"
                        style={{ 
                          backgroundColor: `${themeStyles.primaryColor}10`,
                          color: themeStyles.primaryColor
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" x2="21" y1="14" y2="3"></line>
                        </svg>
                        View in Document
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center p-6 rounded-lg border border-dashed text-sm italic" style={{ borderColor: themeStyles.borderColor, color: `${themeStyles.textColor}70` }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 opacity-70">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              No excerpts available for this document
            </div>
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
          
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                setCurrentDocumentId(null);
                onCitationClicked(currentDocument.id);
              }}
              className="text-white text-sm px-3 py-1.5 rounded flex items-center"
              style={{ backgroundColor: themeStyles.secondaryColor }}
            >
              <ExternalLink size={14} className="mr-1.5" />
              View Full Document
            </button>
          </div>
        </div>
      )}
      
      {/* Image Viewer Modal */}
      <AnimatePresence>
        {showImageViewer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
            <motion.div 
              ref={imageViewerRef}
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={modalAnimation}
              className="relative max-w-4xl max-h-[90vh] flex flex-col rounded-lg overflow-hidden"
              style={{ 
                backgroundColor: themeStyles.cardBackground,
                color: themeStyles.textColor
              }}
            >
              {/* Image viewer header */}
              <div className="p-3 flex justify-between items-center border-b" style={{ borderColor: themeStyles.borderColor }}>
                <div className="flex items-center">
                  <ImageIcon size={18} style={{ color: themeStyles.accentColor }} className="mr-2" />
                  <h3 className="font-medium">
                    {currentImage()?.source.fileName || 'Document Image'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowImageViewer(false)}
                  className="p-1 rounded-full hover:bg-gray-100"
                >
                  <X size={18} />
                </button>
              </div>
              
              {/* Image display */}
              <div className="relative flex-1 overflow-auto bg-gray-900 flex items-center justify-center">
                {currentImage()?.url && (
                  <img 
                    src={currentImage()?.url} 
                    alt={currentImage()?.label}
                    className="max-w-full max-h-[70vh] object-contain"
                  />
                )}
                
                {/* Navigation controls */}
                <button
                  onClick={() => navigateImage('prev')}
                  className="absolute left-2 p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={() => navigateImage('next')}
                  className="absolute right-2 p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                >
                  <ChevronRight size={24} />
                </button>
              </div>
              
              {/* Footer with metadata */}
              <div className="p-3 border-t" style={{ borderColor: themeStyles.borderColor }}>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-medium">
                      {currentImage()?.label} 
                      {currentImage()?.source.pageImages && (
                        <span className="ml-2 opacity-70">
                          ({selectedImageIndex + 1} of {currentImage()?.source.pageImages.length})
                        </span>
                      )}
                    </span>
                  </div>
                  <div>
                    <a 
                      href={currentImage()?.url} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm px-3 py-1 rounded flex items-center"
                      style={{ 
                        backgroundColor: `${themeStyles.accentColor}10`,
                        color: themeStyles.accentColor
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download size={14} className="mr-1.5" />
                      Download Image
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Tab navigation */}
      {expanded && (
        <div className="border-b" style={{ borderColor: themeStyles.borderColor }}>
          <div className="flex space-x-2 overflow-x-auto">
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
            
            {/* X-Ray Tab */}
            {hasXray && (
              <button 
                className={`px-3 py-2 text-sm font-medium flex items-center ${
                  activeTab === 'xray' 
                    ? 'border-b-2' 
                    : 'hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('xray')}
                style={{ 
                  color: activeTab === 'xray' ? themeStyles.xrayColor : themeStyles.textColor,
                  borderColor: activeTab === 'xray' ? themeStyles.xrayColor : 'transparent'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  <path d="M12 12 6 6"/>
                  <path d="M12 6v6"/>
                  <path d="M21 9V3h-6"/>
                </svg>
                X-Ray Analysis
              </button>
            )}
            
            {hasImages && (
              <button 
                className={`px-3 py-2 text-sm font-medium flex items-center ${
                  activeTab === 'images' 
                    ? 'border-b-2' 
                    : 'hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('images')}
                style={{ 
                  color: activeTab === 'images' ? themeStyles.accentColor : themeStyles.textColor,
                  borderColor: activeTab === 'images' ? themeStyles.accentColor : 'transparent'
                }}
              >
                <ImageIcon size={14} className="mr-1" />
                Images ({allImages.length})
              </button>
            )}
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
                      <ReactMarkdown>{thoughtProcess}</ReactMarkdown>
                    </pre>
                  </div>
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
                  
                  <div className="mt-2 space-y-2">
                    {sources.map((source, index) => (
                      <div
                        key={`${source.id}-${index}`}
                        className="rounded-md border overflow-hidden"
                        style={{ 
                          backgroundColor: themeStyles.cardBackground, 
                          borderColor: themeStyles.borderColor
                        }}
                      >
                        <div 
                          className="flex items-center justify-between gap-2 text-sm p-3 cursor-pointer"
                          onClick={() => handleDocumentClick(source)}
                          style={{ color: themeStyles.textColor }}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {getDocumentIcon(source.fileName, source.type)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center">
                                <span className="truncate font-medium" title={source.fileName}>
                                  {source.fileName}
                                </span>
                                
                                {source.pageImages && source.pageImages.length > 0 && (
                                  <span 
                                    className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                                    style={{ 
                                      backgroundColor: `${themeStyles.accentColor}20`,
                                      color: themeStyles.accentColor
                                    }}
                                  >
                                    {source.pageImages.length} {source.pageImages.length === 1 ? 'page' : 'pages'}
                                  </span>
                                )}
                                
                                {source.xray && (
                                  <span 
                                    className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
                                    style={{ 
                                      backgroundColor: `${themeStyles.xrayColor}20`,
                                      color: themeStyles.xrayColor
                                    }}
                                  >
                                    X-Ray
                                  </span>
                                )}
                              </div>
                              
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
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {source.score !== undefined && (
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
                            
                            {expandedDocs.has(source.id) ? (
                              <ChevronUp size={14} className="opacity-70" />
                            ) : (
                              <ChevronDown size={14} className="opacity-70" />
                            )}
                          </div>
                        </div>
                        
                        {/* Expanded document preview */}
                        {expandedDocs.has(source.id) && (
                          <div
                            className="border-t p-3"
                            style={{ 
                              backgroundColor: `${themeStyles.secondaryColor}05`,
                              borderColor: themeStyles.borderColor
                            }}
                          >
                            {/* X-Ray summary if available */}
                            {source.xray?.summary && (
                              <div 
                                className="mb-3 p-2 rounded border text-sm"
                                style={{ 
                                  backgroundColor: `${themeStyles.xrayColor}05`,
                                  borderColor: `${themeStyles.xrayColor}30`
                                }}
                              >
                                <div className="flex items-center text-xs mb-1 font-medium" style={{ color: themeStyles.xrayColor }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                                    <path d="M12 12 6 6"/>
                                    <path d="M12 6v6"/>
                                    <path d="M21 9V3h-6"/>
                                  </svg>
                                  X-Ray Summary
                                </div>
                                <div className="text-sm">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {source.xray.summary}
                                  </ReactMarkdown>
                                </div>
                                
                                {source.xray.keywords && (
                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                    {source.xray.keywords.split(',').slice(0, 5).map((keyword, i) => (
                                      <span 
                                        key={i}
                                        className="px-1.5 py-0.5 text-xs rounded-full"
                                        style={{ 
                                          backgroundColor: `${themeStyles.xrayColor}15`,
                                          color: themeStyles.xrayColor
                                        }}
                                      >
                                        {keyword.trim()}
                                      </span>
                                    ))}
                                    {source.xray.keywords.split(',').length > 5 && (
                                      <span className="text-xs opacity-70">+{source.xray.keywords.split(',').length - 5} more</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Document images if available */}
                            {source.pageImages && source.pageImages.length > 0 && (
                              <div className="mb-3">
                                <h5 className="text-xs font-medium mb-2">Document Pages:</h5>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {source.pageImages.slice(0, 4).map((imageUrl, imgIndex) => (
                                    <div 
                                      key={imgIndex}
                                      onClick={() => handleImageClick(source, imgIndex)}
                                      className="relative border rounded overflow-hidden cursor-pointer"
                                      style={{
                                        width: '60px', 
                                        height: '80px',
                                        borderColor: themeStyles.borderColor
                                      }}
                                    >
                                      <img 
                                        src={imageUrl} 
                                        alt={`Page ${imgIndex + 1} of ${source.fileName}`}
                                        className="w-full h-full object-cover object-top"
                                      />
                                      <div className="absolute bottom-0 left-0 right-0 text-xs bg-black bg-opacity-50 text-white text-center py-0.5">
                                        {imgIndex + 1}
                                      </div>
                                    </div>
                                  ))}
                                  
                                  {source.pageImages.length > 4 && (
                                    <button
                                      onClick={() => {
                                        setActiveTab('images');
                                        setSelectedSourceId(source.id);
                                      }}
                                      className="text-xs px-2 py-1 rounded"
                                      style={{ 
                                        backgroundColor: `${themeStyles.accentColor}10`,
                                        color: themeStyles.accentColor
                                      }}
                                    >
                                      View all {source.pageImages.length} pages
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* X-Ray chunks preview if available */}
                            {source.xray?.chunks && source.xray.chunks.length > 0 && (
                              <div className="mb-3">
                                <h5 className="text-xs font-medium mb-2">
                                  X-Ray Content Chunks ({source.xray.chunks.length}):
                                </h5>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {source.xray.chunks.slice(0, 3).map((chunk, chunkIndex) => (
                                    <button
                                      key={chunkIndex}
                                      onClick={() => {
                                        setActiveTab('xray');
                                        setActiveXrayChunk(chunk);
                                        setSelectedSourceId(source.id);
                                      }}
                                      className="text-xs px-2 py-1 rounded flex items-center"
                                      style={{ 
                                        backgroundColor: `${themeStyles.xrayColor}10`,
                                        color: themeStyles.xrayColor
                                      }}
                                    >
                                      {getContentTypeIcon(chunk.contentType)}
                                      <span className="ml-1">
                                        {chunk.contentType?.join(', ') || 'Text'} #{chunk.id}
                                      </span>
                                    </button>
                                  ))}
                                  
                                  {source.xray.chunks.length > 3 && (
                                    <button
                                      onClick={() => {
                                        setActiveTab('xray');
                                        setSelectedSourceId(source.id);
                                      }}
                                      className="text-xs px-2 py-1 rounded"
                                      style={{ 
                                        backgroundColor: `${themeStyles.xrayColor}10`,
                                        color: themeStyles.xrayColor
                                      }}
                                    >
                                      +{source.xray.chunks.length - 3} more
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Document excerpts */}
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
                              <button
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
                                View Details
                              </button>
                              
                              <button
                                className="text-xs text-white px-2 py-1 rounded flex items-center"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCitationClicked(source.id);
                                }}
                                style={{ backgroundColor: themeStyles.secondaryColor }}
                              >
                                <ExternalLink size={12} className="mr-1" />
                                Open Document
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* X-Ray tab */}
            {activeTab === 'xray' && hasXray && (
              <motion.div
                key="xray-tab"
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
                    backgroundColor: `${themeStyles.xrayColor}05`, 
                    borderColor: `${themeStyles.xrayColor}30` 
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 
                      className="text-lg font-medium flex items-center"
                      style={{ color: themeStyles.xrayColor }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                        <path d="M12 12 6 6"/>
                        <path d="M12 6v6"/>
                        <path d="M21 9V3h-6"/>
                      </svg>
                      X-Ray Document Analysis
                    </h3>
                    
                    <div className="flex gap-2">
                      {/* View mode toggle */}
                      <div className="rounded-md overflow-hidden border flex" 
                        style={{ borderColor: themeStyles.borderColor }}
                      >
                        <button
                          onClick={() => setXrayViewMode('summary')}
                          className={`px-3 py-1 text-xs ${xrayViewMode === 'summary' ? 'font-medium' : ''}`}
                          style={{
                            backgroundColor: xrayViewMode === 'summary' 
                              ? `${themeStyles.xrayColor}15` 
                              : 'transparent',
                            color: xrayViewMode === 'summary'
                              ? themeStyles.xrayColor
                              : themeStyles.textColor
                          }}
                        >
                          Summary
                        </button>
                        <button
                          onClick={() => setXrayViewMode('detail')}
                          className={`px-3 py-1 text-xs ${xrayViewMode === 'detail' ? 'font-medium' : ''}`}
                          style={{
                            backgroundColor: xrayViewMode === 'detail' 
                              ? `${themeStyles.xrayColor}15` 
                              : 'transparent',
                            color: xrayViewMode === 'detail'
                              ? themeStyles.xrayColor
                              : themeStyles.textColor
                          }}
                        >
                          Details
                        </button>
                      </div>
                      
                      {/* Content type filter */}
                      <select
                        value={xrayContentFilter || ''}
                        onChange={(e) => setXrayContentFilter(e.target.value || null)}
                        className="text-xs rounded border px-2 py-1"
                        style={{ 
                          borderColor: themeStyles.borderColor,
                          backgroundColor: themeStyles.cardBackground,
                          color: themeStyles.textColor 
                        }}
                      >
                        <option value="">All Content Types</option>
                        <option value="table">Tables</option>
                        <option value="figure">Figures</option>
                        <option value="paragraph">Paragraphs</option>
                        <option value="list">Lists</option>
                        <option value="code">Code</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Summary view */}
                  {xrayViewMode === 'summary' && (
                    <div className="space-y-4">
                      {/* Documents with X-Ray data */}
                      {sources
                        .filter(source => source.xray)
                        .map((source, index) => (
                          <div 
                            key={`xray-summary-${index}`}
                            className="border rounded-lg overflow-hidden"
                            style={{
                              borderColor: themeStyles.borderColor,
                              backgroundColor: themeStyles.cardBackground
                            }}
                          >
                            <div 
                              className="p-3 border-b flex items-center justify-between"
                              style={{ borderColor: themeStyles.borderColor }}
                            >
                              <div className="flex items-center">
                                {getDocumentIcon(source.fileName, source.type)}
                                <h4 className="ml-2 font-medium text-sm">
                                  {source.fileName}
                                </h4>
                              </div>
                              
                              {source.score !== undefined && (
                                <span 
                                  className="px-2 py-0.5 text-xs rounded-full"
                                  style={{ 
                                    backgroundColor: `${themeStyles.secondaryColor}15`, 
                                    color: themeStyles.secondaryColor 
                                  }}
                                >
                                  Score: {(source.score * 100).toFixed(1)}%
                                </span>
                              )}
                            </div>
                            
                            <div className="p-3">
                              {/* Document summary */}
                              {source.xray?.summary && (
                                <div className="mb-4">
                                  <div className="flex items-center text-xs mb-1 font-medium" style={{ color: themeStyles.xrayColor }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                      <rect width="18" height="14" x="3" y="5" rx="2" />
                                      <path d="M21 15V19" />
                                      <path d="M3 15V19" />
                                      <path d="M12 17h.01" />
                                    </svg>
                                    Document Summary
                                  </div>
                                  <p className="text-sm">{source.xray.summary}</p>
                                </div>
                              )}
                              
                              {/* Keywords */}
                              {source.xray?.keywords && (
                                <div className="mb-4">
                                  <div className="flex items-center text-xs mb-1 font-medium" style={{ color: themeStyles.xrayColor }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                      <path d="M10 4a2 2 0 1 0-4 0c0 1.1.9 2 2 2a2 2 0 0 0 0-4zm0 12a2 2 0 1 0-4 0 2 2 0 0 0 4 0z" />
                                      <path d="M4 6v12" />
                                      <path d="M12 22a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                                      <path d="M16 6a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                                      <path d="M16 14a4 4 0 0 0-8 0" />
                                    </svg>
                                    Keywords
                                  </div>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {source.xray.keywords.split(',').map((keyword, i) => (
                                      <span 
                                        key={i}
                                        className="px-2 py-0.5 text-xs rounded-full"
                                        style={{ 
                                          backgroundColor: `${themeStyles.xrayColor}10`,
                                          color: themeStyles.xrayColor
                                        }}
                                      >
                                        {keyword.trim()}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Content Statistics */}
                              {source.xray?.chunks && (
                                <div className="mb-4">
                                  <div className="flex items-center text-xs mb-1 font-medium" style={{ color: themeStyles.xrayColor }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                      <path d="M3 3v18h18" />
                                      <path d="M18 12V8" />
                                      <path d="M12 18v-9" />
                                      <path d="M7 15v-3" />
                                    </svg>
                                    Content Statistics
                                  </div>
                                  
                                  <div className="mt-2 grid grid-cols-3 gap-2">
                                    {(() => {
                                      const contentTypes = new Map();
                                      source.xray.chunks.forEach(chunk => {
                                        if (chunk.contentType) {
                                          chunk.contentType.forEach(type => {
                                            contentTypes.set(type, (contentTypes.get(type) || 0) + 1);
                                          });
                                        } else {
                                          contentTypes.set('text', (contentTypes.get('text') || 0) + 1);
                                        }
                                      });
                                      
                                      return Array.from(contentTypes.entries()).map(([type, count]) => (
                                        <div 
                                          key={type}
                                          className="border rounded p-2 text-center"
                                          style={{ 
                                            borderColor: themeStyles.borderColor,
                                            backgroundColor: `${themeStyles.xrayColor}05`
                                          }}
                                        >
                                          <div className="text-lg font-semibold" style={{ color: themeStyles.xrayColor }}>
                                            {count}
                                          </div>
                                          <div className="text-xs capitalize opacity-80">
                                            {type}{count !== 1 ? 's' : ''}
                                          </div>
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                </div>
                              )}
                              
                              {/* Buttons for viewing more */}
                              <div className="flex justify-end space-x-2">
                                <button
                                  className="text-xs px-2 py-1 rounded flex items-center"
                                  onClick={() => {
                                    setXrayViewMode('detail');
                                    setSelectedSourceId(source.id);
                                  }}
                                  style={{ 
                                    backgroundColor: `${themeStyles.xrayColor}10`,
                                    color: themeStyles.xrayColor
                                  }}
                                >
                                  View X-Ray Details
                                </button>
                                
                                <button
                                  className="text-xs text-white px-2 py-1 rounded flex items-center"
                                  onClick={() => {
                                    onCitationClicked(source.id);
                                  }}
                                  style={{ backgroundColor: themeStyles.xrayColor }}
                                >
                                  <ExternalLink size={12} className="mr-1" />
                                  Open Document
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                  
                  {/* Detailed view */}
                  {xrayViewMode === 'detail' && (
                    <div>
                      {/* Content type filter UI */}
                      <div className="mb-4 flex flex-wrap gap-2">
                        {(() => {
                          // Get all unique content types
                          const allTypes = new Set<string>();
                          allXrayChunks.forEach(item => {
                            if (item.chunk.contentType) {
                              item.chunk.contentType.forEach(type => allTypes.add(type));
                            }
                          });
                          
                          return Array.from(allTypes).map(type => (
                            <button
                              key={type}
                              onClick={() => setXrayContentFilter(xrayContentFilter === type ? null : type)}
                              className={`px-2 py-1 text-xs rounded-full flex items-center`}
                              style={{ 
                                backgroundColor: xrayContentFilter === type 
                                  ? themeStyles.xrayColor 
                                  : `${themeStyles.xrayColor}10`,
                                color: xrayContentFilter === type 
                                  ? 'white' 
                                  : themeStyles.xrayColor
                              }}
                            >
                              {getContentTypeIcon(type ? [type] : [])}
                              <span className="ml-1 capitalize">{type}s</span>
                            </button>
                          ));
                        })()}
                      </div>
                      
                      {/* Selected chunk detail */}
                      {activeXrayChunk && (
                        <div 
                          className="mb-4 p-3 border rounded-lg"
                          style={{ 
                            borderColor: `${themeStyles.xrayColor}50`,
                            backgroundColor: `${themeStyles.xrayColor}05`
                          }}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center">
                              {getContentTypeIcon(activeXrayChunk.contentType)}
                              <h4 
                                className="ml-2 font-medium"
                                style={{ color: themeStyles.xrayColor }}
                              >
                                {activeXrayChunk.contentType?.join(', ') || 'Text'} Chunk #{activeXrayChunk.id}
                              </h4>
                            </div>
                            <button
                              onClick={() => setActiveXrayChunk(null)}
                              className="p-1"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          
                          {/* Parsed data summary if available */}
                          {activeXrayChunk.parsedData && (activeXrayChunk.parsedData.summary || activeXrayChunk.parsedData.Summary) && (
                            <div className="mb-3">
                              <div className="text-xs font-medium mb-1" style={{ color: themeStyles.xrayColor }}>Summary from Analysis:</div>
                              <div 
                                className="p-2 rounded border text-sm"
                                style={{ 
                                  backgroundColor: themeStyles.cardBackground,
                                  borderColor: themeStyles.borderColor
                                }}
                              >
                                {activeXrayChunk.parsedData.summary || activeXrayChunk.parsedData.Summary}
                              </div>
                            </div>
                          )}
                          
                          {/* Section summary */}
                          {activeXrayChunk.sectionSummary && (
                            <div className="mb-3">
                              <div className="text-xs font-medium mb-1" style={{ color: themeStyles.xrayColor }}>Section Summary:</div>
                              <div 
                                className="p-2 rounded border text-sm"
                                style={{ 
                                  backgroundColor: themeStyles.cardBackground,
                                  borderColor: themeStyles.borderColor
                                }}
                              >
                                {activeXrayChunk.sectionSummary}
                              </div>
                            </div>
                          )}
                          
                          {/* Original text */}
                          {activeXrayChunk.text && (
                            <div className="mb-3">
                              <div className="text-xs font-medium mb-1" style={{ color: themeStyles.xrayColor }}>
                                {activeXrayChunk.originalText ? "Original JSON Data:" : "Original Text:"}
                              </div>
                              <div 
                                className="p-2 rounded border text-sm overflow-auto max-h-40"
                                style={{ 
                                  backgroundColor: themeStyles.cardBackground,
                                  borderColor: themeStyles.borderColor
                                }}
                              >
                                {activeXrayChunk.originalText || activeXrayChunk.text}
                              </div>
                            </div>
                          )}
                          
                          {/* Suggested text */}
                          {activeXrayChunk.suggestedText && activeXrayChunk.suggestedText !== activeXrayChunk.text && (
                            <div className="mb-3">
                              <div className="text-xs font-medium mb-1" style={{ color: themeStyles.xrayColor }}>Suggested Text:</div>
                              <div 
                                className="p-2 rounded border text-sm"
                                style={{ 
                                  backgroundColor: themeStyles.cardBackground,
                                  borderColor: themeStyles.borderColor
                                }}
                              >
                                {activeXrayChunk.suggestedText}
                              </div>
                            </div>
                          )}
                          
                          {/* Narrative format */}
                          {activeXrayChunk.narrative && activeXrayChunk.narrative.length > 0 && (
                            <div className="mb-3">
                              <div className="text-xs font-medium mb-1" style={{ color: themeStyles.xrayColor }}>Narrative Format:</div>
                              <div className="space-y-2">
                                {activeXrayChunk.narrative.map((narrativeText, index) => (
                                  <div 
                                    key={index}
                                    className="p-2 rounded border text-sm"
                                    style={{ 
                                      backgroundColor: themeStyles.cardBackground,
                                      borderColor: themeStyles.borderColor
                                    }}
                                  >
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                      {narrativeText || ''}
                                    </ReactMarkdown>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* JSON format - Use the enhanced renderJsonData function */}
                          {(activeXrayChunk.json || activeXrayChunk.parsedData?.data || activeXrayChunk.parsedData?.Data) && (
                            <div className="mb-3">
                              <div className="text-xs font-medium mb-1" style={{ color: themeStyles.xrayColor }}>Parsed Data:</div>
                              <div 
                                className="p-2 rounded border text-sm"
                                style={{ 
                                  backgroundColor: themeStyles.cardBackground,
                                  borderColor: themeStyles.borderColor
                                }}
                              >
                                {renderJsonData(activeXrayChunk.json || activeXrayChunk.parsedData?.data || activeXrayChunk.parsedData?.Data)}
                              </div>
                            </div>
                          )}
                          
                          {/* Additional parsed data if available */}
                          {activeXrayChunk.parsedData && Object.keys(activeXrayChunk.parsedData).length > 0 && 
                           !['summary', 'Summary', 'data', 'Data'].includes(Object.keys(activeXrayChunk.parsedData)[0]) && (
                            <div className="mb-3">
                              <div className="text-xs font-medium mb-1" style={{ color: themeStyles.xrayColor }}>Additional Metadata:</div>
                              <div 
                                className="p-2 rounded border text-sm"
                                style={{ 
                                  backgroundColor: themeStyles.cardBackground,
                                  borderColor: themeStyles.borderColor
                                }}
                              >
                                {renderJsonData(activeXrayChunk.parsedData)}
                              </div>
                            </div>
                          )}
                          
                          {/* Page references */}
                          {activeXrayChunk.pageNumbers && activeXrayChunk.pageNumbers.length > 0 && (
                            <div className="mb-3">
                              <div className="text-xs font-medium mb-1" style={{ color: themeStyles.xrayColor }}>
                                Pages: {activeXrayChunk.pageNumbers.join(', ')}
                              </div>
                            </div>
                          )}
                          
                          {/* Bounding boxes */}
                          {activeXrayChunk.boundingBoxes && activeXrayChunk.boundingBoxes.length > 0 && (
                            <div className="text-xs opacity-70">
                              This content has {activeXrayChunk.boundingBoxes.length} defined region{activeXrayChunk.boundingBoxes.length !== 1 ? 's' : ''} in the document.
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Content chunks list */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {allXrayChunks.map((item, index) => (
                          <div 
            key={`chunk-${index}`}
            className={`p-3 border rounded cursor-pointer transition-all ${
              activeXrayChunk && activeXrayChunk.id === item.chunk.id ? 'ring-2' : 'hover:shadow-sm'
            }`}
            onClick={() => setActiveXrayChunk(item.chunk)}
            style={{ 
              backgroundColor: themeStyles.cardBackground,
              borderColor: themeStyles.borderColor,
              boxShadow: activeXrayChunk && activeXrayChunk.id === item.chunk.id 
                ? `0 0 0 2px ${themeStyles.xrayColor}` 
                : 'none'
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                {getContentTypeIcon(item.chunk.contentType)}
                <span 
                  className="ml-1.5 text-sm font-medium"
                  style={{ color: themeStyles.xrayColor }}
                >
                  {item.chunk.contentType?.join(', ') || 'Text'} 
                </span>
              </div>
              <span className="text-xs opacity-60">#{item.chunk.id}</span>
            </div>
            
            {/* Source file */}
            <div className="text-xs opacity-70 mb-1 flex items-center">
              {getDocumentIcon(item.source.fileName)}
              <span className="ml-1 truncate">{item.source.fileName}</span>
            </div>
            
            {/* Display parsed data if available, otherwise show text preview */}
            {item.chunk.parsedData ? (
              <div className="text-sm mt-2 mb-1">
                <strong className="block text-xs text-gray-500 mb-1">Summary:</strong>
                <div className="line-clamp-3">
                  {item.chunk.parsedData.summary || item.chunk.parsedData.Summary || 'No summary available'}
                </div>
                
                {(item.chunk.parsedData.keywords || item.chunk.parsedData.Keywords) && (
                  <div className="mt-2">
                    <strong className="block text-xs text-gray-500 mb-1">Keywords:</strong>
                    <div className="flex flex-wrap gap-1">
                      {(item.chunk.parsedData.keywords || item.chunk.parsedData.Keywords || '')
                        .split(',')
                        .slice(0, 3)
                        .map((keyword, i) => (
                          <span 
                            key={i}
                            className="px-1.5 py-0.5 text-xs rounded-full"
                            style={{ 
                              backgroundColor: `${themeStyles.xrayColor}15`,
                              color: themeStyles.xrayColor
                            }}
                          >
                            {keyword.trim()}
                          </span>
                        ))
                      }
                      {(item.chunk.parsedData.keywords || item.chunk.parsedData.Keywords || '').split(',').length > 3 && (
                        <span className="text-xs opacity-70">+{(item.chunk.parsedData.keywords || item.chunk.parsedData.Keywords).split(',').length - 3} more</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm line-clamp-3 mt-2 mb-1">
                {item.chunk.sectionSummary || item.chunk.text?.substring(0, 150) || 'No preview available'}
                {(item.chunk.text && item.chunk.text.length > 150) ? '...' : ''}
              </div>
            )}
            
            {/* Data indicator */}
            {(item.chunk.json || item.chunk.parsedData?.data || item.chunk.parsedData?.Data) && (
              <div className="mt-2 text-xs" style={{ color: themeStyles.xrayColor }}>
                <div className="flex items-center">
                  <FileJson size={12} className="mr-1" />
                  <span>Contains structured data</span>
                </div>
              </div>
            )}
            
            {/* Page numbers */}
            {item.chunk.pageNumbers && item.chunk.pageNumbers.length > 0 && (
              <div className="mt-2 text-xs opacity-70">
                Page{item.chunk.pageNumbers.length > 1 ? 's' : ''}: {item.chunk.pageNumbers.join(', ')}
              </div>
            )}
          </div>
                        ))}
                      </div>
                      
                      {/* Empty state */}
                      {allXrayChunks.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-8 text-center">
                          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50">
                            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                            <path d="M12 12 6 6"/>
                            <path d="M12 6v6"/>
                            <path d="M21 9V3h-6"/>
                          </svg>
                          <h4 className="text-lg font-medium mb-2" style={{ color: themeStyles.xrayColor }}>No content chunks found</h4>
                          <p className="text-sm opacity-70 max-w-md">
                            {xrayContentFilter 
                              ? `No ${xrayContentFilter} content was found in the X-Ray analysis. Try selecting a different content type.`
                              : 'No X-Ray content chunks were found for this document. Try selecting a different document.'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            
            {/* Images tab */}
            {activeTab === 'images' && hasImages && (
              <motion.div
                key="images-tab"
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
                    backgroundColor: `${themeStyles.accentColor}10`, 
                    borderColor: `${themeStyles.accentColor}30` 
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 
                      className="text-lg font-medium flex items-center"
                      style={{ color: themeStyles.accentColor }}
                    >
                      <ImageIcon size={18} className="mr-2" />
                      Document Images
                    </h3>
                    
                    <div className="flex gap-2">
                      <span 
                        className="px-2 py-1 text-xs rounded-full flex items-center"
                        style={{ 
                          backgroundColor: `${themeStyles.accentColor}20`, 
                          color: themeStyles.accentColor 
                        }}
                      >
                        {allImages.length} {allImages.length === 1 ? 'Image' : 'Images'}
                      </span>
                    </div>
                  </div>
                  
                  {/* View controls */}
                  <div className="mb-4 flex gap-2">
                    <div className="rounded-md overflow-hidden border flex" 
                      style={{ borderColor: themeStyles.borderColor }}
                    >
                      <button
                        onClick={() => setImageViewMode('grid')}
                        className={`px-3 py-1 text-sm ${imageViewMode === 'grid' ? 'font-medium' : ''}`}
                        style={{
                          backgroundColor: imageViewMode === 'grid' 
                            ? `${themeStyles.accentColor}20` 
                            : 'transparent',
                          color: imageViewMode === 'grid'
                            ? themeStyles.accentColor
                            : themeStyles.textColor
                        }}
                      >
                        Grid View
                      </button>
                      <button
                        onClick={() => setImageViewMode('single')}
                        className={`px-3 py-1 text-sm ${imageViewMode === 'single' ? 'font-medium' : ''}`}
                        style={{
                          backgroundColor: imageViewMode === 'single' 
                            ? `${themeStyles.accentColor}20` 
                            : 'transparent',
                          color: imageViewMode === 'single'
                            ? themeStyles.accentColor
                            : themeStyles.textColor
                        }}
                      >
                        Document View
                      </button>
                    </div>
                    
                    <div className="rounded-md overflow-hidden border flex" 
                      style={{ borderColor: themeStyles.borderColor }}
                    >
                      <button
                        onClick={() => setImageSortBy('document')}
                        className={`px-3 py-1 text-sm ${imageSortBy === 'document' ? 'font-medium' : ''}`}
                        style={{
                          backgroundColor: imageSortBy === 'document' 
                            ? `${themeStyles.accentColor}20` 
                            : 'transparent',
                          color: imageSortBy === 'document'
                            ? themeStyles.accentColor
                            : themeStyles.textColor
                        }}
                      >
                        Sort by Document
                      </button>
                      <button
                        onClick={() => setImageSortBy('relevance')}
                        className={`px-3 py-1 text-sm ${imageSortBy === 'relevance' ? 'font-medium' : ''}`}
                        style={{
                          backgroundColor: imageSortBy === 'relevance' 
                            ? `${themeStyles.accentColor}20` 
                            : 'transparent',
                          color: imageSortBy === 'relevance'
                            ? themeStyles.accentColor
                            : themeStyles.textColor
                        }}
                      >
                        Sort by Relevance
                      </button>
                    </div>
                  </div>
                  
                  {/* Grid View */}
                  {imageViewMode === 'grid' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {allImages.map((image, index) => (
                        <div 
                          key={index}
                          onClick={() => {
                            setSelectedSourceId(image.sourceId);
                            setSelectedImageIndex(image.index);
                            setShowImageViewer(true);
                          }}
                          className="relative border rounded overflow-hidden cursor-pointer group"
                          style={{
                            aspectRatio: '3/4', 
                            borderColor: themeStyles.borderColor
                          }}
                        >
                          <img 
                            src={image.url} 
                            alt={`Page ${image.index + 1} of ${image.source.fileName}`}
                            className="w-full h-full object-cover object-top"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200">
                            <div className="absolute top-2 right-2 p-1 rounded-full bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200">
                              <ZoomIn size={16} className="text-white opacity-0 group-hover:opacity-100 transition-all duration-200" />
                            </div>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-black bg-opacity-40 text-white">
                            <div className="text-xs font-medium truncate">
                              {image.source.imageLabels?.[image.index] || `Page ${image.index + 1}`}
                            </div>
                            <div className="text-xs opacity-80 truncate">
                              {image.source.fileName}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Document View */}
                  {imageViewMode === 'single' && (
                    <div className="space-y-6">
                      {sources
                        .filter(source => source.pageImages && source.pageImages.length > 0)
                        .sort((a, b) => {
                          if (imageSortBy === 'relevance') {
                            return (b.score || 0) - (a.score || 0);
                          }
                          return 0;
                        })
                        .map((source, sourceIndex) => (
                          <div 
                            key={`source-${sourceIndex}`}
                            className="rounded-md border overflow-hidden"
                            style={{ 
                              backgroundColor: themeStyles.cardBackground, 
                              borderColor: themeStyles.borderColor
                            }}
                          >
                            <div className="p-3 border-b flex items-center justify-between" 
                              style={{ borderColor: themeStyles.borderColor }}
                            >
                              <div className="flex items-center">
                                {getDocumentIcon(source.fileName, source.type)}
                                <h4 className="ml-2 font-medium text-sm">
                                  {source.fileName}
                                </h4>
                                {source.score !== undefined && (
                                  <span 
                                    className="ml-2 px-1.5 py-0.5 text-xs rounded-full"
                                    style={{ 
                                      backgroundColor: `${themeStyles.secondaryColor}20`, 
                                      color: themeStyles.secondaryColor 
                                    }}
                                  >
                                    Score: {(source.score * 100).toFixed(1)}%
                                  </span>
                                )}
                              </div>
                              <div 
                                className="text-xs"
                                style={{ color: themeStyles.accentColor }}
                              >
                                {source.pageImages?.length} {source.pageImages?.length === 1 ? 'page' : 'pages'}
                              </div>
                            </div>
                            
                            <div className="p-4">
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {source.pageImages?.map((imageUrl, imgIndex) => (
                                  <div 
                                    key={imgIndex}
                                    onClick={() => handleImageClick(source, imgIndex)}
                                    className="relative border rounded overflow-hidden cursor-pointer group"
                                    style={{
                                      aspectRatio: '3/4', 
                                      borderColor: themeStyles.borderColor
                                    }}
                                  >
                                    <img 
                                      src={imageUrl} 
                                      alt={source.imageLabels?.[imgIndex] || `Page ${imgIndex + 1} of ${source.fileName}`}
                                      className="w-full h-full object-cover object-top"
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200" />
                                    <div className="absolute bottom-0 left-0 right-0 text-xs bg-black bg-opacity-50 text-white text-center py-1">
                                      {source.imageLabels?.[imgIndex] || `Page ${imgIndex + 1}`}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}