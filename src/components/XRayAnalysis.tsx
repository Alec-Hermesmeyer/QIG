import React, { useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink, X, FileIcon, BarChart2, Tag, ClipboardList, Code, Table, Image, List, FileText } from "lucide-react";
import { Source, XRayChunk } from "@/types/types";

interface XRayAnalysisProps {
  xrayViewMode: 'summary' | 'detail';
  setXrayViewMode: (mode: 'summary' | 'detail') => void;
  xrayContentFilter: string | null;
  setXrayContentFilter: (filter: string | null) => void;
  activeXrayChunk: XRayChunk | null;
  setActiveXrayChunk: (chunk: XRayChunk | null) => void;
  selectedSourceId: string | null;
  setSelectedSourceId: (id: string | null) => void;
  sources: Source[];
  allXrayChunks: {chunk: XRayChunk, sourceId: string, source: Source}[];
  onCitationClicked: (id: string) => void;
  themeStyles: any;
  documentViewerUrl?: string; // Make the URL configurable instead of hardcoded
}

// Content type icons as separate component for better reusability
const ContentTypeIcon: React.FC<{ contentType?: string[]; size?: number }> = ({ contentType, size = 16 }) => {
  if (!contentType || contentType.length === 0) 
    return <FileText size={size} />;
  
  if (contentType.includes('table')) 
    return <Table size={size} />;
  
  if (contentType.includes('figure')) 
    return <Image size={size} />;
  
  if (contentType.includes('list')) 
    return <List size={size} />;
  
  if (contentType.includes('code')) 
    return <Code size={size} />;
  
  if (contentType.includes('json')) 
    return <FileIcon size={size} />;
  
  return <FileText size={size} />;
};

// Separate the JSON renderer for clarity
const JsonRenderer: React.FC<{ data: any; themeStyles: any }> = ({ data, themeStyles }) => {
  if (!data) return null;
  
  // Handle array data
  if (Array.isArray(data)) {
    return (
      <div className="space-y-2">
        {data.map((item, index) => (
          <div key={index} className="border-b pb-2" style={{ borderColor: `${themeStyles.borderColor}30` }}>
            {typeof item === 'object' && item !== null ? (
              <div>
                {Object.entries(item).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-3 gap-2 text-xs">
                    <div className="font-medium">{key}:</div>
                    <div className="col-span-2">
                      {typeof value === 'object' && value !== null
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
  if (typeof data === 'object' && data !== null) {
    return (
      <div className="space-y-1">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="grid grid-cols-3 gap-2 text-xs">
            <div className="font-medium">{key}:</div>
            <div className="col-span-2">
              {typeof value === 'object' && value !== null
                ? JSON.stringify(value)
                : String(value)}
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  // Handle primitive values
  return <div className="text-xs">{String(data)}</div>;
};

// Separate component for document summary card
const DocumentSummaryCard: React.FC<{
  source: Source;
  index: number;
  themeStyles: any;
  onViewDetails: (id: string) => void;
  onOpenDocument: () => void;
}> = ({ source, index, themeStyles, onViewDetails, onOpenDocument }) => {
  const fileName = source.fileName || source.title || source.name || 'Unknown Document';
  const sourceId = source.id ? String(source.id) : '';
  
  // Calculate content type statistics
  const contentStats = useMemo(() => {
    if (!source.xray?.chunks) return [];
    
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
    
    return Array.from(contentTypes.entries());
  }, [source.xray?.chunks]);
  
  return (
    <div 
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
          <FileIcon size={16} className="mr-2" />
          <h4 className="ml-2 font-medium text-sm">
            {fileName}
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
              <FileText size={12} className="mr-1" />
              Document Summary
            </div>
            <p className="text-sm">{source.xray.summary}</p>
          </div>
        )}
        
        {/* Keywords */}
        {source.xray?.keywords && (
          <div className="mb-4">
            <div className="flex items-center text-xs mb-1 font-medium" style={{ color: themeStyles.xrayColor }}>
              <Tag size={12} className="mr-1" />
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
        {contentStats.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center text-xs mb-1 font-medium" style={{ color: themeStyles.xrayColor }}>
              <BarChart2 size={12} className="mr-1" />
              Content Statistics
            </div>
            
            <div className="mt-2 grid grid-cols-3 gap-2">
              {contentStats.map(([type, count]) => (
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
              ))}
            </div>
          </div>
        )}
        
        {/* Buttons for viewing more */}
        <div className="flex justify-end space-x-2">
          <button
            className="text-xs px-2 py-1 rounded flex items-center"
            onClick={() => onViewDetails(sourceId)}
            aria-label={`View X-Ray details for ${fileName}`}
            style={{ 
              backgroundColor: `${themeStyles.xrayColor}10`,
              color: themeStyles.xrayColor
            }}
          >
            View X-Ray Details
          </button>
          
          <button
            className="text-xs text-white px-2 py-1 rounded flex items-center"
            onClick={onOpenDocument}
            aria-label={`Open ${fileName} document`}
            style={{ backgroundColor: themeStyles.xrayColor }}
          >
            <ExternalLink size={12} className="mr-1" />
            Open Document
          </button>
        </div>
      </div>
    </div>
  );
};

// Separate component for content chunk card
const ContentChunkCard: React.FC<{
  item: {chunk: XRayChunk, sourceId: string, source: Source};
  index: number;
  isActive: boolean;
  themeStyles: any;
  onClick: () => void;
}> = ({ item, index, isActive, themeStyles, onClick }) => {
  const sourceFileName = item.source.fileName || item.source.title || item.source.name || 'Unknown Document';
  
  return (
    <div 
      key={`chunk-${index}`}
      className={`p-3 border rounded cursor-pointer transition-all ${
        isActive ? 'ring-2' : 'hover:shadow-sm'
      }`}
      onClick={onClick}
      style={{ 
        backgroundColor: themeStyles.cardBackground,
        borderColor: themeStyles.borderColor,
        boxShadow: isActive ? `0 0 0 2px ${themeStyles.xrayColor}` : 'none'
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <ContentTypeIcon contentType={item.chunk.contentType} />
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
        <FileIcon size={12} className="mr-1" />
        <span className="ml-1 truncate">{sourceFileName}</span>
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
                  .map((keyword: string, i: number) => (
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
            <FileIcon size={12} className="mr-1" />
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
  );
};

// Separate component for active chunk detail view
const ChunkDetailView: React.FC<{
  chunk: XRayChunk;
  themeStyles: any;
  onClose: () => void;
}> = ({ chunk, themeStyles, onClose }) => {
  return (
    <div 
      className="mb-4 p-3 border rounded-lg"
      style={{ 
        borderColor: `${themeStyles.xrayColor}50`,
        backgroundColor: `${themeStyles.xrayColor}05`
      }}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center">
          <ContentTypeIcon contentType={chunk.contentType} />
          <h4 
            className="ml-2 font-medium"
            style={{ color: themeStyles.xrayColor }}
          >
            {chunk.contentType?.join(', ') || 'Text'} Chunk #{chunk.id}
          </h4>
        </div>
        <button
          onClick={onClose}
          className="p-1"
          aria-label="Close detail view"
        >
          <X size={16} />
        </button>
      </div>
      
      {/* Parsed data summary if available */}
      {chunk.parsedData && (chunk.parsedData.summary || chunk.parsedData.Summary) && (
        <div className="mb-3">
          <div className="text-xs font-medium mb-1" style={{ color: themeStyles.xrayColor }}>Summary from Analysis:</div>
          <div 
            className="p-2 rounded border text-sm"
            style={{ 
              backgroundColor: themeStyles.cardBackground,
              borderColor: themeStyles.borderColor
            }}
          >
            {chunk.parsedData.summary || chunk.parsedData.Summary}
          </div>
        </div>
      )}
      
      {/* Section summary */}
      {chunk.sectionSummary && (
        <div className="mb-3">
          <div className="text-xs font-medium mb-1" style={{ color: themeStyles.xrayColor }}>Section Summary:</div>
          <div 
            className="p-2 rounded border text-sm"
            style={{ 
              backgroundColor: themeStyles.cardBackground,
              borderColor: themeStyles.borderColor
            }}
          >
            {chunk.sectionSummary}
          </div>
        </div>
      )}
      
      {/* Original text */}
      {chunk.text && (
        <div className="mb-3">
          <div className="text-xs font-medium mb-1" style={{ color: themeStyles.xrayColor }}>
            {chunk.originalText ? "Original JSON Data:" : "Original Text:"}
          </div>
          <div 
            className="p-2 rounded border text-sm overflow-auto max-h-40"
            style={{ 
              backgroundColor: themeStyles.cardBackground,
              borderColor: themeStyles.borderColor
            }}
          >
            {chunk.originalText || chunk.text}
          </div>
        </div>
      )}
      
      {/* Suggested text */}
      {chunk.suggestedText && chunk.suggestedText !== chunk.text && (
        <div className="mb-3">
          <div className="text-xs font-medium mb-1" style={{ color: themeStyles.xrayColor }}>Suggested Text:</div>
          <div 
            className="p-2 rounded border text-sm"
            style={{ 
              backgroundColor: themeStyles.cardBackground,
              borderColor: themeStyles.borderColor
            }}
          >
            {chunk.suggestedText}
          </div>
        </div>
      )}
      
      {/* Narrative format */}
      {chunk.narrative && chunk.narrative.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-medium mb-1" style={{ color: themeStyles.xrayColor }}>Narrative Format:</div>
          <div className="space-y-2">
            {chunk.narrative.map((narrativeText, index) => (
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
      
      {/* JSON format */}
      {(chunk.json || chunk.parsedData?.data || chunk.parsedData?.Data) && (
        <div className="mb-3">
          <div className="text-xs font-medium mb-1" style={{ color: themeStyles.xrayColor }}>Parsed Data:</div>
          <div 
            className="p-2 rounded border text-sm"
            style={{ 
              backgroundColor: themeStyles.cardBackground,
              borderColor: themeStyles.borderColor
            }}
          >
            <JsonRenderer 
              data={chunk.json || chunk.parsedData?.data || chunk.parsedData?.Data} 
              themeStyles={themeStyles} 
            />
          </div>
        </div>
      )}
      
      {/* Additional parsed data if available */}
      {chunk.parsedData && Object.keys(chunk.parsedData).length > 0 && 
        !['summary', 'Summary', 'data', 'Data'].includes(Object.keys(chunk.parsedData)[0]) && (
        <div className="mb-3">
          <div className="text-xs font-medium mb-1" style={{ color: themeStyles.xrayColor }}>Additional Metadata:</div>
          <div 
            className="p-2 rounded border text-sm"
            style={{ 
              backgroundColor: themeStyles.cardBackground,
              borderColor: themeStyles.borderColor
            }}
          >
            <JsonRenderer data={chunk.parsedData} themeStyles={themeStyles} />
          </div>
        </div>
      )}
      
      {/* Page references */}
      {chunk.pageNumbers && chunk.pageNumbers.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-medium mb-1" style={{ color: themeStyles.xrayColor }}>
            Pages: {chunk.pageNumbers.join(', ')}
          </div>
        </div>
      )}
      
      {/* Bounding boxes */}
      {chunk.boundingBoxes && chunk.boundingBoxes.length > 0 && (
        <div className="text-xs opacity-70">
          This content has {chunk.boundingBoxes.length} defined region{chunk.boundingBoxes.length !== 1 ? 's' : ''} in the document.
        </div>
      )}
    </div>
  );
};

// Empty state component
const EmptyState: React.FC<{
  xrayContentFilter: string | null;
  themeStyles: any;
}> = ({ xrayContentFilter, themeStyles }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <FileText size={48} className="mb-4 opacity-50" />
    <h4 className="text-lg font-medium mb-2" style={{ color: themeStyles.xrayColor }}>No content chunks found</h4>
    <p className="text-sm opacity-70 max-w-md">
      {xrayContentFilter 
        ? `No ${xrayContentFilter} content was found in the X-Ray analysis. Try selecting a different content type.`
        : 'No X-Ray content chunks were found for this document. Try selecting a different document.'}
    </p>
  </div>
);

// Main component with sub-components
const XRayAnalysis: React.FC<XRayAnalysisProps> = ({
  xrayViewMode,
  setXrayViewMode,
  xrayContentFilter,
  setXrayContentFilter,
  activeXrayChunk,
  setActiveXrayChunk,
  selectedSourceId,
  setSelectedSourceId,
  sources,
  allXrayChunks,
  onCitationClicked,
  themeStyles,
  documentViewerUrl = "https://upload.groundx.ai/file/a03c889a-fa9f-4864-bcd3-30c7a596156c/75b005ca-0b3b-4960-a856-b2eda367f2fc.pdf" // Default URL if not provided
}) => {
  // Animation variants
  const tabAnimation = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  };

  // Extract unique content types for filter buttons
  const uniqueContentTypes = useMemo(() => {
    const types = new Set<string>();
    allXrayChunks.forEach(item => {
      if (item.chunk.contentType) {
        item.chunk.contentType.forEach(type => types.add(type));
      }
    });
    return Array.from(types);
  }, [allXrayChunks]);

  // Create filtered chunks based on content type
  const filteredChunks = useMemo(() => {
    if (!xrayContentFilter) return allXrayChunks;
    
    return allXrayChunks.filter(item => 
      item.chunk.contentType?.includes(xrayContentFilter)
    );
  }, [allXrayChunks, xrayContentFilter]);

  // Event handlers
  const handleViewDetails = useCallback((sourceId: string) => {
    setXrayViewMode('detail');
    setSelectedSourceId(sourceId);
  }, [setXrayViewMode, setSelectedSourceId]);

  const handleOpenDocument = useCallback(() => {
    window.open(documentViewerUrl, "_blank", "noopener,noreferrer");
  }, [documentViewerUrl]);

  return (
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
              role="tablist"
              aria-label="X-Ray view modes"
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
                role="tab"
                aria-selected={xrayViewMode === 'summary'}
                aria-controls="summary-panel"
                id="summary-tab"
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
                role="tab"
                aria-selected={xrayViewMode === 'detail'}
                aria-controls="detail-panel"
                id="detail-tab"
              >
                Details
              </button>
            </div>
            
            {/* Content type filter */}
            {xrayViewMode === 'detail' && (
              <select
                value={xrayContentFilter || ''}
                onChange={(e) => setXrayContentFilter(e.target.value || null)}
                className="text-xs rounded border px-2 py-1"
                style={{ 
                  borderColor: themeStyles.borderColor,
                  backgroundColor: themeStyles.cardBackground,
                  color: themeStyles.textColor 
                }}
                aria-label="Filter by content type"
              >
                <option value="">All Content Types</option>
                <option value="table">Tables</option>
                <option value="figure">Figures</option>
                <option value="paragraph">Paragraphs</option>
                <option value="list">Lists</option>
                <option value="code">Code</option>
              </select>
            )}
          </div>
        </div>
        
        {/* Summary view */}
        <div 
          role="tabpanel"
          id="summary-panel"
          aria-labelledby="summary-tab"
          hidden={xrayViewMode !== 'summary'}
        >
          {xrayViewMode === 'summary' && (
            <div className="space-y-4">
              {/* Documents with X-Ray data */}
              {sources
                .filter(source => source.xray)
                .map((source, index) => (
                  <DocumentSummaryCard
                    key={`xray-summary-${index}`}
                    source={source}
                    index={index}
                    themeStyles={themeStyles}
                    onViewDetails={handleViewDetails}
                    onOpenDocument={handleOpenDocument}
                  />
                ))}
                
              {/* No documents with X-Ray data */}
              {sources.filter(source => source.xray).length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm opacity-70">
                    No documents with X-Ray analysis available.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Detailed view */}
        <div 
          role="tabpanel"
          id="detail-panel"
          aria-labelledby="detail-tab"
          hidden={xrayViewMode !== 'detail'}
        >
          {xrayViewMode === 'detail' && (
            <div>
              {/* Content type filter UI */}
              <div className="mb-4 flex flex-wrap gap-2">
                {uniqueContentTypes.map(type => (
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
                    aria-pressed={xrayContentFilter === type}
                  >
                    <ContentTypeIcon contentType={[type]} size={12} />
                    <span className="ml-1 capitalize">{type}s</span>
                  </button>
                ))}
                
                {uniqueContentTypes.length > 0 && (
                  <button
                    onClick={() => setXrayContentFilter(null)}
                    className={`px-2 py-1 text-xs rounded-full flex items-center`}
                    style={{ 
                      backgroundColor: xrayContentFilter === null 
                        ? themeStyles.xrayColor 
                        : `${themeStyles.xrayColor}10`,
                      color: xrayContentFilter === null 
                        ? 'white' 
                        : themeStyles.xrayColor
                    }}
                    aria-pressed={xrayContentFilter === null}
                  >
                    Show All
                  </button>
                )}
              </div>
              
              {/* Selected chunk detail */}
              {activeXrayChunk && (
                <ChunkDetailView
                  chunk={activeXrayChunk}
                  themeStyles={themeStyles}
                  onClose={() => setActiveXrayChunk(null)}
                />
              )}
              
              {/* Content chunks list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredChunks.map((item, index) => (
                  <ContentChunkCard
                    key={`chunk-${index}`}
                    item={item}
                    index={index}
                    isActive={activeXrayChunk?.id === item.chunk.id}
                    themeStyles={themeStyles}
                    onClick={() => setActiveXrayChunk(item.chunk)}
                  />
                ))}
              </div>
              
              {/* Empty state */}
              {filteredChunks.length === 0 && (
                <EmptyState
                  xrayContentFilter={xrayContentFilter}
                  themeStyles={themeStyles}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default XRayAnalysis;