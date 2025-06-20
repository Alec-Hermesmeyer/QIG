'use client';

import { useEffect, useState } from 'react';

interface VoiceQuestionResult {
  question: string | null;
  isVoiceQuestion: boolean;
  clearVoiceQuestion: () => void;
}

export const useVoiceQuestion = (): VoiceQuestionResult => {
  const [question, setQuestion] = useState<string | null>(null);
  const [isVoiceQuestion, setIsVoiceQuestion] = useState(false);

  useEffect(() => {
    // Check for voice question in sessionStorage AND URL params
    const checkForVoiceQuestion = () => {
      console.log('[useVoiceQuestion] Checking for voice question...');
      
      if (typeof window !== 'undefined') {
        let foundQuestion = null;
        
        // First check URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const urlQuestion = urlParams.get('voiceQuestion');
        
        if (urlQuestion) {
          console.log('[useVoiceQuestion] Found voice question in URL:', urlQuestion);
          foundQuestion = decodeURIComponent(urlQuestion);
          
          // Clear URL parameter
          urlParams.delete('voiceQuestion');
          const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
          window.history.replaceState({}, '', newUrl);
        } else {
          // Check sessionStorage as fallback
          const voiceQuestion = sessionStorage.getItem('voiceQuestion');
          const timestamp = sessionStorage.getItem('voiceQuestionTimestamp');
          
          console.log('[useVoiceQuestion] Found in storage:', { voiceQuestion, timestamp });
          
          if (voiceQuestion && timestamp) {
            const questionAge = Date.now() - parseInt(timestamp);
            console.log('[useVoiceQuestion] Question age:', questionAge, 'ms');
            
            // Only use questions that are less than 30 seconds old
            if (questionAge < 30000) {
              foundQuestion = voiceQuestion;
            } else {
              console.log('[useVoiceQuestion] Question too old, cleaning up');
              // Clean up old questions
              sessionStorage.removeItem('voiceQuestion');
              sessionStorage.removeItem('voiceQuestionTimestamp');
            }
          }
        }
        
        if (foundQuestion) {
          console.log('[useVoiceQuestion] Setting voice question:', foundQuestion);
          setQuestion(foundQuestion);
          setIsVoiceQuestion(true);
          console.log('[useVoiceQuestion] Voice question state set, waiting for component to process...');
        } else {
          console.log('[useVoiceQuestion] No voice question found');
        }
      }
    };

    // Check immediately
    checkForVoiceQuestion();
    
    // Also check with delays to catch async navigation
    setTimeout(checkForVoiceQuestion, 100);
    setTimeout(checkForVoiceQuestion, 500);
    setTimeout(checkForVoiceQuestion, 1000);

    // Also check when the page becomes visible (in case of navigation)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('[useVoiceQuestion] Page became visible, checking for voice question');
        checkForVoiceQuestion();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const clearVoiceQuestion = () => {
    console.log('[useVoiceQuestion] Clearing voice question...');
    setQuestion(null);
    setIsVoiceQuestion(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('voiceQuestion');
      sessionStorage.removeItem('voiceQuestionTimestamp');
      console.log('[useVoiceQuestion] Cleared from sessionStorage');
    }
  };

  return {
    question,
    isVoiceQuestion,
    clearVoiceQuestion
  };
}; 