// components/RawResponseView.tsx
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileJson,
    Copy,
    Download,
    Code,
    Eye,
    EyeOff,
    Check,
    Search,
    Filter,
    Minimize,
    Maximize,
    RefreshCw,
    Menu,
    AlertTriangle
} from 'lucide-react';
import { ThemeStyles } from '@/types/types';

interface RawResponseViewProps {
    rawResponse: any;
    parsedResponse: any;
    themeStyles: ThemeStyles;
    index: number;
}

const RawResponseView: React.FC<RawResponseViewProps> = ({
    rawResponse,
    parsedResponse,
    themeStyles,
    index
}) => {
    const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [showMetadata, setShowMetadata] = useState(true);
    const [fullScreen, setFullScreen] = useState(false);
    const [copySuccess, setCopySuccess] = useState('');
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    
    // Tab animation
    const tabAnimation = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 }
    };

    const handleCopyToClipboard = (content: string, section: string = 'all') => {
        navigator.clipboard.writeText(content).then(
            () => {
                setCopySuccess(`${section} copied!`);
                setTimeout(() => setCopySuccess(''), 2000);
            },
            () => {
                setCopySuccess('Failed to copy');
                setTimeout(() => setCopySuccess(''), 2000);
            }
        );
    };
    
    const toggleSection = (section: string) => {
        const newExpandedSections = new Set(expandedSections);
        if (newExpandedSections.has(section)) {
            newExpandedSections.delete(section);
        } else {
            newExpandedSections.add(section);
        }
        setExpandedSections(newExpandedSections);
    };
    
    const downloadRawResponse = () => {
        const element = document.createElement('a');
        let content;
        
        try {
            content = JSON.stringify(rawResponse, null, 2);
        } catch (e) {
            content = typeof rawResponse === 'string' ? rawResponse : 'Error serializing response';
        }
        
        const file = new Blob([content], { type: 'application/json' });
        element.href = URL.createObjectURL(file);
        element.download = 'raw_response.json';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };
    
    // Format the raw response for display
    const formatRawResponse = () => {
        try {
            if (typeof rawResponse === 'string') {
                return rawResponse;
            }
            return JSON.stringify(rawResponse, null, 2);
        } catch (e) {
            return 'Error formatting response data';
        }
    };
    
    // Filter the response based on search query
    const getFilteredResponse = () => {
        if (!searchQuery) return formatRawResponse();
        
        try {
            const content = formatRawResponse();
            const lines = content.split('\n');
            const matchingLines = lines.filter(line => 
                line.toLowerCase().includes(searchQuery.toLowerCase())
            );
            
            if (matchingLines.length === 0) return 'No matches found';
            
            // Add some context lines around each match
            const contextSize = 2;
            const resultLines: string[] = [];
            const addedLines = new Set<number>();
            
            matchingLines.forEach(line => {
                const lineIndex = lines.indexOf(line);
                const startIdx = Math.max(0, lineIndex - contextSize);
                const endIdx = Math.min(lines.length - 1, lineIndex + contextSize);
                
                // Add a separator if this isn't directly following the previous section
                if (resultLines.length > 0 && !addedLines.has(startIdx - 1)) {
                    resultLines.push('...');
                }
                
                // Add the context lines
                for (let i = startIdx; i <= endIdx; i++) {
                    if (!addedLines.has(i)) {
                        resultLines.push(
                            i === lineIndex 
                                ? lines[i].replace(
                                    new RegExp(`(${searchQuery})`, 'gi'),
                                    `<span style="background-color: ${themeStyles.secondaryColor}40; padding: 0 2px;">$1</span>`
                                  )
                                : lines[i]
                        );
                        addedLines.add(i);
                    }
                }
            });
            
            return resultLines.join('\n');
        } catch (e) {
            return 'Error filtering response';
        }
    };
    
    // Render a hierarchical view of the parsed response
    const renderParsedResponse = (data: any, path: string = 'root', depth: number = 0) => {
        if (data === null || data === undefined) {
            return (
                <div 
                    className="text-xs py-1 px-2 rounded"
                    style={{ backgroundColor: `${themeStyles.borderColor}30` }}
                >
                    null
                </div>
            );
        }
        
        if (typeof data !== 'object') {
            // For primitive values
            return (
                <div className="text-xs py-1">
                    {typeof data === 'string' ? `"${data}"` : String(data)}
                </div>
            );
        }
        
        const isArray = Array.isArray(data);
        const isEmpty = Object.keys(data).length === 0;
        const isExpanded = expandedSections.has(path);
        
        if (isEmpty) {
            return (
                <div 
                    className="text-xs py-1 px-2 rounded"
                    style={{ backgroundColor: `${themeStyles.borderColor}30` }}
                >
                    {isArray ? '[]' : '{}'}
                </div>
            );
        }
        
        return (
            <div className="pl-4 border-l" style={{ borderColor: `${themeStyles.borderColor}50` }}>
                <div 
                    className="flex items-center cursor-pointer py-1 -ml-4 pl-2 hover:bg-black hover:bg-opacity-5 rounded"
                    onClick={() => toggleSection(path)}
                >
                    {isExpanded ? (
                        <Minimize size={12} className="mr-1" />
                    ) : (
                        <Maximize size={12} className="mr-1" />
                    )}
                    <span className="text-xs font-medium">
                        {isArray ? `Array[${Object.keys(data).length}]` : `Object{${Object.keys(data).length}}`}
                    </span>
                </div>
                
                {isExpanded && (
                    <div className="mt-1 space-y-1">
                        {Object.entries(data).map(([key, value], index) => {
                            const currentPath = `${path}.${key}`;
                            const isLast = index === Object.keys(data).length - 1;
                            
                            return (
                                <div 
                                    key={currentPath}
                                    className={`${!isLast ? 'pb-1' : ''}`}
                                >
                                    <div className="flex items-start">
                                        <span className="text-xs font-medium mr-2 opacity-70">
                                            {isArray ? `[${key}]` : key}:
                                        </span>
                                        <div className="flex-1">
                                            {renderParsedResponse(value, currentPath, depth + 1)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };
    
    // Extract metadata from the response for the info panel
    const extractMetadata = () => {
        const metadata: Record<string, any> = {};
        
        try {
            if (typeof rawResponse === 'object' && rawResponse !== null) {
                // Common API response metadata fields
                const metadataFields = [
                    'id', 'created_at', 'timestamp', 'model', 'version', 
                    'status', 'type', 'metadata', 'usage', 'tokens'
                ];
                
                metadataFields.forEach(field => {
                    if (rawResponse[field] !== undefined) {
                        metadata[field] = rawResponse[field];
                    }
                });
                
                // Look for nested metadata
                if (rawResponse.metadata) {
                    Object.entries(rawResponse.metadata).forEach(([key, value]) => {
                        metadata[key] = value;
                    });
                }
                
                // Look for token usage information
                if (rawResponse.usage) {
                    Object.entries(rawResponse.usage).forEach(([key, value]) => {
                        metadata[`usage_${key}`] = value;
                    });
                }
            }
            
            return metadata;
        } catch (e) {
            return { error: 'Failed to extract metadata' };
        }
    };
    
    const responseMetadata = extractMetadata();
    const hasMetadata = Object.keys(responseMetadata).length > 0;
    const prettyJson = formatRawResponse();
    const filteredJson = getFilteredResponse();

    return (
        <motion.div
            key="raw-response-tab"
            variants={tabAnimation}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className={`py-4 ${fullScreen ? 'fixed inset-0 z-50 p-4 bg-opacity-95' : ''}`}
            style={{ 
                backgroundColor: fullScreen ? themeStyles.backgroundColor : 'transparent'
            }}
        >
            <div 
                className="rounded-lg border"
                style={{ 
                    backgroundColor: `${themeStyles.secondaryColor}10`, 
                    borderColor: `${themeStyles.secondaryColor}30` 
                }}
            >
                <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 
                            className="text-lg font-medium flex items-center"
                            style={{ color: themeStyles.secondaryColor }}
                        >
                            <FileJson size={18} className="mr-2" />
                            Raw Response Data
                        </h3>
                        
                        <div className="flex gap-2">
                            <span 
                                className={`px-2 py-1 text-xs rounded-full flex items-center transition-opacity duration-300 ${
                                    copySuccess ? 'opacity-100' : 'opacity-0'
                                }`}
                                style={{ 
                                    backgroundColor: `${themeStyles.primaryColor}20`, 
                                    color: themeStyles.primaryColor 
                                }}
                            >
                                <Check size={12} className="mr-1" />
                                {copySuccess}
                            </span>
                            
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="p-1.5 rounded-md border"
                                style={{
                                    backgroundColor: themeStyles.cardBackgroundColor,
                                    borderColor: themeStyles.borderColor
                                }}
                                onClick={() => handleCopyToClipboard(prettyJson)}
                                title="Copy All"
                            >
                                <Copy size={16} />
                            </motion.button>
                            
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="p-1.5 rounded-md border"
                                style={{
                                    backgroundColor: themeStyles.cardBackgroundColor,
                                    borderColor: themeStyles.borderColor
                                }}
                                onClick={downloadRawResponse}
                                title="Download JSON"
                            >
                                <Download size={16} />
                            </motion.button>
                            
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="p-1.5 rounded-md border"
                                style={{
                                    backgroundColor: themeStyles.cardBackgroundColor,
                                    borderColor: themeStyles.borderColor
                                }}
                                onClick={() => setFullScreen(!fullScreen)}
                                title={fullScreen ? "Exit Full Screen" : "Full Screen"}
                            >
                                {fullScreen ? <Minimize size={16} /> : <Maximize size={16} />}
                            </motion.button>
                        </div>
                    </div>
                    
                    {/* View Controls */}
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
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search in response..."
                                    className="py-1.5 pr-2 bg-transparent border-none outline-none text-sm w-40 sm:w-auto"
                                    style={{ color: themeStyles.textColor }}
                                />
                            </div>
                            
                            <div className="flex ml-2">
                                <button
                                    onClick={() => setViewMode('formatted')}
                                    className={`px-2 py-1 text-xs rounded-l-md border-y border-l ${
                                        viewMode === 'formatted' ? 'font-medium' : ''
                                    }`}
                                    style={{
                                        backgroundColor: viewMode === 'formatted' 
                                            ? `${themeStyles.secondaryColor}20` 
                                            : themeStyles.cardBackgroundColor,
                                        borderColor: themeStyles.borderColor,
                                        color: viewMode === 'formatted' 
                                            ? themeStyles.secondaryColor 
                                            : themeStyles.textColor
                                    }}
                                >
                                    Parsed
                                </button>
                                <button
                                    onClick={() => setViewMode('raw')}
                                    className={`px-2 py-1 text-xs rounded-r-md border-y border-r ${
                                        viewMode === 'raw' ? 'font-medium' : ''
                                    }`}
                                    style={{
                                        backgroundColor: viewMode === 'raw' 
                                            ? `${themeStyles.secondaryColor}20` 
                                            : themeStyles.cardBackgroundColor,
                                        borderColor: themeStyles.borderColor,
                                        color: viewMode === 'raw' 
                                            ? themeStyles.secondaryColor 
                                            : themeStyles.textColor
                                    }}
                                >
                                    Raw JSON
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex items-center">
                            <button
                                onClick={() => setShowMetadata(!showMetadata)}
                                className="flex items-center text-xs mr-2 opacity-70 hover:opacity-100"
                            >
                                {showMetadata ? (
                                    <>
                                        <EyeOff size={14} className="mr-1" />
                                        Hide Metadata
                                    </>
                                ) : (
                                    <>
                                        <Eye size={14} className="mr-1" />
                                        Show Metadata
                                    </>
                                )}
                            </button>
                            
                            <button
                                onClick={() => {
                                    // Expand all sections
                                    if (expandedSections.size === 0 && viewMode === 'formatted') {
                                        const allPaths = new Set<string>();
                                        const collectPaths = (obj: any, path: string = 'root') => {
                                            if (obj && typeof obj === 'object') {
                                                allPaths.add(path);
                                                Object.entries(obj).forEach(([key, value]) => {
                                                    collectPaths(value, `${path}.${key}`);
                                                });
                                            }
                                        };
                                        collectPaths(parsedResponse);
                                        setExpandedSections(allPaths);
                                    } else {
                                        // Collapse all
                                        setExpandedSections(new Set());
                                    }
                                }}
                                className="flex items-center text-xs opacity-70 hover:opacity-100"
                            >
                                <RefreshCw size={14} className="mr-1" />
                                {expandedSections.size === 0 ? 'Expand All' : 'Collapse All'}
                            </button>
                        </div>
                    </div>
                    
                    {/* Main content grid with metadata sidebar */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Metadata panel (conditionally shown) */}
                        {hasMetadata && showMetadata && (
                            <div 
                                className="md:col-span-1 rounded-md border p-3"
                                style={{ 
                                    backgroundColor: themeStyles.cardBackgroundColor,
                                    borderColor: themeStyles.borderColor
                                }}
                            >
                                <h4 className="text-sm font-medium mb-2 flex items-center">
                                    <Menu size={14} className="mr-1" />
                                    Response Metadata
                                </h4>
                                
                                <div className="space-y-2 text-xs">
                                    {Object.entries(responseMetadata).map(([key, value]) => (
                                        <div key={key}>
                                            <div className="opacity-70">{key}</div>
                                            <div className="font-medium truncate" title={String(value)}>
                                                {typeof value === 'object' 
                                                    ? JSON.stringify(value) 
                                                    : String(value)
                                                }
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Main content area */}
                        <div 
                            className={`${hasMetadata && showMetadata ? 'md:col-span-3' : 'md:col-span-4'} rounded-md border`}
                            style={{ 
                                backgroundColor: themeStyles.cardBackgroundColor,
                                borderColor: themeStyles.borderColor
                            }}
                        >
                            {viewMode === 'raw' ? (
                                <>
                                    {/* Raw JSON view */}
                                    <div className="p-2 h-full">
                                        {!rawResponse ? (
                                            <div 
                                                className="p-4 rounded flex items-center justify-center"
                                                style={{ backgroundColor: `${themeStyles.secondaryColor}10` }}
                                            >
                                                <AlertTriangle size={16} className="mr-2" style={{ color: themeStyles.secondaryColor }} />
                                                No raw response data available
                                            </div>
                                        ) : (
                                            <textarea
                                                ref={textAreaRef}
                                                readOnly
                                                value={searchQuery ? filteredJson : prettyJson}
                                                className="w-full h-96 p-2 text-xs font-mono resize-y border rounded"
                                                style={{ 
                                                    backgroundColor: `${themeStyles.primaryColor}05`,
                                                    borderColor: themeStyles.borderColor,
                                                    color: themeStyles.textColor
                                                }}
                                            />
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Formatted structured view */}
                                    <div className="p-3 max-h-96 overflow-y-auto">
                                        {!parsedResponse ? (
                                            <div 
                                                className="p-4 rounded flex items-center justify-center"
                                                style={{ backgroundColor: `${themeStyles.secondaryColor}10` }}
                                            >
                                                <AlertTriangle size={16} className="mr-2" style={{ color: themeStyles.secondaryColor }} />
                                                No formatted response data available
                                            </div>
                                        ) : (
                                            <div 
                                                className="font-mono text-xs"
                                                style={{ color: themeStyles.textColor }}
                                            >
                                                {renderParsedResponse(parsedResponse)}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                            
                            {/* Additional info panel */}
                            <div 
                                className="p-3 border-t text-xs"
                                style={{ 
                                    borderColor: themeStyles.borderColor,
                                    backgroundColor: `${themeStyles.secondaryColor}05`
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <Code size={14} className="mr-1" />
                                        <span className="opacity-70">
                                            {searchQuery ? (
                                                `Showing filtered results for "${searchQuery}"`
                                            ) : (
                                                `Viewing ${viewMode === 'raw' ? 'raw JSON' : 'parsed'} response data`
                                            )}
                                        </span>
                                    </div>
                                    
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="text-xs underline opacity-70 hover:opacity-100"
                                            style={{ color: themeStyles.secondaryColor }}
                                        >
                                            Clear search
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default RawResponseView;