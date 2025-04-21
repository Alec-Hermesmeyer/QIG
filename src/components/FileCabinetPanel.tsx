'use client';

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
  Modal,
  IIconProps,
} from '@fluentui/react';
import { Prompt } from '@/lib/prompt';
import { blobService } from '@/lib/blobService'; // Make sure this import is correct

// Icon definitions
const viewIcon: IIconProps = { iconName: 'View' };
const analyzeIcon: IIconProps = { iconName: 'Insights' };
const refreshIcon: IIconProps = { iconName: 'Refresh' };

interface FileCabinetPanelProps {
  isOpen: boolean;
  onDismiss: () => void;
  onRunAnalysis: (fileName: string, analysisResult: any, citationUrl: string) => void;
}

export const FileCabinetPanel: React.FC<FileCabinetPanelProps> = ({ isOpen, onDismiss, onRunAnalysis }) => {
  const [files, setFiles] = useState<string[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [analyzingFile, setAnalyzingFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadingMessage, setLoadingMessage] = useState<string>("Fetching files...");
  const [searchText, setSearchText] = useState<string>("");
  const [sortAscending, setSortAscending] = useState<boolean>(true);
  
  // Document viewer state
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [iframeLoading, setIframeLoading] = useState<boolean>(false);
  const [iframeError, setIframeError] = useState<boolean>(false);

  // Apply filters and sorting to files
  useEffect(() => {
    let result = [...files];
    
    // Apply search filter
    if (searchText) {
      const lowerSearch = searchText.toLowerCase();
      result = result.filter(file => 
        file.toLowerCase().includes(lowerSearch)
      );
    }
    
    // Apply sorting
    result = result.sort((a, b) => {
      return sortAscending 
        ? a.localeCompare(b) 
        : b.localeCompare(a);
    });
    
    setFilteredFiles(result);
  }, [files, searchText, sortAscending]);

  // Fetch files when panel opens
  useEffect(() => {
    if (isOpen) fetchFiles();
  }, [isOpen]);

  // Handle view document click
  const handleViewDocument = (fileName: string) => {
    try {
      setViewingFile(fileName);
      setIframeLoading(true);
      setIframeError(false);
      setIsViewerOpen(true);
    } catch (error) {
      console.error("Error preparing document viewer:", error);
      setError("Failed to prepare document viewer. Please try again.");
      setIframeLoading(false);
      setIframeError(true);
    }
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

  // Fetch files from the blob storage
  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingProgress(0.2);
      setLoadingMessage("Fetching files from blob storage...");
      
      console.log("Calling blobService.listFiles()");
      
      // Use our blob service to list files
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io';
      const response = await fetch(`${backendUrl}/list_uploaded`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to list files. Status: ${response.status}`);
      }

      const fileList = await response.json();
      
      // Update files
      setFiles(fileList);
      setFilteredFiles(fileList);
      
      setLoadingProgress(1);
      setLoadingMessage(`Complete! Found ${fileList.length} files.`);
      
    } catch (err: any) {
      console.error("Failed to fetch files:", err);
      setError(err.message || "Failed to fetch files from blob storage");
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = async (fileName: string) => {
    try {
      setAnalyzingFile(fileName);
      
      // Fetch the document content from the backend directly
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io';
      const contentResponse = await fetch(`${backendUrl}/proxy-content?filename=${encodeURIComponent(fileName)}`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!contentResponse.ok) {
        throw new Error(`Failed to get file content. Status: ${contentResponse.status}`);
      }
      
      const documentContent = await contentResponse.text();
      
      // Now send the document content for analysis
      const analysisRes = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `${Prompt}\n\nAnalyze the following document from "${fileName}":\n\n${documentContent}`,
            },
          ],
        }),
      });
      
      // Process the streaming response
      const streamReader = analysisRes.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let result = "";
  
      if (streamReader) {
        while (true) {
          const { done, value } = await streamReader.read();
          if (done) break;
          result += decoder.decode(value);
        }
      }
  
      const lines = result.split(/\n/).map(line => {
        try {
          const parsed = JSON.parse(line);
          return parsed.content || "";
        } catch {
          return "";
        }
      });
  
      const analysisContent = lines.join("").trim();
      
      // Create a citation URL
      const citationUrl = `${backendUrl}/proxy-content?filename=${encodeURIComponent(fileName)}`;
      
      // Call the parent component's callback with the analysis result
      onRunAnalysis(fileName, analysisContent, citationUrl);
    } catch (err: any) {
      console.error("Error running analysis:", err);
      setError(`Error analyzing ${fileName}: ${err.message}`);
    } finally {
      setAnalyzingFile(null);
    }
  };

  // Toggle sort order
  const toggleSort = () => {
    setSortAscending(!sortAscending);
  };

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
            text={analyzingFile === item.name ? "Analyzing..." : "Analyze"}
            iconProps={analyzeIcon}
            onClick={() => handleRunAnalysis(item.name)}
            disabled={analyzingFile !== null}
            styles={{ root: { minWidth: 90 } }}
          />
        </Stack>
      ),
    },
  ];

  const fileItems = filteredFiles.map((f) => ({ name: f }));

  return (
    <Panel
      isOpen={isOpen}
      onDismiss={onDismiss}
      type={PanelType.large}
      headerText="Document File Cabinet"
      closeButtonAriaLabel="Close"
    >
      <Stack tokens={{ childrenGap: 12 }} styles={{ root: { height: '100%' } }}>
        <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
          <Text variant="large">{files.length > 0 ? `${files.length} files found` : "File Cabinet"}</Text>
          <DefaultButton 
            text="Refresh"
            iconProps={refreshIcon}
            onClick={fetchFiles}
            disabled={loading}
          />
        </Stack>
        
        {/* Search box */}
        <SearchBox 
          placeholder="Search files..." 
          onChange={(_, newValue) => setSearchText(newValue || "")}
          disabled={loading || files.length === 0}
        />
        
        {/* Loading indicator */}
        {loading && (
          <ProgressIndicator 
            label={loadingMessage}
            description={`${files.length} files found so far`}
            percentComplete={loadingProgress} 
          />
        )}
        
        {analyzingFile && <Spinner label={`Analyzing ${analyzingFile}...`} />}
        {error && (
          <MessageBar
            messageBarType={MessageBarType.error}
            isMultiline={true}
            onDismiss={clearError}
          >
            {error}
          </MessageBar>
        )}
        
        {/* File list */}
        <Stack.Item grow style={{ overflow: 'auto' }}>
          <DetailsList
            items={fileItems}
            columns={columns}
            selectionMode={SelectionMode.none}
            isHeaderVisible={true}
            onRenderRow={(props, defaultRender) => {
              if (!props) {
                return (
                  <Stack horizontalAlign="center" verticalAlign="center" styles={{ root: { padding: 20 } }}>
                    <Text>{loading ? "Searching for files..." : "No files found"}</Text>
                  </Stack>
                );
              }
              return defaultRender ? defaultRender(props) : null;
            }}
          />
        </Stack.Item>
        
        {/* Show filtered results count if searching */}
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
                  src={`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io'}/proxy-content?filename=${encodeURIComponent(viewingFile)}`}
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