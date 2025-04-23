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
import { GraphVisualization } from "@/components/GraphVisualization";
import { initializeIcons } from '@fluentui/font-icons-mdl2';
import { getCitationFilePath } from "@/lib/api";
import { FileText, AlertTriangle } from "lucide-react";

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

  // Use either the external or internal active tab
  const activeTab = externalActiveTab || internalActiveTab;
  
  // Use either the external or internal active citation
  const currentActiveCitation = activeCitation || internalActiveCitation;

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
      const timer = setTimeout(() => setCitationLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [activeTab, currentActiveCitation]);

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
  
  // Extract document names cited in response
  const extractCitedDocuments = (content: string): string[] => {
    if (!content) return [];
    
    const citationRegex = /\[([\w\s-]+\.(pdf|docx|xlsx|txt|csv))\]/gi;
    const matches = [...content.matchAll(citationRegex)];
    return [...new Set(matches.map(match => match[1]))];
  };
  
  // Extract fuller citations from content
  const extractFullCitationsFromContent = (content: string, documents: string[]): string[] => {
    const textItems: string[] = [];
    
    documents.forEach(doc => {
      // Escape special regex characters in document name
      const escapedDoc = doc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(.*?\\[${escapedDoc}\\].*?)(?=\\[|$)`, 'gs');
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
      const content = documentContent[docName];
      if (!content) {
        // If we don't have content for this document, just add a reference
        textItems.push(`${docName}: Referenced in the response.`);
        return;
      }
      
      // If we have content, break it up into paragraphs
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

  const getResponseData = () => {
    if (!response) return { thoughts: [], data_points: null, graphData: null };
    
    // Extract thoughts from response
    let thoughts: string[] = [];
    if (response.context?.thoughts) {
      if (Array.isArray(response.context.thoughts)) {
        thoughts = response.context.thoughts;
      } else if (Array.isArray(response.context.thoughts[0]?.description)) {
        thoughts = response.context.thoughts[0].description
          .filter((item: any) => item.role === 'assistant' || item.role === 'user')
          .map((item: any) => item.content);
      }
    } else if (response?.content) {
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
    setCitationError("Failed to load the PDF document. The file may be corrupted or in an unsupported format.");
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

  // Render the full response panel with highlighted citations
  const renderResponsePanel = () => {
    if (!response?.content) return null;
    
    // Get the full response content
    const content = response.content;
    
    // Highlight citations in the content
    const highlightedContent = content.replace(
      /\[([\w\s-]+\.(pdf|docx|xlsx|txt|csv))\]/gi,
      '<span class="bg-blue-100 text-blue-800 px-1 rounded cursor-pointer" onclick="document.dispatchEvent(new CustomEvent(\'citationClick\', {detail: \'$1\'}))">[$1]</span>'
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

  const renderPdfViewer = () => {
    if (!currentActiveCitation) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <FileText size={48} className="text-gray-400 mb-4" />
          <Text>Select a citation to view the document</Text>
        </div>
      );
    }
    const iframeSrc = getCitationFilePath(currentActiveCitation);
    return (
      <div className="h-full flex flex-col">
        <div className="bg-gray-100 p-3 border-b border-gray-200 flex justify-between items-center">
          <Text variant="mediumPlus" className="font-medium truncate max-w-md">
            {currentActiveCitation}
          </Text>
          <a 
            href={iframeSrc} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm no-underline hover:underline"
          >
            Open in new tab
          </a>
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
              <DefaultButton 
                className="mt-4"
                text="Try again" 
                onClick={() => {
                  setCitationError(null);
                  setCitationLoading(true);
                }}
              />
            </div>
          </div>
        )}
        <div 
          className={`flex-1 ${citationLoading || citationError ? 'hidden' : ''}`}
          style={{ height: citationError || citationLoading ? 0 : 'calc(100% - 50px)' }}
        >
          <iframe
            src={iframeSrc}
            width="100%"
            height="100%"
            style={{ border: 'none', backgroundColor: '#f9fafb', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)' }}
            title="Document Viewer"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        </div>
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
            {Array.isArray(thoughts) && thoughts.length > 0 ? (
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
          </div>
        </PivotItem>
        <PivotItem headerText="Citation" itemKey={AnalysisPanelTabs.CitationTab}>
          <div style={{ height: "calc(100vh - 160px)", overflow: "hidden" }}>
            {currentActiveCitation?.toLowerCase().endsWith(".pdf") ? (
              renderPdfViewer()
            ) : currentActiveCitation ? (
              <div className="h-full flex flex-col">
                <div className="bg-gray-100 p-3 border-b border-gray-200">
                  <Text variant="mediumPlus" className="font-medium">{currentActiveCitation}</Text>
                </div>
                <div className="flex-1 overflow-auto">
                  <MarkdownViewer src={getCitationFilePath(currentActiveCitation)} />
                </div>
              </div>
            ) : (
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