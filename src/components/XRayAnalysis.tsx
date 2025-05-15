import React, { useEffect, useMemo, useCallback, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ExternalLink, X, FileIcon, BarChart2, Tag, ClipboardList, Code, Table,
  Image, List, FileText, Search, Filter, Zap, ChevronDown, ChevronUp,
  CheckCircle, Info, AlertTriangle, Clipboard, Copy, Download, Lock, Unlock,
  Layers, MapPin, Eye, EyeOff, Settings, RotateCcw, Share2, Loader
} from "lucide-react";
import { Source, XRayChunk } from "@/types/types";
import { formatScoreDisplay, fixDecimalPointIssue } from '@/utils/scoreUtils';

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
  allXrayChunks: { chunk: XRayChunk, sourceId: string, source: Source }[];
  onCitationClicked: (id: string) => void;
  themeStyles: any;
  isXRayLoading?: boolean;
  documentViewerUrl?: string;
  onStartXRayAnalysis?: (documentId: string) => void;
}

// Content type icons with standardized sizing and colors
const ContentTypeIcon: React.FC<{ contentType?: string[]; size?: number }> = ({ contentType, size = 16 }) => {
  if (!contentType || contentType.length === 0)
    return <FileText size={size} className="text-gray-600" />;

  if (contentType.includes('table'))
    return <Table size={size} className="text-indigo-600" />;

  if (contentType.includes('figure'))
    return <Image size={size} className="text-blue-600" />;

  if (contentType.includes('list'))
    return <List size={size} className="text-green-600" />;

  if (contentType.includes('code'))
    return <Code size={size} className="text-yellow-600" />;

  if (contentType.includes('json'))
    return <FileIcon size={size} className="text-orange-600" />;

  return <FileText size={size} className="text-gray-600" />;
};

// Enhanced JSON renderer with better formatting and collapsible sections
const JsonRenderer: React.FC<{ data: any; themeStyles: any }> = ({ data, themeStyles }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!data) return null;

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  // Handle array data
  if (Array.isArray(data)) {
    return (
      <div className="space-y-1 rounded-md border overflow-hidden" style={{ borderColor: themeStyles.borderColor }}>
        <div
          className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50"
          style={{ backgroundColor: `${themeStyles.borderColor}15` }}
          onClick={toggleCollapse}
        >
          <div className="flex items-center">
            <Layers size={14} className="mr-2 text-gray-700" />
            <span className="font-medium text-sm">Array Data ({data.length} items)</span>
          </div>
          {isCollapsed ?
            <ChevronDown size={16} className="text-gray-600" /> :
            <ChevronUp size={16} className="text-gray-600" />}
        </div>

        {!isCollapsed && (
          <div className="p-2 max-h-60 overflow-auto">
            {data.map((item, index) => (
              <div key={index} className="border-b last:border-0 pb-2 mb-2 last:mb-0" style={{ borderColor: `${themeStyles.borderColor}30` }}>
                <div className="flex items-center mb-1">
                  <Tag size={12} className="mr-2 text-gray-600" />
                  <span className="text-xs font-medium text-gray-700">Item {index + 1}</span>
                </div>
                {typeof item === 'object' && item !== null ? (
                  <div className="pl-4 border-l-2" style={{ borderColor: `${themeStyles.borderColor}40` }}>
                    {Object.entries(item).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-3 gap-2 text-xs mb-1">
                        <div className="font-medium text-gray-700">{key}:</div>
                        <div className="col-span-2 text-gray-900">
                          {typeof value === 'object' && value !== null
                            ? <span className="text-blue-600 cursor-pointer hover:underline">{JSON.stringify(value).substring(0, 50)}...</span>
                            : String(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs pl-4">{String(item)}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Handle object data
  if (typeof data === 'object' && data !== null) {
    return (
      <div className="space-y-1 rounded-md border overflow-hidden" style={{ borderColor: themeStyles.borderColor }}>
        <div
          className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50"
          style={{ backgroundColor: `${themeStyles.borderColor}15` }}
          onClick={toggleCollapse}
        >
          <div className="flex items-center">
            <FileIcon size={14} className="mr-2 text-gray-700" />
            <span className="font-medium text-sm">Object Data ({Object.keys(data).length} properties)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="p-1 rounded-md hover:bg-gray-200"
              title="Copy JSON"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(JSON.stringify(data, null, 2));
              }}
            >
              <Copy size={14} className="text-gray-600" />
            </button>
            {isCollapsed ?
              <ChevronDown size={16} className="text-gray-600" /> :
              <ChevronUp size={16} className="text-gray-600" />}
          </div>
        </div>

        {!isCollapsed && (
          <div className="p-2 max-h-60 overflow-auto">
            {Object.entries(data).map(([key, value]) => (
              <div key={key} className="grid grid-cols-3 gap-2 text-xs mb-2 pb-2 border-b last:border-0" style={{ borderColor: `${themeStyles.borderColor}20` }}>
                <div className="font-medium text-gray-700">{key}:</div>
                <div className="col-span-2 text-gray-900">
                  {typeof value === 'object' && value !== null ? (
                    <div className="pl-2 border-l-2" style={{ borderColor: `${themeStyles.primaryColor}30` }}>
                      <pre className="text-xs overflow-auto p-1 bg-gray-50 rounded">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    String(value)
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Handle primitive values
  return (
    <div className="text-xs p-2 border rounded" style={{ borderColor: themeStyles.borderColor }}>
      {String(data)}
    </div>
  );
};

// Enhanced document card with improved visual hierarchy and interactions
const DocumentSummaryCard: React.FC<{
  source: Source;
  index: number;
  themeStyles: any;
  onViewDetails: (id: string) => void;
  onOpenDocument: (url?: string) => void;
  isXRayLoading?: boolean;
  onStartXRayAnalysis?: (id: string) => void;
  isLoadingXRay?: boolean;
  onDirectFetch?: (id: string) => void;
}> = ({
  source,
  index,
  themeStyles,
  onViewDetails,
  onOpenDocument,
  isXRayLoading,
  onStartXRayAnalysis,
  isLoadingXRay = false,
  onDirectFetch
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const fileName = source.fileName || source.title || source.name || 'Unknown Document';
    const sourceId = source.id ? String(source.id) : '';
    const sourceUrl = source.sourceUrl || source.url || '';

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

    // Check if document has any X-Ray data
    const hasXrayData = useMemo(() => {
      if (!source.xray) return false;

      return !!(
        source.xray.summary ||
        source.xray.keywords ||
        (source.xray.chunks && source.xray.chunks.length > 0)
      );
    }, [source.xray]);

    // Card expansion animations
    const variants = {
      collapsed: { height: "auto" },
      expanded: { height: "auto" }
    };

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all"
        style={{
          borderColor: themeStyles.borderColor,
          backgroundColor: themeStyles.cardBackground
        }}
      >
        <div
          className="p-3 border-b flex items-center justify-between cursor-pointer"
          style={{
            borderColor: themeStyles.borderColor,
            background: hasXrayData
              ? `linear-gradient(to right, ${themeStyles.xrayColor}10, ${themeStyles.cardBackground})`
              : themeStyles.cardBackground
          }}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center">
            <div
              className="p-2 rounded-full mr-3"
              style={{ backgroundColor: `${themeStyles.secondaryColor}15` }}
            >
              <FileIcon size={16} style={{ color: themeStyles.secondaryColor }} />
            </div>
            <div>
              <h4 className="font-medium text-sm">
                {fileName}
              </h4>
              <div className="flex items-center mt-1">
                {hasXrayData ? (
                  <span
                    className="flex items-center text-xs font-medium"
                    style={{ color: themeStyles.xrayColor }}
                  >
                    <CheckCircle size={12} className="mr-1" />
                    X-Ray Analysis Available
                  </span>
                ) : (
                  <span className="flex items-center text-xs text-gray-500">
                    <Info size={12} className="mr-1" />
                    No X-Ray Data
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {source.score !== undefined && (
              <span
                className="px-2 py-0.5 text-xs rounded-full"
                style={{
                  backgroundColor: `${themeStyles.secondaryColor}15`,
                  color: themeStyles.secondaryColor
                }}
              >
                Score: {formatScoreDisplay(source.score)}
              </span>
            )}

            {isExpanded ?
              <ChevronUp size={18} className="text-gray-400" /> :
              <ChevronDown size={18} className="text-gray-400" />
            }
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              variants={variants}
              transition={{ duration: 0.3 }}
              className="p-4"
            >
              {/* Document summary */}
              {source.xray?.summary && (
                <div className="mb-4">
                  <div className="flex items-center text-xs mb-2 font-medium" style={{ color: themeStyles.xrayColor }}>
                    <FileText size={14} className="mr-1" />
                    Document Summary
                  </div>
                  <div
                    className="p-3 rounded text-sm"
                    style={{
                      backgroundColor: `${themeStyles.xrayColor}05`,
                      borderLeft: `3px solid ${themeStyles.xrayColor}`
                    }}
                  >
                    {source.xray.summary}
                  </div>
                </div>
              )}

              {/* Keywords */}
              {source.xray?.keywords && (
                <div className="mb-4">
                  <div className="flex items-center text-xs mb-2 font-medium" style={{ color: themeStyles.xrayColor }}>
                    <Tag size={14} className="mr-1" />
                    Keywords
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(typeof source.xray.keywords === 'string' ?
                      source.xray.keywords.split(',') :
                      Array.isArray(source.xray.keywords) ?
                        source.xray.keywords.map(k => k ? k.toString() : '') :
                        []
                    ).filter(Boolean).map((keyword, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 text-xs rounded-full flex items-center"
                        style={{
                          backgroundColor: `${themeStyles.xrayColor}10`,
                          color: themeStyles.xrayColor
                        }}
                      >
                        <Tag size={10} className="mr-1.5" />
                        {keyword.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Statistics */}
              {contentStats.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center text-xs mb-2 font-medium" style={{ color: themeStyles.xrayColor }}>
                    <BarChart2 size={14} className="mr-1" />
                    Content Breakdown
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-3">
                    {contentStats.map(([type, count]) => (
                      <div
                        key={type}
                        className="border rounded-lg p-3 text-center flex flex-col items-center"
                        style={{
                          borderColor: themeStyles.borderColor,
                          backgroundColor: `${themeStyles.xrayColor}05`
                        }}
                      >
                        <ContentTypeIcon contentType={[type]} size={18} />
                        <div
                          className="text-xl font-bold mt-1"
                          style={{ color: themeStyles.xrayColor }}
                        >
                          {count}
                        </div>
                        <div className="text-xs capitalize text-gray-600 mt-1">
                          {type}{count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No X-Ray data placeholder */}
              {!hasXrayData && (
                <div className="flex flex-col items-center justify-center py-6 px-4 mb-4 border-2 border-dashed rounded-lg" style={{ borderColor: `${themeStyles.borderColor}50` }}>
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                    style={{ backgroundColor: `${themeStyles.xrayColor}15` }}
                  >
                    <Zap size={28} style={{ color: themeStyles.xrayColor }} />
                  </div>

                  <h4
                    className="text-base font-medium mb-1"
                    style={{ color: themeStyles.textColor }}
                  >
                    {isLoadingXRay ? "Loading X-Ray Analysis" : "No X-Ray Analysis Available"}
                  </h4>

                  <p className="text-sm text-gray-500 text-center mb-4 max-w-sm">
                    {isLoadingXRay
                      ? "Please wait while we analyze this document and extract valuable insights."
                      : "X-Ray analysis provides document summaries, content extraction, and structured data insights."}
                  </p>

                  {!isLoadingXRay && sourceId && (
                    <div className="flex gap-2">
                      {onStartXRayAnalysis && (
                        <button
                          className="text-sm text-white px-3 py-1.5 rounded-md flex items-center transition-all shadow-sm hover:shadow"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartXRayAnalysis(sourceId);
                          }}
                          disabled={isXRayLoading || isLoadingXRay}
                          style={{
                            backgroundColor: themeStyles.xrayColor,
                            boxShadow: `0 2px 4px ${themeStyles.xrayColor}30`
                          }}
                        >
                          <Zap size={14} className="mr-1.5" />
                          {isXRayLoading ? 'Processing...' : 'Run X-Ray Analysis'}
                        </button>
                      )}

                      {onDirectFetch && (
                        <button
                          className="text-sm px-3 py-1.5 rounded-md border flex items-center hover:bg-gray-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDirectFetch(sourceId);
                          }}
                          disabled={isLoadingXRay}
                          style={{
                            borderColor: themeStyles.borderColor,
                            color: themeStyles.textColor
                          }}
                        >
                          <Download size={14} className="mr-1.5" />
                          {isLoadingXRay ? 'Loading...' : 'Load X-Ray Data'}
                        </button>
                      )}
                    </div>
                  )}

                  {isLoadingXRay && (
                    <div className="w-full max-w-xs mt-2">
                      <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full animate-pulse"
                          style={{
                            width: '60%',
                            backgroundColor: themeStyles.xrayColor
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Document actions */}
              <div className="flex flex-wrap justify-end items-center gap-2 mt-3 pt-3 border-t" style={{ borderColor: themeStyles.borderColor }}>
                <button
                  className="text-xs px-3 py-1.5 rounded-md flex items-center hover:bg-gray-50 border"
                  onClick={() => sourceId && onViewDetails(sourceId)}
                  disabled={!sourceId}
                  aria-label={`View X-Ray details for ${fileName}`}
                  style={{
                    borderColor: themeStyles.borderColor,
                    color: themeStyles.xrayColor
                  }}
                >
                  <Layers size={14} className="mr-1.5" />
                  X-Ray Details
                </button>

                <button
                  className="text-xs text-white px-3 py-1.5 rounded-md flex items-center shadow-sm hover:shadow"
                  onClick={() => onOpenDocument(sourceUrl)}
                  aria-label={`Open ${fileName} document`}
                  style={{ backgroundColor: themeStyles.secondaryColor }}
                >
                  <ExternalLink size={14} className="mr-1.5" />
                  Open Document
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

// Enhanced content chunk card with better visualization and interactions
const ContentChunkCard: React.FC<{
  item: { chunk: XRayChunk, sourceId: string, source: Source };
  index: number;
  isActive: boolean;
  themeStyles: any;
  onClick: () => void;
}> = ({ item, index, isActive, themeStyles, onClick }) => {
  const sourceFileName = item.source?.fileName || item.source?.title || item.source?.name || 'Unknown Document';
  const contentType = item.chunk.contentType?.[0] || 'text';
  const chunkId = item.chunk.id || index;

  // Different styling based on content type
  const getContentTypeStyles = (type: string) => {
    switch (type) {
      case 'table':
        return {
          bg: '#EEF2FF', // indigo-50
          border: '#A5B4FC', // indigo-300
          text: '#4F46E5' // indigo-600
        };
      case 'figure':
        return {
          bg: '#EFF6FF', // blue-50
          border: '#93C5FD', // blue-300
          text: '#2563EB' // blue-600
        };
      case 'list':
        return {
          bg: '#ECFDF5', // green-50
          border: '#6EE7B7', // green-300
          text: '#059669' // green-600
        };
      case 'code':
        return {
          bg: '#FEFCE8', // yellow-50
          border: '#FDE047', // yellow-300
          text: '#CA8A04' // yellow-600
        };
      case 'json':
        return {
          bg: '#FFF7ED', // orange-50
          border: '#FDBA74', // orange-300
          text: '#EA580C' // orange-600
        };
      default:
        return {
          bg: '#F9FAFB', // gray-50
          border: '#D1D5DB', // gray-300
          text: '#4B5563' // gray-600
        };
    }
  };

  const typeStyles = getContentTypeStyles(contentType);

  return (
    <motion.div
      layout
      whileHover={{ y: -2, boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)' }}
      className={`p-3 border rounded-lg cursor-pointer transition-all ${isActive ? 'ring-2' : ''
        }`}
      onClick={onClick}
      style={{
        backgroundColor: isActive ? `${typeStyles.bg}80` : themeStyles.cardBackground,
        borderColor: isActive ? typeStyles.border : themeStyles.borderColor,
        boxShadow: isActive ? `0 0 0 1px ${typeStyles.border}` : 'none'
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <div
            className="p-1.5 rounded-md mr-2"
            style={{ backgroundColor: `${typeStyles.bg}`, color: typeStyles.text }}
          >
            <ContentTypeIcon contentType={item.chunk.contentType} size={14} />
          </div>
          <span
            className="text-sm font-medium"
            style={{ color: typeStyles.text }}
          >
            {item.chunk.contentType?.join(', ') || 'Text'}
          </span>
        </div>
        <div
          className="px-2 py-0.5 rounded-full text-xs font-medium"
          style={{ backgroundColor: `${typeStyles.bg}`, color: typeStyles.text }}
        >
          #{chunkId}
        </div>
      </div>

      {/* Source file reference */}
      <div className="text-xs text-gray-500 mb-2 flex items-center">
        <FileIcon size={10} className="mr-1" />
        <span className="truncate max-w-xs">{sourceFileName}</span>
      </div>

      {/* Content separator */}
      <div className="h-px w-full my-2" style={{ backgroundColor: `${themeStyles.borderColor}30` }}></div>

      {/* Display parsed data if available, otherwise show text preview */}
      {item.chunk.parsedData ? (
        <div className="mt-2">
          <div className="text-xs text-gray-500 mb-1 flex items-center">
            <Info size={10} className="mr-1" />
            Summary
          </div>
          <div
            className="p-2 rounded-md text-sm line-clamp-2"
            style={{ backgroundColor: `${typeStyles.bg}40` }}
          >
            {item.chunk.parsedData.summary || item.chunk.parsedData.Summary || 'No summary available'}
          </div>

          {(item.chunk.parsedData.keywords || item.chunk.parsedData.Keywords) && (
            <div className="mt-2">
              <div className="text-xs text-gray-500 mb-1 flex items-center">
                <Tag size={10} className="mr-1" />
                Keywords
              </div>
              <div className="flex flex-wrap gap-1">
                {(typeof item.chunk.parsedData.keywords === 'string' || typeof item.chunk.parsedData.Keywords === 'string' ?
                  (item.chunk.parsedData.keywords || item.chunk.parsedData.Keywords || '').split(',') :
                  Array.isArray(item.chunk.parsedData.keywords) ? item.chunk.parsedData.keywords :
                    Array.isArray(item.chunk.parsedData.Keywords) ? item.chunk.parsedData.Keywords : []
                )
                  .slice(0, 3)
                  .map((keyword: string, i: number) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 text-xs rounded-full"
                      style={{
                        backgroundColor: typeStyles.bg,
                        color: typeStyles.text
                      }}
                    >
                      {keyword ? keyword.toString().trim() : ''}
                    </span>
                  ))
                }
                {(typeof item.chunk.parsedData.keywords === 'string' ?
                  item.chunk.parsedData.keywords.split(',').length :
                  Array.isArray(item.chunk.parsedData.keywords) ?
                    item.chunk.parsedData.keywords.length : 0) > 3 && (
                    <span className="text-xs text-gray-500">
                      +{(typeof item.chunk.parsedData.keywords === 'string' ?
                        item.chunk.parsedData.keywords.split(',').length :
                        Array.isArray(item.chunk.parsedData.keywords) ?
                          item.chunk.parsedData.keywords.length : 0) - 3} more
                    </span>
                  )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-2">
          <div
            className="p-2 rounded-md text-sm line-clamp-3"
            style={{ backgroundColor: `${typeStyles.bg}20` }}
          >
            {item.chunk.sectionSummary || (item.chunk.text ? item.chunk.text.substring(0, 150) : 'No preview available')}
            {(item.chunk.text && item.chunk.text.length > 150) ? '...' : ''}
          </div>
        </div>
      )}

      {/* Footer metadata */}
      <div className="flex items-center justify-between mt-3 pt-2" style={{ borderTop: `1px dashed ${themeStyles.borderColor}30` }}>
        {/* Data indicator */}
        {(item.chunk.json || (item.chunk.parsedData && (item.chunk.parsedData.data || item.chunk.parsedData.Data))) && (
          <span className="text-xs flex items-center text-gray-600">
            <FileIcon size={10} className="mr-1" />
            With Data
          </span>
        )}

        {/* Page numbers */}
        {item.chunk.pageNumbers && item.chunk.pageNumbers.length > 0 && (
          <span className="text-xs flex items-center text-gray-600">
            <MapPin size={10} className="mr-1" />
            Page{item.chunk.pageNumbers.length > 1 ? 's' : ''}: {item.chunk.pageNumbers.join(', ')}
          </span>
        )}

        {/* View indicator when active */}
        {isActive && (
          <span className="text-xs flex items-center" style={{ color: typeStyles.text }}>
            <Eye size={10} className="mr-1" />
            Selected
          </span>
        )}
      </div>
    </motion.div>
  );
};

// Enhanced detail view for selected chunks
const ChunkDetailView: React.FC<{
  chunk: XRayChunk;
  themeStyles: any;
  onClose: () => void;
}> = ({ chunk, themeStyles, onClose }) => {
  const [activeTab, setActiveTab] = useState<'content' | 'data' | 'metadata'>('content');
  const contentType = chunk.contentType?.[0] || 'text';

  // Determine styling based on content type
  const getContentTypeColor = (type: string) => {
    switch (type) {
      case 'table': return '#4F46E5'; // indigo-600
      case 'figure': return '#2563EB'; // blue-600
      case 'list': return '#059669'; // green-600
      case 'code': return '#CA8A04'; // yellow-600
      case 'json': return '#EA580C'; // orange-600
      default: return '#4B5563'; // gray-600
    }
  };

  const typeColor = getContentTypeColor(contentType);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-6 overflow-hidden border rounded-xl shadow-md"
      style={{
        borderColor: `${typeColor}50`,
        backgroundColor: themeStyles.cardBackground
      }}
    >
      {/* Header with gradient background */}
      <div className="relative" style={{
        background: `linear-gradient(to right, ${typeColor}15, ${typeColor}05)`,
        borderBottom: `1px solid ${typeColor}30`
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 p-1.5 rounded-full bg-white shadow-sm hover:shadow"
          aria-label="Close detail view"
          style={{ color: typeColor }}
        >
          <X size={16} />
        </button>

        <div className="p-4 pr-12">
          <div className="flex items-center">
            <div
              className="p-2 rounded-lg mr-3"
              style={{ backgroundColor: `${typeColor}15`, color: typeColor }}
            >
              <ContentTypeIcon contentType={chunk.contentType} size={20} />
            </div>

            <div>
              <h3
                className="text-xl font-medium"
                style={{ color: typeColor }}
              >
                {chunk.contentType?.join(' + ') || 'Text'} Content
              </h3>
              <p className="text-sm text-gray-600">
                Chunk ID: {chunk.id || 'Unknown'}
                {chunk.pageNumbers && chunk.pageNumbers.length > 0 && (
                  <span className="ml-2">• Page{chunk.pageNumbers.length > 1 ? 's' : ''}: {chunk.pageNumbers.join(', ')}</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b px-4" style={{ borderColor: `${typeColor}20` }}>
          <button
            className={`px-4 py-2 text-sm font-medium transition-all relative ${activeTab === 'content' ? '' : 'opacity-60 hover:opacity-100'}`}
            style={{ color: typeColor }}
            onClick={() => setActiveTab('content')}
          >
            Content
            {activeTab === 'content' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ backgroundColor: typeColor }}
              />
            )}
          </button>

          {(chunk.json || (chunk.parsedData && (chunk.parsedData.data || chunk.parsedData.Data))) && (
            <button
              className={`px-4 py-2 text-sm font-medium transition-all relative ${activeTab === 'data' ? '' : 'opacity-60 hover:opacity-100'}`}
              style={{ color: typeColor }}
              onClick={() => setActiveTab('data')}
            >
              Structured Data
              {activeTab === 'data' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: typeColor }}
                />
              )}
            </button>
          )}

          <button
            className={`px-4 py-2 text-sm font-medium transition-all relative ${activeTab === 'metadata' ? '' : 'opacity-60 hover:opacity-100'}`}
            style={{ color: typeColor }}
            onClick={() => setActiveTab('metadata')}
          >
            Metadata
            {activeTab === 'metadata' && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5"
                style={{ backgroundColor: typeColor }}
              />
            )}
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'content' && (
            <motion.div
              key="content-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Parsed data summary if available */}
              {chunk.parsedData && (chunk.parsedData.summary || chunk.parsedData.Summary) && (
                <div className="mb-4">
                  <div className="text-sm font-medium mb-2 flex items-center" style={{ color: typeColor }}>
                    <Info size={14} className="mr-1.5" />
                    Content Summary
                  </div>
                  <div
                    className="p-3 rounded-lg text-sm border-l-4"
                    style={{
                      backgroundColor: `${typeColor}05`,
                      borderLeftColor: typeColor
                    }}
                  >
                    {chunk.parsedData.summary || chunk.parsedData.Summary}
                  </div>
                </div>
              )}

              {/* Section summary */}
              {chunk.sectionSummary && (
                <div className="mb-4">
                  <div className="text-sm font-medium mb-2 flex items-center" style={{ color: typeColor }}>
                    <FileText size={14} className="mr-1.5" />
                    Section Overview
                  </div>
                  <div
                    className="p-3 rounded-lg text-sm"
                    style={{
                      backgroundColor: `${typeColor}10`,
                    }}
                  >
                    {chunk.sectionSummary}
                  </div>
                </div>
              )}

              {/* Original text */}
              {chunk.text && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium flex items-center" style={{ color: typeColor }}>
                      <FileText size={14} className="mr-1.5" />
                      {chunk.originalText ? "Original JSON" : "Original Text"}
                    </div>
                    <button
                      className="p-1.5 rounded text-gray-500 hover:bg-gray-100 flex items-center text-xs"
                      onClick={() => navigator.clipboard.writeText(chunk.originalText || chunk.text)}
                    >
                      <Copy size={12} className="mr-1" />
                      Copy
                    </button>
                  </div>
                  <div
                    className="p-3 rounded-lg text-sm border overflow-auto max-h-64 font-mono"
                    style={{
                      backgroundColor: `${themeStyles.cardBackground}`,
                      borderColor: themeStyles.borderColor
                    }}
                  >
                    <pre className="whitespace-pre-wrap">
                      {chunk.originalText || chunk.text}
                    </pre>
                  </div>
                </div>
              )}

              {/* Suggested text */}
              {chunk.suggestedText && chunk.suggestedText !== chunk.text && (
                <div className="mb-4">
                  <div className="text-sm font-medium mb-2 flex items-center" style={{ color: typeColor }}>
                    <Clipboard size={14} className="mr-1.5" />
                    Suggested Text
                  </div>
                  <div
                    className="p-3 rounded-lg text-sm border border-dashed"
                    style={{
                      backgroundColor: `${typeColor}05`,
                      borderColor: typeColor
                    }}
                  >
                    {chunk.suggestedText}
                  </div>
                </div>
              )}

              {/* Narrative format */}
              {chunk.narrative && chunk.narrative.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm font-medium mb-2 flex items-center" style={{ color: typeColor }}>
                    <FileText size={14} className="mr-1.5" />
                    Narrative Format
                  </div>
                  <div className="space-y-2">
                    {chunk.narrative.map((narrativeText, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-lg text-sm prose max-w-none prose-sm"
                        style={{
                          backgroundColor: index % 2 === 0 ? `${typeColor}05` : themeStyles.cardBackground,
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
            </motion.div>
          )}

          {activeTab === 'data' && (
            <motion.div
              key="data-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-sm font-medium mb-3 flex items-center" style={{ color: typeColor }}>
                <FileIcon size={14} className="mr-1.5" />
                Structured Data
              </div>

              <JsonRenderer
                data={chunk.json || (chunk.parsedData && (chunk.parsedData.data || chunk.parsedData.Data))}
                themeStyles={themeStyles}
              />

              {!(chunk.json || (chunk.parsedData && (chunk.parsedData.data || chunk.parsedData.Data))) && (
                <div className="p-4 text-center text-gray-500 border rounded-lg border-dashed">
                  No structured data available for this content
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'metadata' && (
            <motion.div
              key="metadata-tab"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Content Type */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 border rounded-lg p-3" style={{ borderColor: themeStyles.borderColor }}>
                  <div className="text-xs text-gray-500 mb-1">Content Type</div>
                  <div className="flex items-center">
                    <ContentTypeIcon contentType={chunk.contentType} size={16} />
                    <span className="ml-2 text-sm font-medium">
                      {chunk.contentType?.join(', ') || 'Text'}
                    </span>
                  </div>
                </div>

                {/* Chunk ID */}
                <div className="col-span-1 border rounded-lg p-3" style={{ borderColor: themeStyles.borderColor }}>
                  <div className="text-xs text-gray-500 mb-1">Chunk ID</div>
                  <div className="text-sm font-mono font-medium">#{chunk.id || 'Unknown'}</div>
                </div>

                {/* Page references */}
                <div className="col-span-1 border rounded-lg p-3" style={{ borderColor: themeStyles.borderColor }}>
                  <div className="text-xs text-gray-500 mb-1">Pages</div>
                  <div className="text-sm">
                    {chunk.pageNumbers && chunk.pageNumbers.length > 0
                      ? chunk.pageNumbers.join(', ')
                      : 'No page information'}
                  </div>
                </div>
              </div>

              {/* Bounding boxes */}
              {chunk.boundingBoxes && chunk.boundingBoxes.length > 0 && (
                <div className="border rounded-lg p-3" style={{ borderColor: themeStyles.borderColor }}>
                  <div className="text-sm font-medium mb-2" style={{ color: typeColor }}>
                    Location Coordinates
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {chunk.boundingBoxes.map((box, i) => (
                      <div key={i} className="border rounded p-2 text-xs" style={{ borderColor: `${typeColor}30` }}>
                        <div className="font-medium mb-1" style={{ color: typeColor }}>Region #{i + 1} - Page {box.pageNumber}</div>
                        <div className="grid grid-cols-2 gap-1">
                          <div>Top-Left: ({box.topLeftX}, {box.topLeftY})</div>
                          <div>Bottom-Right: ({box.bottomRightX}, {box.bottomRightY})</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional metadata if available */}
              {chunk.parsedData && Object.keys(chunk.parsedData).length > 0 &&
                !['summary', 'Summary', 'data', 'Data'].some(key => Object.keys(chunk.parsedData || {}).includes(key)) && (
                  <div>
                    <div className="text-sm font-medium mb-2" style={{ color: typeColor }}>
                      Additional Metadata
                    </div>
                    <JsonRenderer data={chunk.parsedData} themeStyles={themeStyles} />
                  </div>
                )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// Empty state component with more visual appeal
const EmptyState: React.FC<{
  xrayContentFilter: string | null;
  themeStyles: any;
  isXRayLoading?: boolean;
  onStartXRayAnalysis?: (id: string) => void;
  selectedSourceId: string | null;
  onDirectFetch?: (id: string) => void;
}> = ({ xrayContentFilter, themeStyles, isXRayLoading, onStartXRayAnalysis, selectedSourceId, onDirectFetch }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed rounded-xl"
    style={{ borderColor: `${themeStyles.borderColor}40` }}
  >
    <div
      className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
      style={{ backgroundColor: `${themeStyles.xrayColor}15` }}
    >
      {xrayContentFilter ? (
        <Filter size={32} style={{ color: themeStyles.xrayColor }} />
      ) : (
        <Zap size={32} style={{ color: themeStyles.xrayColor }} />
      )}
    </div>

    <h4
      className="text-xl font-medium mb-2"
      style={{ color: themeStyles.xrayColor }}
    >
      {xrayContentFilter
        ? `No ${xrayContentFilter} content found`
        : isXRayLoading
          ? "Analyzing document..."
          : "No X-Ray content available"}
    </h4>

    <p className="text-sm text-gray-500 max-w-lg mb-6">
      {xrayContentFilter
        ? `We couldn't find any ${xrayContentFilter} content in the current X-Ray analysis. Try selecting a different content type or analyzing the document again.`
        : isXRayLoading
          ? "Please wait while we analyze the document and extract valuable insights..."
          : "X-Ray analysis hasn't been performed for this document yet. Start an analysis to extract document structure, content summaries, and insights."}
    </p>

    {/* Loading progress indicator */}
    {isXRayLoading && (
      <div className="w-full max-w-md mb-6">
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full animate-pulse"
            style={{
              width: '70%',
              background: `linear-gradient(to right, ${themeStyles.xrayColor}50, ${themeStyles.xrayColor})`
            }}
          ></div>
        </div>
      </div>
    )}

    {selectedSourceId && !isXRayLoading && (
      <div className="flex flex-wrap gap-3 justify-center">
        {onStartXRayAnalysis && (
          <button
            className="flex items-center px-4 py-2 rounded-lg text-white font-medium shadow-sm hover:shadow transition-all"
            onClick={() => onStartXRayAnalysis(selectedSourceId)}
            style={{
              backgroundColor: themeStyles.xrayColor,
              boxShadow: `0 2px 4px ${themeStyles.xrayColor}30`
            }}
          >
            <Zap size={16} className="mr-2" />
            Run X-Ray Analysis
          </button>
        )}

        {onDirectFetch && (
          <button
            className="flex items-center px-4 py-2 rounded-lg border font-medium hover:bg-gray-50 transition-all"
            onClick={() => onDirectFetch(selectedSourceId)}
            style={{
              borderColor: themeStyles.borderColor,
              color: themeStyles.textColor
            }}
          >
            <Download size={16} className="mr-2" />
            Load Existing X-Ray Data
          </button>
        )}

        {xrayContentFilter && (
          <button
            className="flex items-center px-4 py-2 rounded-lg border font-medium hover:bg-gray-50 transition-all"
            onClick={() => document.getElementById('content-filter-select')?.click()}
            style={{
              borderColor: themeStyles.borderColor,
              color: themeStyles.textColor
            }}
          >
            <Filter size={16} className="mr-2" />
            Change Content Filter
          </button>
        )}
      </div>
    )}
  </motion.div>
);

// Searchable content filter dropdown
const ContentFilterDropdown: React.FC<{
  contentTypes: string[];
  activeFilter: string | null;
  onChange: (filter: string | null) => void;
  themeStyles: any;
}> = ({ contentTypes, activeFilter, onChange, themeStyles }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        id="content-filter-select"
        className="flex items-center text-xs rounded border px-3 py-1.5"
        style={{
          borderColor: themeStyles.borderColor,
          backgroundColor: activeFilter ? `${themeStyles.xrayColor}10` : themeStyles.cardBackground,
          color: activeFilter ? themeStyles.xrayColor : themeStyles.textColor
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Filter size={12} className="mr-1.5" />
        {activeFilter ? `${activeFilter}s` : 'All Content Types'}
        {isOpen ? <ChevronUp size={14} className="ml-2" /> : <ChevronDown size={14} className="ml-2" />}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full z-10 mt-1 w-56 rounded-md border shadow-lg"
          style={{
            borderColor: themeStyles.borderColor,
            backgroundColor: themeStyles.cardBackground
          }}
        >
          <div className="py-1">
            <button
              className={`flex items-center w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${activeFilter === null ? 'font-medium' : ''}`}
              style={{ color: activeFilter === null ? themeStyles.xrayColor : themeStyles.textColor }}
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
            >
              <span className="w-6">
                {activeFilter === null && <CheckCircle size={12} />}
              </span>
              All Content Types
            </button>

            {contentTypes.map(type => (
              <button
                key={type}
                className={`flex items-center w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${activeFilter === type ? 'font-medium' : ''}`}
                style={{ color: activeFilter === type ? themeStyles.xrayColor : themeStyles.textColor }}
                onClick={() => {
                  onChange(type);
                  setIsOpen(false);
                }}
              >
                <span className="w-6">
                  {activeFilter === type && <CheckCircle size={12} />}
                </span>
                <ContentTypeIcon contentType={[type]} size={12} />
                <span className="ml-1.5 capitalize">{type}s</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced XRay Analysis main component
const XRayAnalysis: React.FC<XRayAnalysisProps> = ({
  xrayViewMode,
  setXrayViewMode,
  xrayContentFilter,
  setXrayContentFilter,
  activeXrayChunk,
  setActiveXrayChunk,
  selectedSourceId,
  setSelectedSourceId,
  sources = [],
  allXrayChunks = [],
  onCitationClicked,
  themeStyles,
  isXRayLoading = false,
  documentViewerUrl,
  onStartXRayAnalysis
}) => {
  // State for direct data fetching
  const [directXrayData, setDirectXrayData] = useState<{ [key: string]: any }>({});
  const [directXrayChunks, setDirectXrayChunks] = useState<{ chunk: XRayChunk, sourceId: string, source: Source }[]>([]);
  const [isFetchingDirectly, setIsFetchingDirectly] = useState<{ [key: string]: boolean }>({});
  const [directXrayError, setDirectXrayError] = useState<string | null>(null);

  // State for UI enhancements
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedView, setExpandedView] = useState<boolean>(false);

  // Track which documents we've already attempted to fetch
  const attemptedFetchIdsRef = useRef<Set<string>>(new Set());

  // Function to directly fetch X-Ray data
  const fetchXRayDirectly = useCallback(async (docId: string, skipCheck = false) => {
    if (!skipCheck && (!docId || isFetchingDirectly[docId])) return;

    setIsFetchingDirectly(prev => ({ ...prev, [docId]: true }));
    setDirectXrayError(null);

    try {
      const response = await fetch(`/api/groundx/xray?documentId=${docId}&includeText=true`);

      if (!response.ok) {
        throw new Error(`Failed to fetch X-Ray data: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.xray) {
        // Save to directXrayData map
        setDirectXrayData(prev => ({
          ...prev,
          [docId]: data.xray
        }));

        // Find the source object
        const source = sources.find(s => s.id === docId);

        if (source && data.xray.chunks && data.xray.chunks.length > 0) {
          // Create chunks that preserve original source properties, especially score
          const chunks = data.xray.chunks.map((chunk: any) => ({
            chunk: {
              id: chunk.id,
              contentType: chunk.contentType,
              text: chunk.text,
              suggestedText: chunk.suggestedText,
              sectionSummary: chunk.sectionSummary,
              pageNumbers: chunk.pageNumbers,
              boundingBoxes: chunk.boundingBoxes
            },
            sourceId: docId,
            source: {
              ...source, // Preserve original source properties including score
              xray: data.xray
            }
          }));

          setDirectXrayChunks(prev => {
            // Filter out any existing chunks for this document
            const filtered = prev.filter(c => c.sourceId !== docId);
            return [...filtered, ...chunks];
          });
        }
      } else {
        throw new Error(data.error || 'Failed to fetch X-Ray data');
      }
    } catch (error) {
      console.error("Error directly fetching X-Ray data:", error);
      setDirectXrayError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsFetchingDirectly(prev => ({ ...prev, [docId]: false }));
    }
  }, [sources, isFetchingDirectly]);

  // Separate function to mark as attempted and fetch
  const markAndFetch = useCallback((docId: string) => {
    // Use the ref to mark attempted
    attemptedFetchIdsRef.current.add(docId);
    // Call fetch with skipCheck to avoid dependency on isFetchingDirectly
    fetchXRayDirectly(docId, true);
  }, [fetchXRayDirectly]);

  // Auto-fetch X-Ray data when a document is selected
  useEffect(() => {
    if (
      selectedSourceId &&
      !isXRayLoading &&
      !isFetchingDirectly[selectedSourceId] &&
      !attemptedFetchIdsRef.current.has(selectedSourceId)
    ) {
      const selectedSource = sources.find(s => s.id === selectedSourceId);

      // If the source doesn't have X-Ray data already, try to fetch it directly
      if (selectedSource && !selectedSource.xray) {
        markAndFetch(selectedSourceId);
      }
    }
  }, [selectedSourceId, isXRayLoading, sources, isFetchingDirectly, markAndFetch]);

  // Create enhanced sources with direct X-Ray data
  const enhancedSources = useMemo(() => {
    return sources.map(source => {
      const sourceId = source.id ? String(source.id) : '';

      // If we have direct X-Ray data for this source
      if (sourceId && directXrayData[sourceId]) {
        return {
          ...source, // Keep all original properties
          xray: directXrayData[sourceId]
        };
      }

      return source;
    });
  }, [sources, directXrayData]);

  // Combine all X-Ray chunks (from props and direct fetching)
  const combinedChunks = useMemo(() => {
    const combined = [...allXrayChunks];

    // Add directly fetched chunks if they don't already exist
    directXrayChunks.forEach(directChunk => {
      const exists = combined.some(
        existingChunk =>
          existingChunk.sourceId === directChunk.sourceId &&
          existingChunk.chunk.id === directChunk.chunk.id
      );

      if (!exists) {
        combined.push(directChunk);
      }
    });

    return combined;
  }, [allXrayChunks, directXrayChunks]);

  // Extract unique content types for filter buttons
  const uniqueContentTypes = useMemo(() => {
    if (!combinedChunks || combinedChunks.length === 0) return [];

    const types = new Set<string>();
    combinedChunks.forEach(item => {
      if (item.chunk && item.chunk.contentType) {
        item.chunk.contentType.forEach(type => {
          if (type) types.add(type);
        });
      }
    });

    return Array.from(types);
  }, [combinedChunks]);

  // Filter chunks by selected source
  const sourceFilteredChunks = useMemo(() => {
    if (!selectedSourceId) return combinedChunks;
    return combinedChunks.filter(item => item.sourceId === selectedSourceId);
  }, [combinedChunks, selectedSourceId]);

  // Filter by content type and search term
  const filteredChunks = useMemo(() => {
    if (!sourceFilteredChunks) return [];

    // First apply content type filter
    let filtered = sourceFilteredChunks;
    if (xrayContentFilter) {
      filtered = filtered.filter(item =>
        item.chunk && item.chunk.contentType?.includes(xrayContentFilter)
      );
    }

    // Then apply search filter if a term is entered
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(item => {
        // Search in text content
        if (item.chunk.text && item.chunk.text.toLowerCase().includes(term)) return true;

        // Search in section summary
        if (item.chunk.sectionSummary && item.chunk.sectionSummary.toLowerCase().includes(term)) return true;

        // Search in parsed data summary
        if (item.chunk.parsedData?.summary && item.chunk.parsedData.summary.toLowerCase().includes(term)) return true;
        if (item.chunk.parsedData?.Summary && item.chunk.parsedData.Summary.toLowerCase().includes(term)) return true;

        return false;
      });
    }

    return filtered;
  }, [sourceFilteredChunks, xrayContentFilter, searchTerm]);

  // Event handlers
  const handleViewDetails = useCallback((sourceId: string) => {
    setXrayViewMode('detail');
    setSelectedSourceId(sourceId);
  }, [setXrayViewMode, setSelectedSourceId]);

  const handleOpenDocument = useCallback((url?: string) => {
    const urlToOpen = url || documentViewerUrl;
    if (urlToOpen) {
      window.open(urlToOpen, "_blank", "noopener,noreferrer");
    }
  }, [documentViewerUrl]);

  // Check if we're currently loading the selected source's X-Ray data
  const isSelectedSourceLoading = selectedSourceId
    ? (isFetchingDirectly[selectedSourceId] || false)
    : false;

  // Determine if the selected source has X-Ray data
  const selectedSourceHasXRay = useMemo(() => {
    if (!selectedSourceId) return false;

    // Check original sources
    const source = enhancedSources.find(s => s.id === selectedSourceId);
    if (source?.xray) return true;

    // Check if we have direct chunks for this source
    return directXrayChunks.some(c => c.sourceId === selectedSourceId);
  }, [selectedSourceId, enhancedSources, directXrayChunks]);

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

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-xl shadow-sm overflow-hidden bg-white"
    >
      {/* Header */}
      <div
        className="p-5 border-b"
        style={{
          background: `linear-gradient(to right, ${themeStyles.xrayColor}15, ${themeStyles.xrayColor}05)`,
          borderColor: `${themeStyles.xrayColor}20`
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div
              className="p-2 rounded-lg mr-3 flex items-center justify-center"
              style={{
                backgroundColor: `${themeStyles.xrayColor}15`,
                color: themeStyles.xrayColor
              }}
            >
              <Zap size={22} />
            </div>
            <div>
              <h2
                className="text-xl font-bold"
                style={{ color: themeStyles.xrayColor }}
              >
                X-Ray Document Analysis
              </h2>
              <p className="text-sm text-gray-600">
                Advanced content extraction and structured insights
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View mode toggle */}
            <div
              className="rounded-lg overflow-hidden border shadow-sm flex"
              style={{ borderColor: themeStyles.borderColor }}
              role="tablist"
              aria-label="X-Ray view modes"
            >
              <button
                onClick={() => setXrayViewMode('summary')}
                className={`px-4 py-1.5 text-sm font-medium flex items-center ${xrayViewMode === 'summary' ? '' : 'opacity-70 hover:opacity-100'}`}
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
                <FileText size={14} className="mr-1.5" />
                Summary
              </button>
              <button
                onClick={() => setXrayViewMode('detail')}
                className={`px-4 py-1.5 text-sm font-medium flex items-center ${xrayViewMode === 'detail' ? '' : 'opacity-70 hover:opacity-100'}`}
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
                <Layers size={14} className="mr-1.5" />
                Details
              </button>
            </div>

            {/* Expanded view toggle */}
            <button
              onClick={() => setExpandedView(!expandedView)}
              className="p-1.5 rounded-lg border"
              style={{
                borderColor: themeStyles.borderColor,
                color: expandedView ? themeStyles.xrayColor : themeStyles.textColor,
                backgroundColor: expandedView ? `${themeStyles.xrayColor}10` : 'transparent'
              }}
              title={expandedView ? "Compact View" : "Expanded View"}
            >
              {expandedView ? <Unlock size={16} /> : <Lock size={16} />}
            </button>
          </div>
        </div>

        {/* Controls for detail view */}
        {xrayViewMode === 'detail' && (
          <div className="flex items-center justify-between mt-2">
            <div className="text-sm">
              {selectedSourceId ? (
                <div className="flex items-center text-gray-600">
                  <FileText size={14} className="mr-1" />
                  Viewing: <span className="font-medium ml-1">{enhancedSources.find(s => s.id === selectedSourceId)?.fileName || 'Unknown Document'}</span>
                  {filteredChunks.length > 0 && (
                    <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100">
                      {filteredChunks.length} chunk{filteredChunks.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-gray-500">Select a document to view details</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Search box */}
              <div
                className="relative flex items-center"
                style={{ width: searchTerm ? '180px' : '120px' }}
              >
                <Search
                  size={14}
                  className="absolute left-2 text-gray-400"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="pl-8 pr-2 py-1.5 text-xs rounded border w-full transition-all focus:w-64 focus:outline-none focus:ring-1"
                  style={{
                    borderColor: themeStyles.borderColor,
                    backgroundColor: themeStyles.cardBackground,
                    color: themeStyles.textColor,
                    focusRing: themeStyles.xrayColor
                  }}
                />
                {searchTerm && (
                  <button
                    className="absolute right-2 text-gray-400 hover:text-gray-600"
                    onClick={() => setSearchTerm('')}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Content filter dropdown */}
              {uniqueContentTypes.length > 0 && (
                <ContentFilterDropdown
                  contentTypes={uniqueContentTypes}
                  activeFilter={xrayContentFilter}
                  onChange={setXrayContentFilter}
                  themeStyles={themeStyles}
                />
              )}

              {/* Refresh button for selected source */}
              {selectedSourceId && (
                <button
                  onClick={() => fetchXRayDirectly(selectedSourceId, true)}
                  disabled={isSelectedSourceLoading}
                  className="p-1.5 rounded border hover:bg-gray-50"
                  style={{
                    borderColor: themeStyles.borderColor,
                    color: themeStyles.textColor,
                    opacity: isSelectedSourceLoading ? 0.5 : 1
                  }}
                  title="Refresh X-Ray Data"
                >
                  <RotateCcw size={14} className={isSelectedSourceLoading ? 'animate-spin' : ''} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main content area */}
      <div className="p-5">
        {/* Loading indicator */}
        {(isXRayLoading || Object.values(isFetchingDirectly).some(v => v)) && (
          <div className="p-3 mb-4 rounded-lg border flex items-center bg-white" style={{ borderColor: `${themeStyles.xrayColor}30` }}>
            <div className="animate-spin mr-3">
              <Loader size={20} style={{ color: themeStyles.xrayColor }} />
            </div>
            <div>
              <div className="text-sm font-medium" style={{ color: themeStyles.xrayColor }}>
                {isXRayLoading ? 'Running X-Ray Analysis...' : 'Loading X-Ray Data...'}
              </div>
              <div className="text-xs text-gray-500">
                {isXRayLoading
                  ? 'Our AI is analyzing the document content and extracting structured insights'
                  : 'Retrieving existing X-Ray data from the server'}
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {directXrayError && (
          <div className="p-3 mb-4 rounded-lg border border-red-200 bg-red-50 flex items-start">
            <AlertTriangle size={20} className="mr-3 text-red-500 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-red-700">Error Loading X-Ray Data</div>
              <div className="text-xs text-red-600">{directXrayError}</div>
            </div>
          </div>
        )}

        {/* Summary view */}
        {xrayViewMode === 'summary' && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            role="tabpanel"
            id="summary-panel"
            aria-labelledby="summary-tab"
          >
            <div className="space-y-4">
              {/* Show ALL documents, even those without X-Ray data */}
              {enhancedSources && enhancedSources.length > 0 ? (
                enhancedSources.map((source, index) => (
                  <DocumentSummaryCard
                    key={`xray-summary-${source.id || index}`}
                    source={source}
                    index={index}
                    themeStyles={themeStyles}
                    onViewDetails={handleViewDetails}
                    onOpenDocument={handleOpenDocument}
                    isXRayLoading={isXRayLoading}
                    onStartXRayAnalysis={onStartXRayAnalysis}
                    isLoadingXRay={source.id ? isFetchingDirectly[source.id] : false}
                    onDirectFetch={fetchXRayDirectly}
                  />
                ))
              ) : (
                <div className="text-center py-8 border border-dashed rounded-lg" style={{ borderColor: themeStyles.borderColor }}>
                  <FileText size={32} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-gray-500 mb-1">
                    No documents available for X-Ray analysis
                  </p>
                  <p className="text-xs text-gray-400">
                    Please add documents to your workspace to analyze them
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Detailed view */}
        {xrayViewMode === 'detail' && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            role="tabpanel"
            id="detail-panel"
            aria-labelledby="detail-tab"
          >
            {/* Quick access document selector for detail view */}
            {!expandedView && enhancedSources.length > 1 && (
              <div className="mb-4 flex items-center space-x-2 overflow-x-auto pb-2">
                {enhancedSources.map((source, index) => (
                  <button
                    key={`doc-pill-${source.id || index}`}
                    onClick={() => setSelectedSourceId(source.id ? String(source.id) : null)}
                    className="flex items-center px-3 py-1.5 text-xs rounded-full whitespace-nowrap"
                    style={{
                      backgroundColor: selectedSourceId === source.id
                        ? themeStyles.xrayColor
                        : `${themeStyles.borderColor}20`,
                      color: selectedSourceId === source.id
                        ? 'white'
                        : themeStyles.textColor
                    }}
                  >
                    <FileIcon size={12} className="mr-1.5" />
                    {source.fileName || source.title || source.name || 'Unknown Document'}
                    {source.xray && (
                      <span
                        className="ml-1.5 w-2 h-2 rounded-full"
                        style={{ backgroundColor: selectedSourceId === source.id ? 'white' : themeStyles.xrayColor }}
                      ></span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Selected document status banner */}
            {selectedSourceId && !selectedSourceHasXRay && !isSelectedSourceLoading && (
              <div className="mb-4 p-4 rounded-lg border border-blue-100 bg-blue-50 flex items-start">
                <Info size={20} className="mr-3 text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-blue-700 mb-1">X-Ray Data Required</h4>
                  <p className="text-xs text-blue-600 mb-3">
                    This document hasn't been analyzed with X-Ray yet. Run an analysis to extract structured content, summaries, and insights.
                  </p>
                  <button
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 shadow-sm"
                    onClick={() => fetchXRayDirectly(selectedSourceId, true)}
                  >
                    <Zap size={14} className="mr-1.5 inline-block" />
                    Load X-Ray Data
                  </button>
                </div>
              </div>
            )}

            {/* Content view - active chunk or chunks list */}
            <div className="flex flex-col gap-4">
              {/* Selected chunk detail */}
              {activeXrayChunk && (
                <ChunkDetailView
                  chunk={activeXrayChunk}
                  themeStyles={themeStyles}
                  onClose={() => setActiveXrayChunk(null)}
                />
              )}

              {/* Content chunks list */}
              {filteredChunks.length > 0 ? (
                <motion.div
                  variants={containerVariants}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  {filteredChunks.map((item, index) => (
                    <motion.div key={`chunk-${item.chunk.id || index}`} variants={itemVariants}>
                      <ContentChunkCard
                        item={item}
                        index={index}
                        isActive={activeXrayChunk?.id === item.chunk.id}
                        themeStyles={themeStyles}
                        onClick={() => setActiveXrayChunk(item.chunk)}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <EmptyState
                  xrayContentFilter={xrayContentFilter}
                  themeStyles={themeStyles}
                  isXRayLoading={isXRayLoading || isSelectedSourceLoading}
                  selectedSourceId={selectedSourceId}
                  onStartXRayAnalysis={onStartXRayAnalysis}
                  onDirectFetch={(id) => fetchXRayDirectly(id, true)}
                />
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div
        className="px-5 py-3 border-t flex items-center justify-between text-xs text-gray-500"
        style={{ borderColor: themeStyles.borderColor }}
      >
        <div className="flex items-center">
          <Zap size={12} className="mr-1" style={{ color: themeStyles.xrayColor }} />
          <span>Powered by X-Ray Document Analysis</span>
        </div>

        <div className="flex items-center gap-4">
          <span>
            {enhancedSources.filter(s => s.xray).length} / {enhancedSources.length} documents analyzed
          </span>

          {process.env.NODE_ENV !== 'production' && (
            <button
              className="text-xs flex items-center text-gray-500 hover:text-gray-700"
              onClick={() => console.log({
                sources: enhancedSources,
                chunks: combinedChunks,
                filteredChunks,
                directData: directXrayData
              })}
            >
              <Settings size={12} className="mr-1" />
              Debug Info
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default XRayAnalysis;