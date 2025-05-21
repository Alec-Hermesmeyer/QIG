import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  ExternalLink, X, FileIcon, FileText, Table, Image, List, Code, Calendar, 
  DollarSign, BookOpen, AlertCircle, Activity, Zap, Loader, Globe, 
  ChevronDown, ChevronUp, Tag, Info, Search, ClipboardCopy
} from "lucide-react";
import { getDocumentType, formatDate } from "./Answer";
import { Source, XRayChunk } from "@/types/types";
import { fixDecimalPointIssue } from "@/utils/scoreUtils";

interface DocumentDetailProps {
  document: Source;
  handleImageClick: (source: Source, imageIndex: number) => void;
  setCurrentDocumentId: (id: string | null) => void;
  setActiveTab: (tab: string) => void;
  setActiveXrayChunk: (chunk: XRayChunk | null) => void;
  themeStyles: any;
  getRelevanceExplanation: (source: Source) => string;
  onCitationClicked: (id: string) => void;
  // New props for X-Ray functionality
  onStartXRayAnalysis?: (documentId: string) => Promise<void>;
  isXRayLoading?: boolean;
  documentViewerUrl?: string;
  isAnalyzed: boolean; // Make the URL configurable instead of hardcoded
}

// Helper function to get document icon
const getDocumentIcon = (fileName?: string, type?: string) => {
  const docType = type || getDocumentType(fileName);
  switch (docType?.toLowerCase()) {
    case 'pdf': return <FileText className="text-red-600" size={16} />;
    case 'word': return <FileText className="text-blue-600" size={16} />;
    case 'spreadsheet': case 'csv': return <Table className="text-green-600" size={16} />;
    case 'code': case 'json': return <Code className="text-yellow-600" size={16} />;
    case 'text': case 'txt': return <FileText className="text-gray-600" size={16} />;
    case 'web': case 'html': return <Globe className="text-purple-600" size={16} />;
    case 'image': return <Image className="text-pink-600" size={16} />;
    default: return <FileIcon className="text-gray-600" size={16} />;
  }
};

// Helper function to get content type icon
const getContentTypeIcon = (contentType?: string[]) => {
  if (!contentType || contentType.length === 0) 
    return <FileText size={14} className="text-gray-600" />;
  
  if (contentType.includes('table')) 
    return <Table size={14} className="text-indigo-600" />;
  
  if (contentType.includes('figure')) 
    return <Image size={14} className="text-blue-600" />;
  
  if (contentType.includes('list')) 
    return <List size={14} className="text-green-600" />;
  
  if (contentType.includes('code')) 
    return <Code size={14} className="text-yellow-600" />;
  
  if (contentType.includes('json')) 
    return <FileIcon size={14} className="text-orange-600" />;
  
  return <FileText size={14} className="text-gray-600" />;
};

// Add type for section names
type SectionName = 'summary' | 'excerpts' | 'images' | 'xrayChunks' | 'relevance';

// Add type for score
type Score = number | undefined;

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

// Helper function to format score display
const formatScoreDisplay = (score: Score): string => {
  if (score === undefined) return 'N/A';
  return score.toFixed(2);
};

const DocumentDetail: React.FC<DocumentDetailProps> = ({
  document,
  handleImageClick,
  setCurrentDocumentId,
  setActiveTab,
  setActiveXrayChunk,
  themeStyles,
  getRelevanceExplanation,
  onCitationClicked,
  onStartXRayAnalysis,
  isXRayLoading = false,
  documentViewerUrl = "https://upload.groundx.ai/file/a03c889a-fa9f-4864-bcd3-30c7a596156c/75b005ca-0b3b-4960-a856-b2eda367f2fc.pdf",
  isAnalyzed = false
}) => {
  // Add logging for debugging
  useEffect(() => {
    console.log("DocumentDetail mounted with document:", document);
    
    // Simple debugging without optional chaining on document properties
    if (!document) {
      console.error("No document provided to DocumentDetail");
    } else {
      if (!document.id) {
        console.error("Document missing ID");
      }
      
      if (!document.excerpts || document.excerpts.length === 0) {
        console.warn("Document has no excerpts");
      }
      
      // Log essential properties with safer access
      console.log("Document essential properties:", {
        id: document.id || 'missing',
        fileName: document.fileName || document.title || document.name || 'unnamed',
        hasText: !!document.text,
        hasContent: !!document.content,
        excerptCount: document.excerpts ? document.excerpts.length : 0,
        hasXray: !!document.xray
      });
    }
  }, [document]);

  // Handle potentially string or number id types
  const documentId = document?.id ? String(document.id) : '';
  // Handle required fileName in case it's undefined in the updated type
  const fileName = document?.fileName || document?.title || document?.name || 'Unknown Document';
  // Handle potentially empty excerpts array in the updated type
  const excerpts = document?.excerpts || [];

  // Fix the score using our utility function
  const correctedScore = document?.score !== undefined ? fixDecimalPointIssue(document.score) : undefined;

  // Function to open document in viewer - check multiple possible URL properties
  const openDocument = () => {
    // Try to find a URL from the document object, checking multiple possible property names
    const documentUrl = document?.sourceUrl || 
                       document?.url || 
                       documentViewerUrl;
    
    console.log("Opening document URL:", documentUrl);
    
    if (documentUrl) {
      window.open(documentUrl, "_blank", "noopener,noreferrer");
    } else {
      console.error("No source URL available for document:", documentId);
    }
  };

  // Helper function for "View in Document" button
  const viewInDocument = (id: string) => {
    if (onCitationClicked) {
      onCitationClicked(id);
    }
  };

  // If no document is provided, show a message
  if (!document) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">No document selected</p>
      </div>
    );
  }

  // Local loading state for better UX
  const [localXRayLoading, setLocalXRayLoading] = useState(false);
  const isLoading = isXRayLoading || localXRayLoading;
  
  // State for expandable sections
  const [expandedSections, setExpandedSections] = useState<Record<SectionName, boolean>>({
    summary: true,
    excerpts: true,
    images: true,
    xrayChunks: true,
    relevance: true
  });

  // Toggle expanded sections
  const toggleSection = (section: SectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Safely access metadata
  const metadata = document?.metadata || {};
  const metadataUrl = (metadata && typeof metadata === 'object' && 'url' in metadata) ? (metadata as { url?: string }).url : undefined;

  // Function to handle X-Ray analysis start
  const handleStartXRayAnalysis = async () => {
    if (!onStartXRayAnalysis || !documentId || isLoading) return;
    
    try {
      setLocalXRayLoading(true);
      await onStartXRayAnalysis(documentId);
      // The parent component will handle updating the document with new X-Ray data
    } catch (error) {
      console.error("Error starting X-Ray analysis:", error);
    } finally {
      setLocalXRayLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl shadow-sm overflow-hidden bg-white border"
      style={{ borderColor: themeStyles.borderColor }}
    >
      {/* Header with document information */}
      <div 
        className="p-4 border-b flex items-center justify-between"
        style={{ 
          background: `linear-gradient(to right, ${themeStyles.secondaryColor}10, ${themeStyles.secondaryColor}05)`,
          borderColor: themeStyles.borderColor
        }}
      >
        <div className="flex items-center">
          <div
            className="p-2 rounded-lg mr-3 flex items-center justify-center"
            style={{ 
              backgroundColor: `${themeStyles.secondaryColor}15`,
              color: themeStyles.secondaryColor
            }}
          >
            {getDocumentIcon(fileName, document.type)}
          </div>
          
          <div>
            <h2 className="text-lg font-bold">{fileName}</h2>
            <div className="flex items-center gap-2 mt-1">
              {document.score !== undefined && (
                <span 
                  className="px-2 py-0.5 text-xs rounded-full flex items-center"
                  style={{ 
                    backgroundColor: `${themeStyles.secondaryColor}15`,
                    color: themeStyles.secondaryColor
                  }}
                >
                  <DollarSign size={10} className="mr-1" />
                  Relevance: {formatScoreDisplay(document.score)}
                </span>
              )}
              
              {document.xray && (
                <span 
                  className="px-2 py-0.5 text-xs rounded-full flex items-center"
                  style={{ 
                    backgroundColor: `${themeStyles.xrayColor}15`,
                    color: themeStyles.xrayColor
                  }}
                >
                  <Zap size={10} className="mr-1" />
                  X-Ray Analyzed
                </span>
              )}
              
              <span className="text-xs text-gray-500">
                ID: {documentId}
              </span>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => setCurrentDocumentId(null)} 
          className="p-1.5 rounded-full hover:bg-gray-100"
          aria-label="Close document details"
        >
          <X size={16} />
        </button>
      </div>
      
      <div className="p-4">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          {/* X-Ray Analysis Button - show when X-Ray is not available */}
          {!document.xray && !isLoading && onStartXRayAnalysis && (
            <motion.div
              variants={itemVariants}
              className="rounded-lg border shadow-sm overflow-visible"
              style={{ borderColor: themeStyles.borderColor }}
            >
              <div 
                className="p-4 cursor-pointer transition-all hover:shadow-md flex items-center justify-between"
                style={{ backgroundColor: `${themeStyles.xrayColor}05` }}
                onClick={handleStartXRayAnalysis}
                role="button"
                tabIndex={0}
                aria-label="Start X-Ray analysis for this document"
              >
                <div className="flex items-center">
                  <div 
                    className="p-2 rounded-lg mr-3 flex items-center justify-center"
                    style={{ 
                      backgroundColor: `${themeStyles.xrayColor}15`,
                      color: themeStyles.xrayColor
                    }}
                  >
                    <Zap size={20} />
                  </div>
                  <div>
                    <h3 
                      className="text-base font-medium"
                      style={{ color: themeStyles.xrayColor }}
                    >
                      Start X-Ray Analysis
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Generate advanced document insights with AI, including content summaries, tables, figures, and structured data extraction
                    </p>
                  </div>
                </div>
                <Activity size={18} style={{ color: themeStyles.xrayColor }} />
              </div>
            </motion.div>
          )}

          {/* X-Ray Loading State */}
          {isLoading && (
            <motion.div
              variants={itemVariants}
              className="rounded-lg border shadow-sm overflow-hidden"
              style={{ borderColor: `${themeStyles.xrayColor}40` }}
            >
              <div 
                className="p-4"
                style={{ backgroundColor: `${themeStyles.xrayColor}05` }}
              >
                <div className="flex items-center">
                  <div className="animate-spin mr-3">
                    <Loader size={20} style={{ color: themeStyles.xrayColor }} />
                  </div>
                  <div>
                    <h3 
                      className="text-base font-medium"
                      style={{ color: themeStyles.xrayColor }}
                    >
                      X-Ray Analysis in Progress
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Analyzing document content and extracting insights. This may take a few moments...
                    </p>
                  </div>
                </div>
                <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="h-1.5 rounded-full animate-pulse" 
                    style={{ 
                      width: '60%', 
                      backgroundColor: themeStyles.xrayColor 
                    }}
                  ></div>
                </div>
              </div>
            </motion.div>
          )}
          
          {/* X-Ray Summary */}
          {document.xray?.summary && (
            <motion.div
              variants={itemVariants}
              className="rounded-lg border shadow-sm overflow-hidden"
              style={{ borderColor: themeStyles.borderColor }}
            >
              <div 
                className="p-3 border-b flex items-center justify-between cursor-pointer"
                style={{ 
                  background: `linear-gradient(to right, ${themeStyles.xrayColor}10, ${themeStyles.xrayColor}05)`,
                  borderColor: themeStyles.borderColor 
                }}
                onClick={() => toggleSection('summary')}
              >
                <div className="flex items-center">
                  <div 
                    className="p-1.5 rounded-full mr-2"
                    style={{ backgroundColor: `${themeStyles.xrayColor}15` }}
                  >
                    <Zap size={16} style={{ color: themeStyles.xrayColor }} />
                  </div>
                  <h3 className="font-medium" style={{ color: themeStyles.xrayColor }}>
                    X-Ray Document Summary
                  </h3>
                </div>
                
                {expandedSections.summary ? 
                  <ChevronUp size={18} className="text-gray-400" /> : 
                  <ChevronDown size={18} className="text-gray-400" />
                }
              </div>
              
              <AnimatePresence>
                {expandedSections.summary && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-4"
                  >
                    <p className="text-sm mb-3">{document.xray.summary}</p>
                    
                    {document.xray.keywords && (
                      <div className="mb-3">
                        <div className="text-xs font-medium mb-2 flex items-center" style={{ color: themeStyles.xrayColor }}>
                          <Tag size={12} className="mr-1.5" />
                          Keywords
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {document.xray.keywords.split(',').map((keyword, i) => (
                            <span 
                              key={i}
                              className="px-2 py-0.5 text-xs rounded-full flex items-center"
                              style={{ 
                                backgroundColor: `${themeStyles.xrayColor}10`,
                                color: themeStyles.xrayColor
                              }}
                            >
                              <Tag size={10} className="mr-1" />
                              {keyword.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          setActiveTab('xray');
                          setActiveXrayChunk(null);
                        }}
                        className="text-xs px-3 py-1.5 rounded flex items-center"
                        style={{ 
                          backgroundColor: `${themeStyles.xrayColor}15`,
                          color: themeStyles.xrayColor
                        }}
                      >
                        <Activity size={12} className="mr-1.5" />
                        View Full X-Ray Analysis
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
          
          {/* Document images */}
          {document.pageImages && document.pageImages.length > 0 && (
            <motion.div
              variants={itemVariants}
              className="rounded-lg border shadow-sm overflow-hidden"
              style={{ borderColor: themeStyles.borderColor }}
            >
              <div 
                className="p-3 border-b flex items-center justify-between cursor-pointer"
                style={{ borderColor: themeStyles.borderColor }}
                onClick={() => toggleSection('images')}
              >
                <div className="flex items-center">
                  <div 
                    className="p-1.5 rounded-full mr-2"
                    style={{ backgroundColor: `${themeStyles.secondaryColor}15` }}
                  >
                    <Image size={16} style={{ color: themeStyles.secondaryColor }} />
                  </div>
                  <h3 className="font-medium" style={{ color: themeStyles.secondaryColor }}>
                    Document Pages
                  </h3>
                </div>
                
                {expandedSections.images ? 
                  <ChevronUp size={18} className="text-gray-400" /> : 
                  <ChevronDown size={18} className="text-gray-400" />
                }
              </div>
              
              <AnimatePresence>
                {expandedSections.images && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-4"
                  >
                    <div className="flex flex-wrap gap-2">
                      {document.pageImages.slice(0, 6).map((imageUrl, index) => (
                        <motion.div 
                          key={index}
                          whileHover={{ y: -3, boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}
                          onClick={() => handleImageClick(document, index)}
                          className="relative border rounded-lg overflow-hidden cursor-pointer group"
                          style={{
                            width: '100px', 
                            height: '120px',
                            borderColor: themeStyles.borderColor
                          }}
                        >
                          <img 
                            src={imageUrl} 
                            alt={document.imageLabels?.[index] || `Page ${index + 1}`}
                            className="w-full h-full object-cover object-top"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200" />
                          <div className="absolute bottom-0 left-0 right-0 text-xs bg-black bg-opacity-50 text-white text-center py-1">
                            {document.imageLabels?.[index] || `Page ${index + 1}`}
                          </div>
                        </motion.div>
                      ))}
                      
                      {document.pageImages.length > 6 && (
                        <motion.div 
                          whileHover={{ y: -3, boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}
                          className="relative border rounded-lg overflow-hidden cursor-pointer flex items-center justify-center"
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
                              +{document.pageImages.length - 6}
                            </span>
                            <span className="text-xs opacity-70">more pages</span>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
          
          {/* X-Ray chunks */}
          {document.xray?.chunks && document.xray.chunks.length > 0 && (
            <motion.div
              variants={itemVariants}
              className="rounded-lg border shadow-sm overflow-hidden"
              style={{ borderColor: themeStyles.borderColor }}
            >
              <div 
                className="p-3 border-b flex items-center justify-between cursor-pointer"
                style={{ 
                  background: `linear-gradient(to right, ${themeStyles.xrayColor}10, ${themeStyles.xrayColor}05)`,
                  borderColor: themeStyles.borderColor 
                }}
                onClick={() => toggleSection('xrayChunks')}
              >
                <div className="flex items-center">
                  <div 
                    className="p-1.5 rounded-full mr-2"
                    style={{ backgroundColor: `${themeStyles.xrayColor}15` }}
                  >
                    <Table size={16} style={{ color: themeStyles.xrayColor }} />
                  </div>
                  <h3 className="font-medium" style={{ color: themeStyles.xrayColor }}>
                    X-Ray Content Chunks 
                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-white">
                      {document.xray.chunks.length}
                    </span>
                  </h3>
                </div>
                
                {expandedSections.xrayChunks ? 
                  <ChevronUp size={18} className="text-gray-400" /> : 
                  <ChevronDown size={18} className="text-gray-400" />
                }
              </div>
              
              <AnimatePresence>
                {expandedSections.xrayChunks && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                      {document.xray.chunks.slice(0, 4).map((chunk, index) => (
                        <motion.div 
                          key={index}
                          whileHover={{ y: -2, boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)' }}
                          className="p-3 border rounded-lg cursor-pointer"
                          onClick={() => {
                            setActiveTab('xray');
                            setActiveXrayChunk(chunk);
                          }}
                          style={{ 
                            borderColor: themeStyles.borderColor,
                            backgroundColor: `${themeStyles.cardBackground}`
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center">
                              <div 
                                className="p-1 rounded-md mr-1.5"
                                style={{ backgroundColor: `${themeStyles.xrayColor}10` }}
                              >
                                {getContentTypeIcon(chunk.contentType)}
                              </div>
                              <span 
                                className="text-sm font-medium"
                                style={{ color: themeStyles.xrayColor }}
                              >
                                {chunk.contentType?.join(', ') || 'Text'} 
                              </span>
                            </div>
                            <span 
                              className="px-1.5 py-0.5 text-xs rounded-full"
                              style={{ 
                                backgroundColor: `${themeStyles.xrayColor}10`,
                                color: themeStyles.xrayColor 
                              }}
                            >
                              #{chunk.id}
                            </span>
                          </div>
                          
                          <div className="text-sm line-clamp-2 mt-2">
                            {chunk.parsedData?.summary || chunk.parsedData?.Summary || 
                             chunk.sectionSummary || chunk.text?.substring(0, 120) || 'No preview available'}
                            {(!chunk.parsedData?.summary && !chunk.parsedData?.Summary && 
                              !chunk.sectionSummary && chunk.text && chunk.text.length > 120) ? '...' : ''}
                          </div>
                          
                          {chunk.pageNumbers && chunk.pageNumbers.length > 0 && (
                            <div className="mt-2 text-xs text-gray-500 flex items-center">
                              <BookOpen size={10} className="mr-1" />
                              Page{chunk.pageNumbers.length > 1 ? 's' : ''}: {chunk.pageNumbers.join(', ')}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                    
                    {document.xray.chunks.length > 4 && (
                      <div className="flex justify-center">
                        <button
                          onClick={() => {
                            setActiveTab('xray');
                            setActiveXrayChunk(null);
                          }}
                          className="text-sm px-3 py-1.5 rounded flex items-center"
                          style={{ 
                            backgroundColor: `${themeStyles.xrayColor}15`,
                            color: themeStyles.xrayColor
                          }}
                        >
                          <Table size={14} className="mr-1.5" />
                          View all {document.xray.chunks.length} content chunks
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
          
          {/* Document excerpts */}
          {excerpts.length > 0 && (
            <motion.div
              variants={itemVariants}
              className="rounded-lg border shadow-sm overflow-hidden"
              style={{ borderColor: themeStyles.borderColor }}
            >
              <div 
                className="p-3 border-b flex items-center justify-between cursor-pointer"
                style={{ 
                  background: `linear-gradient(to right, ${themeStyles.primaryColor}10, ${themeStyles.primaryColor}05)`,
                  borderColor: themeStyles.borderColor 
                }}
                onClick={() => toggleSection('excerpts')}
              >
                <div className="flex items-center">
                  <div 
                    className="p-1.5 rounded-full mr-2"
                    style={{ backgroundColor: `${themeStyles.primaryColor}15` }}
                  >
                    <BookOpen size={16} style={{ color: themeStyles.primaryColor }} />
                  </div>
                  <h3 className="font-medium" style={{ color: themeStyles.primaryColor }}>
                    Key Excerpts 
                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-white">
                      {excerpts.length}
                    </span>
                  </h3>
                </div>
                
                <div className="flex items-center">
                  <span className="text-xs mr-2 text-gray-500">Most relevant content from document</span>
                  {expandedSections.excerpts ? 
                    <ChevronUp size={18} className="text-gray-400" /> : 
                    <ChevronDown size={18} className="text-gray-400" />
                  }
                </div>
              </div>
              
              <AnimatePresence>
                {expandedSections.excerpts && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="p-4"
                  >
                    {/* Search/filter input for longer excerpt lists */}
                    {excerpts.length > 3 && (
                      <div className="relative mb-4">
                        <input
                          type="text"
                          placeholder="Search within excerpts..."
                          className="w-full px-3 py-2 pl-8 text-sm border rounded-lg"
                          style={{ borderColor: themeStyles.borderColor }}
                        />
                        <Search 
                          size={14} 
                          className="absolute left-2.5 top-2.5 text-gray-400" 
                        />
                      </div>
                    )}
                    
                    {/* Excerpt timeline */}
                    {document.metadata && document.metadata.page && (
                      <div 
                        className="mb-4 p-2 rounded-lg border" 
                        style={{ 
                          borderColor: `${themeStyles.borderColor}`,
                          backgroundColor: `${themeStyles.cardBackground}`
                        }}
                      >
                        <div className="text-xs font-medium mb-2">Document Position</div>
                        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden flex">
                          {excerpts.map((excerpt, i) => {
                            // Calculate position - if page info is available, use it; otherwise evenly space them
                            const position = document.metadata && document.metadata.pages && document.metadata.pages[i] 
                              ? (document.metadata.pages[i] / document.metadata.totalPages * 100) 
                              : ((i + 1) / (excerpts.length + 1) * 100);
                            
                            return (
                              <div 
                                key={i}
                                className="absolute w-3 h-3 rounded-full z-10 transform -translate-x-1/2 -translate-y-1/4 cursor-pointer"
                                style={{
                                  left: `${position}%`,
                                  backgroundColor: themeStyles.primaryColor,
                                  boxShadow: `0 0 0 2px white`
                                }}
                                title={`Excerpt ${i+1}${document.metadata.pages && document.metadata.pages[i] ? ` - Page ${document.metadata.pages[i]}` : ''}`}
                              />
                            );
                          })}
                          <div 
                            className="h-full rounded-full"
                            style={{ 
                              width: '100%', 
                              backgroundImage: `linear-gradient(to right, ${themeStyles.secondaryColor}30, ${themeStyles.primaryColor}60)` 
                            }}
                          ></div>
                        </div>
                      </div>
                    )}
                  
                    <div className="space-y-4">
                      {excerpts.map((excerpt, i) => {
                        // Process paragraph breaks for better readability
                        // Use a regex that preserves periods and handles multiple text patterns
                        let paragraphs = [];
                        try {
                          // First try splitting by periods followed by spaces
                          const tempParagraphs = excerpt.split(/(?<=\. )/).filter(p => p.trim().length > 0);
                          // If that didn't work well (only one very long paragraph), try alternative approaches
                          if (tempParagraphs.length <= 1 && excerpt.length > 200) {
                            if (excerpt.includes("\n\n")) {
                              paragraphs = excerpt.split("\n\n").filter(p => p.trim().length > 0);
                            } else if (excerpt.includes("\n")) {
                              paragraphs = excerpt.split("\n").filter(p => p.trim().length > 0);
                            } else {
                              paragraphs = [];
                              let current = "";
                              const sentences = excerpt.split(/(?<=\. )/);
                              for (let sentence of sentences) {
                                if (current.length + sentence.length > 150 && current.length > 0) {
                                  paragraphs.push(current.trim());
                                  current = sentence;
                                } else {
                                  current += sentence;
                                }
                              }
                              if (current.length > 0) {
                                paragraphs.push(current.trim());
                              }
                            }
                          } else {
                            paragraphs = tempParagraphs;
                          }
                        } catch (e) {
                          paragraphs = [excerpt];
                        }
                        return (
                          <motion.div key={i} variants={itemVariants} className="rounded-lg border shadow-sm overflow-hidden" style={{ borderColor: themeStyles.borderColor }}>
                            {/* Top bar with excerpt number and metadata */}
                            <div 
                              className="p-2 border-b flex items-center justify-between"
                              style={{ 
                                backgroundColor: `${themeStyles.primaryColor}08`,
                                borderColor: themeStyles.borderColor
                              }}
                            >
                              <div className="flex items-center">
                                <div 
                                  className="text-xs font-medium px-2 py-0.5 rounded-md mr-2 flex items-center"
                                  style={{ 
                                    backgroundColor: `${themeStyles.primaryColor}15`,
                                    color: themeStyles.primaryColor
                                  }}
                                >
                                  <FileText size={10} className="mr-1" />
                                  Excerpt {i+1}
                                </div>
                                
                                {document.metadata && (
                                  <div className="flex gap-2">
                                    {document.metadata.page && (
                                      <span 
                                        className="text-xs px-2 py-0.5 rounded-md flex items-center"
                                        style={{ 
                                          backgroundColor: `${themeStyles.textColor}10`,
                                          color: themeStyles.textColor
                                        }}
                                      >
                                        <BookOpen size={10} className="mr-1" />
                                        {document.metadata.pages && document.metadata.pages[i] 
                                          ? `Page ${document.metadata.pages[i]}` 
                                          : document.metadata.page 
                                            ? `Page ${document.metadata.page}` 
                                            : "Unknown page"}
                                      </span>
                                    )}
                                    
                                    {document.datePublished && (
                                      <span 
                                        className="text-xs px-2 py-0.5 rounded-md flex items-center"
                                        style={{ 
                                          backgroundColor: `${themeStyles.textColor}10`,
                                          color: themeStyles.textColor
                                        }}
                                      >
                                        <Calendar size={10} className="mr-1" />
                                        {formatDate(document.datePublished)}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Excerpt content */}
                            <div className="p-3 w-full">
                              <div 
                                className="prose prose-sm w-full max-w-none break-words whitespace-normal overflow-visible" 
                                style={{ 
                                  color: themeStyles.textColor,
                                  wordBreak: "break-word",
                                  overflowWrap: "break-word",
                                  hyphens: "auto"
                                }}
                              >
                                {/* Show each paragraph with proper spacing */}
                                {paragraphs.length > 0 ? (
                                  paragraphs.map((paragraph, pIndex) => (
                                    <p key={pIndex} className="mb-2 last:mb-0 whitespace-normal overflow-visible w-full">
                                      {paragraph.trim()}
                                    </p>
                                  ))
                                ) : (
                                  // Fallback if no paragraphs were detected
                                  <p className="whitespace-normal overflow-visible w-full">
                                    {excerpt}
                                  </p>
                                )}
                              </div>
                              
                              {/* Highlighted match */}
                              {document.highlights && document.highlights[i] && (
                                <div 
                                  className="mt-3 rounded-md p-3" 
                                  style={{ 
                                    backgroundColor: `${themeStyles.primaryColor}08`,
                                    borderLeft: `3px solid ${themeStyles.primaryColor}`
                                  }}
                                >
                                  <div className="flex items-center mb-1 text-xs font-medium" style={{ color: themeStyles.primaryColor }}>
                                    <Activity size={12} className="mr-1" />
                                    Key Match
                                  </div>
                                  <div className="text-sm ml-2" style={{ color: `${themeStyles.primaryColor}` }}>
                                    "{document.highlights[i]}"
                                  </div>
                                </div>
                              )}
                              
                              {/* Action buttons */}
                              <div className="mt-3 flex items-center justify-between">
                                <div className="flex gap-2">
                                  <button
                                    className="text-xs px-2 py-0.5 rounded flex items-center text-gray-500 hover:text-gray-700"
                                    onClick={() => navigator.clipboard.writeText(excerpt)}
                                  >
                                    <ClipboardCopy size={12} className="mr-1" />
                                    Copy
                                  </button>
                                  
                                  {document.xray?.chunks && (
                                    <button
                                      className="text-xs px-2 py-0.5 rounded flex items-center"
                                      style={{ color: themeStyles.xrayColor }}
                                      onClick={() => {
                                        setActiveTab('xray');
                                        // Would need logic to find the matching xray chunk
                                      }}
                                    >
                                      <Zap size={12} className="mr-1" />
                                      View X-Ray
                                    </button>
                                  )}
                                </div>
                                
                                <button
                                  onClick={() => viewInDocument(documentId)}
                                  className="text-xs px-2.5 py-1 rounded-md flex items-center shadow-sm hover:shadow transition-shadow"
                                  style={{ 
                                    backgroundColor: themeStyles.primaryColor,
                                    color: 'white'
                                  }}
                                >
                                  <ExternalLink size={12} className="mr-1.5" />
                                  View in Document
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
          
          {/* No excerpts message */}
          {excerpts.length === 0 && (
            <motion.div
              variants={itemVariants}
              className="flex items-center justify-center p-6 rounded-lg border border-dashed"
              style={{ borderColor: themeStyles.borderColor }}
            >
              <Info size={18} className="mr-2 text-gray-400" />
              <span className="text-sm text-gray-500">No excerpts available for this document</span>
            </motion.div>
          )}
          
          {/* Relevance explanation */}
          <motion.div
            variants={itemVariants}
            className="rounded-lg border shadow-sm overflow-hidden"
            style={{ borderColor: themeStyles.borderColor }}
          >
            <div 
              className="p-3 border-b flex items-center justify-between cursor-pointer"
              style={{ 
                background: `linear-gradient(to right, ${themeStyles.primaryColor}10, ${themeStyles.primaryColor}05)`,
                borderColor: themeStyles.borderColor 
              }}
              onClick={() => toggleSection('relevance')}
            >
              <div className="flex items-center">
                <div 
                  className="p-1.5 rounded-full mr-2"
                  style={{ backgroundColor: `${themeStyles.primaryColor}15` }}
                >
                  <Info size={16} style={{ color: themeStyles.primaryColor }} />
                </div>
                <h3 className="font-medium" style={{ color: themeStyles.primaryColor }}>
                  Why This Document is Relevant
                </h3>
              </div>
              
              {expandedSections.relevance ? 
                <ChevronUp size={18} className="text-gray-400" /> : 
                <ChevronDown size={18} className="text-gray-400" />
              }
            </div>
            
            <AnimatePresence>
              {expandedSections.relevance && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="p-4"
                >
                  <p className="text-sm">{getRelevanceExplanation(document)}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
        
        {/* Bottom action buttons */}
        <div className="mt-4 flex justify-end space-x-3">
          {!document.xray && !isLoading && onStartXRayAnalysis && (
            <button
              onClick={handleStartXRayAnalysis}
              className="text-sm px-3 py-1.5 rounded-md flex items-center shadow-sm transition-shadow hover:shadow"
              style={{ 
                backgroundColor: `${themeStyles.xrayColor}15`,
                color: themeStyles.xrayColor
              }}
              disabled={isLoading}
            >
              <Zap size={14} className="mr-1.5" />
              {isLoading ? 'Analyzing...' : 'Analyze with X-Ray'}
            </button>
          )}
          
          <button
            onClick={() => {
              setCurrentDocumentId(null);
              openDocument();
            }}
            className="text-white text-sm px-3 py-1.5 rounded-md flex items-center shadow-sm transition-shadow hover:shadow"
            style={{ backgroundColor: themeStyles.secondaryColor }}
          >
            <ExternalLink size={14} className="mr-1.5" />
            View Full Document
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default DocumentDetail;