'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Calendar, 
  Loader2, 
  Search, 
  Trash2, 
  ArrowUpRight, 
  BookOpen,
  ArrowLeft
} from 'lucide-react';
import { DocumentMetadata } from '@/services/documentCache';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Fetch all documents
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const res = await fetch('/api/documents');
        
        if (!res.ok) {
          throw new Error('Failed to fetch documents');
        }
        
        const data = await res.json();
        setDocuments(data.documents);
      } catch (err) {
        setError('Error loading documents');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDocuments();
  }, []);
  
  // Filter documents based on search
  const filteredDocuments = documents.filter(doc => 
    doc.filename.toLowerCase().includes(search.toLowerCase())
  );
  
  // Handle document deletion
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (confirm('Are you sure you want to delete this document?')) {
      setDeletingId(id);
      
      try {
        const res = await fetch(`/api/documents/${id}`, {
          method: 'DELETE',
        });
        
        if (!res.ok) {
          throw new Error('Failed to delete document');
        }
        
        // Remove the document from the list
        setDocuments(documents.filter(doc => doc.id !== id));
      } catch (err) {
        alert('Error deleting document');
        console.error(err);
      } finally {
        setDeletingId(null);
      }
    }
  };
  
  return (
    <main className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link href="/" className="text-blue-600 hover:underline flex items-center mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Home
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Documents</h1>
        <p className="text-gray-600">
          View, search, and analyze your previously processed documents
        </p>
      </div>
      
      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
      
      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      )}
      
      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-50 p-6 rounded-lg border border-red-200 text-center">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Error</h2>
          <p className="text-red-600">{error}</p>
        </div>
      )}
      
      {/* Empty State */}
      {!loading && !error && documents.length === 0 && (
        <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm text-center">
          <FileText className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">No Documents Yet</h2>
          <p className="text-gray-600 mb-6">
            You haven't processed any documents yet. Upload a document on the home page to get started.
          </p>
          <Link
            href="/"
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Upload a Document
          </Link>
        </div>
      )}
      
      {/* Documents List */}
      {!loading && !error && filteredDocuments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocuments.map((doc) => {
            const date = new Date(doc.uploadDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
            
            return (
              <Link href={`/documents/${doc.id}`} key={doc.id}>
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  {/* Document Type Icon */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="bg-blue-100 inline-flex items-center justify-center p-2 rounded-lg text-blue-600 mb-2">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="text-xs text-gray-500 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {date}
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(doc.id, e)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      disabled={deletingId === doc.id}
                    >
                      {deletingId === doc.id ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Trash2 className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  
                  {/* Document Name */}
                  <h3 className="text-lg font-medium text-gray-800 mb-2 line-clamp-2">
                    {doc.filename}
                  </h3>
                  
                  {/* Document Stats */}
                  <div className="flex text-sm text-gray-500 mb-4">
                    <span className="mr-3">{doc.wordCount.toLocaleString()} words</span>
                    <span>{doc.tokenCount.toLocaleString()} tokens</span>
                  </div>
                  
                  {/* Action Button */}
                  <div className="flex justify-between items-center">
                    <div className="text-blue-600 text-sm font-medium flex items-center">
                      <BookOpen className="h-4 w-4 mr-1" />
                      View Document
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}