'use client';

import React, { useState, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, Database, Zap, Brain, FileText } from "lucide-react";
import DocumentDetail from "./DocumentDetail";
import XRayAnalysis from "./XRayAnalysis";
import { Source, XRayChunk } from "@/types/types";

// Basic types
interface SearchResults {
  count: number;
  sources: Source[];
}

interface Answer {
  content: string | { content?: string; answer?: string; response?: string };
  answer?: string | { content?: string; answer?: string; response?: string };
  response?: string | { content?: string; answer?: string; response?: string };
  followupQuestions?: string[];
  suggestedQuestions?: string[];
  searchResults?: SearchResults;
  thoughts?: string;
  reasoning?: string;
  thoughtProcess?: string;
  thinking?: string;
  thought_process?: string;
  result?: {
    thoughts?: string;
    xray?: string;
    content?: string;
    answer?: string;
    response?: string;
  };
  metadata?: {
    reasoning?: string;
  };
  documents?: Source[];
  sources?: Source[];
  xray?: {
    sources?: Record<string, any>;
  };
  enhancedResults?: {
    sources?: Source[];
  };
  systemMessage?: string;
  supporting_content?: any[];
  supportingContent?: any[];
}

interface DeepRAGProps {
  answer: Answer;
  index?: number;
  isSelected?: boolean;
  isStreaming?: boolean;
  theme?: 'light' | 'dark';
  onThoughtProcessClicked?: () => void;
  onSupportingContentClicked?: () => void;
}

// Helper function to ensure string IDs
const ensureStringId = (id: string | number | undefined): string => {
  if (id === undefined) return '';
  return typeof id === 'string' ? id : id.toString();
};

// Helper function to safely get string content
const getAnswerContent = (answer: Answer): string => {
  if (!answer) {
    console.log("No answer object provided");
    return '';
  }
  
  console.log("Raw answer object:", answer);
  
  // Handle if answer itself is a string
  if (typeof answer === 'string') return answer;
  
  // Check if content is a JSON string that needs parsing
  if (typeof answer.content === 'string') {
    const content = answer.content.trim();
    
    // Check if content looks like a JSON object
    if ((content.startsWith('{') && content.endsWith('}')) || 
        (content.startsWith('[') && content.endsWith(']'))) {
      try {
        const parsedContent = JSON.parse(content);
        console.log("Successfully parsed JSON content:", parsedContent);
        
        // For policy analysis, format it in a readable way
        if (parsedContent["Policy Period"] || parsedContent["Coverage Agreements"]) {
          return Object.entries(parsedContent)
            .map(([key, value]) => {
              if (typeof value === 'object' && value !== null) {
                return `## ${key}\n${formatObjectToMarkdown(value, 1)}`;
              }
              return `## ${key}\n${value}`;
            })
            .join('\n\n');
        }
        
        return formatJsonToReadableText(parsedContent);
      } catch (e) {
        console.error("Failed to parse JSON:", e);
        // If we can't parse it, just return the original content
        return content;
      }
    }
    
    return content;
  }
  
  // Handle direct content properties
  if (answer.answer && typeof answer.answer === 'string') return answer.answer;
  if (answer.response && typeof answer.response === 'string') return answer.response;
  
  // Handle nested object structures with improved path detection
  if (answer.content && typeof answer.content === 'object') {
    // Check for content field in content object
    if (typeof answer.content.content === 'string') return answer.content.content;
    if (typeof answer.content.answer === 'string') return answer.content.answer; 
    if (typeof answer.content.response === 'string') return answer.content.response;
    
    // If we have a content object with no string fields, just stringify it
    try {
      return JSON.stringify(answer.content, null, 2);
    } catch (e) {
      console.error("Failed to stringify content object:", e);
    }
  }
  
  // Check result property which might contain the answer
  if (answer.result) {
    if (typeof answer.result === 'string') return answer.result;
    if (answer.result.content && typeof answer.result.content === 'string') return answer.result.content;
    if (answer.result.answer && typeof answer.result.answer === 'string') return answer.result.answer;
    if (answer.result.response && typeof answer.result.response === 'string') return answer.result.response;
  }
  
  // If we have any content, try to stringify it
  if (answer.content) {
    console.log("Converting content to string:", answer.content);
    // Handle complex nested objects with more resilience
    if (typeof answer.content === 'object') {
      try {
        // Look for any string properties that might contain the answer
        const contentObj = answer.content as Record<string, any>;
        for (const key in contentObj) {
          if (typeof contentObj[key] === 'string' && contentObj[key].length > 20) {
            return contentObj[key];
          }
        }
        return JSON.stringify(answer.content, null, 2);
      } catch (e) {
        return String(answer.content);
      }
    }
    return String(answer.content);
  }
  
  // Try to extract from system message if available
  if (answer.systemMessage && typeof answer.systemMessage === 'string') {
    return answer.systemMessage;
  }
  
  console.log("No valid content found in answer object");
  return 'No content was found in the response. Please try your query again.';
};

// Helper function to format objects with nested structure into Markdown
const formatObjectToMarkdown = (obj: any, level: number): string => {
  if (!obj || typeof obj !== 'object') return String(obj || '');
  
  const indent = '  '.repeat(level);
  let result = '';
  
  for (const [key, value] of Object.entries(obj)) {
    if (Array.isArray(value)) {
      result += `${indent}- **${key}**:\n`;
      value.forEach(item => {
        if (typeof item === 'object') {
          result += `${indent}  - ${formatObjectToMarkdown(item, level + 2)}\n`;
        } else {
          result += `${indent}  - ${item}\n`;
        }
      });
    } else if (typeof value === 'object' && value !== null) {
      result += `${indent}- **${key}**:\n${formatObjectToMarkdown(value, level + 1)}\n`;
    } else {
      result += `${indent}- **${key}**: ${value}\n`;
    }
  }
  
  return result;
};

// Function to format JSON into readable text
const formatJsonToReadableText = (jsonData: any): string => {
  if (!jsonData) return '';
  
  // If it's a string, return it directly
  if (typeof jsonData === 'string') return jsonData;
  
  // If it's already an array of strings, join them
  if (Array.isArray(jsonData) && jsonData.every(item => typeof item === 'string')) {
    return jsonData.join('\n');
  }
  
  let formattedText = '';
  
  // Format Policy Details section
  if (jsonData.Policy_Details || jsonData["Policy Details"]) {
    const policyDetails = jsonData.Policy_Details || jsonData["Policy Details"];
    formattedText += '# Insurance Policy Summary\n\n';
    formattedText += '## Policy Details\n';
    for (const [key, value] of Object.entries(policyDetails)) {
      formattedText += `**${key.replace(/_/g, ' ')}**: ${value}\n`;
    }
    formattedText += '\n';
  }
  
  // Format Coverage section
  if (jsonData.Coverage) {
    formattedText += '## Coverage\n';
    for (const [coverageType, details] of Object.entries(jsonData.Coverage)) {
      formattedText += `### ${coverageType.replace(/_/g, ' ')}\n`;
      if (typeof details === 'object') {
        for (const [key, value] of Object.entries(details as Record<string, any>)) {
          if (typeof value === 'object') {
            formattedText += `**${key.replace(/_/g, ' ')}**:\n`;
            for (const [subKey, subValue] of Object.entries(value as Record<string, any>)) {
              formattedText += `  - ${subKey.replace(/_/g, ' ')}: ${subValue}\n`;
            }
          } else {
            formattedText += `- ${key.replace(/_/g, ' ')}: ${value}\n`;
          }
        }
      }
    }
  }
  
  // Format a generic object if none of the specific sections are present
  if (!formattedText) {
    // Basic generic formatting
    formattedText = '# Analysis Results\n\n';
    
    for (const [key, value] of Object.entries(jsonData)) {
      const formattedKey = key.replace(/_/g, ' ');
      
      if (typeof value === 'object' && value !== null) {
        formattedText += `## ${formattedKey}\n`;
        
        if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (typeof item === 'object') {
              formattedText += `### Item ${index + 1}\n`;
              for (const [subKey, subValue] of Object.entries(item)) {
                formattedText += `- **${subKey.replace(/_/g, ' ')}**: ${subValue}\n`;
              }
            } else {
              formattedText += `- ${item}\n`;
            }
          });
        } else {
          for (const [subKey, subValue] of Object.entries(value as Record<string, any>)) {
            if (typeof subValue === 'object' && subValue !== null) {
              formattedText += `### ${subKey.replace(/_/g, ' ')}\n`;
              if (Array.isArray(subValue)) {
                subValue.forEach((item) => {
                  formattedText += `- ${item}\n`;
                });
              } else {
                for (const [subSubKey, subSubValue] of Object.entries(subValue as Record<string, any>)) {
                  formattedText += `- **${subSubKey.replace(/_/g, ' ')}**: ${subSubValue}\n`;
                }
              }
            } else {
              formattedText += `- **${subKey.replace(/_/g, ' ')}**: ${subValue}\n`;
            }
          }
        }
        
        formattedText += '\n';
      } else {
        formattedText += `## ${formattedKey}\n${value}\n\n`;
      }
    }
  }
  
  return formattedText;
};

// Extract thought process from answer
const extractThoughtProcess = (answer: Answer): string => {
  if (!answer) return '';
  
  // Look for thought process in different possible properties
  if (typeof answer.thoughts === 'string') return answer.thoughts;
  if (typeof answer.reasoning === 'string') return answer.reasoning;
  if (typeof answer.thoughtProcess === 'string') return answer.thoughtProcess;
  if (typeof answer.thinking === 'string') return answer.thinking;
  if (typeof answer.thought_process === 'string') return answer.thought_process;
  
  // Check result object
  if (answer.result && typeof answer.result === 'object' && typeof answer.result.thoughts === 'string') {
    return answer.result.thoughts;
  }
  
  // Check metadata object
  if (answer.metadata && typeof answer.metadata === 'object' && typeof answer.metadata.reasoning === 'string') {
    return answer.metadata.reasoning;
  }
  
  return '';
};

// Extract supporting content from answer
const extractSupportingContent = (answer: Answer): Array<{ title: string; content: string; source: string; score?: number; sourceUrl?: string }> => {
  if (!answer) return [];
  
  const supportingContent: Array<{ title: string; content: string; source: string; score?: number; sourceUrl?: string }> = [];
  
  // Look for supporting content in different possible properties
  if (Array.isArray(answer.supporting_content)) {
    answer.supporting_content.forEach((item: any) => {
      if (typeof item === 'object') {
        supportingContent.push({
          title: item.title || 'Supporting Content',
          content: item.content || item.text || '',
          source: item.source || 'Unknown',
          score: item.score,
          sourceUrl: item.sourceUrl || item.url
        });
      }
    });
  }
  
  if (Array.isArray(answer.supportingContent)) {
    answer.supportingContent.forEach((item: any) => {
      if (typeof item === 'object') {
        supportingContent.push({
          title: item.title || 'Supporting Content',
          content: item.content || item.text || '',
          source: item.source || 'Unknown',
          score: item.score,
          sourceUrl: item.sourceUrl || item.url
        });
      }
    });
  }
  
  return supportingContent;
};

// Normalize source object to ensure consistent properties
const normalizeSource = (source: any): Source => {
  if (!source) return {} as Source;
  
  // Ensure we have a proper Source object with required fields
  return {
    id: source.id || source.documentId || `source_${Math.random().toString(36).substring(2, 9)}`,
    title: source.title || source.fileName || source.name || 'Unnamed Document',
    fileName: source.fileName || source.title || source.name || 'document.pdf',
    score: typeof source.score === 'number' ? source.score : 
           typeof source.relevanceScore === 'number' ? source.relevanceScore : 
           typeof source.confidenceScore === 'number' ? source.confidenceScore : 
           undefined,
    // Ensure excerpts is always an array
    excerpts: Array.isArray(source.excerpts) ? source.excerpts : 
              Array.isArray(source.snippets) ? source.snippets :
              typeof source.content === 'string' ? [source.content] :
              typeof source.text === 'string' ? [source.text] :
              [],
    // Handle URLs
    url: source.url || source.sourceUrl || undefined,
    sourceUrl: source.sourceUrl || source.url || undefined,
    // Handle metadata
    metadata: source.metadata || {},
    // Handle X-ray data
    xray: source.xray || null,
    hasXray: !!source.hasXray,
    // Handle images
    pageImages: Array.isArray(source.pageImages) ? source.pageImages : [],
    thumbnails: Array.isArray(source.thumbnails) ? source.thumbnails : [],
    // Add additional fields that DocumentDetail might need
    text: source.text || source.content || '',
    content: source.content || source.text || '',
    name: source.name || source.title || source.fileName || '',
    type: source.type || (source.fileName ? getDocumentTypeFromFileName(source.fileName) : 'unknown'),
    page: source.page || undefined,
  };
};

// Helper function to extract document type from filename
const getDocumentTypeFromFileName = (fileName: string): string => {
  if (!fileName) return 'unknown';
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  
  switch (extension) {
    case 'pdf': return 'pdf';
    case 'doc': case 'docx': return 'word';
    case 'xls': case 'xlsx': case 'csv': return 'spreadsheet';
    case 'txt': return 'text';
    case 'json': case 'js': case 'ts': case 'py': case 'java': case 'cpp': return 'code';
    case 'jpg': case 'jpeg': case 'png': case 'gif': case 'bmp': return 'image';
    case 'html': case 'htm': return 'web';
    default: return 'unknown';
  }
};

// Format score for display
const formatScoreDisplay = (score: number): string => {
  if (score === undefined) return 'N/A';
  return score.toFixed(2);
};

// Process sources and X-ray data from answer
const processSourcesAndXray = (answerObj: Answer): { sources: Source[], hasXray: boolean } => {
  let sourceArray: any[] = [];
  let hasXray = false;
  
  // Generate a unique ID for each source based on various properties
  const ensureUniqueId = (source: Partial<Source>, index: number): string => {
    if (source.id) return ensureStringId(source.id);
    
    // Try to create an ID from filename or title
    if (source.fileName) return `src_${source.fileName.replace(/\W+/g, '_').substring(0, 20)}_${index}`;
    if (source.title) return `src_${source.title.replace(/\W+/g, '_').substring(0, 20)}_${index}`;
    
    // Fallback to using the index
    return `source_${index}`;
  };
  
  if (!answerObj) return { sources: [], hasXray: false };
  
  // Try to find sources in various properties of the answer object with improved extraction
  if (Array.isArray(answerObj.sources)) {
    sourceArray = answerObj.sources;
  } else if (answerObj.content && typeof answerObj.content === 'object' && Array.isArray((answerObj.content as any).sources)) {
    sourceArray = (answerObj.content as any).sources;
  } else if (answerObj.searchResults && Array.isArray(answerObj.searchResults.sources)) {
    sourceArray = answerObj.searchResults.sources;
  } else if (answerObj.content && 
            typeof answerObj.content === 'object' && 
            (answerObj.content as any).searchResults && 
            Array.isArray((answerObj.content as any).searchResults.sources)) {
    sourceArray = (answerObj.content as any).searchResults.sources;
  } else if (Array.isArray(answerObj.documents)) {
    sourceArray = answerObj.documents;
  } else if (answerObj.content && 
            typeof answerObj.content === 'object' && 
            Array.isArray((answerObj.content as any).documents)) {
    sourceArray = (answerObj.content as any).documents;
  } else if (answerObj.enhancedResults && Array.isArray(answerObj.enhancedResults.sources)) {
    sourceArray = answerObj.enhancedResults.sources;
  } else if (answerObj.content && 
            typeof answerObj.content === 'object' && 
            (answerObj.content as any).enhancedResults && 
            Array.isArray((answerObj.content as any).enhancedResults.sources)) {
    sourceArray = (answerObj.content as any).enhancedResults.sources;
  }
  
  // Log the source array for debugging
  console.log('Source array found:', sourceArray);
  
  // If still no sources found, check for supportingContent
  if (!sourceArray.length && answerObj.supportingContent && Array.isArray(answerObj.supportingContent)) {
    sourceArray = answerObj.supportingContent;
  }
  
  // If still no sources found, check for supportingContent in content
  if (!sourceArray.length && 
      answerObj.content && 
      typeof answerObj.content === 'object' && 
      (answerObj.content as any).supportingContent && 
      Array.isArray((answerObj.content as any).supportingContent)) {
    sourceArray = (answerObj.content as any).supportingContent;
  }
  
  // Check if we have X-ray data in any of the sources
  hasXray = sourceArray.some((source: any) => {
    return (source.hasXray || source.xray);
  });
  
  console.log('Has X-ray data:', hasXray);
  
  // Process and normalize each source
  const processedSources = sourceArray.map((source: any, index: number) => {
    // Normalize the source
    const normalizedSource = normalizeSource(source);
    
    // Ensure it has a unique ID
    normalizedSource.id = ensureUniqueId(normalizedSource, index);
    
    return normalizedSource;
  });
  
  return {
    sources: processedSources,
    hasXray: hasXray
  };
};

export default function DeepRAG({
  answer,
  index = 0,
  isSelected = false,
  isStreaming = false,
  theme = 'light',
  onThoughtProcessClicked = () => {},
  onSupportingContentClicked = () => {}
}: DeepRAGProps) {
  // Basic state
  const [expanded, setExpanded] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState('answer');
  const [xrayLoading, setXrayLoading] = useState<{[key: string]: boolean}>({});
  const [refreshId, setRefreshId] = useState<number>(0);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [activeXrayChunk, setActiveXrayChunk] = useState<XRayChunk | null>(null);
  const [xrayViewMode, setXrayViewMode] = useState<'summary' | 'detail'>('summary');
  const [xrayContentFilter, setXrayContentFilter] = useState<string | null>(null);
  
  // Ref to track sources we've already processed
  const processedSourcesRef = React.useRef<Set<string>>(new Set());

  // Theme styling
  const themeStyles = {
    backgroundColor: theme === 'dark' ? '#1a1a1a' : '#ffffff',
    textColor: theme === 'dark' ? '#e5e5e5' : '#1a1a1a',
    primaryColor: theme === 'dark' ? '#3a7af3' : '#2563eb',
    secondaryColor: theme === 'dark' ? '#2c66d9' : '#1d4ed8',
    cardBackground: theme === 'dark' ? '#2a2a2a' : '#ffffff',
    borderColor: theme === 'dark' ? '#404040' : '#e5e5e5',
    xrayColor: theme === 'dark' ? '#ffd700' : '#000000',
  };

  // Fetch X-ray data for a source if needed
  const fetchXrayData = async (sourceId: string) => {
    if (!sourceId) return;
    
    // Prevent duplicate fetches
    if (xrayLoading[sourceId]) {
      console.log(`Already fetching X-ray data for source: ${sourceId}`);
      return;
    }
    
    setXrayLoading(prev => ({ ...prev, [sourceId]: true }));
    
    try {
      console.log(`Fetching X-ray data for source: ${sourceId}`);
      
      // Use the existing groundx/xray API endpoint
      const response = await fetch(`/api/groundx/xray?documentId=${sourceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`Error fetching X-ray data: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        console.log(`Successfully fetched X-ray data for source: ${sourceId}`, data);
        
        // Update the sources array without triggering another fetch
        const updatedSources = [...sources]; // Create a shallow copy
        const sourceIndex = updatedSources.findIndex(source => ensureStringId(source.id) === sourceId);
        
        if (sourceIndex !== -1) {
          // Update the specific source with its xray data
          updatedSources[sourceIndex] = {
            ...updatedSources[sourceIndex],
            xray: data,
            hasXray: true
          };
        }
        
        // Force a re-render by incrementing refreshId
        setRefreshId(prev => prev + 1);
      } else {
        console.warn(`No X-ray data found for source: ${sourceId} - ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`Error fetching X-ray data for source ${sourceId}:`, error);
    } finally {
      setXrayLoading(prev => ({ ...prev, [sourceId]: false }));
    }
  };
  
  // Process sources and X-ray data
  const { sources, hasXray } = React.useMemo(() => {
    console.log('Processing sources and X-ray data (memoized):', answer);
    return processSourcesAndXray(answer);
  }, [answer, refreshId]);

  // Process all X-ray chunks across all sources
  const allXrayChunks = React.useMemo(() => {
    const chunks: { chunk: XRayChunk, sourceId: string, source: Source }[] = [];
    
    sources.forEach(source => {
      if (source.xray && source.xray.chunks) {
        source.xray.chunks.forEach(chunk => {
          chunks.push({
            chunk,
            sourceId: ensureStringId(source.id),
            source
          });
        });
      }
    });
    
    return chunks;
  }, [sources]);

  // Extract answer content and supporting data
  const content = React.useMemo(() => getAnswerContent(answer), [answer]);
  const thoughtProcess = React.useMemo(() => extractThoughtProcess(answer), [answer]);
  const supportingContent = React.useMemo(() => extractSupportingContent(answer), [answer]);
  
  const hasThoughtProcess = Boolean(thoughtProcess);
  const hasSupportingContent = supportingContent.length > 0 || sources.length > 0;

  // Try to fetch X-ray data for sources that have hasXray but no xray data
  useEffect(() => {
    // Create a ref to track which sources we're already fetching data for
    const sourcesToFetch = sources.filter(source => {
      const sourceId = ensureStringId(source.id);
      // Only fetch if:
      // 1. The source has X-ray data available (hasXray is true)
      // 2. The X-ray data hasn't been loaded yet (source.xray is null)
      // 3. We're not already loading it (xrayLoading[sourceId] is not true)
      // 4. The source has a valid ID
      // 5. We haven't processed this source before
      return source.hasXray && 
             !source.xray && 
             !xrayLoading[sourceId] && 
             sourceId && 
             !processedSourcesRef.current.has(sourceId);
    });

    // Only fetch if we have sources that meet our criteria
    if (sourcesToFetch.length > 0) {
      console.log(`Found ${sourcesToFetch.length} sources with X-ray data to fetch`);
      // Only fetch one at a time to avoid multiple simultaneous requests
      const sourceToFetch = sourcesToFetch[0];
      const sourceId = ensureStringId(sourceToFetch.id);
      
      // Mark this source as processed to prevent future fetches
      processedSourcesRef.current.add(sourceId);
      
      fetchXrayData(sourceId);
    }
  }, [sources]); // Only depend on sources, not xrayLoading

  // Log debug info when answer changes
  useEffect(() => {
    console.log("=== DeepRAG Debug Info ===");
    console.log("Raw answer object:", answer);
    console.log("Answer type:", typeof answer);
    console.log("Extracted content:", content);
    console.log("Thought process:", thoughtProcess);
    console.log("Processed sources:", sources);
    console.log("Supporting content:", supportingContent);
    console.log("Has X-ray:", hasXray);
    console.log("X-ray chunks:", allXrayChunks);
    console.log("=== End Debug Info ===");
  }, [answer, sources, allXrayChunks]);

  // Initialize selected source if needed
  useEffect(() => {
    if (sources.length > 0 && !selectedSourceId) {
      setSelectedSourceId(ensureStringId(sources[0].id));
    }
  }, [sources, selectedSourceId]);

  // Handle document image click
  const handleImageClick = useCallback((source: Source, imageIndex: number) => {
    console.log("Image clicked:", source, imageIndex);
  }, []);

  // Handle citation click
  const handleCitationClick = useCallback((id: string) => {
    console.log("Citation clicked:", id);
  }, []);

  // Handle starting X-ray analysis
  const handleStartXRayAnalysis = useCallback(async (documentId: string) => {
    console.log("Starting X-ray analysis for document:", documentId);
    await fetchXrayData(documentId);
  }, []);

  // Get relevance explanation for a source
  const getRelevanceExplanation = useCallback((source: Source): string => {
    if (!source.score) return "No relevance score available";
    return `This document has a relevance score of ${formatScoreDisplay(source.score)}`;
  }, []);

  // Find the currently selected document
  const selectedDocument = sources.find(source => ensureStringId(source.id) === selectedSourceId) || null;
  
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
              Answer
            </button>
            
            {hasThoughtProcess && (
              <button
                onClick={() => {
                  setActiveTab('thoughts');
                  onThoughtProcessClicked();
                }}
                className={`px-3 py-1 rounded text-sm flex items-center ${activeTab === 'thoughts' ? 'bg-purple-100 text-purple-800' : 'hover:bg-gray-100'}`}
              >
                <Brain size={14} className="mr-1" />
                Thoughts
              </button>
            )}
            
            {hasSupportingContent && (
              <button
                onClick={() => {
                  setActiveTab('documents');
                  onSupportingContentClicked();
                }}
                className={`px-3 py-1 rounded text-sm flex items-center ${activeTab === 'documents' ? 'bg-green-100 text-green-800' : 'hover:bg-gray-100'}`}
              >
                <Database size={14} className="mr-1" />
                Documents
              </button>
            )}
            
            {hasXray && (
              <button
                onClick={() => setActiveTab('xray')}
                className={`px-3 py-1 rounded text-sm flex items-center ${activeTab === 'xray' ? 'bg-yellow-100 text-yellow-800' : 'hover:bg-gray-100'}`}
              >
                <Zap size={14} className="mr-1" />
                X-Ray
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
              <div className="prose max-w-none bg-purple-50 p-3 rounded-md border border-purple-100">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {thoughtProcess}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Document detail view */}
          {activeTab === 'documents' && selectedDocument && (
            <DocumentDetail
              document={selectedDocument}
              handleImageClick={handleImageClick}
              setCurrentDocumentId={setSelectedSourceId}
              setActiveTab={setActiveTab}
              setActiveXrayChunk={setActiveXrayChunk}
              themeStyles={themeStyles}
              getRelevanceExplanation={getRelevanceExplanation}
              onCitationClicked={handleCitationClick}
              onStartXRayAnalysis={handleStartXRayAnalysis}
              isXRayLoading={xrayLoading[selectedSourceId || '']}
              isAnalyzed={!!(selectedDocument.hasXray && selectedDocument.xray)}
            />
          )}
          
          {/* Document list for document tab if no document is selected */}
          {activeTab === 'documents' && !selectedDocument && sources.length > 0 && (
            <div className="p-4">
              <div className="grid gap-3">
                {sources.map((source, i) => (
                  <div 
                    key={ensureStringId(source.id)}
                    className="border rounded p-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => setSelectedSourceId(ensureStringId(source.id))}
                  >
                    <h3 className="font-medium">{source.title || source.fileName || `Document ${i+1}`}</h3>
                    {source.score !== undefined && (
                      <p className="text-sm text-gray-600">Score: {formatScoreDisplay(source.score)}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* X-Ray analysis view */}
          {activeTab === 'xray' && (
            <XRayAnalysis
              xrayViewMode={xrayViewMode}
              setXrayViewMode={setXrayViewMode}
              xrayContentFilter={xrayContentFilter}
              setXrayContentFilter={setXrayContentFilter}
              activeXrayChunk={activeXrayChunk}
              setActiveXrayChunk={setActiveXrayChunk}
              selectedSourceId={selectedSourceId}
              setSelectedSourceId={setSelectedSourceId}
              sources={sources}
              allXrayChunks={allXrayChunks}
              onCitationClicked={handleCitationClick}
              themeStyles={themeStyles}
              isXRayLoading={Object.values(xrayLoading).some(v => v)}
              onStartXRayAnalysis={handleStartXRayAnalysis}
            />
          )}
        </div>
      )}
    </motion.div>
  );
}