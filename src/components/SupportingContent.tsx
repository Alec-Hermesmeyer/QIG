// SupportingContent.tsx
import React from 'react';
import { FileText, Image, CornerLeftUp } from 'lucide-react';
import DOMPurify from "dompurify";

interface ParsedSupportingContentItem {
  title: string;
  content: string;
  source?: string;
}

function parseSupportingContentItem(item: string): ParsedSupportingContentItem {
  // Assumes the item starts with the file name followed by : and the content.
  // Example: "sdp_corporate.pdf: this is the content that follows".
  const parts = item.split(": ");
  let title = parts[0];
  let content = parts.slice(1).join(": ");
  
  // If there's no colon, treat the whole string as content
  if (parts.length === 1) {
    // Try to extract a citation from the content
    const citationMatch = content.match(/\[([\w\s-]+\.(pdf|docx|xlsx|txt|csv))\]/i);
    if (citationMatch) {
      title = citationMatch[1];
      // Remove the citation from the content
      content = content.replace(citationMatch[0], '').trim();
    } else {
      title = "Reference";
    }
  }
  
  // Sanitize content for security
  content = DOMPurify.sanitize(content);
  
  // Try to extract source information if available (e.g., page numbers, section info)
  let source: string | undefined;
  
  const pageMatch = content.match(/\bpage\s+(\d+[-–]?\d*)\b/i);
  if (pageMatch) {
    source = `Page ${pageMatch[1]}`;
  }
  
  const sectionMatch = content.match(/\bsection\s+([A-Z0-9.]+\b)/i);
  if (sectionMatch && !source) {
    source = `Section ${sectionMatch[1]}`;
  }
  
  return {
    title,
    content,
    source
  };
}

interface Props {
  supportingContent: any; // Accept any format of supporting content
  onFileClick?: (filename: string) => void;
}

export const SupportingContent: React.FC<Props> = ({ supportingContent, onFileClick }) => {
  // Process different possible formats of supporting content
  const { textItems, imageItems } = React.useMemo(() => {
    // No content
    if (!supportingContent) {
      return { textItems: [], imageItems: [] };
    }
    
    // Array of strings
    if (Array.isArray(supportingContent)) {
      return { 
        textItems: supportingContent.filter(item => typeof item === 'string'),
        imageItems: [] 
      };
    }
    
    // Object with text/images properties
    if (typeof supportingContent === 'object') {
      if (supportingContent.text) {
        const textItems = Array.isArray(supportingContent.text) 
          ? supportingContent.text 
          : [supportingContent.text];
          
        const imageItems = Array.isArray(supportingContent.images) 
          ? supportingContent.images 
          : [];
          
        return { textItems, imageItems };
      }
      
      // If it's an object with no text/images properties, try to extract citations
      const extractedItems: string[] = [];
      Object.entries(supportingContent).forEach(([key, value]) => {
        if (typeof value === 'string' && key.endsWith('.pdf') || key.endsWith('.docx') || key.endsWith('.txt')) {
          extractedItems.push(`${key}: ${value}`);
        }
      });
      
      if (extractedItems.length > 0) {
        return { textItems: extractedItems, imageItems: [] };
      }
    }
    
    // String content
    if (typeof supportingContent === 'string') {
      // Check for citations in the format [filename.pdf]
      const citationRegex = /\[([\w\s-]+\.(pdf|docx|xlsx|txt|csv))\]/gi;
      const matches = [...supportingContent.matchAll(citationRegex)];
      
      if (matches.length > 0) {
        const textItems = matches.map(match => 
          `${match[1]}: Referenced in the document.`
        );
        return { textItems, imageItems: [] };
      }
      
      // If it's just a single string with no citations, use it as is
      return { textItems: [supportingContent], imageItems: [] };
    }
    
    return { textItems: [], imageItems: [] };
  }, [supportingContent]);

  const handleFileClick = (filename: string) => {
    if (onFileClick) {
      onFileClick(filename);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 px-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Supporting Content ({textItems.length + imageItems.length} items)
        </h3>
      </div>
      
      <ul className="list-none p-0 m-0">
        {textItems.map((item: string, index: number) => {
          const parsed: ParsedSupportingContentItem = parseSupportingContentItem(item);
          return (
            <li className="p-4 mb-3 bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-lg overflow-hidden transition-colors" key={`supporting-content-text-${index}`}>
              <h4 className="m-0 mb-2 text-base font-semibold text-gray-700 flex items-center">
          <button 
            className="flex items-center text-gray-700 hover:text-blue-600"
            onClick={() => handleFileClick(parsed.title)}
          >
            <FileText size={16} className="mr-2 text-gray-500" />
            {parsed.title}
          </button>
          {parsed.source && (
            <span className="ml-2 text-xs font-normal text-gray-500 py-0.5 px-2 bg-gray-100 rounded-full">
              {parsed.source}
            </span>
          )}
              </h4>
              <p 
          className="m-0 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap" 
          dangerouslySetInnerHTML={{ __html: parsed.content }} 
              />
            </li>
          );
        })}
        
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
        
        {textItems.length === 0 && imageItems.length === 0 && (
          <li className="p-4 mb-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <CornerLeftUp size={24} className="mb-2" />
              <p>No supporting content available</p>
            </div>
          </li>
        )}
      </ul>
    </div>
  );
};