"use client";

import { useEffect, useState, useRef } from "react";
import { History, Trash2, Settings } from "lucide-react";
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
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Open chat history
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="flex items-center gap-2" onClick={clearChat}>
                <Trash2 className="h-4 w-4" />
                Clear chat
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2"
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
                <Button
                  onClick={() => setShowContractAnalyzer(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-md flex items-center gap-2"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10 9H9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Analyze Contract
                </Button>
                <Button onClick={() => setShowFileCabinetPanel(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md flex items-center gap-2">
                  Open File Cabinet
                </Button>
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
                <div className="bg-white rounded-lg shadow-md p-4 h-full">
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

                  {contractAnalysisResults.risks.length > 0 ? (
                    // Normal case: Display structured risks and mitigation points
                    <ContractAnalysisDisplay
                      risks={contractAnalysisResults.risks}
                      mitigationPoints={contractAnalysisResults.mitigationPoints}
                      contractText={contractAnalysisResults.contractText}
                    />
                  ) : (
                    // Fallback case: Display the raw analysis text when no structured risks are found
                    <div className="overflow-y-auto h-full">
                      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                        <p className="text-yellow-700">
                          No structured risks were detected in the provided format, but here's the full analysis:
                        </p>
                      </div>
                      <div className="prose max-w-none">
                        {contractAnalysisResults.analysisText ? (
                          // If we have analysis text, render it
                          <div className="whitespace-pre-wrap">{contractAnalysisResults.analysisText}</div>
                        ) : (
                          // No analysis text either
                          <p className="text-gray-500 italic">
                            No analysis was generated. This might be due to an issue with the document format or content.
                            Please try uploading the contract again or contact support.
                          </p>
                        )}
                      </div>
                    </div>
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
        <SettingsSidebar open={settingsOpen} onOpenChange={setSettingsOpen} />
      </div>
    </ProtectedRoute>
  );
}