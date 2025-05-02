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
  let content = "";
  let followupQuestions: string[] = [];

  try {
    content = extractAnswerContent(answer);
    followupQuestions = extractFollowupQuestions(answer);
  } catch (e) {
    console.error("Error parsing answer:", e);
    content = "Error processing response";
  }

  const citations = extractCitations(content, answer);
  const formattedContent = formatContentWithCitations(content, citations);

  return {
    answerHtml: formattedContent,
    citations: [...new Set(citations)],
    followupQuestions
  };
};

const extractAnswerContent = (answer: any): string => {
  if (typeof answer === "string") return answer;
  if (typeof answer?.content === "string") return answer.content;
  if (typeof answer?.answer === "string") return answer.answer;
  if (answer?.message?.content) return answer.message.content;
  if (answer?.completion) return answer.completion;

  return JSON.stringify(answer, null, 2);
};

const extractFollowupQuestions = (answer: any): string[] => {
  const sources = [
    answer?.context?.followup_questions,
    answer?.followupQuestions,
    answer?.suggested_questions
  ];

  for (const src of sources) {
    if (Array.isArray(src)) return src;
  }

  const toolCalls = answer?.response?.message?.tool_calls;
  if (Array.isArray(toolCalls)) {
    for (const call of toolCalls) {
      if (call.function?.name === "suggest_questions") {
        try {
          const args = JSON.parse(call.function.arguments);
          if (Array.isArray(args.questions)) return args.questions;
        } catch (e) {
          console.warn("Invalid JSON in suggest_questions:", e);
        }
      }
    }
  }

  return [];
};

const extractCitations = (content: string, answer: any): string[] => {
  const citations: string[] = [];

  const bracketRegex = /\[([\w\s-]+\.(pdf|docx|xlsx|txt|csv|json|js|php|html|xml))\]/gi;
  const parenthesisRegex = /"[^"]+"\s+\(([\w\s-]+\.(pdf|docx|xlsx|txt|csv|json|js|php|html|xml))\)/gi;

  for (const match of [...content.matchAll(bracketRegex)]) citations.push(match[1]);
  for (const match of [...content.matchAll(parenthesisRegex)]) citations.push(match[1]);

  citations.push(...extractAntmlCitations(content, answer));
  citations.push(...extractDocumentCitations(answer));

  return citations;
};

const extractAntmlCitations = (content: string, answer: any): string[] => {
  const citations: string[] = [];
  const regex = /<antml:cite[^>]*index="([^"]+)"[^>]*>.*?<\/antml:cite>/gi;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const docIndex = parseInt(match[1]?.split("-")[0]);
    const id = findDocumentIdByIndex(answer, docIndex);
    citations.push(id ?? `document-${docIndex}`);
  }

  return citations;
};

const extractDocumentCitations = (answer: any): string[] => {
  const sources = [
    answer?.citations,
    answer?.documents,
    answer?.searchResults?.sources,
    answer?.result?.documents
  ];

  const citations: string[] = [];

  for (const group of sources) {
    if (Array.isArray(group)) {
      for (const item of group) {
        if (item?.id != null) citations.push(String(item.id));
      }
    }
  }

  return citations;
};

const findDocumentIdByIndex = (answer: any, index: number): string | null => {
  const sources = [
    answer?.documents,
    answer?.searchResults?.sources,
    answer?.result?.documents
  ];

  for (const source of sources) {
    if (Array.isArray(source) && source[index]) {
      return String(source[index].id ?? null);
    }
  }

  return null;
};

const parseCitationText = (citation: string): string => {
  if (citation.includes("/")) return citation.split("/").pop()!;
  return citation.replace(/^(groundx:|azure:|gx:)/i, "");
};

const formatContentWithCitations = (content: string, citations: string[]): string => {
  let formatted = content;

  formatted = formatted.replace(
    /<antml:cite[^>]*index="([^"]+)"[^>]*>(.*?)<\/antml:cite>/gi,
    (_, index, text) => {
      const docIndex = parseInt(index.split("-")[0]);
      const citationIndex = citations.findIndex(
        c => c === `document-${docIndex}` || c.endsWith(`document-${docIndex}`)
      ) + 1;
      return `${text} <sup class="text-blue-600 font-bold cursor-pointer citation-number" data-citation-index="${citationIndex}">[${citationIndex}]</sup>`;
    }
  );

  citations.forEach((citation, i) => {
    const citationText = parseCitationText(citation);
    const regex = new RegExp(`\\[${citationText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g');
    formatted = formatted.replace(
      regex,
      `<sup class="text-blue-600 font-bold cursor-pointer citation-number" data-citation-index="${i + 1}">[${i + 1}]</sup>`
    );
  });

  formatted = formatted.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, text, url) =>
      `<a href="${encodeURI(url)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline">${text}</a>`
  );

  return formatted;
};
