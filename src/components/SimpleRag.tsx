'use client';

import React, { useState, useCallback, useEffect, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Database, Brain, FileText, Sparkles } from "lucide-react";
import { ThoughtProcess } from "./ThoughtProcess";
import { EnhancedSupportingContent } from "./SupportingContent";

// Basic types for the component
interface SimpleRAGProps {
  answer: any;
  index?: number;
  isSelected?: boolean;
  isStreaming?: boolean;
  theme?: 'light' | 'dark';
  onThoughtProcessClicked?: () => void;
  onSupportingContentClicked?: () => void;
  onFileClick?: (filename: string) => void;
  onCitationClick?: (citation: any) => void;
}

// Helper function to safely get string content
const getAnswerContent = (answer: any): string => {
  if (!answer) {
    console.log("No answer object provided");
    return '';
  }
  
  // Handle string content directly
  if (typeof answer === 'string') return answer;
  
  // Handle direct content properties
  if (typeof answer.content === 'string') return answer.content;
  if (typeof answer.answer === 'string') return answer.answer;
  if (typeof answer.response === 'string') return answer.response;
  
  // Handle nested object structures
  if (answer.content && typeof answer.content === 'object') {
    if (typeof answer.content.content === 'string') return answer.content.content;
    if (typeof answer.content.answer === 'string') return answer.content.answer;
    if (typeof answer.content.response === 'string') return answer.content.response;
  }
  
  if (answer.answer && typeof answer.answer === 'object') {
    if (typeof answer.answer.content === 'string') return answer.answer.content;
    if (typeof answer.answer.answer === 'string') return answer.answer.answer;
    if (typeof answer.answer.response === 'string') return answer.answer.response;
  }
  
  if (answer.response && typeof answer.response === 'object') {
    if (typeof answer.response.content === 'string') return answer.response.content;
    if (typeof answer.response.answer === 'string') return answer.response.answer;
    if (typeof answer.response.response === 'string') return answer.response.response;
  }
  
  // If we have any content, try to stringify it
  if (answer.content) return String(answer.content);
  if (answer.answer) return String(answer.answer);
  if (answer.response) return String(answer.response);
  
  // If we have a result object, try to extract content from it
  if (answer.result) {
    if (typeof answer.result === 'string') return answer.result;
    if (answer.result.content) return String(answer.result.content);
    if (answer.result.answer) return String(answer.result.answer);
    if (answer.result.response) return String(answer.result.response);
  }
  
  console.log("No valid content found in answer object");
  return '';
};

// Extract thought process from various parts of the answer
const getThoughtProcess = (answer: any): any => {
  if (!answer) return null;
  
  // Check all possible locations for thought process data
  if (answer.thoughts) return answer.thoughts;
  if (answer.thoughtProcess) return answer.thoughtProcess;
  if (answer.thinking) return answer.thinking;
  if (answer.thought_process) return answer.thought_process;
  if (answer.reasoning) return [answer.reasoning];
  if (answer.result?.thoughts) return answer.result.thoughts;
  if (answer.metadata?.reasoning) return [answer.metadata.reasoning];
  
  return null;
};

// Extract supporting content from various parts of the answer
const getSupportingContent = (answer: any): any => {
  if (!answer) return null;
  
  // Check all possible locations for supporting content
  if (answer.supporting_content) return answer.supporting_content;
  if (answer.supportingContent) return answer.supportingContent;
  if (answer.sources) return answer.sources;
  if (answer.documents) return answer.documents;
  if (answer.searchResults?.sources) return answer.searchResults.sources;
  if (answer.groundXDocuments) return answer.groundXDocuments;
  
  return null;
};

export default function SimpleRAG({
  answer,
  index = 0,
  isSelected = false,
  isStreaming = false,
  theme = 'light',
  onThoughtProcessClicked = () => {},
  onSupportingContentClicked = () => {},
  onFileClick,
  onCitationClick
}: SimpleRAGProps) {
  // State
  const [expanded, setExpanded] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState('answer');

  // Theme styling
  const themeStyles = {
    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
    textColor: theme === 'dark' ? '#e5e5e5' : '#1a1a1a',
    primaryColor: theme === 'dark' ? '#3a7af3' : '#2563eb',
    secondaryColor: theme === 'dark' ? '#2c66d9' : '#1d4ed8',
    cardBackground: theme === 'dark' ? '#2a2a2a' : '#ffffff',
    borderColor: theme === 'dark' ? '#404040' : '#e5e5e5',
  };

  // Process the answer to extract content and supporting info
  const content = useMemo(() => getAnswerContent(answer), [answer]);
  const thoughtProcess = useMemo(() => getThoughtProcess(answer), [answer]);
  const supportingContent = useMemo(() => getSupportingContent(answer), [answer]);
  
  // Determine if we have thought process or supporting content to show tabs
  const hasThoughtProcess = Boolean(thoughtProcess);
  const hasSupportingContent = Boolean(supportingContent);

  // Extract highlighted terms to pass to components
  const extractHighlightTerms = (): string[] => {
    // Try to extract key terms from the content
    const content = getAnswerContent(answer);
    if (!content) return [];
    
    // Simple extraction of potential key terms (words with initial capital)
    const matches = content.match(/\b[A-Z][a-z]{2,}\b/g) || [];
    return Array.from(new Set(matches)).slice(0, 10);
  };

  const highlightTerms = useMemo(() => extractHighlightTerms(), [answer]);

  // Handle citation click
  const handleCitationClick = useCallback((citation: any) => {
    if (onCitationClick) {
      onCitationClick(citation);
    }
  }, [onCitationClick]);

  // Handle file click
  const handleFileClick = useCallback((filename: string) => {
    if (onFileClick) {
      onFileClick(filename);
    }
  }, [onFileClick]);

  // Debug logging for the component
  useEffect(() => {
    console.log('=== SimpleRAG Debug Info ===');
    console.log('Raw answer:', answer);
    console.log('Extracted content:', content);
    console.log('Thought process:', thoughtProcess);
    console.log('Supporting content:', supportingContent);
    console.log('Highlight terms:', highlightTerms);
    console.log('=== End Debug Info ===');
  }, [answer, content, thoughtProcess, supportingContent, highlightTerms]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg shadow-sm border ${isSelected ? 'border-indigo-500' : 'border-transparent'}`}
      style={{
        backgroundColor: themeStyles.cardBackground,
        color: themeStyles.textColor
      }}
    >
      {/* Header with tab buttons */}
      <div 
        className="flex justify-between items-center p-4 border-b" 
        style={{ borderColor: themeStyles.borderColor }}
      >
        <div className="flex items-center gap-2">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('answer')}
              className={`px-3 py-1 rounded text-sm ${activeTab === 'answer' ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'}`}
            >
              <span className="flex items-center">
                <FileText size={14} className="mr-1" />
                Answer
              </span>
            </button>
            
            {hasThoughtProcess && (
              <button
                onClick={() => {
                  setActiveTab('thoughts');
                  onThoughtProcessClicked();
                }}
                className={`px-3 py-1 rounded text-sm ${activeTab === 'thoughts' ? 'bg-purple-100 text-purple-800' : 'hover:bg-gray-100'}`}
              >
                <span className="flex items-center">
                  <Brain size={14} className="mr-1" />
                  Thoughts
                </span>
              </button>
            )}
            
            {hasSupportingContent && (
              <button
                onClick={() => {
                  setActiveTab('sources');
                  onSupportingContentClicked();
                }}
                className={`px-3 py-1 rounded text-sm ${activeTab === 'sources' ? 'bg-green-100 text-green-800' : 'hover:bg-gray-100'}`}
              >
                <span className="flex items-center">
                  <Database size={14} className="mr-1" />
                  Sources
                </span>
              </button>
            )}
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded hover:bg-gray-100"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Content */}
      {expanded && (
        <div>
          {/* Answer content */}
          {activeTab === 'answer' && (
            <div className="p-4">
              <div className="prose max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Thought process */}
          {activeTab === 'thoughts' && thoughtProcess && (
            <div className="p-4">
              <ThoughtProcess 
                thoughts={thoughtProcess} 
                highlightTerms={highlightTerms}
                collapsible={false}
              />
            </div>
          )}

          {/* Supporting content */}
          {activeTab === 'sources' && supportingContent && (
            <div className="p-4">
              <EnhancedSupportingContent
                supportingContent={supportingContent}
                onFileClick={handleFileClick}
                onCitationClick={handleCitationClick}
                highlightTerms={highlightTerms}
                useAutoHighlighting={true}
                groundXDocuments={answer.groundXDocuments}
                rawResponse={answer.rawResponse}
              />
            </div>
          )}

          {/* Loading state */}
          {isStreaming && (
            <div className="px-4 pb-4">
              <div className="text-sm flex items-center text-blue-600">
                <Sparkles size={16} className="mr-2 animate-pulse" />
                Loading response...
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
} 