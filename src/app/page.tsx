"use client";

import { useEffect, useState, useRef } from "react";
import { History, Trash2, Settings, File, Info, Database } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { ImprovedChatHandle, ImprovedChat } from "@/components/chat";
import Answer from "@/components/Answer";
import { ContractAnalyzerPanel } from "@/components/ContractAnalyzerPanel";
import { Risk } from "@/lib/useContractAnalyst";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { AnalysisPanelTabs } from "@/components/AnalysisPanelTabs";
import { FileCabinetPanel } from "@/components/FileCabinetPanel";
import { useAuth } from "@/lib/auth/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import ContractRiskAnalysisModal from "@/components/EnhancedRiskAnalysisModal";
import { RAGProvider } from '@/components/RagProvider';
import { RAGControl } from '@/components/RagControl';
import { contextManager, ContextMessage } from '@/services/contextManager'; // Import our new context manager

// Define interface for chat message
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  // GroundX specific fields
  searchResults?: any;
  thoughts?: any;
  supportingContent?: any;
  enhancedResults?: any;
  documentExcerpts?: any[];
  result?: any;
  rawResponse?: any; // The complete raw response
}

// Define interface for settings state
interface SettingsState {
  promptTemplate: string;
  temperature: number;
  seed: string;
  minSearchScore: number;
  minRerankerScore: number;
  includeCategory: string;
  excludeCategory: string | null;
  useSemanticRanker: boolean;
  useSemanticCaptions: boolean;
  streamResponse: boolean;
  suggestFollowUp: boolean;
  retrievalMode: string;
}

// Define interface for chat configuration
interface ChatConfig {
  promptTemplate?: string;
  temperature: number;
  seed?: string;
  streamResponse: boolean;
  suggestFollowUp: boolean;
  searchConfig?: {
    minSearchScore: number;
    minRerankerScore: number;
    includeCategory: string;
    excludeCategory: string | null;
    useSemanticRanker: boolean;
    useSemanticCaptions: boolean;
    retrievalMode: string;
  };
}

// Animation variants
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } }
};

const slideUp = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4 } }
};

const staggerChildren = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

// Settings Sidebar Component
// (Settings sidebar component code unchanged - omitted for brevity)

// StyledFallbackAnalysis Component
// (StyledFallbackAnalysis component code unchanged - omitted for brevity)

export default function Page() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRAGEnabled, setIsRAGEnabled] = useState(false);
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);

  // Load settings from localStorage on init
  const loadSavedSettings = (): Partial<SettingsState> => {
    if (typeof window === 'undefined') return {};

    try {
      const savedSettings = localStorage.getItem('contract-analysis-settings');
      return savedSettings ? JSON.parse(savedSettings) : {};
    } catch (e) {
      console.error('Failed to load settings from localStorage:', e);
      return {};
    }
  };

  // Settings state
  const [settings, setSettings] = useState<SettingsState>(() => {
    // Load any saved settings from localStorage
    const savedSettings = loadSavedSettings();

    return {
      promptTemplate: '',
      temperature: 0.3,
      seed: '',
      minSearchScore: 0,
      minRerankerScore: 0,
      includeCategory: 'all',
      excludeCategory: null,
      useSemanticRanker: true,
      useSemanticCaptions: false,
      streamResponse: true,
      suggestFollowUp: false,
      retrievalMode: 'hybrid',
      ...savedSettings // Override defaults with any saved settings
    };
  });

  // Current chat config derived from settings
  const [chatConfig, setChatConfig] = useState<ChatConfig>({
    temperature: settings.temperature,
    seed: settings.seed || undefined,
    streamResponse: settings.streamResponse,
    suggestFollowUp: settings.suggestFollowUp,
    promptTemplate: settings.promptTemplate || undefined,
    searchConfig: {
      minSearchScore: settings.minSearchScore,
      minRerankerScore: settings.minRerankerScore,
      includeCategory: settings.includeCategory,
      excludeCategory: settings.excludeCategory,
      useSemanticRanker: settings.useSemanticRanker,
      useSemanticCaptions: settings.useSemanticCaptions,
      retrievalMode: settings.retrievalMode
    }
  });

  // Contract Analyzer state
  const [showContractAnalyzer, setShowContractAnalyzer] = useState(false);
  const [contractAnalysisResults, setContractAnalysisResults] = useState<{
    analysisText: string;
    risks: Risk[];
    mitigationPoints: string[];
    contractText: string;
  } | null>(null);
  const [showAnalysisPanel, setShowAnalysisPanel] = useState(false);
  const [showContractPanel, setShowContractPanel] = useState(false);

  // Analysis panel state
  const [analysisTabKey, setAnalysisTabKey] = useState(AnalysisPanelTabs.ThoughtProcessTab);
  const [activeCitation, setActiveCitation] = useState("");
  const [currentMessageForAnalysis, setCurrentMessageForAnalysis] = useState<any>(null);
  const [mostRecentUserMessage, setMostRecentUserMessage] = useState("");

  const chatMessageStreamEnd = useRef<HTMLDivElement | null>(null);
  const chatRef = useRef<ImprovedChatHandle>(null);
  const [showFileCabinetPanel, setShowFileCabinetPanel] = useState(false);

  // Load saved RAG state when component mounts
  useEffect(() => {
    const savedRAGEnabled = localStorage.getItem('rag_enabled');
    const savedBucketId = localStorage.getItem('rag_selected_bucket');

    if (savedRAGEnabled === 'true') {
      setIsRAGEnabled(true);
    }

    if (savedBucketId) {
      setSelectedBucketId(savedBucketId);
    }
    
    // Load conversation context from sessionStorage
    const context = contextManager.getCurrentContext();
    if (context.length > 0) {
      // Convert context messages to chat messages
      const formattedMessages = context.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      }));
      
      setChatHistory(formattedMessages);
      setConversationStarted(true);
    }
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('contract-analysis-settings', JSON.stringify(settings));
    }
  }, [settings]);

  // Save RAG state when it changes
  useEffect(() => {
    if (isRAGEnabled) {
      localStorage.setItem('rag_enabled', 'true');
    } else {
      localStorage.setItem('rag_enabled', 'false');
    }

    if (selectedBucketId) {
      localStorage.setItem('rag_selected_bucket', selectedBucketId);
    } else {
      localStorage.removeItem('rag_selected_bucket');
    }
  }, [isRAGEnabled, selectedBucketId]);

  // Scroll to latest message
  useEffect(() => {
    chatMessageStreamEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isStreaming]);

  // Effect to update chat configuration when chat reference is available
  useEffect(() => {
    if (chatRef.current) {
      // Update the chat configuration
      chatRef.current.updateConfig?.(chatConfig);
    }
  }, [chatConfig, chatRef.current]);

  // Settings change handler
  const handleSettingsChange = (updatedSettings: Partial<SettingsState>) => {
    setSettings(prev => {
      const newSettings = {
        ...prev,
        ...updatedSettings
      };

      setChatConfig({
        temperature: newSettings.temperature,
        seed: newSettings.seed || undefined,
        streamResponse: newSettings.streamResponse,
        suggestFollowUp: newSettings.suggestFollowUp,
        promptTemplate: newSettings.promptTemplate || undefined,
        searchConfig: {
          minSearchScore: newSettings.minSearchScore,
          minRerankerScore: newSettings.minRerankerScore,
          includeCategory: newSettings.includeCategory,
          excludeCategory: newSettings.excludeCategory,
          useSemanticRanker: newSettings.useSemanticRanker,
          useSemanticCaptions: newSettings.useSemanticCaptions,
          retrievalMode: newSettings.retrievalMode
        }
      });

      return newSettings;
    });
  };

  // Helper function to clean message content
  const cleanMessageContent = (content: string | undefined): string => {
    if (!content) return '';
    
    // Check if the content has the specific pattern with "Response" and "Answer"
    if (content.includes("Response") && content.includes("Answer")) {
      // Extract just the answer portion
      const answerMatch = content.match(/Answer\s*\n([\s\S]*?)(?:\n\s*Response\s*\n|\s*$)/i);
      if (answerMatch && answerMatch[1].trim()) {
        return answerMatch[1].trim();
      }
      
      // If that doesn't work, try to strip the "Response" section
      const responseMatch = content.match(/([\s\S]*?)(?:\s*Response\s*\n)/i);
      if (responseMatch && responseMatch[1].trim()) {
        return responseMatch[1].trim().replace(/^Answer\s*\n/i, '');
      }
    }
    
    // If content starts with "AnswerSources" or similar format,
    // clean it up to just get the main content
    if (content.startsWith("AnswerSources")) {
      const cleanedContent = content.replace(/^AnswerSources.*?\n/i, '');
      return cleanedContent;
    }
    
    // Default case: return the original content
    return content;
  };

  // RAG handler functions
  const handleRAGToggle = (enabled: boolean) => {
    setIsRAGEnabled(enabled);
  };

  const handleBucketSelect = (bucketId: string | null) => {
    setSelectedBucketId(bucketId);
  };

  // Clear chat functionality
  const clearChat = () => {
    setChatHistory([]);
    setConversationStarted(false);
    setIsStreaming(false);
    setContractAnalysisResults(null);
    setShowAnalysisPanel(false);
    setShowContractPanel(false);
    setCurrentMessageForAnalysis(null);
    
    // Clear conversation context
    contextManager.clearContext();
  };

  // Handle logout
  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  // Simple handlers for Answer component
  const handleCitationClicked = (filePath: string) => {
    setActiveCitation(filePath);
    setAnalysisTabKey(AnalysisPanelTabs.CitationTab);
    setShowAnalysisPanel(true);
  };

  const handleThoughtProcessClicked = () => {
    setAnalysisTabKey(AnalysisPanelTabs.ThoughtProcessTab);
    setShowAnalysisPanel(true);
  };

  const handleSupportingContentClicked = (messageIndex?: number) => {
    // Check if this is a contract analysis message
    const isContractAnalysis = contractAnalysisResults !== null &&
      (typeof messageIndex === 'undefined' ||
        (messageIndex >= 0 && chatHistory[messageIndex]?.content?.includes('analyzed the contract')));

    if (isContractAnalysis) {
      // Show the contract analysis panel
      setShowContractPanel(true);
    } else {
      // Show the regular supporting content in the analysis panel
      setAnalysisTabKey(AnalysisPanelTabs.SupportingContentTab);
      setShowAnalysisPanel(true);
    }
  };

  const handleFollowupQuestionClicked = (question: string) => {
    if (chatRef.current) {
      chatRef.current.submitMessage(question);
    }
  };

  // Handle new message from user
  const handleUserMessage = (content: string) => {
    const newMessage: ChatMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    // Update UI state
    setChatHistory(prev => [...prev, newMessage]);
    setMostRecentUserMessage(content);
    
    // Add to conversation context
    contextManager.addMessage('user', content);

    if (!conversationStarted) {
      setConversationStarted(true);
    }
    setIsStreaming(true);
  };

  // Handle assistant message
  const handleAssistantMessage = (content: string, metadata?: any) => {
    // Clean the content before storing it
    const cleanedContent = cleanMessageContent(content);
    
    // Create a message with all available data
    const newMessage: ChatMessage = {
      role: 'assistant',
      content: cleanedContent,
      timestamp: new Date().toISOString(),
      // Extract fields from metadata
      searchResults: metadata?.searchResults || metadata?.result?.searchResults,
      thoughts: metadata?.thoughts,
      supportingContent: metadata?.supportingContent,
      enhancedResults: metadata?.enhancedResults,
      documentExcerpts: metadata?.documentExcerpts,
      result: metadata?.result,
      rawResponse: metadata
    };
  
    // Update UI state
    setChatHistory(prev => [...prev, newMessage]);
    setCurrentMessageForAnalysis(newMessage);
    
    // Add to conversation context
    contextManager.addMessage('assistant', cleanedContent);
  };

  // Handle contract analysis completion
  const handleAnalysisComplete = (analysisText: string, risks: Risk[], mitigationPoints: string[], contractText: string) => {
    console.log("Analysis complete, risks:", risks.length, "mitigation points:", mitigationPoints.length);

    // Store the full raw analysis along with structured data and contract text
    setContractAnalysisResults({
      analysisText,
      risks,
      mitigationPoints,
      contractText
    });

    // Show contract analysis panel
    setShowContractPanel(true);

    // Generate a better response message based on results
    let summaryMessage = "";

    if (risks.length > 0) {
      // Normal case with risks found
      summaryMessage = `I've analyzed the contract and found ${risks.length} potential risks. There are ${risks.filter(r => r.score.toLowerCase() === 'critical').length} critical risks, ${risks.filter(r => r.score.toLowerCase() === 'high').length} high risks, ${risks.filter(r => r.score.toLowerCase() === 'medium').length} medium risks, and ${risks.filter(r => r.score.toLowerCase() === 'low').length} low risks.

You can see the full analysis by clicking on "Show Supporting Content" or by using the panel on the right.`;
    } else if (analysisText.trim() !== '') {
      // No structured risks found, but we have analysis text
      summaryMessage = `I've analyzed the contract, but couldn't identify specific structured risks. However, I've generated an analysis that you can view by clicking "Show Supporting Content" or using the panel on the right.

If you'd like a more detailed analysis or have specific questions about the contract, please let me know.`;
    } else {
      // No analysis at all - likely an error occurred
      summaryMessage = `I attempted to analyze the contract, but couldn't generate a proper analysis. This might be due to the format of the document or technical limitations.

Please try uploading the contract again or provide a different format (PDF, DOCX, or TXT).`;
    }

    handleAssistantMessage(summaryMessage);
  };

  // Modify the ImprovedChat component to accept the conversation context
  const getConversationContext = () => {
    return contextManager.getFormattedContextForRAG();
  };

  return (
    <ProtectedRoute>
      <RAGProvider>
        <div className="min-h-screen flex flex-col">
          {/* Top Navigation */}
          <motion.header
            className="bg-red-500 text-white"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <nav className="h-14 px-4 flex items-center justify-between max-w-7xl mx-auto">
              <Link href="/" className="text-lg font-medium cursor-pointer">
                <Image
                  src='/austinIndustries.png'
                  alt='Spinakr Logo'
                  height={200}
                  width={200} />
              </Link>
              <motion.div
                className="flex items-center gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                {/* User info and logout */}
                {user && (
                  <motion.div
                    className="flex items-center gap-3 ml-6"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                  >
                    <span className="text-sm text-gray-300">
                      {user.email}
                    </span>
                    <motion.button
                      onClick={handleLogout}
                      className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-white"
                      whileHover={{ backgroundColor: "#4B5563" }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Logout
                    </motion.button>
                  </motion.div>
                )}
              </motion.div>
            </nav>
          </motion.header>

          {/* Secondary Toolbar */}
          <motion.div
            className="bg-[#F5F5F5]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <div className="h-12 px-4 flex items-center justify-between max-w-7xl mx-auto">
              <div className="flex items-center gap-2">
                {/* RAG Control Button */}
                <RAGControl
                  enabled={isRAGEnabled}
                  selectedBucketId={selectedBucketId}
                  onToggle={handleRAGToggle}
                  onBucketSelect={handleBucketSelect}
                />
              </div>

              <div className="flex items-center gap-2 cursor-pointer">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => setShowFileCabinetPanel(true)} >
                    <File className="h-4 w-4" />
                    File Cabinet
                  </Button>
                </motion.div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2 cursor-pointer" onClick={clearChat}>
                    <Trash2 className="h-4 w-4" />
                    Clear chat
                  </Button>
                </motion.div>

                {/* Developer settings button removed for simplicity */}
              </div>
            </div>
          </motion.div>

          {/* Main Content */}
          <main className="flex-1 flex flex-col items-center px-4 py-16 bg-[#F5F5F5]">
            {!conversationStarted && (
              <>
                <motion.div
                  className="text-center mb-16"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                  <div className="relative mb-4">
                    <motion.h1
                      className="text-4xl font-bold mb-2 mt-40"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.6, duration: 0.5, type: "spring" }}
                    >
                      Chat with your Contracts
                    </motion.h1>
                    {/* Decorative Stars */}
                    <motion.div
                      className="absolute -top-36 right-[calc(50%-30px)] text-red-500"
                      initial={{ rotate: -10, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      transition={{ delay: 0.8, duration: 0.5 }}
                    >
                      <motion.svg
                        animate={{ rotate: 360 }}
                        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                        width="100"
                        height="100"
                        viewBox="0 0 40 40"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M20 0L25 15L40 20L25 25L20 40L15 25L0 20L15 15L20 0Z" fill="currentColor" />
                      </motion.svg>
                      <motion.svg
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className="ml-4"
                      >
                        <path d="M12 0L15 9L24 12L15 15L12 24L9 15L0 12L9 9L12 0Z" fill="currentColor" />
                      </motion.svg>
                    </motion.div>
                  </div>
                  <motion.p
                    className="text-gray-600 font-bold"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.9, duration: 0.5 }}
                  >
                    Ask anything or try an example
                  </motion.p>
                </motion.div>

                {/* Example Questions */}
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl mb-8"
                  variants={staggerChildren}
                  initial="hidden"
                  animate="visible"
                >
                  {[
                    "What contracts are available for review?",
                    "What does a Construction manager at Risk do?",
                    "What are preconstruction services?",
                  ].map((question, index) => (
                    <motion.button
                      key={question}
                      className="px-4 py-12 bg-gray-200 rounded-lg text-left hover:bg-gray-300 transition-colors"
                      onClick={() => chatRef.current?.submitMessage(question)}
                      variants={slideUp}
                      whileHover={{
                        scale: 1.03,
                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                        backgroundColor: "#E5E7EB"
                      }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ delay: 0.1 * index }}
                    >
                      {question}
                    </motion.button>
                  ))}
                </motion.div>
              </>
            )}

            {/* Main Content Layout with Split View */}
            <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-6">
              {/* Chat Column */}
              <div className={`w-full ${showContractPanel ? 'lg:w-1/2' : 'lg:w-full'} flex flex-col`}>
                {/* Chat History Display */}
                <div className="w-full mb-4">
                  <AnimatePresence initial={false}>
                    {chatHistory.map((message, index) => (
                      <motion.div
                        key={index}
                        className="mb-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        {/* User Message */}
                        {message.role === 'user' && (
                          <div className="w-full flex justify-end">
                            <motion.div
                              className="bg-blue-100 text-right p-4 rounded-lg max-w-lg"
                              initial={{ x: 50, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ duration: 0.3 }}
                            >
                              <p className="text-right">{message.content}</p>
                            </motion.div>
                          </div>
                        )}

                        {/* Assistant Message */}
                        {message.role === 'assistant' && (
                          <motion.div
                            initial={{ x: -50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ duration: 0.3 }}
                          >
                            <Answer
                              answer={message.content}
                              index={index}
                              isSelected={false}
                              isStreaming={isStreaming && index === chatHistory.length - 1}
                              searchResults={message.searchResults}
                              onCitationClicked={handleCitationClicked}
                              onThoughtProcessClicked={() => {
                                setCurrentMessageForAnalysis(message);
                                handleThoughtProcessClicked();
                              }}
                              onSupportingContentClicked={() => {
                                setCurrentMessageForAnalysis(message);
                                handleSupportingContentClicked(index);
                              }}
                              onFollowupQuestionClicked={handleFollowupQuestionClicked}
                              showFollowupQuestions={true}
                            />
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={chatMessageStreamEnd} />
                </div>

                {/* Chat Input */}
                <motion.div
                  className="w-full max-w-7xl flex justify-center mb-4"
                  initial={conversationStarted ? { opacity: 1 } : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <ImprovedChat
                    ref={chatRef}
                    onUserMessage={handleUserMessage}
                    onAssistantMessage={handleAssistantMessage}
                    onConversationStart={() => setConversationStarted(true)}
                    onStreamingChange={setIsStreaming}
                    // Pass chat configuration
                    temperature={chatConfig.temperature}
                    seed={chatConfig.seed}
                    streamResponses={chatConfig.streamResponse}
                    suggestFollowUpQuestions={chatConfig.suggestFollowUp}
                    promptTemplate={chatConfig.promptTemplate}
                    searchConfig={chatConfig.searchConfig}
                    // Add RAG configuration
                    isRAGEnabled={isRAGEnabled}
                    selectedBucketId={selectedBucketId}
                    // Add conversation context
                    conversationContext={getConversationContext()}
                  />
                </motion.div>
              </div>

              {/* Contract Risk Analysis Modal */}
              <ContractRiskAnalysisModal
                isOpen={showContractPanel}
                onClose={() => setShowContractPanel(false)}
                analysisData={contractAnalysisResults ? {
                  analysisText: contractAnalysisResults.analysisText,
                  risks: contractAnalysisResults.risks.map(risk => ({
                    ...risk,
                    id: risk.id || `risk-${Math.random().toString(36).substr(2, 9)}`,
                    reason: risk.reason || "",
                    location: risk.location || ""
                  })),
                  mitigationPoints: contractAnalysisResults.mitigationPoints,
                  contractText: contractAnalysisResults.contractText
                } : null}
              />
            </div>
          </main>

          {/* Contract Analyzer Panel */}
          <ContractAnalyzerPanel
            isOpen={showContractAnalyzer}
            onDismiss={() => setShowContractAnalyzer(false)}
            onAnalysisComplete={handleAnalysisComplete}
          />

          {/* Standard Analysis Panel */}
          <AnalysisPanel
            isOpen={showAnalysisPanel}
            onDismiss={() => setShowAnalysisPanel(false)}
            activeTab={analysisTabKey}
            onActiveTabChanged={(tab: string) => setAnalysisTabKey(tab as AnalysisPanelTabs)}
            activeCitation={activeCitation}
            response={currentMessageForAnalysis}
            mostRecentUserMessage={mostRecentUserMessage}
          />

          <FileCabinetPanel
            isOpen={showFileCabinetPanel}
            onDismiss={() => setShowFileCabinetPanel(false)}
            onRunAnalysis={(fileName, analysisResult, citationUrl) => {
              // Create a message to send to the chat
              const message = `Analyze ${fileName} for potential risks and concerns.`;

              // Use the chatRef to submit the message programmatically
              if (chatRef.current) {
                chatRef.current.submitMessage(message);
              }

              // Close the panel
              setShowFileCabinetPanel(false);
            }}
          />

          {/* Settings Sidebar */}
          {/* Settings sidebar component rendered here */}
        </div>
      </RAGProvider>
    </ProtectedRoute>
  );
}