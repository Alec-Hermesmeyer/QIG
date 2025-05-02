// components/DocumentExcerptViewer.tsx
import React from 'react';
import { Text, Separator } from '@fluentui/react';
import { FileText, FileCode, FileSpreadsheet, Book, FileImage } from 'lucide-react';

interface DocumentExcerptViewerProps {
  documentId: string;
  fileName: string;
  excerpts: string[];
  narrative?: string[];
  highlight?: string[];
  metadata?: Record<string, any>;
}

export const DocumentExcerptViewer: React.FC<DocumentExcerptViewerProps> = ({
  documentId,
  fileName,
  excerpts,
  narrative = [],
  highlight = [],
  metadata = {}
}) => {
  // Function to highlight search terms in text
  const highlightText = (text: string) => {
    if (!highlight.length) return text;
    
    let highlightedText = text;
    highlight.forEach(term => {
      if (!term || term.length < 3) return;
      
      const regex = new RegExp(`\\b(${term})\\b`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-100 px-0.5 rounded">$1</mark>');
    });
    
    return highlightedText;
  };
  
  // Get file icon based on file extension
  const getFileIcon = () => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <FileText size={24} className="text-red-600" />;
      case 'docx':
      case 'doc':
        return <FileText size={24} className="text-blue-600" />;
      case 'xlsx':
      case 'xls':
      case 'csv':
        return <FileSpreadsheet size={24} className="text-green-600" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FileImage size={24} className="text-purple-600" />;
      default:
        return <Book size={24} className="text-gray-600" />;
    }
  };
  
  return (
    <div className="h-full flex flex-col bg-white">
      <div className="bg-green-50 p-4 border-b border-green-100">
        <div className="flex items-center mb-2">
          {getFileIcon()}
          <div className="ml-3">
            <Text variant="large" className="font-medium block">
              {fileName}
            </Text>
            <Text variant="small" className="text-gray-600">
              Document ID: {documentId.substring(0, 8)}{documentId.length > 8 ? '...' : ''}
            </Text>
          </div>
        </div>
        
        {Object.keys(metadata).length > 0 && (
          <div className="mt-2 pt-2 border-t border-green-100">
            <Text variant="small" className="text-gray-700 font-medium mb-1 block">
              Document Metadata:
            </Text>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(metadata).map(([key, value]) => (
                <div key={key} className="text-xs text-gray-600">
                  <span className="font-medium">{key}:</span> {value?.toString() || ''}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="flex-1 overflow-auto p-5">
        {/* Document Narrative Section */}
        {narrative && narrative.length > 0 && (
          <div className="mb-6 bg-blue-50 p-4 rounded border border-blue-100">
            <Text variant="mediumPlus" className="font-semibold mb-3 block text-blue-800">
              Document Summary
            </Text>
            {narrative.map((section, idx) => (
              <div 
                key={idx}
                className="mb-2 text-blue-900"
                dangerouslySetInnerHTML={{ __html: highlightText(section) }}
              />
            ))}
          </div>
        )}
        
        {/* Document Excerpts Section */}
        {excerpts && excerpts.length > 0 ? (
          <div>
            <Text variant="large" className="font-semibold mb-4 block border-b pb-2">
              Document Excerpts
            </Text>
            {excerpts.map((excerpt, idx) => (
              <div 
                key={idx} 
                className="mb-5 p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm"
              >
                <div className="flex items-center mb-2">
                  <div className="bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center font-medium mr-2">
                    {idx + 1}
                  </div>
                  <Text variant="medium" className="font-medium text-gray-700">
                    Excerpt {idx + 1}
                  </Text>
                </div>
                <div 
                  className="text-gray-800 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: highlightText(excerpt) }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <FileText size={48} className="text-gray-300 mb-3" />
            <Text>No excerpts available for this document</Text>
            <Text variant="small" className="mt-2 text-gray-400">
              This document was referenced in the response, but no specific excerpts were extracted.
            </Text>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentExcerptViewer;