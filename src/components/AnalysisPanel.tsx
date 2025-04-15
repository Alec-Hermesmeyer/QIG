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
  Link,
} from "@fluentui/react";
import { AnalysisPanelTabs } from "./AnalysisPanelTabs";
import { ThoughtProcess } from "@/components/ThoughtProcess";
import { SupportingContent } from "@/components/SupportingContent";
import { MarkdownViewer } from "@/components/MarkdownViewer";
import { GraphVisualization } from "@/components/GraphVisualization";
import { initializeIcons } from '@fluentui/font-icons-mdl2';
import { getCitationFilePath } from "@/lib/api";

// Initialize Fluent UI icons
initializeIcons();

// Add a new tab ID for the file viewer
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
  contractFileName?: string; // Add this prop for current contract file
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

  const activeTab = externalActiveTab || internalActiveTab;

  // Fetch file content when tab changes to file viewer or when contractFileName changes
  useEffect(() => {
    if ((activeTab === FILE_VIEWER_TAB || !activeTab) && contractFileName) {
      fetchFileContent(contractFileName);
    }
  }, [activeTab, contractFileName]);

  const fetchFileContent = async (fileName: string) => {
    if (!fileName) return;

    try {
      setFileLoading(true);
      setFileError(null);

      const res = await fetch(`/api/proxy-content?filename=${encodeURIComponent(fileName)}`);

      if (!res.ok) {
        throw new Error(`Failed to fetch file content: ${res.status} ${res.statusText}`);
      }

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

  const getResponseData = () => {
    if (!response) return { thoughts: [], data_points: [], graphData: null };

    if (response.context) {
      return {
        thoughts: response.context.thoughts || [],
        data_points: response.context.data_points || [],
        graphData: response.context.graphData || null,
      };
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
        return { thoughts: [], data_points: [], graphData: null };
      }
    }

    if (typeof response === "object") {
      return {
        thoughts: response.thoughts || [],
        data_points: response.data_points || [],
        graphData: response.graphData || null,
      };
    }

    return { thoughts: [], data_points: [], graphData: null };
  };

  const { thoughts, data_points, graphData } = getResponseData();
  const isDisabledGraphTab = !graphData;

  // Determine if we should show the file viewer tab
  const showFileViewerTab = !!contractFileName;

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
          color: "#1F2937", // dark gray
          selectors: {
            ":hover": {
              color: "#111827", // darker on hover
            },
          },
        },
        main: {
          overflow: "hidden", // Prevent double scrollbars
        },
        contentInner: {
          height: "calc(100vh - 70px)", // Adjust based on your header height
        },
      }}
    >
      <Pivot selectedKey={activeTab} onLinkClick={handleTabChange}>
        {showFileViewerTab && (
          <PivotItem
            headerText="Contract File"
            itemKey={FILE_VIEWER_TAB}
          >
            <Stack tokens={{ childrenGap: 10 }} styles={{ root: { height: "calc(100vh - 120px)", overflow: "hidden" } }}>
              <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
                <Text variant="large" className="font-semibold">
                  {contractFileName}
                </Text>
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
                <div
                  className="overflow-auto p-4 border border-gray-200 rounded bg-white"
                  style={{ height: "100%", maxHeight: "calc(100vh - 180px)" }}
                >
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

        <PivotItem
          headerText="Thought Process"
          itemKey={AnalysisPanelTabs.ThoughtProcessTab}
        >
          <Stack tokens={{ childrenGap: 10 }} styles={{ root: { height: "calc(100vh - 120px)", overflow: "auto" } }}>
            {mostRecentUserMessage && (
              <Stack
                tokens={{ childrenGap: 4 }}
                className="bg-blue-50 p-3 rounded border border-blue-100"
              >
                <Text variant="mediumPlus" className="text-blue-800">
                  Last user query:
                </Text>
                <Text>{mostRecentUserMessage}</Text>
              </Stack>
            )}

            {Array.isArray(thoughts) && thoughts.length > 0 ? (
              <ThoughtProcess thoughts={thoughts} />
            ) : (
              <Text className="text-gray-500 text-center py-10">
                No thought process information available
              </Text>
            )}
          </Stack>
        </PivotItem>

        <PivotItem
          headerText="Supporting Content"
          itemKey={AnalysisPanelTabs.SupportingContentTab}
        >
          <div style={{ height: "calc(100vh - 120px)", overflow: "auto" }}>
            {data_points && (Array.isArray(data_points) || data_points?.text?.length > 0) ? (
              <SupportingContent supportingContent={data_points} />
            ) : (
              <Text className="text-gray-500 text-center py-10">
                No supporting content available
              </Text>
            )}
          </div>
        </PivotItem>

        <PivotItem headerText="Citation" itemKey={AnalysisPanelTabs.CitationTab}>
          <div style={{ height: "calc(100vh - 120px)", overflow: "auto" }}>
            {activeCitation?.toLowerCase().endsWith(".pdf") ? (
              <iframe
                src={getCitationFilePath(activeCitation)}
                width="100%"
                height={citationHeight}
                style={{ border: 'none' }}
                title="PDF Viewer"
              />
            ) : (
              <MarkdownViewer src={getCitationFilePath(activeCitation ?? "")} />
            )}
          </div>
        </PivotItem>

        {!isDisabledGraphTab && (
          <PivotItem
            headerText="Graph"
            itemKey={AnalysisPanelTabs.GraphVisualization}
          >
            <div style={{ height: "calc(100vh - 120px)", overflow: "auto" }}>
              <GraphVisualization relations={data_points || []} />
            </div>
          </PivotItem>
        )}
      </Pivot>
    </Panel>
  );
};