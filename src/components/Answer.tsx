'use client';

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Database, Lightbulb, MessageSquare, ImageIcon } from "lucide-react";

// Import our custom components
import AnswerHeader from "./AnswerHeader";
import DocumentDetail from "./DocumentDetail";
import ImageViewer from "./ImageViewer";
import XRayAnalysis from "./XRayAnalysis";

// Import types
import { Source, XRayChunk, EnhancedAnswerProps } from "@/types/types";

// Helper utilities
export const formatDate = (dateString?: string) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) { return dateString; }
};

export const getDocumentName = (path?: string) => (!path) ? 'Unknown Document' : path.split('/').pop() || path;

export const getDocumentType = (fileName?: string) => {
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
      <AnswerHeader 
        expanded={expanded}
        setExpanded={setExpanded}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCopied={isCopied}
        hasThoughts={hasThoughts}
        hasSources={hasSources}
        hasXray={hasXray}
        hasImages={hasImages}
        handleCopyToClipboard={handleCopyToClipboard}
        onThoughtProcessClicked={onThoughtProcessClicked}
        onSupportingContentClicked={onSupportingContentClicked}
        onRefreshClicked={onRefreshClicked}
        themeStyles={themeStyles}
      />
      
      {/* Document detail view */}
      {currentDocument && (
        <DocumentDetail
          document={currentDocument}
          handleImageClick={handleImageClick}
          setCurrentDocumentId={setCurrentDocumentId}
          setActiveTab={setActiveTab}
          setActiveXrayChunk={setActiveXrayChunk}
          themeStyles={themeStyles}
          getRelevanceExplanation={getRelevanceExplanation}
          onCitationClicked={onCitationClicked}
        />
      )}
      
      {/* Image Viewer Modal */}
      <ImageViewer
        showImageViewer={showImageViewer}
        setShowImageViewer={setShowImageViewer}
        imageViewerRef={imageViewerRef}
        sources={sources}
        selectedSourceId={selectedSourceId}
        selectedImageIndex={selectedImageIndex}
        navigateImage={navigateImage}
        themeStyles={themeStyles}
      />
      
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
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
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
              <XRayAnalysis
                xrayViewMode={xrayViewMode}
                setXrayViewMode={setXrayViewMode}
                xrayContentFilter={xrayContentFilter}
                setXrayContentFilter={setXrayContentFilter}
                activeXrayChunk={activeXrayChunk}
                setActiveXrayChunk={setActiveXrayChunk}
                selectedSourceId={selectedSourceId}
                setSelectedSourceId={setSelectedSourceId}
                sources={sources}
                allXrayChunks={allXrayChunks}
                onCitationClicked={onCitationClicked}
                themeStyles={themeStyles}
              />
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
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-100 transition-all duration-200">
                                <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 0 0 1.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 0 0-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 0 0 5.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14z"></path>
                                <path d="M9.5 9.5v3M11 11H8"></path>
                              </svg>
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