export interface ParsedAnswer {
  answerHtml: string;
  citations: string[];
  followupQuestions: string[];
}

export const parseAnswerToHtml = (
  answer: any,
  isStreaming: boolean,
  onCitationClicked: (filePath: string) => void
): ParsedAnswer => {
  // Get content directly from the string or object
  let content = "";
  let followupQuestions: string[] = [];
  
  try {
    if (typeof answer === 'string') {
      content = answer;
    } else if (typeof answer?.content === 'string') {
      content = answer.content;
    } else if (typeof answer?.answer === 'string') {
      content = answer.answer;
    } else {
      // Try to extract content from GroundX format
      if (answer?.message?.content) {
        content = answer.message.content;
      } else if (answer?.completion) {
        content = answer.completion;
      } else {
        // Fallback: stringify the object
        content = JSON.stringify(answer);
      }
    }
    
    // Try to extract follow-up questions from answer object
    if (answer?.context?.followup_questions && Array.isArray(answer.context.followup_questions)) {
      followupQuestions = answer.context.followup_questions;
    } else if (answer?.followupQuestions && Array.isArray(answer.followupQuestions)) {
      followupQuestions = answer.followupQuestions;
    } else if (answer?.suggested_questions && Array.isArray(answer.suggested_questions)) {
      followupQuestions = answer.suggested_questions;
    }
    
    // Try to extract from raw GroundX response
    if (answer?.response?.message?.tool_calls) {
      const toolCalls = answer.response.message.tool_calls;
      for (const call of toolCalls) {
        if (call.function?.name === 'suggest_questions' && call.function.arguments) {
          try {
            const args = JSON.parse(call.function.arguments);
            if (args.questions && Array.isArray(args.questions)) {
              followupQuestions = args.questions;
            }
          } catch (e) {
            console.error("Error parsing suggested questions:", e);
          }
        }
      }
    }
    
  } catch (e) {
    console.error("Error parsing answer:", e);
    content = "Error processing response";
  }

  // Extract citations from the content and the documents
  const citations = extractCitations(content, answer);
  
  // Format the content with proper citation markers
  const formattedContent = formatContentWithCitations(content, citations);
  
  return {
    answerHtml: formattedContent,
    citations: citations,
    followupQuestions: followupQuestions
  };
};

// Extract citations from content and documents
const extractCitations = (content: string, answer: any): string[] => {
  const citations: string[] = [];
  
  // Handle bracketed citations like [filename.pdf]
  const bracketRegex = /\[([\w\s-]+\.(pdf|docx|xlsx|txt|csv|json|js|php|html|xml))\]/gi;
  const bracketMatches = [...(content.matchAll(bracketRegex) || [])];
  citations.push(...bracketMatches.map(match => match[1]));
  
  // Also check for in-paragraph citations with the format "text" (filename.pdf)
  const parenthesisRegex = /"[^"]+"\s+\(([\w\s-]+\.(pdf|docx|xlsx|txt|csv|json|js|php|html|xml))\)/gi;
  const parenthesisMatches = [...(content.matchAll(parenthesisRegex) || [])];
  citations.push(...parenthesisMatches.map(match => match[1]));
  
  // Extract citation filenames from ANTML citations
  const antmlCitations = extractAntmlCitations(content, answer);
  citations.push(...antmlCitations);
  
  // Extract documents/sources from answer directly
  const documentCitations = extractDocumentCitations(answer);
  citations.push(...documentCitations);
  
  // Remove duplicates and return
  return [...new Set(citations)];
};

// Extract citations from antml:cite tags
const extractAntmlCitations = (content: string, answer: any): string[] => {
  const citations: string[] = [];
  const regex = /]*index="([^"]*)"[^>]*>.*?<\/antml:cite>/gi;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    // Extract the document index from the citation
    const indexParts = match[1].split('-');
    if (indexParts.length > 0) {
      const docIndex = parseInt(indexParts[0]);
      
      // Try to get actual document info from the answer
      let docId = findDocumentIdByIndex(answer, docIndex);
      if (docId) {
        citations.push(docId);
      } else {
        // Fallback to a placeholder filename
        citations.push(`document-${docIndex}`);
      }
    }
  }
  
  return citations;
};

// Extract document citations directly from answer object
const extractDocumentCitations = (answer: any): string[] => {
  const citations: string[] = [];
  
  try {
    // Extract from Azure format
    if (answer?.citations && Array.isArray(answer.citations)) {
      citations.push(...answer.citations.map((c: { id?: string | number }) => c.id?.toString() || c.toString()));
    }
    
    // Extract from documents array (GroundX format)
    if (answer?.documents && Array.isArray(answer.documents)) {
      answer.documents.forEach((doc: { id?: string | number }) => {
        if (doc.id) citations.push(doc.id.toString());
      });
    }
    
    // Extract from searchResults (common format)
    if (answer?.searchResults?.sources && Array.isArray(answer.searchResults.sources)) {
      answer.searchResults.sources.forEach((source: { id?: string | number }) => {
        if (source.id) citations.push(source.id.toString());
      });
    }
    
    // Extract from GroundX direct response
    if (answer?.result?.documents && Array.isArray(answer.result.documents)) {
      answer.result.documents.forEach((doc: { id?: string | number }) => {
        if (doc.id) citations.push(doc.id.toString());
      });
    }
    
  } catch (e) {
    console.error("Error extracting document citations:", e);
  }
  
  return citations;
};

// Find a document ID by its index
const findDocumentIdByIndex = (answer: any, index: number): string | null => {
  try {
    // Check in documents array (common format)
    if (answer?.documents && Array.isArray(answer.documents) && answer.documents[index]) {
      return answer.documents[index].id?.toString() || null;
    }
    
    // Check in searchResults (common format)
    if (answer?.searchResults?.sources && Array.isArray(answer.searchResults.sources) && answer.searchResults.sources[index]) {
      return answer.searchResults.sources[index].id?.toString() || null;
    }
    
    // Check in GroundX format
    if (answer?.result?.documents && Array.isArray(answer.result.documents) && answer.result.documents[index]) {
      return answer.result.documents[index].id?.toString() || null;
    }
  } catch (e) {
    console.error("Error finding document by index:", e);
  }
  
  return null;
};

// Parse citation text for displaying in the UI
const parseCitationText = (citation: string): string => {
  // Check if it's a file path and extract just the filename
  if (citation.includes('/')) {
    return citation.split('/').pop() || citation;
  }
  
  // Remove common prefixes like groundx:
  return citation.replace(/^(groundx:|azure:|gx:)/i, '');
};

// Format content with proper citation markers
const formatContentWithCitations = (content: string, citations: string[]): string => {
  let formattedContent = content;
  
  // Replace antml:cite tags with simple citation markers
  formattedContent = formattedContent.replace(
    /]*index="([^"]*)"[^>]*>(.*?)<\/antml:cite>/gi,
    (match, index, text) => {
      const indexParts = index.split('-');
      if (indexParts.length > 0) {
        const docIndex = parseInt(indexParts[0]);
        // Return the text with a citation number
        const citationIndex = citations.findIndex(c => 
          c === `document-${docIndex}` || 
          c.startsWith(`groundx:document-${docIndex}`) || 
          c.endsWith(`document-${docIndex}`)
        ) + 1;
        if (citationIndex > 0) {
          return `${text} <sup class="text-blue-600 font-bold cursor-pointer citation-number" data-citation-index="${citationIndex}">[${citationIndex}]</sup>`;
        }
      }
      return text;
    }
  );
  
  // Replace bracketed citations with numbered citations
  if (citations.length > 0) {
    citations.forEach((citation, index) => {
      const citationText = parseCitationText(citation);
      const regex = new RegExp(`\\[${citationText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g');
      formattedContent = formattedContent.replace(
        regex, 
        `<sup class="text-blue-600 font-bold cursor-pointer citation-number" data-citation-index="${index + 1}">[${index + 1}]</sup>`
      );
    });
  }
  
  // Process markdown-style links to make them clickable
  formattedContent = formattedContent.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" class="text-blue-600 underline">$1</a>'
  );
  
  return formattedContent;
};