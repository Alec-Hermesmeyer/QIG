// EnhancedSupportingContent.tsx
import React, { useState } from 'react';
import { FileText, Image, CornerLeftUp, ChevronDown, ChevronUp, ExternalLink, Search, Filter, Info } from 'lucide-react';
import DOMPurify from "dompurify";

interface ParsedSupportingContentItem {
  title: string;
  content: string;
  source?: string;
  fullText?: string;
  relevanceScore?: number;
  pageNumber?: string;
  section?: string;
}

function parseSupportingContentItem(item: string): ParsedSupportingContentItem {
  // Handle different formats of content items
  if (typeof item !== 'string') {
    return {
      title: 'Unknown',
      content: 'Invalid content format',
    };
  }
  
  // Check if item follows the pattern "filename.ext: content"
  const colonMatch = item.match(/^([\w\s-]+\.(pdf|docx|xlsx|txt|csv))\s*:\s*(.+)$/s);
  if (colonMatch) {
    const title = colonMatch[1];
    const content = colonMatch[3];
    
    // Extract metadata from content
    const metadata = extractMetadata(content);
    
    return {
      title,
      content: DOMPurify.sanitize(content),
      source: formatSourceInfo(metadata),
      pageNumber: metadata.pageNumber,
      section: metadata.section
    };
  }
  
  // Check for citation format [filename.ext]
  const citationMatch = item.match(/\[([\w\s-]+\.(pdf|docx|xlsx|txt|csv))\]/i);
  if (citationMatch) {
    // Remove the citation from the content
    const title = citationMatch[1];
    const content = item.replace(citationMatch[0], '').trim();
    
    // Extract metadata from content
    const metadata = extractMetadata(content);
    
    return {
      title,
      content: DOMPurify.sanitize(content),
      source: formatSourceInfo(metadata),
      pageNumber: metadata.pageNumber,
      section: metadata.section
    };
  }
  
  // If no recognizable format, use a generic title
  const metadata = extractMetadata(item);
  return {
    title: "Document Reference",
    content: DOMPurify.sanitize(item),
    source: formatSourceInfo(metadata),
    pageNumber: metadata.pageNumber,
    section: metadata.section
  };
}

// Function to extract various metadata from content
function extractMetadata(content: string) {
  const metadata: {
    pageNumber?: string;
    section?: string;
    paragraph?: string;
    line?: string;
  } = {};
  
  // Extract page numbers (various formats)
  const pagePatterns = [
    /\bpage\s+(\d+[-–—]?\d*)\b/i,
    /\bp\.\s*(\d+[-–—]?\d*)\b/i,
    /\bpg\.\s*(\d+[-–—]?\d*)\b/i,
    /\b(\d+)\s+\n/  // Look for page numbers at end of lines
  ];
  
  for (const pattern of pagePatterns) {
    const match = content.match(pattern);
    if (match) {
      metadata.pageNumber = match[1];
      break;
    }
  }
  
  // Extract section information
  const sectionPatterns = [
    /\bsection\s+([A-Z0-9.]+\b)/i,
    /\b([0-9]+\.[0-9]+(?:\.[0-9]+)*)\b/,  // Matches section numbers like 3.1, 3.1.1, etc.
    /\b([IVX]+\.[A-Z])\b/  // Roman numeral sections
  ];
  
  for (const pattern of sectionPatterns) {
    const match = content.match(pattern);
    if (match) {
      metadata.section = match[1];
      break;
    }
  }
  
  // Extract paragraph information
  const paraMatch = content.match(/\bparagraph\s+(\d+)\b/i) || content.match(/\bpara\s+(\d+)\b/i);
  if (paraMatch) {
    metadata.paragraph = paraMatch[1];
  }
  
  // Extract line numbers
  const lineMatch = content.match(/\bline\s+(\d+[-–]?\d*)\b/i);
  if (lineMatch) {
    metadata.line = lineMatch[1];
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

// Helper function to format document text with highlights
function formatDocumentText(content: string, highlightTerms: string[] = []): string {
  if (!content) return '';
  
  let formattedContent = content;
  
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
  
  return DOMPurify.sanitize(formattedContent);
}

// New function to extract key concepts from content items
function extractKeyTerms(items: ParsedSupportingContentItem[], maxTerms: number = 10): string[] {
  // Combine all content
  const allContent = items.map(item => item.content).join(' ');
  
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

interface Props {
  supportingContent: any;
  onFileClick?: (filename: string) => void;
  highlightTerms?: string[];
  maxPreviewLength?: number;
  useAutoHighlighting?: boolean;
}

export const EnhancedSupportingContent: React.FC<Props> = ({ 
  supportingContent, 
  onFileClick,
  highlightTerms = [],
  maxPreviewLength = 300,
  useAutoHighlighting = true
}) => {
  // State
  const [expandedItems, setExpandedItems] = useState<{[key: string]: boolean}>({});
  const [filteredItems, setFilteredItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSection, setShowSection] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  
  // Process different possible formats of supporting content
  const { textItems, imageItems, parsedItems } = React.useMemo(() => {
    // Handle no content case
    if (!supportingContent) {
      return { textItems: [], imageItems: [], parsedItems: [] };
    }
    
    // Handle the specific format from your API:
    // {text: ["file.pdf: content", "file2.pdf: content"]}
    let textItems: string[] = [];
    let imageItems: string[] = [];
    
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
    
    // Parse all text items
    const parsedItems = textItems.map(parseSupportingContentItem);
    
    return { textItems, imageItems, parsedItems };
  }, [supportingContent]);

  // Extract auto-highlight terms if enabled
  const autoHighlightTerms = React.useMemo(() => {
    if (!useAutoHighlighting) return [];
    return extractKeyTerms(parsedItems);
  }, [parsedItems, useAutoHighlighting]);
  
  // Combine user-provided highlight terms with auto-generated ones
  const allHighlightTerms = [...new Set([...highlightTerms, ...autoHighlightTerms])];
  
  // Filter items based on search query
  const filteredTextItems = React.useMemo(() => {
    if (!searchQuery && !activeFilter) return textItems;
    
    return textItems.filter((item, index) => {
      // Apply search query filter
      if (searchQuery && !item.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Apply section filter if active
      if (activeFilter) {
        const parsed = parsedItems[index];
        if (activeFilter === 'hasSection' && !parsed.section) return false;
        if (activeFilter === 'hasPage' && !parsed.pageNumber) return false;
      }
      
      return true;
    });
  }, [textItems, parsedItems, searchQuery, activeFilter]);

  // Toggle expanded state for an item
  const toggleExpanded = (index: number) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Handle file click
  const handleFileClick = (filename: string) => {
    if (onFileClick) {
      onFileClick(filename);
    }
  };
  
  // Group sections for navigation
  const sections = React.useMemo(() => {
    const sectionMap = new Map<string, number>();
    
    parsedItems.forEach(item => {
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

  return (
    <div className="supporting-content">
      <div className="flex justify-between items-center mb-4 px-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Supporting Content ({filteredTextItems.length + imageItems.length} items)
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
            </select>
            <Filter size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
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
                onClick={() => setActiveFilter('hasSection')}
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
        {filteredTextItems.map((item: string, index: number) => {
          const originalIndex = textItems.indexOf(item);
          const parsed: ParsedSupportingContentItem = parsedItems[originalIndex];
          const isExpanded = expandedItems[index] || false;
          
          // Determine if content needs a "Read more" option
          const needsExpansion = parsed.content.length > maxPreviewLength;
          const displayContent = needsExpansion && !isExpanded
            ? parsed.content.substring(0, maxPreviewLength) + '...'
            : parsed.content;
            
          // Format the content with appropriate styling and highlights
          const formattedContent = formatDocumentText(displayContent, allHighlightTerms);
          
          return (
            <li 
              className="p-4 mb-3 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-lg overflow-hidden transition-all" 
              key={`supporting-content-text-${index}`}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="m-0 text-base font-semibold text-gray-700 flex items-center flex-wrap">
                  <button 
                    className="flex items-center text-gray-700 hover:text-blue-600"
                    onClick={() => handleFileClick(parsed.title)}
                  >
                    <FileText size={16} className="mr-2 text-gray-500" />
                    {parsed.title}
                    <ExternalLink size={14} className="ml-1 text-gray-400" />
                  </button>
                  
                  {/* Metadata badges */}
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
                    {parsed.source && !parsed.section && !parsed.pageNumber && (
                      <span className="text-xs font-normal text-gray-500 py-0.5 px-2 bg-gray-100 rounded-full">
                        {parsed.source}
                      </span>
                    )}
                  </div>
                </h4>
              </div>
              
              <div 
                className="text-sm leading-relaxed text-gray-700 document-content"
                dangerouslySetInnerHTML={{ __html: formattedContent }}
              />
              
              {/* Read more / less toggle */}
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
                      Read more
                    </>
                  )}
                </button>
              )}
            </li>
          );
        })}
        
        {/* Image items rendering */}
        {imageItems?.map((img: string, index: number) => (
          <li className="p-4 mb-3 bg-gray-50 border border-gray-200 rounded-lg overflow-hidden" key={`supporting-content-image-${index}`}>
            <h4 className="m-0 mb-2 text-base font-semibold text-gray-700 flex items-center">
              <span className="flex items-center text-gray-700">
                <Image size={16} className="mr-2 text-gray-500" />
                Image {index + 1}
              </span>
            </h4>
            <img className="max-w-full h-auto rounded block mx-auto" src={img} alt={`Supporting image ${index + 1}`} />
          </li>
        ))}
        
        {/* Empty state */}
        {filteredTextItems.length === 0 && imageItems.length === 0 && (
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
                className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded-full"
                onClick={() => setSearchQuery(term)}
                role="button"
              >
                {term}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};