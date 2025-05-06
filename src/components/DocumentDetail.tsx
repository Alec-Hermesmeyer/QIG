import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink, X } from "lucide-react";
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
}

// Helper function to get document icon
const getDocumentIcon = (fileName?: string, type?: string) => {
  const docType = type || getDocumentType(fileName);
  switch (docType?.toLowerCase()) {
    case 'pdf': return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>;
    case 'word': return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>;
    case 'spreadsheet': case 'csv': return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="12" x2="16" y2="12"></line><line x1="8" y1="16" x2="16" y2="16"></line></svg>;
    case 'code': case 'json': return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-600"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>;
    case 'text': case 'txt': return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line><line x1="8" y1="9" x2="9" y2="9"></line></svg>;
    case 'web': case 'html': return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-600"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>;
    case 'image': return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-600"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>;
    default: return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>;
  }
};

// Helper function to get content type icon
const getContentTypeIcon = (contentType?: string[]) => {
  if (!contentType || contentType.length === 0) 
    return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="4" x2="3" y2="4"></line><line x1="21" y1="12" x2="9" y2="12"></line><line x1="21" y1="20" x2="3" y2="20"></line></svg>;
  
  if (contentType.includes('table')) 
    return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>;
  
  if (contentType.includes('figure')) 
    return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>;
  
  if (contentType.includes('list')) 
    return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>;
  
  if (contentType.includes('code')) 
    return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>;
  
  if (contentType.includes('json')) 
    return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><path d="M10.3 10.18a1.2 1.2 0 0 0-1.6 1.72L10 13.36a1.2 1.2 0 1 0 2.05-1.23L10.73 11"></path><path d="M15.5 15.18a1.2 1.2 0 1 0-1.6 1.72l1.3 1.46a1.2 1.2 0 0 0 2.05-1.23l-1.32-1.13"></path></svg>;
  
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="4" x2="3" y2="4"></line><line x1="21" y1="12" x2="9" y2="12"></line><line x1="21" y1="20" x2="3" y2="20"></line></svg>;
};

const DocumentDetail: React.FC<DocumentDetailProps> = ({
  document,
  handleImageClick,
  setCurrentDocumentId,
  setActiveTab,
  setActiveXrayChunk,
  themeStyles,
  getRelevanceExplanation,
  onCitationClicked
}) => {
  // Handle potentially string or number id types
  const documentId = document.id ? String(document.id) : '';
  // Handle required fileName in case it's undefined in the updated type
  const fileName = document.fileName || document.title || document.name || 'Unknown Document';
  // Handle potentially empty excerpts array in the updated type
  const excerpts = document.excerpts || [];

  return (
    <div
      className="border-b p-4"
      style={{ 
        borderColor: themeStyles.borderColor,
        backgroundColor: `${themeStyles.secondaryColor}10`
      }}
    >
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
        <button onClick={() => setCurrentDocumentId(null)} className="p-1">
          <X size={16} />
        </button>
      </div>
      
      <div className="mb-3 text-xs opacity-70">
        Document ID: {documentId}
      </div>
      
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              <path d="M12 12 6 6"/>
              <path d="M12 6v6"/>
              <path d="M21 9V3h-6"/>
            </svg>
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
        </div>
      )}
      
      {/* Document images if available */}
      {document.pageImages && document.pageImages.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Document Pages:</h4>
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
              className="text-xs px-2 py-1 rounded"
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
            <span className="mr-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </span>
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
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                        <path d="M11.467 11.467 3.799 19.135a2.5 2.5 0 0 0 3.536 3.536l7.668-7.668"></path>
                        <path d="M18.006 4.828 3.799 19.035"></path>
                        <path d="m23 4-6 2 2-6"></path>
                        <path d="m13 19 8-8"></path>
                      </svg>
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
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                          <path d="M12 2v20"></path>
                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                        </svg>
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
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
                        </svg>
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
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                          <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
                          <line x1="16" x2="16" y1="2" y2="6"></line>
                          <line x1="8" x2="8" y1="2" y2="6"></line>
                          <line x1="3" x2="21" y1="10" y2="10"></line>
                        </svg>
                        {formatDate(document.datePublished)}
                      </span>
                    )}
                  </div>
                )}
                
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => onCitationClicked && onCitationClicked(documentId)}
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
        <p>{getRelevanceExplanation(document)}</p>
      </div>
      
      <div className="mt-3 flex justify-end">
        <button
          onClick={() => {
            setCurrentDocumentId(null);
            onCitationClicked(documentId);
          }}
          className="text-white text-sm px-3 py-1.5 rounded flex items-center"
          style={{ backgroundColor: themeStyles.secondaryColor }}
        >
          <ExternalLink size={14} className="mr-1.5" />
          View Full Document
        </button>
      </div>
    </div>
  );
};

export default DocumentDetail;