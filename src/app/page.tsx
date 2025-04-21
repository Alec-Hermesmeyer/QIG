"use client";

import { useEffect, useState, useRef } from "react";
import { History, Trash2, Settings, File } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { SettingsSidebar } from "@/components/settings-sidebar";
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

// Define enhanced developer settings interface
interface DeveloperSettings {
  apiEndpoint: string;
  modelVersion: string;
  temperature: number;
  debugMode: boolean;
  maxTokens: number;
  overridePrompt: string;
  useContractAnalysisPrompts: boolean;
  selectedContractPrompt: string;
  promptFormat: "text" | "json";
}

// Define chat settings interface to match ImprovedChat component's expected props
interface ChatSettings {
  enableDebugMode?: boolean;
  logLevel?: "info" | "warn" | "error" | "debug";
}

// Predefined contract analysis prompts
const CONTRACT_ANALYSIS_PROMPTS = {
  "main_clause_extraction": `You are an expert contract analyzer specializing in construction agreements. Your task is to extract every clause from the contract and create a structured table. Analyze the complete contract, breaking it down into individual clauses, regardless of how the contract is organized.

Extract all clauses from this construction contract and organize them into a structured table with the following columns:

1. Clause_ID (format: CL-[section number]-[sequential number])
2. Section_Number (the hierarchical section number as appears in contract, e.g., '3.2.1')
3. Section_Title (the heading or title of the section)
4. Clause_Text (the complete text of the clause)
5. Clause_Type (categorize: Payment, Schedule, Termination, Liability, Design, Force Majeure, etc.)
6. Is_Standard (Yes/No - determine if this appears to be standard/boilerplate language)
7. Has_Variables (Yes/No - indicates if the clause contains project-specific variables)
8. Variables_List (list any project-specific elements like amounts, dates, names)`,

  "clause_relationship_extraction": `You are an expert legal analyst specializing in contract structure and relationships. Your task is to identify relationships between clauses in this construction contract. Look for references, dependencies, modifications, exceptions, and hierarchical relationships.

Using the previously extracted clauses, identify all relationships between clauses in this contract. Create a structured table with the following columns:

1. Relationship_ID (format: REL-[sequential number])
2. Source_Clause_ID (the clause that references or relates to another)
3. Target_Clause_ID (the clause being referenced or related to)
4. Relationship_Type (choose one: References, Modifies, Exceptions, Depends_On, Parent_Of, Contradicts)
5. Relationship_Text (exact text that establishes the relationship)
6. Notes (any additional observations)`,

  "metadata_extraction": `You are an expert in construction contract analysis. Your task is to extract key metadata about this contract and create a structured record.

Extract the following metadata from this construction contract and organize it into a structured table:

1. Contract_ID (generate a unique ID)
2. Contract_Title (full title of the agreement)
3. Contract_Date (effective or execution date)
4. Contract_Type (e.g., Fixed Price, Cost-Plus, Design-Build, etc.)
5. Owner_Name (client/owner entity)
6. Contractor_Name (primary contractor)
7. Project_Name (name of the construction project)
8. Project_Location (site address or description)
9. Contract_Value (total contract amount)
10. Contract_Duration (time period or days for completion)
11. Payment_Terms (brief summary of payment structure)
12. Governing_Law (jurisdiction)
13. Dispute_Resolution (method specified)
14. Special_Provisions (list any unusual or special provisions)`,

  "risk_assessment": `You are an expert construction contract risk analyst. Your task is to identify and assess risks in this contract from the contractor's perspective.

Analyze this construction contract and create a comprehensive risk assessment table with the following columns:

1. Risk_ID (format: RISK-[sequential number])
2. Related_Clause_ID (the clause ID that contains this risk)
3. Risk_Category (e.g., Payment, Schedule, Liability, Design, Force Majeure)
4. Risk_Description (detailed description of the risk)
5. Risk_Severity (Critical, High, Medium, Low)
6. Risk_Probability (High, Medium, Low)
7. Potential_Impact (financial, schedule, or other impacts)
8. Risk_Owner (which party bears this risk)
9. Mitigation_Strategy (suggested approach to mitigate)

Identify risks in areas including but not limited to: payment terms, schedule requirements, liquidated damages, indemnification, warranties, design responsibility, force majeure, and termination provisions.`,

  "financial_terms_extraction": `You are an expert in construction contract financial analysis. Your task is to extract all payment and financial terms from this contract.

Extract all payment and financial terms from this construction contract and organize them into a structured table:

1. Financial_Item_ID (format: FIN-[sequential number])
2. Related_Clause_ID (the clause ID that contains this financial item)
3. Item_Type (Contract Sum, Unit Price, Allowance, Retainage, Change Order, Fee, etc.)
4. Item_Description (description of the financial term)
5. Amount (dollar value if specified)
6. Percentage (if specified as a percentage)
7. Payment_Timing (when payment is due)
8. Prerequisites (conditions that must be met before payment)
9. Retainage (any withholding percentage)
10. Special_Conditions (any special conditions related to this financial item)`
};

export default function Page() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [conversationStarted, setConversationStarted] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  // Enhanced Developer settings state
  const [developerSettings, setDeveloperSettings] = useState<DeveloperSettings>({
    apiEndpoint: "https://api.openai.com/v1/chat/completions",
    modelVersion: "gpt-4",
    temperature: 0.7,
    debugMode: false,
    maxTokens: 2048,
    overridePrompt: "",
    useContractAnalysisPrompts: false,
    selectedContractPrompt: "main_clause_extraction",
    promptFormat: "text"
  });

  // Derived chat settings that match the expected format for ImprovedChat
  const chatSettings: ChatSettings = {
    enableDebugMode: developerSettings.debugMode,
    logLevel: developerSettings.debugMode ? "debug" : "info"
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

  // Update chat component with dev settings when they change
  useEffect(() => {
    // This would be implemented in a real app to pass settings to the chat component
    console.log("Developer settings updated:", developerSettings);
    // You would apply these settings to your actual API calls
  }, [developerSettings]);

  // Handler for dev settings update
  const handleDeveloperSettingsUpdate = (newSettings: DeveloperSettings) => {
    setDeveloperSettings(newSettings);
    // You could store these in localStorage for persistence
    localStorage.setItem('developerSettings', JSON.stringify(newSettings));
  };

  // Load saved settings on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('developerSettings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setDeveloperSettings({...developerSettings, ...parsedSettings});
      } catch (e) {
        console.error("Failed to parse saved developer settings", e);
      }
    }
  }, []);

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
    // Set the input field with the question
    const input = document.querySelector('input[type="text"]');
    if (input instanceof HTMLInputElement) {
      input.value = question;
      input.dispatchEvent(new Event('input', { bubbles: true }));

      // Optionally auto-submit
      const form = input.closest('form');
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    }
  };

  // Create a custom prompt message for the API based on settings
  const createCustomPromptMessage = (userMessage: string) => {
    if (developerSettings.useContractAnalysisPrompts && developerSettings.selectedContractPrompt) {
      const promptTemplate = CONTRACT_ANALYSIS_PROMPTS[developerSettings.selectedContractPrompt as keyof typeof CONTRACT_ANALYSIS_PROMPTS];
      if (promptTemplate) {
        return [
          { role: "system", content: promptTemplate },
          { role: "user", content: userMessage }
        ];
      }
    } else if (developerSettings.overridePrompt) {
      return [
        { role: "system", content: developerSettings.overridePrompt },
        { role: "user", content: userMessage }
      ];
    }
    
    // Default message format if no overrides
    return [
      { role: "user", content: userMessage }
    ];
  };

  // Handle new message with prompt overrides
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

    // Check if user is asking about a specific contract
    if (
      content.toLowerCase().includes('contract') &&
      (content.toLowerCase().includes('analyze') ||
        content.toLowerCase().includes('analysis') ||
        content.toLowerCase().includes('risk'))
    ) {
      // Check if we should use contract analysis prompts
      if (developerSettings.useContractAnalysisPrompts) {
        // Here, we would apply the selected contract analysis prompt
        // This would be handled by your chat API integration
        console.log("Using contract analysis prompt:", 
          developerSettings.selectedContractPrompt, 
          "for message:", content);
        
        // Open contract analyzer panel
        setShowContractAnalyzer(true);
      } else {
        // Use normal behavior
        setShowContractAnalyzer(true);
      }
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
    // Set the input field with the question
    const input = document.querySelector('input[type="text"]');
    if (input instanceof HTMLInputElement) {
      input.value = question;
      input.dispatchEvent(new Event('input', { bubbles: true }));

      // Auto-submit
      const form = input.closest('form');
      if (form) {
        setTimeout(() => {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }, 100);
      }
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

              {/* Contract Analysis Button */}
              <div className="w-full max-w-4xl mb-12 flex justify-evenly">
                
                
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
                        showFollowupQuestions={true}
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
                  // Pass modified dev settings to the chat component
                  devSettings={chatSettings}
                  // Pass createCustomPromptMessage to the ImprovedChat component
                  createCustomPromptMessage={createCustomPromptMessage}
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
          // We don't pass devSettings directly, instead any necessary options would be passed here
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
          // We don't pass devSettings directly
        />
        
        <FileCabinetPanel
          isOpen={showFileCabinetPanel}
          onDismiss={() => setShowFileCabinetPanel(false)}
          onRunAnalysis={(fileName) => {
            handleUserMessage(`Analyze the contract for ${fileName}`);
          }}
        />

        {/* Enhanced Settings Sidebar with support for prompt library */}
        <SettingsSidebar 
          open={settingsOpen} 
          onOpenChange={setSettingsOpen}
          settings={developerSettings}
          onSettingsChange={handleDeveloperSettingsUpdate}
        />
      </div>
    </ProtectedRoute>
  );
}