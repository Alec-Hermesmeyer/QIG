'use client';

import {
  useState,
  FormEvent,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle
} from 'react';
import { Send, FileText, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getContractAnalysisPrompt } from '@/lib/contract-service';

// Define interface for search configuration
interface SearchConfig {
  minSearchScore: number;
  minRerankerScore: number;
  includeCategory: string;
  excludeCategory: string | null;
  useSemanticRanker: boolean;
  useSemanticCaptions: boolean;
  retrievalMode: string;
}

// Define interface for chat configuration
interface ChatConfig {
  temperature?: number;
  seed?: string;
  streamResponse?: boolean;
  suggestFollowUpQuestions?: boolean;
  promptTemplate?: string;
  searchConfig?: SearchConfig;
}

interface ChatProps {
  onUserMessage: (message: string) => void;
  onAssistantMessage: (message: string) => void;
  onConversationStart?: () => void;
  onStreamingChange?: (isStreaming: boolean) => void;
  isDisabled?: boolean;
  availableContracts?: string[];

  // Configuration props
  temperature?: number;
  seed?: string;
  streamResponses?: boolean;
  suggestFollowUpQuestions?: boolean;
  promptTemplate?: string;
  searchConfig?: SearchConfig;
}

export interface ImprovedChatHandle {
  submitMessage: (message: string) => void;
  updateConfig?: (config: ChatConfig) => void;
}

export const ImprovedChat = forwardRef<ImprovedChatHandle, ChatProps>(function ImprovedChat(
  {
    onUserMessage,
    onAssistantMessage,
    onConversationStart,
    onStreamingChange,
    isDisabled = false,
    availableContracts = [],
    // Configuration props with defaults
    temperature = 0,
    seed,
    streamResponses = true,
    suggestFollowUpQuestions = false,
    promptTemplate,
    searchConfig
  },
  ref
) {
  // Original state
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [accumulatedContent, setAccumulatedContent] = useState('');
  const [waitingForFirstChunk, setWaitingForFirstChunk] = useState(false);
  const [showContractSelector, setShowContractSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep a record of all messages for the session
  const [allMessages, setAllMessages] = useState<Array<{ role: string, content: string }>>([]);

  // Configuration state
  const [config, setConfig] = useState<ChatConfig>({
    temperature,
    seed,
    streamResponse: streamResponses,
    suggestFollowUpQuestions,
    promptTemplate,
    searchConfig
  });

  // Update config when props change
  useEffect(() => {
    setConfig({
      temperature,
      seed,
      streamResponse: streamResponses,
      suggestFollowUpQuestions,
      promptTemplate,
      searchConfig
    });
  }, [temperature, seed, streamResponses, suggestFollowUpQuestions, promptTemplate, searchConfig]);

  // Imperative handle for parent-triggered submission and configuration
  useImperativeHandle(ref, () => ({
    submitMessage: (message: string) => {
      setInput(message);
      setTimeout(() => {
        const form = document.querySelector('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      }, 20);
    },
    updateConfig: (newConfig: ChatConfig) => {
      console.log("Chat component updating config:", newConfig);
      setConfig(prev => ({
        ...prev,
        ...newConfig
      }));
    }
  }));

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setAccumulatedContent('');
      setWaitingForFirstChunk(false);
    }
  }, [isLoading]);

  const filteredContracts = availableContracts.filter(contract =>
    contract.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectContract = (contractName: string) => {
    setSelectedContract(contractName);
    setShowContractSelector(false);
    const analyzeCommand = `Analyze the contract "${contractName}" for potential risks.`;
    setInput(analyzeCommand);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    setAccumulatedContent('');
    setWaitingForFirstChunk(true);

    if (onStreamingChange) onStreamingChange(true);
    if (onConversationStart) onConversationStart();

    // Add message to history
    const newUserMessage = { role: 'user', content: userMessage };
    setAllMessages(prev => [...prev, newUserMessage]);

    // Notify parent component
    onUserMessage(userMessage);

    try {
      const isContractAnalysis =
        (selectedContract &&
          userMessage
            .toLowerCase()
            .includes(`analyze the contract "${selectedContract.toLowerCase()}"`)) ||
        userMessage.toLowerCase().includes('analyze this contract') ||
        userMessage.toLowerCase().includes('analyze the contract');

      // Create a session ID
      const sessionId = localStorage.getItem('chat_session_id') ||
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);

      // Store session ID for future use
      localStorage.setItem('chat_session_id', sessionId);

      // Format messages in old UI format (last message only)
      const formattedMessages = [{
        role: 'user',
        content: userMessage
      }];

      // Prepare the request body with configuration options matching old UI format
      const requestBody = {
        messages: formattedMessages,
        context: {
          overrides: {
            prompt_template: config.promptTemplate,
            top: 3,
            temperature: config.temperature || 0,
            minimum_search_score: config.searchConfig?.minSearchScore || 0,
            minimum_reranker_score: config.searchConfig?.minRerankerScore || 0,
            retrieval_mode: config.searchConfig?.retrievalMode || "hybrid",
            semantic_ranker: config.searchConfig?.useSemanticRanker || true,
            semantic_captions: config.searchConfig?.useSemanticCaptions || false,
            query_rewriting: false,
            suggest_followup_questions: config.suggestFollowUpQuestions || false,
            use_oid_security_filter: false,
            use_groups_security_filter: false,
            vector_fields: ["embedding"],
            use_gpt4v: false,
            gpt4v_input: "textAndImages",
            language: "en"
          }
        },
        session_state: sessionId,

        // Contract analysis specific options
        ...(isContractAnalysis && selectedContract ? {
          contractAnalysis: true,
          contractName: selectedContract,
          analysisPrompt: getContractAnalysisPrompt()
        } : {})
      };

      console.log("Sending chat request with config:", {
        temperature: config.temperature,
        seed: config.seed,
        stream: config.streamResponse,
        suggestFollowUp: config.suggestFollowUpQuestions,
        hasPromptTemplate: !!config.promptTemplate,
        hasSearchConfig: !!config.searchConfig
      });

      // Choose endpoint based on stream configuration
      let endpoint, response;

      if (config.streamResponse) {
        // Use our new stream API route
        endpoint = '/api/chat-stream';
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        await handleStreamingResponse(response);
      } else {
        // Use the regular non-streaming endpoint
        endpoint = '/api/chat';
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        await handleNonStreamingResponse(response);
      }

      if (isContractAnalysis) {
        setSelectedContract(null);
      }
    } catch (error) {
      console.error('Error fetching response:', error);
      const errorMessage = "I'm sorry, I encountered an error processing your request.";

      // Add error message to history
      setAllMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);

      // Notify parent component
      onAssistantMessage(errorMessage);
    } finally {
      setIsLoading(false);
      if (onStreamingChange) onStreamingChange(false);
    }
  };

  // Advanced handler for streaming responses with complete context filtering
  const handleStreamingResponse = async (response: Response) => {
    if (!response.body) {
      throw new Error('No response body available');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let receivedFirstContentChunk = false;
    let isFullyGeneratedResponse = false;

    try {
      // Check if the first chunk is a complete response (non-streaming backend fallback)
      const initialChunks = [];
      let contentStarted = false;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        if (waitingForFirstChunk) {
          setWaitingForFirstChunk(false);
        }

        const text = decoder.decode(value, { stream: true });

        // Detect if we're receiving a fully generated response instead of a stream
        if (!contentStarted && text.includes('The key differences')) {
          isFullyGeneratedResponse = true;

          // Extract only the actual response content, skipping metadata
          const fullResponseMatch = text.match(/The key differences.*?(?=<\/document_content>|$)/s);
          if (fullResponseMatch) {
            fullContent = fullResponseMatch[0];
            setAccumulatedContent(fullContent);
            break;
          }
        }

        // Process as normal streaming response
        const lines = text.split('\n').filter(line => line.trim());

        for (const line of lines) {
          // Skip document context lines
          if (line.includes('<document') ||
            line.includes('</document') ||
            line.includes('<source>') ||
            line.includes('</source>') ||
            line.includes('<document_content>') ||
            line.includes('</document_content>') ||
            line.includes('<userStyle>') ||
            line.includes('</userStyle>') ||
            line.includes('<automated_reminder_from_anthropic>') ||
            line.includes('</automated_reminder_from_anthropic>') ||
            line.includes('<search_reminders>') ||
            line.includes('</search_reminders>')) {
            continue;
          }

          try {
            // Try to parse the line as JSON
            const data = JSON.parse(line);

            // Skip message that just sets up the assistant role
            if (data.delta && data.delta.role === 'assistant' && !data.delta.content) {
              continue;
            }

            // Skip any line with context data
            if (data.context || data.thoughts || data.search_results) {
              continue;
            }

            // Process actual content in delta format
            if (data.delta && data.delta.content) {
              receivedFirstContentChunk = true;
              fullContent += data.delta.content;
              setAccumulatedContent(fullContent);
              continue;
            }

            // Handle regular content format
            if (data.content && typeof data.content === 'string') {
              receivedFirstContentChunk = true;
              fullContent += data.content;
              setAccumulatedContent(fullContent);
              continue;
            }

          } catch (e) {
            // Not valid JSON, check if it's the start of content (after skipping metadata)
            if (!receivedFirstContentChunk && line.includes('The key differences')) {
              receivedFirstContentChunk = true;
              fullContent += line;
              setAccumulatedContent(fullContent);
            }
            // If we've already started collecting content, continue appending
            else if (receivedFirstContentChunk) {
              fullContent += line;
              setAccumulatedContent(fullContent);
            }
            // Otherwise, skip the line (likely metadata)
          }
        }

        // If we've already processed a complete response, break
        if (isFullyGeneratedResponse) {
          break;
        }
      }
    } catch (error) {
      console.error('Error processing stream:', error);
    }

    // Clean up any remaining document tags or metadata markers
    fullContent = fullContent.replace(/<\/?document.*?>/g, '')
      .replace(/<\/?source>/g, '')
      .replace(/<\/?document_content>/g, '')
      .replace(/<userStyle>.*?<\/userStyle>/g, '')
      .replace(/<automated_reminder_from_anthropic>.*?<\/automated_reminder_from_anthropic>/g, '')
      .replace(/<search_reminders>.*?<\/search_reminders>/g, '');

    // Add response to history
    setAllMessages(prev => [...prev, { role: 'assistant', content: fullContent }]);

    // Notify parent component
    onAssistantMessage(fullContent);
  };

  // Handler for non-streaming responses
  const handleNonStreamingResponse = async (response: Response) => {
    const data = await response.json();
    let content = '';

    if (data && data.content) {
      content = data.content;
    } else if (data && data.choices && data.choices.length > 0) {
      content = data.choices[0].message.content;
    } else {
      content = "Received a response but couldn't extract content.";
    }

    setAccumulatedContent(content);

    // Add response to history
    setAllMessages(prev => [...prev, { role: 'assistant', content }]);

    // Notify parent component
    onAssistantMessage(content);
  };

  return (
    <div className="w-full max-w-4xl mt-auto">
      {isLoading && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500 text-sm mb-2">
            {waitingForFirstChunk ? 'Thinking...' : 'Generating response...'}
          </p>
          <div className="text-gray-700">
            {accumulatedContent || (
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            )}
            {accumulatedContent && <span className="inline-block animate-pulse">▋</span>}
          </div>
        </div>
      )}

      {showContractSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-semibold mb-4">
              Select Contract to Analyze
            </h3>

            <div className="relative mb-4">
              <Search
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Search contracts..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            </div>

            <div className="overflow-y-auto flex-1 mb-4">
              {filteredContracts.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No contracts found
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredContracts.map((contract, index) => (
                    <button
                      key={index}
                      className="w-full text-left p-3 hover:bg-gray-100 rounded-md flex items-center gap-2 transition-colors"
                      onClick={() => selectContract(contract)}
                    >
                      <FileText size={16} className="text-indigo-600" />
                      <span className="truncate">{contract}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowContractSelector(false)}
                className="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedContract && (
        <div className="mb-4 flex items-center gap-2 text-sm bg-indigo-50 text-indigo-700 p-2 rounded-md">
          <FileText size={16} />
          <span>
            Ready to analyze: <strong>{selectedContract}</strong>
          </span>
          <button
            onClick={() => setSelectedContract(null)}
            className="ml-auto text-indigo-500 hover:text-indigo-700"
          >
            ×
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={
            selectedContract
              ? `Ask about ${selectedContract}...`
              : 'Type your message or select a contract to analyze...'
          }
          className="flex-1 h-12 px-4 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          disabled={isLoading || isDisabled}
        />

        {availableContracts.length > 0 && (
          <Button
            type="button"
            onClick={() => setShowContractSelector(true)}
            disabled={isLoading || isDisabled}
            className="h-12 px-4 rounded-md bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-700"
          >
            <FileText className="h-5 w-5 mr-2" />
            Contracts
          </Button>
        )}

        <Button
          type="submit"
          className="h-12 px-4 rounded-md bg-indigo-600 hover:bg-indigo-700 transition-colors text-white"
          disabled={isLoading || !input.trim() || isDisabled}
        >
          <Send className="h-5 w-5 mr-2" />
          Send
        </Button>
      </form>

      {/* Optional: Configuration Indicator */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs text-gray-400">
          {/* Show current configuration settings for debugging */}
          <span>T: {config.temperature?.toFixed(1)} | </span>
          {config.seed && <span>Seed: {config.seed} | </span>}
          <span>Stream: {config.streamResponse ? 'On' : 'Off'} | </span>
          <span>Follow-up: {config.suggestFollowUpQuestions ? 'On' : 'Off'}</span>
          {config.promptTemplate && <span> | Custom Prompt: Yes</span>}
        </div>
      )}
    </div>
  );
});