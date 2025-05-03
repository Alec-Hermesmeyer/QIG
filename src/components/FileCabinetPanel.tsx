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
  IIconProps,
  Modal
} from '@fluentui/react';
import { getCitationFilePath } from '@/lib/api';
import { FileUploadComponent } from './FileUploadComponent'; // Import the new component

const viewIcon: IIconProps = { iconName: 'View' };
const downloadIcon: IIconProps = { iconName: 'Download' }; // Changed from analyzeIcon to downloadIcon
const refreshIcon: IIconProps = { iconName: 'Refresh' };
const uploadIcon: IIconProps = { iconName: 'Upload' }; // New upload icon

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
  
  // New state for file upload component
  const [isUploadPanelOpen, setIsUploadPanelOpen] = useState<boolean>(false);

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

  // Handle document download
  const handleDownloadDocument = (fileName: string) => {
    const downloadUrl = getDocumentUrl(fileName);
    
    // Create a temporary anchor element
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileName; // Set the filename for the download
    document.body.appendChild(a);
    a.click(); // Trigger the download
    document.body.removeChild(a); // Clean up
  };

  // Handle upload complete
  const handleUploadComplete = (fileName: string) => {
    console.log(`Upload complete: ${fileName}`);
    // Refresh the file list after upload completes
    fetchFiles();
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
            text="Download"
            iconProps={downloadIcon}
            onClick={() => handleDownloadDocument(item.name)}
            styles={{ 
              root: { 
                minWidth: 90,
                backgroundColor: '#e6f7ff',
                borderColor: '#91caff'
              },
              rootHovered: {
                backgroundColor: '#bae0ff',
                borderColor: '#69b1ff'
              }
            }}
          />
        </Stack>
      ),
    },
  ];

  const fileItems = filteredFiles.map(name => ({ name }));

  return (
    <>
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
            <Stack horizontal tokens={{ childrenGap: 8 }}>
              {/* Add Upload button */}
              <DefaultButton
                text="Upload"
                iconProps={uploadIcon}
                onClick={() => setIsUploadPanelOpen(true)}
                styles={{ 
                  root: { 
                    backgroundColor: '#f5f3ff',
                    borderColor: '#c7d2fe',
                  },
                  rootHovered: {
                    backgroundColor: '#ede9fe',
                    borderColor: '#a5b4fc',
                  }
                }}
              />
              <DefaultButton
                text="Refresh"
                iconProps={refreshIcon}
                onClick={fetchFiles}
                disabled={loading}
              />
            </Stack>
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
              <Stack horizontal tokens={{ childrenGap: 8 }}>
                {/* Add download button to viewer header */}
                <DefaultButton 
                  text="Download"
                  iconProps={downloadIcon}
                  onClick={() => viewingFile && handleDownloadDocument(viewingFile)}
                  styles={{ 
                    root: { 
                      minWidth: '100px', 
                      height: '32px',
                      backgroundColor: '#e6f7ff',
                      borderColor: '#91caff'
                    },
                    rootHovered: {
                      backgroundColor: '#bae0ff',
                      borderColor: '#69b1ff'
                    }
                  }}
                />
                <DefaultButton 
                  onClick={closeViewer}
                  styles={{ root: { minWidth: '60px', height: '32px' } }}
                >
                  Close
                </DefaultButton>
              </Stack>
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

      {/* File Upload Component */}
      <FileUploadComponent
        isOpen={isUploadPanelOpen}
        onDismiss={() => setIsUploadPanelOpen(false)}
        onUploadComplete={handleUploadComplete}
      />
    </>
  );
};