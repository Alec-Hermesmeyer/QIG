'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// Type definitions for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface GlobalVoiceNavigationProps {
  enabled?: boolean;
}

export const GlobalVoiceNavigation: React.FC<GlobalVoiceNavigationProps> = ({
  enabled = true
}) => {
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState<string>('');
  const [isOnRAGPage, setIsOnRAGPage] = useState(false);
  
  // Enhanced features state
  const [showPanel, setShowPanel] = useState(false);
  const [clientId, setClientId] = useState<string>('');
  const [preferences, setPreferences] = useState<any>({});
  const [commandHistory, setCommandHistory] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [behaviorStats, setBehaviorStats] = useState<any>({});
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);
  const [fullResponse, setFullResponse] = useState<string>('');
  
  // TTS state
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [ttsAudio, setTTSAudio] = useState<HTMLAudioElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const recognitionRef = useRef<any>(null);
  const isInitializedRef = useRef(false);
  const wsRef = useRef<WebSocket | null>(null);

  const log = useCallback((message: string, data?: any) => {
    console.log(`[GlobalVoiceNav] ${message}`, data || '');
  }, []);

  // Initialize persistent client ID
  useEffect(() => {
    const getOrCreateClientId = () => {
      let storedClientId = localStorage.getItem('voice_nav_client_id');
      if (!storedClientId) {
        storedClientId = `voice-user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('voice_nav_client_id', storedClientId);
      }
      setClientId(storedClientId);
      log('🆔 Client ID initialized:', storedClientId);
    };

    getOrCreateClientId();
  }, [log]);

  // Load user preferences and data
  const loadUserData = useCallback(async () => {
    if (!clientId) return;

    try {
      setIsLoadingPreferences(true);
      
      // Load preferences
      const prefsResponse = await fetch(`http://localhost:8080/api/user-preferences/${clientId}`);
      if (prefsResponse.ok) {
        const prefsData = await prefsResponse.json();
        setPreferences(prefsData.preferences || {});
        log('👤 User preferences loaded:', prefsData.preferences);
      }

      // Load behavior stats and suggestions
      const statsResponse = await fetch(`http://localhost:8080/api/user-preferences/${clientId}/behavior-stats`);
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setBehaviorStats(statsData.commonActions || {});
        setSuggestions(statsData.suggestions || []);
        log('📊 Behavior stats loaded:', statsData);
      }

      // Load conversation history
      const historyResponse = await fetch(`http://localhost:8080/api/user-preferences/${clientId}/conversation-history?limit=10`);
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setConversationHistory(historyData.conversations || []);
        log('📚 Conversation history loaded:', `${historyData.conversations?.length || 0} conversations`);
      }

    } catch (error) {
      console.error('[GlobalVoiceNav] Error loading user data:', error);
    } finally {
      setIsLoadingPreferences(false);
    }
  }, [clientId, log]);

  // Load user data when client ID changes
  useEffect(() => {
    if (clientId) {
      loadUserData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]); // Removed loadUserData from dependency array to prevent infinite loop

  // Show success feedback
  const showSuccessFeedback = useCallback((message: string) => {
    setFeedback(message);
    setShowSuccess(true);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      setShowSuccess(false);
      setFeedback('');
    }, 3000);
  }, []);

  // Update user preference
  const updatePreference = useCallback(async (key: string, value: string) => {
    if (!clientId) return;

    try {
      const response = await fetch(`http://localhost:8080/api/user-preferences/${clientId}/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value })
      });

      if (response.ok) {
        setPreferences((prev: any) => ({ ...prev, [key]: value }));
        log(`⚙️ Updated preference ${key}:`, value);
        showSuccessFeedback(`Updated ${key} to ${value}`);
        
        // Reload user data to get updated suggestions
        setTimeout(() => {
          if (clientId) {
            loadUserData();
          }
        }, 500);
      }
    } catch (error) {
      console.error('[GlobalVoiceNav] Error updating preference:', error);
      showSuccessFeedback('Error updating preference');
    }
  }, [clientId, log, showSuccessFeedback]); // Removed loadUserData to prevent circular dependency

  // Initialize TTS audio element
  useEffect(() => {
    try {
      const audio = new Audio();
      
      audio.onended = () => {
        log('🔊 TTS audio ended');
        setIsPlayingTTS(false);
      };
      
      audio.onplay = () => {
        log('🔊 TTS audio started playing');
        setIsPlayingTTS(true);
      };
      
      audio.onpause = () => {
        log('🔊 TTS audio paused');
        setIsPlayingTTS(false);
      };
      
      audio.onerror = () => {
        console.error('[GlobalVoiceNav] TTS audio error details:', {
          code: audio.error?.code,
          message: audio.error?.message,
          src: audio.src,
          readyState: audio.readyState,
          networkState: audio.networkState
        });
        
        setIsPlayingTTS(false);
        
        // Clean up problematic audio source
        if (audio.src) {
          try {
            URL.revokeObjectURL(audio.src);
          } catch (e) {
            // Ignore cleanup errors
          }
          audio.src = '';
        }
      };

      audio.onloadstart = () => log('🔊 TTS audio load started');
      audio.onloadeddata = () => log('🔊 TTS audio data loaded');
      audio.oncanplay = () => log('🔊 TTS audio can play');
      
      audioRef.current = audio;
      setTTSAudio(audio);

      log('🔊 TTS audio element initialized');

      return () => {
        try {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
            audioRef.current = null;
          }
        } catch (e) {
          console.warn('[GlobalVoiceNav] Error cleaning up audio:', e);
        }
      };
    } catch (error) {
      console.error('[GlobalVoiceNav] Error initializing audio element:', error);
    }
  }, [log]);

  // Play TTS response
  const playTTSResponse = useCallback(async (text: string) => {
    if (!text || !clientId) return;

    try {
      log('🔊 Generating TTS for response:', text.substring(0, 50) + '...');
      
      // Get user's preferred voice
      const voiceModel = preferences.preferred_voice || 'alloy';
      const voiceSpeed = preferences.voice_speed || 'normal';
      
      // Convert speed to TTS speed value
      const speedMap = { slow: '0.75', normal: '1.0', fast: '1.25' };
      const speed = speedMap[voiceSpeed as keyof typeof speedMap] || '1.0';

      const response = await fetch('http://localhost:8080/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          voice: voiceModel,
          speed: parseFloat(speed),
          clientId: clientId
        })
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        
        // Validate audio blob
        if (audioBlob.size === 0) {
          console.error('[GlobalVoiceNav] Received empty audio blob');
          return;
        }
        
        const audioUrl = URL.createObjectURL(audioBlob);
        log('🔊 Created audio URL:', audioUrl.substring(0, 50) + '...');
        
        if (audioRef.current) {
          try {
            // Stop current audio if playing
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            
            // Set new source
            audioRef.current.src = audioUrl;
            
            // Wait for audio to be ready
            audioRef.current.oncanplaythrough = async () => {
              try {
                if (audioRef.current) {
                  await audioRef.current.play();
                  log('✅ TTS audio playing');
                }
              } catch (playError) {
                console.error('[GlobalVoiceNav] Error playing TTS:', playError);
                URL.revokeObjectURL(audioUrl);
                setIsPlayingTTS(false);
              }
            };
            
            // Enhanced cleanup
            audioRef.current.onended = () => {
              log('🔊 TTS playback ended, cleaning up');
              setIsPlayingTTS(false);
              URL.revokeObjectURL(audioUrl);
            };
            
            // Load the audio
            audioRef.current.load();
            
          } catch (error) {
            console.error('[GlobalVoiceNav] Error setting up TTS audio:', error);
            URL.revokeObjectURL(audioUrl);
            setIsPlayingTTS(false);
          }
        }
      } else {
        const errorText = await response.text();
        console.error('[GlobalVoiceNav] TTS request failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
      }
    } catch (error) {
      console.error('[GlobalVoiceNav] TTS error:', error);
    }
  }, [clientId, preferences.preferred_voice, preferences.voice_speed, log]);

  // Stop TTS playback
  const stopTTS = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlayingTTS(false);
    }
  }, []);

  // Detect current page and RAG context
  useEffect(() => {
    const updatePageContext = () => {
      const path = window.location.pathname;
      setCurrentPage(path);
      
      const ragPage = path.includes('fast-rag') || path.includes('deep-rag');
      setIsOnRAGPage(ragPage);
      
      if (ragPage) {
        log(`📄 On RAG page: ${path} - Enabling query mode`);
      } else {
        log(`📄 On regular page: ${path} - Navigation mode only`);
      }
    };

    // Update on mount
    updatePageContext();

    // Listen for navigation changes
    const handlePopstate = () => updatePageContext();
    window.addEventListener('popstate', handlePopstate);

    // Also listen for pushstate/replacestate (for SPA navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(updatePageContext, 100);
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(updatePageContext, 100);
    };

    return () => {
      window.removeEventListener('popstate', handlePopstate);
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;
    };
  }, [log]);

  // Navigation command patterns
  const navigationPatterns = [
    /\b(go to|navigate to|open)\s+(dashboard|home|settings|profile|admin|help|support|fast.rag|deep.rag|fast rag|deep rag)/i,
    /\b(scroll|move)\s+(up|down|left|right)/i,
    /\b(click|press|tap)\s+(search|menu|button|link)/i,
    /\b(back|forward|refresh|reload)\b/i,
    /\b(close|hide|show|toggle)\s+(menu|sidebar|panel)/i
  ];

  // RAG query patterns (for when on RAG pages)
  const ragQueryPatterns = [
    /\b(what is|what are|explain|tell me about|describe|define)\b/i,
    /\b(how do|how does|how can|how to)\b/i,
    /\b(search for|find|look up|query)\b/i,
    /\b(ask about|question about)\b/i,
    /\b(analyze|summarize|compare)\b/i,
    /\b(show me|give me|provide)\b/i
  ];

  // Execute UI command received from WebSocket
  const executeUICommand = useCallback((command: any) => {
    try {
      log('🎬 Executing UI command:', command);
      
      // Handle navigation commands
      if (command.action === 'navigate' && command.parameters?.url) {
        const url = command.parameters.url;
        log(`🧭 Navigating to: ${url}`);
        showSuccessFeedback(`Navigating to ${url.replace('/', '')}`);
        
        // Small delay to allow TTS to start, then navigate
        setTimeout(() => {
          window.location.href = url;
        }, 1000); // Slightly longer delay to let short TTS play
        return;
      }
      
      // Handle scroll commands
      if (command.action === 'scroll') {
        const direction = command.parameters?.direction || command.direction;
        if (direction === 'up') {
          window.scrollBy(0, -300);
          log('⬆️ Scrolled up');
          showSuccessFeedback('Scrolled up');
        } else if (direction === 'down') {
          window.scrollBy(0, 300);
          log('⬇️ Scrolled down');
          showSuccessFeedback('Scrolled down');
        }
        return;
      }
      
      // Handle click commands
      if (command.action === 'click') {
        const selector = command.parameters?.selector || command.selector;
        if (selector) {
          const element = document.querySelector(selector);
          if (element) {
            (element as HTMLElement).click();
            log(`🖱️ Clicked element: ${selector}`);
            showSuccessFeedback('Clicked element');
          } else {
            log(`❌ Element not found: ${selector}`);
            showSuccessFeedback('Element not found');
          }
        }
        return;
      }
      
      // Handle voice feedback with TTS
      if (command.type === 'voice_feedback') {
        log(`🔊 Voice feedback: ${command.text}`);
        setFeedback(command.text);
        
        // Play TTS for voice feedback
        if (command.text && command.text.length > 10) {
          playTTSResponse(command.text);
        }
        return;
      }
      
      // Log unhandled commands
      log('❓ Unhandled command type:', command);
      
    } catch (error) {
      console.error('[GlobalVoiceNav] Error executing UI command:', error);
    }
  }, [log, showSuccessFeedback]);

  // Send query to chat system (for RAG pages)
  const sendToChat = useCallback((query: string) => {
    try {
      log('💬 Sending query to chat system:', query);
      showSuccessFeedback(`Asking: "${query.substring(0, 30)}..."`);

      // Find the chat input element
      const chatInput = document.querySelector('input[type="text"]') as HTMLInputElement;
      
      if (!chatInput) {
        log('❌ Chat input not found');
        showSuccessFeedback('Chat input not found');
        return;
      }

      // Focus the input
      chatInput.focus();

      // Set the value using React's internal setter
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value'
      )?.set;

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(chatInput, query);
      } else {
        chatInput.value = query;
      }

      // Trigger input event to update React state
      const inputEvent = new Event('input', { bubbles: true });
      chatInput.dispatchEvent(inputEvent);

      // Small delay to ensure React state is updated, then submit
      setTimeout(() => {
        // Find and trigger the form
        const form = chatInput.closest('form');
        if (form) {
          // Create and dispatch submit event
          const submitEvent = new Event('submit', {
            bubbles: true,
            cancelable: true
          });
          form.dispatchEvent(submitEvent);
          log('✅ Query sent via form submission');
        } else {
          log('❌ Form not found');
          showSuccessFeedback('Form not found');
        }
      }, 50);

    } catch (error) {
      console.error('[GlobalVoiceNav] Error sending to chat:', error);
      showSuccessFeedback('Error sending query');
    }
  }, [log, showSuccessFeedback]);

  // Initialize WebSocket connection for UI commands
  const initializeWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket('ws://localhost:8080/ws/ui-control');
      wsRef.current = ws;

      ws.onopen = () => {
        log('🔌 UI Control WebSocket connected');
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const command = JSON.parse(event.data);
          log('📨 Received UI command:', command);
          executeUICommand(command);
        } catch (error) {
          console.error('[GlobalVoiceNav] Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        log('🔌 UI Control WebSocket disconnected');
        setWsConnected(false);
        
        // Auto-reconnect after delay
        setTimeout(() => {
          if (enabled) {
            initializeWebSocket();
          }
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('[GlobalVoiceNav] WebSocket error:', error);
        setWsConnected(false);
      };

    } catch (error) {
      console.error('[GlobalVoiceNav] Error initializing WebSocket:', error);
    }
  }, [enabled, executeUICommand, log]);

  // Process voice command - send to backend
  const processVoiceCommand = useCallback(async (command: string) => {
    if (!clientId) return;

    try {
      setIsProcessing(true);
      log('🎯 Processing navigation command:', command);
      
      const response = await fetch('http://localhost:8080/api/voice/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: command,
          currentContext: currentPage || 'navigation',
          clientId: clientId
        })
      });

      if (response.ok) {
        const result = await response.json();
        log('✅ Command sent to backend:', result);
        
        // Store the full conversational response
        if (result.message) {
          setFullResponse(result.message);
          showSuccessFeedback(result.message);
          
          // Auto-play TTS response for conversational messages
          // For navigation commands, create a shorter response to avoid page change interruption
          if (result.message.length > 20) {
            const isNavigationCommand = navigationPatterns.some(pattern => pattern.test(command));
            
            if (isNavigationCommand) {
              // For navigation commands, use a shorter confirmation message
              const shortMessage = "Navigating now.";
              playTTSResponse(shortMessage);
            } else {
              // For non-navigation commands, play the full response
              playTTSResponse(result.message);
            }
          }
        } else {
          showSuccessFeedback('Command processed successfully');
        }
        
        setLastCommand(command);
        
        // Add to command history
        setCommandHistory(prev => [
          { command, timestamp: Date.now(), context: currentPage },
          ...prev.slice(0, 9) // Keep last 10 commands
        ]);
        
        // Reload user data to get updated stats
        setTimeout(() => loadUserData(), 1000);
        
        return result;
      } else {
        log('❌ Command failed:', response.status);
        showSuccessFeedback('Command failed');
      }
    } catch (error) {
      console.error('[GlobalVoiceNav] Command error:', error);
      showSuccessFeedback('Error processing command');
    } finally {
      setIsProcessing(false);
    }
  }, [clientId, currentPage, log, showSuccessFeedback, loadUserData]);

  // Initialize speech recognition
  const initializeSpeechRecognition = useCallback(() => {
    if (isInitializedRef.current || !enabled) return;

    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      log('❌ Speech Recognition not supported in this browser');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      // Configure recognition
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        log('🎤 Speech recognition started');
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const lastResult = event.results[event.results.length - 1];
        if (lastResult.isFinal) {
          const transcript = lastResult[0].transcript.trim();
          log('📝 Speech recognized:', transcript);
          
          // Check if it's a navigation command (always handle these)
          const isNavCommand = navigationPatterns.some(pattern => pattern.test(transcript));
          
          if (isNavCommand) {
            log('🧭 Navigation command detected:', transcript);
            processVoiceCommand(transcript);
            return;
          }

          // If on RAG page, check for query patterns
          if (isOnRAGPage) {
            const isRagQuery = ragQueryPatterns.some(pattern => pattern.test(transcript));
            
            if (isRagQuery) {
              log('💬 RAG query detected on RAG page:', transcript);
              sendToChat(transcript);
              return;
            } else {
              // On RAG page but not a clear query pattern - treat as RAG query anyway
              log('💬 On RAG page, treating as query:', transcript);
              sendToChat(transcript);
              return;
            }
          }
          
          // Not on RAG page and not navigation - ignore
          log('📝 Not a recognized command, ignoring:', transcript);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('[GlobalVoiceNav] Speech recognition error:', event.error);
        
        // Restart on certain errors
        if (event.error === 'network' || event.error === 'audio-capture') {
          setTimeout(() => {
            if (enabled && recognitionRef.current) {
              startListening();
            }
          }, 2000);
        }
      };

      recognition.onend = () => {
        log('🎤 Speech recognition ended');
        setIsListening(false);
        
        // Auto-restart if still enabled
        if (enabled) {
          setTimeout(() => {
            startListening();
          }, 1000);
        }
      };

      isInitializedRef.current = true;
      log('✅ Speech recognition initialized');
      
      // Auto-start listening
      startListening();

    } catch (error) {
      console.error('[GlobalVoiceNav] Error initializing speech recognition:', error);
    }
  }, [enabled, processVoiceCommand, navigationPatterns, log]);

  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return;

    try {
      recognitionRef.current.start();
      log('🎤 Starting to listen for voice commands...');
    } catch (error) {
      console.error('[GlobalVoiceNav] Error starting speech recognition:', error);
    }
  }, [isListening, log]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      log('🛑 Stopped listening for voice commands');
    }
  }, [log]);

  // Initialize on mount
  useEffect(() => {
    if (enabled) {
      // Initialize WebSocket first
      initializeWebSocket();
      
      // Small delay to avoid conflicts, then start speech recognition
      const timer = setTimeout(() => {
        initializeSpeechRecognition();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [enabled, initializeSpeechRecognition, initializeWebSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      if (wsRef.current) {
        wsRef.current.close();
      }
      isInitializedRef.current = false;
    };
  }, [stopListening]);

    // Enhanced visual indicator
  if (!enabled) return null;

  return (
    <>
      {/* Main Voice Navigation Indicator */}
      <div className="fixed bottom-4 left-4 z-50">
        <div 
          className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg border border-gray-600 cursor-pointer transition-all duration-200 hover:scale-105"
          title={`Voice Navigation: ${isListening ? 'Listening for commands...' : 'Click for options'}`}
          onClick={() => setShowPanel(!showPanel)}
        >
          <div className="flex items-center space-x-2">
            {/* Microphone Icon with Status */}
            <div className="relative">
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="currentColor"
                className={isListening ? 'text-green-400' : isProcessing ? 'text-yellow-400' : 'text-gray-400'}
              >
                <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
              </svg>
                          {/* Status Dot */}
            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 ${
              isListening ? 'bg-green-400 animate-pulse' : 
              isProcessing ? 'bg-yellow-400 animate-bounce' : 
              isPlayingTTS ? 'bg-purple-400 animate-pulse' :
              'bg-gray-500'
            }`} />
            {/* WebSocket Status */}
            <div className={`absolute -bottom-1 -right-1 w-2 h-2 rounded-full ${
              wsConnected ? 'bg-blue-400' : 'bg-red-400'
            }`} title={wsConnected ? 'Connected' : 'Disconnected'} />
            {/* TTS Status */}
            {isPlayingTTS && (
              <div className={`absolute -top-1 -left-1 w-2 h-2 rounded-full bg-purple-400 animate-pulse`} 
                   title="Playing voice response" />
            )}
            </div>
            
            {/* Status Text */}
            <div className="flex flex-col">
                          <span className="text-sm font-medium">
              {isListening ? 
                (isOnRAGPage ? 'Listening for queries...' : 'Listening...') : 
                isProcessing ? 'Processing...' : 
                isPlayingTTS ? 'Speaking...' :
                (isOnRAGPage ? 'Voice Query' : 'Voice Nav')
              }
            </span>
              <span className="text-xs text-blue-300">
                {isOnRAGPage ? '📝 Query Mode' : '🧭 Nav Mode'}
              </span>
              {lastCommand && (
                <span className="text-xs text-green-300 truncate max-w-32">
                  "{lastCommand}"
                </span>
              )}
            </div>

            {/* Expand Arrow */}
            <div className={`transform transition-transform duration-200 ${showPanel ? 'rotate-180' : ''}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 10l5 5 5-5z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Enhanced Control Panel */}
        {showPanel && (
          <div className="absolute bottom-full mb-2 left-0 w-96 bg-gray-900 text-white rounded-lg shadow-xl border border-gray-600 p-4 animate-slide-in-from-top">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Voice Assistant</h3>
              <button 
                onClick={() => setShowPanel(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            {/* Voice Controls */}
            <div className="space-y-4">
              {/* Listening Control */}
              <div className="flex items-center justify-between">
                <span className="text-sm">Voice Recognition</span>
                <button
                  onClick={isListening ? stopListening : startListening}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    isListening ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isListening ? 'Stop' : 'Start'}
                </button>
              </div>

              {/* TTS Control */}
              <div className="flex items-center justify-between">
                <span className="text-sm">Voice Response</span>
                <div className="flex items-center space-x-2">
                  {isPlayingTTS && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-xs text-green-400">Playing...</span>
                    </div>
                  )}
                  <button
                    onClick={stopTTS}
                    disabled={!isPlayingTTS}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                      isPlayingTTS ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 cursor-not-allowed'
                    }`}
                  >
                    Stop
                  </button>
                </div>
              </div>

              {/* Voice Preferences */}
              {!isLoadingPreferences && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-300">Preferences</h4>
                  
                  {/* Voice Model */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Voice Model</label>
                    <select 
                      value={preferences.preferred_voice || 'alloy'}
                      onChange={(e) => updatePreference('preferred_voice', e.target.value)}
                      className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                    >
                      <option value="alloy">Alloy</option>
                      <option value="echo">Echo</option>
                      <option value="fable">Fable</option>
                      <option value="nova">Nova</option>
                      <option value="onyx">Onyx</option>
                      <option value="shimmer">Shimmer</option>
                    </select>
                  </div>

                  {/* Response Style */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Response Style</label>
                    <select 
                      value={preferences.response_style || 'helpful'}
                      onChange={(e) => updatePreference('response_style', e.target.value)}
                      className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                    >
                      <option value="concise">Concise</option>
                      <option value="helpful">Helpful</option>
                      <option value="detailed">Detailed</option>
                    </select>
                  </div>

                  {/* Voice Speed */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Voice Speed</label>
                    <select 
                      value={preferences.voice_speed || 'normal'}
                      onChange={(e) => updatePreference('voice_speed', e.target.value)}
                      className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                    >
                      <option value="slow">Slow</option>
                      <option value="normal">Normal</option>
                      <option value="fast">Fast</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Smart Suggestions */}
              {suggestions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-300">Suggested Commands</h4>
                  <div className="grid grid-cols-1 gap-1">
                    {suggestions.slice(0, 3).map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          if (isOnRAGPage) {
                            sendToChat(suggestion);
                          } else {
                            processVoiceCommand(suggestion);
                          }
                          setShowPanel(false);
                        }}
                        className="text-left text-xs bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded border border-gray-600"
                      >
                        "{suggestion}"
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Commands */}
              {commandHistory.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-300">Recent Commands</h4>
                  <div className="max-h-20 overflow-y-auto space-y-1">
                    {commandHistory.slice(0, 3).map((cmd, index) => (
                      <div key={index} className="text-xs text-gray-400 flex justify-between">
                        <span>"{cmd.command}"</span>
                        <span className="text-gray-500">
                          {new Date(cmd.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Behavior Stats */}
              {Object.keys(behaviorStats).length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-300">Usage Stats</h4>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {Object.entries(behaviorStats).slice(0, 3).map(([action, count]) => (
                      <div key={action} className="bg-gray-800 px-2 py-1 rounded text-center">
                        <div className="font-medium">{count as number}</div>
                        <div className="text-gray-400 capitalize">{action.replace('_', ' ')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* User ID */}
              <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
                User ID: {clientId.split('-').pop()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Success Feedback Toast */}
      {showSuccess && feedback && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg animate-slide-in-from-top max-w-md">
          <div className="flex items-start space-x-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="mt-0.5 flex-shrink-0">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
            </svg>
            <div className="text-sm">
              {feedback.length > 100 ? (
                <div>
                  <div className="font-medium">{feedback.substring(0, 100)}...</div>
                  <div className="text-xs text-green-200 mt-1">Full response available in panel</div>
                </div>
              ) : (
                <span className="font-medium">{feedback}</span>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}; 