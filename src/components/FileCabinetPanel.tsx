"use client";

import React, { useEffect, useState } from 'react';
import {
  Panel,
  PanelType,
  Stack,
  Text,
  DefaultButton,
  PrimaryButton,
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
// Fix import statement to ensure all named exports are properly imported
import { 
  initializeAuth, 
  login, 
  logout, 
  checkAuthenticated,
  listUploadedFiles
} from '@/service/authService';

// Icon definitions
const viewIcon: IIconProps = { iconName: 'View' };
const analyzeIcon: IIconProps = { iconName: 'Insights' };
const refreshIcon: IIconProps = { iconName: 'Refresh' };
const loginIcon: IIconProps = { iconName: 'Signin' };
const logoutIcon: IIconProps = { iconName: 'SignOut' };

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
  const [analyzingFile, setAnalyzingFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadingMessage, setLoadingMessage] = useState<string>("Fetching files...");
  const [searchText, setSearchText] = useState<string>("");
  const [sortAscending, setSortAscending] = useState<boolean>(true);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);
  
  // Document viewer state
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [viewingContent, setViewingContent] = useState<string | null>(null);
  const [iframeLoading, setIframeLoading] = useState<boolean>(false);
  const [iframeError, setIframeError] = useState<boolean>(false);
  const [viewerError, setViewerError] = useState<string | null>(null);

  // Authentication initialization
  useEffect(() => {
    const setupAuth = async () => {
      try {
        console.log("Initializing authentication");
        await initializeAuth();
        // Use the imported checkAuthenticated function
        const isAuth = checkAuthenticated();
        setAuthenticated(isAuth);
        setAuthInitialized(true);
        
        if (isAuth && isOpen) {
          // If authenticated and panel is open, fetch files
          fetchFiles();
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        setAuthInitialized(true);
        setAuthenticated(false);
      }
    };
    
    setupAuth();
  }, []);

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

  // Fetch files when panel opens or authentication changes
  useEffect(() => {
    if (isOpen && authenticated && authInitialized) {
      fetchFiles();
    }
  }, [isOpen, authenticated, authInitialized]);

  // Handle login
  const handleLogin = async () => {
    try {
      setError(null);
      setLoading(true);
      setLoadingMessage("Authenticating...");
      
      const result = await login();
      if (result) {
        setAuthenticated(true);
        
        // If files were returned in the login result, update them
        if (result.files && Array.isArray(result.files)) {
          setFiles(result.files);
        } else {
          // Otherwise fetch files separately
          fetchFiles();
        }
      } else {
        setError("Authentication failed. Please try again.");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(`Authentication error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      setAuthenticated(false);
      setFiles([]);
    } catch (err: any) {
      console.error("Logout error:", err);
    }
  };

  // Get the document URL for a file
  const getDocumentUrl = (fileName: string) => {
    return `/content/${encodeURIComponent(fileName)}`;
  };

  // Handle view document click
  const handleViewDocument = async (fileName: string) => {
    setViewingFile(fileName);
    setIframeLoading(true);
    setIframeError(false);
    setViewingContent(null);
    setViewerError(null);
    setIsViewerOpen(true);
    
    try {
      // Fetch the document content
      const response = await fetch(getDocumentUrl(fileName), {
        credentials: "include"
      });
      
      if (!response.ok) {
        // Try to parse the error response
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
        } catch (e) {
          // If we can't parse the JSON, use the response status
          throw new Error(`Failed to retrieve document content: ${response.status}`);
        }
      }
      
      // Get content
      const content = await response.text();
      
      setViewingContent(content);
      setIframeLoading(false);
    } catch (err: any) {
      console.error("Error fetching document:", err);
      setIframeError(true);
      setViewerError(err.message);
      setIframeLoading(false);
    }
  };

  // Close document viewer
  const closeViewer = () => {
    setIsViewerOpen(false);
    setViewingFile(null);
    setViewingContent(null);
    setViewerError(null);
  };

  // Reset error state
  const clearError = () => {
    setError(null);
  };

  // Fetch files from the API
  const fetchFiles = async () => {
    if (!authenticated) {
      setError("Authentication required. Please log in to view your files.");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setLoadingProgress(0.2);
      setLoadingMessage("Fetching files from server...");
      
      // Call the API endpoint with credentials
      const fileList = await listUploadedFiles();
      
      // Update files
      setFiles(fileList);
      setLoadingProgress(1);
      setLoadingMessage(`Complete! Found ${fileList.length} files.`);
      
    } catch (err: any) {
      console.error("Failed to fetch files:", err);
      
      // Handle authentication errors
      if (err.message && (
          err.message.includes("Authentication required") || 
          err.message.includes("401") || 
          err.message.includes("403"))) {
        setAuthenticated(false);
        setError("Authentication error: Your session has expired. Please log in again.");
      } else {
        setError(err.message || "Failed to fetch files");
      }
      
      setLoadingProgress(1);
      setLoadingMessage("Error loading files");
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = async (fileName: string) => {
    if (!authenticated) {
      setError("Authentication required. Please log in to analyze files.");
      return;
    }
    
    try {
      setAnalyzingFile(fileName);
      
      // Fetch the document content with credentials
      const contentRes = await fetch(getDocumentUrl(fileName), {
        credentials: "include"
      });
      
      if (!contentRes.ok) {
        // Try to parse the error response
        try {
          const errorData = await contentRes.json();
          throw new Error(errorData.message || `Error ${contentRes.status}: ${contentRes.statusText}`);
        } catch (e) {
          // If we can't parse the JSON, use the response status
          throw new Error(`Failed to retrieve document content: ${contentRes.status}`);
        }
      }
      
      const documentContent = await contentRes.text();
      
      // Now send the document content for analysis
      const analysisRes = await fetch("/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `${Prompt}\n\nAnalyze the following contract text from "${fileName}":\n\n${documentContent}`,
            },
          ],
        }),
        credentials: "include"
      });
      
      if (!analysisRes.ok) {
        throw new Error(`Analysis request failed: ${analysisRes.status}`);
      }
      
      // Process the response
      const result = await analysisRes.json();
      
      // Call the parent component's callback with the analysis result
      const citationUrl = getDocumentUrl(fileName);
      onRunAnalysis(fileName, result.answer || result.content || "Analysis completed", citationUrl);
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

  // Helper function to format the content for display
  const formatContentForDisplay = (content: string, filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    if (extension === 'csv' || extension === 'xlsx' || extension === 'xls') {
      // Format CSV content as a table
      const rows = content.split('\n');
      const headers = rows[0].split(',');
      
      return (
        <div className="csv-table" style={{ fontFamily: 'monospace' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th key={index} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left', backgroundColor: '#f2f2f2' }}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(1).map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.split(',').map((cell, cellIndex) => (
                    <td key={cellIndex} style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'left' }}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    
    // Default to preformatted text for other file types
    return (
      <pre style={{ 
        fontFamily: 'inherit', 
        whiteSpace: 'pre-wrap',
        margin: 0,
        padding: 0
      }}>
        {content}
      </pre>
    );
  };

  // Loading state before auth is initialized
  if (!authInitialized) {
    return (
      <Panel
        isOpen={isOpen}
        onDismiss={onDismiss}
        type={PanelType.large}
        headerText="Contract File Cabinet"
        closeButtonAriaLabel="Close"
      >
        <Stack 
          horizontalAlign="center" 
          verticalAlign="center" 
          styles={{ root: { height: '100%', padding: 20 } }}
        >
          <Spinner label="Initializing..." />
          <Text styles={{ root: { marginTop: 16 } }}>
            Setting up authentication...
          </Text>
        </Stack>
      </Panel>
    );
  }

  return (
    <Panel
      isOpen={isOpen}
      onDismiss={onDismiss}
      type={PanelType.large}
      headerText="Contract File Cabinet"
      closeButtonAriaLabel="Close"
    >
      <Stack tokens={{ childrenGap: 12 }} styles={{ root: { height: '100%' } }}>
        <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
          <Text variant="large">{files.length > 0 ? `${files.length} files found` : "File Cabinet"}</Text>
          <Stack horizontal tokens={{ childrenGap: 8 }}>
            {authenticated ? (
              <>
                <DefaultButton 
                  text="Refresh"
                  iconProps={refreshIcon}
                  onClick={fetchFiles}
                  disabled={loading}
                />
                <DefaultButton
                  text="Log Out"
                  iconProps={logoutIcon}
                  onClick={handleLogout}
                  disabled={loading}
                />
              </>
            ) : (
              <PrimaryButton 
                text="Log In" 
                iconProps={loginIcon} 
                onClick={handleLogin}
                disabled={loading}
              />
            )}
          </Stack>
        </Stack>
        
        {/* Error message - show regardless of authentication state */}
        {error && (
          <MessageBar
            messageBarType={MessageBarType.error}
            isMultiline={true}
            onDismiss={clearError}
          >
            {error}
          </MessageBar>
        )}
        
        {/* Authentication status */}
        {!authenticated && !error && (
          <MessageBar
            messageBarType={MessageBarType.info}
            isMultiline={true}
          >
            Please log in to access your files.
          </MessageBar>
        )}
        
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
            percentComplete={loadingProgress} 
          />
        )}
        
        {analyzingFile && <Spinner label={`Analyzing ${analyzingFile}...`} />}
        
        {/* File list */}
        <Stack.Item grow style={{ overflow: 'auto' }}>
          <DetailsList
            items={fileItems}
            columns={columns}
            selectionMode={SelectionMode.none}
            isHeaderVisible={true}
            onRenderRow={(props, defaultRender) => {
              if (!props || fileItems.length === 0) {
                return (
                  <Stack horizontalAlign="center" verticalAlign="center" styles={{ root: { padding: 20 } }}>
                    {loading ? (
                      <Text>Searching for files...</Text>
                    ) : authenticated ? (
                      <Text>No files found</Text>
                    ) : (
                      <>
                        <Text>Please log in to view your files</Text>
                        <PrimaryButton
                          text="Log In"
                          iconProps={loginIcon}
                          onClick={handleLogin}
                          styles={{ root: { marginTop: 12 } }}
                        />
                      </>
                    )}
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
                  <Text>
                    {viewerError || "Failed to load document. The file may not be available or you may not have permission to view it."}
                  </Text>
                </MessageBar>
              </Stack>
            )}
            
            {/* Document content display */}
            {!iframeLoading && !iframeError && viewingContent && (
              <div style={{ 
                height: '100%', 
                width: '100%', 
                overflow: 'auto', 
                padding: '20px',
                backgroundColor: '#fff' 
              }}>
                {formatContentForDisplay(viewingContent, viewingFile || '')}
              </div>
            )}
          </Stack.Item>
        </Stack>
      </Modal>
    </Panel>
  );
};