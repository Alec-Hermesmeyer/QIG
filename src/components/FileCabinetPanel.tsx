"use client";

import React, { useEffect, useState } from 'react';
import {
  Panel,
  PanelType,
  Stack,
  Text,
  DefaultButton,
  Spinner,
  MessageBar,
  MessageBarType,
  DetailsList,
  IColumn,
  SelectionMode,
  ProgressIndicator,
  SearchBox,
  IIconProps,
  Modal
} from '@fluentui/react';
import { getCitationFilePath } from '@/lib/api';

const viewIcon: IIconProps = { iconName: 'View' };
const analyzeIcon: IIconProps = { iconName: 'Insights' };
const refreshIcon: IIconProps = { iconName: 'Refresh' };

interface FileCabinetPanelProps {
  isOpen: boolean;
  onDismiss: () => void;
  onRunAnalysis: (fileName: string, analysisResult: any, citationUrl: string) => void;
  
}

export const FileCabinetPanel: React.FC<FileCabinetPanelProps> = ({ 
  isOpen, 
  onDismiss, 
  onRunAnalysis 
}) => {
  const [files, setFiles] = useState<string[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>("");
  const [sortAscending, setSortAscending] = useState<boolean>(true);
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [iframeLoading, setIframeLoading] = useState<boolean>(false);
  const [iframeError, setIframeError] = useState<boolean>(false);

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/list_uploaded", {
        method: "GET"
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        setFiles(data);
      } else {
        throw new Error("Unexpected response format");
      }
    } catch (err: any) {
      console.error("Failed to fetch files:", err);
      setError(err.message || "Failed to fetch files.");
    } finally {
      setLoading(false);
    }
  };
  
  const getDocumentUrl = (fileName: string) => {
    return getCitationFilePath(fileName);
  };

  const toggleSort = () => {
    setSortAscending(!sortAscending);
  };

  const handleViewDocument = (fileName: string) => {
    setViewingFile(fileName);
    setIframeLoading(true);
    setIframeError(false);
    setIsViewerOpen(true);
  };

  // Handle iframe load success
  const handleIframeLoad = () => {
    setIframeLoading(false);
  };

  // Handle iframe load error
  const handleIframeError = () => {
    setIframeLoading(false);
    setIframeError(true);
  };

  // Close document viewer
  const closeViewer = () => {
    setIsViewerOpen(false);
    setViewingFile(null);
  };

  // Reset error state
  const clearError = () => {
    setError(null);
  };

  // New simplified function for document analysis via chat
  const handleAnalyzeDocument = (fileName: string) => {
    // Create a prompt for contract analysis
    const contractAnalysisPrompt = `Please analyze this document ${fileName} and provide:
1. A summary of the key points
2. The main parties involved
3. Important dates mentioned
4. Key obligations and rights
5. Any potential issues or areas of concern`;

    // Create a dummy analysis result to maintain compatibility
    const dummyAnalysisResult = {
      summary: contractAnalysisPrompt,
      keywords: [],
      entities: {},
      metadata: {
        fileName: fileName
      }
    };

    // Call the existing onRunAnalysis function
    const citationUrl = getCitationFilePath(fileName);
    onRunAnalysis(fileName, dummyAnalysisResult, citationUrl);
    
    // Close the panel after sending
    onDismiss();
  };

  useEffect(() => {
    if (isOpen) fetchFiles();
  }, [isOpen]);

  useEffect(() => {
    let result = [...files];
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      result = result.filter(file => file.toLowerCase().includes(lowerSearch));
    }
    result.sort((a, b) => sortAscending ? a.localeCompare(b) : b.localeCompare(a));
    setFilteredFiles(result);
  }, [files, searchText, sortAscending]);

  const columns: IColumn[] = [
    {
      key: 'filename',
      name: 'File Name',
      fieldName: 'name',
      minWidth: 200,
      isResizable: true,
      isSorted: true,
      isSortedDescending: !sortAscending,
      onColumnClick: toggleSort,
    },
    {
      key: 'actions',
      name: 'Actions',
      minWidth: 200,
      onRender: (item: { name: string }) => (
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <DefaultButton
            text="View"
            iconProps={viewIcon}
            onClick={() => handleViewDocument(item.name)}
            styles={{ root: { minWidth: 80 } }}
          />
          <DefaultButton
            text="Analyze"
            iconProps={analyzeIcon}
            onClick={() => handleAnalyzeDocument(item.name)}
            styles={{ root: { minWidth: 90 } }}
          />
        </Stack>
      ),
    },
  ];

  const fileItems = filteredFiles.map(name => ({ name }));

  return (
    <Panel
      isOpen={isOpen}
      onDismiss={onDismiss}
      type={PanelType.large}
      headerText="Contract File Cabinet"
      closeButtonAriaLabel="Close"
    >
      <Stack tokens={{ childrenGap: 12 }}>
        <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
          <Text variant="large">{files.length > 0 ? `${files.length} files found` : "File Cabinet"}</Text>
          <DefaultButton
            text="Refresh"
            iconProps={refreshIcon}
            onClick={fetchFiles}
            disabled={loading}
          />
        </Stack>

        <SearchBox
          placeholder="Search files..."
          onChange={(_, newValue) => setSearchText(newValue || "")}
          disabled={loading || files.length === 0}
        />

        {loading && <ProgressIndicator label="Fetching files..." />}

        {error && (
          <MessageBar messageBarType={MessageBarType.error} onDismiss={clearError} isMultiline>
            {error}
          </MessageBar>
        )}

        <DetailsList
          items={fileItems}
          columns={columns}
          selectionMode={SelectionMode.none}
        />

        {searchText && files.length > 0 && (
          <Text>
            Showing {filteredFiles.length} of {files.length} files
          </Text>
        )}
      </Stack>

      {/* Document Viewer Modal */}
      <Modal
        isOpen={isViewerOpen && !!viewingFile}
        onDismiss={closeViewer}
        isBlocking={false}
        styles={{
          main: { 
            width: '95%',
            height: '95%',
            maxWidth: '1600px',
            maxHeight: '95vh',
            padding: 0,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          },
          scrollableContent: {
            height: '100%',
            padding: 0
          }
        }}
      >
        <Stack styles={{ root: { height: '100%' } }}>
          {/* Modal header */}
          <Stack 
            horizontal 
            horizontalAlign="space-between" 
            verticalAlign="center"
            styles={{ 
              root: { 
                padding: '8px 16px',
                borderBottom: '1px solid #e5e7eb',
                backgroundColor: '#f9fafb',
                minHeight: '44px',
                height: '44px'
              } 
            }}
          >
            <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
              {viewingFile}
            </Text>
            <DefaultButton 
              onClick={closeViewer}
              styles={{ root: { minWidth: '60px', height: '32px' } }}
            >
              Close
            </DefaultButton>
          </Stack>
          
          {/* Modal content */}
          <Stack.Item grow styles={{ root: { position: 'relative', height: 'calc(100% - 44px)' } }}>
            {/* Loading spinner */}
            {iframeLoading && (
              <Stack 
                horizontalAlign="center" 
                verticalAlign="center"
                styles={{
                  root: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(255,255,255,0.8)',
                    zIndex: 10
                  }
                }}
              >
                <Spinner label="Loading document..." />
              </Stack>
            )}
            
            {/* Error message */}
            {iframeError && (
              <Stack
                horizontalAlign="center"
                verticalAlign="center"
                styles={{
                  root: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: '#f9fafb',
                    padding: 20
                  }
                }}
              >
                <MessageBar
                  messageBarType={MessageBarType.error}
                  isMultiline={true}
                >
                  <Text>Failed to load document. The file may not be available or you may not have permission to view it.</Text>
                </MessageBar>
              </Stack>
            )}
            
            {/* Document iframe */}
            <div style={{ height: '100%', width: '100%' }}>
              {viewingFile && (
                <iframe
                  src={getDocumentUrl(viewingFile)}
                  width="100%"
                  height="100%"
                  style={{ 
                    border: 'none', 
                    display: 'block',
                    backgroundColor: '#f9fafb'
                  }}
                  title="Document Viewer"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                />
              )}
            </div>
          </Stack.Item>
        </Stack>
      </Modal>
    </Panel>
  );
};