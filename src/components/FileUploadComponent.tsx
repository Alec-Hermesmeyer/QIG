'use client';

import { useState, useRef } from 'react';
import {
  Panel,
  PanelType,
  Stack,
  Text,
  PrimaryButton,
  DefaultButton,
  ProgressIndicator,
  MessageBar,
  MessageBarType,
  Icon,
  IIconProps,
  Spinner,
  SpinnerSize
} from '@fluentui/react';

// Icons
const uploadIcon: IIconProps = { iconName: 'Upload' };
const documentIcon: IIconProps = { iconName: 'Document' };
const cancelIcon: IIconProps = { iconName: 'Cancel' };
const errorIcon: IIconProps = { iconName: 'ErrorBadge' };
const checkIcon: IIconProps = { iconName: 'CheckMark' };

interface FileUploadComponentProps {
  isOpen: boolean;
  onDismiss: () => void;
  onUploadComplete?: (fileName: string) => void;
}

interface UploadError {
  message: string;
  details?: string;
}

export const FileUploadComponent: React.FC<FileUploadComponentProps> = ({ 
  isOpen, 
  onDismiss,
  onUploadComplete
}) => {
  // State
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<UploadError | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when panel is opened
  const resetState = () => {
    setFile(null);
    setIsDragging(false);
    setIsUploading(false);
    setUploadProgress(0);
    setUploadError(null);
    setUploadSuccess(false);
    setUploadedFileName("");
  };

  // Format file size for display
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  // Validate file and set it if valid
  const validateAndSetFile = (selectedFile: File) => {
    setUploadError(null);
    
    // Check file size (15MB max)
    const maxSize = 15 * 1024 * 1024; // 15MB in bytes
    if (selectedFile.size > maxSize) {
      setUploadError({
        message: 'File too large',
        details: 'Maximum file size is 15MB'
      });
      return;
    }
    
    // Check file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      'text/plain', // txt
      'application/pdf', // pdf
    ];
    
    const fileName = selectedFile.name.toLowerCase();
    if (!validTypes.includes(selectedFile.type) && 
        !fileName.endsWith('.docx') && 
        !fileName.endsWith('.txt') && 
        !fileName.endsWith('.pdf')) {
      setUploadError({
        message: 'Unsupported file type',
        details: 'Only DOCX, TXT, and PDF files are supported'
      });
      return;
    }
    
    setFile(selectedFile);
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      validateAndSetFile(droppedFiles[0]);
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!file) return;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadError(null);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = prev + (Math.random() * 15);
          return newProgress >= 90 ? 90 : newProgress;
        });
      }, 300);
      
      // Send upload request
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      // Clear progress interval
      clearInterval(progressInterval);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Upload failed');
      }
      
      // Process success response
      const data = await response.json();
      setUploadProgress(100);
      setUploadSuccess(true);
      setUploadedFileName(data.fileName);
      
      // Notify parent component
      if (onUploadComplete) {
        onUploadComplete(data.fileName);
      }
      
      // Auto-close after 2 seconds on success
      setTimeout(() => {
        onDismiss();
      }, 2000);
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress(0);
      setUploadError({
        message: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle browse click
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  // Handle cancel upload
  const handleCancel = () => {
    if (isUploading) {
      // Would implement actual upload cancellation here
      setIsUploading(false);
      setUploadProgress(0);
    } else {
      setFile(null);
    }
  };

  // Handle panel dismiss - reset state
  const handleDismiss = () => {
    resetState();
    onDismiss();
  };

  return (
    <Panel
      isOpen={isOpen}
      onDismiss={handleDismiss}
      type={PanelType.medium}
      headerText="Upload Document"
      closeButtonAriaLabel="Close"
      styles={{
        main: {
          marginTop: 0,
          padding: '10px 16px',
        },
        closeButton: {
          color: '#4f46e5',
          backgroundColor: '#f5f3ff',
          border: '1px solid #e5e7eb',
          borderRadius: '4px',
          width: '32px',
          height: '32px',
          margin: '8px',
          selectors: {
            ':hover': {
              color: '#4338ca',
              backgroundColor: '#ede9fe',
              borderColor: '#c7d2fe',
            }
          },
        },
        content: {
          padding: '16px',
        },
        header: {
          padding: '16px',
        },
        headerText: {
          fontSize: '18px',
          fontWeight: 600,
          color: '#111827',
        },
        footerInner: {
          padding: '16px 24px',
        }
      }}
    >
      <Stack tokens={{ childrenGap: 16 }}>
        {/* Error Message */}
        {uploadError && (
          <MessageBar
            messageBarType={MessageBarType.error}
            isMultiline={true}
            onDismiss={() => setUploadError(null)}
            dismissButtonAriaLabel="Close"
          >
            <Stack tokens={{ childrenGap: 8 }}>
              <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
                {uploadError.message}
              </Text>
              {uploadError.details && (
                <Text>{uploadError.details}</Text>
              )}
            </Stack>
          </MessageBar>
        )}

        {/* Success Message */}
        {uploadSuccess && (
          <MessageBar
            messageBarType={MessageBarType.success}
            isMultiline={false}
          >
            <Text>Document uploaded successfully! The panel will close automatically.</Text>
          </MessageBar>
        )}

        {/* File Upload Area */}
        {!file && !uploadSuccess && (
          <div
            className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 ${
              isDragging 
                ? 'border-indigo-400 bg-indigo-50' 
                : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
            } transition-colors cursor-pointer`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleBrowseClick}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.txt,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            
            <Stack horizontalAlign="center" tokens={{ childrenGap: 16 }}>
              <div className="bg-indigo-100 text-indigo-600 p-4 rounded-full">
                <Icon iconName="CloudUpload" className="text-4xl" />
              </div>
              
              <Stack horizontalAlign="center" tokens={{ childrenGap: 8 }}>
                <Text variant="large" styles={{ root: { fontWeight: 600 } }}>
                  Drag and drop your document here
                </Text>
                <Text variant="medium" styles={{ root: { color: '#6b7280' } }}>
                  or click to browse files
                </Text>
                <Text variant="small" styles={{ root: { color: '#9ca3af' } }}>
                  (Supports DOCX, TXT, and PDF files up to 15MB)
                </Text>
              </Stack>
              
              <DefaultButton
                text="Browse Files"
                iconProps={uploadIcon}
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
            </Stack>
          </div>
        )}

        {/* Selected File Preview */}
        {file && !uploadSuccess && (
          <Stack tokens={{ childrenGap: 16 }} className="border rounded-lg p-6 bg-gray-50">
            <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
              <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign="center">
                <div className="bg-indigo-100 text-indigo-600 p-3 rounded-lg">
                  <Icon iconName="Document" className="text-2xl" />
                </div>
                <Stack>
                  <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
                    {file.name}
                  </Text>
                  <Text variant="small" styles={{ root: { color: '#6b7280' } }}>
                    {formatFileSize(file.size)}
                  </Text>
                </Stack>
              </Stack>
              
              {!isUploading && (
                <DefaultButton
                  iconProps={cancelIcon}
                  onClick={handleCancel}
                  ariaLabel="Remove file"
                  styles={{
                    root: {
                      minWidth: 'auto',
                      padding: '6px',
                      backgroundColor: '#fee2e2',
                      borderColor: '#fecaca',
                    },
                    rootHovered: {
                      backgroundColor: '#fecaca',
                      borderColor: '#fca5a5',
                    },
                    icon: {
                      color: '#ef4444',
                      fontSize: 12,
                    }
                  }}
                />
              )}
            </Stack>

            {/* Upload Progress */}
            {isUploading && (
              <Stack tokens={{ childrenGap: 8 }}>
                <ProgressIndicator 
                  label="Uploading document..." 
                  description={`${Math.round(uploadProgress)}% complete`}
                  percentComplete={uploadProgress / 100}
                  styles={{
                    progressBar: {
                      backgroundColor: '#4f46e5',
                    }
                  }}
                />
              </Stack>
            )}

            {/* Upload Button */}
            {!isUploading && (
              <Stack horizontal horizontalAlign="end" tokens={{ childrenGap: 8 }}>
                <DefaultButton
                  text="Change File"
                  onClick={() => setFile(null)}
                  styles={{
                    root: {
                      backgroundColor: '#f9fafb',
                      borderColor: '#d1d5db',
                    },
                    rootHovered: {
                      backgroundColor: '#f3f4f6',
                      borderColor: '#9ca3af',
                    }
                  }}
                />
                <PrimaryButton
                  text="Upload Document"
                  onClick={handleUpload}
                  iconProps={uploadIcon}
                  styles={{
                    root: {
                      backgroundColor: '#4f46e5',
                      borderColor: '#4338ca',
                    },
                    rootHovered: {
                      backgroundColor: '#4338ca',
                      borderColor: '#3730a3',
                    }
                  }}
                />
              </Stack>
            )}
          </Stack>
        )}

        {/* Uploaded File Success */}
        {uploadSuccess && (
          <Stack tokens={{ childrenGap: 16 }} className="border rounded-lg p-6 bg-green-50 border-green-200">
            <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
              <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign="center">
                <div className="bg-green-100 text-green-600 p-3 rounded-lg">
                  <Icon iconName="CheckMark" className="text-2xl" />
                </div>
                <Stack>
                  <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
                    {file?.name}
                  </Text>
                  <Text variant="small" styles={{ root: { color: '#059669' } }}>
                    {formatFileSize(file?.size || 0)} • Upload complete
                  </Text>
                </Stack>
              </Stack>
            </Stack>
          </Stack>
        )}

        {/* Help Text */}
        {!uploadSuccess && (
          <div className="mt-8">
            <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
              Supported Document Types
            </Text>
            <Stack horizontal tokens={{ childrenGap: 16 }} className="mt-4">
              <Stack horizontalAlign="center" tokens={{ childrenGap: 4 }}>
                <div className="bg-blue-100 text-blue-600 p-2 rounded">
                  <Icon iconName="WordDocument" className="text-lg" />
                </div>
                <Text variant="small">.docx</Text>
              </Stack>
              <Stack horizontalAlign="center" tokens={{ childrenGap: 4 }}>
                <div className="bg-gray-100 text-gray-600 p-2 rounded">
                  <Icon iconName="TextDocument" className="text-lg" />
                </div>
                <Text variant="small">.txt</Text>
              </Stack>
              <Stack horizontalAlign="center" tokens={{ childrenGap: 4 }}>
                <div className="bg-red-100 text-red-600 p-2 rounded">
                  <Icon iconName="PDF" className="text-lg" />
                </div>
                <Text variant="small">.pdf</Text>
              </Stack>
            </Stack>
          </div>
        )}
      </Stack>
    </Panel>
  );
};