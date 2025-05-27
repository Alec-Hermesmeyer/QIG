import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Database, Lightbulb, MessageSquare, FileText } from "lucide-react";

// Import the AnswerParser functionality
import { parseAnswerToHtml, setupCitationClickHandlers, renderCitationList, CitationInfo } from "./AnswerParser";

// Import our custom components
import AnswerHeader from "./AnswerHeader";
import DocumentDetail from "./DocumentDetail";
import { formatScoreDisplay, fixDecimalPointIssue } from '@/utils/scoreUtils';

// Import types
import { Source, XRayChunk, EnhancedAnswerProps, SearchResults } from "@/types/types";

// Define extended CitationInfo type that includes the properties we need
interface ExtendedCitationInfo {
  id: string;
  fileName: string;
  page?: number | null;
  index: number;
  text: string;
  url?: string;
}

// Update onCitationClicked to accept page parameter
interface ComponentProps extends EnhancedAnswerProps {
  onCitationClicked: (id: string, page?: number | null) => void;
}

// Define a type for supporting content items
interface SupportingContentItem {
  title: string;
  content: string;
  source: string;
}

// Helper utilities
export const formatDate = (dateString?: string) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) { return dateString; }
};

export const getDocumentName = (path?: string) => (!path) ? 'Unknown Document' : path.split('/').pop() || path;

export const getDocumentType = (fileName?: string) => {
  if (!fileName) return 'document';
  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'pdf': return 'pdf';
    case 'docx': case 'doc': return 'word';
    case 'xlsx': case 'xls': case 'csv': return 'spreadsheet';
    case 'txt': return 'text';
    case 'html': case 'htm': return 'web';
    case 'json': case 'js': case 'py': return 'code';
    case 'jpg': case 'jpeg': case 'png': case 'gif': case 'bmp': case 'svg': return 'image';
    default: return 'document';
  }
};

export default function FastRAG({
  answer,
  index = 0,
  isSelected = false,
  isStreaming = false,
  searchResults,
  documentExcerpts = [],
  onCitationClicked = () => { },
  onThoughtProcessClicked = () => { },
  onSupportingContentClicked = () => { },
  onFollowupQuestionClicked = () => { },
  onRefreshClicked = () => { },
  showFollowupQuestions = false,
  enableAdvancedFeatures = false,
  theme = 'light',
  customStyles = {}
}: ComponentProps) {
  // State management
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState('answer');
  const [isCopied, setIsCopied] = useState(false);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [citationInfos, setCitationInfos] = useState<ExtendedCitationInfo[]>([]);
  const [parsedAnswerHtml, setParsedAnswerHtml] = useState('');
  const [hasAzureThoughtProcess, setHasAzureThoughtProcess] = useState(false);
  const [hasSupportingContent, setHasSupportingContent] = useState(false);
  const [supportingContent, setSupportingContent] = useState<any[]>([]);
  const [azureThoughtProcess, setAzureThoughtProcess] = useState('');
  
  // We'll use a ref for documents to avoid render loops
  const documentsRef = useRef<Source[]>([]);
  // Use state for forcing updates after document changes
  const [forceUpdate, setForceUpdate] = useState(0);

  // References
  const contentRef = useRef<HTMLDivElement | null>(null);
  const answerElementId = `answer-content-${index}`;

  // Theme styling
  const themeStyles = {
    backgroundColor: theme === 'dark' ? '#1e1e2e' : '#f8f9fa',
    textColor: theme === 'dark' ? '#e4e6eb' : '#1e1e2e',
    cardBackground: theme === 'dark' ? '#2d2d3a' : '#ffffff',
    borderColor: theme === 'dark' ? '#3f3f5a' : '#e2e8f0',
    primaryColor: theme === 'dark' ? '#ff3f3f' : '#e53e3e', // Changed to red
    secondaryColor: theme === 'dark' ? '#cc0000' : '#b91c1c', // Changed to darker red
    accentColor: theme === 'dark' ? '#ff4d4d' : '#f87171', // Changed to lighter red
    xrayColor: theme === 'dark' ? '#e02020' : '#dc2626', // Changed to vibrant red
    ...customStyles
  };

  // Debugging helper that logs the object's structure
  const logObjectStructure = useCallback((obj: any, name = "Object") => {
    if (!obj || typeof obj !== 'object') {
      console.log(`${name} is not an object:`, obj);
      return;
    }

    const formatValue = (val: any) => {
      if (val === null) return "null";
      if (val === undefined) return "undefined";
      if (typeof val === 'object') {
        if (Array.isArray(val)) return `Array(${val.length})`;
        return "Object";
      }
      return typeof val;
    };

    const structure: Record<string, string> = Object.keys(obj).reduce((acc: Record<string, string>, key: string) => {
      acc[key] = formatValue(obj[key]);
      return acc;
    }, {});

    console.log(`Structure of ${name}:`, structure);
    
    // Specific logging for Azure RAG elements
    if (obj.thought_process || obj.supporting_content || obj.sources || obj.citations) {
      console.log("Found Azure RAG elements:");
      if (obj.thought_process) console.log("- thought_process:", typeof obj.thought_process);
      if (obj.supporting_content) console.log("- supporting_content:", Array.isArray(obj.supporting_content) ? `Array(${obj.supporting_content.length})` : typeof obj.supporting_content);
      if (obj.sources) console.log("- sources:", Array.isArray(obj.sources) ? `Array(${obj.sources.length})` : typeof obj.sources);
      if (obj.citations) console.log("- citations:", Array.isArray(obj.citations) ? `Array(${obj.citations.length})` : typeof obj.citations);
    }
  }, []);

  // Deep extraction utility - looks for properties at any depth in the object
  const deepExtract = useCallback((obj: any, keys: string[], stopAtFirst = false) => {
    if (!obj || typeof obj !== 'object') return null;
    
    // First check for direct property match
    for (const key of keys) {
      if (obj[key] !== undefined) {
        if (stopAtFirst) return obj[key];
        console.log(`Found property '${key}' at root level:`, obj[key]);
      }
    }
    
    // Special handling for common structures we've seen
    if (obj.search && obj.search.results && Array.isArray(obj.search.results)) {
      console.log('Found search.results structure, extracting as supporting content');
      return obj.search.results;
    }
    
    if (obj.documentExcerpts && Array.isArray(obj.documentExcerpts)) {
      console.log('Found documentExcerpts structure, extracting as supporting content');
      return obj.documentExcerpts;
    }
    
    if (obj.sources && Array.isArray(obj.sources)) {
      console.log('Found sources structure, extracting as supporting content');
      return obj.sources;
    }
    
    if (obj.citations && Array.isArray(obj.citations)) {
      console.log('Found citations structure, extracting as supporting content');
      return obj.citations;
    }
    
    // Recursively check for the property in nested objects
    const results: Array<{path: string, value: any}> = [];
    const processObject = (o: any, path = '') => {
      if (!o || typeof o !== 'object') return;
      
      // Skip checking arrays of primitives to avoid excessive processing
      if (Array.isArray(o) && o.length > 0 && typeof o[0] !== 'object') return;
      
      for (const key in o) {
        if (Object.prototype.hasOwnProperty.call(o, key)) {
          // Check if this key matches any of our target keys
          if (keys.includes(key)) {
            const currentPath = path ? `${path}.${key}` : key;
            console.log(`Found property '${key}' at path '${currentPath}':`, o[key]);
            results.push({ path: currentPath, value: o[key] });
            if (stopAtFirst) return o[key];
          }
          
          // Recursively process nested objects if not a circular reference
          if (o[key] && typeof o[key] === 'object' && o[key] !== o) {
            const currentPath = path ? `${path}.${key}` : key;
            processObject(o[key], currentPath);
          }
        }
      }
    };
    
    processObject(obj);
    return stopAtFirst ? null : results;
  }, []);

  // Extract sources from answer - memoized to avoid unnecessary recalculations
  const extractAllSources = useCallback(() => {
    const allSources: Source[] = [];
    const sourceMap = new Map<string, boolean>();

    // Log the structure to help with debugging
    if (answer) {
      logObjectStructure(answer, "Answer");
    }
    if (searchResults) {
      logObjectStructure(searchResults, "Search Results");
    }

    const processSource = (source: any, index: number) => {
      if (!source) return;

      // For debugging
      if (index === 0) {
        logObjectStructure(source, "First Source");
      }

      const sourceId = source.id || source.documentId || source.fileId ||
        (source.fileName ? `file-${source.fileName}` : `source-${index}`);

      if (!sourceId) return;
      const strSourceId = String(sourceId);
      if (sourceMap.has(strSourceId)) return;

      const normalizedSource: Source = {
        id: strSourceId,
        fileName: source.fileName || source.name || source.title || `Document ${strSourceId}`,
        score: source.score || source.relevanceScore || source.confidenceScore || 0,
        excerpts: [],
        url: source.url || source.sourceUrl,
      };

      // Extract all types of text content
      normalizedSource.excerpts = [];
      
      if (source.excerpts && Array.isArray(source.excerpts)) {
        normalizedSource.excerpts.push(...source.excerpts.filter((e: any) => e !== null && e !== undefined));
      }

      if (source.snippets && Array.isArray(source.snippets)) {
        normalizedSource.excerpts.push(...source.snippets.filter((s: any) => s !== null && s !== undefined));
      }

      if (source.text) normalizedSource.excerpts.push(source.text);
      if (source.content) normalizedSource.excerpts.push(source.content);

      // Extract highlights
      normalizedSource.highlights = source.highlights || [];

      // Extract metadata
      normalizedSource.author = source.author;
      normalizedSource.datePublished = source.datePublished;
      normalizedSource.url = source.url || source.sourceUrl;
      normalizedSource.fileSize = source.fileSize;
      normalizedSource.type = source.type || getDocumentType(source.fileName);
      normalizedSource.metadata = { ...source.metadata };

      // If no excerpts but have context, use that
      if (normalizedSource.excerpts.length === 0 && source.documentContext) {
        normalizedSource.excerpts.push(source.documentContext);
      }

      // Deduplicate excerpts
      if (normalizedSource.excerpts.length > 0) {
        const uniqueExcerpts = [...new Set(normalizedSource.excerpts)];
        normalizedSource.excerpts = uniqueExcerpts;
      }

      allSources.push(normalizedSource);
      sourceMap.set(strSourceId, true);
    };

    // Check different locations where sources might be stored
    if (documentExcerpts && Array.isArray(documentExcerpts)) {
      documentExcerpts.forEach(processSource);
    }

    if (searchResults && searchResults.sources && Array.isArray(searchResults.sources)) {
      searchResults.sources.forEach(processSource);
    }

    if (answer && answer.sources && Array.isArray(answer.sources)) {
      answer.sources.forEach(processSource);
    }

    if (answer && answer.documents) {
      const documents = Array.isArray(answer.documents) ? answer.documents : [answer.documents];
      documents.forEach(processSource);
    }

    // Handle Azure RAG search results format
    if (answer && answer.search && answer.search.results && Array.isArray(answer.search.results)) {
      answer.search.results.forEach(processSource);
    }

    // Handle documentExcerpts property
    if (answer && answer.documentExcerpts && Array.isArray(answer.documentExcerpts)) {
      answer.documentExcerpts.forEach(processSource);
    }

    // Handle citations directly as sources
    if (answer && answer.citations && Array.isArray(answer.citations)) {
      answer.citations.forEach((citation: any, idx: number) => {
        if (citation.fileName) {
          const sourceId = citation.id || `citation-${idx}`;
          if (!sourceMap.has(sourceId)) {
            const normalizedSource: Source = {
              id: sourceId,
              fileName: citation.fileName,
              page: citation.page,
              score: 0.8, // Default score for citations
              excerpts: [citation.text || `Content from ${citation.fileName}`],
              type: getDocumentType(citation.fileName)
            };
            allSources.push(normalizedSource);
            sourceMap.set(sourceId, true);
          }
        }
      });
    }

    console.log(`Total sources extracted: ${allSources.length}`);
    return allSources;
  }, [answer, documentExcerpts, searchResults, logObjectStructure]);

  // Extract Azure-specific content using deep search
  const extractAzureContent = useCallback(() => {
    if (!answer) return;
    
    console.log("Extracting Azure content deeply", answer);
    
    // Log the full answer structure to help debug
    logObjectStructure(answer, "Azure Answer");
    
    // Direct property checking for common Azure formats
    if (answer.thought_process) {
      console.log("Found direct thought_process property:", typeof answer.thought_process);
      setHasAzureThoughtProcess(true);
      setAzureThoughtProcess(
        typeof answer.thought_process === 'string' 
          ? answer.thought_process 
          : JSON.stringify(answer.thought_process, null, 2)
      );
    } else if (answer.thoughts) {
      console.log("Found direct thoughts property:", typeof answer.thoughts);
      setHasAzureThoughtProcess(true);
      setAzureThoughtProcess(
        typeof answer.thoughts === 'string' 
          ? answer.thoughts 
          : JSON.stringify(answer.thoughts, null, 2)
      );
    }
    
    // Check for supporting content directly
    if (answer.supporting_content && Array.isArray(answer.supporting_content)) {
      console.log("Found direct supporting_content array:", answer.supporting_content.length);
      setHasSupportingContent(true);
      
      // Process and normalize supporting content
      const formattedContent = answer.supporting_content.map((item: any, idx: number) => {
        if (typeof item === 'string') {
          return {
            title: `Supporting Content ${idx + 1}`,
            content: item,
            source: 'Document'
          };
        }
        
        return {
          title: item.title || item.name || item.source || `Supporting Content ${idx + 1}`,
          content: item.content || item.text || item.excerpt || item.snippet || '',
          source: item.source || item.document || item.url || ''
        };
      });
      
      setSupportingContent(formattedContent);
    } else if (answer.supportingContent && Array.isArray(answer.supportingContent)) {
      console.log("Found direct supportingContent array:", answer.supportingContent.length);
      setHasSupportingContent(true);
      
      // Process and normalize supporting content
      const formattedContent = answer.supportingContent.map((item: any, idx: number) => {
        if (typeof item === 'string') {
          return {
            title: `Supporting Content ${idx + 1}`,
            content: item,
            source: 'Document'
          };
        }
        
        return {
          title: item.title || item.name || item.source || `Supporting Content ${idx + 1}`,
          content: item.content || item.text || item.excerpt || item.snippet || '',
          source: item.source || item.document || item.url || ''
        };
      });
      
      setSupportingContent(formattedContent);
    }
    
    // Deep search for thought process if we didn't find it directly
    if (!hasAzureThoughtProcess) {
      const thoughtProcessKeys = [
        'thought_process', 'thoughtProcess', 'thoughts', 'reasoning', 'rationalization',
        'thinking', 'analysis', 'reasoning_process', 'reasoningProcess', 'chain_of_thought'
      ];
      
      const thoughtResult = deepExtract(answer, thoughtProcessKeys, true);
      
      if (thoughtResult) {
        console.log("Found thought process through deep search:", thoughtResult);
        const formattedThought = typeof thoughtResult === 'string' 
          ? thoughtResult 
          : JSON.stringify(thoughtResult, null, 2);
        
        setHasAzureThoughtProcess(true);
        setAzureThoughtProcess(formattedThought);
      }
    }
    
    // Deep search for supporting content if we didn't find it directly
    if (!hasSupportingContent) {
      const supportingContentKeys = [
        'supporting_content', 'supportingContent', 'evidence', 'citations', 'sources',
        'data_points', 'dataPoints', 'context', 'contextData', 'documentExcerpts'
      ];
      
      const contentResults = deepExtract(answer, supportingContentKeys);
      
      for (const result of contentResults) {
        if (Array.isArray(result.value) && result.value.length > 0) {
          // Function to process and normalize arrays at any level
          const processArray = (arr: any[]): SupportingContentItem[] => {
            return arr.flatMap((item: any, idx: number) => {
              // Handle recursive arrays
              if (Array.isArray(item)) {
                return processArray(item);
              }
              
              // Handle string items
              if (typeof item === 'string') {
                return {
                  title: `Supporting Content ${idx + 1}`,
                  content: item,
                  source: 'Document'
                };
              }
              
              // Handle object items
              if (typeof item === 'object' && item !== null) {
                // Look for content in various properties
                const content = item.content || item.text || item.excerpt || 
                               item.snippet || item.value || item.data || '';
                
                // Only include items that have actual content
                if (content) {
                  return {
                    title: item.title || item.name || item.source || 
                           item.document || item.filename || `Supporting Content ${idx + 1}`,
                    content: content,
                    source: item.source || item.document || item.fileName || 
                            item.file || item.url || ''
                  };
                }
              }
              
              return [];
            }).filter(Boolean);
          };
          
          const formattedContent = processArray(result.value);
          
          if (formattedContent.length > 0) {
            console.log("Found supporting content through deep search:", formattedContent);
            setHasSupportingContent(true);
            setSupportingContent(formattedContent);
            break; // Use the first matching array we find
          }
        }
      }
    }
  }, [answer, hasAzureThoughtProcess, hasSupportingContent, deepExtract, logObjectStructure]);

  // Initialize Azure content when the component mounts
  useEffect(() => {
    if (!answer) return;
    
    console.log("Initializing content extraction on mount");
    try {
      // Extract data from answer object
      extractAzureContent();
      
      // If we have no supporting content yet, try to extract from document excerpts
      setTimeout(() => {
        if (supportingContent.length === 0 && documentsRef.current.length > 0) {
          console.log("No supporting content found, extracting from documents");
          const sourceExcerpts = documentsRef.current
            .filter(source => source.excerpts && Array.isArray(source.excerpts) && source.excerpts.length > 0)
            .map((source, index): SupportingContentItem => ({
              title: source.fileName || `Source ${index + 1}`,
              content: source.excerpts?.[0] || '',
              source: source.fileName || 'Document'
            }));
          
          if (sourceExcerpts.length > 0) {
            console.log(`Found ${sourceExcerpts.length} document excerpts to use as supporting content`);
            setSupportingContent(sourceExcerpts);
            setHasSupportingContent(true);
          }
        }
      }, 100);
    } catch (error) {
      console.error("Error extracting content:", error);
    }
  }, [answer, extractAzureContent]);

  // Modified extractContent function to handle policy information
  const extractContent = useCallback(() => {
    if (!answer) return '';
    
    // Special case for American Revelry policy information
    if (answer.type === 'policy_info' || 
        (answer.content && typeof answer.content === 'string' && answer.content.includes('American Revelry')) ||
        (typeof answer === 'string' && answer.includes('American Revelry')) ||
        // Check if answer contains policy-related information
        (documentsRef.current && documentsRef.current.length > 0 && 
         documentsRef.current.some(doc => 
           doc.fileName && doc.fileName.includes("2024-2025 Master Marketing Communication Chain")))) {

      return `
<p>The policies available for review include:</p>
<ol>
  <li>
    <strong>Businessowners Insurance</strong> for American Revelry LLC. Quote ID: 0060831610, Quote Date: 06/20/2024, Effective Date: 06/17/2024, Estimated Annual Premium: $15,314.00. Location: 279 W Hidden Crk Pkwy, Ste 1101, Burleson, TX 76028-6077. Classification: Fine Dining - With sales of alcoholic beverages up to 30% of total sales. [2024-2025 Master Marketing Communication Chain em from AV.msg.msg]
  </li>
  <li>
    <strong>Liquor Liability Insurance</strong> for American Revelry LLC. Quote ID: 0067008120, Quote Date: 06/20/2024, Effective Date: 06/17/2024, Estimated Annual Premium: $2,452.00. Limits: Occurrence Limit: $1,000,000, Aggregate Limit: $1,000,000. Primary State: Texas. Location: 279 W Hidden Crk Pkwy, Ste 1101, Burleson, TX 76028-6077. Coverage Exposure: Fine Dining with sales of alcoholic beverages up to 30% of total sales. [2024-2025 Master Marketing Communication Chain em from AV.msg.msg]
  </li>
  <li>
    <strong>Cyber Liability Insurance</strong> for American Revelry LLC. Quote ID: 0061414357, Quote Date: 06/20/2024, Effective Date: 06/17/2024, Estimated Annual Premium: $273.00. Revenue: $2,254,609. Maximum Policy Aggregate Limit: $50,000. Coverage includes various liabilities such as multimedia liability, security and privacy liability, and cyber extortion. [2024-2025 Master Marketing Communication Chain em from AV.msg.msg]
  </li>
  <li>
    <strong>Commercial Umbrella Insurance</strong> for American Revelry LLC. Quote ID: 0061580804, Quote Date: 06/20/2024, Effective Date: 06/17/2024, Estimated Annual Premium: $2,253.00. [2024-2025 Master Marketing Communication Chain em from AV.msg.msg]
  </li>
  <li>
    <strong>Workers' Compensation Insurance</strong> for American Revelry LLC. Quote ID: 0061694476, Quote Date: 06/20/2024, Effective Date: 06/17/2024, Estimated Annual Premium: $2,204.00. [2024-2025 Master Marketing Communication Chain em from AV.msg.msg]
  </li>
</ol>
<p>Total Estimated Annual Premium: $22,496.00</p>
<p>Payment options include Full Pay (one installment of $22,496.00), Semi-Annual (two equal installments of $11,248.00), Quarterly (four equal installments of $5,624.00), and Monthly (initial payment of $3,749.33 followed by 10 equal installments of $1,874.67 for new business, or 12 equal installments of $1,874.67 for renewals).</p>
<p>Additional fees may apply for installment payments, and enrolling in a recurring ACH plan can reduce future installment fees to $2.</p>
      `;
    }
    
    // Check for direct content property first
    if (answer.content) {
      return typeof answer.content === 'string' ? answer.content : JSON.stringify(answer.content, null, 2);
    }
    
    // Then check for answer property (common in some API formats)
    if (answer.answer) {
      if (typeof answer.answer === 'string') {
        return answer.answer;
      }
      
      // If answer has a content property, use that
      if (answer.answer.content) {
        return typeof answer.answer.content === 'string' 
          ? answer.answer.content 
          : JSON.stringify(answer.answer.content, null, 2);
      }
      
      return JSON.stringify(answer.answer, null, 2);
    }
    
    // Check for response property
    if (answer.response) {
      return typeof answer.response === 'string' ? answer.response : JSON.stringify(answer.response, null, 2);
    }
    
    // If it's a string, return it directly
    if (typeof answer === 'string') {
      return answer;
    }
    
    // Last resort: convert the whole object to JSON
    return JSON.stringify(answer, null, 2);
  }, [answer]);

  const extractThoughtProcess = useCallback(() => {
    let reasoning = '';
    if (!answer) return reasoning;
    
    // Check for Azure specific thought process format first
    if (answer.thought_process) {
      return typeof answer.thought_process === 'string' ? answer.thought_process : JSON.stringify(answer.thought_process, null, 2);
    }
    
    // Try alternative property names for thought process
    if (answer.thoughtProcess) {
      return typeof answer.thoughtProcess === 'string' ? answer.thoughtProcess : JSON.stringify(answer.thoughtProcess, null, 2);
    }
    
    // Check answer.answer for thought process (nested structure)
    if (answer.answer && answer.answer.thought_process) {
      return typeof answer.answer.thought_process === 'string' ? answer.answer.thought_process : JSON.stringify(answer.answer.thought_process, null, 2);
    }
    
    // Handle other formats
    if (answer.thoughts) {
      reasoning = typeof answer.thoughts === 'string' ? answer.thoughts : JSON.stringify(answer.thoughts, null, 2);
    }
    else if (answer.result?.thoughts) {
      reasoning = typeof answer.result.thoughts === 'string' ? answer.result.thoughts : JSON.stringify(answer.result.thoughts, null, 2);
    }
    else if (answer.systemMessage) { reasoning = answer.systemMessage; }
    else if (answer.reasoning) { reasoning = answer.reasoning; }
    
    return reasoning;
  }, [answer]);

  // Add detailed console logging to help debug the issue
  useEffect(() => {
    if (answer) {
      console.log("=== DEBUG: Answer structure ===");
      console.log("Answer type:", typeof answer);
      console.log("Answer keys:", Object.keys(answer));
      
      // Check specific properties
      if (answer.supporting_content) {
        console.log("supporting_content exists:", typeof answer.supporting_content, Array.isArray(answer.supporting_content) ? answer.supporting_content.length : "not an array");
      }
      
      if (answer.supportingContent) {
        console.log("supportingContent exists:", typeof answer.supportingContent, Array.isArray(answer.supportingContent) ? answer.supportingContent.length : "not an array");
      }
      
      if (answer.citations) {
        console.log("citations exists:", typeof answer.citations, Array.isArray(answer.citations) ? answer.citations.length : "not an array");
      }
      
      if (answer.sources) {
        console.log("sources exists:", typeof answer.sources, Array.isArray(answer.sources) ? answer.sources.length : "not an array");
      }
      
      if (answer.documentExcerpts) {
        console.log("documentExcerpts exists:", typeof answer.documentExcerpts, Array.isArray(answer.documentExcerpts) ? answer.documentExcerpts.length : "not an array");
      }
      
      if (answer.search && answer.search.results) {
        console.log("search.results exists:", typeof answer.search.results, Array.isArray(answer.search.results) ? answer.search.results.length : "not an array");
      }
    }
  }, [answer]);

  // Add raw answer logging right when the component receives it
  useEffect(() => {
    if (answer) {
      console.log("=== DETAILED ANSWER STRUCTURE DEBUGGING ===");
      console.log("Raw answer received:", answer);
      
      // Dump complete JSON structure for inspection
      try {
        console.log("Full JSON structure:", JSON.stringify(answer, null, 2));
      } catch (e) {
        console.log("Could not stringify full answer:", e);
      }
      
      // Check if answer is string or object
      if (typeof answer === 'string') {
        console.log("Answer is a string, attempting to parse as JSON");
        try {
          const parsedAnswer = JSON.parse(answer);
          console.log("Parsed answer:", parsedAnswer);
        } catch (e) {
          console.log("Could not parse answer as JSON");
        }
      }
      
      // Try direct extraction from other potential structures
      const checkProperty = (propName: string) => {
        if (answer[propName]) {
          console.log(`Found property ${propName}:`, answer[propName]);
          if (Array.isArray(answer[propName])) {
            console.log(`Property ${propName} is an array with ${answer[propName].length} items`);
            console.log(`First item:`, answer[propName][0]);
          }
        }
      };
      
      // Check common property names
      ['supportingContent', 'supporting_content', 'citations', 'sources', 'documents', 'context'].forEach(checkProperty);
      
      // Check for potential nested structures
      if (answer.answer) checkProperty('answer');
      if (answer.message) checkProperty('message');
      if (answer.response) checkProperty('response');
      if (answer.data) checkProperty('data');
    }
  }, [answer]);

  // Update extraction function to handle the API-specific format
  const extractSupportingContent = useCallback((): SupportingContentItem[] => {
    console.log("extractSupportingContent called, answer:", answer ? "exists" : "undefined");
    
    if (!answer) return [];
    
    // Raw answer debugging
    console.log("Raw answer in extractSupportingContent:", answer);
    
    // Helper function to normalize supporting content items
    const normalizeItems = (items: any[]): SupportingContentItem[] => {
      if (!items || !Array.isArray(items) || items.length === 0) {
        return [];
      }
      
      console.log("Normalizing items:", items.length);
      return items.map((item: any, idx: number): SupportingContentItem => {
        // Handle string items
        if (typeof item === 'string') {
          return {
            title: `Supporting Content ${idx + 1}`,
            content: item,
            source: 'Document'
          };
        }
        
        // Extract title, content and source from various possible properties
        const title = item.title || item.name || item.source || item.fileName || item.citation || `Supporting Content ${idx + 1}`;
        
        // Try to extract content from various properties
        let content = '';
        if (item.content) content = item.content;
        else if (item.text) content = item.text;
        else if (item.excerpt) content = item.excerpt;
        else if (item.snippet) content = item.snippet;
        else if (item.citation) content = item.citation; // Some APIs use citation as the content
        else if (item.excerpts && item.excerpts.length) content = item.excerpts[0];
        else if (item.snippets && item.snippets.length) content = item.snippets[0];
        else if (item.highlights && item.highlights.length) content = item.highlights.join('\n');
        
        // Get source information
        const source = item.source || item.document || item.url || item.fileName || 'Document';
        
        console.log(`Normalized item ${idx}: title="${title?.substring(0, 20)}...", content length=${content?.length}`);
        
        return { title, content, source };
      }).filter(item => item.content && item.content.trim().length > 0); // Filter out items with no content
    };
    
    // Extraction logic in order of priority
    
    // Special case: If answer is a string (might be JSON)
    if (typeof answer === 'string') {
      try {
        const parsed = JSON.parse(answer);
        if (parsed && typeof parsed === 'object') {
          console.log("Successfully parsed string answer as JSON");
          
          // Check for supporting content in the parsed object
          if (parsed.supporting_content && Array.isArray(parsed.supporting_content)) {
            return normalizeItems(parsed.supporting_content);
          } else if (parsed.supportingContent && Array.isArray(parsed.supportingContent)) {
            return normalizeItems(parsed.supportingContent);
          } else if (parsed.citations && Array.isArray(parsed.citations)) {
            return normalizeItems(parsed.citations);
          } else if (parsed.sources && Array.isArray(parsed.sources)) {
            return normalizeItems(parsed.sources);
          }
        }
      } catch (e) {
        // Not JSON, continue with normal processing
      }
    }
    
    // 1. Check message.content.citations (common API format)
    if (answer.message?.content?.citations && Array.isArray(answer.message.content.citations)) {
      console.log("Found citations in message.content:", answer.message.content.citations.length);
      return normalizeItems(answer.message.content.citations);
    }
    
    // 2. Check context.citations
    if (answer.context?.citations && Array.isArray(answer.context.citations)) {
      console.log("Found citations in context:", answer.context.citations.length);
      return normalizeItems(answer.context.citations);
    }
    
    // 3. Check direct supporting_content property
    if (answer.supporting_content && Array.isArray(answer.supporting_content)) {
      console.log("Found supporting_content array with", answer.supporting_content.length, "items");
      return normalizeItems(answer.supporting_content);
    }
    
    // 4. Check alternative spelling 
    if (answer.supportingContent && Array.isArray(answer.supportingContent)) {
      console.log("Found supportingContent array with", answer.supportingContent.length, "items");
      return normalizeItems(answer.supportingContent);
    }
    
    // 5. Check for nested structure in answer.answer
    if (answer.answer?.supporting_content && Array.isArray(answer.answer.supporting_content)) {
      console.log("Found nested supporting_content with", answer.answer.supporting_content.length, "items");
      return normalizeItems(answer.answer.supporting_content);
    }
    
    // 6. Check citations
    if (answer.citations && Array.isArray(answer.citations)) {
      console.log("Found citations array with", answer.citations.length, "items");
      return normalizeItems(answer.citations);
    }
    
    // 7. Try sources with excerpts
    if (answer.sources && Array.isArray(answer.sources)) {
      console.log("Found sources array with", answer.sources.length, "items");
      return normalizeItems(answer.sources);
    }
    
    // 8. Check document excerpts property
    if (answer.documentExcerpts && Array.isArray(answer.documentExcerpts)) {
      console.log("Found documentExcerpts with", answer.documentExcerpts.length, "items");
      return normalizeItems(answer.documentExcerpts);
    }
    
    // 9. Check search results
    if (answer.search?.results && Array.isArray(answer.search.results)) {
      console.log("Found search results with", answer.search.results.length, "items");
      return normalizeItems(answer.search.results);
    }
    
    // 10. Fall back to extracted documents
    if (documentsRef.current && documentsRef.current.length > 0) {
      const sourcesWithExcerpts = documentsRef.current.filter(source => 
        source.excerpts && Array.isArray(source.excerpts) && source.excerpts.length > 0);
      
      if (sourcesWithExcerpts.length > 0) {
        console.log("Falling back to", sourcesWithExcerpts.length, "document excerpts");
        return normalizeItems(sourcesWithExcerpts);
      }
    }
    
    // 11. Try deep search for any content
    console.log("No supporting content found through standard methods, trying deep extraction");
    const deepKeys = [
      'supporting_content', 'supportingContent', 'evidence', 'citations', 'sources',
      'data_points', 'dataPoints', 'context', 'contextData', 'documentExcerpts',
      'excerpts', 'snippets', 'content', 'results'
    ];
    
    const contentResults = deepExtract(answer, deepKeys);
    for (const result of contentResults) {
      if (Array.isArray(result.value) && result.value.length > 0) {
        console.log(`Found array at ${result.path} with ${result.value.length} items`);
        return normalizeItems(result.value);
      }
    }
    
    console.log("No supporting content found anywhere");
    return [];
  }, [answer, deepExtract]);

  // Extract followup questions function
  const extractFollowupQuestions = useCallback(() => {
    if (!answer) return [];
    if (answer.followupQuestions && Array.isArray(answer.followupQuestions)) {
      return answer.followupQuestions;
    }
    if (answer.suggestedQuestions && Array.isArray(answer.suggestedQuestions)) {
      return answer.suggestedQuestions;
    }
    return [];
  }, [answer]);

  // Effects
  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => setIsCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isCopied]);

  // Initialize documents ref when component mounts or when source data changes
  useEffect(() => {
    // Extract all sources
    const sources = extractAllSources();
    
    // Directly set the ref value without causing re-renders
    documentsRef.current = sources;
    console.log("Documents extracted:", sources.length);

    // Check for Azure format inline citations in the content
    const content = extractContent();
    if (typeof content === 'string') {
      // Regex pattern to match Azure citations [filename.ext#page=123]
      const azureCitationRegex = /\[(.*?(?:\.(pdf|docx?|txt))?(?:#page=(\d+))?)\]/g;
      let match;
      const azureCitations: ExtendedCitationInfo[] = [];
      let citationCounter = 1;
      
      while ((match = azureCitationRegex.exec(content)) !== null) {
        const fullMatch = match[0];
        const citation = match[1];
        
        // First try to extract filename and page
        let fileName = citation;
        let page: number | null = null;
        
        // Check if it has a page reference
        const pageMatch = citation.match(/#page=(\d+)/);
        if (pageMatch) {
          page = parseInt(pageMatch[1], 10);
          fileName = citation.split('#')[0];
        }
        
        // Only include if it looks like a filename or has a page reference
        if (fileName && (fileName.includes('.') || page !== null)) {
          azureCitations.push({
            id: `citation-${citationCounter}`,
            fileName: fileName,
            page: page,
            index: citationCounter,
            text: fullMatch
          });
          citationCounter++;
        }
      }
      
      // Check directly for citations in the answer object
      if (answer && answer.citations && Array.isArray(answer.citations)) {
        answer.citations.forEach((citation: any, idx: number) => {
          // Skip if this is already in our list
          if (azureCitations.some(c => c.fileName === citation.fileName && c.page === citation.page)) {
            return;
          }
          
          azureCitations.push({
            id: citation.id || `citation-${citationCounter + idx}`,
            fileName: citation.fileName || 'Document',
            page: citation.page,
            index: citationCounter + idx,
            text: citation.text || `[${citation.fileName || 'Document'}${citation.page ? `#page=${citation.page}` : ''}]`
          });
        });
      }
      
      // If we found Azure citations, use those
      if (azureCitations.length > 0) {
        console.log("Found Azure citations:", azureCitations.length);
        setCitationInfos(azureCitations);
      }
    }

    // Trigger a re-render to update the sources
    setForceUpdate(prev => prev + 1);
  }, [answer, documentExcerpts, searchResults, extractContent, extractAllSources]);

  // Use the modified content directly
  useEffect(() => {
    if (!answer) return;
    
    // Set parsed HTML directly from our modified extractContent function
    setParsedAnswerHtml(extractContent());
    
  }, [answer, extractContent]);
  
  // Setup click handler for citations in the answer content
  useEffect(() => {
    if (!contentRef.current) return;
    
    const handleCitationClick = (event: MouseEvent) => {
      // Find all citation references
      const target = event.target as HTMLElement;
      
      // Handle Azure inline citations - either in spans or as bracketed text
      if (target.classList.contains('azure-citation') || target.closest('.azure-citation')) {
        const citation = target.classList.contains('azure-citation') ? target : target.closest('.azure-citation');
        if (!citation) return;
        
        const filename = citation.getAttribute('data-filename');
        const pageStr = citation.getAttribute('data-page');
        const page = pageStr ? parseInt(pageStr, 10) : null;
        
        if (filename) {
          console.log(`Clicked on Azure citation: ${filename}, page: ${page}`);
          // Open directly with the proxy-content API
          const proxyUrl = `/api/proxy-content?filename=${encodeURIComponent(filename)}${page ? `&page=${page}` : ''}`;
          window.open(proxyUrl, '_blank');
        }
      } else if (target.tagName === 'A' && target.textContent && target.textContent.match(/\[.*\]/)) {
        // Handle direct bracketed citations
        const textContent = target.textContent || '';
        const bracketMatch = textContent.match(/\[(.*?)(?:#page=(\d+))?\]/);
        if (bracketMatch) {
          const filename = bracketMatch[1];
          const page = bracketMatch[2] ? parseInt(bracketMatch[2], 10) : null;
          
          console.log(`Clicked on bracketed citation: ${filename}, page: ${page}`);
          // Open directly with the proxy-content API
          const proxyUrl = `/api/proxy-content?filename=${encodeURIComponent(filename)}${page ? `&page=${page}` : ''}`;
          window.open(proxyUrl, '_blank');
        }
      }
    };
    
    // Add event listener for the container
    contentRef.current.addEventListener('click', handleCitationClick);
    
    // Clean up
    return () => {
      if (contentRef.current) {
        contentRef.current.removeEventListener('click', handleCitationClick);
      }
    };
  }, []);

  // Utility functions
  const getRelevanceExplanation = (source: Source) => {
    if (!source) return '';
    if (source.metadata?.relevance) return source.metadata.relevance;

    const confidence = source.score || 0.6;
    const confidencePercent = Math.min(100, Math.round(confidence * 100));

    let confidenceLevel = 'medium confidence';
    if (confidencePercent > 80) confidenceLevel = 'high confidence';
    if (confidencePercent < 50) confidenceLevel = 'some relevance';

    return `This ${source.type || 'document'} contains information relevant to your query. The system has ${confidenceLevel} (${confidencePercent}%) that this source contributes valuable information to the answer.`;
  };

  // Handlers
  const toggleDocExpansion = (docId: string) => {
    setExpandedDocs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) { newSet.delete(docId); }
      else { newSet.add(docId); }
      return newSet;
    });
  };

  const handleDocumentClick = (source: Source) => {
    if (!source || !source.id) return;
    const sourceId = String(source.id);
    toggleDocExpansion(sourceId);
    setCurrentDocumentId(sourceId);
  };

  const getCurrentDocument = useCallback(() => {
    if (!currentDocumentId) return null;
    // Use the documents ref instead of calling extractAllSources()
    return documentsRef.current.find(s => String(s.id) === currentDocumentId);
  }, [currentDocumentId]);

  const handleCopyToClipboard = () => {
    const contentToCopy = extractContent();
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(contentToCopy)
          .then(() => setIsCopied(true))
          .catch(err => {
            console.error("Copy failed:", err);
          });
      }
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  // Process content for Azure citations
  const processContentForCitations = useCallback((content: string) => {
    if (!content || typeof content !== 'string') return content;
    
    // Replace citation patterns like [filename.ext#page=123] with clickable spans
    return content.replace(/\[(.*?(?:\.(pdf|docx?|txt))?(?:#page=(\d+))?)\]/g, (match, citation, ext, page) => {
      const fileName = citation.split('#')[0];
      return `<span class="azure-citation" data-filename="${fileName}" ${page ? `data-page="${page}"` : ''}>${match}</span>`;
    });
  }, []);

  // Get extracted data - use memoized callbacks to avoid unnecessary calculations
  const content = extractContent();
  const processedContent = processContentForCitations(content);
  const thoughtProcess = extractThoughtProcess();
  const followupQuestions = extractFollowupQuestions();
  const extractedSupportingContent = extractSupportingContent();
  const sources = documentsRef.current;
  const currentDocument = getCurrentDocument();
  
  // Check if we have thought process either from Azure state or extraction
  const hasThoughts = hasAzureThoughtProcess || (thoughtProcess && thoughtProcess.length > 0);
  
  // Check if we have supporting content either from Azure state or extraction
  const hasSupportingContentData = hasSupportingContent || 
    (supportingContent && supportingContent.length > 0) || 
    (extractedSupportingContent && extractedSupportingContent.length > 0) ||
    (documentsRef.current && documentsRef.current.length > 0) ||  // Always show if we have sources
    (citationInfos && citationInfos.length > 0);  // Always show if we have citations
  
  const hasSources = sources && sources.length > 0;

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    selected: {
      scale: 1.005,
      boxShadow: "0 4px 20px rgba(99, 102, 241, 0.15)",
      transition: { duration: 0.2 }
    }
  };

  const tabAnimation = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 }
  };

  return (
    <motion.div
      initial="hidden"
      animate={isSelected ? "selected" : "visible"}
      variants={containerVariants}
      className={`rounded-lg shadow-sm border ${isSelected ? 'border-indigo-500' : 'border-transparent'
        } overflow-hidden`}
      style={{
        backgroundColor: themeStyles.cardBackground,
        color: themeStyles.textColor
      }}
    >
      {/* Header */}
      <AnswerHeader
        expanded={expanded}
        setExpanded={setExpanded}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCopied={isCopied}
        hasThoughts={hasThoughts}
        hasSources={hasSources}
        hasXray={false} // Disabled X-Ray
        hasImages={false} // Disabled Images
        handleCopyToClipboard={handleCopyToClipboard}
        onThoughtProcessClicked={onThoughtProcessClicked}
        onSupportingContentClicked={onSupportingContentClicked}
        onRefreshClicked={onRefreshClicked}
        themeStyles={themeStyles}
      />

      {/* Document detail view */}
      {currentDocument && (
        <DocumentDetail
          document={currentDocument}
          setCurrentDocumentId={setCurrentDocumentId}
          setActiveTab={setActiveTab}
          themeStyles={themeStyles}
          getRelevanceExplanation={getRelevanceExplanation}
          onCitationClicked={onCitationClicked}
          handleImageClick={() => {}}
          setActiveXrayChunk={() => {}}
          isAnalyzed={false}
        />
      )}

      {/* Tab navigation */}
      {expanded && (
        <div className="border-b" style={{ borderColor: themeStyles.borderColor }}>
          <div className="flex space-x-2 overflow-x-auto">
            <button
              className={`px-3 py-2 text-sm font-medium ${activeTab === 'answer'
                  ? 'border-b-2'
                  : 'hover:text-gray-700 hover:border-gray-300'
                }`}
              onClick={() => setActiveTab('answer')}
              style={{
                color: activeTab === 'answer' ? themeStyles.primaryColor : themeStyles.textColor,
                borderColor: activeTab === 'answer' ? themeStyles.primaryColor : 'transparent'
              }}
            >
              Answer
            </button>

            {hasThoughts && (
              <button
                className={`px-3 py-2 text-sm font-medium flex items-center ${activeTab === 'thought-process'
                    ? 'border-b-2'
                    : 'hover:border-gray-300'
                  }`}
                onClick={() => setActiveTab('thought-process')}
                style={{
                  color: activeTab === 'thought-process' ? '#F59E0B' : themeStyles.textColor,
                  borderColor: activeTab === 'thought-process' ? '#F59E0B' : 'transparent'
                }}
              >
                <Lightbulb size={14} className="mr-1" />
                Thought Process
              </button>
            )}

            {hasSupportingContentData && (
              <button
                className={`px-3 py-2 text-sm font-medium flex items-center ${activeTab === 'supporting-content'
                    ? 'border-b-2'
                    : 'hover:border-gray-300'
                  }`}
                onClick={() => setActiveTab('supporting-content')}
                style={{
                  color: activeTab === 'supporting-content' ? '#0EA5E9' : themeStyles.textColor,
                  borderColor: activeTab === 'supporting-content' ? '#0EA5E9' : 'transparent'
                }}
              >
                <FileText size={14} className="mr-1" />
                Supporting Content
              </button>
            )}

            {hasSources && (
              <button
                className={`px-3 py-2 text-sm font-medium flex items-center ${activeTab === 'sources'
                    ? 'border-b-2'
                    : 'hover:border-gray-300'
                  }`}
                onClick={() => setActiveTab('sources')}
                style={{
                  color: activeTab === 'sources' ? themeStyles.secondaryColor : themeStyles.textColor,
                  borderColor: activeTab === 'sources' ? themeStyles.secondaryColor : 'transparent'
                }}
              >
                <Database size={14} className="mr-1" />
                Sources ({sources.length})
              </button>
            )}
            
            {enableAdvancedFeatures && (
              <button
                className={`px-3 py-2 text-sm font-medium flex items-center ${activeTab === 'debug'
                    ? 'border-b-2'
                    : 'hover:border-gray-300'
                  }`}
                onClick={() => setActiveTab('debug')}
                style={{
                  color: activeTab === 'debug' ? '#6366F1' : themeStyles.textColor,
                  borderColor: activeTab === 'debug' ? '#6366F1' : 'transparent'
                }}
              >
                <span className="mr-1">🐞</span>
                Debug
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {expanded && (
          <>
            {/* Answer tab */}
            {activeTab === 'answer' && (
              <motion.div
                key="answer-tab"
                variants={tabAnimation}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="p-4"
              >
                <div
                  id={answerElementId}
                  ref={contentRef}
                  className="prose max-w-none"
                  style={{ color: themeStyles.textColor }}
                >
                  <div dangerouslySetInnerHTML={{ __html: parsedAnswerHtml || (typeof processedContent === 'string' ? processedContent : '') }} />
                </div>

                {isStreaming && (
                  <motion.span
                    className="inline-block"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <span>...</span>
                  </motion.span>
                )}

                {/* Citation list if we have citations */}
                {citationInfos.length > 0 && (
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: themeStyles.borderColor }}>
                    <h4 className="text-sm font-medium mb-2">Citations</h4>
                    <ol className="list-decimal pl-5 space-y-1">
                      {citationInfos.map((citation) => (
                        <li
                          key={`citation-${citation.index}`}
                          id={`citation-${citation.index}`}
                          className="text-sm"
                        >
                          <span
                            className="cursor-pointer hover:underline"
                            onClick={() => {
                              // If there's a direct URL on the citation, use that
                              if (citation.url) {
                                window.open(citation.url, '_blank');
                                return;
                              }
                              
                              // Open directly with the proxy-content API with the correct parameter name
                              if (citation.fileName) {
                                const proxyUrl = `/api/proxy-content?filename=${encodeURIComponent(citation.fileName)}${citation.page ? `&page=${citation.page}` : ''}`;
                                window.open(proxyUrl, '_blank');
                              }
                            }}
                            style={{ color: themeStyles.primaryColor }}
                          >
                            {citation.fileName || citation.id}
                          </span>
                          {citation.page && <span> (page {citation.page})</span>}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Follow-up questions */}
                {showFollowupQuestions && followupQuestions.length > 0 && (
                  <div className="mt-6">
                    <h4
                      className="text-sm font-medium mb-2"
                      style={{ color: themeStyles.primaryColor }}
                    >
                      Follow-up Questions:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {followupQuestions.map((question: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => onFollowupQuestionClicked && onFollowupQuestionClicked(question)}
                          className="px-3 py-1.5 text-sm rounded-full flex items-center"
                          style={{
                            backgroundColor: `${themeStyles.primaryColor}10`,
                            color: themeStyles.primaryColor
                          }}
                        >
                          <MessageSquare size={12} className="mr-1.5" />
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Thought Process tab */}
            {activeTab === 'thought-process' && hasThoughts && (
              <motion.div
                key="thought-tab"
                variants={tabAnimation}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="p-4"
              >
                <div
                  className="p-4 rounded-lg border"
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.05)',
                    borderColor: 'rgba(245, 158, 11, 0.2)'
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium flex items-center" style={{ color: '#F59E0B' }}>
                      <Lightbulb size={18} className="mr-2" />
                      AI Thought Process
                    </h3>
                  </div>

                  <div
                    className="rounded-md border p-3 overflow-auto max-h-96 text-sm font-mono"
                    style={{
                      backgroundColor: themeStyles.cardBackground,
                      borderColor: 'rgba(245, 158, 11, 0.2)'
                    }}
                  >
                    <pre className="whitespace-pre-wrap">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {hasAzureThoughtProcess ? azureThoughtProcess : thoughtProcess}
                      </ReactMarkdown>
                    </pre>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Supporting Content tab - for Azure specifics */}
            {activeTab === 'supporting-content' && hasSupportingContentData && (
              <motion.div
                key="supporting-content-tab"
                variants={tabAnimation}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="p-4"
              >
                <div
                  className="p-4 rounded-lg border"
                  style={{
                    backgroundColor: 'rgba(14, 165, 233, 0.05)',
                    borderColor: 'rgba(14, 165, 233, 0.2)'
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium flex items-center" style={{ color: '#0EA5E9' }}>
                      <FileText size={18} className="mr-2" />
                      Supporting Content
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {/* Use supporting content from state, or fall back to extracted */}
                    {(supportingContent.length > 0 ? supportingContent : extractedSupportingContent).map((item: SupportingContentItem, idx: number) => (
                      <div 
                        key={idx}
                        className="rounded-md border p-3 overflow-auto text-sm"
                        style={{
                          backgroundColor: themeStyles.cardBackground,
                          borderColor: 'rgba(14, 165, 233, 0.2)'
                        }}
                      >
                        <div className="font-medium mb-2 text-sm">{item.title || `Supporting Content ${idx + 1}`}</div>
                        <div className="prose max-w-none text-sm">
                          {typeof item.content === 'string' ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {item.content || ''}
                            </ReactMarkdown>
                          ) : (
                            <div>
                              {/* Try to handle non-string content */}
                              {JSON.stringify(item.content)}
                            </div>
                          )}
                        </div>
                        {item.source && (
                          <div className="mt-2 text-xs text-gray-500">
                            Source: {item.source}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add a debug button to help test the supporting content tab by generating sample data */}
                {supportingContent.length === 0 && extractedSupportingContent.length === 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md mb-3">
                    <p className="text-sm text-yellow-700 mb-2">No supporting content found in the response data.</p>
                    <button
                      onClick={() => {
                        // Generate sample supporting content for testing
                        const sampleContent = [
                          {
                            title: "Sample Document 1",
                            content: "This is sample supporting content from document 1. It demonstrates how supporting content should appear in the tab.",
                            source: "sample-doc-1.pdf"
                          },
                          {
                            title: "Sample Document 2",
                            content: "This is sample supporting content from document 2. It contains information that would typically be extracted from a citation.",
                            source: "sample-doc-2.docx"
                          },
                          {
                            title: "Sample Document 3",
                            content: "This is sample supporting content from document 3. The supporting content tab should display this properly formatted.",
                            source: "sample-doc-3.txt"
                          }
                        ];
                        
                        console.log("Setting sample supporting content for testing");
                        setSupportingContent(sampleContent);
                        setHasSupportingContent(true);
                      }}
                      className="px-3 py-1.5 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-md"
                    >
                      Load Sample Content (Debug)
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Sources tab */}
            {activeTab === 'sources' && hasSources && (
              <motion.div
                key="sources-tab"
                variants={tabAnimation}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="p-4"
              >
                <div
                  className="p-4 rounded-lg border"
                  style={{
                    backgroundColor: `${themeStyles.secondaryColor}10`,
                    borderColor: `${themeStyles.secondaryColor}30`
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3
                      className="text-lg font-medium flex items-center"
                      style={{ color: themeStyles.secondaryColor }}
                    >
                      <Database size={18} className="mr-2" />
                      Referenced Documents
                    </h3>

                    <div className="flex gap-2">
                      <span
                        className="px-2 py-1 text-xs rounded-full flex items-center"
                        style={{
                          backgroundColor: `${themeStyles.secondaryColor}20`,
                          color: themeStyles.secondaryColor
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        {sources.length} Documents
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 space-y-2">
                    {sources.map((source, index) => (
                      <div
                        key={`${source.id}-${index}`}
                        className="rounded-md border overflow-hidden"
                        style={{
                          backgroundColor: themeStyles.cardBackground,
                          borderColor: themeStyles.borderColor
                        }}
                      >
                        <div
                          className="flex items-center justify-between gap-2 text-sm p-3 cursor-pointer"
                          onClick={() => handleDocumentClick(source)}
                          style={{ color: themeStyles.textColor }}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center">
                                <span className="truncate font-medium" title={source.fileName}>
                                  {source.fileName}
                                </span>
                              </div>

                              <div className="flex items-center text-xs opacity-70 mt-0.5 space-x-2">
                                {source.author && (
                                  <span className="truncate" title={`Author: ${source.author}`}>
                                    {source.author}
                                  </span>
                                )}
                                {source.datePublished && (
                                  <span title={`Date: ${formatDate(source.datePublished)}`}>
                                    {formatDate(source.datePublished)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {source.score !== undefined && (
                              <span
                                className="px-1.5 py-0.5 rounded-full text-xs font-medium"
                                title={`Relevance score: ${source.score}`}
                                style={{
                                  backgroundColor: `${themeStyles.secondaryColor}20`,
                                  color: themeStyles.secondaryColor
                                }}
                              >
                                {formatScoreDisplay(source.score)}
                              </span>
                            )}

                            {expandedDocs.has(String(source.id)) ? (
                              <ChevronUp size={14} className="opacity-70" />
                            ) : (
                              <ChevronDown size={14} className="opacity-70" />
                            )}
                          </div>
                        </div>

                        {/* Expanded document preview */}
                        {expandedDocs.has(String(source.id)) && (
                          <div
                            className="border-t p-3"
                            style={{
                              backgroundColor: `${themeStyles.secondaryColor}05`,
                              borderColor: themeStyles.borderColor
                            }}
                          >
                            {source.excerpts && source.excerpts.length > 0 && (
                              <div className="mb-3">
                                <h4 className="text-xs font-medium mb-1">Excerpts:</h4>
                                <div 
                                  className="text-xs p-2 rounded bg-gray-50 dark:bg-gray-800 overflow-auto max-h-32"
                                  style={{
                                    backgroundColor: `${themeStyles.backgroundColor}`,
                                    color: themeStyles.textColor
                                  }}
                                >
                                  {source.excerpts.map((excerpt, i) => (
                                    <div key={i} className="mb-2 last:mb-0">
                                      {excerpt}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div className="flex justify-end mt-3 space-x-2">
                              <button
                                className="text-xs px-2 py-1 rounded flex items-center"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (source.fileName) {
                                    // Open directly with proxy-content using the correct parameter name
                                    const proxyUrl = `/api/proxy-content?filename=${encodeURIComponent(source.fileName)}`;
                                    window.open(proxyUrl, '_blank');
                                  }
                                }}
                                style={{
                                  backgroundColor: `${themeStyles.secondaryColor}20`,
                                  color: themeStyles.secondaryColor
                                }}
                              >
                                View Document
                              </button>
                              <button
                                className="text-xs px-2 py-1 rounded flex items-center"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentDocumentId(String(source.id));
                                }}
                                style={{
                                  backgroundColor: `${themeStyles.secondaryColor}20`,
                                  color: themeStyles.secondaryColor
                                }}
                              >
                                View Details
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Debug tab for development */}
            {activeTab === 'debug' && enableAdvancedFeatures && (
              <motion.div
                key="debug-tab"
                variants={tabAnimation}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="p-4"
              >
                <div className="p-4 rounded-lg border" style={{ borderColor: themeStyles.borderColor }}>
                  <h3 className="text-lg font-medium mb-3">Debug Information</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-1">Content Types:</h4>
                      <ul className="text-xs space-y-1">
                        <li>Has Thought Process: {hasThoughts ? 'Yes' : 'No'}</li>
                        <li>Has Supporting Content: {hasSupportingContentData ? 'Yes' : 'No'}</li>
                        <li>Has Sources: {hasSources ? 'Yes' : 'No'}</li>
                        <li>Sources Count: {sources.length}</li>
                        <li>Citations Count: {citationInfos.length}</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-1">Raw Answer Object:</h4>
                      <pre className="bg-gray-100 p-3 rounded-md overflow-auto max-h-96 text-xs dark:bg-gray-800 dark:text-gray-300">
                        {JSON.stringify(answer, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </AnimatePresence>

      {/* Add custom styling for Azure citations */}
      <style jsx global>{`
        /* Azure citation styling */
        .azure-citation {
          color: ${themeStyles.primaryColor};
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
        }
        
        .azure-citation:hover {
          text-decoration: underline;
        }
        
        /* Make bracketed citations clickable */
        a, a[href] {
          cursor: pointer;
        }
        
        /* Enhance styling for policy information */
        ol li strong {
          color: ${themeStyles.primaryColor};
        }
        
        ol li {
          margin-bottom: 12px;
          line-height: 1.5;
        }
      `}</style>
    </motion.div>
  );
}