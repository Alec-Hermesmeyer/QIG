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
  rawResponse?: any;
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
interface SettingsSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSettings?: Partial<SettingsState>;
  onSettingsChange?: (settings: Partial<SettingsState>) => void;
}

function SettingsSidebar({
  open,
  onOpenChange,
  initialSettings = {},
  onSettingsChange
}: SettingsSidebarProps) {
  // Default settings
  const defaultSettings: SettingsState = {
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
    suggestFollowUp: true,
    retrievalMode: 'hybrid'
  };

  // Initialize settings with defaults and any provided initial settings
  const [settings, setSettings] = useState<SettingsState>({
    ...defaultSettings,
    ...initialSettings
  });

  // Update settings when initialSettings prop changes
  useEffect(() => {
    if (initialSettings && Object.keys(initialSettings).length > 0) {
      setSettings(prev => ({
        ...prev,
        ...initialSettings
      }));
    }
  }, [initialSettings]);

  // Handler for input changes
  const handleInputChange = (field: keyof SettingsState, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Apply settings and close sidebar
  const handleApplySettings = () => {
    if (onSettingsChange) {
      onSettingsChange(settings);
    }
    onOpenChange(false);
  };

  // Reset to initial settings
  const handleCancel = () => {
    setSettings({
      ...defaultSettings,
      ...initialSettings
    });
    onOpenChange(false);
  };

  // (Rest of settings sidebar component omitted for brevity)
  return null;
}

export default function Page() {
  const { user, signOut, organization, profile, isQIGOrganization, organizationLogo } = useAuth();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRAGEnabled, setIsRAGEnabled] = useState(false);
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [useStorageFallback, setUseStorageFallback] = useState(false);
  const [imgError, setImgError] = useState(false);


  // Load settings from localStorage on init with safety checks
  const loadSavedSettings = (): Partial<SettingsState> => {
    if (typeof window === 'undefined') return {};

    try {
      const savedSettings = localStorage.getItem('contract-analysis-settings');
      if (!savedSettings) return {};
      return JSON.parse(savedSettings);
    } catch (e) {
      console.error('Failed to load settings from localStorage:', e);
      return {};
    }
  };

  // Settings state with safe initialization
  const [settings, setSettings] = useState<SettingsState>(() => {
    // Default settings
    const defaultSettings = {
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
      retrievalMode: 'hybrid'
    };

    try {
      // Try to load saved settings
      if (typeof window !== 'undefined') {
        const savedSettings = loadSavedSettings();
        return { ...defaultSettings, ...savedSettings };
      }
    } catch (error) {
      console.error("Error initializing settings:", error);
    }
    
    return defaultSettings;
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

  // Check browser storage compatibility
  useEffect(() => {
    const checkStorageCompat = () => {
      try {
        const isStorageAvailable = contextManager.isStorageAvailable();
        setUseStorageFallback(!isStorageAvailable);
        
        // Initialize UI with existing context if available
        const context = contextManager.getCurrentContext();
        if (context.length > 0) {
          const formattedMessages = context.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
          }));
          
          setChatHistory(formattedMessages);
          setConversationStarted(formattedMessages.length > 0);
        }
      } catch (error) {
        console.error("Error checking storage compatibility:", error);
        setUseStorageFallback(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Delay storage check to ensure browser is ready
    const timeoutId = setTimeout(checkStorageCompat, 100);
    return () => clearTimeout(timeoutId);
  }, []);

  // Load saved RAG state when component mounts
  useEffect(() => {
    try {
      const loadRagSettings = () => {
        if (typeof window !== 'undefined') {
          const savedRAGEnabled = localStorage.getItem('rag_enabled');
          const savedBucketId = localStorage.getItem('rag_selected_bucket');

          if (savedRAGEnabled === 'true') {
            setIsRAGEnabled(true);
          }

          if (savedBucketId) {
            setSelectedBucketId(savedBucketId);
          }
        }
      };
      
      // Delay loading to ensure browser is ready
      const timeoutId = setTimeout(loadRagSettings, 200);
      return () => clearTimeout(timeoutId);
    } catch (error) {
      console.error("Error loading RAG settings:", error);
    }
  }, []);

  // Safe save settings to localStorage with error handling
  useEffect(() => {
    const saveSettings = () => {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('contract-analysis-settings', JSON.stringify(settings));
        } catch (error) {
          console.error("Error saving settings:", error);
        }
      }
    };
    
    // Delay saving to ensure browser is ready
    const timeoutId = setTimeout(saveSettings, 300);
    return () => clearTimeout(timeoutId);
  }, [settings]);

  // Safe save RAG state with error handling
  useEffect(() => {
    const saveRagSettings = () => {
      if (typeof window !== 'undefined') {
        try {
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
        } catch (error) {
          console.error("Error saving RAG settings:", error);
        }
      }
    };
    
    // Delay saving to ensure browser is ready
    const timeoutId = setTimeout(saveRagSettings, 300);
    return () => clearTimeout(timeoutId);
  }, [isRAGEnabled, selectedBucketId]);

  // Scroll to latest message
  useEffect(() => {
    if (chatMessageStreamEnd.current) {
      try {
        chatMessageStreamEnd.current.scrollIntoView({ behavior: "smooth" });
      } catch (error) {
        console.error("Error scrolling to latest message:", error);
        // Fallback for Safari
        if (chatMessageStreamEnd.current) {
          chatMessageStreamEnd.current.scrollIntoView();
        }
      }
    }
  }, [chatHistory, isStreaming]);

  // Effect to update chat configuration when chat reference is available
  useEffect(() => {
    if (chatRef.current) {
      try {
        // Update the chat configuration
        chatRef.current.updateConfig?.(chatConfig);
      } catch (error) {
        console.error("Error updating chat config:", error);
      }
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
      if (answerMatch && answerMatch[1] && answerMatch[1].trim()) {
        return answerMatch[1].trim();
      }
      
      // If that doesn't work, try to strip the "Response" section
      const responseMatch = content.match(/([\s\S]*?)(?:\s*Response\s*\n)/i);
      if (responseMatch && responseMatch[1] && responseMatch[1].trim()) {
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
    try {
      contextManager.clearContext();
    } catch (error) {
      console.error("Error clearing context:", error);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
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
    try {
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
    } catch (error) {
      console.error("Error handling user message:", error);
    }
  };

  // Handle assistant message
  const handleAssistantMessage = (content: string, metadata?: any) => {
    try {
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
    } catch (error) {
      console.error("Error handling assistant message:", error);
    }
  };

  // Handle contract analysis completion
  const handleAnalysisComplete = (analysisText: string, risks: Risk[], mitigationPoints: string[], contractText: string) => {
    try {
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
    } catch (error) {
      console.error("Error handling analysis completion:", error);
    }
  };

  // Get conversation context for RAG
  const getConversationContext = () => {
    try {
      return contextManager.getFormattedContextForRAG();
    } catch (error) {
      console.error("Error getting conversation context:", error);
      return [];
    }
  };

  // Show loading indicator while checking storage compatibility
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  // Get organization-specific background color
  const getHeaderBgColor = () => {
    if (!organization) return "bg-red-500"; // Default fallback
    return organization.theme_color || "bg-red-500"; // Use the stored theme color with fallback
  };

  return (
    <ProtectedRoute>
      <RAGProvider>
        <div className="min-h-screen flex flex-col">
          {/* Top Navigation */}
          <motion.header
            className={getHeaderBgColor() + " text-white"}
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <nav className="h-14 px-4 flex items-center justify-between max-w-7xl mx-auto">
            <Link href="/" className="text-lg font-medium cursor-pointer">
  <div className="relative h-[50px] w-[200px]">
    <img
      src={imgError ? '/defaultLogo.png' : organizationLogo}
      alt={organization?.name ? `${organization.name} Logo` : 'Organization Logo'}
      fill
      style={{ objectFit: 'contain' }}
      onError={() => setImgError(true)}
      priority
    />
  </div>
</Link>
              <motion.div
                className="flex items-center gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                {/* Organization name display */}
                {organization && (
                  <motion.div
                    className="hidden md:block"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    <span className="text-sm font-medium">
                      {organization.name}
                    </span>
                  </motion.div>
                )}
                
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
                {/* Organization Settings Button - Only show for admins or QIG */}
                {isQIGOrganization && (
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => router.push('/settings')}
                    >
                      <Settings className="h-4 w-4" />
                      Organization Settings
                    </Button>
                  </motion.div>
                )}

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
              </div>
            </div>
          </motion.div>

          {/* QIG Organization Admin Notice - Only shown for QIG members */}
          {/* {isQIGOrganization && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-2 mx-auto max-w-7xl mt-2">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Info className="h-5 w-5 text-blue-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    QIG Admin View: You have access to all organization data
                  </p>
                </div>
              </div>
            </div>
          )} */}

          {/* Storage fallback warning for Safari in private mode */}
          {useStorageFallback && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mx-auto max-w-4xl mt-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Browser storage is limited. Chat context will be maintained for this session only.
                  </p>
                </div>
              </div>
            </div>
          )}

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
                      className={`absolute -top-36 right-[calc(50%-30px)] ${organization?.name === 'QIG' ? 'text-blue-500' : 'text-red-500'}`}
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

                {/* Example Questions - Customize based on organization */}
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl mb-8"
                  variants={staggerChildren}
                  initial="hidden"
                  animate="visible"
                >
                  {[
                    "What contracts are available for review?",
                    `How do our standard Spinakr service agreements compare to industry standards for liability clauses?`,
                    "What key provisions should we include in Spinakr's SaaS agreements to protect our intellectual property?",
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
        </div>
      </RAGProvider>
    </ProtectedRoute>
  );
}