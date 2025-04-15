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

interface ChatProps {
  onUserMessage: (message: string) => void;
  onAssistantMessage: (message: string) => void;
  onConversationStart?: () => void;
  onStreamingChange?: (isStreaming: boolean) => void;
  isDisabled?: boolean;
  availableContracts?: string[];
}

export interface ImprovedChatHandle {
  submitMessage: (message: string) => void;
}

export const ImprovedChat = forwardRef<ImprovedChatHandle, ChatProps>(function ImprovedChat(
  {
    onUserMessage,
    onAssistantMessage,
    onConversationStart,
    onStreamingChange,
    isDisabled = false,
    availableContracts = []
  },
  ref
) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [accumulatedContent, setAccumulatedContent] = useState('');
  const [waitingForFirstChunk, setWaitingForFirstChunk] = useState(false);
  const [showContractSelector, setShowContractSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Imperative handle for parent-triggered submission
  useImperativeHandle(ref, () => ({
    submitMessage: (message: string) => {
      setInput(message);
      setTimeout(() => {
        const form = document.querySelector('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      }, 20);
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
    onUserMessage(userMessage);

    try {
      const isContractAnalysis =
        (selectedContract &&
          userMessage
            .toLowerCase()
            .includes(`analyze the contract "${selectedContract.toLowerCase()}"`)) ||
        userMessage.toLowerCase().includes('analyze this contract') ||
        userMessage.toLowerCase().includes('analyze the contract');

      const requestBody =
        isContractAnalysis && selectedContract
          ? {
              messages: [{ role: 'user', content: userMessage }],
              contractAnalysis: true,
              contractName: selectedContract,
              analysisPrompt: getContractAnalysisPrompt()
            }
          : {
              messages: [{ role: 'user', content: userMessage }]
            };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (waitingForFirstChunk) setWaitingForFirstChunk(false);

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed && typeof parsed.content === 'string') {
              fullContent += parsed.content;
              setAccumulatedContent(fullContent);
            }
          } catch (e) {
            if (line.startsWith('data: ')) {
              const content = line.slice(6);
              if (content !== '[DONE]') {
                try {
                  const parsedContent = JSON.parse(content);
                  if (
                    parsedContent.choices &&
                    parsedContent.choices.length > 0
                  ) {
                    const delta = parsedContent.choices[0].delta;
                    if (delta && delta.content) {
                      fullContent += delta.content;
                      setAccumulatedContent(fullContent);
                    }
                  }
                } catch {
                  fullContent += content;
                  setAccumulatedContent(fullContent);
                }
              }
            } else {
              fullContent += chunk;
              setAccumulatedContent(fullContent);
            }
          }
        }
      }

      onAssistantMessage(fullContent);

      if (isContractAnalysis) {
        setSelectedContract(null);
      }
    } catch (error) {
      console.error('Error fetching response:', error);
      onAssistantMessage(
        "I'm sorry, I encountered an error processing your request."
      );
    } finally {
      setIsLoading(false);
      if (onStreamingChange) onStreamingChange(false);
    }
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
    </div>
  );
});
