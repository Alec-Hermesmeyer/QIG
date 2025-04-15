// Intentionally minimal to avoid parsing errors
export interface ParsedAnswer {
    answerHtml: string;
    citations: string[];
  }
  
  export const parseAnswerToHtml = (
    answer: any,
    isStreaming: boolean,
    onCitationClicked: (filePath: string) => void
  ): ParsedAnswer => {
    // Get content directly from the string or object
    let content = "";
    try {
      if (typeof answer === 'string') {
        content = answer;
      } else if (typeof answer?.answer === 'string') {
        content = answer.answer;
      } else {
        // Fallback: stringify the object
        content = JSON.stringify(answer);
      }
    } catch (e) {
      console.error("Error parsing answer:", e);
      content = "Error processing response";
    }
  
    // No citation processing for now, just return the raw content
    return {
      answerHtml: content,
      citations: []
    };
  };