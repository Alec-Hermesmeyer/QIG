"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Info, History, SearchIcon, FileText, Shield, MessagesSquare, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImprovedChatHandle, ImprovedChat } from "@/components/chat";
import DeepRAG from "@/components/DeepRag";
import DeepRagTopicCards from "@/components/DeepRagTopicCards";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import ProtectedRoute from "@/components/ProtectedRoute";
import { RAGProvider } from '@/components/RagProvider';
import { RAGControl } from '@/components/RagControl';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth/AuthContext";
import { useOrganizationSwitch } from "@/contexts/OrganizationSwitchContext";
import { ChatHistoryPanel } from "@/components/ChatHistoryPanel";
import { useChatContext } from "@/components/ChatProvider";

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
  const [conversationStarted, setConversationStarted] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string; metadata?: any; raw?: string }>>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamingContent, setCurrentStreamingContent] = useState("");
  const [streamingIndex, setStreamingIndex] = useState<number | null>(null);
  const [isRAGEnabled, setIsRAGEnabled] = useState(true);
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  const [temperature, setTemperature] = useState(0.3);
  const [streamEnabled, setStreamEnabled] = useState(true);
  
  const chatRef = useRef<ImprovedChatHandle>(null);
  const chatMessageStreamEnd = useRef<HTMLDivElement | null>(null);
  
  const { user } = useAuth();
  const { canSwitchOrganizations } = useOrganizationSwitch();

  // Get IndexedDB chat context
  const {
    activeSession,
    addMessage,
    createSession,
    selectSession,
    showChatHistory,
    setShowChatHistory,
  } = useChatContext();

  // Debug mode
  const DEBUG = false;
  
  const debugLog = (message: string, data?: any) => {
    if (DEBUG) {
      console.log(`[DeepRAG] ${message}`, data);
    }
  };

  // Refs to track accumulated data
  const currentRawResponseRef = useRef<string>("");
  const isStreamingTransitioning = useRef(false);
  const streamingIndexRef = useRef<number | null>(null);
  const currentStreamingContentRef = useRef<string>("");

  // Update refs when state changes
  useEffect(() => {
    streamingIndexRef.current = streamingIndex;
  }, [streamingIndex]);

  useEffect(() => {
    currentStreamingContentRef.current = currentStreamingContent;
  }, [currentStreamingContent]);

  // Handle user message
  const handleUserMessage = useCallback(async (content: string) => {
    setChatHistory(prev => [...prev, { role: 'user', content }]);
    setConversationStarted(true);
    
    // Save to IndexedDB
    await addMessage({
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    });
    
    // Reset raw response for new conversation
    currentRawResponseRef.current = "";
  }, [addMessage]);

  // Handle assistant message
  const handleAssistantMessage = useCallback(async (content: string, metadata?: any) => {
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
      
      if (streamingIndexRef.current === null) {
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
          if (newHistory[streamingIndexRef.current!]) {
            newHistory[streamingIndexRef.current!] = {
              ...newHistory[streamingIndexRef.current!],
              content: currentStreamingContentRef.current + content,
              metadata: {
                ...newHistory[streamingIndexRef.current!].metadata,
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
      const finalContent = currentStreamingContentRef.current + content;
      
      // Extract supporting content from metadata if available
      const supportingContent = extractSupportingContent(metadata);
      
      // Extract thought process from metadata if available
      const thoughtProcess = extractThoughtProcess(metadata);
      
      if (streamingIndexRef.current !== null) {
        // Update the streaming message with final content and metadata
        setChatHistory(prev => {
          const newHistory = [...prev];
          if (newHistory[streamingIndexRef.current!]) {
            newHistory[streamingIndexRef.current!] = {
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
        
        // Save final message to IndexedDB
        await addMessage({
          role: 'assistant',
          content: finalContent,
          timestamp: new Date().toISOString(),
          rawResponse: {
            raw: currentRawResponseRef.current,
            supportingContent,
            thoughtProcess
          },
          supportingContent,
          thoughts: thoughtProcess
        });
      } else {
        // Add new message if no streaming was happening
        setChatHistory(prev => [...prev, { 
          role: 'assistant', 
          content: finalContent,
          metadata: {
            isStreaming: false,
            supportingContent,
            thoughtProcess
          },
          raw: currentRawResponseRef.current
        }]);
        
        // Save to IndexedDB
        await addMessage({
          role: 'assistant',
          content: finalContent,
          timestamp: new Date().toISOString(),
          rawResponse: {
            raw: currentRawResponseRef.current,
            supportingContent,
            thoughtProcess
          },
          supportingContent,
          thoughts: thoughtProcess
        });
      }
      
      // Reset streaming state
      setStreamingIndex(null);
      setCurrentStreamingContent('');
    }
  }, [addMessage]);

  // Extract supporting content from metadata
  const extractSupportingContent = (metadata?: any): any[] => {
    if (!metadata) return [];
    
    // Look for sources in various possible locations
    const sources = metadata.sources || 
                   metadata.supportingContent || 
                   metadata.citations || 
                   metadata.supporting_content ||
                   [];
    
    if (Array.isArray(sources)) {
      return sources;
    }
    
    // If sources is a single object, wrap it in an array
    if (typeof sources === 'object' && sources !== null) {
      return [sources];
    }
    
    return [];
  };

  // Extract thought process from metadata
  const extractThoughtProcess = (metadata?: any): string => {
    if (!metadata) return '';
    
    return metadata.thoughtProcess || 
           metadata.thinking || 
           metadata.reasoning || 
           metadata.analysis ||
           '';
  };

  // Clear chat history
  const clearChat = () => {
    setChatHistory([]);
    setConversationStarted(false);
    setIsStreaming(false);
    setStreamingIndex(null);
    setCurrentStreamingContent('');
    currentRawResponseRef.current = "";
  };

  // New session handler
  const handleNewSession = async () => {
    clearChat();
    await createSession();
  };

  // Handle RAG toggle
  const handleRAGToggle = (enabled: boolean) => {
    setIsRAGEnabled(enabled);
  };

  // Handle bucket selection
  const handleBucketSelect = (bucketId: string | null) => {
    setSelectedBucketId(bucketId);
  };

  // Monitor streaming state and update the message when streaming ends
  useEffect(() => {
    if (!isStreaming && streamingIndex !== null && !isStreamingTransitioning.current) {
      debugLog('Streaming ended, finalizing message');
      
      // Prevent multiple simultaneous updates
      isStreamingTransitioning.current = true;
      
      // Wait a bit longer to ensure all content is processed
      const timer = setTimeout(() => {
        setChatHistory(prev => {
          if (!prev[streamingIndex]) {
            isStreamingTransitioning.current = false;
            return prev;
          }
          
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
          
          // Reset streaming state after update
          setTimeout(() => {
            setStreamingIndex(null);
            setCurrentStreamingContent('');
            isStreamingTransitioning.current = false;
          }, 100);
          
          return newHistory;
        });
      }, 500);
      
      return () => {
        clearTimeout(timer);
        isStreamingTransitioning.current = false;
      };
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
                    <span className="bg-amber-100 text-amber-700 p-1 rounded mr-2">
                      <Brain size={18} />
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowChatHistory(true)}
                    className="text-gray-700 border-gray-300 hover:bg-gray-100"
                  >
                    <History size={16} className="mr-1.5" />
                    History
                  </Button>
                </div>
              </div>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 py-6 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              {/* Organization Switcher for QIG employees */}
              {canSwitchOrganizations && (
                <div className="mb-6">
                  <OrganizationSwitcher />
                </div>
              )}
              
              <div className="shadow-sm overflow-hidden">
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
                            Advanced Document Analysis Platform
                          </h2>
                          <p className="text-gray-600 max-w-2xl mx-auto">
                            Deep insights and structured data extraction from your documents using X-Ray technology and advanced AI reasoning.
                          </p>
                        </motion.div>

                        <motion.div
                          className="grid grid-cols-1 md:grid-cols-3 gap-5"
                          variants={staggerContainer}
                        >
                          {/* Using DeepRagTopicCards for sample questions */}
                          <DeepRagTopicCards chatRef={chatRef} />
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
                                  content: message.content,
                                  metadata: message.metadata,
                                  // Always include these for the component to process correctly
                                  supportingContent: message.metadata?.supportingContent,
                                  thoughtProcess: message.metadata?.thoughtProcess
                                }}
                                theme="light"
                                isStreaming={message.metadata?.isStreaming}
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
                      isRAGEnabled={isRAGEnabled}
                      selectedBucketId={selectedBucketId}
                    />
                  </div>
                </div>
              </div>
            </div>
          </main>
          
          {/* Footer */}
          <footer className="bg-white border-t border-gray-200 py-4">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center text-sm text-gray-500">
                <div>
                  DeepRAG Advanced Document Analysis Platform
                </div>
                <div className="flex space-x-4">
                  <a href="#" className="hover:text-gray-700 transition-colors">Documentation</a>
                  <a href="#" className="hover:text-gray-700 transition-colors">Support</a>
                </div>
              </div>
            </div>
          </footer>
          
          {/* Chat History Panel */}
          <ChatHistoryPanel
            isOpen={showChatHistory}
            onClose={() => setShowChatHistory(false)}
            onSelectSession={selectSession}
            onNewSession={handleNewSession}
            activeSessionId={activeSession?.id || null}
          />
        </div>
      </RAGProvider>
    </ProtectedRoute>
  );
}