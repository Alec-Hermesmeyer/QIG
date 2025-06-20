'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
// Removed complex backend hooks to avoid network errors

interface SimpleVoiceNavigationProps {
  enabled?: boolean;
  clientId?: string;
}

// Query patterns for RAG pages
const QUERY_PATTERNS = [
  /what is|what are|what does|what can/i,
  /how do|how can|how does|how to/i,
  /tell me|explain|describe/i,
  /find|search|look for/i,
  /show me|give me|provide/i,
  /where is|where can|where does/i,
  /when is|when did|when does/i,
  /why is|why does|why did/i,
  /who is|who are|who did/i
];

// RAG page detection
const RAG_PAGES = ['/fast-rag', '/deep-rag'];

export const SimpleVoiceNavigation: React.FC<SimpleVoiceNavigationProps> = ({
  enabled = true,
  clientId = 'default-user'
}) => {
  const pathname = usePathname();
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');
  const [isOnRAGPage, setIsOnRAGPage] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Use refs to avoid circular dependencies
  const recognitionRef = useRef<any>(null);
  const enabledRef = useRef(enabled);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Note: Removed complex backend hooks to avoid "Load failed" errors
  // Using simple pattern matching instead

  // Initialize audio element for TTS playback
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.onended = () => setIsSpeaking(false);
    audioRef.current.onerror = () => setIsSpeaking(false);
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Check if we're on a RAG page
  useEffect(() => {
    setIsOnRAGPage(RAG_PAGES.includes(pathname));
  }, [pathname]);

  // Update enabled ref when prop changes
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // Play TTS audio directly from backend
  const playBackendTTSResponse = async (audioData: string) => {
    try {
      setIsSpeaking(true);
      console.log('[SimpleVoiceNav] Playing backend TTS audio');
      
      // Decode base64 audio data
      const audioBlob = new Blob([
        Uint8Array.from(atob(audioData), c => c.charCodeAt(0))
      ], { type: 'audio/mpeg' });
      
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
        
        // Clean up URL after playing
        audioRef.current.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
      }
    } catch (error) {
      console.error('[SimpleVoiceNav] Backend TTS playback failed:', error);
      setIsSpeaking(false);
    }
  };

  // Process voice input with simple pattern matching (no backend dependencies)
  const processVoiceInput = async (transcript: string) => {
    try {
      console.log('[SimpleVoiceNav] Processing voice input:', transcript);
      setLastCommand(transcript);
      
      const lowerTranscript = transcript.toLowerCase().trim();
      console.log('[SimpleVoiceNav] Processing transcript:', lowerTranscript);
      
      // Simple pattern matching for common commands
      let commandExecuted = false;
      
      // Navigation commands
      if (lowerTranscript.includes('go to') || lowerTranscript.includes('navigate to') || lowerTranscript.includes('open')) {
        console.log('[SimpleVoiceNav] Navigation command detected');
        const pages = {
          'dashboard': '/',
          'home': '/',
          'rag': '/fast-rag',
          'fast rag': '/fast-rag',
          'deep rag': '/deep-rag',
          'chat': '/fast-rag',
          'settings': '/settings'
        };
        
        for (const [pageName, path] of Object.entries(pages)) {
          if (lowerTranscript.includes(pageName)) {
            console.log(`[SimpleVoiceNav] Navigating to ${pageName} (${path})`);
            window.location.href = path;
            showFeedback(`Navigating to ${pageName}`);
            commandExecuted = true;
            break;
          }
        }
        
        if (!commandExecuted) {
          console.log('[SimpleVoiceNav] Navigation command detected but no page matched');
          showFeedback('Navigation command heard but page not recognized');
        }
      }
      
      // Chat commands (for RAG pages)
      else if (isOnRAGPage && (QUERY_PATTERNS.some(pattern => pattern.test(lowerTranscript)))) {
        console.log('[SimpleVoiceNav] Chat command detected on RAG page');
        const chatInput = document.querySelector('input[placeholder*="message"], textarea[placeholder*="message"], input[type="text"]') as HTMLInputElement;
        console.log('[SimpleVoiceNav] Chat input found:', !!chatInput);
        
        if (chatInput) {
          // Set the value
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(chatInput, transcript);
          } else {
            chatInput.value = transcript;
          }
          
          // Trigger events
          chatInput.dispatchEvent(new Event('input', { bubbles: true }));
          chatInput.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Try to submit
          const submitButton = document.querySelector('button[type="submit"], button:has(svg)') as HTMLButtonElement;
          console.log('[SimpleVoiceNav] Submit button found:', !!submitButton);
          
          if (submitButton && !submitButton.disabled) {
            setTimeout(() => submitButton.click(), 100);
            showFeedback(`Sent message: "${transcript}"`);
            commandExecuted = true;
          } else {
            showFeedback(`Message entered: "${transcript}" - Click send to submit`);
            commandExecuted = true;
          }
        } else {
          console.log('[SimpleVoiceNav] No chat input found');
          showFeedback('Chat input not found on this page');
        }
      }
      
      // Button click commands
      else if (lowerTranscript.includes('click') || lowerTranscript.includes('press') || lowerTranscript.includes('submit') || lowerTranscript.includes('send')) {
        console.log('[SimpleVoiceNav] Button click command detected');
        const buttons = Array.from(document.querySelectorAll('button'));
        console.log('[SimpleVoiceNav] Found buttons:', buttons.length);
        
        // Try to find a specific button first
        let targetButton = buttons.find(btn => {
          const text = btn.textContent?.toLowerCase() || '';
          return text.includes('submit') || text.includes('send') || text.includes('chat') || 
                 (lowerTranscript.includes('click') && text.length > 0);
        });
        
        // If no specific button found, just use the first visible button
        if (!targetButton && buttons.length > 0) {
          targetButton = buttons.find(btn => btn.offsetParent !== null); // visible button
        }
        
        if (targetButton) {
          console.log('[SimpleVoiceNav] Clicking button:', targetButton.textContent);
          targetButton.click();
          showFeedback(`Clicked: ${targetButton.textContent || 'button'}`);
          commandExecuted = true;
        } else {
          console.log('[SimpleVoiceNav] No suitable button found');
          showFeedback('No clickable button found');
        }
      }
      
      // Scroll commands
      else if (lowerTranscript.includes('scroll down') || lowerTranscript.includes('down')) {
        console.log('[SimpleVoiceNav] Scroll down command');
        window.scrollBy(0, 300);
        showFeedback('Scrolled down');
        commandExecuted = true;
      }
      else if (lowerTranscript.includes('scroll up') || lowerTranscript.includes('up')) {
        console.log('[SimpleVoiceNav] Scroll up command');
        window.scrollBy(0, -300);
        showFeedback('Scrolled up');
        commandExecuted = true;
      }
      
      // Clear commands
      else if (lowerTranscript.includes('clear') && lowerTranscript.includes('chat')) {
        console.log('[SimpleVoiceNav] Clear chat command');
        const clearButton = document.querySelector('button[title*="clear"], button[aria-label*="clear"]') as HTMLButtonElement;
        if (clearButton) {
          clearButton.click();
          showFeedback('Chat cleared');
          commandExecuted = true;
        }
      }
      
      // Test command for debugging
      else if (lowerTranscript.includes('test') || lowerTranscript.includes('hello')) {
        console.log('[SimpleVoiceNav] Test command detected');
        showFeedback('Test command working! Voice is functional.');
        commandExecuted = true;
      }
      
      if (!commandExecuted) {
        console.log('[SimpleVoiceNav] No command pattern matched');
        showFeedback(`Voice heard: "${transcript}" - Command not recognized. Try "test", "scroll down", or "click"`);
      }
      
    } catch (error) {
      console.error('[SimpleVoiceNav] Voice processing error:', error);
      showFeedback('Sorry, I had trouble processing that. Could you try again?');
    }
  };

  // Initialize speech recognition (independent of backend session)
  useEffect(() => {
    if (!enabled) return;

    // Check browser support
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[SimpleVoiceNav] Speech Recognition not supported');
      return;
    }

    // Initialize recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      if (enabledRef.current) {
        setIsListening(true);
        console.log('[SimpleVoiceNav] Voice recognition started');
      }
    };

    recognition.onresult = async (event: any) => {
      if (!enabledRef.current) return;

      const lastResult = event.results[event.results.length - 1];
      if (lastResult.isFinal) {
        const transcript = lastResult[0].transcript.trim();
        console.log('[SimpleVoiceNav] Voice input:', transcript);
        
        // Process all voice input through the enhanced backend
        await processVoiceInput(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[SimpleVoiceNav] Speech recognition error:', event.error);
      
      // Restart on certain errors
      if (event.error === 'network' || event.error === 'audio-capture') {
        setTimeout(() => {
          if (enabledRef.current && recognitionRef.current) {
            startListening();
          }
        }, 2000);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      
      // Auto-restart if still enabled
      if (enabledRef.current) {
        setTimeout(() => {
          startListening();
        }, 1000);
      }
    };

    recognitionRef.current = recognition;

    // Start listening
    const startListening = () => {
      if (recognitionRef.current && enabledRef.current) {
        try {
          recognitionRef.current.start();
        } catch (error) {
          console.warn('[SimpleVoiceNav] Recognition already started or error:', error);
        }
      }
    };

    startListening();

    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, [enabled]); // Auto-start regardless of backend session status

  // Show feedback function with automatic cleanup
  const showFeedback = (message: string) => {
    setFeedback(message);
    
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback('');
    }, 5000);
  };

  // Don't render if disabled
  if (!enabled) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div 
        className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg border border-gray-600 transition-all duration-200"
        title={`Enhanced Voice Assistant: ${isListening ? 'Listening...' : 'Inactive'}`}
      >
        <div className="flex items-center space-x-2">
          {/* Microphone Icon */}
          <div className="relative">
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="currentColor"
              className={isListening ? 'text-green-400' : 'text-gray-400'}
            >
              <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
            </svg>
            
            {/* Status Dots */}
            <div className="absolute -top-1 -right-1 flex space-x-1">
              {/* Listening Status */}
              <div className={`w-2 h-2 rounded-full border border-gray-900 ${
                isListening ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
              }`} />
              
              {/* Speaking Status */}
              {isSpeaking && (
                <div className="w-2 h-2 rounded-full border border-gray-900 bg-blue-400 animate-pulse" />
              )}
            </div>
          </div>
          
          {/* Status Text */}
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {isListening ? 'Listening...' : 
               isSpeaking ? 'Speaking...' :
               'Voice Assistant'}
            </span>
            
            <span className="text-xs text-blue-300">
              {isOnRAGPage ? '💬 Chat Mode' : '🧭 Nav Mode'} • 
              {isListening ? 'Active' : 'Inactive'}
            </span>
            
            {feedback && (
              <span className="text-xs text-green-300 max-w-64 truncate">
                {feedback}
              </span>
            )}
            
            {lastCommand && !feedback && (
              <span className="text-xs text-purple-300 truncate max-w-32">
                "{lastCommand}"
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 