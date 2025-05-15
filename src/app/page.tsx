"use client";

import { useEffect, useState, useRef } from "react";
import { History, Trash2, Settings, File, Info, Database, User } from "lucide-react";
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
import FastRAG from "@/components/FastRag";
import DeepRAG from "@/components/DeepRag";
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
import { supabase } from '@/lib/supabase/client'; // Import supabase client

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

// Sample Questions Component
function SampleQuestions({ chatRef }: { chatRef: React.RefObject<ImprovedChatHandle> }) {
  const { organization } = useAuth();
  const [questions, setQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);

        if (!organization?.id) {
          throw new Error('Organization ID not available');
        }

        // Fetch questions for this organization
        const { data: questionData, error: questionError } = await supabase
          .from('sample_questions')
          .select('question')
          .eq('organization_id', organization.id)
          .order('created_at', { ascending: false });

        if (questionError) throw questionError;

        if (questionData && questionData.length > 0) {
          setQuestions(questionData.map(item => item.question));
        } else {
          // Fallback to default questions if none found for this organization
          setQuestions([
            "What contracts are available for review?",
            "How do our standard Spinakr service agreements compare to industry standards for liability clauses?",
            "What key provisions should we include in Spinakr's SaaS agreements to protect our intellectual property?"
          ]);
        }
      } catch (err: any) {
        console.error('Error fetching questions:', err);
        setError(err.message);

        // Fallback to default questions if there's an error
        setQuestions([
          "What contracts are available for review?",
          "How do our standard Spinakr service agreements compare to industry standards for liability clauses?",
          "What key provisions should we include in Spinakr's SaaS agreements to protect our intellectual property?"
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [organization?.id]);

  if (loading) {
    return (
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl mb-8"
        variants={staggerChildren}
        initial="hidden"
        animate="visible"
      >
        {[1, 2, 3].map((index) => (
          <motion.div
            key={index}
            className="px-4 py-12 bg-gray-100 rounded-lg animate-pulse"
            variants={slideUp}
          />
        ))}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl mb-8"
      variants={staggerChildren}
      initial="hidden"
      animate="visible"
    >
      {questions.map((question, index) => (
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
  );
}

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
  const [useDeepRag, setUseDeepRag] = useState(false);

  // State for Swingle Collins report modals
  const [showPolicyComparisonModal, setShowPolicyComparisonModal] = useState(false);
  const [showPolicyExcelModal, setShowPolicyExcelModal] = useState(false);
  const [showSafeguardModal, setShowSafeguardModal] = useState(false);
  const [showTriaModal, setShowTriaModal] = useState(false);
  const [policyNumber, setPolicyNumber] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');

  // Sample company list for dropdowns
  const companyList = [
    "Company A",
    "Company B",
    "Company C",
    "Company D",
    "Company E"
  ];

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
          // Set conversation started only if we have actual messages
          if (formattedMessages.length > 0) {
            setConversationStarted(true);
          } else {
            setConversationStarted(false);
          }
        } else {
          // Explicitly set to false if no context
          setConversationStarted(false);
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
    // First clear all states
    setChatHistory([]);
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

    // Set conversationStarted to false AFTER clearing everything else
    // This ensures the sample questions will be displayed again
    setConversationStarted(false);

    // Force a re-render to ensure sample questions appear
    setTimeout(() => {
      console.log("Conversation started:", false);
    }, 50);
  };

  // Handle profile navigation
  const handleProfileNav = () => {
    router.push('/profile');
  };
  interface HandleValueChangeProps {
    value: string;
  }

  const handleValueChange = (value: HandleValueChangeProps["value"]) => {
    if (value === "tria") {
      // Open the PDF file in a new tab when "TRIA Report" is selected
      window.open("/August Real Estate TRIA report.pdf", "_blank");
    } else {
      // Handle other selections as needed
      console.log(`Selected: ${value}`);
      // You can add routing or other actions for other report types here
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

  // Enhanced citation click handler that detects various citation formats
  const handleCitationClicked = (filePath: string, pageNumber?: number | string) => {
    console.log(`Citation clicked: ${filePath}, page: ${pageNumber || 'N/A'}`);

    // Handle various citation formats
    let normalizedPath = filePath;

    // Extract filename from citation format with brackets [filename.pdf]
    if (filePath.startsWith('[') && filePath.endsWith(']')) {
      normalizedPath = filePath.substring(1, filePath.length - 1);
    }

    // If there's a "#page=" in the path, extract the page number
    if (!pageNumber && normalizedPath.includes('#page=')) {
      const parts = normalizedPath.split('#page=');
      normalizedPath = parts[0];
      pageNumber = parseInt(parts[1]);
    }

    // Clean up file extensions if they're repeated
    if (normalizedPath.endsWith('.msg.msg')) {
      normalizedPath = normalizedPath.replace('.msg.msg', '.msg');
    }

    // Set active citation and show the panel
    setActiveCitation(normalizedPath);
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

  // Optional: Add a handler for image clicks from FastRAG
  const handleImageClicked = (imageUrl: string, documentId: string, pageIndex: number) => {
    console.log(`Image clicked: ${imageUrl} from document ${documentId}, page ${pageIndex}`);
    // Add your implementation here if needed
  };

  // Optional: Add a refresh handler for FastRAG
  const handleRefreshClicked = () => {
    console.log("Refresh clicked");
    // Add your implementation here if needed
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
          {/* Top Navigation - Fixed to top */}
          <motion.header
            className={getHeaderBgColor() + " text-white fixed top-0 left-0 right-0 w-full z-50"}
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <nav className="h-14 px-4 flex items-center justify-between max-w-7xl mx-auto">
              <Link href="/" className="text-lg font-medium cursor-pointer">
                {/* <div className="relative h-[50px] w-[200px]">
                  <img
                    src={imgError ? '/defaultLogo.png' : organizationLogo}
                    alt={organization?.name ? `${organization.name} Logo` : 'Organization Logo'}
                    fill
                    style={{ objectFit: 'contain' }}
                    onError={() => setImgError(true)}
                    priority
                  />
                </div> */}
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

                {/* User info, profile and logout */}
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
                      onClick={handleProfileNav}
                      className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-white"
                      whileHover={{ backgroundColor: "#4B5563" }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <User className="h-3 w-3" />
                      Profile
                    </motion.button>
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

          {/* Secondary Toolbar - Fixed below main navbar */}
          <motion.div
            className="bg-[#F5F5F5] fixed top-14 left-0 right-0 w-full z-40"
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

                {/* Swingle Collins Special Reports - Only shown for Swingle Collins organization */}
                {organization?.name === 'Swingle Collins' && (
                  <div className="flex items-center ml-4">
                    <Select onValueChange={handleValueChange}>
                      <SelectTrigger className="h-8 bg-blue-600 text-white border-none hover:bg-blue-700">
                        <SelectValue placeholder="Special Reports" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="policy_comparison">Policy Comparison Report</SelectItem>
                        <SelectItem value="policy_excel">Policy Data Excel Export</SelectItem>
                        <SelectItem value="safeguard">Protective Safeguard Report</SelectItem>
                        <SelectItem value="tria">TRIA Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
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

          {/* Storage fallback warning for Safari in private mode - Adjust position for fixed navbars */}
          {useStorageFallback && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mx-auto max-w-4xl mt-28">
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

          {/* Main Content - Add padding to account for fixed navbars */}
          <main className="flex-1 flex flex-col items-center px-4 py-16 bg-[#F5F5F5] mt-24">
            {/* Show welcome screen when conversation hasn't started */}
            {!conversationStarted && chatHistory.length === 0 && (
              <>
                <motion.div
                  className="text-center mb-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                  <div className="relative h-[250px] w-[400px]">
                    <img
                      src={imgError ? '/defaultLogo.png' : organizationLogo}
                      alt={organization?.name ? `${organization.name} Logo` : 'Organization Logo'}
                      style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                      onError={() => setImgError(true)}
                    />
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

                {/* Dynamic Sample Questions Component */}
                <SampleQuestions chatRef={chatRef} />
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
                            {/* Use conditional rendering to toggle between FastRAG and DeepRAG */}
                            {useDeepRag ? (
                              <DeepRAG
                                answer={message.content}
                                index={index}
                                isSelected={false}
                                isStreaming={isStreaming && index === chatHistory.length - 1}
                                searchResults={message.searchResults}
                                documentExcerpts={message.documentExcerpts || []}
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
                                onRefreshClicked={handleRefreshClicked}
                                onImageClicked={handleImageClicked}
                                showFollowupQuestions={true}
                                enableAdvancedFeatures={true}
                                theme="light"
                              />
                            ) : (
                              <FastRAG
                                answer={message.content}
                                index={index}
                                isSelected={false}
                                isStreaming={isStreaming && index === chatHistory.length - 1}
                                searchResults={message.searchResults}
                                documentExcerpts={message.documentExcerpts || []}
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
                                onRefreshClicked={handleRefreshClicked}
                                onImageClicked={handleImageClicked}
                                showFollowupQuestions={true}
                                enableAdvancedFeatures={true}
                                theme="light"
                                customStyles={{
                                  primaryColor: "#e53e3e",  // Red theme
                                  secondaryColor: "#b91c1c",
                                  accentColor: "#f87171",
                                  cardBackground: "#ffffff",
                                  borderColor: "#e2e8f0",
                                  textColor: "#1e1e2e"
                                }}
                              />
                            )}
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
                  initial={{ opacity: 1 }}
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

          {/* Swingle Collins Report Modals */}
          {/* Policy Comparison Report Modal */}
          <Sheet open={showPolicyComparisonModal} onOpenChange={setShowPolicyComparisonModal}>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Policy Comparison Report</SheetTitle>
              </SheetHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="policyNumber" className="text-sm font-medium">
                    Enter Policy Number
                  </label>
                  <Input
                    id="policyNumber"
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    placeholder="e.g. POL-12345678"
                  />
                </div>
                <div className="flex flex-col gap-2 pt-4">
                  <Button
                    onClick={() => {
                      // Here you would implement the actual report generation logic
                      console.log(`Generating Policy Comparison Report for ${policyNumber}`);
                      // Example of what might happen:
                      // 1. Call an API to generate the report
                      // 2. Show a loading state
                      // 3. When ready, display the PDF and/or offer download
                      setShowPolicyComparisonModal(false);
                    }}
                    disabled={!policyNumber}
                  >
                    Generate Report
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Policy Excel Export Modal */}
          <Sheet open={showPolicyExcelModal} onOpenChange={setShowPolicyExcelModal}>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Policy Data Excel Export</SheetTitle>
              </SheetHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="policyNumberExcel" className="text-sm font-medium">
                    Enter Policy Number
                  </label>
                  <Input
                    id="policyNumberExcel"
                    value={policyNumber}
                    onChange={(e) => setPolicyNumber(e.target.value)}
                    placeholder="e.g. POL-12345678"
                  />
                </div>
                <div className="flex flex-col gap-2 pt-4">
                  <Button
                    onClick={() => {
                      // Here you would implement the actual Excel download logic
                      console.log(`Downloading Excel for ${policyNumber}`);
                      // Example of what might happen:
                      // 1. Call an API to get the Excel file
                      // 2. Trigger browser download

                      // Example of triggering a download (would need the actual file URL)
                      // const a = document.createElement('a');
                      // a.href = `https://your-api.com/reports/excel/${policyNumber}`;
                      // a.download = `Policy_${policyNumber}.xlsx`;
                      // document.body.appendChild(a);
                      // a.click();
                      // document.body.removeChild(a);

                      setShowPolicyExcelModal(false);
                    }}
                    disabled={!policyNumber}
                  >
                    Download Excel
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Protective Safeguard Report Modal */}
          <Sheet open={showSafeguardModal} onOpenChange={setShowSafeguardModal}>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Protective Safeguard Report</SheetTitle>
              </SheetHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="companySelect" className="text-sm font-medium">
                    Select Company
                  </label>
                  <Select
                    onValueChange={setSelectedCompany}
                    value={selectedCompany}
                  >
                    <SelectTrigger id="companySelect">
                      <SelectValue placeholder="Select a company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companyList.map((company) => (
                        <SelectItem key={company} value={company}>
                          {company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2 pt-4">
                  <Button
                    onClick={() => {
                      // Here you would implement the actual report display logic
                      console.log(`Viewing Safeguard Report for ${selectedCompany}`);
                      // Example of what might happen:
                      // 1. Call an API to get the PDF 
                      // 2. Display it in a PDF viewer component
                      // 3. Offer download option
                      setShowSafeguardModal(false);
                    }}
                    disabled={!selectedCompany}
                  >
                    View Report
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* TRIA Report Modal */}
          <Sheet open={showTriaModal} onOpenChange={setShowTriaModal}>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>TRIA Report</SheetTitle>
              </SheetHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <label htmlFor="companySelectTria" className="text-sm font-medium">
                    Select Company
                  </label>
                  <Select
                    onValueChange={setSelectedCompany}
                    value={selectedCompany}
                  >
                    <SelectTrigger id="companySelectTria">
                      <SelectValue placeholder="Select a company" />
                    </SelectTrigger>
                    <SelectContent>
                      {companyList.map((company) => (
                        <SelectItem key={company} value={company}>
                          {company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2 pt-4">
                  <Button
                    onClick={() => {
                      // Here you would implement the actual report display logic
                      console.log(`Viewing TRIA Report for ${selectedCompany}`);
                      // Similar to the safeguard report flow
                      setShowTriaModal(false);
                    }}
                    disabled={!selectedCompany}
                  >
                    View Report
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Add custom styling for FastRAG and citations */}
          <style jsx global>{`
            /* Citation styling */
            .prose a, .prose [data-citation] {
              color: #e53e3e !important;
              font-weight: 500;
              text-decoration: none;
              cursor: pointer;
              position: relative;
            }
            
            .prose a:hover, .prose [data-citation]:hover {
              text-decoration: underline;
            }
            
            /* Match citation patterns in square brackets */
            .prose p {
              line-height: 1.75;
              margin-bottom: 1rem;
            }
            
            /* Override for citation format with square brackets */
            .prose span[data-citation-text], 
            .prose span[data-file-name],
            .prose span.citation-text {
              color: #e53e3e;
              font-weight: 500;
              cursor: pointer;
              background-color: rgba(229, 62, 62, 0.1);
              padding: 2px 4px;
              border-radius: 4px;
            }
            
            /* Styling for references in square brackets */
            .prose span:not([class]):not([style]):not([id]) {
              color: inherit;
            }
            
            .prose span:not([class]):not([style]):not([id]):has(> a) {
              background-color: transparent;
              padding: 0;
            }
            
            /* Special styling for FastRAG citation format [text][text] */
            .prose p span:not([class]):not([style]):not([id]),
            .prose li span:not([class]):not([style]):not([id]) {
              display: inline;
            }
            
            /* Match citation format [text] or [text][text] */
            .prose a[href^="#citation-"],
            .prose span[data-citation="true"],
            .prose span.citation {
              color: #e53e3e !important;
              font-weight: 500;
              cursor: pointer;
              background-color: rgba(229, 62, 62, 0.1);
              padding: 2px 4px;
              border-radius: 4px;
              text-decoration: none;
            }
            
            /* Override for FastRAG */
            .ground-x-content .doc-ref {
              color: #e53e3e !important;
              font-weight: 500;
              cursor: pointer;
              text-decoration: none;
              background-color: rgba(229, 62, 62, 0.1);
              padding: 2px 4px;
              border-radius: 4px;
            }
            
            .ground-x-content .doc-ref:hover {
              text-decoration: underline;
            }
            
            /* Styling for Azure-style citations */
            .azure-citation {
              color: #e53e3e !important;
              font-weight: 500;
              cursor: pointer;
              text-decoration: none;
              background-color: rgba(229, 62, 62, 0.1);
              padding: 2px 4px;
              border-radius: 4px;
            }
            
            /* Custom styling for bracket citations that follow this pattern: [text.pdf] */
            .prose p a:not([href]), 
            .prose p span:not([class]):not([style]):not([id]):matches(/\\[.*\\]/),
            .prose li span:not([class]):not([style]):not([id]):matches(/\\[.*\\]/),
            .prose span:matches(/\\[.*\\]/) {
              color: #e53e3e !important;
              font-weight: 500;
              cursor: pointer;
              background-color: rgba(229, 62, 62, 0.1);
              padding: 2px 4px;
              border-radius: 4px;
              text-decoration: none;
            }
          `}</style>
        </div>
      </RAGProvider>
    </ProtectedRoute>
  );
}