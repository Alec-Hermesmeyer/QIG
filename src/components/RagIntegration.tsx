// RagIntegration.tsx
import React, { useState, useEffect } from 'react';
import { EnhancedSupportingContent } from './SupportingContent';
import { ThoughtProcess } from './ThoughtProcess';
import { fetchFromBackend } from '@/services/backendApi';

interface RagResponse {
  success: boolean;
  response: string;
  searchResults?: {
    count: number;
    sources: Array<{
      id: string;
      fileName: string;
      score: number;
      sourceUrl?: string;
    }>;
  };
  error?: string;
  thoughts?: Array<{ title?: string; thought: string }> | string[];
}

interface RagIntegrationProps {
  bucketId: number | string;
  onResponse?: (response: string) => void;
  includeThoughts?: boolean;
  includeSupportingContent?: boolean;
}

export const RagIntegration: React.FC<RagIntegrationProps> = ({
  bucketId,
  onResponse,
  includeThoughts = true,
  includeSupportingContent = true,
}) => {
  const [query, setQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [ragResponse, setRagResponse] = useState<RagResponse | null>(null);
  const [supportingContent, setSupportingContent] = useState<any>(null);
  const [thoughts, setThoughts] = useState<Array<{ title?: string; thought: string }> | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Array<{ role: string; content: string }>>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Add searchTerms state to fix the error
  const [searchTerms, setSearchTerms] = useState<string[]>([]);

  // Function to extract search terms from query for highlighting
  const extractSearchTerms = (query: string): string[] => {
    if (!query) return [];
    
    // Remove common stop words and keep meaningful terms
    const stopWords = new Set(['the', 'and', 'a', 'an', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'from']);
    return query
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3 && !stopWords.has(word));
  };

  // Function to send query to RAG API
  const submitQuery = async () => {
    if (!query.trim() || !bucketId) return;

    setIsLoading(true);
    setErrorMessage(null);
    
    // Extract search terms for highlighting
    setSearchTerms(extractSearchTerms(query));

    try {
      // Add user message to conversation history
      const updatedHistory = [
        ...conversationHistory,
        { role: 'user', content: query }
      ];
      setConversationHistory(updatedHistory);

      // Call RAG API using fetchFromBackend
      const response = await fetchFromBackend('/api/groundx/rag', {
        method: 'POST',
        body: JSON.stringify({
          query: query,
          bucketId: bucketId,
          messages: updatedHistory,
          includeThoughts: includeThoughts
        })
      });

      const data: RagResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Unknown error occurred');
      }

      // Update state with response data
      setRagResponse(data);
      
      // Update conversation history with assistant response
      setConversationHistory([
        ...updatedHistory,
        { role: 'assistant', content: data.response }
      ]);

      // Format supporting content
      if (includeSupportingContent && data.searchResults) {
        const formattedContent = formatSupportingContent(data.searchResults);
        setSupportingContent(formattedContent);
      }

      // Format thoughts if available
      if (includeThoughts && data.thoughts) {
        setThoughts(formatThoughts(data.thoughts));
      }

      // Callback with response
      if (onResponse) {
        onResponse(data.response);
      }
    } catch (error) {
      console.error('Error querying RAG API:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to get response');
    } finally {
      setIsLoading(false);
      setQuery(''); // Clear input after submission
    }
  };

  // Format search results into supporting content format
  const formatSupportingContent = (searchResults: RagResponse['searchResults']) => {
    if (!searchResults || searchResults.count === 0) {
      return null;
    }

    // Format for the EnhancedSupportingContent component
    return {
      text: searchResults.sources.map(source => {
        const scoreInfo = source.score !== undefined 
          ? ` (Relevance: ${(source.score * 100).toFixed(1)}%)`
          : '';
        const sourceInfo = source.sourceUrl 
          ? ` [Source: ${source.sourceUrl}]`
          : '';
        return `${source.fileName}${scoreInfo}${sourceInfo}: Content from document ID ${source.id}`;
      })
    };
  };

  // Format thoughts into the expected format
  const formatThoughts = (thoughtsData: Array<{ title?: string; thought: string }> | string[]) => {
    if (Array.isArray(thoughtsData)) {
      if (typeof thoughtsData[0] === 'string') {
        // Convert string array to object array
        return (thoughtsData as string[]).map(thought => ({
          thought
        }));
      }
      return thoughtsData as Array<{ title?: string; thought: string }>;
    }
    return null;
  };

  // Handle file click in supporting content
  const handleFileClick = (filename: string) => {
    console.log(`File clicked: ${filename}`);
    // Implement your file viewing logic here
  };

  // Handle citation click in supporting content
  const handleCitationClick = (citation: {
    text: string;
    page?: string;
    section?: string;
    documentTitle?: string;
  }) => {
    console.log('Citation clicked:', citation);
    // Implement your citation navigation logic here
  };

  return (
    <div className="rag-integration">
      <div className="mb-6">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label htmlFor="rag-query" className="block text-sm font-medium text-gray-700 mb-1">
              Ask about your documents
            </label>
            <input
              id="rag-query"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter your question..."
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  submitQuery();
                }
              }}
            />
          </div>
          <button
            onClick={submitQuery}
            disabled={isLoading || !query.trim()}
            className={`px-4 py-2 rounded-md ${
              isLoading || !query.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
        
        {errorMessage && (
          <div className="mt-2 p-2 bg-red-50 text-red-700 rounded border border-red-200">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Display the RAG response */}
      {ragResponse && ragResponse.response && (
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Answer</h3>
          <div className="text-gray-700 whitespace-pre-wrap">
            {ragResponse.response}
          </div>
        </div>
      )}

      {/* Display thought process if available */}
      {includeThoughts && thoughts && thoughts.length > 0 && (
        <div className="mb-6">
          <ThoughtProcess thoughts={thoughts} highlightTerms={searchTerms} />
        </div>
      )}

      {/* Display supporting content if available */}
      {includeSupportingContent && supportingContent && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Supporting Documents</h3>
          <EnhancedSupportingContent
            supportingContent={supportingContent}
            highlightTerms={searchTerms}
            onFileClick={handleFileClick}
            onCitationClick={handleCitationClick}
            useAutoHighlighting={true}
          />
        </div>
      )}

      {/* Conversation history display (optional) */}
      {conversationHistory.length > 1 && (
        <div className="mt-8 border-t pt-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Conversation History</h3>
          <div className="space-y-4">
            {conversationHistory.map((msg, index) => (
              <div 
                key={index} 
                className={`p-3 rounded-lg ${
                  msg.role === 'user' 
                    ? 'bg-blue-50 border border-blue-100 ml-8' 
                    : 'bg-gray-50 border border-gray-200 mr-8'
                }`}
              >
                <div className="text-xs font-semibold text-gray-500 mb-1">
                  {msg.role === 'user' ? 'You' : 'Assistant'}
                </div>
                <div className="text-gray-700">{msg.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};