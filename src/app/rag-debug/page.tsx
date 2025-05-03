'use client';

import { useState } from 'react';
import { RawResponseViewer } from '@/components/RawResponseViewer';
import Answer from '@/components/Answer';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, 
  FileText, 
  Loader, 
  ChevronDown, 
  ChevronUp, 
  Settings,
  Search,
  Sliders,
  BarChart3,
  Eye,
  Code,
  Filter
} from 'lucide-react';

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
  const [bucketId, setBucketId] = useState('18499');
  const [includeThoughts, setIncludeThoughts] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [limit, setLimit] = useState(10);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [temperature, setTemperature] = useState(0.3);
  const [viewMode, setViewMode] = useState<'raw' | 'formatted'>('formatted');
  const [expandedDocs, setExpandedDocs] = useState<Set<number>>(new Set());

  // Toggle document expansion
  const toggleDocExpansion = (index: number) => {
    const newExpanded = new Set(expandedDocs);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedDocs(newExpanded);
  };

  // Format score as a percentage with color coding
  const formatScore = (score: number) => {
    const scorePercent = (score * 100).toFixed(1);
    let colorClass = "text-red-600";
    if (score >= 0.8) {
      colorClass = "text-green-600";
    } else if (score >= 0.6) {
      colorClass = "text-yellow-600";
    } else if (score >= 0.4) {
      colorClass = "text-orange-600";
    }
    return <span className={`font-medium ${colorClass}`}>{scorePercent}%</span>;
  };

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
        messages: [],
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl font-bold text-indigo-800 flex items-center"
            >
              <Database className="mr-3 text-indigo-600" />
              GroundX RAG Explorer
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-gray-600 mt-2 ml-9"
            >
              Advanced visualization and debugging for Retrieval-Augmented Generation
            </motion.p>
          </div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="hidden md:flex items-center space-x-2 bg-white py-1 px-3 rounded-full shadow-md border border-indigo-100"
          >
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-medium text-gray-600">API Connected</span>
          </motion.div>
        </div>
        
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mb-8 bg-white rounded-xl shadow-lg border border-indigo-100 overflow-hidden"
        >
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-4 px-6">
            <h2 className="text-white text-lg font-medium flex items-center">
              <Search className="mr-2" size={18} />
              Query Configuration
            </h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-6">
              <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                <Search size={14} className="mr-1 text-indigo-500" />
                Query
              </label>
              <input
                id="query"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow shadow-sm hover:shadow"
                placeholder="Enter your query..."
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="md:col-span-2">
                <label htmlFor="bucketId" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Database size={14} className="mr-1 text-indigo-500" />
                  Bucket ID
                </label>
                <input
                  id="bucketId"
                  type="text"
                  value={bucketId}
                  onChange={(e) => setBucketId(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow shadow-sm hover:shadow"
                  placeholder="Enter bucket ID..."
                />
              </div>
              
              <div className="md:col-span-2 flex items-end">
                <div className="flex items-center bg-indigo-50 p-3 rounded-lg border border-indigo-100 w-full">
                  <input
                    id="includeThoughts"
                    type="checkbox"
                    checked={includeThoughts}
                    onChange={(e) => setIncludeThoughts(e.target.checked)}
                    className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="includeThoughts" className="ml-2 block text-sm text-gray-700">
                    Include AI Reasoning Process
                  </label>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 transition-colors rounded-lg px-4 py-2 border border-indigo-100"
              >
                <Sliders size={14} className="mr-2" />
                Advanced Parameters
                {showAdvanced ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />}
              </button>
            </div>
            
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-lg border border-indigo-100 shadow-inner"
                >
                  <h3 className="text-sm font-medium text-indigo-800 mb-4 flex items-center">
                    <Sliders size={14} className="mr-1" />
                    Fine-tune API Parameters
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label htmlFor="limit" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Filter size={14} className="mr-1 text-indigo-500" />
                        Document Limit
                      </label>
                      <div className="relative">
                        <input
                          id="limit"
                          type="number"
                          min="1"
                          max="50"
                          value={limit}
                          onChange={(e) => setLimit(parseInt(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <div className="absolute right-3 top-2 text-xs text-gray-500">docs</div>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">Number of documents to retrieve</div>
                    </div>
                    
                    <div>
                      <label htmlFor="maxTokens" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <BarChart3 size={14} className="mr-1 text-indigo-500" />
                        Max Tokens
                      </label>
                      <div className="relative">
                        <input
                          id="maxTokens"
                          type="number"
                          min="100"
                          max="10000"
                          value={maxTokens}
                          onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <div className="absolute right-3 top-2 text-xs text-gray-500">tokens</div>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">Maximum response length</div>
                    </div>
                    
                    <div>
                      <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Sliders size={14} className="mr-1 text-indigo-500" />
                        Temperature
                      </label>
                      <input
                        id="temperature"
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-indigo-800">{temperature} (Precise)</span>
                        <span className="text-xs text-gray-500">Creative</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all ${
                isLoading ? 'opacity-80 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <Loader size={18} className="animate-spin mr-2" />
                  Processing RAG Request...
                </span>
              ) : (
                <span className="flex items-center justify-center">
                  <Search size={18} className="mr-2" />
                  Generate RAG Response
                </span>
              )}
            </button>
          </form>
        </motion.div>
        
        {response && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-white rounded-xl shadow-lg border border-indigo-100 overflow-hidden mb-8"
          >
            <div className="border-b border-gray-200 bg-gray-50">
              <div className="flex">
                <button
                  onClick={() => setViewMode('formatted')}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${
                    viewMode === 'formatted'
                      ? 'bg-white text-indigo-700 border-b-2 border-indigo-500'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <Eye size={16} className={`inline-block mr-2 ${viewMode === 'formatted' ? 'text-indigo-500' : 'text-gray-400'}`} />
                  Formatted View
                </button>
                <button
                  onClick={() => setViewMode('raw')}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${
                    viewMode === 'raw'
                      ? 'bg-white text-indigo-700 border-b-2 border-indigo-500'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <Code size={16} className={`inline-block mr-2 ${viewMode === 'raw' ? 'text-indigo-500' : 'text-gray-400'}`} />
                  Raw JSON
                </button>
              </div>
            </div>
            
            <div className="p-0">
              {viewMode === 'raw' ? (
                <div className="p-4">
                  <RawResponseViewer responseData={response} />
                </div>
              ) : (
                <div className="p-4">
                  {response.result?.answer?.content && (
                    <div className="mb-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
                      <h2 className="text-xl font-medium text-indigo-800 mb-4 pb-2 border-b border-indigo-100">AI Response</h2>
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
                    </div>
                  )}
                  
                  {/* Show document sources section with ID for scrolling anchor */}
                  <div id="sources-section" className="mt-8 p-6 bg-white rounded-lg border border-indigo-100 shadow-sm">
                    <h2 className="text-xl font-medium text-indigo-800 mb-4 pb-2 border-b border-indigo-100 flex items-center">
                      <FileText className="mr-2 text-indigo-600" size={20} />
                      Retrieved Documents ({response.result?.documents?.length || 0})
                    </h2>
                    
                    {response.result?.documents?.length > 0 ? (
                      <div className="space-y-4">
                        {response.result.documents.map((doc: any, idx: number) => {
                          const isExpanded = expandedDocs.has(idx);
                          return (
                            <motion.div 
                              key={idx} 
                              className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.05 }}
                            >
                              <div 
                                className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                                onClick={() => toggleDocExpansion(idx)}
                              >
                                <div className="flex items-center">
                                  <div className="mr-2 text-indigo-600">
                                    <FileText size={16} />
                                  </div>
                                  <div>
                                    <div className="font-medium text-indigo-700">
                                      {doc.fileName || doc.name || `Document ${doc.id}`}
                                    </div>
                                    {doc.id && (
                                      <div className="text-xs text-gray-500 mt-1 flex items-center">
                                        <span className="font-mono">ID: {doc.id}</span>
                                        <span className="mx-2">•</span>
                                        <span>Relevance: {formatScore(doc.score)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  {isExpanded ? 
                                    <ChevronUp size={18} className="text-gray-400" /> : 
                                    <ChevronDown size={18} className="text-gray-400" />
                                  }
                                </div>
                              </div>
                              
                              <AnimatePresence>
                                {isExpanded && doc.snippets && doc.snippets.length > 0 && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="border-t border-gray-200 bg-gray-50"
                                  >
                                    <div className="p-4">
                                      <div className="text-sm font-medium text-gray-700 mb-2">Document Snippets</div>
                                      <div className="space-y-2">
                                        {doc.snippets.map((snippet: string, i: number) => (
                                          <div key={i} className="text-sm p-3 bg-white rounded border border-gray-200 shadow-sm">
                                            {snippet}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-gray-500 italic text-center py-8">No documents retrieved</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
        
        {isLoading && !response && (
          <div className="flex flex-col justify-center items-center my-12 p-8 bg-white rounded-lg border border-indigo-100 shadow-md">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
            <div className="text-indigo-800 font-medium">Processing your query...</div>
            <div className="text-gray-500 text-sm mt-2">Retrieving documents and generating response</div>
          </div>
        )}
      </div>
      
      <style jsx global>{`
        .highlight-pulse {
          animation: pulse 1.5s;
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