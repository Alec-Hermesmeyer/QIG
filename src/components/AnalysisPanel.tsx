import { useState, useEffect } from "react";
import {
  Panel,
  PanelType,
  Pivot,
  PivotItem,
  Stack,
  Text,
  Spinner,
  MessageBar,
  MessageBarType,
  DefaultButton,
} from "@fluentui/react";
import { AnalysisPanelTabs } from "./AnalysisPanelTabs";
import { ThoughtProcess } from "@/components/ThoughtProcess";
import { EnhancedSupportingContent } from "@/components/SupportingContent";
import { MarkdownViewer } from "@/components/MarkdownViewer";
import { DocumentExcerptViewer } from "@/components/DocumentExcerptViewer";
import { GraphVisualization } from "@/components/GraphVisualization";
import { initializeIcons } from '@fluentui/font-icons-mdl2';
import { getCitationFilePath } from "@/lib/api";
import { FileText, AlertTriangle, FileImage, FileBadge } from "lucide-react";

// Initialize Fluent UI icons
initializeIcons();

const FILE_VIEWER_TAB = "fileViewer";

interface AnalysisPanelProps {
  isOpen: boolean;
  onDismiss: () => void;
  className?: string;
  activeTab?: string;
  onActiveTabChanged?: (tab: string) => void;
  activeCitation?: string;
  onActiveCitationChanged?: (citation: string) => void;
  citationHeight?: string;
  response?: any;
  mostRecentUserMessage?: string;
  contractFileName?: string;
  customPanelContent?: React.ReactNode; // Add support for custom panel content
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  isOpen,
  onDismiss,
  response,
  activeTab: externalActiveTab,
  activeCitation,
  onActiveCitationChanged,
  citationHeight = "500px",
  className = "",
  onActiveTabChanged,
  mostRecentUserMessage,
  contractFileName,
  customPanelContent, // New prop for custom panel content
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<string>(
    AnalysisPanelTabs.ThoughtProcessTab
  );
  const [internalActiveCitation, setInternalActiveCitation] = useState<string | undefined>(
    activeCitation
  );
  const [fileContent, setFileContent] = useState<string>("");
  const [fileLoading, setFileLoading] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [citationLoading, setCitationLoading] = useState<boolean>(false);
  const [citationError, setCitationError] = useState<string | null>(null);
  const [displayFullResponse, setDisplayFullResponse] = useState<boolean>(true);
  const [documentExcerpts, setDocumentExcerpts] = useState<any[]>([]);
  
  // GroundX document state - moved to the top level
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [documentInfo, setDocumentInfo] = useState<any>(null);

  // Use either the external or internal active tab
  const activeTab = externalActiveTab || internalActiveTab;
  
  // Use either the external or internal active citation
  const currentActiveCitation = activeCitation || internalActiveCitation;
  
  // Check if a citation is a GroundX document ID
  const isGroundXDocument = (citation: string): boolean => {
    if (!citation) return false;
    
    // Check direct GroundX format
    if (citation.startsWith('groundx:')) return true;
    
    // Check numeric or UUID format (common for document IDs)
    if (/^[0-9]+$/.test(citation) || 
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(citation)) {
      return true;
    }
    
    return false;
  };
  
  // Get file type based on citation or extension
  const getFileType = (citation: string): string => {
    if (!citation) return 'unknown';
    
    // Check if this is a GroundX document
    if (isGroundXDocument(citation)) return 'groundx';
    
    // Otherwise get the file extension
    const extension = citation.split('.').pop()?.toLowerCase() || 'unknown';
    return extension;
  };

  // Extract document excerpts if they exist in the response - ENHANCED to support GroundX format
  useEffect(() => {
    if (response) {
      console.log("Analyzing response to extract document excerpts:", response);
      
      // Extract document excerpts if they exist directly in the response
      if (response.documentExcerpts && Array.isArray(response.documentExcerpts)) {
        console.log("Found documentExcerpts in the response:", response.documentExcerpts.length);
        setDocumentExcerpts(response.documentExcerpts);
      } 
      // Check for GroundX format with documents in result
      else if (response.result?.documents && Array.isArray(response.result.documents)) {
        console.log("Found documents in result:", response.result.documents.length);
        const excerpts = response.result.documents.map((doc: any) => ({
          id: doc.id || '',
          fileName: doc.fileName || doc.name || 'Unknown document',
          excerpts: doc.snippets || doc.excerpts || [],
          narrative: doc.narrative || [],
          metadata: doc.metadata || {}
        }));
        
        if (excerpts.length > 0) {
          setDocumentExcerpts(excerpts);
        }
      }
      // Check for raw GroundX format 
      else if (response.rawResponse?.result?.documents && Array.isArray(response.rawResponse.result.documents)) {
        console.log("Found documents in rawResponse.result:", response.rawResponse.result.documents.length);
        const excerpts = response.rawResponse.result.documents.map((doc: any) => ({
          id: doc.id || '',
          fileName: doc.fileName || doc.name || 'Unknown document',
          excerpts: doc.snippets || doc.excerpts || [],
          narrative: doc.narrative || [],
          metadata: doc.metadata || {}
        }));
        
        if (excerpts.length > 0) {
          setDocumentExcerpts(excerpts);
        }
      }
      // Check for enhancedResults sources
      else if (response.enhancedResults?.sources || response.rawResponse?.enhancedResults?.sources) {
        const sources = response.enhancedResults?.sources || response.rawResponse?.enhancedResults?.sources;
        console.log("Found sources in enhancedResults:", sources?.length);
        
        if (sources && Array.isArray(sources)) {
          const excerpts = sources
            .filter((source: any) => source.id) // Only include sources with an ID
            .map((source: any) => ({
              id: source.id || '',
              fileName: source.fileName || 'Unknown document',
              excerpts: source.extractedSections || source.snippets || [],
              narrative: source.narrative || [],
              metadata: source.metadata || {}
            }));
          
          if (excerpts.length > 0) {
            setDocumentExcerpts(excerpts);
          }
        }
      }
      // Check for supporting content
      else if (response.supportingContent && response.supportingContent.text) {
        console.log("Found text in supporting content");
        // Try to extract document excerpts from supporting content
        const supportingContentExcerpts = extractExcerptsFromSupportingContent(response.supportingContent);
        if (supportingContentExcerpts.length > 0) {
          setDocumentExcerpts(supportingContentExcerpts);
        }
      }
    }
  }, [response]);
  
  // Helper function to extract excerpts from supporting content
  const extractExcerptsFromSupportingContent = (supportingContent: any): any[] => {
    if (!supportingContent || !supportingContent.text || !Array.isArray(supportingContent.text)) {
      return [];
    }
    
    const excerpts: any[] = [];
    const processedDocs = new Set<string>();
    
    supportingContent.text.forEach((item: string) => {
      // Check if the item follows the pattern "filename.ext: content"
      const colonMatch = item.match(/^([\w\s-]+\.(pdf|docx|xlsx|txt|csv|json|js|html))\s*:\s*(.+)$/s);
      
      if (colonMatch) {
        const fileName = colonMatch[1];
        const content = colonMatch[3];
        
        // Skip if we already processed this document
        if (processedDocs.has(fileName)) {
          return;
        }
        
        // Add to the list of processed documents
        processedDocs.add(fileName);
        
        // Create a document excerpt
        excerpts.push({
          id: fileName,
          fileName: fileName,
          excerpts: [content],
          narrative: [],
          metadata: {}
        });
      }
    });
    
    return excerpts;
  };

  // Update internal state when props change
  useEffect(() => {
    if (activeCitation !== undefined) {
      setInternalActiveCitation(activeCitation);
    }
  }, [activeCitation]);

  useEffect(() => {
    if ((activeTab === FILE_VIEWER_TAB || !activeTab) && contractFileName) {
      fetchFileContent(contractFileName);
    }
  }, [activeTab, contractFileName]);

  useEffect(() => {
    if (activeTab === AnalysisPanelTabs.CitationTab && currentActiveCitation) {
      setCitationLoading(true);
      setCitationError(null);
      
      // Handle different document types
      if (isGroundXDocument(currentActiveCitation)) {
        // For GroundX documents, fetch document info
        fetchGroundXDocumentInfo(currentActiveCitation);
      } else {
        // For regular documents, just show a loading indicator briefly
        const timer = setTimeout(() => setCitationLoading(false), 500);
        return () => clearTimeout(timer);
      }
    }
  }, [activeTab, currentActiveCitation]);
  
  // Fetch GroundX document info
  const fetchGroundXDocumentInfo = async (citation: string) => {
    try {
      // Get the document ID from the citation
      let documentId = citation;
      if (citation.startsWith('groundx:')) {
        documentId = citation.replace('groundx:', '');
      }
      
      // Fetch document info from the API
      const response = await fetch(`/api/groundx/document-info/${documentId}`);
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || `Failed to load document: ${response.statusText}`);
      }
      
      setDocumentInfo(data.document);
      setViewerUrl(data.document.viewerUrl);
      setCitationLoading(false);
    } catch (err) {
      console.error('Error loading document info:', err);
      setCitationError(
        err instanceof Error ? err.message : 'Failed to load document information'
      );
      setCitationLoading(false);
    }
  };

  const fetchFileContent = async (fileName: string) => {
    if (!fileName) return;
    try {
      setFileLoading(true);
      setFileError(null);
      const res = await fetch(`/api/proxy-content?filename=${encodeURIComponent(fileName)}`);
      if (!res.ok) throw new Error(`Failed to fetch file content: ${res.status} ${res.statusText}`);
      const text = await res.text();
      setFileContent(text);
    } catch (err: any) {
      console.error("Error fetching file content:", err);
      setFileError(err.message || "Failed to load file content");
    } finally {
      setFileLoading(false);
    }
  };

  const handleTabChange = (item?: PivotItem) => {
    const tabKey = item?.props.itemKey || AnalysisPanelTabs.ThoughtProcessTab;
    if (onActiveTabChanged) {
      onActiveTabChanged(tabKey);
    } else {
      setInternalActiveTab(tabKey);
    }
  };

  // Function to handle citation changes
  const handleCitationChange = (citation: string) => {
    // Reset document state when citation changes
    setViewerUrl(null);
    setDocumentInfo(null);
    
    // Update external state if callback provided
    if (onActiveCitationChanged) {
      onActiveCitationChanged(citation);
    } else {
      // Otherwise update internal state
      setInternalActiveCitation(citation);
    }
    
    // Switch to citation tab
    if (onActiveTabChanged) {
      onActiveTabChanged(AnalysisPanelTabs.CitationTab);
    } else {
      setInternalActiveTab(AnalysisPanelTabs.CitationTab);
    }
  };

  // Create enriched data points with full context from documents
  const createEnrichedDataPoints = () => {
    // Real data processing starts here
    if (!response) return null;

    // Check for GroundX format first
    if (response.supportingContent) {
      return response.supportingContent;
    }
    
    if (response.rawResponse?.supportingContent) {
      return response.rawResponse.supportingContent;
    }
    
    // If we already have structured data_points, use them but check if they're too small
    if (response.context?.data_points?.text) {
      const existingText = response.context.data_points.text;
      
      // Check if text items are very short snippets
      const hasShortSnippets = existingText.some((item: string) => {
        const parts = item.split(":");
        return parts.length > 1 && parts[1].trim().length < 100;
      });
      
      // If they seem complete enough, use as-is
      if (!hasShortSnippets) {
        return response.context.data_points;
      }
    }
    
    // If we have no structured data or snippets are too short, extract from content
    if (response.content) {
      const content = response.content;
      const citedDocuments = extractCitedDocuments(content);
      
      // If we have document excerpts from the paste.txt, enrich with those
      const documentContent = getDocumentContentFromPaste();
      if (documentContent && Object.keys(documentContent).length > 0) {
        return createDataPointsFromDocumentContent(citedDocuments, documentContent);
      }
      
      // Extract citations with context from content
      if (citedDocuments.length > 0) {
        return {
          text: extractFullCitationsFromContent(content, citedDocuments)
        };
      }
    }
    
    // If we only have the context and data_points (even if small)
    if (response.context?.data_points) {
      return response.context.data_points;
    }
    
    return null;
  };
  
  // Extract document names cited in response - with support for GroundX IDs
  const extractCitedDocuments = (content: string): string[] => {
    if (!content || typeof content !== 'string') return [];
    
    // Standard file citations [filename.ext]
    const citationRegex = /\[([\w\s-]+\.(pdf|docx|xlsx|txt|csv))\]/gi;
    const fileMatches = [...content.matchAll(citationRegex)];
    const fileCitations = [...new Set(fileMatches.map(match => match[1]))];
    
    // GroundX document ID citations [groundx:1234]
    const groundXRegex = /\[groundx:([0-9a-f-]+)\]/gi;
    const groundXMatches = [...content.matchAll(groundXRegex)];
    const groundXCitations = [...new Set(groundXMatches.map(match => `groundx:${match[1]}`))];
    
    // Combine both types of citations
    return [...fileCitations, ...groundXCitations];
  };
  
  // Extract fuller citations from content
  const extractFullCitationsFromContent = (content: string, documents: string[]): string[] => {
    const textItems: string[] = [];
    
    documents.forEach(doc => {
      // Check if this is a GroundX document ID
      const isGroundX = doc.startsWith('groundx:');
      
      // Escape special regex characters in document name
      const escapedDoc = doc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // For GroundX documents, look for [groundx:id] pattern
      // For regular files, look for [filename.ext] pattern
      const patternToFind = isGroundX ? `\\[${escapedDoc}\\]` : `\\[${escapedDoc}\\]`;
      const regex = new RegExp(`(.*?${patternToFind}.*?)(?=\\[|$)`, 'gs');
      
      const matches = [...content.matchAll(regex)];
      
      if (matches.length > 0) {
        // Get the longest match for better context
        const longestMatch = matches.reduce((longest, current) => 
          current[1].length > longest[1].length ? current : longest
        );
        
        // Clean up the citation to make a nice excerpt
        const cleanedCitation = longestMatch[1]
          .replace(`[${doc}]`, '')
          .trim();
        
        textItems.push(`${doc}: ${cleanedCitation}`);
      } else {
        textItems.push(`${doc}: Referenced in the response.`);
      }
    });
    
    return textItems;
  };
  
  // Get document content from the paste.txt document
  const getDocumentContentFromPaste = () => {
    // This is where we would extract content from the paste.txt document
    // For now, return minimal document content structure to avoid errors
    return {};
  };
  
  // Create data points from document content
  const createDataPointsFromDocumentContent = (
    citedDocuments: string[], 
    documentContent: {[key: string]: string}
  ) => {
    const textItems: string[] = [];
    
    citedDocuments.forEach(docName => {
      // Check if this is a GroundX citation
      const isGroundX = docName.startsWith('groundx:');
      
      if (isGroundX) {
        // For GroundX documents, we may not have content in documentContent
        // Just add a reference - actual content will be fetched when viewing
        textItems.push(`${docName}: Referenced in the response.`);
        return;
      }
      
      // For regular documents, process as before
      const content = documentContent[docName];
      if (!content) {
        textItems.push(`${docName}: Referenced in the response.`);
        return;
      }
      
      // Process paragraphs as before
      const paragraphs = content.split(/\n\n|\.\s+(?=[A-Z])/g)
        .filter(para => para.trim().length > 0)
        .slice(0, 5); // Limit to 5 paragraphs per document
      
      paragraphs.forEach(para => {
        // Only add reasonably sized paragraphs
        if (para.length > 50) {
          textItems.push(`${docName}: ${para.trim()}`);
        }
      });
    });
    
    return { text: textItems };
  };

  // ENHANCED to support different thought process format in GroundX
  const getResponseData = () => {
    if (!response) return { thoughts: [], data_points: null, graphData: null };
    
    // Extract thoughts from response - ENHANCED to support GroundX format
    let thoughts: any[] = [];
    
    // Check for thoughts directly in the response (GroundX format)
    if (response.thoughts) {
      console.log("Found thoughts directly in response", response.thoughts);
      thoughts = response.thoughts;
    }
    // Check for thoughts in raw response (GroundX format)
    else if (response.rawResponse?.thoughts) {
      console.log("Found thoughts in rawResponse", response.rawResponse.thoughts);
      thoughts = response.rawResponse.thoughts;
    }
    // Check for thoughts in original format
    else if (response.context?.thoughts) {
      if (Array.isArray(response.context.thoughts)) {
        thoughts = response.context.thoughts;
      } else if (Array.isArray(response.context.thoughts[0]?.description)) {
        thoughts = response.context.thoughts[0].description
          .filter((item: any) => item.role === 'assistant' || item.role === 'user')
          .map((item: any) => item.content);
      }
    } else if (response?.content && typeof response.content === 'string') {
      // Create simple thoughts from content if none provided
      const content = response.content;
      const sentences = content.split(/(?<=\.)\s+/);
      thoughts = sentences.slice(0, Math.min(3, sentences.length));
    }
    
    // Get enhanced data points
    const data_points = createEnrichedDataPoints();
    
    // Extract graph data if available
    const graphData = response?.context?.graphData || null;
    
    return { thoughts, data_points, graphData };
  };

  const { thoughts, data_points, graphData } = getResponseData();
  const isDisabledGraphTab = !graphData;
  const showFileViewerTab = !!contractFileName;

  const handleIframeError = () => {
    setCitationError("Failed to load the document. The file may be corrupted or in an unsupported format.");
    setCitationLoading(false);
  };

  const handleIframeLoad = () => {
    setCitationLoading(false);
    setCitationError(null);
  };

  // Extract text content from supporting content items for highlighting
  const extractSearchTerms = () => {
    if (!mostRecentUserMessage) return [];
    
    const userMessage = mostRecentUserMessage.toLowerCase();
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'as', 'of']);
    const words = userMessage.split(/\s+/).filter(word => 
      word.length > 3 && !commonWords.has(word)
    );
    
    return [...new Set(words)].slice(0, 5);
  };

  // Get appropriate icon for file type
  const getFileIcon = (fileType: string, size: number = 48): React.ReactNode => {
    switch(fileType) {
      case 'groundx':
        return <FileBadge size={size} className="text-green-500" />;
      case 'pdf':
        return <FileText size={size} className="text-red-500" />;
      case 'docx':
      case 'doc':
        return <FileText size={size} className="text-blue-500" />;
      case 'xlsx':
      case 'xls':
      case 'csv':
        return <FileText size={size} className="text-green-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FileImage size={size} className="text-purple-500" />;
      default:
        return <FileText size={size} className="text-gray-400" />;
    }
  };

  // Render the full response panel with highlighted citations
  const renderResponsePanel = () => {
    if (!response?.content) return null;
    
    // Get the full response content and ensure it's a string
    const content = typeof response.content === 'string' ? response.content : String(response.content || '');
    
    // First highlight standard filename citations
    let highlightedContent = content.replace(
      /\[([\w\s-]+\.(pdf|docx|xlsx|txt|csv))\]/gi,
      '<span class="bg-blue-100 text-blue-800 px-1 rounded cursor-pointer" onclick="document.dispatchEvent(new CustomEvent(\'citationClick\', {detail: \'$1\'}))">[$1]</span>'
    );
    
    // Then highlight GroundX document citations
    highlightedContent = highlightedContent.replace(
      /\[groundx:([0-9a-f-]+)\]/gi,
      '<span class="bg-green-100 text-green-800 px-1 rounded cursor-pointer" onclick="document.dispatchEvent(new CustomEvent(\'citationClick\', {detail: \'groundx:$1\'}));">[Doc $1]</span>'
    );
    
    return (
      <div className="mb-4 p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Complete Response</h3>
          <button 
            onClick={() => setDisplayFullResponse(!displayFullResponse)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {displayFullResponse ? 'Hide' : 'Show'}
          </button>
        </div>
        
        {displayFullResponse && (
          <div 
            className="text-gray-700 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: highlightedContent }}
            ref={(el) => {
              // Add event listener for citation clicks in the response panel
              if (el) {
                document.addEventListener('citationClick', ((e: CustomEvent) => {
                  handleCitationChange(e.detail);
                }) as EventListener);
                
                return () => {
                  document.removeEventListener('citationClick', ((e: CustomEvent) => {
                    handleCitationChange(e.detail);
                  }) as EventListener);
                };
              }
            }}
          />
        )}
      </div>
    );
  };

  // Function to open document in external viewer
  const openExternalViewer = () => {
    if (viewerUrl) {
      window.open(viewerUrl, '_blank');
    }
  };

  // Find document excerpts for a citation
  const findDocumentExcerpts = (documentId?: string): any => {
    if (!documentId || !documentExcerpts.length) return null;
    
    // Check for direct ID match
    let docMatch = documentExcerpts.find(doc => doc.id === documentId);
    
    // For GroundX documents that might use the groundx: prefix
    if (!docMatch && documentId.startsWith('groundx:')) {
      const cleanId = documentId.replace('groundx:', '');
      docMatch = documentExcerpts.find(doc => doc.id === cleanId);
    }
    
    return docMatch;
  };

  // Render the document viewer
  const renderDocumentViewer = () => {
    if (!currentActiveCitation) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <FileText size={48} className="text-gray-400 mb-4" />
          <Text>Select a citation to view the document</Text>
        </div>
      );
    }
    
    const fileType = getFileType(currentActiveCitation);
    const isGroundX = isGroundXDocument(currentActiveCitation);
    
    // Extract document ID from citation
    const docId = isGroundX && currentActiveCitation.startsWith('groundx:') 
      ? currentActiveCitation.replace('groundx:', '') 
      : currentActiveCitation;
    
    // Find document excerpts for this citation
    const excerptData = findDocumentExcerpts(docId) || findDocumentExcerpts(currentActiveCitation);
    
    // For GroundX documents or if we have excerpts, prioritize showing the excerpts
    if ((isGroundX || fileType === 'groundx') && excerptData && 
        (excerptData.excerpts?.length > 0 || excerptData.narrative?.length > 0)) {
      return (
        <DocumentExcerptViewer
          documentId={docId}
          fileName={excerptData.fileName || documentInfo?.fileName || currentActiveCitation}
          excerpts={excerptData.excerpts || []}
          narrative={excerptData.narrative || []}
          highlight={extractSearchTerms()}
          metadata={excerptData.metadata || {}}
        />
      );
    }
    
    // For GroundX documents, we'll use the viewer URL if available
    // For regular documents, use the regular citation path
    const iframeSrc = isGroundX && viewerUrl ? 
      viewerUrl : 
      getCitationFilePath(currentActiveCitation);
      
    const isPdf = fileType === 'pdf' || (fileType === 'groundx' && currentActiveCitation.toLowerCase().endsWith('.pdf'));
    const iframeSupported = ['pdf'].includes(fileType) && !isGroundX;
    
    return (
      <div className="h-full flex flex-col">
        <div className={`p-3 border-b border-gray-200 flex justify-between items-center ${isGroundX ? 'bg-green-50' : 'bg-gray-100'}`}>
          <div className="flex items-center">
            {getFileIcon(fileType, 20)}
            <Text variant="mediumPlus" className="font-medium truncate max-w-md ml-2">
              {documentInfo?.fileName || excerptData?.fileName || currentActiveCitation}
            </Text>
          </div>
          
          {isGroundX && viewerUrl ? (
            <a 
              href={viewerUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm no-underline hover:underline"
            >
              View in GroundX
            </a>
          ) : (
            <a 
              href={iframeSrc} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm no-underline hover:underline"
            >
              Open in new tab
            </a>
          )}
        </div>
        
        {citationLoading && (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <Spinner label="Loading document..." />
          </div>
        )}
        
        {citationError && (
          <div className="flex-1 flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md text-center">
              <AlertTriangle size={48} className="text-amber-500 mx-auto mb-4" />
              <Text className="text-gray-700 mb-2 font-medium">Document Error</Text>
              <Text className="text-gray-600">{citationError}</Text>
              {isGroundX && viewerUrl && (
                <DefaultButton 
                  className="mt-4"
                  text="Open in GroundX" 
                  onClick={openExternalViewer}
                />
              )}
              <DefaultButton 
                className="mt-4"
                text="Try again" 
                onClick={() => {
                  setCitationError(null);
                  setCitationLoading(true);
                  if (isGroundX) {
                    fetchGroundXDocumentInfo(currentActiveCitation);
                  }
                }}
              />
            </div>
          </div>
        )}
        
        {!citationLoading && !citationError && (
          <div className="flex-1 overflow-auto">
            {/* For GroundX with no excerpts, show info and external viewer button */}
            {isGroundX && !excerptData ? (
              <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-4">
                <div className="max-w-lg text-center">
                  <FileText size={64} className="text-green-500 mx-auto mb-4" />
                  <Text className="text-lg font-medium mb-2">
                    {documentInfo?.fileName || currentActiveCitation}
                  </Text>
                  
                  <Text className="text-gray-600 mb-4">
                    This document was referenced but no excerpts are available. 
                    The document can only be viewed in the GroundX platform.
                  </Text>
                  
                  {viewerUrl && (
                    <DefaultButton 
                      primary
                      text="Open Document in GroundX" 
                      onClick={openExternalViewer}
                    />
                  )}
                </div>
              </div>
            ) : 
            /* For PDFs, use iframe */
            iframeSupported || isPdf ? (
              <iframe
                src={iframeSrc}
                width="100%"
                height="100%"
                style={{ border: 'none', backgroundColor: '#f9fafb', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)' }}
                title="Document Viewer"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
              />
            ) : 
            /* For text files, use markdown viewer */
            (
              <div className="flex-1 overflow-auto">
                <MarkdownViewer src={iframeSrc} />
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Determine if we have any supporting content to display
  const hasContent = data_points !== null;

  return (
    <Panel
      isOpen={isOpen}
      onDismiss={onDismiss}
      type={PanelType.large}
      headerText="Analysis Panel"
      closeButtonAriaLabel="Close"
      className={className}
      styles={{
        closeButton: {
          color: "#1F2937",
          selectors: { ":hover": { color: "#111827" } },
        },
        main: { overflow: "hidden" },
        contentInner: { height: "calc(100vh - 70px)" },
      }}
    >
      <Pivot selectedKey={activeTab} onLinkClick={handleTabChange}>
        {showFileViewerTab && (
          <PivotItem headerText="Contract File" itemKey={FILE_VIEWER_TAB}>
            <Stack tokens={{ childrenGap: 10 }} styles={{ root: { height: "calc(100vh - 120px)", overflow: "hidden" } }}>
              <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                <Text variant="large" className="font-semibold">{contractFileName}</Text>
                <DefaultButton
                  text="Refresh"
                  iconProps={{ iconName: 'Refresh' }}
                  onClick={() => contractFileName && fetchFileContent(contractFileName)}
                  disabled={fileLoading}
                />
              </Stack>
              {fileLoading && <Spinner label="Loading file content..." />}
              {fileError && (
                <MessageBar
                  messageBarType={MessageBarType.error}
                  isMultiline={true}
                  dismissButtonAriaLabel="Close"
                  onDismiss={() => setFileError(null)}
                >
                  {fileError}
                </MessageBar>
              )}
              {!fileLoading && !fileError && fileContent && (
                <div className="overflow-auto p-4 border border-gray-200 rounded bg-white" style={{ height: "100%", maxHeight: "calc(100vh - 180px)" }}>
                  <pre className="whitespace-pre-wrap font-mono text-sm">{fileContent}</pre>
                </div>
              )}
              {!fileLoading && !fileError && !fileContent && (
                <MessageBar messageBarType={MessageBarType.warning}>
                  No file content available. This could be due to file format limitations or access restrictions.
                </MessageBar>
              )}
            </Stack>
          </PivotItem>
        )}
        <PivotItem headerText="Thought Process" itemKey={AnalysisPanelTabs.ThoughtProcessTab}>
          <div className="h-[calc(100vh-160px)] overflow-auto p-4">
            {mostRecentUserMessage && (
              <div className="bg-blue-50 p-3 rounded border border-blue-100 mb-4">
                <p className="text-base font-medium text-blue-800 mb-1">Last user query:</p>
                <p className="text-sm text-blue-900">{mostRecentUserMessage}</p>
              </div>
            )}
            {/* Use custom panel content if provided */}
            {customPanelContent && activeTab === AnalysisPanelTabs.ThoughtProcessTab ? (
              customPanelContent
            ) : Array.isArray(thoughts) && thoughts.length > 0 ? (
              <ThoughtProcess thoughts={thoughts} />
            ) : (
              <div className="flex flex-col items-center justify-center h-60 text-gray-500">
                <Text className="text-center py-10">No thought process information available</Text>
              </div>
            )}
          </div>
        </PivotItem>
        <PivotItem headerText="Supporting Content" itemKey={AnalysisPanelTabs.SupportingContentTab}>
          <div className="h-[calc(100vh-160px)] overflow-auto p-4">
            {/* Use custom panel content if provided */}
            {customPanelContent && activeTab === AnalysisPanelTabs.SupportingContentTab ? (
              customPanelContent
            ) : (
              <>
                {/* Complete response with highlighted citations */}
                {response?.content && renderResponsePanel()}
                
                {/* Supporting content */}
                {hasContent ? (
                  <EnhancedSupportingContent 
                    supportingContent={data_points} 
                    highlightTerms={extractSearchTerms()}
                    onFileClick={(filename) => {
                      // Pass the filename to our citation handler
                      handleCitationChange(filename);
                    }}
                    useAutoHighlighting={true}
                    // Pass additional GroundX props
                    enhancedResults={response?.enhancedResults || response?.rawResponse?.enhancedResults}
                    groundXDocuments={response?.result?.documents || response?.rawResponse?.result?.documents}
                    rawResponse={response?.rawResponse || response}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-60 text-gray-500">
                    <FileText size={32} className="mb-4" />
                    <Text>No supporting content available</Text>
                    <Text className="mt-2 text-sm text-gray-400">
                      No citations were found in the response.
                    </Text>
                  </div>
                )}
              </>
            )}
          </div>
        </PivotItem>
        <PivotItem headerText="Citation" itemKey={AnalysisPanelTabs.CitationTab}>
          <div style={{ height: "calc(100vh - 160px)", overflow: "hidden" }}>
            {currentActiveCitation ? renderDocumentViewer() : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <FileText size={48} className="text-gray-400 mb-4" />
                <Text>Select a citation to view the document</Text>
              </div>
            )}
          </div>
        </PivotItem>
        {!isDisabledGraphTab && (
          <PivotItem headerText="Graph" itemKey={AnalysisPanelTabs.GraphVisualization}>
            <div style={{ height: "calc(100vh - 160px)", overflow: "auto" }}>
              <GraphVisualization relations={data_points || []} />
            </div>
          </PivotItem>
        )}
      </Pivot>
    </Panel>
  );
};