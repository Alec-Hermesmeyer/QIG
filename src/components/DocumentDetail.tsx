import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  ExternalLink, X, FileIcon, FileText, Table, Image, List, Code, Calendar, 
  DollarSign, BookOpen, AlertCircle, Activity, Zap, Loader, Globe, 
  ChevronDown, ChevronUp, Tag, Info, Search, ClipboardCopy, Loader2,
  Copy, Download, Maximize2, MapPin, Database, Hash
} from "lucide-react";
import { getDocumentType, formatDate } from "./Answer";
import { Source, XRayChunk } from "@/types/types";
import { fixDecimalPointIssue } from "@/utils/scoreUtils";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DocumentDetailProps {
  document: {
    id: string | number;
    title?: string;
    fileName?: string;
    score?: number;
    excerpts?: string[];
    narrative?: string[];
    metadata?: Record<string, any>;
    searchData?: {
      date_uploaded?: string;
      document_type?: string;
      key?: string;
      [key: string]: any;
    };
    boundingBoxes?: Array<{
      bottomRightX: number;
      bottomRightY: number;
      pageNumber: number;
      topLeftX: number;
      topLeftY: number;
      corrected: boolean;
    }>;
    pageImages?: string[];
    fileKeywords?: string;
    bucketId?: number;
    multimodalUrl?: string;
    json?: any[];
    text?: string;
    highlights?: string[];
    sourceUrl?: string;
    xray?: any;
    hasXray?: boolean;
  };
  handleImageClick: (document: any, imageIndex: number) => void;
  setCurrentDocumentId: (id: string) => void;
  setActiveTab: (tab: string) => void;
  setActiveXrayChunk: (chunk: any) => void;
  themeStyles: any;
  getRelevanceExplanation: (document: any) => string;
  onCitationClicked: (id: string) => void;
  onStartXRayAnalysis: (documentId: string) => void;
  isXRayLoading: boolean;
  isAnalyzed: boolean;
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
  isXRayLoading,
  isAnalyzed
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Debug logging for X-ray data
  useEffect(() => {
    console.log("DocumentDetail - Document data:", document);
    console.log("DocumentDetail - X-ray data:", document.xray);
    console.log("DocumentDetail - Has X-ray:", document.hasXray);
    console.log("DocumentDetail - Is analyzed:", isAnalyzed);
  }, [document, isAnalyzed]);

  const handleCopyText = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  const formatScore = useCallback((score: number) => {
    return (score * 100).toFixed(1) + '%';
  }, []);

  const formatDate = useCallback((dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3">
          <FileText className="text-blue-600" size={20} />
          <div>
            <h3 className="font-semibold text-gray-900">
              {document.fileName || document.title || 'Unknown Document'}
            </h3>
            {document.searchData?.document_type && (
              <Badge variant="outline" className="text-xs">
                {document.searchData.document_type}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="xray">X-Ray</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Document Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-sm">
                  <Info size={16} />
                  <span>Document Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Relevance Score */}
                {document.score !== undefined && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Relevance Score:</span>
                    <Badge variant="secondary">
                      {formatScore(document.score)}
                    </Badge>
                  </div>
                )}

                {/* Upload Date */}
                {document.searchData?.date_uploaded && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Upload Date:</span>
                    <span className="text-sm font-medium">
                      {formatDate(document.searchData.date_uploaded)}
                    </span>
                  </div>
                )}

                {/* Bucket ID */}
                {document.bucketId && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Bucket ID:</span>
                    <Badge variant="outline">
                      {document.bucketId}
                    </Badge>
                  </div>
                )}

                {/* Keywords */}
                {document.fileKeywords && (
                  <div>
                    <span className="text-sm text-gray-600">Keywords:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {document.fileKeywords.split(',').map((keyword: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {keyword.trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Narrative Summary */}
            {document.narrative && document.narrative.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-sm">
                    <FileText size={16} />
                    <span>Document Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {document.narrative.map((text, index) => (
                      <p key={index} className="text-sm text-gray-700 leading-relaxed">
                        {text}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-4">
            {/* Main Text Content */}
            {document.text && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2 text-sm">
                      <FileText size={16} />
                      <span>Document Content</span>
                    </CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleCopyText(document.text!)}
                          >
                            <Copy size={14} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy text</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                    {document.text}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Excerpts */}
            {document.excerpts && document.excerpts.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-sm">
                    <FileText size={16} />
                    <span>Excerpts</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {document.excerpts.map((excerpt, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded border border-gray-200">
                        <div className="text-sm">{excerpt}</div>
                        {document.boundingBoxes && document.boundingBoxes[index] && (
                          <div className="mt-2 text-xs text-gray-500">
                            Page {document.boundingBoxes[index].pageNumber}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Highlights */}
            {document.highlights && document.highlights.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-sm">
                    <Tag size={16} />
                    <span>Highlights</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {document.highlights.map((highlight, index) => (
                      <div key={index} className="bg-yellow-50 border border-yellow-200 rounded p-2">
                        <p className="text-sm text-gray-700">{highlight}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Structured Data (JSON) */}
            {document.json && document.json.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-sm">
                    <Database size={16} />
                    <span>Structured Data</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {document.json.map((item, index) => (
                      <div key={index} className="bg-gray-50 border rounded p-3">
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
                          {JSON.stringify(item, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Media Tab */}
          <TabsContent value="media" className="space-y-4">
            {/* Page Images */}
            {document.pageImages && document.pageImages.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-sm">
                    <Image size={16} />
                    <span>Page Images ({document.pageImages.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Image Navigation */}
                    {document.pageImages.length > 1 && (
                      <div className="flex items-center justify-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedImageIndex(Math.max(0, selectedImageIndex - 1))}
                          disabled={selectedImageIndex === 0}
                        >
                          Previous
                        </Button>
                        <span className="text-sm text-gray-600">
                          {selectedImageIndex + 1} of {document.pageImages.length}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedImageIndex(Math.min((document.pageImages?.length || 1) - 1, selectedImageIndex + 1))}
                          disabled={selectedImageIndex === (document.pageImages?.length || 1) - 1}
                        >
                          Next
                        </Button>
                      </div>
                    )}

                    {/* Main Image Display */}
                    <div className="relative">
                      <img
                        src={document.pageImages?.[selectedImageIndex] || ''}
                        alt={`Page ${selectedImageIndex + 1}`}
                        className="w-full h-auto max-h-96 object-contain border rounded cursor-pointer"
                        onClick={() => handleImageClick(document, selectedImageIndex)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 bg-white/80"
                        onClick={() => handleImageClick(document, selectedImageIndex)}
                      >
                        <Maximize2 size={14} />
                      </Button>
                    </div>

                    {/* Thumbnail Strip */}
                    {document.pageImages && document.pageImages.length > 1 && (
                      <div className="flex space-x-2 overflow-x-auto">
                        {document.pageImages.map((image, index) => (
                          <img
                            key={index}
                            src={image}
                            alt={`Page ${index + 1}`}
                            className={`w-16 h-20 object-cover border rounded cursor-pointer ${
                              index === selectedImageIndex ? 'border-blue-500' : 'border-gray-300'
                            }`}
                            onClick={() => setSelectedImageIndex(index)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Multimodal Content */}
            {document.multimodalUrl && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-sm">
                    <ExternalLink size={16} />
                    <span>Multimodal Content</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(document.multimodalUrl, '_blank')}
                  >
                    <ExternalLink size={14} className="mr-2" />
                    Open Multimodal Content
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Bounding Boxes */}
            {document.boundingBoxes && document.boundingBoxes.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-sm">
                    <MapPin size={16} />
                    <span>Text Locations ({document.boundingBoxes.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {document.boundingBoxes.map((box, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-gray-50 border rounded cursor-pointer hover:bg-gray-100"
                      >
                        <span className="text-sm">Page {box.pageNumber}</span>
                        <div className="text-xs text-gray-600">
                          ({box.topLeftX}, {box.topLeftY}) → ({box.bottomRightX}, {box.bottomRightY})
                          {box.corrected && <Badge variant="secondary" className="ml-2 text-xs">Corrected</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* X-Ray Tab */}
          <TabsContent value="xray" className="space-y-4">
            {document.xray ? (
              <>
                {/* X-Ray Summary */}
                {document.xray.fileSummary && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center space-x-2 text-sm">
                        <Zap size={16} />
                        <span>Document Summary</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700">{document.xray.fileSummary}</p>
                    </CardContent>
                  </Card>
                )}

                {/* X-Ray Keywords */}
                {document.xray.fileKeywords && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center space-x-2 text-sm">
                        <Tag size={16} />
                        <span>Keywords</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-700">{document.xray.fileKeywords}</p>
                    </CardContent>
                  </Card>
                )}

                {/* X-Ray Chunks */}
                {document.xray.chunks && document.xray.chunks.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center space-x-2 text-sm">
                        <Database size={16} />
                        <span>Document Chunks ({document.xray.chunks.length})</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {document.xray.chunks.map((chunk: any, index: number) => (
                          <div
                            key={index}
                            className="p-3 bg-gray-50 border rounded cursor-pointer hover:bg-gray-100"
                            onClick={() => setActiveXrayChunk(chunk)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                {getContentTypeIcon(chunk.contentType)}
                                <Badge variant="outline" className="text-xs">
                                  {chunk.contentType ? chunk.contentType.join(', ') : 'Unknown'}
                                </Badge>
                              </div>
                              {chunk.pageNumbers && chunk.pageNumbers.length > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  Page {chunk.pageNumbers.join(', ')}
                                </Badge>
                              )}
                            </div>
                            {chunk.sectionSummary && (
                              <p className="text-xs text-gray-600 mb-2">{chunk.sectionSummary}</p>
                            )}
                            {chunk.text && (
                              <p className="text-sm text-gray-800 line-clamp-3">{chunk.text}</p>
                            )}
                            {chunk.boundingBoxes && chunk.boundingBoxes.length > 0 && (
                              <div className="mt-2 text-xs text-gray-500">
                                {chunk.boundingBoxes.length} text region{chunk.boundingBoxes.length !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Document Pages from X-Ray */}
                {document.xray.pages && document.xray.pages.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center space-x-2 text-sm">
                        <FileText size={16} />
                        <span>Document Pages ({document.xray.pages.length})</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                        {document.xray.pages.map((page: any, index: number) => (
                          <div
                            key={index}
                            className="p-2 bg-gray-50 border rounded text-center"
                          >
                            <span className="text-sm font-medium">Page {page.pageNumber}</span>
                            {page.width && page.height && (
                              <div className="text-xs text-gray-600 mt-1">
                                {page.width} × {page.height}
                              </div>
                            )}
                            {page.pageUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2 w-full text-xs"
                                onClick={() => window.open(page.pageUrl, '_blank')}
                              >
                                <ExternalLink size={12} className="mr-1" />
                                View
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="flex flex-col items-center space-y-3">
                    <Zap size={32} className="text-gray-400" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">No X-Ray Data Available</h3>
                      <p className="text-xs text-gray-600 mt-1">
                        {document.hasXray ? 'X-Ray analysis is loading...' : 'X-Ray analysis not available for this document'}
                      </p>
                    </div>
                    {document.hasXray && !isXRayLoading && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onStartXRayAnalysis(document.id.toString())}
                      >
                        <Zap size={14} className="mr-2" />
                        Load X-Ray Data
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Metadata Tab */}
          <TabsContent value="metadata" className="space-y-4">
            {/* Search Data */}
            {document.searchData && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-sm">
                    <Database size={16} />
                    <span>Search Metadata</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(document.searchData).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between py-1">
                        <span className="text-sm text-gray-600 capitalize">
                          {key.replace(/_/g, ' ')}:
                        </span>
                        <span className="text-sm font-medium max-w-xs truncate">
                          {typeof value === 'string' ? value : JSON.stringify(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* General Metadata */}
            {document.metadata && Object.keys(document.metadata).length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-sm">
                    <Hash size={16} />
                    <span>Additional Metadata</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(document.metadata).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between py-1">
                        <span className="text-sm text-gray-600 capitalize">
                          {key.replace(/_/g, ' ')}:
                        </span>
                        <span className="text-sm font-medium max-w-xs truncate">
                          {typeof value === 'string' ? value : JSON.stringify(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Source URL */}
            {document.sourceUrl && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-sm">
                    <ExternalLink size={16} />
                    <span>Source</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(document.sourceUrl, '_blank')}
                  >
                    <ExternalLink size={14} className="mr-2" />
                    Open Source Document
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* X-Ray analysis button */}
      {!isAnalyzed && !isXRayLoading && (
        <div className="p-4 border-t">
          <button
            onClick={() => onStartXRayAnalysis(document.id.toString())}
            className="flex items-center px-3 py-2 bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
          >
            <Zap size={14} className="mr-2" />
            Start X-Ray Analysis
          </button>
        </div>
      )}

      {isXRayLoading && (
        <div className="p-4 border-t flex items-center text-yellow-600">
          <Loader2 size={14} className="animate-spin mr-2" />
          Analyzing document...
        </div>
      )}
    </div>
  );
};

export default DocumentDetail;