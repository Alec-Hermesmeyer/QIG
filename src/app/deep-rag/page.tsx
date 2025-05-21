"use client";

import { useState, useRef, useEffect } from "react";
import { History, Settings, Info, Zap, FileSearch, Database, BarChart4 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ImprovedChatHandle, ImprovedChat } from "@/components/chat";
import DeepRAG from "@/components/DeepRag";
import { RAGProvider } from '@/components/RagProvider';
import { RAGControl } from '@/components/RagControl';
import { Source } from "@/types/types";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Animation variants
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } }
};

const slideUp = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function DeepRAGPage() {
  // State for conversation and streaming
  const [conversationStarted, setConversationStarted] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ 
    role: string; 
    content: string | any; 
    searchResults?: any;
    metadata?: any;
  }>>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // RAG state
  const [isRAGEnabled, setIsRAGEnabled] = useState(true); // Default enabled for this page
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  
  // Chat configuration
  const [temperature, setTemperature] = useState(0.3);
  const [streamEnabled, setStreamEnabled] = useState(false); // Default to non-streaming for DeepRAG
  
  const chatRef = useRef<ImprovedChatHandle>(null);
  const chatMessageStreamEnd = useRef<HTMLDivElement | null>(null);

  // Handle user message
  const handleUserMessage = (content: string) => {
    setChatHistory(prev => [...prev, { role: 'user', content }]);
    setConversationStarted(true);
  };

  // Handle assistant message - Improved to properly extract and format sources
  const handleAssistantMessage = (content: string, metadata?: any) => {
    console.log("DeepRAG received assistant message:", { content, metadata });
    
    // Deep clone the metadata to avoid reference issues
    const metadataCopy = metadata ? JSON.parse(JSON.stringify(metadata)) : {};
    
    // Extract sources from various possible locations
    let sources: Source[] = [];
    
    // First try to get sources from metadata
    if (metadataCopy?.sources && Array.isArray(metadataCopy.sources)) {
      sources = metadataCopy.sources;
    } 
    // Then try searchResults.sources
    else if (metadataCopy?.searchResults?.sources && Array.isArray(metadataCopy.searchResults.sources)) {
      sources = metadataCopy.searchResults.sources;
    }
    // Then try supportingContent if it's array-like
    else if (metadataCopy?.supportingContent && Array.isArray(metadataCopy.supportingContent)) {
      sources = metadataCopy.supportingContent.map((item: any, index: number) => ({
        id: item.id || `source_${index}`,
        fileName: item.fileName || item.title || `Source ${index + 1}`,
        text: item.text || item.content || '',
        score: item.score || 0,
        metadata: item.metadata || {}
      }));
    }
    
    // Process sources to ensure proper structure
    const processedSources = sources.map((source: any, index: number) => ({
      id: source.id || `source_${index}`,
      fileName: source.fileName || source.title || source.name || `Source ${index + 1}`,
      text: source.text || source.content || source.excerpt || '',
      metadata: source.metadata || {},
      sourceUrl: source.sourceUrl || source.url || '',
      score: source.score || source.relevance || 0,
      rawScore: source.rawScore,
      scoreSource: source.scoreSource,
      highlights: source.highlights || [],
      hasXray: Boolean(source.hasXray || source.xray),
      xray: source.xray || null
    }));
    
    // Extract thoughts from various possible locations
    const thoughts = 
      metadataCopy?.thoughts || 
      metadataCopy?.thoughtProcess || 
      metadataCopy?.reasoning || 
      (metadataCopy?.result?.thoughts && typeof metadataCopy.result.thoughts === 'string' 
        ? metadataCopy.result.thoughts 
        : '');
    
    setChatHistory(prev => [...prev, { 
      role: 'assistant', 
      content, 
      searchResults: {
        sources: processedSources,
        count: processedSources.length
      },
      metadata: {
        ...metadataCopy,
        sources: processedSources,
        thoughts: thoughts
      }
    }]);
  };

  // Scroll to latest message
  useEffect(() => {
    if (chatMessageStreamEnd.current) {
      chatMessageStreamEnd.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, isStreaming]);

  // Handle RAG toggle
  const handleRAGToggle = (enabled: boolean) => {
    setIsRAGEnabled(enabled);
  };

  // Handle bucket selection
  const handleBucketSelect = (bucketId: string | null) => {
    setSelectedBucketId(bucketId);
  };

  // Clear chat history
  const clearChat = () => {
    setChatHistory([]);
    setConversationStarted(false);
  };

  return (
    <RAGProvider>
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900 flex items-center">
                  <span className="bg-amber-100 text-amber-700 p-1 rounded mr-2">
                    <Zap size={18} />
                  </span>
                  DeepRAG
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span><Info size={16} className="ml-2 text-gray-400 cursor-help" /></span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="w-64 text-sm">DeepRAG provides X-Ray technology for detailed document insights and in-depth analysis.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Badge variant="outline" className="ml-3 text-xs font-normal bg-amber-50 text-amber-700 border-amber-200">
                    Advanced
                  </Badge>
                </h1>
              </div>
              <div className="flex items-center space-x-3">
                <RAGControl
                  enabled={isRAGEnabled}
                  selectedBucketId={selectedBucketId}
                  onToggle={handleRAGToggle}
                  onBucketSelect={handleBucketSelect}
                />
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearChat}
                  className="text-gray-700 border-gray-300 hover:bg-gray-100"
                >
                  <History size={16} className="mr-1.5" />
                  Clear Chat
                </Button>
                
                
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto  rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              {/* Introduction - only show when conversation not started */}
              <AnimatePresence>
                {!conversationStarted && (
                  <motion.div
                    className="mb-8"
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, y: -20 }}
                    variants={fadeIn}
                  >
                    <motion.div className="text-center mb-8" variants={slideUp}>
                      <h2 className="text-2xl font-bold text-gray-900 mb-3 flex items-center justify-center">
                        <Zap size={24} className="text-amber-500 mr-2" />
                        Advanced Document Intelligence
                      </h2>
                      <p className="text-gray-600 max-w-2xl mx-auto">
                        DeepRAG uses X-Ray technology to analyze document structure, extract meaningful data, and provide comprehensive insights.
                      </p>
                    </motion.div>

                    <motion.div
                      className="grid grid-cols-1 md:grid-cols-3 gap-5"
                      variants={staggerContainer}
                    >
                      <motion.div
                        className="bg-gradient-to-br from-amber-50 to-amber-100 p-6 rounded-lg border border-amber-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
                        variants={slideUp}
                        whileHover={{ y: -2, transition: { duration: 0.2 } }}
                        onClick={() => chatRef.current?.submitMessage("Analyze the structure and key sections of our most recent contract")}
                      >
                        <div className="flex items-center mb-3">
                          <span className="p-2 bg-amber-200 text-amber-700 rounded-lg">
                            <FileSearch size={18} />
                          </span>
                          <h3 className="font-semibold ml-2 text-gray-800">Document Structure</h3>
                        </div>
                        <p className="text-sm text-gray-600">Get comprehensive breakdown of contract structure and section analysis</p>
                      </motion.div>

                      <motion.div
                        className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
                        variants={slideUp}
                        whileHover={{ y: -2, transition: { duration: 0.2 } }}
                        onClick={() => chatRef.current?.submitMessage("Extract all tables from our financial reports and summarize each one")}
                      >
                        <div className="flex items-center mb-3">
                          <span className="p-2 bg-orange-200 text-orange-700 rounded-lg">
                            <Database size={18} />
                          </span>
                          <h3 className="font-semibold ml-2 text-gray-800">Data Extraction</h3>
                        </div>
                        <p className="text-sm text-gray-600">Automatically extract and analyze tables, lists and structured data</p>
                      </motion.div>

                      <motion.div
                        className="bg-gradient-to-br from-rose-50 to-rose-100 p-6 rounded-lg border border-rose-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
                        variants={slideUp}
                        whileHover={{ y: -2, transition: { duration: 0.2 } }}
                        onClick={() => chatRef.current?.submitMessage("Compare our latest product specifications against industry standards")}
                      >
                        <div className="flex items-center mb-3">
                          <span className="p-2 bg-rose-200 text-rose-700 rounded-lg">
                            <BarChart4 size={18} />
                          </span>
                          <h3 className="font-semibold ml-2 text-gray-800">Comparative Analysis</h3>
                        </div>
                        <p className="text-sm text-gray-600">Compare documents against benchmarks, standards, and historical data</p>
                      </motion.div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chat history container with improved styling */}
              <div className={`mb-6 ${conversationStarted ? '' : 'border-t border-gray-200 pt-6'}`}>
                <AnimatePresence>
                  {chatHistory.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="mb-4"
                    >
                      {message.role === 'user' ? (
                        <div className="flex justify-end">
                          <div className="bg-amber-600 text-white p-3 px-4 rounded-2xl rounded-tr-sm max-w-[80%] shadow-sm">
                            {message.content}
                          </div>
                        </div>
                      ) : (
                        <div className="max-w-[92%]">
                          <DeepRAG 
                            answer={{
                              content: typeof message.content === 'string' ? message.content : 
                                      (message.content?.content || JSON.stringify(message.content)),
                              thoughts: message.metadata?.thoughts || '',
                              searchResults: message.searchResults,
                              sources: message.searchResults?.sources
                            }}
                            isStreaming={isStreaming && index === chatHistory.length - 1}
                            theme="light"
                          />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                <div ref={chatMessageStreamEnd} />
              </div>

              {/* Chat input with improved styling */}
              <div className={`${conversationStarted ? '' : 'border-t border-gray-200 pt-6'}`}>
                <ImprovedChat
                  ref={chatRef}
                  onUserMessage={handleUserMessage}
                  onAssistantMessage={handleAssistantMessage}
                  onConversationStart={() => setConversationStarted(true)}
                  onStreamingChange={setIsStreaming}
                  temperature={temperature}
                  streamResponses={streamEnabled}
                  isRAGEnabled={isRAGEnabled}
                  selectedBucketId={selectedBucketId}
                  useRAG={true} // Force RAG for DeepRAG page
                />
              </div>
            </div>
          </div>
        </main>
        
        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center text-sm text-gray-500">
              <div>
                DeepRAG Advanced Analytics Platform
              </div>
              <div className="flex space-x-4">
                <a href="#" className="hover:text-gray-700 transition-colors">Documentation</a>
                <a href="#" className="hover:text-gray-700 transition-colors">Support</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </RAGProvider>
  );
}