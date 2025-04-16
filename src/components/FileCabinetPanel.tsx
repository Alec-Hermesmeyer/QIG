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
  IconButton,
  Modal,
  IIconProps
} from '@fluentui/react';
import { Prompt } from '@/lib/prompt';
import { getCitationFilePath } from '@/lib/api'; // Assuming you have this util

// Icon definitions
const viewIcon: IIconProps = { iconName: 'View' };
const analyzeIcon: IIconProps = { iconName: 'Insights' };

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

  // Get the document URL for a file
  const getDocumentUrl = (fileName: string) => {
    return getCitationFilePath(fileName);
  };

  // Handle view document click
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

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingProgress(0);
      setLoadingMessage("Fetching batch 1...");
      setFiles([]); // Clear existing files

      let allFiles: string[] = [];  // Array to store all the files
      let batchNumber = 1;          // Start with the first batch
      let hasMoreFiles = true;      // Flag to check if more files are available
      let totalFilesFetched = 0;    // Track total files fetched

      while (hasMoreFiles) {
        // Update loading message
        setLoadingMessage(`Fetching batch ${batchNumber}...`);
        
        // Make API request for this batch
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                content: `Requesting files. This is batch ${batchNumber}. Return just a JSON array of file names wrapped in triple backticks with json like \`\`\`json ["file1.pdf", "file2.pdf"]\`\`\`.`,
              },
            ],
          }),
        });

        if (!res.ok) {
          throw new Error(`Request failed with status: ${res.status}`);
        }

        // Process the response body in a stream to allow partial updates
        const streamReader = res.body?.getReader();
        const decoder = new TextDecoder("utf-8");
        let result = "";
        let partialResult = "";
        let partialFilesFound = false;

        if (streamReader) {
          // Read the stream in chunks
          while (true) {
            const { done, value } = await streamReader.read();
            if (done) break;
            
            // Decode this chunk
            const chunk = decoder.decode(value, { stream: true });
            result += chunk;
            partialResult += chunk;
            
            // Try to extract any partial results from the stream
            try {
              // Look for JSON array in the accumulated text
              const jsonMatch = partialResult.match(/```json\s*(\[[\s\S]*?\])\s*```/);
              if (jsonMatch && jsonMatch[1]) {
                try {
                  // Try to parse JSON array
                  const partialFiles = JSON.parse(jsonMatch[1]);
                  if (Array.isArray(partialFiles) && !partialFilesFound) {
                    // Show files as they come in - only do this once per batch
                    const newFiles = [...allFiles, ...partialFiles];
                    allFiles = newFiles;
                    setFiles(newFiles);
                    partialFilesFound = true;
                    
                    // Update progress
                    totalFilesFetched += partialFiles.length;
                    setLoadingProgress(Math.min(totalFilesFetched / 100, 0.95));
                    setLoadingMessage(`Found ${partialFiles.length} files in batch ${batchNumber}...`);
                  }
                } catch (e) {
                  // Ignore parsing errors for partial results
                }
              }
            } catch (e) {
              // Ignore errors on partial parsing attempts
            }
          }
        }

        // Now process the complete response to get the final list for this batch
        try {
          // Clean up the response and extract the JSON array of file names
          const lines = result.split(/\n/).map(line => {
            try {
              const parsed = JSON.parse(line);
              return parsed.content || "";
            } catch {
              return "";
            }
          });

          let fullContent = lines.join("").trim();
          fullContent = fullContent.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
          
          // Parse the cleaned-up content into a JSON array
          const parsed = JSON.parse(fullContent);

          // Add any new files to our collection
          const uniqueNewFiles = parsed.filter((file: string) => !allFiles.includes(file));
          
          if (uniqueNewFiles.length > 0) {
            allFiles = [...allFiles, ...uniqueNewFiles];
            totalFilesFetched += uniqueNewFiles.length;
            
            // Update the state with the complete list
            setFiles(allFiles);
            
            // Update progress message
            setLoadingMessage(`Found ${parsed.length} files in batch ${batchNumber} (${allFiles.length} total)`);
            setLoadingProgress(Math.min(totalFilesFetched / 100, 0.95));
          } else {
            setLoadingMessage(`No new files in batch ${batchNumber} (${allFiles.length} total)`);
          }

          // Check if there are more files to fetch
          hasMoreFiles = parsed.length > 0 && parsed.length >= 3;  // Assuming API returns at least 3 files if there are more
        } catch (parseError) {
          console.error(`Error parsing batch ${batchNumber}:`, parseError);
          hasMoreFiles = false; // Stop on error
        }
        
        batchNumber++;  // Increment to request the next batch if needed
        
        // Short delay between batches to prevent overwhelming the API
        if (hasMoreFiles) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // All batches complete
      setLoadingMessage(`Complete! ${allFiles.length} files found.`);
      setLoadingProgress(1);  // Mark as complete

    } catch (err: any) {
      console.error("Failed to fetch files:", err);
      setError(err.message || "Failed to fetch files");
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = async (fileName: string) => {
    try {
      setAnalyzingFile(fileName);
      
      // Fetch the document content using your proxy endpoint
      const contentRes = await fetch(`/api/proxy-content?filename=${encodeURIComponent(fileName)}`);
      
      if (!contentRes.ok) {
        throw new Error(`Failed to retrieve document content: ${contentRes.status}`);
      }
      
      const documentContent = await contentRes.text();
      
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
              content: `${Prompt}\n\nAnalyze the following contract text from "${fileName}":\n\n${documentContent}`,
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
      
      // Call the parent component's callback with the analysis result
      const citationUrl = getCitationFilePath(fileName); // Assuming this utility generates the citation URL
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
      headerText="Contract File Cabinet"
      closeButtonAriaLabel="Close"
    >
      <Stack tokens={{ childrenGap: 12 }} styles={{ root: { height: '100%' } }}>
        <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
          <Text variant="large">{files.length > 0 ? `${files.length} files found` : "Loading files..."}</Text>
          <DefaultButton 
            text="Refresh" 
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
        
        {/* Loading indicator - shows even when files are visible */}
        {loading && (
          <ProgressIndicator 
            label={loadingMessage}
            description={`${files.length} files found so far`}
            percentComplete={loadingProgress} 
          />
        )}
        
        {analyzingFile && <Spinner label={`Analyzing ${analyzingFile}...`} />}
        {error && <MessageBar messageBarType={MessageBarType.error}>{error}</MessageBar>}
        
        {/* Always show file list, even during loading */}
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
    {/* Modal header - more compact */}
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
    
    {/* Modal content - taking the full remaining space */}
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
      
      {/* Document iframe - takes full space */}
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