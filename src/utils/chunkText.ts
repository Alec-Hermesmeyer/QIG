// src/utils/chunkText.ts

/**
 * Splits text into chunks of specified maximum size while preserving paragraph structure
 * @param text The full text to chunk
 * @param maxWords Maximum number of words per chunk
 * @returns Array of text chunks
 */
export const chunkText = (text: string, maxWords = 1500): string[] => {
    // Clean up the text
    const cleanText = text.replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  
    // If text is small enough to fit in one chunk, return it
    if (cleanText.split(/\s+/).length <= maxWords) {
      return [cleanText];
    }
  
    // Split by paragraphs
    const paragraphs = cleanText.split(/\n{2,}/).filter(p => p.trim().length > 0);
  
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentWordCount = 0;
  
    // Group paragraphs into chunks
    for (const paragraph of paragraphs) {
      const paragraphWordCount = paragraph.split(/\s+/).length;
  
      // If a single paragraph is larger than maxWords, split it
      if (paragraphWordCount > maxWords) {
        // Handle large paragraphs
        handleLargeParagraph(paragraph, maxWords, chunks, currentChunk, currentWordCount);
        // Reset current chunk after handling large paragraph
        currentChunk = [];
        currentWordCount = 0;
      }
      // Normal paragraph handling
      else if (currentWordCount + paragraphWordCount <= maxWords) {
        // Add to current chunk if it fits
        currentChunk.push(paragraph);
        currentWordCount += paragraphWordCount;
      } else {
        // Current chunk is full, add it to chunks and start a new one
        chunks.push(currentChunk.join('\n\n'));
        currentChunk = [paragraph];
        currentWordCount = paragraphWordCount;
      }
    }
  
    // Add the last chunk if not empty
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n\n'));
    }
  
    return chunks;
  };
  
  /**
   * Helper function to handle paragraphs larger than the max words limit
   */
  function handleLargeParagraph(
    paragraph: string, 
    maxWords: number, 
    chunks: string[], 
    currentChunk: string[], 
    currentWordCount: number
  ): void {
    // If we have anything in the current chunk, add it first
    if (currentWordCount > 0) {
      chunks.push(currentChunk.join('\n\n'));
    }
  
    // Split large paragraph into sentences
    const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
    let sentenceChunk: string[] = [];
    let sentenceWordCount = 0;
  
    for (const sentence of sentences) {
      const sentenceWords = sentence.trim().split(/\s+/).length;
  
      if (sentenceWordCount + sentenceWords <= maxWords) {
        sentenceChunk.push(sentence.trim());
        sentenceWordCount += sentenceWords;
      } else {
        // Add current sentence chunk if not empty
        if (sentenceChunk.length > 0) {
          chunks.push(sentenceChunk.join(' '));
          sentenceChunk = [sentence.trim()];
          sentenceWordCount = sentenceWords;
        } else {
          // If a single sentence is too long, force-split it by words
          handleLargeSentence(sentence, maxWords, chunks);
        }
      }
    }
  
    // Add any remaining sentences
    if (sentenceChunk.length > 0) {
      chunks.push(sentenceChunk.join(' '));
    }
  }
  
  /**
   * Helper function to handle sentences larger than the max words limit
   */
  function handleLargeSentence(sentence: string, maxWords: number, chunks: string[]): void {
    const words = sentence.trim().split(/\s+/);
    let wordChunk: string[] = [];
  
    for (const word of words) {
      if (wordChunk.length < maxWords) {
        wordChunk.push(word);
      } else {
        chunks.push(wordChunk.join(' '));
        wordChunk = [word];
      }
    }
  
    if (wordChunk.length > 0) {
      chunks.push(wordChunk.join(' '));
    }
  }