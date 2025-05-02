'use client';

import { useState } from 'react';
import { RawResponseViewer } from '@/components/RawResponseViewer';
import Answer from '@/components/Answer'; // Import your updated Answer component
import { motion, AnimatePresence } from 'framer-motion';
import { Database, FileText, Loader, ChevronDown, ChevronUp, Settings } from 'lucide-react';

// Define the source information type
interface Source {
  id: string | number;
  fileName: string;
  title?: string;
  score?: number;
  excerpts?: string[];
  narrative?: string[];
  metadata?: Record<string, any>;
}

// Define search results type
interface SearchResults {
  count: number;
  sources: Source[];
}

// Define document excerpt type
interface DocumentExcerpt {
  id: string;
  fileName: string;
  excerpts: string[];
  narrative: string[];
  metadata?: Record<string, any>;
}

export default function RagDebugPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [query, setQuery] = useState('What is the biggest risk for brand management contracts?');
  const [bucketId, setBucketId] = useState('18499'); // Your default bucket ID
  const [includeThoughts, setIncludeThoughts] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [limit, setLimit] = useState(10);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [temperature, setTemperature] = useState(0.3);
  
  // Add state for toggling between raw response and formatted answer view
  const [viewMode, setViewMode] = useState<'raw' | 'formatted'>('formatted');

  // Extract document excerpts from the response
  const extractDocumentExcerpts = (response: any): DocumentExcerpt[] => {
    if (!response || !response.result || !response.result.documents) {
      return [];
    }

    return response.result.documents.map((doc: any) => ({
      id: doc.id || `doc-${Math.random().toString(36).substr(2, 9)}`,
      fileName: doc.fileName || doc.name || `Document ${doc.id}`,
      excerpts: doc.snippets || [],
      narrative: doc.narrative || [],
      metadata: doc.metadata || {}
    }));
  };

  // Extract search results from the response
  const extractSearchResults = (response: any): SearchResults | undefined => {
    if (!response || !response.result || !response.result.documents) {
      return undefined;
    }

    return {
      count: response.result.documents.length,
      sources: response.result.documents.map((doc: any) => ({
        id: doc.id || `doc-${Math.random().toString(36).substr(2, 9)}`,
        fileName: doc.fileName || doc.name || `Document ${doc.id}`,
        title: doc.title,
        score: doc.score,
        excerpts: doc.snippets || [],
        narrative: doc.narrative || [],
        metadata: doc.metadata || {}
      }))
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const apiRequest = {
        query,
        bucketId,
        messages: [], // Leave empty for simplicity
        includeThoughts: includeThoughts,
        limit,
        maxTokens,
        temperature
      };
      
      console.log('Sending RAG API request:', apiRequest);
      
      const res = await fetch('/api/groundx/rag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiRequest)
      });
      
      if (!res.ok) {
        throw new Error(`API request failed with status ${res.status}`);
      }
      
      const data = await res.json();
      console.log('RAG API response:', data);
      setResponse(data);
    } catch (error) {
      console.error('Error making RAG API request:', error);
      alert('Error making RAG API request. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCitationClicked = (filePath: string) => {
    console.log('Citation clicked:', filePath);
    // Implementation depends on how you want to handle this
    // You could open a modal, navigate to a document viewer, etc.
    alert(`Document clicked: ${filePath}`);
  };

  const handleThoughtProcessClicked = () => {
    // For debug page, just switch to raw view which contains the thoughts
    setViewMode('raw');
  };

  const handleSupportingContentClicked = () => {
    // For debug page, we could highlight the sources section
    const sourcesElement = document.getElementById('sources-section');
    if (sourcesElement) {
      sourcesElement.scrollIntoView({ behavior: 'smooth' });
      sourcesElement.classList.add('highlight-pulse');
      setTimeout(() => {
        sourcesElement.classList.remove('highlight-pulse');
      }, 2000);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold mb-2 text-indigo-700 flex items-center"
      >
        <Database className="mr-2" />
        GroundX RAG API Debugger
      </motion.h1>
      
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-gray-600 mb-6"
      >
        Test and debug GroundX RAG responses with advanced visualization tools
      </motion.p>
      
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mb-8 p-4 bg-white rounded-lg shadow border border-gray-100"
      >
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-1">
              Query
            </label>
            <input
              id="query"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter your query..."
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="bucketId" className="block text-sm font-medium text-gray-700 mb-1">
              Bucket ID
            </label>
            <input
              id="bucketId"
              type="text"
              value={bucketId}
              onChange={(e) => setBucketId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter bucket ID..."
            />
          </div>
          
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="includeThoughts"
                type="checkbox"
                checked={includeThoughts}
                onChange={(e) => setIncludeThoughts(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="includeThoughts" className="ml-2 block text-sm text-gray-700">
                Include AI Thoughts
              </label>
            </div>
            
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center text-sm text-indigo-600 hover:text-indigo-800"
            >
              <Settings size={14} className="mr-1" />
              Advanced Settings
              {showAdvanced ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />}
            </button>
          </div>
          
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 bg-gray-50 p-3 rounded-md border border-gray-200"
              >
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="limit" className="block text-xs font-medium text-gray-700 mb-1">
                      Document Limit
                    </label>
                    <input
                      id="limit"
                      type="number"
                      min="1"
                      max="50"
                      value={limit}
                      onChange={(e) => setLimit(parseInt(e.target.value))}
                      className="w-full p-1 text-sm border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="maxTokens" className="block text-xs font-medium text-gray-700 mb-1">
                      Max Tokens
                    </label>
                    <input
                      id="maxTokens"
                      type="number"
                      min="100"
                      max="10000"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                      className="w-full p-1 text-sm border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="temperature" className="block text-xs font-medium text-gray-700 mb-1">
                      Temperature
                    </label>
                    <input
                      id="temperature"
                      type="number"
                      min="0"
                      max="1"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full p-1 text-sm border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              isLoading ? 'opacity-75 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <Loader size={16} className="animate-spin mr-2" />
                Querying GroundX API...
              </span>
            ) : (
              'Send RAG Request'
            )}
          </button>
        </form>
      </motion.div>
      
      {response && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 bg-white rounded-lg shadow border border-gray-100 overflow-hidden"
        >
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setViewMode('formatted')}
                className={`px-4 py-2 text-sm font-medium ${
                  viewMode === 'formatted'
                    ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                Formatted Response
              </button>
              <button
                onClick={() => setViewMode('raw')}
                className={`px-4 py-2 text-sm font-medium ${
                  viewMode === 'raw'
                    ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                Raw JSON Response
              </button>
            </div>
          </div>
          
          <div className="p-4">
            {viewMode === 'raw' ? (
              <RawResponseViewer responseData={response} />
            ) : (
              <div>
                {response.result?.answer?.content && (
                  <Answer
                    answer={response.result.answer}
                    index={0}
                    isSelected={false}
                    isStreaming={false}
                    searchResults={extractSearchResults(response)}
                    documentExcerpts={extractDocumentExcerpts(response)}
                    onCitationClicked={handleCitationClicked}
                    onThoughtProcessClicked={handleThoughtProcessClicked}
                    onSupportingContentClicked={handleSupportingContentClicked}
                    showFollowupQuestions={true}
                  />
                )}
                
                {/* Show document sources section with ID for scrolling anchor */}
                <div id="sources-section" className="mt-8 p-4 border rounded-lg">
                  <h2 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
                    <FileText className="mr-2" size={18} />
                    Retrieved Documents ({response.result?.documents?.length || 0})
                  </h2>
                  
                  {response.result?.documents?.length > 0 ? (
                    <div className="space-y-2">
                      {response.result.documents.map((doc: any, idx: number) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200">
                          <div className="flex justify-between">
                            <div className="font-medium text-indigo-700">
                              {doc.fileName || doc.name || `Document ${doc.id}`}
                            </div>
                            <div className="text-sm text-gray-600">
                              Score: {(doc.score * 100).toFixed(1)}%
                            </div>
                          </div>
                          
                          {doc.id && (
                            <div className="text-xs text-gray-500 mt-1">
                              ID: {doc.id}
                            </div>
                          )}
                          
                          {doc.snippets && doc.snippets.length > 0 && (
                            <div className="mt-2">
                              <div className="text-sm font-medium text-gray-700">Snippets:</div>
                              <div className="mt-1 space-y-1">
                                {doc.snippets.map((snippet: string, i: number) => (
                                  <div key={i} className="text-sm p-2 bg-white rounded border border-gray-100">
                                    {snippet}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-500 italic">No documents retrieved</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
      
      {isLoading && !response && (
        <div className="flex justify-center items-center my-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      )}
      
      <style jsx global>{`
        .highlight-pulse {
          animation: pulse 1s;
        }
        
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(99, 102, 241, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
          }
        }
      `}</style>
    </div>
  );
}