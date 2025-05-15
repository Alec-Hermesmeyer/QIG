'use client';

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
import { Source, XRayChunk, EnhancedAnswerProps } from "@/types/types";

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
  searchResults = null,
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
}: EnhancedAnswerProps) {
  // DEBUG: Log the incoming answer object structure
  useEffect(() => {
    try {
      console.log("FastRAG component mounted with answer:", answer);
      // Log keys to understand structure
      if (answer && typeof answer === 'object') {
        console.log("Answer keys:", Object.keys(answer));
        
        // Log specific Azure RAG properties if they exist
        if (answer.thought_process) console.log("thought_process exists:", typeof answer.thought_process);
        if (answer.thoughtProcess) console.log("thoughtProcess exists:", typeof answer.thoughtProcess);
        if (answer.supporting_content) console.log("supporting_content exists:", Array.isArray(answer.supporting_content));
        if (answer.supportingContent) console.log("supportingContent exists:", Array.isArray(answer.supportingContent));
        if (answer.citations) console.log("citations exists:", Array.isArray(answer.citations));
      }
    } catch (error) {
      console.error("Error logging answer structure:", error);
    }
  }, [answer]);

  // State management
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState('answer');
  const [isCopied, setIsCopied] = useState(false);
  const [currentDocumentId, setCurrentDocumentId] = useState(null);
  const [expandedDocs, setExpandedDocs] = useState(new Set());
  const [selectedSourceId, setSelectedSourceId] = useState(null);
  const [citationInfos, setCitationInfos] = useState([]);
  const [parsedAnswerHtml, setParsedAnswerHtml] = useState('');
  const [hasAzureThoughtProcess, setHasAzureThoughtProcess] = useState(false);
  const [hasSupportingContent, setHasSupportingContent] = useState(false);
  const [supportingContent, setSupportingContent] = useState([]);
  const [azureThoughtProcess, setAzureThoughtProcess] = useState('');
  
  // We'll use a ref for documents to avoid render loops
  const documentsRef = useRef([]);
  // Use state for forcing updates after document changes
  const [forceUpdate, setForceUpdate] = useState(0);

  // References
  const contentRef = useRef(null);
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

  // Deep extraction utility - looks for properties at any depth in the object
  const deepExtract = useCallback((obj, keys, stopAtFirst = false) => {
    if (!obj || typeof obj !== 'object') return null;
    
    // First check for direct property match
    for (const key of keys) {
      if (obj[key] !== undefined) {
        if (stopAtFirst) return obj[key];
        console.log(`Found property '${key}' at root level:`, obj[key]);
      }
    }
    
    // Recursively check for the property in nested objects
    const results = [];
    const processObject = (o, path = '') => {
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
    const allSources = [];
    const sourceMap = new Map();

    const processSource = (source, index) => {
      if (!source) return;

      const sourceId = source.id || source.documentId || source.fileId ||
        (source.fileName ? `file-${source.fileName}` : `source-${index}`);

      if (!sourceId) return;
      const strSourceId = String(sourceId);
      if (sourceMap.has(strSourceId)) return;

      const normalizedSource = {
        id: strSourceId,
        fileName: source.fileName || source.name || source.title || `Document ${strSourceId}`,
        score: source.score || source.relevanceScore || source.confidenceScore || 0,
        excerpts: [],
        url: source.url || source.sourceUrl,
      };

      // Extract all types of text content
      normalizedSource.excerpts = [];
      
      if (source.excerpts && Array.isArray(source.excerpts)) {
        normalizedSource.excerpts.push(...source.excerpts.filter(e => e !== null && e !== undefined));
      }

      if (source.snippets && Array.isArray(source.snippets)) {
        normalizedSource.excerpts.push(...source.snippets.filter(s => s !== null && s !== undefined));
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

    return allSources;
  }, [answer, documentExcerpts, searchResults]);

  // Extract Azure-specific content using deep search
  const extractAzureContent = useCallback(() => {
    if (!answer) return;
    
    console.log("Extracting Azure content deeply");
    
    // First check for thought process using multiple possible keys
    const thoughtProcessKeys = ['thought_process', 'thoughtProcess', 'thoughts', 'reasoning', 'rationalization'];
    const thoughtResult = deepExtract(answer, thoughtProcessKeys, true);
    
    if (thoughtResult) {
      console.log("Found thought process:", thoughtResult);
      const formattedThought = typeof thoughtResult === 'string' 
        ? thoughtResult 
        : JSON.stringify(thoughtResult, null, 2);
      
      setHasAzureThoughtProcess(true);
      setAzureThoughtProcess(formattedThought);
    }
    
    // Check for supporting content using multiple possible keys
    const supportingContentKeys = ['supporting_content', 'supportingContent', 'evidence', 'citations', 'sources'];
    const contentResults = deepExtract(answer, supportingContentKeys);
    
    for (const result of contentResults) {
      if (Array.isArray(result.value)) {
        // Format the content into a uniform structure
        const formattedContent = result.value.map((item, idx) => {
          // If the array contains strings, wrap them in objects
          if (typeof item === 'string') {
            return {
              title: `Supporting Content ${idx + 1}`,
              content: item,
              source: 'Document'
            };
          }
          
          // If it's already an object, normalize it
          if (typeof item === 'object') {
            return {
              title: item.title || item.name || item.source || `Supporting Content ${idx + 1}`,
              content: item.content || item.text || item.excerpt || item.snippet || '',
              source: item.source || item.document || item.url || ''
            };
          }
          
          return null;
        }).filter(Boolean);
        
        if (formattedContent.length > 0) {
          console.log("Found supporting content:", formattedContent);
          setHasSupportingContent(true);
          setSupportingContent(formattedContent);
          break; // Use the first matching array we find
        }
      }
    }
  }, [answer, deepExtract]);

  // Initialize Azure content when the component mounts
  useEffect(() => {
    if (!answer) return;
    
    console.log("Initializing Azure content extraction");
    try {
      // Extract data from answer object
      extractAzureContent();
      
      // Logging what was found
      setTimeout(() => {
        console.log("Content extraction status:");
        console.log("- Has thought process:", hasAzureThoughtProcess);
        console.log("- Has supporting content:", hasSupportingContent);
        console.log("- Supporting content items:", supportingContent.length);
      }, 100); // Delay to ensure the state is updated
      
    } catch (error) {
      console.error("Error extracting Azure content:", error);
    }
  }, [answer, extractAzureContent]);

  // Utility functions
  const extractContent = useCallback(() => {
    if (!answer) return '';
    if (typeof answer === 'string') return answer;
    if (answer.content) return typeof answer.content === 'string' ? answer.content : JSON.stringify(answer.content, null, 2);
    if (answer.answer) {
      return typeof answer.answer === 'string' ? answer.answer : JSON.stringify(answer.answer, null, 2);
    }
    if (answer.response) return typeof answer.response === 'string' ? answer.response : JSON.stringify(answer.response, null, 2);
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

  const extractSupportingContent = useCallback(() => {
    if (!answer) return [];
    
    // Azure specific supporting content
    if (answer.supporting_content && Array.isArray(answer.supporting_content)) {
      return answer.supporting_content;
    }
    
    // Try alternative property names
    if (answer.supportingContent && Array.isArray(answer.supportingContent)) {
      return answer.supportingContent;
    }
    
    // Try to convert citations to supporting content if they have content or text
    if (answer.citations && Array.isArray(answer.citations)) {
      const contentCitations = answer.citations.filter(c => c.content || c.text);
      if (contentCitations.length > 0) {
        return contentCitations.map((citation, index) => ({
          title: citation.title || citation.source || `Citation ${index + 1}`,
          content: citation.content || citation.text || '',
          source: citation.source || citation.title || ''
        }));
      }
    }
    
    return [];
  }, [answer]);

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
    // Directly set the ref value without causing re-renders
    documentsRef.current = extractAllSources();
    console.log("Documents extracted:", documentsRef.current.length);

    // Check for Azure format inline citations in the content
    const content = extractContent();
    if (typeof content === 'string') {
      const azureCitationRegex = /\[(.*?)(?:#page=(\d+))?\]/g;
      let match;
      const azureCitations = [];
      let citationCounter = 1;
      
      while ((match = azureCitationRegex.exec(content)) !== null) {
        const fullMatch = match[0];
        const filename = match[1];
        const page = match[2] ? parseInt(match[2]) : null;
        
        // Only include if it looks like a filename (contains a dot)
        if (filename && filename.includes('.')) {
          azureCitations.push({
            id: `citation-${citationCounter}`,
            fileName: filename,
            page: page,
            index: citationCounter,
            text: fullMatch
          });
          citationCounter++;
        }
      }
      
      // If we found Azure citations in the text, use those
      if (azureCitations.length > 0) {
        setCitationInfos(azureCitations);
      }
    }

    // Trigger a re-render to update the sources
    setForceUpdate(prev => prev + 1);
  }, [answer, documentExcerpts, searchResults, extractContent, extractAllSources]);

  // Parse the answer content using AnswerParser when the component mounts or answer changes
  useEffect(() => {
    if (!answer) return;
    
    // Check for inline Azure citations [FILENAME.pdf#page=NUMBER]
    const content = extractContent();
    const hasInlineAzureCitations = typeof content === 'string' && 
      /\[.*?\.(?:pdf|docx|xlsx|txt)(?:#page=\d+)?\]/i.test(content);
    
    if (hasInlineAzureCitations) {
      // For inline Azure citations, create HTML with clickable links
      let htmlContent = content;
      if (typeof htmlContent === 'string') {
        // Replace [FILENAME.pdf#page=NUMBER] with clickable spans
        htmlContent = htmlContent.replace(/\[(.*?)(?:#page=(\d+))?\]/g, (match, filename, page) => {
          if (filename && filename.includes('.')) {
            return `<span class="azure-citation" data-filename="${filename}" data-page="${page || ''}" style="color: #e53e3e; cursor: pointer; font-weight: 500;">${match}</span>`;
          }
          return match;
        });
      } else {
        htmlContent = "";
      }
      
      setParsedAnswerHtml(htmlContent);
    } else if (answer.citations && Array.isArray(answer.citations)) {
      // Handle explicit Azure citation format
      const azureCitations = answer.citations.map((citation, index) => ({
        id: citation.id || `citation-${index + 1}`,
        fileName: citation.title || citation.source || `Citation ${index + 1}`,
        index: index + 1,
        text: citation.text || '',
        page: citation.page,
        url: citation.url
      }));
      
      setCitationInfos(azureCitations);
      
      // For this case, just use the raw content since citations are handled separately
      setParsedAnswerHtml(`<div>${typeof content === 'string' ? content : ''}</div>`);
    } else {
      // Parse the answer using the AnswerParser module for non-specific formats
      try {
        const parsedAnswer = parseAnswerToHtml(answer, isStreaming, onCitationClicked);
        setParsedAnswerHtml(parsedAnswer.answerHtml);

        // Extract citation information
        const extractedCitations = [];
        const sources = documentsRef.current;

        // Map the citation IDs to source information
        parsedAnswer.citations.forEach((citation, index) => {
          const matchedSource = sources.find(
            source => source.id === citation ||
              source.fileName === citation ||
              (source.fileName && citation && source.fileName.includes(citation))
          );

          if (matchedSource) {
            extractedCitations.push({
              id: matchedSource.id,
              fileName: matchedSource.fileName,
              index: index + 1,
              text: `[${matchedSource.fileName}]`,
              relevance: matchedSource.score,
              url: matchedSource.url
            });
          } else if (citation) {
            // If no matching source found, create a generic citation
            extractedCitations.push({
              id: citation,
              fileName: citation,
              index: index + 1,
              text: `[${citation}]`
            });
          }
        });

        // Only update citations if we found them and don't already have Azure citations
        if (extractedCitations.length > 0 && citationInfos.length === 0) {
          setCitationInfos(extractedCitations);
        }
      } catch (error) {
        console.error("Error parsing answer:", error);
        // If parsing fails, just use the raw content
        setParsedAnswerHtml(`<div>${typeof content === 'string' ? content : ''}</div>`);
      }
    }
  }, [answer, isStreaming, onCitationClicked, extractContent]);
  
  // Setup click handler for citations in the answer content
  useEffect(() => {
    if (!contentRef.current) return;
    
    const handleCitationClick = (event) => {
      // Find all citation references
      const target = event.target;
      
      // Handle Azure inline citations
      if (target.classList.contains('azure-citation') || target.closest('.azure-citation')) {
        const citation = target.classList.contains('azure-citation') ? target : target.closest('.azure-citation');
        if (!citation) return;
        
        const filename = citation.getAttribute('data-filename');
        const page = citation.getAttribute('data-page');
        
        if (filename) {
          // Look for a matching document in our sources
          const matchingDoc = documentsRef.current.find(doc => 
            doc.fileName === filename || 
            doc.id === filename ||
            (doc.fileName && filename.includes(doc.fileName))
          );
          
          if (matchingDoc) {
            console.log(`Clicked on Azure citation: ${filename}, page: ${page}`);
            // FIXED: Pass the filename directly instead of the ID
            onCitationClicked(filename, page);
          } else {
            // If no matching document, use the filename as a citation ID
            console.log(`Clicked on Azure citation: ${filename}, page: ${page}`);
            onCitationClicked(filename, page);
          }
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
  }, [onCitationClicked]);

  // Utility functions
  const getRelevanceExplanation = (source) => {
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
  const toggleDocExpansion = (docId) => {
    setExpandedDocs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) { newSet.delete(docId); }
      else { newSet.add(docId); }
      return newSet;
    });
  };

  const handleDocumentClick = (source) => {
    if (!source || !source.id) return;
    toggleDocExpansion(source.id);
    setCurrentDocumentId(source.id);
  };

  const getCurrentDocument = useCallback(() => {
    if (!currentDocumentId) return null;
    // Use the documents ref instead of calling extractAllSources()
    return documentsRef.current.find(s => s.id === currentDocumentId);
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

  // Get extracted data - use memoized callbacks to avoid unnecessary calculations
  const content = extractContent();
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
    (extractedSupportingContent && extractedSupportingContent.length > 0);
  
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
                  <div dangerouslySetInnerHTML={{ __html: parsedAnswerHtml || (typeof content === 'string' ? content : '') }} />
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
                              
                              // FIXED: Use fileName instead of id for citation click handler
                              onCitationClicked(citation.fileName, citation.page);
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
                      {followupQuestions.map((question, i) => (
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
                    {(supportingContent.length > 0 ? supportingContent : extractedSupportingContent).map((item, idx) => (
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
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {item.content || item.text || ''}
                          </ReactMarkdown>
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

                            {expandedDocs.has(source.id) ? (
                              <ChevronUp size={14} className="opacity-70" />
                            ) : (
                              <ChevronDown size={14} className="opacity-70" />
                            )}
                          </div>
                        </div>

                        {/* Expanded document preview */}
                        {expandedDocs.has(source.id) && (
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
                                  // FIXED: Use fileName instead of id for citation
                                  onCitationClicked(source.fileName);
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
                                  setCurrentDocumentId(source.id);
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
      `}</style>
    </motion.div>
  );
}