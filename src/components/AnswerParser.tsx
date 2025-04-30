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
      // Fallback: stringify the object
      content = JSON.stringify(answer);
    }
    
    // Try to extract follow-up questions from answer object
    if (answer?.context?.followup_questions && Array.isArray(answer.context.followup_questions)) {
      followupQuestions = answer.context.followup_questions;
    }
    
  } catch (e) {
    console.error("Error parsing answer:", e);
    content = "Error processing response";
  }

  // Extract citations from the content
  const citations = extractCitations(content);
  
  // Format the content with proper citation markers
  const formattedContent = formatContentWithCitations(content, citations);
  
  return {
    answerHtml: formattedContent,
    citations: citations,
    followupQuestions: followupQuestions
  };
};

// Extract citations from content
const extractCitations = (content: string): string[] => {
  // Handle bracketed citations like [filename.pdf]
  const bracketRegex = /\[([\w\s-]+\.(pdf|docx|xlsx|txt|csv))\]/gi;
  const bracketMatches = [...(content.matchAll(bracketRegex) || [])];
  
  // Also check for in-paragraph citations with the format "text" (filename.pdf)
  const parenthesisRegex = /"[^"]+"\s+\(([\w\s-]+\.(pdf|docx|xlsx|txt|csv))\)/gi;
  const parenthesisMatches = [...(content.matchAll(parenthesisRegex) || [])];
  
  // Also check for citations in the form ...
  const xmlRegex = /]*>(.*?)<\/antml:cite>/gi;
  const xmlMatches = [...(content.matchAll(xmlRegex) || [])];
  
  // Extract citation filenames from ANTML citations
  const antmlCitations = extractAntmlCitations(content);
  
  // Combine all citation types and deduplicate
  const allMatches = [
    ...bracketMatches.map(match => match[1]),
    ...parenthesisMatches.map(match => match[1]),
    ...antmlCitations
  ];
  
  // Remove duplicates and return
  return [...new Set(allMatches)];
};

// Extract citations from antml:cite tags
const extractAntmlCitations = (content: string): string[] => {
  const citations: string[] = [];
  const regex = /]*index="([^"]*)"[^>]*>.*?<\/antml:cite>/gi;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    // Extract the document index from the citation
    const indexParts = match[1].split('-');
    if (indexParts.length > 0) {
      const docIndex = parseInt(indexParts[0]);
      // For now, just add a placeholder filename
      citations.push(`document-${docIndex}.pdf`);
    }
  }
  
  return citations;
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
        const citationIndex = citations.findIndex(c => c === `document-${docIndex}.pdf`) + 1;
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
      const regex = new RegExp(`\\[${citation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g');
      formattedContent = formattedContent.replace(
        regex, 
        `<sup class="text-blue-600 font-bold cursor-pointer citation-number" data-citation-index="${index + 1}">[${index + 1}]</sup>`
      );
    });
  }
  
  return formattedContent;
};