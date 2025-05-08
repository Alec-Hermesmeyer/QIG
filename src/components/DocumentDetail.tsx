import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink, X, FileIcon, FileText, Table, Image, List, Code, Calendar, DollarSign, BookOpen, AlertCircle, Activity, Zap, Loader, Globe } from "lucide-react";
import { getDocumentType, formatDate } from "./Answer";
import { Source, XRayChunk } from "@/types/types";

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
  defaultDocumentViewerUrl?: string; // Default URL as fallback
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
    return <FileText size={12} />;
  
  if (contentType.includes('table')) 
    return <Table size={12} />;
  
  if (contentType.includes('figure')) 
    return <Image size={12} />;
  
  if (contentType.includes('list')) 
    return <List size={12} />;
  
  if (contentType.includes('code')) 
    return <Code size={12} />;
  
  if (contentType.includes('json')) 
    return <FileIcon size={12} />;
  
  return <FileText size={12} />;
};

// Helper function to safely open URLs across browsers
const safeOpenUrl = (url: string) => {
  try {
    // First attempt - try to open in a new window
    const newWindow = window.open(url, "_blank", "noopener,noreferrer");
    
    // If opening the window failed or was blocked
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      console.log('Window.open failed, trying location.href as fallback');
      
      // Try fallback method with a slight delay
      setTimeout(() => {
        window.location.href = url;
      }, 100);
    }
  } catch (error) {
    console.error('Error opening URL:', error);
    // Last resort fallback
    window.location.href = url;
  }
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
  defaultDocumentViewerUrl = "" // Empty string default
}) => {
  // Add state for document URL and debug info
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [urlSource, setUrlSource] = useState<string>("none");
  const [localXRayLoading, setLocalXRayLoading] = useState(false);
  const isLoading = isXRayLoading || localXRayLoading;

  // Handle potentially string or number id types
  const documentId = document.id ? String(document.id) : '';
  // Handle required fileName in case it's undefined in the updated type
  const fileName = document.fileName || document.title || document.name || 'Unknown Document';
  // Handle potentially empty excerpts array in the updated type
  const excerpts = document.excerpts || [];

  // Function to extract URL from document, checking all possible locations
  const extractDocumentUrl = () => {
    // Check for all possible URL locations and case variations
    const possibleUrls = [
      // metadata variations - notice we check both lowercase and uppercase
      document.metadata?.sourceUrl,
      document.metadata?.sourceURL,
      document.metadata?.url,
      document.metadata?.URL,
      
      // direct properties on document
      document.sourceUrl,
      document.sourceURL,
      document.url,
      document.URL,
      
      // nested locations
      document.xray?.metadata?.sourceUrl,
      document.xray?.metadata?.sourceURL,
      document.result?.metadata?.sourceUrl,
      document.result?.metadata?.sourceURL,
    ];
    
    // Find first non-empty URL
    for (const url of possibleUrls) {
      if (url && typeof url === 'string') {
        console.log(`Found URL in document ${documentId}:`, url);
        return url;
      }
    }
    
    // No URL found
    console.log(`No URL found in document ${documentId}`);
    return null;
  };

  // Effect to extract the source URL when document changes
  useEffect(() => {
    const url = extractDocumentUrl();
    
    if (url) {
      setDocumentUrl(url);
      setUrlSource("document");
    } else if (defaultDocumentViewerUrl) {
      console.log('Using default URL:', defaultDocumentViewerUrl);
      setDocumentUrl(defaultDocumentViewerUrl);
      setUrlSource("default");
    } else {
      setDocumentUrl(null);
      setUrlSource("none");
    }
  }, [document, defaultDocumentViewerUrl]);

  // Function to open document in viewer
  const openDocument = () => {
    if (!documentUrl) {
      console.error('No URL available to open document:', document.id);
      alert('Sorry, no URL is available to open this document.');
      return;
    }
    
    console.log(`Opening document URL (source: ${urlSource}):`, documentUrl);
    
    // Use the safe browser-compatible open method
    safeOpenUrl(documentUrl);
  };

  // Helper function for "View in Document" button - still using onCitationClicked
  const viewInDocument = (id: string) => {
    onCitationClicked(id);
  };

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

  // Debug section - shown only in development mode
  const debugUrlSection = process.env.NODE_ENV === 'development' && (
    <div className="mt-2 mb-3 text-xs bg-yellow-50 p-2 rounded border border-yellow-200">
      <div><strong>Debug - URL source:</strong> {urlSource}</div>
      <div><strong>Document URL:</strong> {documentUrl || 'None found'}</div>
      <div className="mt-1"><strong>Document ID:</strong> {document.id}</div>
      <div><strong>Document fileName:</strong> {document.fileName || document.title || document.name}</div>
      <div className="mt-1 flex flex-col">
        <strong>URL checks:</strong>
        <span>metadata.sourceUrl: {String(Boolean(document.metadata?.sourceUrl))}</span>
        <span>metadata.sourceURL: {String(Boolean(document.metadata?.sourceURL))}</span>
        <span>document.sourceUrl: {String(Boolean(document.sourceUrl))}</span>
        <span>document.sourceURL: {String(Boolean(document.sourceURL))}</span>
      </div>
    </div>
  );

  return (
    <div
      className="border-b p-4"
      style={{ 
        borderColor: themeStyles.borderColor,
        backgroundColor: `${themeStyles.secondaryColor}10`
      }}
    >
      {/* Show debug section in development */}
      {debugUrlSection}
    
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center">
          {getDocumentIcon(fileName, document.type)}
          <h3 className="ml-2 font-medium">{fileName}</h3>
          {document.score !== undefined && (
            <span 
              className="ml-2 px-2 py-0.5 text-xs rounded-full"
              style={{ 
                backgroundColor: `${themeStyles.secondaryColor}20`,
                color: themeStyles.secondaryColor
              }}
            >
              Score: {(document.score * 100).toFixed(1)}%
            </span>
          )}
          
          {document.xray && (
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
        <button 
          onClick={() => setCurrentDocumentId(null)} 
          className="p-1"
          aria-label="Close document details"
        >
          <X size={16} />
        </button>
      </div>
      
      <div className="mb-3 text-xs opacity-70">
        Document ID: {documentId}
      </div>
      
      {/* X-Ray Analysis Button - show when X-Ray is not available */}
      {!document.xray && !isLoading && onStartXRayAnalysis && (
        <div 
          className="mb-4 p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all"
          style={{ 
            backgroundColor: `${themeStyles.xrayColor}05`,
            borderColor: `${themeStyles.xrayColor}30`
          }}
          onClick={handleStartXRayAnalysis}
          role="button"
          tabIndex={0}
          aria-label="Start X-Ray analysis for this document"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Zap 
                size={20} 
                className="mr-2" 
                style={{ color: themeStyles.xrayColor }}
              />
              <div>
                <h4 
                  className="text-sm font-medium"
                  style={{ color: themeStyles.xrayColor }}
                >
                  Start X-Ray Analysis
                </h4>
                <p className="text-xs opacity-80 mt-1">
                  Generate advanced document insights with AI, including content summaries, tables, figures, and structured data extraction
                </p>
              </div>
            </div>
            <div 
              className="rounded-full p-2"
              style={{ backgroundColor: `${themeStyles.xrayColor}15` }}
            >
              <Activity size={16} style={{ color: themeStyles.xrayColor }} />
            </div>
          </div>
        </div>
      )}

      {/* X-Ray Loading State */}
      {isLoading && (
        <div 
          className="mb-4 p-3 rounded-lg border"
          style={{ 
            backgroundColor: `${themeStyles.xrayColor}05`,
            borderColor: `${themeStyles.xrayColor}30`
          }}
        >
          <div className="flex items-center">
            <div className="animate-spin mr-3">
              <Loader size={20} style={{ color: themeStyles.xrayColor }} />
            </div>
            <div>
              <h4 
                className="text-sm font-medium"
                style={{ color: themeStyles.xrayColor }}
              >
                X-Ray Analysis in Progress
              </h4>
              <p className="text-xs opacity-80 mt-1">
                Analyzing document content and extracting insights. This may take a few moments...
              </p>
            </div>
          </div>
          <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
            <div 
              className="h-1.5 rounded-full animate-pulse" 
              style={{ 
                width: '60%', 
                backgroundColor: themeStyles.xrayColor 
              }}
            ></div>
          </div>
        </div>
      )}
      
      {/* X-Ray Summary */}
      {document.xray?.summary && (
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
            <Zap size={16} className="mr-2" />
            X-Ray Document Summary
          </h4>
          <p className="text-sm">{document.xray.summary}</p>
          
          {document.xray.keywords && (
            <div className="mt-2 flex flex-wrap gap-1">
              {document.xray.keywords.split(',').map((keyword, i) => (
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

          {/* View full X-Ray Analysis button */}
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                setActiveTab('xray');
                setActiveXrayChunk(null);
              }}
              className="text-xs px-2 py-1 rounded flex items-center"
              style={{ 
                backgroundColor: `${themeStyles.xrayColor}15`,
                color: themeStyles.xrayColor
              }}
            >
              <Activity size={12} className="mr-1" />
              View Full X-Ray Analysis
            </button>
          </div>
        </div>
      )}
      
      {/* The rest of the component remains the same */}
      
      {/* Document images if available */}
      {document.pageImages && document.pageImages.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2 flex items-center">
            <Image size={16} className="mr-2" />
            Document Pages
          </h4>
          <div className="flex flex-wrap gap-2">
            {document.pageImages.slice(0, 6).map((imageUrl, index) => (
              <div 
                key={index}
                onClick={() => handleImageClick(document, index)}
                className="relative border rounded overflow-hidden cursor-pointer group"
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
              </div>
            ))}
            
            {document.pageImages.length > 6 && (
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
                    +{document.pageImages.length - 6}
                  </span>
                  <span className="text-xs opacity-70">more pages</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* X-Ray chunks if available */}
      {document.xray?.chunks && document.xray.chunks.length > 0 && (
        <div className="mb-4">
          <h4 
            className="text-sm font-medium mb-2 flex items-center"
            style={{ color: themeStyles.xrayColor }}
          >
            <Table size={16} className="mr-2" />
            X-Ray Content Chunks
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
            {document.xray.chunks.slice(0, 4).map((chunk, index) => (
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
          
          {document.xray.chunks.length > 4 && (
            <button
              onClick={() => {
                setActiveTab('xray');
                setActiveXrayChunk(null);
              }}
              className="text-xs px-2 py-1 rounded flex items-center"
              style={{ 
                backgroundColor: `${themeStyles.xrayColor}10`,
                color: themeStyles.xrayColor
              }}
            >
              View all {document.xray.chunks.length} content chunks
            </button>
          )}
        </div>
      )}
      
      {/* Document excerpts */}
      {excerpts.length > 0 ? (
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center">
            <BookOpen size={16} className="mr-2" />
            Excerpts from {fileName}
          </h4>
          
          <div className="space-y-4">
            {excerpts.map((excerpt, i) => (
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
                
                {document.highlights && document.highlights[i] && (
                  <div 
                    className="mt-3 pt-3 text-sm rounded-md p-2" 
                    style={{ 
                      backgroundColor: `${themeStyles.primaryColor}08`,
                      borderTop: `1px dashed ${themeStyles.borderColor}`
                    }}
                  >
                    <div className="flex items-center mb-1 text-xs font-medium" style={{ color: themeStyles.primaryColor }}>
                      <Activity size={12} className="mr-1" />
                      Highlighted Match
                    </div>
                    <div className="text-sm italic ml-4" style={{ color: `${themeStyles.primaryColor}` }}>
                      "{document.highlights[i]}"
                    </div>
                  </div>
                )}
                
                {document.metadata && Object.keys(document.metadata).length > 0 && (
                  <div 
                    className="mt-3 pt-2 flex flex-wrap gap-2 text-xs" 
                    style={{ borderTop: `1px dashed ${themeStyles.borderColor}` }}
                  >
                    {document.score !== undefined && (
                      <span 
                        className="px-2 py-1 rounded-full flex items-center"
                        style={{ 
                          backgroundColor: `${themeStyles.secondaryColor}15`, 
                          color: themeStyles.secondaryColor
                        }}
                      >
                        <DollarSign size={10} className="mr-1" />
                        Relevance: {(document.score * 100).toFixed(1)}%
                      </span>
                    )}
                    
                    {document.metadata.page && (
                      <span 
                        className="px-2 py-1 rounded-full flex items-center"
                        style={{ 
                          backgroundColor: `${themeStyles.primaryColor}15`, 
                          color: themeStyles.primaryColor
                        }}
                      >
                        <BookOpen size={10} className="mr-1" />
                        Page {document.metadata.page}
                      </span>
                    )}
                    
                    {document.datePublished && (
                      <span 
                        className="px-2 py-1 rounded-full flex items-center"
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
                
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => viewInDocument(documentId)}
                    className="text-xs px-2 py-1 rounded flex items-center"
                    style={{ 
                      backgroundColor: `${themeStyles.primaryColor}10`,
                      color: themeStyles.primaryColor
                    }}
                  >
                    <ExternalLink size={12} className="mr-1" />
                    View in Document
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center p-6 rounded-lg border border-dashed text-sm italic" style={{ borderColor: themeStyles.borderColor, color: `${themeStyles.textColor}70` }}>
          <AlertCircle size={18} className="mr-2 opacity-70" />
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
        <p>{getRelevanceExplanation(document)}</p>
      </div>
      
      <div className="mt-3 flex justify-end space-x-2">
        {!document.xray && !isLoading && onStartXRayAnalysis && (
          <button
            onClick={handleStartXRayAnalysis}
            className="text-sm px-3 py-1.5 rounded flex items-center"
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
          onClick={(e) => {
            // Explicitly handle the click event
            e.preventDefault();
            setCurrentDocumentId(null);
            
            // Slight delay to ensure UI has time to update
            setTimeout(() => {
              openDocument();
            }, 50);
          }}
          className="text-white text-sm px-3 py-1.5 rounded flex items-center"
          style={{ backgroundColor: themeStyles.secondaryColor }}
          disabled={!documentUrl}
        >
          <ExternalLink size={14} className="mr-1.5" />
          View Full Document
        </button>
      </div>
    </div>
  );
};

export default DocumentDetail;