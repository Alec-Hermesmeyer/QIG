'use client';

import React, { useState } from 'react';
import { FileText, Book, Download, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface DocumentViewerProps {
  summary: string;
  filename: string;
  wordCount: number;
  fileType: string;
  documentId: string;
}

const SimplifiedDocumentViewer: React.FC<DocumentViewerProps> = ({
  summary,
  filename,
  wordCount,
  fileType,
  documentId
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Handle file download (if implemented)
  const handleDownload = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Here you'd typically fetch the original file if you have it stored
      // For now, we'll just download the summary as a text file
      const blob = new Blob([summary], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename.split('.')[0]}-summary.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading document:', err);
      setError('Failed to download document');
    } finally {
      setLoading(false);
    }
  };

  const fileTypeIcon = {
    'pdf': '📄',
    'docx': '📝',
    'doc': '📝',
    'txt': '📄',
    'unknown': '📄'
  }[fileType.toLowerCase()] || '📄';

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center">
          <span className="text-2xl mr-2">{fileTypeIcon}</span>
          <h2 className="text-xl font-semibold text-gray-800">Document Content</h2>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center text-gray-600 text-sm">
            <Book className="h-4 w-4 mr-1" />
            <span>{wordCount.toLocaleString()} words</span>
          </div>
          <button
            onClick={handleDownload}
            disabled={loading}
            className="text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium"
          >
            <Download className="h-4 w-4 mr-1" />
            Download Summary
          </button>
        </div>
      </div>
      
      <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded text-sm text-blue-800">
        <p>This document is a <strong>{fileType.toUpperCase()}</strong> file. Only the document summary is displayed here.</p>
        <p className="mt-1">You can use the Q&A section below to ask questions about the document content.</p>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded text-sm text-red-800">
          {error}
        </div>
      )}
      
      {/* Display the summary instead of trying to show the binary content */}
      <div className="prose max-w-none bg-gray-50 p-4 rounded-lg border border-gray-100 whitespace-pre-wrap">
        <ReactMarkdown>{summary}</ReactMarkdown>
        
      </div>
    </div>
  );
};

export default SimplifiedDocumentViewer;