"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { History, Settings, Info, SearchIcon, Brain, ArrowRight, Loader2, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ImprovedChatHandle, ImprovedChat } from "@/components/chat";
import FastRAG from "@/components/FastRag";
import DeepRAG from "@/components/DeepRag";
import { RAGProvider } from '@/components/RagProvider';
import { RAGControl } from '@/components/RagControl';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import ProtectedRoute from "@/components/ProtectedRoute";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import { useOrganizationSwitch } from "@/contexts/OrganizationSwitchContext";
import { ChatHistoryPanel } from "@/components/ChatHistoryPanel";
import { useChatContext } from "@/components/ChatProvider";
import { useApiWarmup } from '@/hooks/useApiWarmup';

// RAG Mode types
type RAGMode = 'fast' | 'deep' | 'dual';

interface DualRAGMessage {
  role: string;
  content: string;
  metadata?: any;
  raw?: string;
  ragType?: 'fast' | 'deep';
  deepRAGPending?: boolean;
  deepRAGResponse?: {
    content: string;
    metadata?: {
      searchResults?: any;
      thoughts?: any;
      sources?: any[];
    };
  };
  timestamp?: number;
  messageId?: string;
}

export default function DualRAGPage() {
  const { canSwitchOrganizations, activeOrganization } = useOrganizationSwitch();
  
  // Initialize API warmup for this page
  const { warmupBeforeChat } = useApiWarmup({
    autoWarmup: true,
    warmupOnChatNavigation: true,
    debug: process.env.NODE_ENV === 'development'
  });
  
  // Get IndexedDB chat context
  const {
    activeSession,
    addMessage,
    createSession,
    selectSession,
    showChatHistory,
    setShowChatHistory,
  } = useChatContext();
  
  // State for conversation and streaming
  const [conversationStarted, setConversationStarted] = useState(false);
  const [chatHistory, setChatHistory] = useState<DualRAGMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // RAG configuration
  const [ragMode, setRAGMode] = useState<RAGMode>('dual');
  const [autoDeepRAG, setAutoDeepRAG] = useState(true);
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  
  // Chat configuration
  const [temperature, setTemperature] = useState(0.3);
  const [streamEnabled, setStreamEnabled] = useState(true);

  const chatRef = useRef<ImprovedChatHandle>(null);
  const deepRAGChatRef = useRef<ImprovedChatHandle>(null);
  const chatMessageStreamEnd = useRef<HTMLDivElement | null>(null);

  // Reset selectedBucketId when organization changes
  useEffect(() => {
    setSelectedBucketId(null);
  }, [activeOrganization?.id]);

  // Warm up APIs when user selects a bucket (indicating intent to use RAG)
  useEffect(() => {
    if (selectedBucketId) {
      warmupBeforeChat();
    }
  }, [selectedBucketId, warmupBeforeChat]);

  // Handle user message
  const handleUserMessage = useCallback(async (content: string) => {
    const timestamp = Date.now();
    const messageId = `msg-${timestamp}`;
    const userMessage: DualRAGMessage = { 
      role: 'user', 
      content, 
      timestamp,
      messageId
    };
    
    setChatHistory(prev => [...prev, userMessage]);
    setConversationStarted(true);
    
    // Save to IndexedDB
    await addMessage({
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    });
  }, [addMessage]);

  // Handle Fast RAG assistant message
  const handleFastAssistantMessage = useCallback(async (content: string, metadata?: any) => {
    const timestamp = Date.now();
    const messageId = `fast-${timestamp}`;
    
    const newMessage: DualRAGMessage = {
      role: 'assistant',
      content,
      metadata,
      ragType: 'fast',
      timestamp,
      messageId
    };

    setChatHistory(prev => [...prev, newMessage]);
    
    // Save to IndexedDB
    await addMessage({
      role: 'assistant',
      content,
      timestamp: new Date().toISOString()
    });
  }, [addMessage]);

  // Trigger Deep RAG analysis
  const triggerDeepRAGAnalysis = useCallback(async (query: string, fastMessageId: string) => {
    if (!selectedBucketId) return;

    // Mark the fast message as having pending deep analysis
    setChatHistory(prev => prev.map(msg => 
      msg.messageId === fastMessageId 
        ? { ...msg, deepRAGPending: true }
        : msg
    ));

    try {
      const response = await fetch('/api/groundx/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          bucketId: selectedBucketId,
          config: {
            temperature,
            includeThoughts: true,
            maxTokens: 3000
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Deep RAG API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setChatHistory(prev => prev.map(msg => 
          msg.messageId === fastMessageId 
            ? {
                ...msg,
                deepRAGPending: false,
                deepRAGResponse: {
                  content: data.response,
                  metadata: {
                    searchResults: data.searchResults,
                    thoughts: data.thoughts,
                    sources: data.searchResults?.sources || []
                  }
                }
              }
            : msg
        ));
      }
    } catch (error) {
      console.error('Deep RAG error:', error);
      setChatHistory(prev => prev.map(msg => 
        msg.messageId === fastMessageId 
          ? { ...msg, deepRAGPending: false }
          : msg
      ));
    }
  }, [selectedBucketId, temperature]);

  // Effect to handle auto deep RAG when new fast messages are added
  useEffect(() => {
    if (ragMode === 'dual' && autoDeepRAG && selectedBucketId && chatHistory.length >= 2) {
      const lastMessage = chatHistory[chatHistory.length - 1];
      const secondLastMessage = chatHistory[chatHistory.length - 2];
      
      // If the last message is a fast RAG response and the second last is a user message
      if (lastMessage?.ragType === 'fast' && 
          secondLastMessage?.role === 'user' && 
          !lastMessage.deepRAGPending && 
          !lastMessage.deepRAGResponse &&
          lastMessage.messageId) {
        triggerDeepRAGAnalysis(secondLastMessage.content, lastMessage.messageId);
      }
    }
  }, [chatHistory, ragMode, autoDeepRAG, selectedBucketId, triggerDeepRAGAnalysis]);

  // Handle Deep RAG assistant message (for manual deep RAG requests)
  const handleDeepAssistantMessage = useCallback(async (content: string, metadata?: any) => {
    setChatHistory(prev => [...prev, {
      role: 'assistant',
      content,
      metadata,
      ragType: 'deep',
      timestamp: Date.now()
    }]);
    
    // Save to IndexedDB
    await addMessage({
      role: 'assistant',
      content,
      timestamp: new Date().toISOString()
    });
  }, [addMessage]);

  // Manual Deep RAG trigger
  const manualTriggerDeepRAG = useCallback(async (originalQuery: string, messageId: string) => {
    if (!selectedBucketId) return;
    await triggerDeepRAGAnalysis(originalQuery, messageId);
  }, [triggerDeepRAGAnalysis, selectedBucketId]);

  const handleBucketSelect = useCallback((bucketId: string | null) => {
    setSelectedBucketId(bucketId);
  }, []);

  const clearChat = useCallback(() => {
    setChatHistory([]);
    setConversationStarted(false);
  }, []);

  // New session handler
  const handleNewSession = async () => {
    clearChat();
    await createSession();
  };
  
  // Scroll to bottom when chat updates
  useEffect(() => {
    if (chatMessageStreamEnd.current) {
      chatMessageStreamEnd.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory]);

  const handleCitationClick = useCallback((citation: any) => {
    console.log('Citation clicked:', citation);
  }, []);

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
                    <span className="bg-gradient-to-r from-blue-100 to-purple-100 p-1 rounded mr-2">
                      <SearchIcon size={18} className="text-blue-600" />
                    </span>
                    DualRAG
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span><Info size={16} className="ml-2 text-gray-400 cursor-help" /></span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="w-64 text-sm">DualRAG combines fast Azure responses with deep Ground-X insights for comprehensive document intelligence.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Badge variant="outline" className="ml-3 text-xs font-normal bg-gradient-to-r from-blue-50 to-purple-50 border-blue-300">
                      Hybrid AI
                    </Badge>
                  </h1>
                </div>
                <div className="flex items-center space-x-3">
                  {/* RAG Mode Selector */}
                  <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                    <Button
                      variant={ragMode === 'fast' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setRAGMode('fast')}
                      className="text-xs"
                    >
                      <SearchIcon size={14} className="mr-1" />
                      Fast
                    </Button>
                    <Button
                      variant={ragMode === 'dual' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setRAGMode('dual')}
                      className="text-xs"
                    >
                      <ArrowRight size={14} className="mr-1" />
                      Dual
                    </Button>
                    <Button
                      variant={ragMode === 'deep' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setRAGMode('deep')}
                      className="text-xs"
                    >
                      <Brain size={14} className="mr-1" />
                      Deep
                    </Button>
                  </div>

                  <RAGControl
                    key={activeOrganization?.id || 'default'}
                    enabled={true}
                    selectedBucketId={selectedBucketId}
                    onToggle={() => {}}
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
              
              {/* RAG Configuration Panel */}
              {!conversationStarted && (
                <motion.div
                  className="mb-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Settings size={20} className="text-blue-600" />
                        <span>Dual RAG Configuration</span>
                      </CardTitle>
                      <CardDescription>
                        Configure how Fast and Deep RAG systems work together
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Fast RAG Info */}
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center space-x-2 mb-2">
                            <SearchIcon size={16} className="text-blue-600" />
                            <span className="font-medium text-blue-900">Fast RAG</span>
                          </div>
                          <p className="text-sm text-blue-700">
                            Azure-powered rapid responses with real-time streaming
                          </p>
                        </div>

                        {/* Deep RAG Info */}
                        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-center space-x-2 mb-2">
                            <Brain size={16} className="text-purple-600" />
                            <span className="font-medium text-purple-900">Deep RAG</span>
                          </div>
                          <p className="text-sm text-purple-700">
                            Ground-X advanced analysis with detailed insights
                          </p>
                        </div>

                        {/* Dual Mode Info */}
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-gray-300">
                          <div className="flex items-center space-x-2 mb-2">
                            <ArrowRight size={16} className="text-gray-700" />
                            <span className="font-medium text-gray-900">Dual Mode</span>
                          </div>
                          <p className="text-sm text-gray-700">
                            Best of both: immediate + comprehensive
                          </p>
                        </div>
                      </div>

                      {/* Auto Deep RAG Setting */}
                      {ragMode === 'dual' && (
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <label className="text-sm font-medium text-gray-900">
                              Auto Deep Analysis
                            </label>
                            <p className="text-xs text-gray-600">
                              Automatically run deep analysis after fast responses
                            </p>
                          </div>
                          <Switch
                            checked={autoDeepRAG}
                            onCheckedChange={setAutoDeepRAG}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
              
              <div className="shadow-sm overflow-hidden">
                <div className="p-6">
                  {/* Introduction */}
                  <AnimatePresence>
                    {!conversationStarted && (
                      <motion.div
                        className="mb-8 text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                      >
                        <h2 className="text-2xl font-bold text-gray-900 mb-3">
                          Intelligent Document Analysis Platform
                        </h2>
                        <p className="text-gray-600 max-w-3xl mx-auto">
                          Experience the power of dual RAG systems: get immediate insights from Azure's fast processing, 
                          then dive deeper with Ground-X's advanced analysis for comprehensive understanding.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Chat history container */}
                  <div className={`mb-6 ${conversationStarted ? '' : 'border-t border-gray-200 pt-6'}`}>
                    <AnimatePresence>
                      {chatHistory.map((message, index) => (
                        <motion.div
                          key={`${index}-${message.timestamp}`}
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
                            <div className="max-w-[92%] space-y-4">
                              {/* Fast RAG Response */}
                              {(message.ragType === 'fast' || !message.ragType) && (
                                <div className="relative">
                                  {/* Fast RAG Badge */}
                                  <div className="flex items-center space-x-2 mb-2">
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                                      <SearchIcon size={12} className="mr-1" />
                                      Fast Response
                                    </Badge>
                                    {ragMode === 'dual' && selectedBucketId && (
                                      <div className="flex items-center space-x-1">
                                        {message.deepRAGPending ? (
                                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                                            <Loader2 size={12} className="mr-1 animate-spin" />
                                            Deep Analysis Running...
                                          </Badge>
                                        ) : message.deepRAGResponse ? (
                                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                                            <Check size={12} className="mr-1" />
                                            Deep Analysis Complete
                                          </Badge>
                                        ) : !autoDeepRAG && message.messageId ? (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              const userMessage = chatHistory[index - 1];
                                              if (userMessage && userMessage.role === 'user' && message.messageId) {
                                                manualTriggerDeepRAG(userMessage.content, message.messageId);
                                              }
                                            }}
                                            className="h-6 text-xs"
                                          >
                                            <Brain size={12} className="mr-1" />
                                            Deep Analysis
                                          </Button>
                                        ) : null}
                                      </div>
                                    )}
                                  </div>
                                  
                                  <FastRAG 
                                    answer={{
                                      content: message.content,
                                      metadata: message.metadata,
                                      raw: message.raw,
                                      isStreaming: message.metadata?.isStreaming,
                                      supportingContent: message.metadata?.supportingContent,
                                      thoughtProcess: message.metadata?.thoughtProcess
                                    }}
                                    theme="light"
                                    onCitationClicked={handleCitationClick}
                                  />
                                </div>
                              )}
                              {/* Deep RAG Response */}
                              {message.ragType === 'deep' && (
                                <div className="mt-4">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300">
                                      <Brain size={12} className="mr-1" />
                                      Deep Analysis
                                    </Badge>
                                  </div>
                                  
                                  <DeepRAG 
                                    answer={{
                                      content: message.content,
                                      metadata: message.metadata,
                                      searchResults: message.metadata?.searchResults,
                                      sources: message.metadata?.sources || []
                                    }}
                                    theme="light"
                                  />
                                </div>
                              )}

                              {/* Embedded Deep RAG Response */}
                              {message.deepRAGResponse && (
                                <div className="mt-4 border-l-4 border-purple-300 pl-4 bg-purple-50 rounded-r-lg">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-300">
                                      <Brain size={12} className="mr-1" />
                                      Deep Analysis Results
                                    </Badge>
                                  </div>
                                  
                                  <DeepRAG 
                                    answer={{
                                      content: message.deepRAGResponse.content,
                                      searchResults: message.deepRAGResponse.metadata?.searchResults,
                                      sources: message.deepRAGResponse.metadata?.sources || []
                                    }}
                                    theme="light"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <div ref={chatMessageStreamEnd} />
                  </div>

                  {/* Chat input */}
                  <div className={`${conversationStarted ? '' : 'border-t border-gray-200 pt-6'}`}>
                    {ragMode === 'deep' ? (
                      <ImprovedChat
                        ref={deepRAGChatRef}
                        onUserMessage={handleUserMessage}
                        onAssistantMessage={handleDeepAssistantMessage}
                        onConversationStart={() => setConversationStarted(true)}
                        onStreamingChange={setIsStreaming}
                        temperature={temperature}
                        streamResponses={false}
                        isRAGEnabled={true}
                        selectedBucketId={selectedBucketId}
                        useRAG={true}
                      />
                    ) : (
                      <ImprovedChat
                        ref={chatRef}
                        onUserMessage={handleUserMessage}
                        onAssistantMessage={handleFastAssistantMessage}
                        onConversationStart={() => setConversationStarted(true)}
                        onStreamingChange={setIsStreaming}
                        temperature={temperature}
                        streamResponses={streamEnabled}
                        isRAGEnabled={true}
                        selectedBucketId={null}
                      />
                    )}
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
                  DualRAG Intelligent Document Platform
                </div>
                <div className="flex space-x-4">
                  <span className="flex items-center">
                    <SearchIcon size={12} className="mr-1" />
                    Azure Fast RAG
                  </span>
                  <span className="flex items-center">
                    <Brain size={12} className="mr-1" />
                    Ground-X Deep RAG
                  </span>
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