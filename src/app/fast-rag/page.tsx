"use client";

import { useState, useRef, useEffect } from "react";
import { History, Settings, Info, SearchIcon, FileText, Shield, MessagesSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ImprovedChatHandle, ImprovedChat } from "@/components/chat";
import FastRAG from "@/components/FastRag";
import { RAGProvider } from '@/components/RagProvider';
import { RAGControl } from '@/components/RagControl';
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import FastRagTopicCards from "@/components/FastRagTopicCards";
import ProtectedRoute from "@/components/ProtectedRoute";

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

export default function FastRAGPage() {
  // State for conversation and streaming
  const [conversationStarted, setConversationStarted] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string; metadata?: any; raw?: string }>>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamingContent, setCurrentStreamingContent] = useState("");
  const [streamingIndex, setStreamingIndex] = useState<number | null>(null);
  
  // RAG state - Using constant instead of state since it's always enabled
  const isRAGEnabled = true; // Always enabled on this page
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  
  // Chat configuration
  const [temperature, setTemperature] = useState(0.3);
  const [streamEnabled, setStreamEnabled] = useState(true);

  // Debug mode
  const debugMode = true;
  const debugLog = (message: string, data?: any) => {
    if (debugMode) {
      if (data) {
        console.log(`[FastRAGPage] ${message}:`, data);
      } else {
        console.log(`[FastRAGPage] ${message}`);
      }
    }
  };

  const chatRef = useRef<ImprovedChatHandle>(null);
  const chatMessageStreamEnd = useRef<HTMLDivElement | null>(null);
  
  // Refs to track accumulated data
  const currentRawResponseRef = useRef<string>("");
  const isStreamingTransitioning = useRef(false);

  // Handle user message
  const handleUserMessage = (content: string) => {
    setChatHistory(prev => [...prev, { role: 'user', content }]);
    setConversationStarted(true);
    // Reset raw response for new conversation
    currentRawResponseRef.current = "";
  };

  // Handle assistant message
  const handleAssistantMessage = (content: string, metadata?: any) => {
    debugLog('Message received', { 
      contentPreview: content.substring(0, 50) + '...', 
      isPartial: metadata?.isPartial,
      hasRaw: metadata?.raw !== undefined
    });
    
    // Accumulate raw response if provided
    if (metadata?.raw) {
      const rawData = metadata.raw;
      currentRawResponseRef.current += rawData;
      debugLog('Accumulated raw data', { length: currentRawResponseRef.current.length });
    } else {
      // If no raw data, treat content as raw
      currentRawResponseRef.current += content;
    }
    
    const isStreamingChunk = metadata?.isPartial === true;
    
    if (isStreamingChunk) {
      // Accumulate content for streaming
      setCurrentStreamingContent(prevContent => prevContent + content);
      
      if (streamingIndex === null) {
        // First chunk - create a new message
        setChatHistory(prev => {
          const newMessage = { 
            role: 'assistant', 
            content, 
            metadata: {
              isStreaming: true,
              supportingContent: [],
              thoughtProcess: ''
            },
            raw: currentRawResponseRef.current
          };
          const newHistory = [...prev, newMessage];
          setStreamingIndex(newHistory.length - 1);
          return newHistory;
        });
      } else {
        // Update existing message with accumulated content
        setChatHistory(prev => {
          const newHistory = [...prev];
          if (newHistory[streamingIndex]) {
            newHistory[streamingIndex] = {
              ...newHistory[streamingIndex],
              content: currentStreamingContent + content,
              metadata: {
                ...newHistory[streamingIndex].metadata,
                isStreaming: true
              },
              raw: currentRawResponseRef.current 
            };
          }
          return newHistory;
        });
      }
    } else {
      // Final message with complete content
      if (streamingIndex !== null) {
        // Save the accumulated content to ensure it's not lost
        const finalContent = currentStreamingContent + content;
        
        // IMPORTANT: Mark that we're transitioning from streaming to complete
        isStreamingTransitioning.current = true;
        
        // Extract supporting content from metadata if available
        const supportingContent = extractSupportingContent(metadata);
        
        // Extract thought process from metadata if available
        const thoughtProcess = extractThoughtProcess(metadata);
        
        // Update the streaming message with final content and metadata
        setChatHistory(prev => {
          const newHistory = [...prev];
          if (newHistory[streamingIndex]) {
            newHistory[streamingIndex] = {
              role: 'assistant',
              content: finalContent,
              metadata: {
                isStreaming: false,
                supportingContent,
                thoughtProcess
              },
              raw: currentRawResponseRef.current
            };
          }
          return newHistory;
        });
        
        // Reset streaming state with a longer delay to ensure the transition is complete
        setTimeout(() => {
          setStreamingIndex(null);
          setCurrentStreamingContent('');
          isStreamingTransitioning.current = false;
        }, 1000);
      } else {
        // Non-streaming message - add directly
        // Extract supporting content from metadata if available
        const supportingContent = extractSupportingContent(metadata);
        
        // Extract thought process from metadata if available
        const thoughtProcess = extractThoughtProcess(metadata);
        
        setChatHistory(prev => [...prev, {
          role: 'assistant',
          content,
          metadata: {
            isStreaming: false,
            supportingContent,
            thoughtProcess
          },
          raw: metadata?.raw || content
        }]);
      }
    }
  };

  // Extract supporting content from various locations in metadata
  const extractSupportingContent = (metadata?: any): any[] => {
    if (!metadata) return [];
    
    // Try different possible locations for supporting content
    if (metadata.supportingContent && Array.isArray(metadata.supportingContent)) {
      return metadata.supportingContent;
    } 
    
    if (metadata.sources && Array.isArray(metadata.sources)) {
      return metadata.sources;
    } 
    
    if (metadata.documentExcerpts && Array.isArray(metadata.documentExcerpts)) {
      return metadata.documentExcerpts;
    } 
    
    if (metadata.searchResults?.sources && Array.isArray(metadata.searchResults.sources)) {
      return metadata.searchResults.sources;
    } 
    
    if (metadata.context?.data_points?.text && Array.isArray(metadata.context.data_points.text)) {
      return metadata.context.data_points.text.map((text: string, i: number) => ({
        fileName: `Source ${i+1}`,
        content: text
      }));
    }
    
    return [];
  };

  // Extract thought process from various locations in metadata
  const extractThoughtProcess = (metadata?: any): string => {
    if (!metadata) return '';
    
    if (typeof metadata.thoughtProcess === 'string') {
      return metadata.thoughtProcess;
    } 
    
    if (typeof metadata.thoughts === 'string') {
      return metadata.thoughts;
    } 
    
    if (Array.isArray(metadata.thoughts)) {
      return metadata.thoughts.join('\n\n');
    } 
    
    if (typeof metadata.context?.thoughts === 'string') {
      return metadata.context.thoughts;
    } 
    
    if (Array.isArray(metadata.context?.thoughts)) {
      return metadata.context.thoughts.join('\n\n');
    }
    
    return '';
  };

  // Handle bucket selection (maintained for bucket selection dropdown)
  const handleBucketSelect = (bucketId: string | null) => {
    setSelectedBucketId(bucketId);
  };

  // Clear chat history
  const clearChat = () => {
    setChatHistory([]);
    setConversationStarted(false);
    setStreamingIndex(null);
    setCurrentStreamingContent("");
    currentRawResponseRef.current = "";
  };

  // Monitor streaming state and update the message when streaming ends
  useEffect(() => {
    if (!isStreaming && streamingIndex !== null && !isStreamingTransitioning.current) {
      debugLog('Streaming ended, finalizing message');
      
      // Wait a bit longer to ensure all content is processed
      const timer = setTimeout(() => {
        setChatHistory(prev => {
          if (!prev[streamingIndex]) return prev;
          
          const currentMessage = prev[streamingIndex];
          // Preserve the current content when updating the metadata
          const updatedMessage = {
            ...currentMessage,
            // Ensure we keep the content
            content: currentMessage.content,
            metadata: {
              ...currentMessage.metadata,
              isStreaming: false
            },
            raw: currentRawResponseRef.current
          };
          
          const newHistory = [...prev];
          newHistory[streamingIndex] = updatedMessage;
          return newHistory;
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isStreaming, streamingIndex]);
  
  // Scroll to the bottom when chat updates
  useEffect(() => {
    if (chatMessageStreamEnd.current) {
      chatMessageStreamEnd.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  return (
    <ProtectedRoute>
      <RAGProvider>
        <div className="min-h-screen flex flex-col bg-gray-50">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-semibold text-gray-900 flex items-center">
                    <span className="bg-blue-100 text-blue-800 p-1 rounded mr-2">
                      <SearchIcon size={18} />
                    </span>
                    FastRAG
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span><Info size={16} className="ml-2 text-gray-400 cursor-help" /></span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="w-64 text-sm">FastRAG provides real-time document search and AI-powered answers.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Badge variant="outline" className="ml-3 text-xs font-normal bg-blue-50">
                      v2.0
                    </Badge>
                  </h1>
                </div>
                <div className="flex items-center space-x-3">
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
            <div className="max-w-5xl mx-auto shadow-sm overflow-hidden">
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
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">
                          Document Intelligence Platform
                        </h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                          Get precise answers and insights from your documents with our advanced retrieval-augmented generation system.
                        </p>
                      </motion.div>

                      <motion.div
                        className="grid grid-cols-1 md:grid-cols-3 gap-5"
                        variants={staggerContainer}
                      >
                        {/* Using SampleQuestions hook to get questions for cards */}
                        <FastRagTopicCards chatRef={chatRef} />
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
                            <div className="bg-blue-600 text-white p-3 px-4 rounded-2xl rounded-tr-sm max-w-[80%] shadow-sm">
                              {message.content}
                            </div>
                          </div>
                        ) : (
                          <div className="max-w-[92%]">
                            <FastRAG 
                              answer={{
                                content: message.content,
                                metadata: message.metadata,
                                raw: message.raw,
                                // Always include these for the component to process correctly
                                isStreaming: message.metadata?.isStreaming,
                                supportingContent: message.metadata?.supportingContent,
                                thoughtProcess: message.metadata?.thoughtProcess
                              }}
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
                    onStreamingChange={(streaming) => {
                      setIsStreaming(streaming);
                      debugLog('Streaming status changed', streaming ? 'started' : 'ended');
                      
                      // When streaming stops, ensure we don't lose the accumulated raw response
                      if (!streaming) {
                        debugLog('Streaming ended, final raw response length', currentRawResponseRef.current.length);
                      }
                    }}
                    temperature={temperature}
                    streamResponses={streamEnabled}
                    isRAGEnabled={true}
                    selectedBucketId={selectedBucketId}
                    // Add include_thought_process to enable thought processes in the API
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
                  FastRAG Document Intelligence Platform
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
    </ProtectedRoute>
  );
}