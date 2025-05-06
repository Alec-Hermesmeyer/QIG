import React from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink, X } from "lucide-react";
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
}

// Helper function to get content type icon
const getContentTypeIcon = (contentType?: string[]) => {
  if (!contentType || contentType.length === 0) 
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="4" x2="3" y2="4"></line><line x1="21" y1="12" x2="9" y2="12"></line><line x1="21" y1="20" x2="3" y2="20"></line></svg>;
  
  if (contentType.includes('table')) 
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>;
  
  if (contentType.includes('figure')) 
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>;
  
  if (contentType.includes('list')) 
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>;
  
  if (contentType.includes('code')) 
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>;
  
  if (contentType.includes('json')) 
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><path d="M10.3 10.18a1.2 1.2 0 0 0-1.6 1.72L10 13.36a1.2 1.2 0 1 0 2.05-1.23L10.73 11"></path><path d="M15.5 15.18a1.2 1.2 0 1 0-1.6 1.72l1.3 1.46a1.2 1.2 0 0 0 2.05-1.23l-1.32-1.13"></path></svg>;
  
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="4" x2="3" y2="4"></line><line x1="21" y1="12" x2="9" y2="12"></line><line x1="21" y1="20" x2="3" y2="20"></line></svg>;
};

// Enhanced JSON display function
const renderJsonData = (jsonData: any, themeStyles: any) => {
  if (!jsonData) return null;
  
  // Handle array data
  if (Array.isArray(jsonData)) {
    return (
      <div className="space-y-2">
        {jsonData.map((item, index) => (
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
  if (typeof jsonData === 'object' && jsonData !== null) {
    return (
      <div className="space-y-1">
        {Object.entries(jsonData).map(([key, value]) => (
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
  return <div className="text-xs">{String(jsonData)}</div>;
};

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
  themeStyles
}) => {
  // Animation variants
  const tabAnimation = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  };

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
              .map((source, index) => {
                // Get file name with fallbacks for different property names
                const fileName = source.fileName || source.title || source.name || 'Unknown Document';
                // Handle string or number IDs
                const sourceId = source.id ? String(source.id) : '';
                
                return (
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
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
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
                            setSelectedSourceId(sourceId);
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
                            onCitationClicked(sourceId);
                          }}
                          style={{ backgroundColor: themeStyles.xrayColor }}
                        >
                          <ExternalLink size={12} className="mr-1" />
                          Open Document
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                      {renderJsonData(activeXrayChunk.json || activeXrayChunk.parsedData?.data || activeXrayChunk.parsedData?.Data, themeStyles)}
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
                      {renderJsonData(activeXrayChunk.parsedData, themeStyles)}
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
              {allXrayChunks.map((item, index) => {
                const sourceFileName = item.source.fileName || item.source.title || item.source.name || 'Unknown Document';
                
                return (
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
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                      </svg>
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
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <path d="M14 2v6h6"></path>
                            <path d="M10.3 10.18a1.2 1.2 0 0 0-1.6 1.72L10 13.36a1.2 1.2 0 1 0 2.05-1.23L10.73 11"></path>
                            <path d="M15.5 15.18a1.2 1.2 0 1 0-1.6 1.72l1.3 1.46a1.2 1.2 0 0 0 2.05-1.23l-1.32-1.13"></path>
                          </svg>
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
              })}
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
  );
};

export default XRayAnalysis;