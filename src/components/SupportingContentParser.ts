// SupportingContentParser.ts
import DOMPurify from "dompurify";

type ParsedSupportingContentItem = {
  title: string;
  content: string;
  source?: string;
};

export function parseSupportingContentItem(item: string): ParsedSupportingContentItem {
  // Assumes the item starts with the file name followed by : and the content.
  // Example: "sdp_corporate.pdf: this is the content that follows".
  const parts = item.split(": ");
  const title = parts[0];
  const content = DOMPurify.sanitize(parts.slice(1).join(": "));
  
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