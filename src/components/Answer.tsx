'use client';

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { motion, AnimatePresence } from "framer-motion";
import {
    ClipboardCopy,
    ClipboardCheck,
    Lightbulb,
    ClipboardList,
    Bug,
    ChevronDown,
    ChevronUp,
    Database,
    FileText,
    ExternalLink,
    Search,
    FileQuestion,
    BookOpen,
    AlignJustify,
    FileDigit,
    Code,
    Sparkles,
    BarChart,
    BookMarked,
    Info,
    AlertTriangle,
    Settings,
    ArrowRight
} from "lucide-react";
import { parseAnswerToHtml } from "./AnswerParser"; // Make sure to import your parser

// Define the source information type
interface Source {
  id: string | number;
  fileName: string;
  title?: string;
  score?: number;
  excerpts?: string[];
  narrative?: string[];
  metadata?: Record<string, any>;
  snippets?: string[]; // Add snippets field for GroundX
  content?: string;    // Add content field for GroundX
  name?: string;       // Add name field for GroundX
}

// Define search results type
interface SearchResults {
  count: number;
  sources: Source[];
}

// Define document excerpt type
interface DocumentExcerpt {
  id: string;
  fileName: string;
  excerpts: string[];
  narrative?: string[];
  metadata?: Record<string, any>;
  snippets?: string[]; // Add snippets for GroundX compatibility
  content?: string;    // Full content if available
  score?: number;      // Relevance score
  name?: string;       // Alternative name field from GroundX
}

interface Props {
    answer: any;
    index: number;
    isSelected?: boolean;
    isStreaming: boolean;
    searchResults?: SearchResults;
    documentExcerpts?: DocumentExcerpt[];
    onCitationClicked: (filePath: string) => void;
    onThoughtProcessClicked: () => void;
    onSupportingContentClicked: () => void;
    onFollowupQuestionClicked?: (question: string) => void;
    showFollowupQuestions?: boolean;
}

export default function EnhancedAnswer({
    answer,
    index,
    isSelected,
    isStreaming,
    searchResults,
    documentExcerpts,
    onCitationClicked,
    onThoughtProcessClicked,
    onSupportingContentClicked,
    onFollowupQuestionClicked,
    showFollowupQuestions = false, // Default to false
}: Props) {
    const [debugMode, setDebugMode] = useState(false);
    const [expanded, setExpanded] = useState(true);
    const [isCopied, setIsCopied] = useState(false);
    const [showRagSources, setShowRagSources] = useState(false);
    const [showDocExcerpt, setShowDocExcerpt] = useState<string | null>(null);
    const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
    const [activeTab, setActiveTab] = useState<'answer' | 'raw' | 'thought-process' | 'sources'>('answer');
    const contentRef = useRef<HTMLDivElement>(null);

    // GroundX specific state
    const [expandThoughtProcess, setExpandThoughtProcess] = useState(false);
    const [highlightCitation, setHighlightCitation] = useState<string | null>(null);
    const [showSearchInsights, setShowSearchInsights] = useState(false);

    // Log props for debugging
    useEffect(() => {
        if (debugMode) {
            console.log("Answer Props:", {
                answer,
                searchResults,
                documentExcerpts
            });
        }
    }, [debugMode, answer, searchResults, documentExcerpts]);

    // Parse the answer using our improved parser
    const parsedAnswer = parseAnswerToHtml(answer, isStreaming, onCitationClicked);
    const content = parsedAnswer.answerHtml;
    const citations = parsedAnswer.citations;
    const followupQuestions = parsedAnswer.followupQuestions || [];

    // Extract thoughts from GroundX response
    const extractThoughts = (response: any): string => {
        if (!response) return '';
        
        // Try different paths where thoughts might be stored in the response structure
        if (response.thoughts) {
            return typeof response.thoughts === 'string' 
                ? response.thoughts 
                : JSON.stringify(response.thoughts, null, 2);
        }
        
        if (response.result?.thoughts) {
            return typeof response.result.thoughts === 'string' 
                ? response.result.thoughts 
                : JSON.stringify(response.result.thoughts, null, 2);
        }
        
        if (response.rawResponse?.thoughts) {
            return typeof response.rawResponse.thoughts === 'string' 
                ? response.rawResponse.thoughts 
                : JSON.stringify(response.rawResponse.thoughts, null, 2);
        }
        
        // Try additional locations where thoughts might be stored in unusual formats
        if (response.answer?.thoughts) {
            return typeof response.answer.thoughts === 'string'
                ? response.answer.thoughts
                : JSON.stringify(response.answer.thoughts, null, 2);
        }
        
        if (response.result?.answer?.thoughts) {
            return typeof response.result.answer.thoughts === 'string'
                ? response.result.answer.thoughts
                : JSON.stringify(response.result.answer.thoughts, null, 2);
        }
        
        // Look for a searchResults.thoughts property, which might exist in some formats
        if (response.searchResults?.thoughts) {
            return typeof response.searchResults.thoughts === 'string'
                ? response.searchResults.thoughts
                : JSON.stringify(response.searchResults.thoughts, null, 2);
        }
        
        // Check for a supportingContent field which might contain thoughts
        if (response.supportingContent && typeof response.supportingContent === 'string' &&
            response.supportingContent.includes('thought')) {
            return response.supportingContent;
        }
        
        if (response.result?.supportingContent && 
            typeof response.result.supportingContent === 'string' &&
            response.result.supportingContent.includes('thought')) {
            return response.result.supportingContent;
        }
        
        return 'No thought process information available';
    };

    // Extract search insights from GroundX response
    const extractSearchInsights = (response: any): any => {
        if (!response) return null;
        
        // Try different paths where search insights might be stored
        if (response.enhancedResults) {
            return response.enhancedResults;
        }
        
        if (response.result?.enhancedResults) {
            return response.result.enhancedResults;
        }
        
        if (response.rawResponse?.enhancedResults) {
            return response.rawResponse.enhancedResults;
        }
        
        return null;
    };

    // Reset copied state after 2 seconds
    useEffect(() => {
        if (isCopied) {
            const timer = setTimeout(() => {
                setIsCopied(false);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [isCopied]);

    // Toggle document expansion
    const toggleDocExpansion = (docId: string) => {
        setExpandedDocs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(docId)) {
                newSet.delete(docId);
            } else {
                newSet.add(docId);
            }
            return newSet;
        });
    };

    // Setup click handlers for citation numbers
    useEffect(() => {
        const handleContentClick = (e: MouseEvent) => {
            // Find if the clicked element is a citation number
            const target = e.target as HTMLElement;
            
            if (target.classList.contains('citation-number')) {
                // Get the citation index from the data attribute
                const citationIndex = parseInt(target.getAttribute('data-citation-index') || '0', 10);
                
                // Ensure the citation index is valid
                if (citationIndex > 0 && citationIndex <= citations.length) {
                    // Get the corresponding citation filename
                    const citationFile = citations[citationIndex - 1];
                    
                    // Call the citation handler
                    onCitationClicked(citationFile);
                }
            }
        };
        
        // Add the event listener to the content div
        const contentElement = contentRef.current;
        if (contentElement) {
            contentElement.addEventListener('click', handleContentClick);
        }
        
        // Cleanup on unmount
        return () => {
            if (contentElement) {
                contentElement.removeEventListener('click', handleContentClick);
            }
        };
    }, [citations, onCitationClicked]);

    // Handle the clipboard icon click - copy content to clipboard
    const handleClipboardIconClick = () => {
        try {
            // Use the raw content for copying, not the HTML-formatted version
            let contentToCopy = "";
            if (typeof answer === 'string') {
                contentToCopy = answer;
            } else if (answer?.content) {
                contentToCopy = answer.content;
            } else if (answer?.answer) {
                contentToCopy = answer.answer;
            } else {
                contentToCopy = JSON.stringify(answer);
            }
            
            // Modern clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(contentToCopy)
                    .then(() => {
                        setIsCopied(true);
                    })
                    .catch(() => {
                        // Fallback for HTTPS but no clipboard permission
                        fallbackCopyToClipboard(contentToCopy);
                    });
            } else {
                // Fallback for older browsers
                fallbackCopyToClipboard(contentToCopy);
            }
        } catch (err) {
            console.error('Failed to copy content:', err);
        }
    };
    
    // Fallback for copying to clipboard
    const fallbackCopyToClipboard = (text: string) => {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            // Make the textarea out of viewport
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const success = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (success) {
                setIsCopied(true);
            }
        } catch (err) {
            console.error('Fallback copy failed:', err);
        }
    };

    // Handle document source click
    const handleSourceClick = (source: Source) => {
        // Set the excerpt to display if it exists
        if (source.excerpts?.length || source.narrative?.length || source.snippets?.length) {
            setShowDocExcerpt(source.id.toString());
        } else {
            // Otherwise just open the document
            onCitationClicked(source.id.toString());
        }
    };
    
    // Get document icon based on file extension
    const getDocumentIcon = (fileName: string) => {
        const extension = fileName.split('.').pop()?.toLowerCase();
        
        switch (extension) {
            case 'pdf':
                return <FileText size={16} className="text-red-600" />;
            case 'docx':
            case 'doc':
                return <FileText size={16} className="text-blue-600" />;
            case 'xlsx':
            case 'xls':
            case 'csv':
                return <FileDigit size={16} className="text-green-600" />;
            case 'json':
            case 'js':
            case 'ts':
                return <Code size={16} className="text-yellow-600" />;
            case 'txt':
                return <AlignJustify size={16} className="text-gray-600" />;
            default:
                return <BookOpen size={16} className="text-purple-600" />;
        }
    };
    
    // Normalize document ID by removing prefixes that might differ between systems
    const normalizeDocId = (id: string): string => {
        return id.replace(/^(groundx:|azure:|gx:)/i, '');
    };
    
    // Extract the filename from a path
    const extractFileName = (path: string): string => {
        if (!path) return 'Unknown';
        return path.split('/').pop() || path;
    };
    
    // Find a document excerpt by ID
    const findDocumentExcerpt = (id: string): DocumentExcerpt | undefined => {
        if (!documentExcerpts?.length) return undefined;
        
        const normalizedId = normalizeDocId(id);
        
        // First try direct match
        let docMatch = documentExcerpts.find(doc => 
            normalizeDocId(doc.id) === normalizedId
        );
        
        // If no match, try matching by file name
        if (!docMatch && id.includes('/')) {
            const fileName = extractFileName(id);
            docMatch = documentExcerpts.find(doc => {
                const docFileName = extractFileName(doc.fileName);
                return docFileName === fileName || docFileName.endsWith(`/${fileName}`);
            });
        }
        
        // For GroundX compatibility, also try finding match in search results
        if (!docMatch && searchResults?.sources?.length) {
            const sourceMatch = searchResults.sources.find(source => 
                normalizeDocId(source.id.toString()) === normalizedId
            );
            
            if (sourceMatch) {
                docMatch = {
                    id: sourceMatch.id.toString(),
                    fileName: sourceMatch.fileName || sourceMatch.name || `Document ${sourceMatch.id}`,
                    excerpts: sourceMatch.excerpts || [],
                    narrative: sourceMatch.narrative || [],
                    snippets: sourceMatch.snippets || [],
                    metadata: sourceMatch.metadata || {},
                    score: sourceMatch.score
                };
            }
        }
        
        return docMatch;
    };
    
    // Create a combined list of sources from searchResults and documentExcerpts
    const getAllSources = (): Source[] => {
        const sources: Source[] = [];
        const sourceMap = new Map<string, number>();
        
        // First add sources from searchResults
        if (searchResults?.sources?.length) {
            searchResults.sources.forEach((source, index) => {
                const normalizedId = normalizeDocId(source.id.toString());
                sources.push({
                    ...source,
                    fileName: source.fileName || source.name || `Document ${source.id}`
                });
                sourceMap.set(normalizedId, index);
            });
        }
        
        // Then add any document excerpts that aren't already in sources
        if (documentExcerpts?.length) {
            documentExcerpts.forEach(excerpt => {
                const normalizedId = normalizeDocId(excerpt.id);
                const existingIndex = sourceMap.has(normalizedId) 
                    ? sourceMap.get(normalizedId) 
                    : -1;
                
                if (existingIndex !== undefined && existingIndex >= 0) {
                    // Update existing source with excerpt information
                    // Merge the excerpt information with the existing source
                    const existingSource = sources[existingIndex];
                    sources[existingIndex] = {
                        ...existingSource,
                        excerpts: excerpt.excerpts || existingSource.excerpts,
                        narrative: excerpt.narrative || existingSource.narrative,
                        snippets: excerpt.snippets || existingSource.snippets,
                        metadata: { 
                            ...(existingSource.metadata || {}), 
                            ...(excerpt.metadata || {}) 
                        }
                    };
                } else {
                    // Add as a new source
                    sources.push({
                        id: excerpt.id,
                        fileName: excerpt.fileName || `Document ${excerpt.id}`,
                        excerpts: excerpt.excerpts || [],
                        narrative: excerpt.narrative || [],
                        snippets: excerpt.snippets || [],
                        metadata: excerpt.metadata || {},
                        score: excerpt.score
                    });
                    // Update the map
                    sourceMap.set(normalizedId, sources.length - 1);
                }
            });
        }

        // If we're dealing with raw GroundX format, directly extract from answer
        if (sources.length === 0 && answer?.documents) {
            const documents = Array.isArray(answer.documents) ? answer.documents : [answer.documents];
            documents.forEach((doc: {
                id?: string | number;
                fileName?: string;
                name?: string;
                snippets?: string[];
                metadata?: Record<string, any>;
                score?: number;
            }, index: number) => {
                const normalizedId = normalizeDocId(doc.id?.toString() || `doc-${index}`);
                sources.push({
                    id: doc.id || `doc-${index}`,
                    fileName: doc.fileName || doc.name || `Document ${doc.id || index}`,
                    excerpts: [],
                    snippets: doc.snippets || [],
                    narrative: [],
                    metadata: doc.metadata || {},
                    score: doc.score
                });
                sourceMap.set(normalizedId, sources.length - 1);
            });
        }
        
        // If we're dealing with raw GroundX result format
        if (sources.length === 0 && answer?.result?.documents) {
            const documents = Array.isArray(answer.result.documents) 
                ? answer.result.documents 
                : [answer.result.documents];
                
            documents.forEach((doc: any, index: number) => {
                const normalizedId = normalizeDocId(doc.id?.toString() || `doc-${index}`);
                sources.push({
                    id: doc.id || `doc-${index}`,
                    fileName: doc.fileName || doc.name || `Document ${doc.id || index}`,
                    excerpts: [],
                    snippets: doc.snippets || [],
                    narrative: [],
                    metadata: doc.metadata || {},
                    score: doc.score
                });
                sourceMap.set(normalizedId, sources.length - 1);
            });
        }
        
        // Check for additional locations where GroundX might store sources
        
        // Check if sources are in answer.searchResults
        if (sources.length === 0 && answer?.searchResults?.sources) {
            const srSources = answer.searchResults.sources;
            if (Array.isArray(srSources)) {
                srSources.forEach((source: any, index: number) => {
                    const normalizedId = normalizeDocId(source.id?.toString() || `doc-${index}`);
                    sources.push({
                        id: source.id || `doc-${index}`,
                        fileName: source.fileName || source.name || `Document ${source.id || index}`,
                        excerpts: [],
                        snippets: source.snippets || [],
                        narrative: [],
                        metadata: source.metadata || {},
                        score: source.score
                    });
                    sourceMap.set(normalizedId, sources.length - 1);
                });
            }
        }
        
        // Check if sources are in answer.result.searchResults
        if (sources.length === 0 && answer?.result?.searchResults?.sources) {
            const srSources = answer.result.searchResults.sources;
            if (Array.isArray(srSources)) {
                srSources.forEach((source: any, index: number) => {
                    const normalizedId = normalizeDocId(source.id?.toString() || `doc-${index}`);
                    sources.push({
                        id: source.id || `doc-${index}`,
                        fileName: source.fileName || source.name || `Document ${source.id || index}`,
                        excerpts: [],
                        snippets: source.snippets || [],
                        narrative: [],
                        metadata: source.metadata || {},
                        score: source.score
                    });
                    sourceMap.set(normalizedId, sources.length - 1);
                });
            }
        }
        
        // Check for sources directly in answer.sources (some API formats)
        if (sources.length === 0 && answer?.sources) {
            const answerSources = Array.isArray(answer.sources) ? answer.sources : [answer.sources];
            answerSources.forEach((source: any, index: number) => {
                const normalizedId = normalizeDocId(source.id?.toString() || `doc-${index}`);
                sources.push({
                    id: source.id || `doc-${index}`,
                    fileName: source.fileName || source.name || `Document ${source.id || index}`,
                    excerpts: [],
                    snippets: source.snippets || [],
                    narrative: [],
                    metadata: source.metadata || {},
                    score: source.score
                });
                sourceMap.set(normalizedId, sources.length - 1);
            });
        }
        
        // Check for sources in "raw response" object that might be nested differently
        if (sources.length === 0 && answer?.rawResponse?.searchResults?.sources) {
            const rawSources = answer.rawResponse.searchResults.sources;
            if (Array.isArray(rawSources)) {
                rawSources.forEach((source: any, index: number) => {
                    const normalizedId = normalizeDocId(source.id?.toString() || `doc-${index}`);
                    sources.push({
                        id: source.id || `doc-${index}`,
                        fileName: source.fileName || source.name || `Document ${source.id || index}`,
                        excerpts: [],
                        snippets: source.snippets || [],
                        narrative: [],
                        metadata: source.metadata || {},
                        score: source.score
                    });
                    sourceMap.set(normalizedId, sources.length - 1);
                });
            }
        }
        
        // If we still have no sources but we have a searchResults object as a string
        // that might contain JSON, try to parse it
        if (sources.length === 0 && answer?.searchResults && typeof answer.searchResults === 'string') {
            try {
                const parsedSearchResults = JSON.parse(answer.searchResults);
                if (parsedSearchResults.sources && Array.isArray(parsedSearchResults.sources)) {
                    parsedSearchResults.sources.forEach((source: any, index: number) => {
                        const normalizedId = normalizeDocId(source.id?.toString() || `doc-${index}`);
                        sources.push({
                            id: source.id || `doc-${index}`,
                            fileName: source.fileName || source.name || `Document ${source.id || index}`,
                            excerpts: [],
                            snippets: source.snippets || [],
                            narrative: [],
                            metadata: source.metadata || {},
                            score: source.score
                        });
                        sourceMap.set(normalizedId, sources.length - 1);
                    });
                }
            } catch (e) {
                // Ignore parsing errors
                console.log('Error parsing searchResults string:', e);
            }
        }
        
        return sources;
    };

    // Get excerpts from a source - unified access to different excerpt formats
    const getSourceExcerpts = (source: Source | DocumentExcerpt): string[] => {
        // Combine all possible excerpt fields
        return [
            ...(source.excerpts || []),
            ...(source.snippets || []),
            ...(source.narrative || [])
        ].filter(Boolean); // Remove empty values
    };

    // Sort sources by score (if available)
    const getSortedSources = (sources: Source[]): Source[] => {
        // Create a copy to avoid modifying the original
        const sortedSources = [...sources];
        
        // Sort by score descending, if score is available
        return sortedSources.sort((a, b) => {
            if (a.score !== undefined && b.score !== undefined) {
                return b.score - a.score;
            }
            return 0;
        });
    };

    // Format thoughts with markdown styling
    const formatThoughts = (thoughts: string): string => {
        if (!thoughts) return '';
        
        // Check if the thoughts are already in JSON format
        try {
            const parsedThoughts = JSON.parse(thoughts);
            return JSON.stringify(parsedThoughts, null, 2);
        } catch {
            // If it's not valid JSON, return as is
            return thoughts;
        }
    };
    
    // Animations
    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { 
            opacity: 1, 
            y: 0,
            transition: { 
                duration: 0.4,
                ease: "easeOut"
            }
        },
        selected: {
            scale: 1.005,
            boxShadow: "0 4px 20px rgba(79, 70, 229, 0.15)",
            borderColor: "rgb(147, 51, 234)",
            transition: {
                duration: 0.2,
                ease: "easeInOut"
            }
        }
    };

    const buttonVariants = {
        initial: { scale: 1 },
        hover: { scale: 1.1 },
        tap: { scale: 0.95 }
    };

    const citationButtonVariants = {
        initial: { 
            backgroundColor: "rgb(219, 234, 254)",
            color: "rgb(30, 64, 175)" 
        },
        hover: { 
            backgroundColor: "rgb(191, 219, 254)",
            y: -2,
            transition: {
                duration: 0.2
            }
        },
        tap: { 
            scale: 0.95,
            y: 0
        }
    };

    const contentExpandAnimation = {
        collapsed: { 
            height: 0, 
            opacity: 0,
            transition: {
                height: { duration: 0.3 },
                opacity: { duration: 0.2 }
            }
        },
        expanded: { 
            height: "auto", 
            opacity: 1,
            transition: {
                height: { duration: 0.3 },
                opacity: { duration: 0.3, delay: 0.1 }
            }
        }
    };

    const tabAnimation = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 }
    };

    // Check if we have any RAG results from any source
    const allSources = getAllSources();
    const hasRagResults = allSources.length > 0;
    
    // Process sources for display
    const sortedSources = getSortedSources(allSources);

    // Get thoughts from GroundX response
    const thoughtsContent = extractThoughts(answer);
    const hasThoughts = thoughtsContent.length > 0 && thoughtsContent !== 'No thought process information available';
    
    // Get search insights from GroundX response
    const searchInsights = extractSearchInsights(answer);
    const hasSearchInsights = searchInsights !== null;

    // Determines if we should show the excerpt panel
    const currentExcerpt = showDocExcerpt 
        ? findDocumentExcerpt(showDocExcerpt) || 
          allSources.find(s => 
              normalizeDocId(s.id.toString()) === normalizeDocId(showDocExcerpt) && 
              (getSourceExcerpts(s).length > 0)
          )
        : null;

    // Detect if we're using GroundX vs Azure by checking for specific properties
    // IMPORTANT: We'll always treat it as GroundX if coming from the RAG API endpoint
    // This solves the issue of GroundX responses being formatted like Azure responses
    const isGroundX = true; // Force GroundX mode
    
    // Backup detection logic for future reference:
    // const isGroundX = answer?.documents || 
    //                  answer?.result?.documents ||
    //                  answer?.rawResponse?.documents ||
    //                  thoughtsContent !== 'No thought process information available' ||
    //                  hasSearchInsights ||
    //                  (searchResults?.sources?.some(s => s.id?.toString()?.startsWith('groundx:') || s.snippets)) ||
    //                  (documentExcerpts?.some(d => d.id?.startsWith('groundx:') || d.snippets)) ||
    //                  // Additional checks for GroundX-specific properties
    //                  answer?.enhancedResults ||
    //                  answer?.result?.enhancedResults ||
    //                  answer?.searchResults ||
    //                  answer?.result?.searchResults;

    // Helper function to get the response format string for display
    const getResponseFormat = () => {
        if (isGroundX) {
            return 'GroundX RAG';
        }
        if (hasRagResults) {
            return 'Azure RAG';
        }
        return 'Standard';
    };

    // Get the total token count used (if available)
    const getTokenInfo = () => {
        const result = answer?.result || answer?.rawResponse?.result || answer;
        
        if (result?.tokenUsage) {
            return {
                total: result.tokenUsage.total,
                input: result.tokenUsage.input,
                output: result.tokenUsage.output
            };
        }
        
        return null;
    };

    const tokenInfo = getTokenInfo();

    return (
        <motion.div
            initial="hidden"
            animate={isSelected ? "selected" : "visible"}
            variants={containerVariants}
            className={`p-5 bg-gray-50 rounded-lg shadow-sm border border-gray-200 ${
                isSelected ? 'border-purple-500' : 'border-transparent'
            }`}
            layoutId={`answer-${index}`}
        >
            <div className="flex justify-between items-center mb-3">
                <motion.div 
                    className="text-2xl text-purple-600 flex items-center"
                    initial={{ rotate: -5 }}
                    animate={{ rotate: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mr-2">
                        <path
                            d="M2.5 0.5V0H3.5V0.5C3.5 1.60457 4.39543 2.5 5.5 2.5H6V3V3.5H5.5C4.39543 3.5 3.5 4.39543 3.5 5.5V6H3H2.5V5.5C2.5 4.39543 1.60457 3.5 0.5 3.5H0V3V2.5H0.5C1.60457 2.5 2.5 1.60457 2.5 0.5Z"
                            fill="currentColor"
                        />
                        <path
                            d="M14.5 4.5V5H13.5V4.5C13.5 3.94772 13.0523 3.5 12.5 3.5H12V3V2.5H12.5C13.0523 2.5 13.5 2.05228 13.5 1.5V1H14H14.5V1.5C14.5 2.05228 14.9477 2.5 15.5 2.5H16V3V3.5H15.5C14.9477 3.5 14.5 3.94772 14.5 4.5Z"
                            fill="currentColor"
                        />
                        <path
                            d="M8.40706 4.92939L8.5 4H9.5L9.59294 4.92939C9.82973 7.29734 11.7027 9.17027 14.0706 9.40706L15 9.5V10.5L14.0706 10.5929C11.7027 10.8297 9.82973 12.7027 9.59294 15.0706L9.5 16H8.5L8.40706 15.0706C8.17027 12.7027 6.29734 10.8297 3.92939 10.5929L3 10.5V9.5L3.92939 9.40706C6.29734 9.17027 8.17027 7.29734 8.40706 4.92939Z"
                            fill="currentColor"
                        />
                    </svg>
                    {isGroundX && (
                        <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold flex items-center"
                        >
                            <Sparkles size={12} className="mr-1" />
                            GroundX
                        </motion.span>
                    )}
                </motion.div>
                
                <div className="flex items-center gap-2">
                    <motion.button
                        variants={buttonVariants}
                        initial="initial"
                        whileHover="hover"
                        whileTap="tap"
                        title={isCopied ? "Copied!" : "Copy to clipboard"} 
                        onClick={handleClipboardIconClick} 
                        className="p-2 rounded-full hover:bg-blue-100 text-blue-600 transition-colors relative"
                    >
                        <AnimatePresence mode="wait">
                            {isCopied ? (
                                <motion.div
                                    key="check"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <ClipboardCheck size={18} />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="copy"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <ClipboardCopy size={18} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                        
                        {/* Toast notification */}
                        <AnimatePresence>
                            {isCopied && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap"
                                >
                                    Copied to clipboard!
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.button>

                    <motion.button
                        variants={buttonVariants}
                        initial="initial"
                        whileHover="hover"
                        whileTap="tap"
                        title="Show Thought Process" 
                        onClick={() => {
                            setActiveTab('thought-process');
                            onThoughtProcessClicked();
                        }}
                        className={`p-2 rounded-full transition-colors ${
                            hasThoughts 
                                ? 'hover:bg-yellow-100 text-yellow-600' 
                                : 'text-gray-400 cursor-not-allowed'
                        }`}
                        disabled={!hasThoughts}
                    >
                        <Lightbulb size={18} />
                    </motion.button>

                    <motion.button
                        variants={buttonVariants}
                        initial="initial"
                        whileHover="hover"
                        whileTap="tap"
                        title="Show Supporting Content" 
                        onClick={() => {
                            setActiveTab('sources');
                            onSupportingContentClicked();
                        }}
                        className={`p-2 rounded-full transition-colors ${
                            hasRagResults
                                ? 'hover:bg-purple-100 text-purple-600'
                                : 'text-gray-400 cursor-not-allowed'
                        }`}
                        disabled={!hasRagResults}
                    >
                        <ClipboardList size={18} />
                    </motion.button>

                    <motion.button
                        variants={buttonVariants}
                        initial="initial"
                        whileHover="hover"
                        whileTap="tap"
                        title="Toggle Debug" 
                        onClick={() => setDebugMode(!debugMode)} 
                        className="p-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors"
                    >
                        <Bug size={18} />
                    </motion.button>

                    <motion.button
                        variants={buttonVariants}
                        initial="initial"
                        whileHover="hover"
                        whileTap="tap"
                        onClick={() => setExpanded(!expanded)}
                        className="p-2 rounded-full hover:bg-gray-200 text-gray-600 transition-colors ml-1"
                    >
                        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </motion.button>
                </div>
            </div>

            {/* Tabs for different views */}
            {expanded && (
                <div className="mb-4 border-b border-gray-200">
                    <div className="flex space-x-2">
                        <button 
                            className={`px-3 py-2 text-sm font-medium ${
                                activeTab === 'answer' 
                                    ? 'text-indigo-600 border-b-2 border-indigo-600' 
                                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                            onClick={() => setActiveTab('answer')}
                        >
                            Answer
                        </button>
                        
                        {hasThoughts && (
                            <button 
                                className={`px-3 py-2 text-sm font-medium flex items-center ${
                                    activeTab === 'thought-process' 
                                        ? 'text-yellow-600 border-b-2 border-yellow-600' 
                                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                                onClick={() => setActiveTab('thought-process')}
                            >
                                <Lightbulb size={14} className="mr-1" />
                                Thought Process
                            </button>
                        )}
                        
                        {hasRagResults && (
                            <button 
                                className={`px-3 py-2 text-sm font-medium flex items-center ${
                                    activeTab === 'sources' 
                                        ? 'text-purple-600 border-b-2 border-purple-600' 
                                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                                onClick={() => setActiveTab('sources')}
                            >
                                <Database size={14} className="mr-1" />
                                Sources
                            </button>
                        )}
                        
                        <button 
                            className={`px-3 py-2 text-sm font-medium flex items-center ${
                                activeTab === 'raw' 
                                    ? 'text-gray-800 border-b-2 border-gray-800' 
                                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                            onClick={() => setActiveTab('raw')}
                        >
                            <Code size={14} className="mr-1" />
                            Raw Response
                        </button>
                    </div>
                </div>
            )}

            <AnimatePresence>
                {debugMode && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-blue-50 border border-blue-200 p-3 my-2 rounded overflow-auto max-h-[400px]"
                    >
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold">Debug Mode: ON</span>
                            <span className="text-sm text-blue-700">Format: {getResponseFormat()}</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 mb-3 text-xs bg-blue-100 p-2 rounded">
                            <div>
                                <span className="font-semibold">Sources:</span> {allSources.length}
                            </div>
                            <div>
                                <span className="font-semibold">Has Thoughts:</span> {hasThoughts ? 'Yes' : 'No'}
                            </div>
                            <div>
                                <span className="font-semibold">Has Search Insights:</span> {hasSearchInsights ? 'Yes' : 'No'}
                            </div>
                            {tokenInfo && (
                                <>
                                    <div>
                                        <span className="font-semibold">Total Tokens:</span> {tokenInfo.total || 'N/A'}
                                    </div>
                                    <div>
                                        <span className="font-semibold">Input Tokens:</span> {tokenInfo.input || 'N/A'}
                                    </div>
                                    <div>
                                        <span className="font-semibold">Output Tokens:</span> {tokenInfo.output || 'N/A'}
                                    </div>
                                </>
                            )}
                        </div>
                        
                        <div className="mb-2 font-semibold">Answer Structure:</div>
                        <pre className="text-xs whitespace-pre-wrap mb-3 bg-white p-2 rounded border border-blue-100 max-h-40 overflow-auto">
                            {JSON.stringify(answer, null, 2)}
                        </pre>
                        
                        {hasRagResults && (
                            <>
                                <div className="font-semibold mt-2">RAG Document Sources:</div>
                                <pre className="text-xs whitespace-pre-wrap bg-white p-2 rounded border border-blue-100 max-h-40 overflow-auto">
                                    {JSON.stringify(allSources, null, 2)}
                                </pre>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {currentExcerpt && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-green-50 border border-green-200 p-4 my-3 rounded-lg"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center">
                                {getDocumentIcon(currentExcerpt.fileName || "document.pdf")}
                                <h3 className="ml-2 font-medium text-gray-800">
                                    {currentExcerpt.fileName || `Document ${currentExcerpt.id}`}
                                </h3>
                                
                                {currentExcerpt.score !== undefined && (
                                    <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
                                        Score: {(currentExcerpt.score * 100).toFixed(1)}%
                                    </span>
                                )}
                            </div>
                            <motion.button
                                variants={buttonVariants}
                                initial="initial"
                                whileHover="hover"
                                whileTap="tap"
                                onClick={() => setShowDocExcerpt(null)}
                                className="text-gray-500 hover:text-gray-700 p-1"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </motion.button>
                        </div>
                        
                        {/* Document ID */}
                        <div className="mb-3 text-xs text-gray-500">
                            Document ID: {currentExcerpt.id}
                        </div>
                        
                        {/* Document metadata if available */}
                        {currentExcerpt.metadata && Object.keys(currentExcerpt.metadata).length > 0 && (
                            <div className="mb-3 bg-green-100 p-2 rounded text-xs">
                                <div className="font-medium text-green-800 mb-1">Document Metadata:</div>
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                                    {Object.entries(currentExcerpt.metadata)
                                        .filter(([key, value]) => value !== undefined && value !== null && value !== '')
                                        .map(([key, value]) => (
                                            <div key={key} className="flex">
                                                <span className="font-medium text-green-700">{key}:</span>
                                                <span className="ml-1 text-green-900">{String(value)}</span>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        )}
                        
                        {/* Document narrative or summary */}
                        {currentExcerpt.narrative && currentExcerpt.narrative.length > 0 && (
                            <div className="mb-3">
                                <h4 className="text-sm font-medium text-gray-700 mb-1">Document Summary:</h4>
                                <div className="bg-white bg-opacity-50 border border-green-100 rounded p-2 text-sm">
                                    {currentExcerpt.narrative.map((item, i) => (
                                        <p key={i} className="mb-1 last:mb-0">{item}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Document excerpts - unified handling for all excerpt types */}
                        {(() => {
                            const allExcerpts = getSourceExcerpts(currentExcerpt);
                            return allExcerpts.length > 0 ? (
                                <div>
                                    <h4 className="text-sm font-medium text-gray-700 mb-1">
                                        {currentExcerpt.snippets ? 'Document Snippets:' : 'Document Excerpts:'}
                                    </h4>
                                    <div className="space-y-2">
                                        {allExcerpts.map((excerpt, i) => (
                                            <div key={i} className="bg-white rounded border border-green-100 p-2 text-sm">
                                                <div className="text-xs text-green-700 mb-1">
                                                    {currentExcerpt.snippets ? 'Snippet' : 'Excerpt'} {i+1}
                                                </div>
                                                <p>{excerpt}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-sm text-gray-600 italic">No excerpts available for this document.</div>
                            );
                        })()}
                        
                        <div className="mt-3 flex justify-end">
                            <motion.button
                                variants={buttonVariants}
                                initial="initial"
                                whileHover="hover"
                                whileTap="tap"
                                onClick={() => {
                                    setShowDocExcerpt(null);
                                    onCitationClicked(currentExcerpt.id.toString());
                                }}
                                className="bg-green-600 text-white text-sm px-3 py-1 rounded flex items-center"
                            >
                                <ExternalLink size={14} className="mr-1" />
                                View Full Document
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
                {expanded && (
                    <>
                        {/* Answer Content Tab */}
                        {activeTab === 'answer' && (
                            <motion.div
                                key="answer-tab"
                                variants={tabAnimation}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.3 }}
                            >
                                <div ref={contentRef} className="text-base font-normal leading-snug py-4">
                                    <div className="prose max-w-none">
                                        <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm]}>
                                            {content}
                                        </ReactMarkdown>
                                    </div>
                                    {isStreaming && (
                                        <motion.span 
                                            className="inline-block"
                                            animate={{ 
                                                opacity: [0.5, 1, 0.5],
                                            }}
                                            transition={{
                                                duration: 1.5,
                                                repeat: Infinity,
                                                ease: "easeInOut"
                                            }}
                                        >
                                            <span>...</span>
                                        </motion.span>
                                    )}
                                </div>
                            </motion.div>
                        )}
                        
                        {/* Thought Process Tab */}
                        {activeTab === 'thought-process' && hasThoughts && (
                            <motion.div
                                key="thought-tab"
                                variants={tabAnimation}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.3 }}
                                className="py-4"
                            >
                                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-lg font-medium text-yellow-800 flex items-center">
                                            <Lightbulb size={18} className="mr-2" />
                                            AI Thought Process
                                        </h3>
                                        
                                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                            GroundX Analysis
                                        </span>
                                    </div>
                                    
                                    <div className="bg-white rounded-md border border-yellow-100 p-3 overflow-auto max-h-96 text-sm font-mono">
                                        <pre className="whitespace-pre-wrap">{formatThoughts(thoughtsContent)}</pre>
                                    </div>
                                </div>
                                
                                {/* Show search insights if available */}
                                {hasSearchInsights && (
                                    <div className="mt-4">
                                        <button
                                            onClick={() => setShowSearchInsights(!showSearchInsights)}
                                            className="flex items-center justify-between w-full p-3 text-left bg-indigo-50 rounded-md border border-indigo-100 text-indigo-800"
                                        >
                                            <div className="flex items-center">
                                                <BarChart size={16} className="mr-2" />
                                                <span className="font-medium">Search Insights</span>
                                            </div>
                                            {showSearchInsights ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                        
                                        <AnimatePresence>
                                            {showSearchInsights && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.3 }}
                                                    className="mt-2 bg-white p-3 rounded-md border border-indigo-100"
                                                >
                                                    <pre className="text-xs whitespace-pre-wrap">
                                                        {JSON.stringify(searchInsights, null, 2)}
                                                    </pre>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </motion.div>
                        )}
                        
                        {/* Sources Tab */}
                        {activeTab === 'sources' && hasRagResults && (
                            <motion.div
                                key="sources-tab"
                                variants={tabAnimation}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.3 }}
                                className="py-4"
                            >
                                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-lg font-medium text-purple-800 flex items-center">
                                            <Database size={18} className="mr-2" />
                                            Referenced Documents
                                        </h3>
                                        
                                        <div className="flex gap-2">
                                            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full flex items-center">
                                                <FileText size={12} className="mr-1" />
                                                {sortedSources.length} Documents
                                            </span>
                                            
                                            {isGroundX && (
                                                <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full flex items-center">
                                                    <Sparkles size={12} className="mr-1" />
                                                    GroundX
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="mt-2 space-y-2">
                                        {sortedSources.map((source, index) => (
                                            <motion.div
                                                key={index}
                                                className="rounded-md border border-purple-100 overflow-hidden bg-white"
                                                initial={{ x: -10, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                transition={{ delay: index * 0.05 }}
                                            >
                                                <div 
                                                    className="flex items-center justify-between gap-2 text-sm p-3 hover:bg-purple-50 cursor-pointer"
                                                    onClick={() => toggleDocExpansion(source.id.toString())}
                                                >
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        {getDocumentIcon(source.fileName || "document.pdf")}
                                                        <span className="flex-1 truncate font-medium" title={source.fileName || source.title || `${source.id}`}>
                                                            {source.fileName || source.title || `Document ${source.id}`}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2">
                                                        {/* Show score if available */}
                                                        {source.score !== undefined && (
                                                            <span 
                                                                className="px-1.5 py-0.5 rounded-full bg-gray-100 text-xs text-gray-700 border border-gray-200 font-medium"
                                                                title={`Relevance score: ${source.score}`}
                                                            >
                                                                {(source.score * 100).toFixed(1)}%
                                                            </span>
                                                        )}
                                                        
                                                        {/* Expand/collapse control */}
                                                        {getSourceExcerpts(source).length > 0 ? (
                                                            expandedDocs.has(source.id.toString()) ? (
                                                                <ChevronUp size={14} className="text-gray-600" />
                                                            ) : (
                                                                <ChevronDown size={14} className="text-gray-600" />
                                                            )
                                                        ) : null}
                                                    </div>
                                                </div>
                                                
                                                {/* Expanded document preview */}
                                                <AnimatePresence>
                                                    {expandedDocs.has(source.id.toString()) && getSourceExcerpts(source).length > 0 && (
                                                        <motion.div
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: "auto" }}
                                                            exit={{ opacity: 0, height: 0 }}
                                                            className="border-t border-purple-100 bg-purple-50 p-3"
                                                        >
                                                            <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                                                {getSourceExcerpts(source).map((excerpt, i) => (
                                                                    <div key={i} className="p-2 bg-white text-sm rounded border border-purple-100">
                                                                        {excerpt}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            
                                                            <div className="flex justify-end mt-3 space-x-2">
                                                                <motion.button
                                                                    variants={buttonVariants}
                                                                    initial="initial"
                                                                    whileHover="hover"
                                                                    whileTap="tap"
                                                                    className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded flex items-center"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setShowDocExcerpt(source.id.toString());
                                                                    }}
                                                                >
                                                                    <FileQuestion size={12} className="mr-1" />
                                                                    View Details
                                                                </motion.button>
                                                                
                                                                <motion.button
                                                                    variants={buttonVariants}
                                                                    initial="initial"
                                                                    whileHover="hover"
                                                                    whileTap="tap"
                                                                    className="text-xs bg-purple-600 text-white px-2 py-1 rounded flex items-center"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onCitationClicked(source.id.toString());
                                                                    }}
                                                                >
                                                                    <ExternalLink size={12} className="mr-1" />
                                                                    Open Document
                                                                </motion.button>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                        ))}
                                    </div>
                                    
                                    {/* Summary statistics */}
                                    {sortedSources.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-purple-200 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <div className="bg-white rounded p-2 border border-purple-100 flex items-center">
                                                <div className="p-1.5 rounded-full bg-purple-100 mr-2">
                                                    <Database size={14} className="text-purple-700" />
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-500">Total Documents</div>
                                                    <div className="font-bold">{sortedSources.length}</div>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-white rounded p-2 border border-purple-100 flex items-center">
                                                <div className="p-1.5 rounded-full bg-green-100 mr-2">
                                                    <BarChart size={14} className="text-green-700" />
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-500">Top Score</div>
                                                    <div className="font-bold">
                                                        {sortedSources[0]?.score !== undefined 
                                                            ? `${(sortedSources[0].score * 100).toFixed(1)}%` 
                                                            : 'N/A'}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-white rounded p-2 border border-purple-100 flex items-center">
                                                <div className="p-1.5 rounded-full bg-blue-100 mr-2">
                                                    <Info size={14} className="text-blue-700" />
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-500">Source Format</div>
                                                    <div className="font-bold">{isGroundX ? 'GroundX' : 'Azure'}</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                        
                        {/* Raw Response Tab */}
                        {activeTab === 'raw' && (
                            <motion.div
                                key="raw-tab"
                                variants={tabAnimation}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.3 }}
                                className="py-4"
                            >
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-lg font-medium text-gray-800 flex items-center">
                                            <Code size={18} className="mr-2" />
                                            Raw Response Data
                                        </h3>
                                        
                                        <motion.button
                                            variants={buttonVariants}
                                            initial="initial"
                                            whileHover="hover"
                                            whileTap="tap"
                                            onClick={handleClipboardIconClick}
                                            className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded"
                                        >
                                            <ClipboardCopy size={16} />
                                        </motion.button>
                                    </div>
                                    
                                    <div className="bg-white rounded-md border border-gray-200 p-3 overflow-auto max-h-96 text-sm font-mono">
                                        <pre className="whitespace-pre-wrap">{JSON.stringify(answer, null, 2)}</pre>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </>
                )}
            </AnimatePresence>

            {!expanded && (
                <div className="text-center py-2">
                    <motion.button
                        onClick={() => setExpanded(true)}
                        className="text-purple-600 text-sm font-medium"
                        whileHover={{ scale: 1.05 }}
                    >
                        Show content
                    </motion.button>
                </div>
            )}

            {/* RAG Indicator */}
            <AnimatePresence>
                {hasRagResults && expanded && activeTab === 'answer' && !isStreaming && (
                    <motion.div 
                        className="mt-3 p-2 rounded-md border border-blue-100 bg-blue-50"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-blue-700 text-sm">
                                <Database size={14} />
                                <span>Answer enhanced with document knowledge</span>
                                <motion.span
                                    className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                                        isGroundX 
                                            ? 'bg-indigo-100 text-indigo-700' 
                                            : 'bg-blue-100 text-blue-700'
                                    }`}
                                    initial={{ scale: 0.8 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2, type: "spring" }}
                                >
                                    {isGroundX ? 'GroundX RAG' : 'RAG'}
                                </motion.span>
                            </div>
                            <motion.button
                                variants={buttonVariants}
                                initial="initial"
                                whileHover="hover"
                                whileTap="tap"
                                className="text-blue-700 text-sm hover:bg-blue-100 px-2 py-1 rounded-md flex items-center"
                                onClick={() => setActiveTab('sources')}
                            >
                                <Search size={12} className="mr-1" />
                                View sources
                                <ArrowRight size={12} className="ml-1" />
                            </motion.button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {citations.length > 0 && expanded && activeTab === 'answer' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.3 }}
                        className="mt-4"
                    >
                        <div className="flex items-center mb-2">
                            <span className="font-semibold leading-6 text-gray-700">Citations:</span>
                            <motion.div 
                                className="ml-2 h-[1px] bg-gray-200 flex-grow"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {citations.map((citation, i) => {
                                // Extract just the filename for display if it's a path
                                const displayText = citation.includes('/')
                                    ? citation.split('/').pop() || citation
                                    : citation.replace(/^(groundx:|azure:|gx:)/i, '');
                                
                                // Check if this citation matches the highlighted one
                                const isHighlighted = highlightCitation === citation;
                                
                                return (
                                    <motion.button
                                        key={i}
                                        variants={citationButtonVariants}
                                        initial="initial"
                                        whileHover="hover"
                                        whileTap="tap"
                                        className={`font-medium text-sm leading-6 text-center rounded px-2 py-1 ${
                                            isHighlighted ? 'bg-blue-200 border border-blue-300' : ''
                                        }`}
                                        title={`View ${citation}`}
                                        onClick={() => {
                                            setHighlightCitation(citation);
                                            onCitationClicked(citation);
                                        }}
                                    >
                                        {`${i + 1}. ${displayText}`}
                                    </motion.button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showFollowupQuestions && followupQuestions.length > 0 && onFollowupQuestionClicked && expanded && activeTab === 'answer' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                        className="mt-4"
                    >
                        <div className="flex items-center mb-2">
                            <span className="font-semibold leading-6 text-gray-700">Follow-up questions:</span>
                            <motion.div 
                                className="ml-2 h-[1px] bg-gray-200 flex-grow"
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: 1 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {followupQuestions.map((question: string, i: number) => (
                                <motion.button
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ 
                                        opacity: 1, 
                                        y: 0,
                                        transition: { delay: 0.1 + (i * 0.1) } 
                                    }}
                                    whileHover={{ y: -2, backgroundColor: "rgb(224, 231, 255)" }}
                                    whileTap={{ y: 0 }}
                                    className="font-medium text-sm leading-6 text-center rounded px-2 py-1 bg-indigo-50 text-indigo-800 transition-colors"
                                    title={question}
                                    onClick={() => onFollowupQuestionClicked?.(question)}
                                >
                                    {question}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Token Usage Information (if available) */}
            {tokenInfo && expanded && activeTab === 'raw' && (
                <div className="mt-4 p-3 bg-gray-100 rounded-md border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                        <Settings size={14} className="mr-1" />
                        Token Usage Statistics
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="bg-white p-2 rounded border border-gray-200">
                            <div className="text-xs text-gray-500">Input Tokens</div>
                            <div className="font-bold">{tokenInfo.input?.toLocaleString() || 'N/A'}</div>
                        </div>
                        <div className="bg-white p-2 rounded border border-gray-200">
                            <div className="text-xs text-gray-500">Output Tokens</div>
                            <div className="font-bold">{tokenInfo.output?.toLocaleString() || 'N/A'}</div>
                        </div>
                        <div className="bg-white p-2 rounded border border-gray-200">
                            <div className="text-xs text-gray-500">Total Tokens</div>
                            <div className="font-bold">{tokenInfo.total?.toLocaleString() || 'N/A'}</div>
                        </div>
                    </div>
                    
                    {/* Progress bar for token usage visualization */}
                    {tokenInfo.input && tokenInfo.output && (
                        <div className="mt-2">
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-blue-500"
                                    style={{ 
                                        width: `${(tokenInfo.input / (tokenInfo.input + tokenInfo.output)) * 100}%`,
                                        borderRight: '1px solid white'
                                    }}
                                ></div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Input: {Math.round((tokenInfo.input / (tokenInfo.input + tokenInfo.output)) * 100)}%</span>
                                <span>Output: {Math.round((tokenInfo.output / (tokenInfo.input + tokenInfo.output)) * 100)}%</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}