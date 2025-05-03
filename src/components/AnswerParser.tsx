/**
 * Enhanced Answer Parser
 * Provides sophisticated parsing of AI responses with improved citation handling,
 * content formatting, and additional features like confidence scoring and entity extraction.
 */

export interface ParsedAnswer {
  answerHtml: string;        // HTML-formatted answer with citation markup
  citations: string[];       // Unique list of cited document references
  followupQuestions: string[]; // Suggested follow-up questions
  confidence?: number;       // Confidence score (0-1) if available
  keyEntities?: string[];    // Key entities extracted from the answer
  metadata?: Record<string, any>; // Additional metadata about the answer
  processingTime?: number;   // Time taken to process the answer in ms
}

export interface CitationInfo {
  id: string;                // Document ID
  fileName?: string;         // File name for display
  index: number;             // Citation index for rendering
  text: string;              // Citation text for display
  page?: number;             // Page number if available
  section?: string;          // Section information if available
  relevance?: number;        // Relevance score (0-1) if available
}

/**
 * Main function to parse an AI answer into HTML with citation handling
 * Enhanced to handle multiple citation formats and provide rich metadata
 */
export const parseAnswerToHtml = (
  answer: any,
  isStreaming: boolean,
  onCitationClicked: (filePath: string) => void
): ParsedAnswer => {
  const startTime = performance.now();
  let content = "";
  let followupQuestions: string[] = [];
  let confidence: number | undefined;
  let keyEntities: string[] = [];
  let metadata: Record<string, any> = {};

  try {
    // Extract content with enhanced error handling
    content = extractAnswerContent(answer);
    
    // Extract follow-up questions with improved detection
    followupQuestions = extractFollowupQuestions(answer);
    
    // New: Extract confidence score if available
    confidence = extractConfidenceScore(answer);
    
    // New: Extract key entities mentioned in the answer
    keyEntities = extractKeyEntities(content, answer);
    
    // New: Extract additional metadata
    metadata = extractAnswerMetadata(answer);
  } catch (e) {
    console.error("Error parsing answer:", e);
    content = "Error processing response";
  }

  // Enhanced citation extraction with more formats supported
  const citationInfoList = extractCitationsWithMetadata(content, answer);
  const citations = citationInfoList.map(c => c.id);
  
  // Format content with improved citation handling
  const formattedContent = formatContentWithEnhancedCitations(content, citationInfoList);

  const processingTime = performance.now() - startTime;
  
  return {
    answerHtml: formattedContent,
    citations: [...new Set(citations)],
    followupQuestions,
    confidence,
    keyEntities: keyEntities.length > 0 ? keyEntities : undefined,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    processingTime
  };
};

/**
 * Extract the main content from various answer formats
 * Enhanced to handle more response structures
 */
const extractAnswerContent = (answer: any): string => {
  // Handle string directly
  if (typeof answer === "string") return answer;
  
  // Check common response formats
  if (typeof answer?.content === "string") return answer.content;
  if (typeof answer?.answer === "string") return answer.answer;
  if (typeof answer?.response === "string") return answer.response;
  if (answer?.message?.content) return answer.message.content;
  if (answer?.completion) return answer.completion;
  
  // Handle GroundX RAG API response format
  if (answer?.response && typeof answer.response === "string") {
    return answer.response;
  }
  
  // Handle OpenAI-style response formats
  if (answer?.choices && Array.isArray(answer.choices) && answer.choices.length > 0) {
    const choice = answer.choices[0];
    if (choice?.message?.content) return choice.message.content;
    if (choice?.text) return choice.text;
  }

  // Fall back to JSON stringification if no recognized format
  return JSON.stringify(answer, null, 2);
};

/**
 * Extract follow-up questions from various answer formats
 * Enhanced to support more patterns and formats
 */
const extractFollowupQuestions = (answer: any): string[] => {
  // Check multiple possible locations for follow-up questions
  const sources = [
    answer?.context?.followup_questions,
    answer?.followupQuestions,
    answer?.suggested_questions,
    answer?.suggestedQuestions,
    answer?.followUp,
    answer?.followups,
    answer?.follow_up_questions
  ];

  // Return the first valid array found
  for (const src of sources) {
    if (Array.isArray(src)) return src;
  }

  // Handle tool calls (OpenAI function calling format)
  const toolCalls = answer?.response?.message?.tool_calls || answer?.message?.tool_calls;
  if (Array.isArray(toolCalls)) {
    for (const call of toolCalls) {
      if (call.function?.name === "suggest_questions" || call.function?.name === "followup_questions") {
        try {
          const args = JSON.parse(call.function.arguments);
          if (Array.isArray(args.questions)) return args.questions;
        } catch (e) {
          console.warn("Invalid JSON in questions function call:", e);
        }
      }
    }
  }

  // Look for questions in the metadata section
  if (answer?.metadata?.followup_questions && Array.isArray(answer.metadata.followup_questions)) {
    return answer.metadata.followup_questions;
  }

  // Extract questions from text using regex patterns
  // This helps when the model embeds questions in the response
  if (typeof answer === "string" || typeof answer?.content === "string" || typeof answer?.answer === "string") {
    const text = extractAnswerContent(answer);
    return extractQuestionsFromText(text);
  }

  return [];
};

/**
 * New function to extract questions from text using regex patterns
 */
const extractQuestionsFromText = (text: string): string[] => {
  const questions: string[] = [];
  
  // Look for "follow-up questions" or "you might ask" sections
  const sectionRegex = /(?:follow-up questions|you might ask|suggested questions|you may want to ask):(.*?)(?:\n\n|\n(?=[^-•*])|\n?$)/is;
  const sectionMatch = text.match(sectionRegex);
  
  if (sectionMatch && sectionMatch[1]) {
    // Split by bullet points or numbers
    const questionItems = sectionMatch[1].split(/\n[•\-*]|\n\d+\./).filter(Boolean);
    
    for (const item of questionItems) {
      const cleaned = item.trim().replace(/^[•\-*]\s*/, '').replace(/^"/, '').replace(/"$/, '');
      if (cleaned && (cleaned.endsWith('?') || cleaned.includes('?'))) {
        questions.push(cleaned);
      }
    }
    
    if (questions.length > 0) {
      return questions;
    }
  }
  
  // Extract questions using regex
  const questionRegex = /(?:^|\n)(?:[•\-*]|\d+\.)\s*([^.!]*\?)/g;
  let match;
  
  while ((match = questionRegex.exec(text)) !== null) {
    if (match[1] && match[1].trim()) {
      questions.push(match[1].trim());
    }
  }
  
  // Limit to 5 questions max
  return questions.slice(0, 5);
};

/**
 * New function to extract confidence score if available
 */
const extractConfidenceScore = (answer: any): number | undefined => {
  // Check direct confidence property
  if (typeof answer?.confidence === 'number' && answer.confidence >= 0 && answer.confidence <= 1) {
    return answer.confidence;
  }
  
  // Check metadata for confidence
  if (typeof answer?.metadata?.confidence === 'number') {
    return answer.metadata.confidence;
  }
  
  // Check GroundX-specific format
  if (typeof answer?.metadata?.relevance_score === 'number') {
    return answer.metadata.relevance_score;
  }
  
  return undefined;
};

/**
 * New function to extract key entities from the answer
 */
const extractKeyEntities = (content: string, answer: any): string[] => {
  // Check if entities are provided directly
  if (Array.isArray(answer?.entities)) {
    return answer.entities;
  }
  
  if (Array.isArray(answer?.metadata?.entities)) {
    return answer.metadata.entities;
  }
  
  // Simple extraction of potential key entities (could be enhanced with NLP)
  const entities: string[] = [];
  
  // Extract names and terms that appear to be entities
  const entityRegex = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b/g;
  const content2 = typeof content === 'string' ? content : '';
  const matches = [...content2.matchAll(entityRegex)];
  
  // Count occurrences and keep those that appear multiple times
  const entityCounts = new Map<string, number>();
  for (const match of matches) {
    const entity = match[0];
    entityCounts.set(entity, (entityCounts.get(entity) || 0) + 1);
  }
  
  // Add entities that appear frequently
  for (const [entity, count] of entityCounts.entries()) {
    if (count > 1 && entity.length > 3) {
      entities.push(entity);
    }
  }
  
  return entities.slice(0, 10); // Limit to 10 entities
};

/**
 * Extract additional metadata from the answer
 */
const extractAnswerMetadata = (answer: any): Record<string, any> => {
  const metadata: Record<string, any> = {};
  
  // Include execution time if available
  if (answer?.executionTime) {
    metadata.executionTime = answer.executionTime;
  }
  
  // Include model info if available
  if (answer?.modelUsed || answer?.model) {
    metadata.model = answer.modelUsed || answer.model;
  }
  
  // Include citation metadata
  if (answer?.citations && Array.isArray(answer.citations)) {
    metadata.citationCount = answer.citations.length;
  }
  
  // Include search result info
  if (answer?.searchResults?.count) {
    metadata.searchResultCount = answer.searchResults.count;
  }
  
  // Include timestamp if available
  if (answer?.timestamp) {
    metadata.timestamp = answer.timestamp;
  }
  
  return metadata;
};

/**
 * Enhanced function to extract citations with metadata
 */
const extractCitationsWithMetadata = (content: string, answer: any): CitationInfo[] => {
  const citationInfos: CitationInfo[] = [];
  const seenIds = new Set<string>();
  
  // 1. Extract citations from content with bracket notation [file.pdf]
  const bracketRegex = /\[([\w\s-]+\.(pdf|docx|xlsx|txt|csv|json|js|php|html|xml))\]/gi;
  
  for (const match of [...content.matchAll(bracketRegex)]) {
    const id = match[1];
    if (!seenIds.has(id)) {
      seenIds.add(id);
      citationInfos.push({
        id,
        fileName: id,
        index: citationInfos.length + 1,
        text: match[0]
      });
    }
  }
  
  // 2. Extract citations with quotation patterns "text" (file.pdf)
  const parenthesisRegex = /"[^"]+"\s+\(([\w\s-]+\.(pdf|docx|xlsx|txt|csv|json|js|php|html|xml))\)/gi;
  
  for (const match of [...content.matchAll(parenthesisRegex)]) {
    const id = match[1];
    if (!seenIds.has(id)) {
      seenIds.add(id);
      citationInfos.push({
        id,
        fileName: id,
        index: citationInfos.length + 1,
        text: match[0]
      });
    }
  }
  
  // 3. Extract Anthropic citations with  tags
  const antmlCitations = extractAntmlCitationsWithMetadata(content, answer);
  
  for (const citation of antmlCitations) {
    if (!seenIds.has(citation.id)) {
      seenIds.add(citation.id);
      citationInfos.push({
        ...citation,
        index: citationInfos.length + 1
      });
    }
  }
  
  // 4. Extract citations from document sources
  const documentCitations = extractDocumentCitationsWithMetadata(answer);
  
  for (const citation of documentCitations) {
    if (!seenIds.has(citation.id)) {
      seenIds.add(citation.id);
      citationInfos.push({
        ...citation,
        index: citationInfos.length + 1
      });
    }
  }
  
  // 5. Extract GroundX citations if available
  if (answer?.citations && Array.isArray(answer.citations)) {
    for (const citation of answer.citations) {
      const id = String(citation.documentId || citation.id || '');
      if (id && !seenIds.has(id)) {
        seenIds.add(id);
        citationInfos.push({
          id,
          fileName: citation.fileName || parseCitationText(id),
          index: citationInfos.length + 1,
          text: citation.text || `[${id}]`,
          page: citation.pageNumber,
          relevance: citation.relevance
        });
      }
    }
  }
  
  return citationInfos;
};

/**
 * Extract Anthropic citations with improved metadata handling
 */
const extractAntmlCitationsWithMetadata = (content: string, answer: any): CitationInfo[] => {
  const citations: CitationInfo[] = [];
  const regex = /]*index="([^"]+)"[^>]*>(.*?)<\/antml:cite>/gi;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const indexInfo = match[1];
    const text = match[2];
    
    // Parse the index format which could be like "0-1:3" (document 0, sentences 1-3)
    const docIndexStr = indexInfo.split("-")[0];
    const docIndex = parseInt(docIndexStr);
    
    if (isNaN(docIndex)) continue;
    
    // Find document details
    const docId = findDocumentIdByIndex(answer, docIndex);
    const fileName = findDocumentNameByIndex(answer, docIndex);
    
    if (docId) {
      citations.push({
        id: docId,
        fileName: fileName || parseCitationText(docId),
        index: 0, // Will be set later
        text: text
      });
    } else {
      citations.push({
        id: `document-${docIndex}`,
        fileName: fileName || `Document ${docIndex}`,
        index: 0, // Will be set later
        text: text
      });
    }
  }

  return citations;
};

/**
 * Extract document citations with enhanced metadata
 */
const extractDocumentCitationsWithMetadata = (answer: any): CitationInfo[] => {
  const citations: CitationInfo[] = [];
  
  const sources = [
    answer?.citations,
    answer?.documents,
    answer?.searchResults?.sources,
    answer?.result?.documents,
    answer?.enhancedResults?.sources
  ];

  for (const group of sources) {
    if (Array.isArray(group)) {
      for (const item of group) {
        if (item?.id != null) {
          const id = String(item.id);
          citations.push({
            id,
            fileName: item.fileName || item.name || parseCitationText(id),
            index: 0, // Will be set later
            text: `[${parseCitationText(id)}]`,
            page: item.metadata?.page ? parseInt(item.metadata.page, 10) : undefined,
            section: item.metadata?.section,
            relevance: item.relevanceScore || item.score
          });
        }
      }
    }
  }

  return citations;
};

/**
 * Find document ID by index with improved search
 */
const findDocumentIdByIndex = (answer: any, index: number): string | null => {
  const sources = [
    answer?.documents,
    answer?.searchResults?.sources,
    answer?.result?.documents,
    answer?.enhancedResults?.sources
  ];

  for (const source of sources) {
    if (Array.isArray(source) && source[index]) {
      return String(source[index].id ?? null);
    }
  }

  // Try citation array if available
  if (Array.isArray(answer?.citations) && answer.citations[index]) {
    return String(answer.citations[index].documentId ?? answer.citations[index].id ?? null);
  }

  return null;
};

/**
 * New function to find document name by index
 */
const findDocumentNameByIndex = (answer: any, index: number): string | null => {
  const sources = [
    answer?.documents,
    answer?.searchResults?.sources,
    answer?.result?.documents,
    answer?.enhancedResults?.sources
  ];

  for (const source of sources) {
    if (Array.isArray(source) && source[index]) {
      return source[index].fileName || source[index].name || null;
    }
  }

  // Try citation array if available
  if (Array.isArray(answer?.citations) && answer.citations[index]) {
    return answer.citations[index].fileName || null;
  }

  return null;
};

/**
 * Parse citation text with improved handling of various formats
 */
const parseCitationText = (citation: string): string => {
  if (!citation) return "Unknown";
  
  // Handle paths
  if (citation.includes("/")) return citation.split("/").pop()!;
  
  // Handle prefixed IDs
  return citation
    .replace(/^(groundx:|azure:|gx:|doc:|document:|file:)/i, "")
    .replace(/^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i, "Document") // UUID format
    .replace(/^[a-f0-9]{24}$/i, "Document"); // MongoDB ObjectId format
};

/**
 * Format content with enhanced citation handling
 */
const formatContentWithEnhancedCitations = (content: string, citations: CitationInfo[]): string => {
  let formatted = content;

  // 1. Handle  tags with improved formatting
  formatted = formatted.replace(
    /]*index="([^"]+)"[^>]*>(.*?)<\/antml:cite>/gi,
    (_, index, text) => {
      const docIndexStr = index.split("-")[0];
      const docIndex = parseInt(docIndexStr);
      
      if (isNaN(docIndex)) return text;
      
      // Find the corresponding citation in our list
      const docId = `document-${docIndex}`;
      const citationIndex = citations.findIndex(
        c => c.id === docId || c.id.endsWith(docId)
      );
      
      if (citationIndex === -1) return text;
      
      const idx = citationIndex + 1;
      return `${text} <sup class="text-blue-600 font-bold cursor-pointer citation-number" data-citation-index="${idx}" data-document-id="${citations[citationIndex].id}">[${idx}]</sup>`;
    }
  );

  // 2. Handle citations by matching document filenames
  citations.forEach((citation, i) => {
    const fileName = citation.fileName || '';
    if (!fileName) return;
    
    // Escape special regex characters in the filename
    const escapedName = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Create regex to match [filename.ext] pattern
    const regex = new RegExp(`\\[${escapedName}\\]`, 'g');
    
    formatted = formatted.replace(
      regex,
      `<sup class="text-blue-600 font-bold cursor-pointer citation-number" data-citation-index="${i + 1}" data-document-id="${citation.id}">[${i + 1}]</sup>`
    );
    
    // Also match "text" (filename.ext) pattern
    const quoteRegex = new RegExp(`"[^"]+?"\\s+\\(${escapedName}\\)`, 'g');
    
    formatted = formatted.replace(
      quoteRegex,
      (match) => {
        const quote = match.match(/"([^"]+)"/)?.[1] || '';
        return `"${quote}" <sup class="text-blue-600 font-bold cursor-pointer citation-number" data-citation-index="${i + 1}" data-document-id="${citation.id}">[${i + 1}]</sup>`;
      }
    );
  });

  // 3. Format inline numbered citations [1], [2], etc.
  const numberedCitationRegex = /\[(\d+)\]/g;
  formatted = formatted.replace(
    numberedCitationRegex,
    (match, num) => {
      const idx = parseInt(num);
      if (isNaN(idx) || idx < 1 || idx > citations.length) return match;
      
      const citation = citations[idx - 1];
      return `<sup class="text-blue-600 font-bold cursor-pointer citation-number" data-citation-index="${idx}" data-document-id="${citation.id}">[${idx}]</sup>`;
    }
  );

  // 4. Handle Markdown links
  formatted = formatted.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, text, url) =>
      `<a href="${encodeURI(url)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">${text}</a>`
  );
  
  // 5. Format basic Markdown for better readability
  formatted = formatMarkdown(formatted);

  return formatted;
};

/**
 * Format basic Markdown syntax into HTML
 */
const formatMarkdown = (text: string): string => {
  let formatted = text;
  
  // Bold text
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  formatted = formatted.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  
  // Italic text
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>');
  
  // Code blocks
  formatted = formatted.replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>');
  
  // Inline code
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Headers (h3 and h4 only)
  formatted = formatted.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
  formatted = formatted.replace(/^#### (.*?)$/gm, '<h4>$1</h4>');
  
  // Unordered lists
  formatted = formatted.replace(/^\s*[-*+]\s+(.*?)$/gm, '<li>$1</li>');
  formatted = formatted.replace(/(<li>.*?<\/li>)\n(?!<li>)/gs, '<ul>$1</ul>');
  
  // Ordered lists
  formatted = formatted.replace(/^\s*\d+\.\s+(.*?)$/gm, '<li>$1</li>');
  formatted = formatted.replace(/(<li>.*?<\/li>)\n(?!<li>)/gs, '<ol>$1</ol>');
  
  // Paragraphs (handle double line breaks)
  formatted = formatted.replace(/\n\n/g, '</p><p>');
  
  // Wrap in paragraphs if not already wrapped
  if (!formatted.startsWith('<')) {
    formatted = `<p>${formatted}</p>`;
  }
  
  return formatted;
};

/**
 * Render citation list for displaying in the UI
 */
export const renderCitationList = (citationInfos: CitationInfo[]): string => {
  if (citationInfos.length === 0) return '';
  
  let html = '<div class="citation-list mt-4 border-t pt-2">';
  html += '<h3 class="font-bold text-lg mb-2">Citations</h3>';
  html += '<ol class="list-decimal pl-5">';
  
  citationInfos.forEach(citation => {
    html += `<li id="citation-${citation.index}" class="mb-1">`;
    html += `<span class="font-medium">${citation.fileName || parseCitationText(citation.id)}</span>`;
    
    if (citation.page) {
      html += `, page ${citation.page}`;
    }
    
    if (citation.section) {
      html += `, ${citation.section}`;
    }
    
    html += '</li>';
  });
  
  html += '</ol></div>';
  return html;
};

/**
 * Utility function to handle citation clicks and scrolling
 */
export const setupCitationClickHandlers = (
  containerId: string,
  onCitationClicked: (filePath: string) => void
): void => {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // Find all citation numbers and attach click handlers
  const citationNumbers = container.querySelectorAll('.citation-number');
  
  citationNumbers.forEach(element => {
    element.addEventListener('click', (e) => {
      e.preventDefault();
      
      const target = e.target as HTMLElement;
      const citationIndex = target.getAttribute('data-citation-index');
      const documentId = target.getAttribute('data-document-id');
      
      if (documentId) {
        onCitationClicked(documentId);
      }
      
      // Scroll to the citation in the list
      if (citationIndex) {
        const citationElement = document.getElementById(`citation-${citationIndex}`);
        if (citationElement) {
          citationElement.scrollIntoView({ behavior: 'smooth' });
          citationElement.classList.add('bg-yellow-100');
          setTimeout(() => {
            citationElement.classList.remove('bg-yellow-100');
          }, 2000);
        }
      }
    });
  });
};