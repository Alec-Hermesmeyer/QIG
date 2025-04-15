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
import { SupportingContent } from "@/components/SupportingContent";
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
  citationHeight = "500px",
  className = "",
  onActiveTabChanged,
  mostRecentUserMessage,
  contractFileName,
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState<string>(
    AnalysisPanelTabs.ThoughtProcessTab
  );
  const [fileContent, setFileContent] = useState<string>("");
  const [fileLoading, setFileLoading] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [citationLoading, setCitationLoading] = useState<boolean>(false);
  const [citationError, setCitationError] = useState<string | null>(null);

  const activeTab = externalActiveTab || internalActiveTab;

  useEffect(() => {
    if ((activeTab === FILE_VIEWER_TAB || !activeTab) && contractFileName) {
      fetchFileContent(contractFileName);
    }
  }, [activeTab, contractFileName]);

  useEffect(() => {
    if (activeTab === AnalysisPanelTabs.CitationTab && activeCitation) {
      setCitationLoading(true);
      setCitationError(null);
      const timer = setTimeout(() => setCitationLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [activeTab, activeCitation]);

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
    onActiveTabChanged ? onActiveTabChanged(tabKey) : setInternalActiveTab(tabKey);
  };

  const getResponseData = () => {
    if (!response) return { thoughts: [], data_points: [], graphData: null };
    if (response.context) {
      return {
        thoughts: response.context.thoughts || [],
        data_points: response.context.data_points || [],
        graphData: response.context.graphData || null,
      };
    }
    if (typeof response.content === 'string') {
      const content = response.content;
      const sentences = content.split(/(?<=\.)\s+/);
      const thoughts = sentences.slice(0, 3);
      const citationRegex = /\[([\w\s-]+\.(pdf|docx|xlsx|txt|csv))\]/gi;
      const matches = [...content.matchAll(citationRegex)];
      const data_points = matches.map(match => `${match[1]}: Referenced in the response.`);
      return { thoughts, data_points, graphData: null };
    }
    if (response.message?.content) {
      try {
        const parsed = JSON.parse(response.message.content);
        return {
          thoughts: parsed.context?.thoughts || [],
          data_points: parsed.context?.data_points || [],
          graphData: parsed.context?.graphData || null,
        };
      } catch {
        const sentences = response.message.content.split(/(?<=\.)\s+/);
        const thoughts = sentences.slice(0, 3);
        return { thoughts, data_points: [], graphData: null };
      }
    }
    return { thoughts: [], data_points: [], graphData: null };
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

  const renderPdfViewer = () => {
    if (!activeCitation) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <FileText size={48} className="text-gray-400 mb-4" />
          <Text>Select a citation to view the document</Text>
        </div>
      );
    }
    const iframeSrc = getCitationFilePath(activeCitation);
    return (
      <div className="h-full flex flex-col">
        <div className="bg-gray-100 p-3 border-b border-gray-200 flex justify-between items-center">
          <Text variant="mediumPlus" className="font-medium truncate max-w-md">
            {activeCitation}
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
            {data_points && (Array.isArray(data_points) || data_points?.text?.length > 0) ? (
              <SupportingContent supportingContent={data_points} />
            ) : (
              <div className="flex flex-col items-center justify-center h-60 text-gray-500">
                <FileText size={32} className="mb-4" />
                <Text>No supporting content available</Text>
              </div>
            )}
          </div>
        </PivotItem>
        <PivotItem headerText="Citation" itemKey={AnalysisPanelTabs.CitationTab}>
          <div style={{ height: "calc(100vh - 160px)", overflow: "hidden" }}>
            {activeCitation?.toLowerCase().endsWith(".pdf") ? (
              renderPdfViewer()
            ) : activeCitation ? (
              <div className="h-full flex flex-col">
                <div className="bg-gray-100 p-3 border-b border-gray-200">
                  <Text variant="mediumPlus" className="font-medium">{activeCitation}</Text>
                </div>
                <div className="flex-1 overflow-auto">
                  <MarkdownViewer src={getCitationFilePath(activeCitation)} />
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
