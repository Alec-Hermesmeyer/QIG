// EnhancedSupportingContent.tsx
import React, { useState, useEffect } from 'react';
import { FileText, Image as ImageIcon, CornerLeftUp, ChevronDown, ChevronUp, ExternalLink, Search, Filter, Info, Link, Copy, Check, Eye, EyeOff, Database, Sparkles, BookOpen, BarChart } from 'lucide-react';
import DOMPurify from "dompurify";

interface ParsedSupportingContentItem {
  id?: string;
  title: string;
  content: string;
  source?: string;
  fullText?: string;
  relevanceScore?: number;
  pageNumber?: string;
  section?: string;
  citations?: {
    text: string;
    page?: string;
    section?: string;
  }[];
  // Enhanced properties for GroundX
  pageImages?: string[];
  metadata?: {
    keywords?: string[] | string;
    summary?: string;
    [key: string]: any;
  };
  narrative?: string[];
  score?: number;
  snippets?: string[];
  fileName?: string;
  name?: string;
  isGroundX?: boolean;
}

function parseSupportingContentItem(item: string | any): ParsedSupportingContentItem {
  // Handle different formats of content items
  if (typeof item !== 'string' && typeof item === 'object') {
    const isGroundX = item.id?.toString()?.startsWith('groundx:') || 
                     !!item.snippets || 
                     !!item.metadata?.groundx;
                     
    // This is likely an enhanced result object from your API
    return {
      id: item.id?.toString() || undefined,
      title: String(item.fileName || item.name || item.title || 'Unknown Document'),
      content: String(item.text || item.content || ''),
      source: String(item.source || ''),
      pageNumber: String(item.pageNumber || (item.metadata && item.metadata.page) || ''),
      section: String(item.section || (item.metadata && item.metadata.section) || ''),
      relevanceScore: Number(item.score || 0),
      pageImages: Array.isArray(item.pageImages) ? item.pageImages : [],
      metadata: item.metadata || {},
      narrative: Array.isArray(item.narrative) ? item.narrative : [],
      score: Number(item.score || 0),
      snippets: Array.isArray(item.snippets) ? item.snippets : [],
      fileName: String(item.fileName || item.name || ''),
      name: String(item.name || item.fileName || ''),
      isGroundX
    };
  }
  
  if (typeof item !== 'string') {
    return {
      title: 'Unknown',
      content: 'Invalid content format',
    };
  }
  
  // Check if item follows the pattern "filename.ext: content"
  const colonMatch = item.match(/^([\w\s-]+\.(pdf|docx|xlsx|txt|csv|json|js|html))\s*:\s*(.+)$/s);
  if (colonMatch) {
    const title = colonMatch[1];
    const content = colonMatch[3];
    
    // Extract metadata from content
    const metadata = extractMetadata(content);
    const citations = extractCitations(content);
    
    return {
      title,
      content: DOMPurify.sanitize(content),
      source: formatSourceInfo(metadata),
      pageNumber: metadata.pageNumber,
      section: metadata.section,
      citations
    };
  }
  
  // Check for citation format [filename.ext]
  const citationMatch = item.match(/\[([\w\s-]+\.(pdf|docx|xlsx|txt|csv|json|js|html))\]/i);
  if (citationMatch) {
    // Remove the citation from the content
    const title = citationMatch[1];
    const content = item.replace(citationMatch[0], '').trim();
    
    // Extract metadata from content
    const metadata = extractMetadata(content);
    const citations = extractCitations(content);
    
    return {
      title,
      content: DOMPurify.sanitize(content),
      source: formatSourceInfo(metadata),
      pageNumber: metadata.pageNumber,
      section: metadata.section,
      citations
    };
  }
  
  // If no recognizable format, use a generic title
  const metadata = extractMetadata(item);
  const citations = extractCitations(item);
  return {
    title: "Document Reference",
    content: DOMPurify.sanitize(item),
    source: formatSourceInfo(metadata),
    pageNumber: metadata.pageNumber,
    section: metadata.section,
    citations
  };
}

// Function to extract citations from content
function extractCitations(content: string | any) {
  const citations: {
    text: string;
    page?: string;
    section?: string;
  }[] = [];

  // Check if the content is actually a string
  if (typeof content !== 'string') {
    content = String(content || '');
  }

  // Pattern for [Page X] or [p. X] citations
  const pagePatterns = [
    /\[(Page|p\.|pg\.) (\d+[-–—]?\d*)\]/gi,
    /\[(\d+[-–—]?\d*)\]/gi // Just numbers in brackets might be page references
  ];

  for (const pattern of pagePatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const text = match[0];
      const page = match[2] || match[1]; // Different group depending on pattern
      
      citations.push({
        text,
        page
      });
    }
  }
  
  // Pattern for [Section X.X] citations
  const sectionPattern = /\[(Section|Sec\.?) ([0-9.]+|[IVX]+\.[A-Z])\]/gi;
  let match;
  while ((match = sectionPattern.exec(content)) !== null) {
    citations.push({
      text: match[0],
      section: match[2]
    });
  }
  
  // Pattern for [Document Name] citations
  const documentPattern = /\[([\w\s-]+\.(pdf|docx|xlsx|txt|csv|json|js|html))\]/gi;
  while ((match = documentPattern.exec(content)) !== null) {
    citations.push({
      text: match[0]
    });
  }
  
  // Pattern for [Document Name, Page X] combined citations
  const combinedPattern = /\[([\w\s-]+\.(pdf|docx|xlsx|txt|csv|json|js|html)),\s*(Page|p\.|pg\.) (\d+[-–—]?\d*)\]/gi;
  while ((match = combinedPattern.exec(content)) !== null) {
    citations.push({
      text: match[0],
      page: match[4]
    });
  }
  
  return citations;
}

// Function to extract various metadata from content
function extractMetadata(content: string | any) {
  const metadata: {
    pageNumber?: string;
    section?: string;
    paragraph?: string;
    line?: string;
  } = {};
  
  // Check if content is actually a string
  if (typeof content !== 'string') {
    content = String(content || '');
  }
  
  // Extract page numbers (various formats)
  const pagePatterns = [
    /\b(?:Page|p\.|pg\.)\s*(\d+[-–—]?\d*)\b/gi,
    /\b(?:Section|Sec\.?)\s*([0-9.]+|[IVX]+\.[A-Z])\b/gi,
    /\b(?:Paragraph|Para\.?)\s*(\d+)\b/gi,
    /\b(?:Line|Ln\.?)\s*(\d+)\b/gi
  ];
  
  for (const pattern of pagePatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const type = match[0].toLowerCase();
      const value = match[1];
      
      if (type.includes('page')) {
        metadata.pageNumber = value;
      } else if (type.includes('section')) {
        metadata.section = value;
      } else if (type.includes('paragraph')) {
        metadata.paragraph = value;
      } else if (type.includes('line')) {
        metadata.line = value;
      }
    }
  }
  
  return metadata;
}

function formatSourceInfo(metadata: any): string | undefined {
  const parts = [];
  
  if (metadata.pageNumber) {
    parts.push(`Page ${metadata.pageNumber}`);
  }
  
  if (metadata.section) {
    parts.push(`Section ${metadata.section}`);
  }
  
  if (metadata.paragraph) {
    parts.push(`Paragraph ${metadata.paragraph}`);
  }
  
  if (metadata.line) {
    parts.push(`Line ${metadata.line}`);
  }
  
  return parts.length > 0 ? parts.join(', ') : undefined;
}

// Helper function to format document text with highlights and citations
function formatDocumentText(
  content: string | any, 
  highlightTerms: string[] = [], 
  citations: {text: string, page?: string, section?: string}[] = []
): string {
  // Ensure content is a string
  if (typeof content !== 'string') {
    content = String(content || '');
  }
  
  // Ensure highlightTerms is an array of strings
  highlightTerms = Array.isArray(highlightTerms) ? highlightTerms : [];
  
  // Ensure citations is an array of valid citation objects
  citations = Array.isArray(citations) ? citations.filter(citation => 
    citation && typeof citation === 'object' && typeof citation.text === 'string'
  ) : [];
  
  let formattedContent = content;
  
  // Replace citation patterns with clickable spans
  if (citations.length > 0) {
    citations.forEach((citation, index) => {
      const citationId = `citation-${index}`;
      // Fix: Add empty string fallbacks for page and section
      const pageAttr = citation.page || '';
      const sectionAttr = citation.section || '';
      
      const citationHtml = `<span class="citation-link" data-citation-id="${citationId}" data-page="${pageAttr}" data-section="${sectionAttr}">${citation.text}</span>`;
      
      // Use string split and join to avoid regex issues
      formattedContent = formattedContent.split(citation.text).join(citationHtml);
    });
  }
  
  // Apply text formatting for highlighted terms
  if (highlightTerms.length > 0) {
    const regex = new RegExp(`(${highlightTerms.join('|')})`, 'gi');
    formattedContent = formattedContent.replace(regex, '<mark>$1</mark>');
  }
  
  // Preserve paragraph breaks
  formattedContent = formattedContent
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  if (!formattedContent.startsWith('<p>')) {
    formattedContent = `<p>${formattedContent}</p>`;
  }
  
  return DOMPurify.sanitize(formattedContent, { ADD_ATTR: ['data-citation-id', 'data-page', 'data-section'] });
}

// Generate a citation text for copying
function generateCitationText(item: ParsedSupportingContentItem): string {
  const parts: string[] = [];
  
  // Add title if available
  if (item.title) {
    parts.push(String(item.title));
  }
  
  // Add page number if available
  if (item.pageNumber) {
    parts.push(`Page ${String(item.pageNumber)}`);
  }
  
  // Add section if available
  if (item.section) {
    parts.push(`Section ${String(item.section)}`);
  }
  
  // Add content preview if available
  if (item.content) {
    // Truncate content to a reasonable length for citation
    const maxContentLength = 150;
    const contentPreview = String(item.content).length > maxContentLength 
      ? String(item.content).substring(0, maxContentLength) + '...' 
      : String(item.content);
    
    parts.push(`"${contentPreview}"`);
  }
  
  return parts.join(', ');
}

// Extract key concepts from content items
function extractKeyTerms(items: ParsedSupportingContentItem[], maxTerms: number = 10): string[] {
  // Combine all content
  const allContent = items.map(item => {
    // Include snippets if available
    if (item.snippets && item.snippets.length > 0) {
      return [...item.snippets, item.content].join(' ');
    }
    return item.content;
  }).join(' ');
  
  // Remove common words and only keep words with 4+ characters
  const commonWords = new Set(['the', 'and', 'that', 'this', 'with', 'for', 'from', 'shall', 'have', 'been', 'will', 'not', 'its']);
  const words = allContent.toLowerCase().split(/\W+/).filter(word => 
    word.length > 3 && !commonWords.has(word)
  );
  
  // Count word frequency
  const wordCounts = new Map<string, number>();
  words.forEach(word => {
    wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
  });
  
  // Sort by frequency and return top terms
  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTerms)
    .map(entry => entry[0]);
}

// Process GroundX raw documents into supporting content
function processGroundXDocuments(documents: any[]): ParsedSupportingContentItem[] {
  if (!Array.isArray(documents)) return [];
  
  return documents.map(doc => ({
    id: doc.id?.toString(),
    title: doc.fileName || doc.name || `Document ${doc.id}`,
    content: doc.text || doc.content || '',
    snippets: doc.snippets || [],
    score: doc.score,
    metadata: doc.metadata || {},
    narrative: doc.narrative || [],
    fileName: doc.fileName || doc.name || '',
    name: doc.name || doc.fileName || '',
    isGroundX: true
  }));
}

interface Props {
  supportingContent: any;
  onFileClick?: (filename: string) => void;
  onCitationClick?: (citation: {text: string, page?: string, section?: string, documentTitle?: string}) => void;
  highlightTerms?: string[];
  maxPreviewLength?: number;
  useAutoHighlighting?: boolean;
  enhancedResults?: any; // For direct integration with your existing structure
  // Additional props for GroundX support
  groundXDocuments?: any[];
  rawResponse?: any;
}

export const EnhancedSupportingContent: React.FC<Props> = ({ 
  supportingContent, 
  onFileClick,
  onCitationClick,
  highlightTerms = [],
  maxPreviewLength = 300,
  useAutoHighlighting = true,
  enhancedResults = null,
  groundXDocuments = null,
  rawResponse = null
}) => {
  // State
  const [expandedItems, setExpandedItems] = useState<{[key: string]: boolean}>({});
  const [expandedDetails, setExpandedDetails] = useState<{[key: string]: boolean}>({});
  const [filteredItems, setFilteredItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSection, setShowSection] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [copiedItemIndex, setCopiedItemIndex] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'score' | 'alpha'>('score');
  
  // Check if we're using GroundX format
  const isGroundX = React.useMemo(() => {
    if (groundXDocuments) return true;
    if (rawResponse?.result?.documents) return true;
    if (supportingContent?.documents && supportingContent.documents.some((d: any) => d.id?.toString().startsWith('groundx:'))) return true;
    if (enhancedResults?.sources && enhancedResults.sources.some((s: any) => s.id?.toString().startsWith('groundx:'))) return true;
    return false;
  }, [supportingContent, enhancedResults, groundXDocuments, rawResponse]);
  
  // Process different possible formats of supporting content
  const { textItems, imageItems, parsedItems } = React.useMemo(() => {
    // Handle no content case
    if (!supportingContent && !enhancedResults && !groundXDocuments && !rawResponse) {
      return { textItems: [], imageItems: [], parsedItems: [] };
    }
    
    let textItems: any[] = [];
    let imageItems: string[] = [];
    let parsedItems: ParsedSupportingContentItem[] = [];
    
    // Check for GroundX documents in specific field
    if (groundXDocuments && Array.isArray(groundXDocuments)) {
      parsedItems = processGroundXDocuments(groundXDocuments);
      return { textItems: groundXDocuments, imageItems, parsedItems };
    }
    
    // Check for GroundX documents in raw response
    if (rawResponse?.result?.documents) {
      parsedItems = processGroundXDocuments(rawResponse.result.documents);
      return { textItems: rawResponse.result.documents, imageItems, parsedItems };
    }
    
    // Check for GroundX documents in supportingContent
    if (supportingContent?.documents && Array.isArray(supportingContent.documents)) {
      parsedItems = processGroundXDocuments(supportingContent.documents);
      return { textItems: supportingContent.documents, imageItems, parsedItems };
    }
    
    // Handle the enhanced results format (from your proof of concept)
    if (enhancedResults && enhancedResults.sources && enhancedResults.sources.length > 0) {
      return {
        textItems: enhancedResults.sources,
        imageItems: [],
        parsedItems: enhancedResults.sources.map((source: any) => parseSupportingContentItem(source))
      };
    }
    
    // Handle the original supportingContent format
    if (supportingContent) {
      // Handle the specific format from your API: {text: ["file.pdf: content", "file2.pdf: content"]}
      if (supportingContent.text && Array.isArray(supportingContent.text)) {
        textItems = supportingContent.text;
        imageItems = supportingContent.images || [];
      }
      // Handle array of strings
      else if (Array.isArray(supportingContent)) {
        textItems = supportingContent.filter(item => typeof item === 'string');
      }
      // Handle single string
      else if (typeof supportingContent === 'string') {
        textItems = [supportingContent];
      }
      // Handle object with text/images properties but not in the specific format above
      else if (typeof supportingContent === 'object' && supportingContent !== null) {
        // Extract from various possible formats
        Object.entries(supportingContent).forEach(([key, value]) => {
          if (key === 'text' && !Array.isArray(value)) {
            textItems.push(String(value));
          } else if (key.endsWith('.pdf') || key.endsWith('.docx') || key.endsWith('.txt')) {
            if (typeof value === 'string') {
              textItems.push(`${key}: ${value}`);
            }
          }
        });
      }
    }
    
    // Parse all text items
    parsedItems = textItems.map(parseSupportingContentItem);
    
    return { textItems, imageItems, parsedItems };
  }, [supportingContent, enhancedResults, groundXDocuments, rawResponse]);

  // Extract auto-highlight terms if enabled
  const autoHighlightTerms = React.useMemo(() => {
    if (!useAutoHighlighting) return [];
    return extractKeyTerms(parsedItems);
  }, [parsedItems, useAutoHighlighting]);
  
  // Combine user-provided highlight terms with auto-generated ones
  const allHighlightTerms = [...new Set([...highlightTerms, ...autoHighlightTerms])];
  
  // Filter and sort items based on search query and sort criteria
  const processedTextItems = React.useMemo(() => {
    let filtered = [...textItems];
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter((item: any, index: number): boolean => {
        const parsed: ParsedSupportingContentItem = parsedItems[index];
        let content: string = '';
        
        // Handle different item types for searching
        if (typeof item === 'string') {
          content = item.toLowerCase();
        } else if (item && typeof item === 'object') {
          // For enhanced results objects
          content = [
            item.fileName || item.name || '',
            item.text || item.content || '',
            item.narrative ? item.narrative.join(' ') : '',
            (item.snippets || []).join(' '),
            item.metadata ? JSON.stringify(item.metadata) : ''
          ].join(' ').toLowerCase();
        }
        
        return content.includes(searchQuery.toLowerCase());
      });
    }
    
    // Apply section filter if active
    if (activeFilter) {
      filtered = filtered.filter((item: any, index: number): boolean => {
        const parsed: ParsedSupportingContentItem = parsedItems[textItems.indexOf(item)];
        
        if (activeFilter === 'hasSection' && !parsed.section) return false;
        if (activeFilter === 'hasPage' && !parsed.pageNumber) return false;
        if (activeFilter === 'hasImages' && (!parsed.pageImages || parsed.pageImages.length === 0)) return false;
        if (activeFilter === 'hasSnippets' && (!parsed.snippets || parsed.snippets.length === 0)) return false;
        
        return true;
      });
    }
    
    // Sort the filtered items
    return filtered.sort((a: any, b: any) => {
      const aIndex = textItems.indexOf(a);
      const bIndex = textItems.indexOf(b);
      const aParsed = parsedItems[aIndex];
      const bParsed = parsedItems[bIndex];
      
      if (sortBy === 'score') {
        // Sort by score (highest first)
        const aScore = aParsed.score || 0;
        const bScore = bParsed.score || 0;
        return bScore - aScore;
      } else {
        // Sort alphabetically by title
        return aParsed.title.localeCompare(bParsed.title);
      }
    });
  }, [textItems, parsedItems, searchQuery, activeFilter, sortBy]);

  // Toggle expanded state for an item
  const toggleExpanded = (index: number) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Toggle details expanded state
  const toggleDetails = (index: number) => {
    setExpandedDetails(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Handle file click
  const handleFileClick = (filename: string, id?: string) => {
    if (onFileClick) {
      // If it's a GroundX document, prefer the ID
      onFileClick(id || filename);
    }
  };

  // Handle citation click
  const handleCitationClick = (citation: {text: string, page?: string, section?: string}, documentTitle: string) => {
    if (onCitationClick) {
      onCitationClick({
        ...citation,
        documentTitle
      });
    }
  };
  
  // Copy citation to clipboard
  const handleCopyCitation = (item: ParsedSupportingContentItem, index: number) => {
    const citationText = generateCitationText(item);
    navigator.clipboard.writeText(citationText).then(() => {
      setCopiedItemIndex(index);
      setTimeout(() => setCopiedItemIndex(null), 2000);
    });
  };
  
  // Group sections for navigation
  const sections = React.useMemo(() => {
    const sectionMap = new Map<string, number>();
    
    parsedItems.forEach((item: ParsedSupportingContentItem) => {
      if (item.section) {
        sectionMap.set(item.section, (sectionMap.get(item.section) || 0) + 1);
      }
    });
    
    return Array.from(sectionMap.entries())
      .sort((a, b) => {
        // Try to sort numerically if possible
        const aNum = parseFloat(a[0]);
        const bNum = parseFloat(b[0]);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return aNum - bNum;
        }
        return a[0].localeCompare(b[0]);
      });
  }, [parsedItems]);

  // Set up citation click handlers when content is rendered
  useEffect(() => {
    const setupCitationClickHandlers = () => {
      const citationElements = document.querySelectorAll('.citation-link');
      
      citationElements.forEach(element => {
        element.addEventListener('click', (e) => {
          e.preventDefault();
          const target = e.currentTarget as HTMLSpanElement;
          const page = target.getAttribute('data-page');
          const section = target.getAttribute('data-section');
          const text = target.textContent || '';
          const documentTitle = target.closest('[data-document-title]')?.getAttribute('data-document-title') || '';
          
          handleCitationClick({ text, page: page || undefined, section: section || undefined }, documentTitle);
        });
      });
    };
    
    // Run after the component has rendered
    setTimeout(setupCitationClickHandlers, 0);
    
    // Clean up event listeners
    return () => {
      const citationElements = document.querySelectorAll('.citation-link');
      citationElements.forEach(element => {
        element.removeEventListener('click', () => {});
      });
    };
  }, [processedTextItems, expandedItems, expandedDetails]);

  // Get a file icon based on extension
  const getFileIcon = (fileName: string) => {
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
        return <FileText size={16} className="text-green-600" />;
      case 'txt':
        return <FileText size={16} className="text-gray-600" />;
      case 'json':
      case 'js':
      case 'html':
        return <FileText size={16} className="text-yellow-600" />;
      default:
        return <BookOpen size={16} className="text-purple-600" />;
    }
  };

  return (
    <div className="supporting-content">
      <div className="flex justify-between items-center mb-4 px-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          {isGroundX ? (
            <>
              <Database size={18} className="mr-2 text-indigo-600" />
              GroundX Sources ({processedTextItems.length})
              <span className="ml-2 text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-semibold flex items-center">
                <Sparkles size={12} className="mr-1" />
                GroundX
              </span>
            </>
          ) : (
            <>
              <FileText size={18} className="mr-2 text-gray-600" />
              Supporting Content ({processedTextItems.length + imageItems.length})
            </>
          )}
        </h3>
        
        {/* Search and filter */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-2 py-1 text-sm border border-gray-300 rounded-md w-40"
            />
          </div>
          
          <div className="relative">
            <select 
              value={activeFilter || ''} 
              onChange={(e) => setActiveFilter(e.target.value || null)}
              className="py-1 pl-6 pr-2 text-sm border border-gray-300 rounded-md appearance-none"
            >
              <option value="">All Items</option>
              <option value="hasSection">Has Section</option>
              <option value="hasPage">Has Page</option>
              <option value="hasImages">Has Images</option>
              {isGroundX && <option value="hasSnippets">Has Snippets</option>}
            </select>
            <Filter size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          
          <div className="relative">
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as 'score' | 'alpha')}
              className="py-1 pl-6 pr-2 text-sm border border-gray-300 rounded-md appearance-none"
            >
              <option value="score">Sort by Relevance</option>
              <option value="alpha">Sort by Name</option>
            </select>
            <BarChart size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      </div>
      
      {/* Section navigation */}
      {sections.length > 0 && (
        <div className="mb-4 px-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            <Info size={14} className="mr-1" /> Jump to Section:
          </h4>
          <div className="flex flex-wrap gap-2">
            {sections.map(([section, count]) => (
              <button
                key={section}
                onClick={() => {
                  setActiveFilter('hasSection');
                  setSearchQuery(section);
                }}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-200 flex items-center"
              >
                {section} <span className="ml-1 text-gray-500">({count})</span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Content items */}
      <ul className="list-none p-0 m-0">
        {processedTextItems.map((item: any, index: number) => {
          const originalIndex = textItems.indexOf(item);
          const parsed: ParsedSupportingContentItem = parsedItems[originalIndex];
          const isExpanded = expandedItems[index] || false;
          const isDetailsExpanded = expandedDetails[index] || false;
          
          // Handle content display format based on item type
          let displayContent = '';
          let contentSource = null;
          let needsExpansion = false;
          
          if (isGroundX && parsed.snippets && parsed.snippets.length > 0) {
            // For GroundX snippets, show them instead of the full content
            contentSource = parsed.snippets;
            needsExpansion = parsed.snippets.length > 1;
            displayContent = needsExpansion && !isExpanded 
              ? parsed.snippets[0] 
              : parsed.snippets.join('\n\n');
          } else if (typeof item === 'string') {
            // Original string format
            contentSource = parsed.content;
            needsExpansion = parsed.content.length > maxPreviewLength;
            displayContent = needsExpansion && !isExpanded
              ? parsed.content.substring(0, maxPreviewLength) + '...'
              : parsed.content;
          } else if (item && typeof item === 'object') {
            // Enhanced results format
            const content = item.text || item.content || '';
            contentSource = content;
            needsExpansion = content.length > maxPreviewLength;
            displayContent = needsExpansion && !isExpanded
              ? content.substring(0, maxPreviewLength) + '...'
              : content;
          }
            
          // Format the content with appropriate styling and highlights
          const formattedContent = formatDocumentText(
            displayContent, 
            allHighlightTerms,
            parsed.citations
          );
          
          // Check for additional metadata
          const hasImages = parsed.pageImages && parsed.pageImages.length > 0;
          const hasMetadata = parsed.metadata && Object.keys(parsed.metadata).length > 0;
          const hasNarrative = parsed.narrative && parsed.narrative.length > 0;
          const hasSnippets = parsed.snippets && parsed.snippets.length > 0;
          
          return (
            <li 
              className="p-4 mb-3 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-lg overflow-hidden transition-all" 
              key={`supporting-content-text-${index}`}
              data-document-title={parsed.title}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="m-0 text-base font-semibold text-gray-700 flex items-center flex-wrap">
                  <button 
                    className="flex items-center text-gray-700 hover:text-blue-600"
                    onClick={() => handleFileClick(parsed.title, parsed.id)}
                  >
                    {getFileIcon(parsed.title)}
                    <span className="mx-2 truncate" title={parsed.title}>
                      {parsed.title}
                    </span>
                    <ExternalLink size={14} className="text-gray-400" />
                  </button>
                  
                  {/* GroundX indicator */}
                  {parsed.isGroundX && (
                    <span className="ml-2 text-xs text-indigo-600 py-0.5 px-2 bg-indigo-50 rounded-full flex items-center">
                      <Sparkles size={10} className="mr-1" /> GroundX
                    </span>
                  )}
                  
                  {/* Score badge */}
                  {parsed.score !== undefined && (
                    <span className="ml-2 text-xs font-normal text-purple-600 py-0.5 px-2 bg-purple-50 rounded-full">
                      {typeof parsed.score === 'number' 
                        ? `${(parsed.score * 100).toFixed(1)}%` 
                        : `Score: ${parsed.score}`}
                    </span>
                  )}
                  
                  {/* Additional badges */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {parsed.section && (
                      <span className="text-xs font-normal text-blue-600 py-0.5 px-2 bg-blue-50 rounded-full">
                        Section {parsed.section}
                      </span>
                    )}
                    {parsed.pageNumber && (
                      <span className="text-xs font-normal text-green-600 py-0.5 px-2 bg-green-50 rounded-full">
                        Page {parsed.pageNumber}
                      </span>
                    )}
                    {hasSnippets && (
                      <span className="text-xs font-normal text-amber-600 py-0.5 px-2 bg-amber-50 rounded-full">
                        {parsed.snippets?.length} Snippets
                      </span>
                    )}
                    {hasImages && (
                      <span className="text-xs font-normal text-amber-600 py-0.5 px-2 bg-amber-50 rounded-full flex items-center">
                        <ImageIcon size={12} className="mr-1" /> 
                        {parsed.pageImages?.length} {parsed.pageImages?.length === 1 ? 'Image' : 'Images'}
                      </span>
                    )}
                  </div>
                </h4>
                
                <div className="flex items-center gap-2">
                  {/* Toggle details button */}
                  {(hasImages || hasMetadata || hasNarrative || hasSnippets) && (
                    <button
                      onClick={() => toggleDetails(index)}
                      className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded-full hover:bg-blue-100 flex items-center"
                      title={isDetailsExpanded ? "Hide details" : "Show details"}
                    >
                      {isDetailsExpanded ? (
                        <EyeOff size={14} />
                      ) : (
                        <Eye size={14} />
                      )}
                    </button>
                  )}
                  
                  {/* Copy citation button */}
                  <button
                    onClick={() => handleCopyCitation(parsed, index)}
                    className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded-full hover:bg-blue-100 flex items-center"
                    title="Copy citation"
                  >
                    {copiedItemIndex === index ? (
                      <>
                        <Check size={14} className="text-green-500 mr-1" />
                        <span className="text-xs text-green-500">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} className="mr-1" />
                        <span className="text-xs">Cite</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Document content display */}
              {!isGroundX || (contentSource && displayContent) ? (
                <>
                  <div 
                    className="text-sm leading-relaxed text-gray-700 document-content"
                    dangerouslySetInnerHTML={{ __html: formattedContent }}
                  />
                  
                  {/* Read more/less button */}
                  {needsExpansion && (
                    <button
                      onClick={() => toggleExpanded(index)}
                      className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp size={14} className="mr-1" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown size={14} className="mr-1" />
                          {isGroundX && hasSnippets ? 'Show all snippets' : 'Read more'}
                        </>
                      )}
                    </button>
                  )}
                </>
              ) : (
                <div className="text-sm italic text-gray-500 my-2">
                  No content text available for this document. 
                  {hasSnippets || hasNarrative ? " See document details below." : ""}
                </div>
              )}
              
              {/* Enhanced content details section */}
              {isDetailsExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  {/* Document ID display for GroundX */}
                  {parsed.id && (
                    <div className="text-xs text-gray-500 mb-3">
                      <span className="font-medium">Document ID:</span> {parsed.id}
                    </div>
                  )}
                  
                  {/* Display the snippets separately for GroundX */}
                  {hasSnippets && !isExpanded && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Document Snippets:</h5>
                      <div className="space-y-2">
                        {parsed.snippets?.map((snippet, i) => (
                          <div 
                            key={`snippet-${i}`} 
                            className="p-2 bg-blue-50 border border-blue-100 rounded text-sm"
                          >
                            <div className="text-xs text-blue-600 mb-1">Snippet {i+1}</div>
                            <div dangerouslySetInnerHTML={{ 
                              __html: formatDocumentText(snippet, allHighlightTerms, []) 
                            }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Images display */}
                  {hasImages && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Page Images:</h5>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {parsed.pageImages?.map((imageUrl, imgIndex) => (
                          <div 
                            key={`img-${index}-${imgIndex}`} 
                            className="flex-shrink-0 border rounded overflow-hidden"
                          >
                            <img 
                              src={imageUrl}
                              alt={`Page ${imgIndex + 1} of ${parsed.title}`}
                              className="h-32 object-contain"
                              onClick={() => window.open(imageUrl, '_blank')}
                              style={{ cursor: 'pointer' }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Metadata display */}
                  {hasMetadata && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Document Metadata:</h5>
                      <div className="bg-gray-100 p-3 rounded text-sm">
                        {parsed.metadata?.keywords && (
                          <div className="mb-2">
                            <span className="font-medium">Keywords: </span>
                            {Array.isArray(parsed.metadata.keywords) 
                              ? parsed.metadata.keywords.join(', ')
                              : parsed.metadata.keywords}
                          </div>
                        )}
                        {Object.entries(parsed.metadata || {}).map(([key, value]) => {
                          // Skip the keywords field since we've already displayed it
                          if (key === 'keywords') return null;
                          
                          return (
                            <div key={`meta-${key}`} className="mb-1">
                              <span className="font-medium capitalize">{key}: </span>
                              {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Narrative summary display */}
                  {hasNarrative && (
                    <div className="mb-2">
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Document Summary:</h5>
                      <div className="bg-gray-100 p-3 rounded text-sm">
                        {parsed.narrative?.map((paragraph, nIndex) => (
                          <p key={`narrative-${nIndex}`} className={nIndex > 0 ? 'mt-2' : ''}>
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
        
        {/* Image items rendering */}
        {imageItems?.map((img: string, index: number) => (
          <li className="p-4 mb-3 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden" key={`supporting-content-image-${index}`}>
            <h4 className="m-0 mb-2 text-base font-semibold text-gray-700 flex items-center">
              <span className="flex items-center text-gray-700">
                <ImageIcon size={16} className="mr-2 text-gray-500" />
                Image {index + 1}
              </span>
            </h4>
            <img 
              className="max-w-full h-auto rounded block mx-auto" 
              src={img} 
              alt={`Supporting image ${index + 1}`}
              onClick={() => window.open(img, '_blank')}
              style={{ cursor: 'pointer' }}
            />
          </li>
        ))}
        
        {/* Empty state */}
        {processedTextItems.length === 0 && imageItems.length === 0 && (
          <li className="p-4 mb-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <CornerLeftUp size={24} className="mb-2" />
              {searchQuery ? (
                <>
                  <p>No results match your search</p>
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear search
                  </button>
                </>
              ) : (
                <p>No supporting content available</p>
              )}
            </div>
          </li>
        )}
      </ul>
      
      {/* Key concepts section */}
      {autoHighlightTerms.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Key Concepts</h4>
          <div className="flex flex-wrap gap-2">
            {autoHighlightTerms.map(term => (
              <span 
                key={term}
                className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full cursor-pointer hover:bg-blue-100"
                onClick={() => setSearchQuery(term)}
                role="button"
              >
                {term}
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Add CSS for citation links */}
      <style jsx global>{`
        .citation-link {
          color: #3b82f6;
          background-color: #eff6ff;
          padding: 0.1rem 0.3rem;
          border-radius: 0.25rem;
          cursor: pointer;
          font-weight: 500;
          text-decoration: none;
          transition: background-color 0.2s;
        }
        
        .citation-link:hover {
          background-color: #dbeafe;
          text-decoration: underline;
        }
        
        mark {
          background-color: #fef3c7;
          color: #92400e;
          padding: 0.1rem 0.2rem;
          border-radius: 0.125rem;
        }

        .document-content p {
          margin-bottom: 0.75rem;
        }
      `}</style>
    </div>
  );
};