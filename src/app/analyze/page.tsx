'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import CreateForm from '@/components/CreateForm';
import { ArrowUpRight, FileText, Loader2, Book, Hash, Cpu, CreditCard, Download, Database, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Define proper types for our analysis results
interface AnalysisResult {
  wordCount: number;
  tokenCount: number;
  summary: string;
  content?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

interface SavedDocument {
  id: string;
  filename: string;
}

export default function HomePage() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [savedDocument, setSavedDocument] = useState<SavedDocument | null>(null);
  const [recentDocuments, setRecentDocuments] = useState<SavedDocument[]>([]);
  
  // Fetch recent documents on load
  useEffect(() => {
    const fetchRecentDocuments = async () => {
      try {
        const res = await fetch('/api/documents');
        
        if (res.ok) {
          const data = await res.json();
          setRecentDocuments(data.documents.slice(0, 3).map((doc: any) => ({
            id: doc.id,
            filename: doc.filename
          })));
        }
      } catch (err) {
        console.error('Error fetching recent documents:', err);
      }
    };
    
    fetchRecentDocuments();
  }, []);

  const handleAnalyze = async (input: string) => {
    if (!input.trim()) {
      setError('Please enter some text to analyze');
      return;
    }
    
    setLoading(true);
    setError(null);
    setFileName('text-input.txt');
    setSavedDocument(null);
    
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({ input }),
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to analyze text');
      }
      
      const data = await res.json();
      setResult({
        ...data.analysis,
        content: input // Store the original input content
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setLoading(true);
    setError(null);
    setFileName(file.name);
    setSavedDocument(null);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to analyze file');
      }
      
      const data = await res.json();
      
      // Read the file content
      const fileContent = await readFileAsText(file);
      
      setResult({
        ...data.analysis,
        content: fileContent
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to read file content
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // Save the document to cache
  const handleSaveDocument = async () => {
    if (!result || !fileName) return;
    
    try {
      const res = await fetch('/api/documents/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: fileName,
          fileType: fileName.split('.').pop() || 'txt',
          content: result.content || '',
          summary: result.summary,
          wordCount: result.wordCount,
          tokenCount: result.tokenCount
        }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to save document');
      }
      
      const data = await res.json();
      setSavedDocument({
        id: data.document.id,
        filename: data.document.filename
      });
      
      // Update recent documents
      setRecentDocuments(prev => [
        {
          id: data.document.id,
          filename: data.document.filename
        },
        ...prev.slice(0, 2)
      ]);
    } catch (err) {
      alert('Error saving document: ' + (err instanceof Error ? err.message : 'Unknown error'));
      console.error(err);
    }
  };

  // Calculate estimated cost if usage data is available (based on GPT-4.1 mini pricing)
  const calculateCost = () => {
    if (!result?.usage) return null;
    
    // GPT-4.1 mini pricing: $0.40/million input tokens, $1.60/million output tokens
    const inputCost = (result.usage.inputTokens / 1000000) * 0.40;
    const outputCost = (result.usage.outputTokens / 1000000) * 1.60;
    const totalCost = inputCost + outputCost;
    
    return {
      inputCost,
      outputCost,
      totalCost
    };
  };
  
  const cost = calculateCost();

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-lg shadow-lg mb-8 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Create → Analyze → Generate</h1>
            <p className="text-blue-100">Upload documents or enter text to analyze with GPT-4.1 mini</p>
          </div>
          {recentDocuments.length > 0 && (
            <Link 
              href="/documents" 
              className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-md text-white text-sm font-medium transition-colors"
            >
              View All Documents
            </Link>
          )}
        </div>
        
        {/* Recent Documents */}
        {recentDocuments.length > 0 && (
          <div className="mt-6 pt-6 border-t border-blue-400 border-opacity-30">
            <h2 className="text-sm font-medium text-blue-100 mb-3">Recent Documents</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {recentDocuments.map(doc => (
                <Link 
                  key={doc.id}
                  href={`/documents/${doc.id}`} 
                  className="bg-white bg-opacity-10 hover:bg-opacity-20 p-3 rounded-md text-white flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="text-sm truncate">{doc.filename}</span>
                  </div>
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Input Section */}
      <div className="mb-8">
        <CreateForm onSubmit={handleAnalyze} onFileUpload={handleFileUpload} />
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}
        
        {fileName && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md flex items-center">
            <FileText className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-blue-700 font-medium">{fileName}</span>
          </div>
        )}
      </div>
      
      {/* Results Section */}
      {loading ? (
        <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-600 text-lg">Processing your document with GPT-4.1 mini...</p>
          <p className="text-gray-500 text-sm mt-2">This may take a moment for larger documents</p>
        </div>
      ) : result ? (
        <div className="space-y-6">
          {/* Analytics Card */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Analytics</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center text-blue-700 mb-1">
                  <Book className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">Word Count</span>
                </div>
                <p className="text-2xl font-bold text-blue-800">{result.wordCount.toLocaleString()}</p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center text-green-700 mb-1">
                  <Hash className="h-4 w-4 mr-1" />
                  <span className="text-sm font-medium">Token Count</span>
                </div>
                <p className="text-2xl font-bold text-green-800">{result.tokenCount.toLocaleString()}</p>
              </div>
              
              {result.usage && (
                <>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center text-purple-700 mb-1">
                      <Cpu className="h-4 w-4 mr-1" />
                      <span className="text-sm font-medium">API Tokens</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-800">{result.usage.totalTokens.toLocaleString()}</p>
                    <div className="mt-1 flex justify-between text-xs text-purple-600">
                      <span>In: {result.usage.inputTokens.toLocaleString()}</span>
                      <span>Out: {result.usage.outputTokens.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  {cost && (
                    <div className="p-4 bg-indigo-50 rounded-lg">
                      <div className="flex items-center text-indigo-700 mb-1">
                        <CreditCard className="h-4 w-4 mr-1" />
                        <span className="text-sm font-medium">Cost</span>
                      </div>
                      <p className="text-2xl font-bold text-indigo-800">${cost.totalCost.toFixed(6)}</p>
                      <div className="mt-1 text-xs text-indigo-600">
                        GPT-4.1 mini
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          {/* Summary Card */}
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Document Summary</h2>
              
              <button 
                className="text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium"
                onClick={() => {
                  // Create a Blob with the summary text
                  const blob = new Blob([result.summary], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  
                  // Create a temporary link element
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `summary-${fileName || 'document'}.md`;
                  
                  // Trigger the download
                  document.body.appendChild(a);
                  a.click();
                  
                  // Clean up
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </button>
            </div>
            
            <div className="prose prose-blue max-w-none bg-gray-50 p-4 rounded-lg border border-gray-100">
              <ReactMarkdown>
                {result.summary}
              </ReactMarkdown>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button 
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={() => {
                // Reset to allow for a new document
                setResult(null);
                setFileName(null);
                setSavedDocument(null);
              }}
            >
              Analyze Another Document
            </button>
            
            {!savedDocument && (
              <button 
                className="px-4 py-2 border border-green-600 text-green-600 font-medium rounded-md hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center"
                onClick={handleSaveDocument}
              >
                <Database className="mr-2 h-4 w-4" />
                Save to Document Library
              </button>
            )}
            
            {savedDocument && (
              <Link 
                href={`/documents/${savedDocument.id}`}
                className="px-4 py-2 border border-blue-600 text-blue-600 font-medium rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center"
              >
                View Saved Document
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center py-12">
          <FileText className="h-16 w-16 text-gray-300 mb-4" />
          <p className="text-gray-600 text-lg">Upload a document or enter text to see analysis results</p>
          <p className="text-gray-500 text-sm mt-2">Supports PDF and Word documents</p>
        </div>
      )}
    </main>
  );
}