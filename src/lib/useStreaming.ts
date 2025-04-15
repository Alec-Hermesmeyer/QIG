import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to handle streaming API responses
 * Accumulates chunks of text into a complete response
 */
export function useStreamingResponse() {
  // Store the accumulated content
  const [content, setContent] = useState('');
  // Track citations separately for easy reference
  const [citations, setCitations] = useState<string[]>([]);
  // Track streaming state
  const [isStreaming, setIsStreaming] = useState(false);
  // Track if there was an error
  const [error, setError] = useState<string | null>(null);

  // Reset everything
  const reset = useCallback(() => {
    setContent('');
    setCitations([]);
    setIsStreaming(false);
    setError(null);
  }, []);

  // Process a chunk of streaming content
  const processChunk = useCallback((chunk: any) => {
    try {
      // If we get a plain string, just append it
      if (typeof chunk === 'string') {
        setContent(prev => prev + chunk);
        return;
      }

      // If we get an object with content property (common format from OpenAI)
      if (chunk && typeof chunk.content === 'string') {
        setContent(prev => prev + chunk.content);
        return;
      }

      // Fallback: try to stringify and append
      setContent(prev => prev + JSON.stringify(chunk));
    } catch (e) {
      console.error('Error processing chunk:', e);
      setError('Error processing response chunk');
    }
  }, []);

  // Process a complete response at once
  const setCompleteResponse = useCallback((response: any) => {
    try {
      // Reset first
      reset();
      
      // If we get a string, use it directly
      if (typeof response === 'string') {
        setContent(response);
        return;
      }
      
      // If it has an answer property (common format)
      if (response && typeof response.answer === 'string') {
        setContent(response.answer);
        return;
      }
      
      // If we get an object with content property
      if (response && typeof response.content === 'string') {
        setContent(response.content);
        return;
      }
      
      // Fallback: try to stringify
      setContent(JSON.stringify(response));
    } catch (e) {
      console.error('Error setting complete response:', e);
      setError('Error processing response');
    }
  }, [reset]);

  // Start streaming - setup state for a new stream
  const startStreaming = useCallback(() => {
    reset();
    setIsStreaming(true);
  }, [reset]);

  // End streaming - finalize state
  const endStreaming = useCallback(() => {
    setIsStreaming(false);
    
    // Extract citations from the content
    const citationRegex = /\[([\w\s-]+\.(pdf|docx|xlsx|txt|csv))\]/gi;
    const matches = [...content.matchAll(citationRegex)];
    if (matches.length > 0) {
      setCitations(matches.map(match => match[1]));
    }
  }, [content]);

  return {
    content,
    citations,
    isStreaming,
    error,
    reset,
    processChunk,
    setCompleteResponse,
    startStreaming,
    endStreaming
  };
}