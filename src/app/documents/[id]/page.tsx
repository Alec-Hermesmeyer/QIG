'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { FileText, Calendar, Hash, Book, Loader2, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';
import DocumentQA from '@/components/DocumentQA';
import SimplifiedDocumentViewer from '@/components/DocumentViewer';
import StyledDocumentSummary from '@/components/StyledDocumentSummary';

interface DocumentMetadata {
  id: string;
  filename: string;
  uploadDate: string;
  fileType: string;
  wordCount: number;
  tokenCount: number;
  chunked?: boolean;
  totalChunks?: number;
}

interface DocumentContent {
  id: string;
  content: string;
  summary: string;
}

interface DocumentView {
  metadata: DocumentMetadata;
  content: DocumentContent;
}

export default function DocumentPage() {
  const params = useParams();
  const documentId = params.id as string;
  
  const [document, setDocument] = useState<DocumentView | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showQA, setShowQA] = useState<boolean>(false);
  
  // Fetch the document metadata and content
  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/documents/${documentId}`);
        
        if (!res.ok) {
          throw new Error('Failed to fetch document');
        }
        
        const data = await res.json();
        setDocument(data.document);
      } catch (err) {
        setError('Error loading document');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDocument();
  }, [documentId]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }
  
  if (error || !document) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 p-6 rounded-lg border border-red-200 text-center">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Error</h2>
          <p className="text-red-600 mb-4">{error || 'Document not found'}</p>
          <Link href="/documents" className="text-blue-600 hover:underline flex items-center justify-center">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Documents
          </Link>
        </div>
      </div>
    );
  }
  
  const { metadata, content } = document;
  const formattedDate = new Date(metadata.uploadDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Use the document content for QA (this should already be the extracted text from upload)
  const contentForQA = content.content;
  
  // Check if the content appears to be binary
  const isBinaryContent = content.content.startsWith('PK') || 
                         content.content.includes('[Content_Types]') || 
                         content.content.includes('%PDF');
  
  // Handle sharing (you can implement actual sharing functionality)
  const handleShare = () => {
    alert('Share functionality will be implemented in a future update');
  };

  return (
    <main className="max-w-7xl mx-auto p-6">
      {/* Navigation */}
      <div className="mb-6">
        <Link href="/documents" className="text-blue-600 hover:underline flex items-center">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Documents
        </Link>
      </div>
      
      {/* Document Info Card */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          <FileText className="h-6 w-6 inline-block mr-2 text-blue-600" />
          {metadata.filename}
        </h1>
        
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center text-gray-600">
            <Calendar className="h-4 w-4 mr-1" />
            <span>{formattedDate}</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Book className="h-4 w-4 mr-1" />
            <span>{metadata.wordCount.toLocaleString()} words</span>
          </div>
          <div className="flex items-center text-gray-600">
            <Hash className="h-4 w-4 mr-1" />
            <span>{metadata.tokenCount.toLocaleString()} tokens</span>
          </div>
          {metadata.chunked && (
            <div className="flex items-center text-purple-600 font-medium">
              <span>Large document ({metadata.totalChunks} chunks)</span>
            </div>
          )}
        </div>
        
        {/* Summary Section (now using styled component) */}
        <div className="mb-6">
          <StyledDocumentSummary 
            summary={content.summary}
            filename={metadata.filename}
            onShare={handleShare}
          />
        </div>
        
        {/* Document Content */}
        {isBinaryContent ? (
          <SimplifiedDocumentViewer 
            summary={content.summary}
            filename={metadata.filename}
            wordCount={metadata.wordCount}
            fileType={metadata.fileType}
            documentId={metadata.id}
          />
        ) : (
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Document Content</h2>
            <div className="prose prose-sm max-w-none bg-gray-50 p-4 rounded-lg border border-gray-100 whitespace-pre-wrap">
              {content.content}
            </div>
          </div>
        )}
      </div>
      
      {/* Toggle Q&A Section */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-6">
        <button 
          onClick={() => setShowQA(!showQA)}
          className="flex justify-between items-center w-full focus:outline-none"
        >
          <h2 className="text-xl font-semibold text-gray-800">Ask Questions About This Document</h2>
          {showQA ? (
            <ChevronUp className="h-5 w-5 text-gray-500" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500" />
          )}
        </button>
        
        {showQA && (
          <div className="mt-6">
             <DocumentQA 
            documentId={metadata.id} 
            documentName={metadata.filename} 
          />
          </div>
        )}
      </div>
    </main>
  );
}