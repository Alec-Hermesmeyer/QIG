// src/hooks/useFileProcessor.ts

import { useState, useRef } from 'react';
import mammoth from 'mammoth';

export interface FileProcessingOptions {
  maxSizeInBytes?: number;
  acceptedFileTypes?: string[];
}

export interface FileProcessingError {
  message: string;
  details?: string;
}

export interface FileProcessorResult {
  isDragging: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  processFile: (file: File) => Promise<void>;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleFileUploadClick: () => void;
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Custom hook for handling file uploads and processing in the contract analyzer
 */
export function useFileProcessor(
  onTextExtracted: (text: string, fileName: string, fileSize: number) => void,
  onError: (error: FileProcessingError) => void,
  onProcessingStart?: () => void,
  onProcessingEnd?: () => void,
  options: FileProcessingOptions = {}
): FileProcessorResult {
  // State
  const [isDragging, setIsDragging] = useState(false);
  
  // Default options
  const {
    maxSizeInBytes = 15 * 1024 * 1024, // 15MB
    acceptedFileTypes = ['.docx', '.txt', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
  } = options;
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Process the uploaded file
  const processFile = async (file: File) => {
    try {
      if (onProcessingStart) onProcessingStart();
      
      // Check file size
      if (file.size > maxSizeInBytes) {
        throw {
          message: 'File too large',
          details: `The maximum file size is ${Math.round(maxSizeInBytes / (1024 * 1024))}MB. Please try a smaller file or split your contract.`
        };
      }
      
      // Check file type
      const isValidType = acceptedFileTypes.some(type => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        } else {
          return file.type === type;
        }
      });
      
      if (!isValidType) {
        throw {
          message: 'Unsupported file type',
          details: 'Please upload a DOCX or TXT file.'
        };
      }
      
      let text = '';
      
      // Process based on file type
      if (
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.endsWith('.docx')
      ) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          text = result.value;
          
          if (result.messages.length > 0 && result.messages.some(m => m.type === 'warning')) {
            console.warn('Mammoth warnings:', result.messages);
          }
        } catch (docxError) {
          throw {
            message: 'DOCX processing error',
            details: 'Unable to extract text from this Word document. The file might be corrupted or in an unsupported format.'
          };
        }
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        text = await file.text();
      }
      
      if (!text.trim()) {
        throw {
          message: 'Empty document',
          details: 'No text could be extracted from this document. It might be empty or in an unsupported format.'
        };
      }
      
      // Call the callback with the extracted text
      onTextExtracted(text, file.name, file.size);
      
    } catch (error: any) {
      console.error('File processing error:', error);
      onError(error.message && typeof error.message === 'string'
        ? error
        : { message: 'Unknown error', details: 'An unknown error occurred while processing the file.' });
    } finally {
      if (onProcessingEnd) onProcessingEnd();
    }
  };
  
  // Handle file upload via drag and drop
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
  
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length) {
      await processFile(files[0]);
    }
  };
  
  // Handle file upload via file input
  const handleFileUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };
  
  return {
    isDragging,
    fileInputRef,
    processFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileUploadClick,
    handleFileInputChange
  };
}