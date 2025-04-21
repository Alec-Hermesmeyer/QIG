"use client";

import { useEffect, useState, useRef } from "react";
import { History, Trash2, Settings, File, Info } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
import ContractAnalysisDisplay from "@/components/ContractAnalystDisplay";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { AnalysisPanelTabs } from "@/components/AnalysisPanelTabs";
import { FileCabinetPanel } from "@/components/FileCabinetPanel";
import { useAuth } from "@/lib/auth/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

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
    suggestFollowUp: false,
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

  return (
    <TooltipProvider>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Configure answer generation</SheetTitle>
          </SheetHeader>
          <div className="space-y-6">
            {/* Prompt Template */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label htmlFor="prompt" className="text-sm font-medium">
                  Override prompt template
                </label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Custom prompt template for the AI</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Textarea 
                id="prompt" 
                className="min-h-[100px]" 
                value={settings.promptTemplate}
                onChange={(e) => handleInputChange('promptTemplate', e.target.value)}
                placeholder="You are an AI assistant that helps users analyze construction contracts. When analyzing a contract, focus on the financial provisions, risk allocation, and key compliance requirements."
              />
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label htmlFor="temperature" className="text-sm font-medium">
                  Temperature
                </label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Controls randomness in the output</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex gap-4">
                <Slider 
                  id="temperature" 
                  min={0} 
                  max={1} 
                  step={0.1} 
                  value={[settings.temperature]} 
                  className="flex-1"
                  onValueChange={(value) => handleInputChange('temperature', value[0])}
                />
                <Input 
                  type="number" 
                  className="w-20" 
                  value={settings.temperature} 
                  onChange={(e) => handleInputChange('temperature', parseFloat(e.target.value) || 0)}
                  min={0}
                  max={1}
                  step={0.1}
                />
              </div>
            </div>

            {/* Seed */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label htmlFor="seed" className="text-sm font-medium">
                  Seed
                </label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Random seed for reproducibility</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input 
                id="seed" 
                type="text" 
                value={settings.seed}
                onChange={(e) => handleInputChange('seed', e.target.value)}
                placeholder="Leave blank for random results"
              />
            </div>

            {/* Search and Reranker Scores */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label htmlFor="search-score" className="text-sm font-medium">
                    Minimum search score
                  </label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Minimum relevance score for search results</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input 
                  id="search-score" 
                  type="number" 
                  min="0" 
                  max="5" 
                  step="0.1"
                  value={settings.minSearchScore}
                  onChange={(e) => handleInputChange('minSearchScore', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label htmlFor="reranker-score" className="text-sm font-medium">
                    Minimum reranker score
                  </label>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Minimum score for reranking results</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input 
                  id="reranker-score" 
                  type="number" 
                  min="0" 
                  max="5" 
                  step="0.1"
                  value={settings.minRerankerScore}
                  onChange={(e) => handleInputChange('minRerankerScore', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Categories */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Include category</label>
                <Select 
                  value={settings.includeCategory}
                  onValueChange={(value) => handleInputChange('includeCategory', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="policies">Policies</SelectItem>
                    <SelectItem value="coverage">Coverage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Exclude category</label>
                <Select
                  value={settings.excludeCategory || 'none'}
                  onValueChange={(value) => handleInputChange('excludeCategory', value === 'none' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="policies">Policies</SelectItem>
                    <SelectItem value="coverage">Coverage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="semantic-ranker" 
                  checked={settings.useSemanticRanker}
                  onCheckedChange={(checked) => handleInputChange('useSemanticRanker', checked === true)}
                />
                <label
                  htmlFor="semantic-ranker"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Use semantic ranker for retrieval
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="semantic-captions" 
                  checked={settings.useSemanticCaptions}
                  onCheckedChange={(checked) => handleInputChange('useSemanticCaptions', checked === true)}
                />
                <label
                  htmlFor="semantic-captions"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Use semantic captions
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="stream-response" 
                  checked={settings.streamResponse}
                  onCheckedChange={(checked) => handleInputChange('streamResponse', checked === true)}
                />
                <label
                  htmlFor="stream-response"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Stream chat completion responses
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="follow-up" 
                  checked={settings.suggestFollowUp}
                  onCheckedChange={(checked) => handleInputChange('suggestFollowUp', checked === true)}
                />
                <label
                  htmlFor="follow-up"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Suggest follow-up questions
                </label>
              </div>
            </div>

            {/* Retrieval Mode */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Retrieval mode</label>
              <Select 
                value={settings.retrievalMode}
                onValueChange={(value) => handleInputChange('retrievalMode', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hybrid">Vectors + Text (Hybrid)</SelectItem>
                  <SelectItem value="vectors">Vectors only</SelectItem>
                  <SelectItem value="text">Text only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <Button variant="outline" className="w-1/2" onClick={handleCancel}>
                Cancel
              </Button>
              <Button className="w-1/2" onClick={handleApplySettings}>
                Apply Settings
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}

// Create the StyledFallbackAnalysis component directly in this file
// until we can move it to its own file
const StyledFallbackAnalysis = ({ analysisText }: { analysisText: string }) => {
  const [activeTab, setActiveTab] = useState(0);
  
  // Helper function to extract risks from raw text
  const extractRisksFromText = (text: string) => {
    // Look for patterns like "Risk Category: X" in the text
    const risks: any[] = [];
    const riskRegex = /Risk Category:\s*(.*?)\s*\n\s*Risk Score:\s*(.*?)\s*\n\s*Risky Contract Text:\s*"(.*?)"\s*\n\s*Why This Is a Risk:\s*(.*?)\s*\n\s*Contract Location:\s*(.*?)(?:\n\n|\n$|$)/gs;
    
    let match;
    while ((match = riskRegex.exec(text)) !== null) {
      risks.push({
        category: match[1]?.trim(),
        score: match[2]?.trim(),
        text: match[3]?.trim(),
        reason: match[4]?.trim(),
        location: match[5]?.trim()
      });
    }
    
    return risks;
  };

  // Helper function to extract mitigation points from raw text
  const extractMitigationFromText = (text: string) => {
    const mitigations: string[] = [];
    
    // Look for a mitigation section
    const mitigationSectionRegex = /Mitigation Summary:(.+?)(?:\n\n|\n[A-Z]|$)/gs;
    const mitigationSection = mitigationSectionRegex.exec(text);
    
    if (mitigationSection && mitigationSection[1]) {
      // Extract bullet points
      const mitigationText = mitigationSection[1];
      const bulletPointRegex = /-\s*(.*?)(?:\n-|\n\n|$)/gs;
      
      let bulletMatch;
      while ((bulletMatch = bulletPointRegex.exec(mitigationText)) !== null) {
        if (bulletMatch[1]?.trim()) {
          mitigations.push(bulletMatch[1].trim());
        }
      }
      
      // If no bullet points found, try paragraph extraction
      if (mitigations.length === 0) {
        mitigations.push(...mitigationText.split('\n').map(line => line.trim()).filter(line => line));
      }
    }
    
    return mitigations;
  };

  // Helper function to get color based on risk score
  const getRiskScoreColor = (score: string) => {
    switch (score.toLowerCase()) {
      case 'critical': return '#ef4444'; // Red
      case 'high': return '#f97316';     // Orange
      case 'medium': return '#eab308';   // Yellow
      case 'low': return '#22c55e';      // Green
      default: return '#6b7280';         // Gray
    }
  };
  
  // Parse the raw text to extract risks and mitigation points
  const extractedRisks = extractRisksFromText(analysisText);
  const extractedMitigations = extractMitigationFromText(analysisText);
  
  // Group risks by severity for easy filtering
  const criticalRisks = extractedRisks.filter(risk => risk.score.toLowerCase() === 'critical');
  const highRisks = extractedRisks.filter(risk => risk.score.toLowerCase() === 'high');
  const mediumRisks = extractedRisks.filter(risk => risk.score.toLowerCase() === 'medium');
  const lowRisks = extractedRisks.filter(risk => risk.score.toLowerCase() === 'low');

  // Individual risk card component
  const RiskCard = ({ risk, index }: { risk: any; index: number }) => {
    return (
      <div 
        className="mb-4 p-4 rounded-lg border shadow-sm"
        style={{ borderLeftWidth: '4px', borderLeftColor: getRiskScoreColor(risk.score) }}
      >
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium text-gray-900">
            {index + 1}. {risk.category}
          </h4>
          <span 
            className="px-2 py-1 text-xs font-bold text-white rounded-md"
            style={{ backgroundColor: getRiskScoreColor(risk.score) }}
          >
            {risk.score}
          </span>
        </div>
        
        <div className="mb-2">
          <span className="text-sm text-gray-500">Location: {risk.location}</span>
        </div>
        
        <div className="bg-gray-100 p-2 rounded-md mb-3 italic text-gray-700">
          "{risk.text}"
        </div>
        
        <div>
          <span className="font-medium">Why This Is a Risk:</span>
          <p className="text-gray-700">{risk.reason}</p>
        </div>
      </div>
    );
  };
  
  // Import react-tabs styles directly with CSS
  return (
    <div className="h-96 overflow-scroll flex flex-col">
      <div className="tabs">
        <div className="flex border-b">
          {/* <div 
            className={`px-4 py-2 cursor-pointer border-b-2 ${activeTab === 0 ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-blue-600 hover:border-blue-600'}`}
            onClick={() => setActiveTab(0)}
          >
            Raw Analysis
          </div> */}
          {extractedRisks.length > 0 && (
            <div 
              className={`px-4 py-2 cursor-pointer border-b-2 ${activeTab === 1 ? 'border-blue-600 text-blue-600' : 'border-transparent hover:text-blue-600 hover:border-blue-600'}`}
              onClick={() => setActiveTab(1)}
            >
              Parsed Risks ({extractedRisks.length})
            </div>
          )}
          {criticalRisks.length > 0 && (
            <div 
              className={`px-4 py-2 cursor-pointer border-b-2 ${activeTab === 2 ? 'border-red-600 text-red-600' : 'border-transparent hover:text-red-600 hover:border-red-600'}`}
              onClick={() => setActiveTab(2)}
            >
              Critical ({criticalRisks.length})
            </div>
          )}
          {highRisks.length > 0 && (
            <div 
              className={`px-4 py-2 cursor-pointer border-b-2 ${activeTab === 3 ? 'border-orange-600 text-orange-600' : 'border-transparent hover:text-orange-600 hover:border-orange-600'}`}
              onClick={() => setActiveTab(3)}
            >
              High ({highRisks.length})
            </div>
          )}
          {extractedMitigations.length > 0 && (
            <div 
              className={`px-4 py-2 cursor-pointer border-b-2 ${activeTab === 4 ? 'border-purple-600 text-purple-600' : 'border-transparent hover:text-purple-600 hover:border-purple-600'}`}
              onClick={() => setActiveTab(4)}
            >
              Mitigation
            </div>
          )}
        </div>

        {/* Tab panels */}
        <div className="overflow-y-auto flex-grow">
          {/* Raw text panel */}
          {activeTab === 0 && (
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4">Full Analysis</h3>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 whitespace-pre-wrap">
                {analysisText}
              </div>
            </div>
          )}
          
          {/* All extracted risks */}
          {activeTab === 1 && extractedRisks.length > 0 && (
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4">All Identified Risks</h3>
              {extractedRisks.map((risk, index) => (
                <RiskCard key={index} risk={risk} index={index} />
              ))}
            </div>
          )}
          
          {/* Critical risks */}
          {activeTab === 2 && criticalRisks.length > 0 && (
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4">Critical Risks</h3>
              {criticalRisks.map((risk, index) => (
                <RiskCard key={index} risk={risk} index={index} />
              ))}
            </div>
          )}
          
          {/* High risks */}
          {activeTab === 3 && highRisks.length > 0 && (
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4">High Risks</h3>
              {highRisks.map((risk, index) => (
                <RiskCard key={index} risk={risk} index={index} />
              ))}
            </div>
          )}
          
          {/* Mitigation suggestions */}
          {activeTab === 4 && extractedMitigations.length > 0 && (
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4">Mitigation Strategies</h3>
              <div className="bg-green-50 border-l-4 border-green-400 p-4">
                <ul className="list-disc ml-5 space-y-2">
                  {extractedMitigations.map((point, index) => (
                    <li key={index} className="text-gray-800">{point}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Define simple message type
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function Page() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

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

  // Save settings to localStorage when they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('contract-analysis-settings', JSON.stringify(settings));
    }
  }, [settings]);

  // Settings change handler
  const handleSettingsChange = (updatedSettings: Partial<SettingsState>) => {
    setSettings(prev => {
      const newSettings = {
        ...prev,
        ...updatedSettings
      };
      
      // Update chat config immediately with new settings
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

    // Apply settings to any API that needs to be updated
    console.log("Applied settings:", updatedSettings);
  };

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

  // Scroll to latest message
  useEffect(() => {
    chatMessageStreamEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isStreaming]);

  // Effect to update chat configuration when chat reference is available
  useEffect(() => {
    if (chatRef.current) {
      // Update the chat configuration
      chatRef.current.updateConfig?.(chatConfig);
      
      console.log("Updated chat configuration:", chatConfig);
    }
  }, [chatConfig, chatRef.current]);

  // Clear chat functionality
  const clearChat = () => {
    setChatHistory([]);
    setConversationStarted(false);
    setIsStreaming(false);
    setContractAnalysisResults(null);
    setShowAnalysisPanel(false);
    setShowContractPanel(false);
    setCurrentMessageForAnalysis(null);
  };

  // Handle logout
  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  // Simple handlers for Answer component
  const handleCitationClicked = (filePath: string) => {
    console.log(`Citation clicked: ${filePath}`);
    // Set the active citation and open the analysis panel to the citation tab
    setActiveCitation(filePath);
    setAnalysisTabKey(AnalysisPanelTabs.CitationTab);
    setShowAnalysisPanel(true);
  };

  const handleThoughtProcessClicked = () => {
    console.log("Thought process clicked");
    // Open the analysis panel to the thought process tab
    setAnalysisTabKey(AnalysisPanelTabs.ThoughtProcessTab);
    setShowAnalysisPanel(true);
  };

  const handleSupportingContentClicked = (messageIndex?: number) => {
    console.log("Supporting content clicked", messageIndex);

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

  // Handle new message
  const handleUserMessage = (content: string) => {
    const newMessage: ChatMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    setChatHistory(prev => [...prev, newMessage]);
    setMostRecentUserMessage(content);

    if (!conversationStarted) {
      setConversationStarted(true);
    }

    // Check if the user is asking to analyze a contract
    if (
      content.toLowerCase().includes('contract') &&
      (content.toLowerCase().includes('analyze') ||
        content.toLowerCase().includes('analysis') ||
        content.toLowerCase().includes('risk'))
    ) {
      // Open contract analyzer panel
      setShowContractAnalyzer(true);
    }
  };

  const handleAssistantMessage = (content: string) => {
    const newMessage: ChatMessage = {
      role: 'assistant',
      content,
      timestamp: new Date().toISOString()
    };

    setChatHistory(prev => [...prev, newMessage]);
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

  // Handle example questions
  const handleExampleQuestion = (question: string) => {
    if (chatRef.current) {
      chatRef.current.submitMessage(question);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen flex flex-col">
        {/* Top Navigation */}
        <header className="bg-[#1C1C1C] text-white">
          <nav className="h-14 px-4 flex items-center justify-between max-w-7xl mx-auto">
            <Link href="/" className="text-lg font-medium">
              QIG Contract Analyst
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/chat" className="hover:text-gray-300">Chat</Link>
              <Link href="/ask" className="hover:text-gray-300">Ask a question</Link>
              
              {/* User info and logout */}
              {user && (
                <div className="flex items-center gap-3 ml-6">
                  <span className="text-sm text-gray-300">
                    {user.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded-md text-white"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </nav>
        </header>

        {/* Secondary Toolbar */}
        <div className="bg-[#F5F5F5]">
          
          <div className="h-12 px-4 flex items-center justify-between max-w-7xl mx-auto">
            <Button variant="ghost" size="sm" className="flex items-center gap-2 cursor-pointer">
              <History className="h-4 w-4" />
              Open chat history
            </Button>
            <div className="flex items-center gap-2 cursor-pointer">
            <Button variant="ghost"
                size="sm"
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setShowContractAnalyzer(true)} >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Analyze Contract
              </Button>
              
              
              <Button variant="ghost"
                size="sm"
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setShowFileCabinetPanel(true)} >
                <File className="h-4 w-4" />
                File Cabinet
              </Button>

              <Button variant="ghost" size="sm" className="flex items-center gap-2 cursor-pointer" onClick={clearChat}>
                <Trash2 className="h-4 w-4" />
                Clear chat
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="h-4 w-4" />
                Developer settings
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center px-4 py-16 bg-[#F5F5F5]">
          {!conversationStarted && (
            <>
              <div className="text-center mb-16">
                <div className="relative mb-4">
                  <h1 className="text-4xl font-bold mb-2 mt-40">Chat with your data</h1>
                  {/* Decorative Stars */}
                  <div className="absolute -top-36 right-[calc(50%-30px)] text-[#6B5FCD]">
                    <svg width="100" height="100" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 0L25 15L40 20L25 25L20 40L15 25L0 20L15 15L20 0Z" fill="currentColor" />
                    </svg>
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="ml-4"
                    >
                      <path d="M12 0L15 9L24 12L15 15L12 24L9 15L0 12L9 9L12 0Z" fill="currentColor" />
                    </svg>
                  </div>
                </div>
                <p className="text-gray-600 font-bold">Ask anything or try an example</p>
              </div>

              {/* Example Questions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl mb-8">
                {[
                  "What contracts are available for review?",
                  "What does a Construction manager at Risk do?",
                  "What are preconstruction services?",
                ].map((question) => (
                  <button
                    key={question}
                    className="px-4 py-12 bg-gray-200 rounded-lg text-left hover:bg-gray-300 transition-colors"
                    onClick={() => chatRef.current?.submitMessage(question)}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Main Content Layout with Split View */}
          <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-6">
            {/* Chat Column */}
            <div className={`w-full ${showContractPanel ? 'lg:w-1/2' : 'lg:w-full'} flex flex-col`}>
              {/* Chat History Display */}
              <div className="w-full mb-4">
                {chatHistory.map((message, index) => (
                  <div key={index} className="mb-4">
                    {/* User Message */}
                    {message.role === 'user' && (
                      <div className="w-full flex justify-end">
                        <div className="bg-blue-100 text-right p-4 rounded-lg max-w-lg">
                          <p className="text-right">{message.content}</p>
                        </div>
                      </div>
                    )}

                    {/* Assistant Message */}
                    {message.role === 'assistant' && (
                      <Answer
                        answer={message.content}
                        index={index}
                        isSelected={false}
                        isStreaming={isStreaming && index === chatHistory.length - 1}
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
                        showFollowupQuestions={settings.suggestFollowUp}
                        onAnalyzeClick={() => {
                          if (contractAnalysisResults) {
                            setShowContractPanel(true);
                          }
                        }}
                      />
                    )}
                  </div>
                ))}
                <div ref={chatMessageStreamEnd} />
              </div>

              {/* Chat Input */}
              <div className="w-full max-w-7xl flex justify-center mb-4">
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
                />
              </div>

              {/* Contract Analysis Button - always visible when chat has started */}
              {conversationStarted && (
                <div className="w-full mt-6 flex justify-center">
                  <Button
                    onClick={() => setShowContractAnalyzer(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md flex items-center gap-2"
                    size="sm"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Analyze Contract
                  </Button>
                </div>
              )}
            </div>

            {/* Contract Analysis Panel */}
            {showContractPanel && contractAnalysisResults && (
              <div className="w-full lg:w-1/2 flex flex-col">
                <div className="bg-white rounded-lg shadow-md p-4 h-full overflow-hidden flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">Contract Risk Analysis</h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowContractPanel(false)}
                    >
                      Close
                    </Button>
                  </div>
                  
                  {contractAnalysisResults.risks && contractAnalysisResults.risks.length > 0 ? (
                    // Normal case: Display structured risks and mitigation points
                    <ContractAnalysisDisplay
                      risks={contractAnalysisResults.risks}
                      mitigationPoints={contractAnalysisResults.mitigationPoints || []}
                      contractText={contractAnalysisResults.contractText || ''}
                    />
                  ) : (
                    // Fallback case: Use our new styled fallback component when no structured risks are found
                    <StyledFallbackAnalysis 
                      analysisText={contractAnalysisResults.analysisText || ''}
                    />
                  )}
                </div>
              </div>
            )}
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
          onRunAnalysis={(fileName) => {
            handleUserMessage(`Analyze the contract for ${fileName}`);
          }}
        />

        {/* Settings Sidebar */}
        <SettingsSidebar
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          initialSettings={settings}
          onSettingsChange={handleSettingsChange}
        />
      </div>
    </ProtectedRoute>
  );
}