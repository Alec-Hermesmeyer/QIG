'use client';

import {
  useState,
  FormEvent,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle
} from 'react';
import { Send, Search, Mic, MicOff, Volume2, Loader2, VolumeX, Volume } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useRAG } from './RagChatProvider';

// Define interface for search configuration
interface SearchConfig {
  minSearchScore: number;
  minRerankerScore: number;
  includeCategory: string;
  excludeCategory: string | null;
  useSemanticRanker: boolean;
  useSemanticCaptions: boolean;
  retrievalMode: string;
}

// Define interface for chat configuration
interface ChatConfig {
  temperature?: number;
  seed?: string;
  streamResponse?: boolean;
  suggestFollowUpQuestions?: boolean;
  promptTemplate?: string;
  searchConfig?: SearchConfig;
}

interface ChatProps {
  onUserMessage: (message: string) => void;
  onAssistantMessage: (message: string) => void;
  onConversationStart?: () => void;
  onStreamingChange?: (isStreaming: boolean) => void;
  isDisabled?: boolean;
  useRAG?: boolean;
  ragBucketId?: number | null;
  isRAGEnabled?: boolean;
  selectedBucketId?: string | null;
  // Configuration props
  temperature?: number;
  seed?: string;
  streamResponses?: boolean;
  suggestFollowUpQuestions?: boolean;
  promptTemplate?: string;
  searchConfig?: SearchConfig;
  conversationContext?: any; // Add this property
}

export interface ImprovedChatHandle {
  submitMessage: (message: string) => void;
  updateConfig?: (config: ChatConfig) => void;
}

// Animation variants
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } }
};

const slideUp = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.3 } }
};

// Configuration for Deepgram and ElevenLabs
const DEEPGRAM_API_URL = 'wss://api.deepgram.com/v1/listen';
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

// Define proper TypeScript interfaces for Deepgram response
interface DeepgramWordInfo {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

interface DeepgramAlternative {
  transcript: string;
  confidence: number;
  words: DeepgramWordInfo[];
}

interface DeepgramResponse {
  type: string;
  channel_index: number[];
  is_final: boolean;
  speech_final: boolean;
  channel: {
    alternatives: DeepgramAlternative[];
  };
}

export const ImprovedChat = forwardRef<ImprovedChatHandle, ChatProps>(function ImprovedChat(
  props,
  ref
) {
  // Extract all the props you need
  const {
    onUserMessage,
    onAssistantMessage,
    onConversationStart,
    onStreamingChange,
    isDisabled = false,
    temperature = 0,
    seed,
    streamResponses = true,
    suggestFollowUpQuestions = false,
    promptTemplate,
    useRAG = false,
    ragBucketId = null,
    isRAGEnabled,
    selectedBucketId,
    searchConfig
  } = props;
 
  // Original state
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [accumulatedContent, setAccumulatedContent] = useState('');
  const [waitingForFirstChunk, setWaitingForFirstChunk] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Speech-to-text state
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  
  // Hands-free mode state
  const [isHandsFreeMode, setIsHandsFreeMode] = useState(false);
  const [isListeningForWakeWord, setIsListeningForWakeWord] = useState(false);
  const [isWakeWordDetected, setIsWakeWordDetected] = useState(false);
  const [handsFreeFeedback, setHandsFreeFeedback] = useState<string>('');
  const [autoSubmitCountdown, setAutoSubmitCountdown] = useState<number>(0);
  
  // Add a ref to track wake word state immediately without waiting for React state updates
  const wakeWordDetectedRef = useRef<boolean>(false);
  
  // Text-to-speech state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTTSLoading, setIsTTSLoading] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [currentTTSSummary, setCurrentTTSSummary] = useState<string>('');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Speech-to-text refs - Updated for modern Web Audio API
  const socketRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hands-free refs for continuous listening
  const wakeWordSocketRef = useRef<WebSocket | null>(null);
  const wakeWordStreamRef = useRef<MediaStream | null>(null);
  const wakeWordContextRef = useRef<AudioContext | null>(null);
  const wakeWordWorkletRef = useRef<AudioWorkletNode | null>(null);
  const wakeWordSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Auto-submit timer for hands-free mode
  const autoSubmitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const AUTO_SUBMIT_DELAY = 2000; // 2 seconds of silence before auto-submit

  // Keep a record of all messages for the session
  const [allMessages, setAllMessages] = useState<Array<{ 
    role: string; 
    content: string | { 
      content: string;
      sources?: any[];
      searchResults?: any;
      thoughtProcess?: string;
      supportingContent?: any[];
    };
    searchResults?: any;
  }>>([]);
  const [lastResponseTimestamp, setLastResponseTimestamp] = useState<number | null>(null);

  // Configuration state
  const [config, setConfig] = useState<ChatConfig>({
    temperature,
    seed,
    streamResponse: streamResponses,
    suggestFollowUpQuestions,
    promptTemplate,
    searchConfig
  });

  // Wake words and action words configuration
  const WAKE_WORDS = ['hey assistant', 'hello chat', 'hey chat', 'assistant'];
  const ACTION_WORDS = ['send', 'submit', 'go', 'execute'];

  // Update config when props change
  useEffect(() => {
    setConfig({
      temperature,
      seed,
      streamResponse: streamResponses,
      suggestFollowUpQuestions,
      promptTemplate,
      searchConfig
    });
  }, [temperature, seed, streamResponses, suggestFollowUpQuestions, promptTemplate, searchConfig]);

  // Imperative handle for parent-triggered submission and configuration
  useImperativeHandle(ref, () => ({
    submitMessage: (message: string) => {
      setInput(message);
      setTimeout(() => {
        const form = document.querySelector('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      }, 20);
    },
    updateConfig: (newConfig: ChatConfig) => {
      console.log("Chat component updating config:", newConfig);
      setConfig(prev => ({
        ...prev,
        ...newConfig
      }));
    }
  }));

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (!isLoading) {
      setAccumulatedContent('');
      setWaitingForFirstChunk(false);
    }
  }, [isLoading]);

  // Clean up speech-to-text resources on component unmount
  useEffect(() => {
    return () => {
      cleanupSpeechResources();
      cleanupAudioResources();
    };
  }, []);

  // Create audio element for TTS
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.onended = () => {
      setIsPlaying(false);
    };
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Handle audio source changes
  useEffect(() => {
    if (audioSrc && audioRef.current) {
      audioRef.current.src = audioSrc;
    }
  }, [audioSrc]);

  const cleanupSpeechResources = () => {
    try {
      console.log('[STT] Cleaning up speech resources...');
      
      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // Close WebSocket connection properly
      if (socketRef.current) {
        if (socketRef.current.readyState === WebSocket.OPEN) {
          try {
            // Send close stream message
            socketRef.current.send(JSON.stringify({ type: "CloseStream" }));
          } catch (err) {
            console.warn('[STT] Error sending close stream message:', err);
          }
        }
        
        socketRef.current.close();
        socketRef.current = null;
      }

      // Disconnect audio nodes
      if (workletNodeRef.current) {
        workletNodeRef.current.disconnect();
        workletNodeRef.current = null;
      }

      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }

      // Close audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
      }

      // Stop all media stream tracks
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => {
          track.stop();
          console.log('[STT] Stopped track:', track.kind);
        });
        mediaStreamRef.current = null;
      }

      console.log('[STT] Speech resources cleaned up successfully');
    } catch (error) {
      console.error('[STT] Error cleaning up speech resources:', error);
    }
  };

  const cleanupAudioResources = () => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        
        if (audioSrc) {
          URL.revokeObjectURL(audioSrc);
          setAudioSrc(null);
        }
      }
    } catch (error) {
      console.error('Error cleaning up audio resources:', error);
    }
  };

  // Create audio worklet for processing audio data
  const createAudioWorklet = async (audioContext: AudioContext): Promise<AudioWorkletNode> => {
    // Create inline audio worklet
    const workletCode = `
      class AudioProcessor extends AudioWorkletProcessor {
        constructor() {
          super();
          this.bufferSize = 4096;
          this.buffer = new Float32Array(this.bufferSize);
          this.bufferIndex = 0;
        }

        process(inputs, outputs, parameters) {
          const input = inputs[0];
          if (input.length > 0) {
            const inputData = input[0];
            
            for (let i = 0; i < inputData.length; i++) {
              this.buffer[this.bufferIndex] = inputData[i];
              this.bufferIndex++;
              
              if (this.bufferIndex >= this.bufferSize) {
                // Send buffer to main thread
                this.port.postMessage({
                  type: 'audioData',
                  buffer: this.buffer.slice()
                });
                this.bufferIndex = 0;
              }
            }
          }
          
          return true;
        }
      }

      registerProcessor('audio-processor', AudioProcessor);
    `;

    // Create blob URL for worklet
    const blob = new Blob([workletCode], { type: 'application/javascript' });
    const workletUrl = URL.createObjectURL(blob);

    try {
      await audioContext.audioWorklet.addModule(workletUrl);
      const workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
      
      // Clean up blob URL
      URL.revokeObjectURL(workletUrl);
      
      return workletNode;
    } catch (error) {
      URL.revokeObjectURL(workletUrl);
      throw error;
    }
  };

  const startSpeechToText = async () => {
    try {
      setIsConnecting(true);
      setSpeechError(null);
      console.log('[STT] Starting speech-to-text...');

      // Clean up any existing resources first
      cleanupSpeechResources();

      // Get the API key
      const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
      
      if (!apiKey) {
        const error = 'Deepgram API key is missing. Please add NEXT_PUBLIC_DEEPGRAM_API_KEY to your .env.local file.';
        console.error('[STT] ' + error);
        setSpeechError(error);
        setIsConnecting(false);
        return;
      }

      console.log('[STT] API key found, requesting microphone access...');
      
      // Request microphone access
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000,
            channelCount: 1
          } 
        });
        
        mediaStreamRef.current = stream;
        console.log('[STT] Microphone access granted');
      } catch (micError) {
        const errorMsg = 'Microphone access denied. Please allow microphone access and try again.';
        console.error('[STT] ' + errorMsg, micError);
        setSpeechError(errorMsg);
        setIsConnecting(false);
        return;
      }

      // Create WebSocket connection with proper authentication
      const wsUrl = `${DEEPGRAM_API_URL}?encoding=linear16&sample_rate=16000&channels=1&model=nova-2&language=en-US&smart_format=true&interim_results=true&punctuate=true`;
      
      console.log('[STT] Connecting to WebSocket...');
      
      try {
        // Connect using the token subprotocol as required by Deepgram
        const socket = new WebSocket(wsUrl, ['token', apiKey]);
        socketRef.current = socket;

        // Set up connection timeout
        const connectionTimeout = setTimeout(() => {
          if (socketRef.current?.readyState !== WebSocket.OPEN) {
            console.error('[STT] WebSocket connection timeout');
            setSpeechError('Connection to speech service timed out. Please try again.');
            cleanupSpeechResources();
            setIsConnecting(false);
          }
        }, 10000);

        socket.onopen = async () => {
          clearTimeout(connectionTimeout);
          console.log('[STT] WebSocket connection opened');
          
          // Authentication is handled via the subprotocol
          console.log('[STT] Authenticated via token subprotocol');
          
          try {
            // Create AudioContext
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const audioContext = new AudioContext({ sampleRate: 16000 });
            audioContextRef.current = audioContext;
            
            // Resume audio context if suspended
            if (audioContext.state === 'suspended') {
              await audioContext.resume();
            }
            
            console.log('[STT] AudioContext created, sample rate:', audioContext.sampleRate);
            
            if (mediaStreamRef.current) {
              // Create audio source
              const sourceNode = audioContext.createMediaStreamSource(mediaStreamRef.current);
              sourceNodeRef.current = sourceNode;
              
              console.log('[STT] Media stream source created');
              
              // Create audio worklet node
              const workletNode = await createAudioWorklet(audioContext);
              workletNodeRef.current = workletNode;
              
              // Handle audio data from worklet
              workletNode.port.onmessage = (event) => {
                if (event.data.type === 'audioData' && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                  try {
                    const buffer = event.data.buffer;
                    const pcmData = convertFloatToInt16(buffer);
                    socketRef.current.send(pcmData);
                  } catch (err) {
                    console.error('[STT] Error sending audio data:', err);
                  }
                }
              };
              
              // Connect audio pipeline
              sourceNode.connect(workletNode);
              
              console.log('[STT] Audio pipeline connected');
            }

            setIsRecording(true);
            setIsConnecting(false);
            console.log('[STT] Recording started successfully');
            
          } catch (audioError) {
            console.error('[STT] Error setting up audio:', audioError);
            setSpeechError('Error setting up audio processing. Please try again.');
            cleanupSpeechResources();
            setIsConnecting(false);
          }
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as DeepgramResponse;
            
            if (data && data.channel && data.channel.alternatives && data.channel.alternatives.length > 0) {
              const transcription = data.channel.alternatives[0].transcript;
              
              if (transcription && transcription.trim().length > 0) {
                console.log('[STT] ========== NEW TRANSCRIPTION ==========');
                console.log('[STT] Transcription:', transcription);
                console.log('[STT] Is final:', data.is_final);
                console.log('[STT] Current input before processing:', input);
                console.log('[STT] Wake word detected (state):', isWakeWordDetected);
                console.log('[STT] Wake word detected (ref):', wakeWordDetectedRef.current);
                console.log('[STT] Is recording:', isRecording);
                console.log('[STT] Hands-free mode:', isHandsFreeMode);
                
                // Use the ref for immediate access to wake word status
                const wakeWordActive = isWakeWordDetected || wakeWordDetectedRef.current;
                console.log('[STT] Wake word active (combined):', wakeWordActive);
                
                // CRITICAL DEBUG: Check all conditions that need to be true
                console.log('[STT] 🔍 CONDITION CHECK:');
                console.log('[STT] - data.is_final:', data.is_final);
                console.log('[STT] - isWakeWordDetected:', isWakeWordDetected);
                console.log('[STT] - wakeWordDetectedRef.current:', wakeWordDetectedRef.current);
                console.log('[STT] - wakeWordActive:', wakeWordActive);
                console.log('[STT] - isHandsFreeMode:', isHandsFreeMode);
                console.log('[STT] - transcription not empty:', transcription.trim().length > 0);
                
                if (data.is_final) {
                  console.log('[STT] ✅ Processing FINAL transcription');
                  
                  // Build the full text that would result from adding this transcription
                  const fullText = input + transcription.trim() + ' ';
                  console.log('[STT] Full text would be:', `"${fullText}"`);
                  
                  // Check for action words FIRST (immediate submit)
                  if (wakeWordActive && containsActionWord(fullText)) {
                    console.log('[STT] 🎯 ACTION WORD DETECTED - IMMEDIATE SUBMIT');
                    
                    const cleanMessage = extractMessageFromTranscript(fullText);
                    console.log('[STT] Cleaned message:', `"${cleanMessage}"`);
                    
                    if (cleanMessage.trim()) {
                      clearAutoSubmitTimer();
                      setInput(cleanMessage.trim());
                      setInterimTranscript('Action word detected - sending...');
                      
                      setTimeout(() => {
                        console.log('[STT] Executing handleHandsFreeSubmit for action word');
                        handleHandsFreeSubmit();
                      }, 100);
                      return;
                    }
                  } else {
                    console.log('[STT] ❌ No action word detected');
                    console.log('[STT] - Wake word active:', wakeWordActive);
                    console.log('[STT] - Contains action word:', containsActionWord(fullText));
                  }
                  
                  // Normal transcription - add to input
                  console.log('[STT] 📝 Adding transcription to input (no action word detected)');
                  let newInputValue = '';
                  setInput(prev => {
                    newInputValue = prev + transcription.trim() + ' ';
                    console.log('[STT] Input updated to:', `"${newInputValue}"`);
                    return newInputValue;
                  });
                  setInterimTranscript('');
                  
                  // CRITICAL: This is where the timer should start
                  console.log('[STT] 🚨 TIMER START DECISION POINT:');
                  console.log('[STT] - isWakeWordDetected:', isWakeWordDetected);
                  console.log('[STT] - wakeWordDetectedRef.current:', wakeWordDetectedRef.current);
                  console.log('[STT] - wakeWordActive:', wakeWordActive);
                  console.log('[STT] - isHandsFreeMode:', isHandsFreeMode);
                  console.log('[STT] - newInputValue:', `"${newInputValue}"`);
                  console.log('[STT] - newInputValue.trim():', `"${newInputValue.trim()}"`);
                  
                  if (wakeWordActive) {
                    console.log('[STT] 🕐 WAKE WORD ACTIVE - SHOULD START TIMER');
                    console.log('[STT] Will use text for timer:', `"${newInputValue}"`);
                    
                    // Pass the new text directly to avoid state update timing issues
                    setTimeout(() => {
                      console.log('[STT] 🚀 EXECUTING TIMER START NOW');
                      console.log('[STT] - Current isWakeWordDetected:', isWakeWordDetected);
                      console.log('[STT] - Current wakeWordDetectedRef:', wakeWordDetectedRef.current);
                      console.log('[STT] - Text to use:', `"${newInputValue}"`);
                      startAutoSubmitTimer(newInputValue);
                    }, 100);
                  } else {
                    console.log('[STT] ❌ TIMER NOT STARTED - Wake word not active');
                    console.log('[STT] This means wake word state was lost somehow');
                  }
                } else {
                  console.log('[STT] ⏸️ Processing INTERIM transcription');
                  
                  const fullText = input + transcription.trim();
                  console.log('[STT] Full interim text:', `"${fullText}"`);
                  
                  // Reset timer on any new speech activity
                  if (wakeWordActive) {
                    console.log('[STT] 🔄 Resetting timer due to interim speech');
                    resetAutoSubmitTimer();
                  } else {
                    console.log('[STT] ⚠️ Interim speech but wake word not active');
                  }
                  
                  // Check for action words in interim
                  if (wakeWordActive && containsActionWord(fullText)) {
                    console.log('[STT] 🎯 ACTION WORD IN INTERIM - PREPARING SUBMIT');
                    clearAutoSubmitTimer();
                    setInterimTranscript('Action word detected - sending now...');
                    
                    if (containsActionWord(transcription)) {
                      const cleanMessage = extractMessageFromTranscript(fullText);
                      if (cleanMessage.trim()) {
                        console.log('[STT] Executing immediate submit for interim action word');
                        setInput(cleanMessage.trim());
                        setTimeout(() => {
                          handleHandsFreeSubmit();
                        }, 200);
                        return;
                      }
                    }
                  } else {
                    setInterimTranscript(transcription);
                  }
                }
                
                console.log('[STT] ========== END TRANSCRIPTION PROCESSING ==========');
              } else {
                console.log('[STT] ⚠️ Empty transcription received');
              }
            } else {
              console.log('[STT] ⚠️ Invalid data structure received');
            }
          } catch (error) {
            console.error('[STT] ❌ Error parsing WebSocket message:', error);
          }
        };

        socket.onerror = (error) => {
          console.error('[STT] WebSocket error:', error);
          setSpeechError('Connection error occurred. Please try again.');
          cleanupSpeechResources();
          setIsConnecting(false);
        };

        socket.onclose = (event) => {
          console.log(`[STT] WebSocket connection closed: code ${event.code}, reason: ${event.reason || 'none'}`);
          if (isRecording) {
            cleanupSpeechResources();
            setIsRecording(false);
            setIsConnecting(false);
            setInterimTranscript('');
          }
        };

      } catch (socketError) {
        console.error('[STT] Error creating WebSocket:', socketError);
        setSpeechError('Failed to connect to speech service. Please try again.');
        cleanupSpeechResources();
        setIsConnecting(false);
      }
    } catch (error) {
      console.error('[STT] Error starting recording:', error);
      setSpeechError(error instanceof Error ? error.message : 'Failed to start recording');
      cleanupSpeechResources();
      setIsConnecting(false);
    }
  };

  // Utility function to convert Float32Array to Int16Array for Deepgram
  const convertFloatToInt16 = (buffer: Float32Array): ArrayBuffer => {
    const l = buffer.length;
    const buf = new Int16Array(l);
    
    for (let i = 0; i < l; i++) {
      // Convert float (-1 to 1) to int16 (-32768 to 32767)
      const sample = Math.max(-1, Math.min(1, buffer[i]));
      buf[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    
    return buf.buffer;
  };

  // Stop speech-to-text
  const stopSpeechToText = () => {
    console.log('[STT] Stopping speech-to-text...');
    clearAutoSubmitTimer(); // Clear any pending auto-submit
    cleanupSpeechResources();
    setIsRecording(false);
    setIsConnecting(false);
    setInterimTranscript('');
  };

  // IMPROVED: Generate a better summary of the response text for TTS
  const generateSummary = (text: string): string => {
    // Bail early for empty or very short text
    if (!text || typeof text !== 'string' || text.length < 20) {
      return "I don't have enough information to summarize.";
    }

    // Clean up text - remove document markers, citation tags, etc.
    const cleanText = text
      .replace(/<\/?document.*?>/g, '')
      .replace(/<\/?source>/g, '')
      .replace(/<\/?document_content>/g, '')
      .replace(/|<\/antml:cite>/g, '')
      .replace(/<userStyle>.*?<\/userStyle>/g, '')
      .replace(/\[\d+\]/g, '') // Remove citation numbers like [1], [2]
      .replace(/\n\s*\n/g, '\n'); // Normalize multiple newlines


    // Split into paragraphs and sentences
    const paragraphs = cleanText.split(/\n+/).filter(p => p.trim().length > 0);
    
    // If we have a short, well-structured response, just use it all
    if (paragraphs.length > 0 && cleanText.length <= 600) {
      return cleanText;
    }

    // Handle multi-paragraph responses
    if (paragraphs.length > 0) {
      // Get first paragraph + check if it's a good summary
      const firstPara = paragraphs[0].trim();
      
      // If first paragraph is good length for TTS and has complete sentences, use it
      if (firstPara.length >= 100 && firstPara.length <= 400 && 
          (firstPara.endsWith('.') || firstPara.endsWith('!') || firstPara.endsWith('?'))) {
        return firstPara;
      }
      
      // If first paragraph is too short, combine first 2 paragraphs if available
      if (firstPara.length < 100 && paragraphs.length > 1) {
        const combinedParas = firstPara + ' ' + paragraphs[1].trim();
        if (combinedParas.length <= 500) {
          return combinedParas;
        }
      }
      
      // Handle lists - combine opening paragraph with first few list items
      const isList = paragraphs.some(p => p.trim().match(/^[•\-\d*]\s/));
      if (isList && paragraphs.length > 2) {
        let summary = paragraphs[0] + ' ';
        
        // Add "Here are some key points: " as transition if not already implied
        if (!paragraphs[0].includes('key points') && 
            !paragraphs[0].includes('here are') && 
            !paragraphs[0].endsWith(':')) {
          summary += "Here are some key points: ";
        }
        
        // Add first 3 list items (or fewer if not available)
        const listItems = paragraphs.slice(1).filter(p => p.trim().match(/^[•\-\d*]\s/));
        const itemsToInclude = listItems.slice(0, 3);
        
        summary += itemsToInclude.map(item => item.trim()).join('. ');
        
        // Add "and more" if there are more items
        if (listItems.length > 3) {
          summary += ", and more.";
        }
        
        if (summary.length <= 600) {
          return summary;
        }
      }
    }
    
    // Split text into sentences for more granular control
    const sentences = cleanText.split(/(?<=[.!?])\s+/);
  
    // Build a coherent summary from sentences
    let summary = '';
    for (let i = 0; i < Math.min(sentences.length, 7); i++) {
      const sentence = sentences[i].trim();
      
      // Skip very short sentences that might just be acknowledgments or incomplete
      if (sentence.length < 10 || 
          sentence.toLowerCase().startsWith('hi') ||
          sentence.toLowerCase().startsWith('hello') ||
          sentence.toLowerCase().startsWith('thank')) {
        continue;
      }
      
      summary += sentence + ' ';
      
      // Stop when we have a reasonable length summary
      if (summary.length > 200 && i >= 2) break;
      if (summary.length > 500) break;
    }
  
    // Final check - if summary somehow ended up empty or too short, use the first chunk
    if (summary.length < 50) {
      summary = cleanText.substring(0, 500);
      
      // Ensure we end with a complete sentence
      const lastPeriod = Math.max(
        summary.lastIndexOf('.'), 
        summary.lastIndexOf('!'), 
        summary.lastIndexOf('?')
      );
      
      if (lastPeriod > 50) {
        summary = summary.substring(0, lastPeriod + 1);
      }
    }
  
    // One final pass to remove any remaining citation artifacts
    return summary.trim()
      .replace(/\s+citation\s+\d+/gi, '')
      .replace(/\[\d+\]/g, '')
      .replace(/\s{2,}/g, ' ');
  };

  // IMPROVED: Text-to-speech generation with better error handling and quality settings
  const generateTTS = async (text: string) => {
    try {
      setIsTTSLoading(true);
      
      // Get ElevenLabs API key and voice ID from environment variables
      const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
      const voiceId = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Default voice ID
      
      if (!apiKey) {
        console.error('ElevenLabs API key is missing');
        setIsTTSLoading(false);
        return;
      }
      
      // Generate a meaningful summary to speak
      const summary = generateSummary(text);
      
      // Store the summary for display
      setCurrentTTSSummary(summary);
      
      // If the summary is too short, don't bother with TTS
      if (summary.length < 20) {
        console.warn('Summary too short for TTS conversion');
        setIsTTSLoading(false);
        return;
      }
      
      // Clear any existing audio
      cleanupAudioResources();
      
      // Make request to ElevenLabs API with improved error handling
      try {
        const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey
          },
          body: JSON.stringify({
            text: summary,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.6,
              similarity_boost: 0.7,
              style: 0.35,
              use_speaker_boost: true
            }
          })
        });
        
        if (!response.ok) {
          throw new Error(`ElevenLabs API error: ${response.status}`);
        }
        
        // Convert response to blob and create URL
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Update state with new audio URL
        setAudioSrc(audioUrl);
        
        // Create a new audio element if needed
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        
        // Now we can safely use audioRef.current as we've ensured it exists
        const audio = audioRef.current;
        audio.src = audioUrl;
        
        // Add event listeners for better error handling
        audio.onloadedmetadata = () => {
          // Check if audio duration is reasonable
          if (audio.duration < 0.5) {
            console.warn('Audio duration too short, likely an error in TTS generation');
            setIsTTSLoading(false);
            return;
          }
          
          audio.play()
            .then(() => {
              setIsPlaying(true);
            })
            .catch(err => {
              console.error('Error playing audio:', err);
              setIsPlaying(false);
            });
        };
        
        audio.onerror = () => {
          console.error('Error loading audio');
          setIsPlaying(false);
        };
        
        // Add onended handler to update state when playback completes
        audio.onended = () => {
          setIsPlaying(false);
        };
        
      } catch (error) {
        console.error('Error with ElevenLabs API:', error);
        // Don't show audio controls if TTS failed
        setAudioSrc(null);
      }
    } catch (error) {
      console.error('Error generating TTS:', error);
    } finally {
      setIsTTSLoading(false);
    }
  };
  
  // IMPROVED: Play/pause the TTS audio
  const toggleAudio = () => {
    if (!audioRef.current || !audioSrc) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(err => {
        console.error('Error playing audio:', err);
      });
      setIsPlaying(true);
    }
  };
  const ragContext = { isRAGEnabled: useRAG, selectedBucket: null }; // Add selectedBucket with a default value
  
  // Determine if RAG should be used (from props or context)
  const shouldUseRAG = useRAG || ragContext.isRAGEnabled;
  const activeBucketId = ragBucketId || ragContext.selectedBucket || null; // Ensure fallback if selectedBucket is undefined


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
  
    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);
    setAccumulatedContent('');
    setWaitingForFirstChunk(true);
  
    if (onStreamingChange) onStreamingChange(true);
    if (onConversationStart) onConversationStart();
  
    // Add message to history
    const newUserMessage = { role: 'user', content: userMessage };
    setAllMessages(prev => [...prev, newUserMessage]);
  
    // Notify parent component
    onUserMessage(userMessage);
  
    try {
      // Create a session ID
      const sessionId = localStorage.getItem('chat_session_id') ||
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
  
      // Store session ID for future use
      localStorage.setItem('chat_session_id', sessionId);
  
      // Include all previous messages for context, plus the new message
      const formattedMessages = allMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Add the new user message
      formattedMessages.push({
        role: 'user',
        content: userMessage
      });

      // Determine which RAG system to use
      let endpoint = '/api/chat-stream';
      let useGroundX = false;
      
      // Check if RAG should be used
      if (props.isRAGEnabled && props.selectedBucketId) {
        console.log('[ImprovedChat] Using GroundX RAG with bucket:', props.selectedBucketId);
        endpoint = '/api/groundx/rag';
        useGroundX = true;
      } else if (useRAG || ragContext.isRAGEnabled) {
        console.log('[ImprovedChat] Using FastRAG');
        // Keep using the default /api/chat-stream endpoint for FastRAG
      }
      
      console.log('[ImprovedChat] Using endpoint:', endpoint);
      
      // Prepare request body based on RAG system
      const requestBody = useGroundX ? {
        query: userMessage,
        bucketId: props.selectedBucketId,
        messages: formattedMessages,
        config: {
          temperature: config.temperature || 0,
          stream: false // GroundX RAG doesn't support streaming yet
        }
      } : {
        messages: formattedMessages,
        context: {
          overrides: {
            prompt_template: config.promptTemplate,
            top: 3,
            temperature: config.temperature || 0,
            minimum_search_score: config.searchConfig?.minSearchScore || 0,
            minimum_reranker_score: config.searchConfig?.minRerankerScore || 0,
            retrieval_mode: config.searchConfig?.retrievalMode || "hybrid",
            semantic_ranker: config.searchConfig?.useSemanticRanker || true,
            semantic_captions: config.searchConfig?.useSemanticCaptions || false,
            query_rewriting: false,
            suggest_followup_questions: config.suggestFollowUpQuestions || false,
            use_oid_security_filter: false,
            use_groups_security_filter: false,
            vector_fields: ["embedding"],
            use_gpt4v: false,
            gpt4v_input: "textAndImages",
            language: "en"
          }
        },
        session_state: sessionId
      };

      console.log('[ImprovedChat] Request details:', {
        endpoint,
        ragEnabled: props.isRAGEnabled,
        selectedBucket: props.selectedBucketId,
        messageCount: formattedMessages.length
      });
      
      // Send the request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Choose appropriate response handler
      if (useGroundX) {
        // GroundX RAG always uses non-streaming
        await handleNonStreamingRAGResponse(response);
      } else if (config.streamResponse) {
        // FastRAG with streaming
        await handleStreamingResponse(response);
      } else {
        // FastRAG without streaming
        await handleNonStreamingResponse(response);
      }
      
      // Save the timestamp of the latest response
      setLastResponseTimestamp(Date.now());
    } catch (error) {
      console.error('Error fetching response:', error);
      const errorMessage = "I'm sorry, I encountered an error processing your request.";
  
      // Add error message to history
      setAllMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
  
      // Notify parent component
      onAssistantMessage(errorMessage);
    } finally {
      setIsLoading(false);
      if (onStreamingChange) onStreamingChange(false);
    }
  };
  const handleNonStreamingRAGResponse = async (response: Response) => {
    try {
      const data = await response.json();
      console.log('[ImprovedChat] Raw GroundX RAG response:', data);
      
      let content = '';
      let searchResults = null;

      if (data && data.success) {
        // Handle GroundX RAG response format
        if (data.response) {
          console.log('[ImprovedChat] GroundX response data:', data.response);
          
          // Handle nested response structure
          if (typeof data.response === 'object') {
            // Find the first key that contains the summary
            const summaryKey = Object.keys(data.response).find(key => 
              key.toLowerCase().includes('summary') || 
              key.toLowerCase().includes('proposal')
            );
            
            if (summaryKey) {
              const summaryData = data.response[summaryKey];
              // Convert the summary object to a formatted string
              content = Object.entries(summaryData)
                .map(([key, value]) => `${key}: ${value}`)
                .join('\n');
            } else {
              // If no summary key found, stringify the entire response
              content = JSON.stringify(data.response, null, 2);
            }
          } else {
            content = data.response;
          }
          
          searchResults = data.searchResults || null;
          console.log('[ImprovedChat] Extracted GroundX content:', content.substring(0, 100) + '...');
        } else {
          console.log('[ImprovedChat] No GroundX response data found');
          content = "No content received from the GroundX RAG API.";
        }
      } else {
        console.log('[ImprovedChat] Error in GroundX response:', data.error);
        content = data.error || "Error processing your request with the document search.";
      }

      // Update UI with content
      setAccumulatedContent(content);

      // Add response to history with search results and sources
      const messageWithSearchResults = {
        role: 'assistant', 
        content: content,
        searchResults: searchResults,
        sources: data.searchResults?.sources || []
      };
      
      console.log('[ImprovedChat] Adding GroundX message to history');
      setAllMessages(prev => [...prev, messageWithSearchResults]);

      // Notify parent component with content and metadata
      console.log('[ImprovedChat] Notifying parent component about GroundX response');
      if (typeof onAssistantMessage === 'function') {
        if (onAssistantMessage.length > 1) {
          // If the function accepts metadata
          const metadata = { 
            searchResults,
            sources: data.searchResults?.sources || [],
            thoughtProcess: data.thoughts || '',
            supportingContent: data.searchResults?.sources || []
          };
          (onAssistantMessage as (content: string, metadata?: any) => void)(content, metadata);
        } else {
          // Basic version that only accepts content
          onAssistantMessage(content);
        }
      }
      
      // Generate TTS for the response
      if (content) {
        generateTTS(content);
      }
    } catch (error) {
      console.error('[ImprovedChat] Error handling GroundX response:', error);
      setAccumulatedContent("Error processing GroundX RAG response. Please try again.");
    }
  };
  
  // Advanced handler for streaming responses with complete context filtering
  const handleStreamingResponse = async (response: Response) => {
    if (!response.body) {
      console.error('[ImprovedChat] No response body available for streaming');
      throw new Error('No response body available');
    }

    console.log('[ImprovedChat] Starting to process streaming response');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let receivedFirstContentChunk = false;
    let isFullyGeneratedResponse = false;
    let searchResults = null;

    try {
      // Process streaming response
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('[ImprovedChat] Stream complete');
          break;
        }

        if (waitingForFirstChunk) {
          setWaitingForFirstChunk(false);
        }

        const text = decoder.decode(value, { stream: true });
        console.log('[ImprovedChat] Received chunk length:', text.length);

        // Process the chunk
        const lines = text.split('\n').filter(line => line.trim());
        console.log('[ImprovedChat] Processing', lines.length, 'lines');

        for (const line of lines) {
          // Skip document context lines
          if (line.includes('<document') ||
            line.includes('</document') ||
            line.includes('<source>') ||
            line.includes('</source>') ||
            line.includes('<document_content>') ||
            line.includes('</document_content>') ||
            line.includes('<userStyle>') ||
            line.includes('</userStyle>') ||
            line.includes('<search_reminders>') ||
            line.includes('</search_reminders>')) {
            continue;
          }

          try {
            // Try to parse the line as JSON
            const data = JSON.parse(line);
            console.log('[ImprovedChat] Parsed JSON line:', Object.keys(data));

            // Extract search results if present
            if (data.search_results) {
              console.log("[ImprovedChat] Received search results");
              searchResults = data.search_results;
              continue;
            }

            // Skip message that just sets up the assistant role
            if (data.delta && data.delta.role === 'assistant' && !data.delta.content) {
              console.log('[ImprovedChat] Skipping assistant role setup message');
              continue;
            }

            // Skip any line with context data
            if (data.context || data.thoughts || data.search_results) {
              console.log('[ImprovedChat] Skipping context/thoughts/search_results');
              continue;
            }

            // Process actual content in delta format
            if (data.delta && data.delta.content) {
              console.log('[ImprovedChat] Received delta content');
              receivedFirstContentChunk = true;
              fullContent += data.delta.content;
              setAccumulatedContent(fullContent);
              continue;
            }

            // Handle regular content format
            if (data.content && typeof data.content === 'string') {
              console.log('[ImprovedChat] Received direct content');
              receivedFirstContentChunk = true;
              fullContent += data.content;
              setAccumulatedContent(fullContent);
              continue;
            }

          } catch (e) {
            // Not valid JSON, might be direct content
            console.log('[ImprovedChat] Non-JSON line received, length:', line.length);
            
            // Check if it's the start of content
            if (!receivedFirstContentChunk && line.includes('I found information')) {
              console.log('[ImprovedChat] Found direct text content');
              receivedFirstContentChunk = true;
              fullContent += line;
              setAccumulatedContent(fullContent);
            }
            // If we've already started collecting content, continue appending
            else if (receivedFirstContentChunk) {
              fullContent += line;
              setAccumulatedContent(fullContent);
            }
            // Otherwise, log for debugging but skip the line
            else {
              console.log('[ImprovedChat] Skipping non-content line:', line.substring(0, 50));
            }
          }
        }

        // If we've already processed a complete response, break
        if (isFullyGeneratedResponse) {
          break;
        }
      }

      console.log('[ImprovedChat] Finished processing stream, content length:', fullContent.length);
      
      // Clean up any remaining document tags or metadata markers
      fullContent = fullContent.replace(/<\/?document.*?>/g, '')
        .replace(/<\/?source>/g, '')
        .replace(/<\/?document_content>/g, '')
        .replace(/<userStyle>.*?<\/userStyle>/g, '')
        .replace(/<search_reminders>.*?<\/search_reminders>/g, '');
      
      console.log('[ImprovedChat] Final cleaned content length:', fullContent.length);
      
      // Add response to history with search results if available
      const newMessage = {
        role: 'assistant', 
        content: fullContent,
        searchResults: searchResults
      };
      
      console.log('[ImprovedChat] Adding streaming message to history');
      setAllMessages(prev => [...prev, newMessage]);

      // Notify parent component
      console.log('[ImprovedChat] Notifying parent about streaming response');
      if (typeof onAssistantMessage === 'function') {
        if (onAssistantMessage.length > 1) {
          // If the parent component accepts metadata as a second parameter
          (onAssistantMessage as (content: string, metadata?: any) => void)(
            fullContent, 
            { searchResults }
          );
        } else {
          // Basic version that only accepts content
          onAssistantMessage(fullContent);
        }
      }
      
      // Generate TTS for the response
      if (fullContent) {
        generateTTS(fullContent);
      }
    } catch (error) {
      console.error('[ImprovedChat] Error processing stream:', error);
      // Try to salvage whatever content we've received so far
      if (fullContent) {
        // Add the partial content to history
        const errorMessage = {
          role: 'assistant', 
          content: fullContent + "\n\n[Error: Stream processing was interrupted]"
        };
        
        setAllMessages(prev => [...prev, errorMessage]);
        
        // Notify parent of partial content
        if (typeof onAssistantMessage === 'function') {
          onAssistantMessage(fullContent + "\n\n[Error: Stream processing was interrupted]");
        }
      }
    }
  };
  
  // Advanced handler for non-streaming responses
  const handleNonStreamingResponse = async (response: Response) => {
    try {
      const data = await response.json();
      console.log('[ImprovedChat] Raw non-streaming response:', data);
      
      let content = '';
      let searchResults = null;

      // Handle standard chat API response format
      if (data && data.content) {
        console.log('[ImprovedChat] Standard content found in response');
        content = data.content;
      } else if (data && data.choices && data.choices.length > 0) {
        console.log('[ImprovedChat] Found content in choices array');
        content = data.choices[0].message.content;
      } else if (data && data.answer) {
        console.log('[ImprovedChat] Found content in answer field');
        content = data.answer;
      } else if (data && typeof data === 'string') {
        console.log('[ImprovedChat] Response is direct string');
        content = data;
      } else {
        console.log('[ImprovedChat] Could not extract content from response:', data);
        content = "Received a response but couldn't extract content.";
      }

      // Extract search results if present
      if (data && data.search_results) {
        console.log('[ImprovedChat] Found search results in response');
        searchResults = data.search_results;
      } else if (data && data.context && data.context.search_results) {
        console.log('[ImprovedChat] Found search results in context');
        searchResults = data.context.search_results;
      }

      console.log('[ImprovedChat] Final extracted content:', content.substring(0, 100) + '...');
      
      // Update UI with content
      setAccumulatedContent(content);

      // Add response to history with search results
      const messageWithSearchResults = {
        role: 'assistant', 
        content: content,
        searchResults: searchResults
      };
      
      console.log('[ImprovedChat] Adding message to history');
      setAllMessages(prev => [...prev, messageWithSearchResults]);

      // Notify parent component
      console.log('[ImprovedChat] Notifying parent component');
      if (typeof onAssistantMessage === 'function') {
        if (onAssistantMessage.length > 1) {
          // If the function accepts metadata
          (onAssistantMessage as (content: string, metadata?: any) => void)(
            content, 
            { searchResults }
          );
        } else {
          // Basic version that only accepts content
          onAssistantMessage(content);
        }
      }
      
      // Generate TTS for the response
      if (content) {
        generateTTS(content);
      }
    } catch (error) {
      console.error('[ImprovedChat] Error handling non-streaming response:', error);
      setAccumulatedContent("Error processing response. Please try again.");
    }
  };

  // Cleanup hands-free resources
  const cleanupHandsFreeResources = () => {
    console.log('[HANDS-FREE] Cleaning up hands-free resources');
    
    // Clear auto-submit timer
    clearAutoSubmitTimer();
    
    // Reset wake word state
    wakeWordDetectedRef.current = false;
    
    if (wakeWordWorkletRef.current) {
      try {
        wakeWordWorkletRef.current.disconnect();
        wakeWordWorkletRef.current = null;
      } catch (err) {
        console.warn('[HANDS-FREE] Error disconnecting wake word worklet:', err);
      }
    }

    if (wakeWordSourceRef.current) {
      try {
        wakeWordSourceRef.current.disconnect();
        wakeWordSourceRef.current = null;
      } catch (err) {
        console.warn('[HANDS-FREE] Error disconnecting wake word source:', err);
      }
    }

    if (wakeWordContextRef.current && wakeWordContextRef.current.state !== 'closed') {
      try {
        wakeWordContextRef.current.close();
        wakeWordContextRef.current = null;
      } catch (err) {
        console.warn('[HANDS-FREE] Error closing wake word audio context:', err);
      }
    }

    if (wakeWordSocketRef.current) {
      try {
        if (wakeWordSocketRef.current.readyState === WebSocket.OPEN) {
          wakeWordSocketRef.current.close(1000, 'Manual cleanup');
        }
        wakeWordSocketRef.current = null;
      } catch (err) {
        console.warn('[HANDS-FREE] Error closing wake word WebSocket:', err);
      }
    }

    if (wakeWordStreamRef.current) {
      try {
        wakeWordStreamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        wakeWordStreamRef.current = null;
      } catch (err) {
        console.warn('[HANDS-FREE] Error stopping wake word media stream:', err);
      }
    }
  };

  // Utility functions for hands-free mode
  const containsWakeWord = (text: string): boolean => {
    const lowerText = text.toLowerCase().trim();
    return WAKE_WORDS.some(wakeWord => lowerText.includes(wakeWord));
  };

  const containsActionWord = (text: string): boolean => {
    const lowerText = text.toLowerCase().trim();
    console.log('[HANDS-FREE] 🔍 Checking for action words in text:', `"${lowerText}"`);
    
    for (const actionWord of ACTION_WORDS) {
      // Simple approach: check if action word appears anywhere near the end
      if (lowerText.includes(actionWord)) {
        // Check if it's in the last portion of the text
        const words = lowerText.split(/\s+/);
        const lastFiveWords = words.slice(-5); // Check last 5 words
        
        if (lastFiveWords.some(word => word.replace(/[.!?,]/g, '') === actionWord)) {
          console.log('[HANDS-FREE] ✅ Found action word in last words:', actionWord);
          return true;
        }
        
        // Also check if it's at the very end
        if (lowerText.endsWith(actionWord) || lowerText.endsWith(actionWord + '.') || 
            lowerText.endsWith(actionWord + '!') || lowerText.endsWith(actionWord + '?')) {
          console.log('[HANDS-FREE] ✅ Found action word at end:', actionWord);
          return true;
        }
      }
    }
    
    console.log('[HANDS-FREE] ❌ No action words found');
    return false;
  };

  const extractMessageFromTranscript = (transcript: string): string => {
    const lowerTranscript = transcript.toLowerCase();
    
    // Find wake word position
    let messageStart = 0;
    for (const wakeWord of WAKE_WORDS) {
      const index = lowerTranscript.indexOf(wakeWord);
      if (index !== -1) {
        messageStart = index + wakeWord.length;
        break;
      }
    }
    
    // Extract message part (after wake word)
    let message = transcript.substring(messageStart).trim();
    
    // Remove action words from anywhere in the message, but prioritize end removal
    for (const actionWord of ACTION_WORDS) {
      const lowerMessage = message.toLowerCase();
      
      // First, try to remove from the end (most common case)
      const endIndex = lowerMessage.lastIndexOf(actionWord);
      if (endIndex !== -1) {
        // Check if the action word is at the end (with some tolerance for spacing/punctuation)
        const afterActionWord = message.substring(endIndex + actionWord.length).trim();
        if (afterActionWord.length <= 2) { // Allow for punctuation or short trailing text
          message = message.substring(0, endIndex).trim();
          break;
        }
      }
      
      // If not at the end, remove from anywhere in the message as a fallback
      const actionWordRegex = new RegExp(`\\b${actionWord}\\b`, 'gi');
      message = message.replace(actionWordRegex, '').trim();
    }
    
    // Clean up any multiple spaces or trailing punctuation
    message = message.replace(/\s+/g, ' ').trim();
    
    // Remove trailing punctuation that might be left over
    message = message.replace(/[,\s]+$/, '');
    
    return message;
  };

  // Auto-submit timer management for hands-free mode
  const startAutoSubmitTimer = (currentText?: string) => {
    console.log('[HANDS-FREE] 🕐 startAutoSubmitTimer called');
    console.log('[HANDS-FREE] - currentText parameter:', `"${currentText}"`);
    console.log('[HANDS-FREE] - input state:', `"${input}"`);
    console.log('[HANDS-FREE] - isWakeWordDetected (state):', isWakeWordDetected);
    console.log('[HANDS-FREE] - wakeWordDetectedRef.current:', wakeWordDetectedRef.current);
    console.log('[HANDS-FREE] - isHandsFreeMode:', isHandsFreeMode);
    
    const wakeWordActive = isWakeWordDetected || wakeWordDetectedRef.current;
    console.log('[HANDS-FREE] - wakeWordActive (combined):', wakeWordActive);
    
    const textToCheck = currentText || input;
    console.log('[HANDS-FREE] - textToCheck (final):', `"${textToCheck}"`);
    console.log('[HANDS-FREE] - textToCheck.trim():', `"${textToCheck.trim()}"`);
    console.log('[HANDS-FREE] - textToCheck.trim() length:', textToCheck.trim().length);
    
    if (!wakeWordActive) {
      console.log('[HANDS-FREE] ❌ Not starting timer - wake word not active');
      console.log('[HANDS-FREE] State:', isWakeWordDetected, 'Ref:', wakeWordDetectedRef.current);
      return;
    }
    
    if (!textToCheck.trim()) {
      console.log('[HANDS-FREE] ❌ Not starting timer - no input text');
      console.log('[HANDS-FREE] textToCheck was:', `"${textToCheck}"`);
      return;
    }
    
    console.log('[HANDS-FREE] ✅ All conditions met, starting timer');
    console.log('[HANDS-FREE] ✅ Starting auto-submit timer (2 seconds) for text:', `"${textToCheck}"`);
    clearAutoSubmitTimer(); // Clear any existing timer
    
    let countdown = AUTO_SUBMIT_DELAY / 1000; // Convert to seconds
    setAutoSubmitCountdown(countdown);
    console.log('[HANDS-FREE] Setting countdown to:', countdown);
    
    // Update countdown every second
    countdownIntervalRef.current = setInterval(() => {
      countdown -= 1;
      console.log('[HANDS-FREE] Countdown tick:', countdown);
      setAutoSubmitCountdown(countdown);
      
      if (countdown <= 0) {
        console.log('[HANDS-FREE] Countdown reached zero, clearing interval');
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
      }
    }, 1000);
    
    autoSubmitTimerRef.current = setTimeout(() => {
      console.log('[HANDS-FREE] 🚀 Auto-submit timer FIRED! Submitting message');
      console.log('[HANDS-FREE] Current input at fire time:', `"${input}"`);
      
      // Clear the countdown interval
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      setAutoSubmitCountdown(0);
      
      const currentInput = input.trim();
      if (currentInput) {
        console.log('[HANDS-FREE] Proceeding with auto-submit for:', `"${currentInput}"`);
        setHandsFreeFeedback('Auto-submitting after pause...');
        handleHandsFreeSubmit();
      } else {
        console.log('[HANDS-FREE] ❌ Timer fired but no input to submit');
      }
    }, AUTO_SUBMIT_DELAY);
    
    console.log('[HANDS-FREE] ✅ Timer and interval set up successfully');
    console.log('[HANDS-FREE] Timer ref set:', !!autoSubmitTimerRef.current);
    console.log('[HANDS-FREE] Interval ref set:', !!countdownIntervalRef.current);
  };

  const clearAutoSubmitTimer = () => {
    console.log('[HANDS-FREE] Clearing auto-submit timer and countdown');
    
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
      console.log('[HANDS-FREE] Cleared auto-submit timer');
    }
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
      console.log('[HANDS-FREE] Cleared countdown interval');
    }
    
    setAutoSubmitCountdown(0);
  };

  const resetAutoSubmitTimer = () => {
    if (isWakeWordDetected && input.trim()) {
      console.log('[HANDS-FREE] Resetting auto-submit timer due to new speech, current input:', input);
      startAutoSubmitTimer();
    } else {
      console.log('[HANDS-FREE] Not resetting timer - wake word detected:', isWakeWordDetected, 'input length:', input.length);
    }
  };

  // Start continuous listening for wake words
  const startWakeWordListening = async () => {
    try {
      console.log('[HANDS-FREE] Starting wake word listening...');
      setHandsFreeFeedback('Initializing hands-free mode...');

      // Clean up any existing wake word resources
      cleanupHandsFreeResources();

      const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
      
      if (!apiKey) {
        const error = 'Deepgram API key is missing for hands-free mode.';
        console.error('[HANDS-FREE] ' + error);
        setHandsFreeFeedback(error);
        return;
      }

      // Request microphone access for continuous listening
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 16000,
            channelCount: 1
          } 
        });
        
        wakeWordStreamRef.current = stream;
        console.log('[HANDS-FREE] Microphone access granted for wake word detection');
      } catch (micError) {
        const errorMsg = 'Microphone access denied for hands-free mode.';
        console.error('[HANDS-FREE] ' + errorMsg, micError);
        setHandsFreeFeedback(errorMsg);
        return;
      }

      // Create WebSocket connection for wake word detection
      const wsUrl = `${DEEPGRAM_API_URL}?encoding=linear16&sample_rate=16000&channels=1&model=nova-2&language=en-US&smart_format=true&interim_results=true&punctuate=true`;
      
      try {
        const socket = new WebSocket(wsUrl, ['token', apiKey]);
        wakeWordSocketRef.current = socket;

        socket.onopen = async () => {
          console.log('[HANDS-FREE] Wake word WebSocket connection opened');
          
          try {
            // Create AudioContext for wake word detection
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const audioContext = new AudioContext({ sampleRate: 16000 });
            wakeWordContextRef.current = audioContext;
            
            if (audioContext.state === 'suspended') {
              await audioContext.resume();
            }
            
            if (wakeWordStreamRef.current) {
              // Create audio source
              const sourceNode = audioContext.createMediaStreamSource(wakeWordStreamRef.current);
              wakeWordSourceRef.current = sourceNode;
              
              // Create audio worklet node
              const workletNode = await createAudioWorklet(audioContext);
              wakeWordWorkletRef.current = workletNode;
              
              // Handle audio data from worklet
              workletNode.port.onmessage = (event) => {
                if (event.data.type === 'audioData' && wakeWordSocketRef.current && wakeWordSocketRef.current.readyState === WebSocket.OPEN) {
                  try {
                    const buffer = event.data.buffer;
                    const pcmData = convertFloatToInt16(buffer);
                    wakeWordSocketRef.current.send(pcmData);
                  } catch (err) {
                    console.error('[HANDS-FREE] Error sending wake word audio data:', err);
                  }
                }
              };
              
              // Connect audio pipeline
              sourceNode.connect(workletNode);
            }

            setIsListeningForWakeWord(true);
            setHandsFreeFeedback('Listening for wake words...');
            console.log('[HANDS-FREE] Wake word detection started successfully');
            
          } catch (audioError) {
            console.error('[HANDS-FREE] Error setting up wake word audio:', audioError);
            setHandsFreeFeedback('Error setting up hands-free audio processing.');
            cleanupHandsFreeResources();
          }
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data) as DeepgramResponse;
            
            if (data && data.channel && data.channel.alternatives && data.channel.alternatives.length > 0) {
              const transcription = data.channel.alternatives[0].transcript;
              
              if (transcription && transcription.trim().length > 0) {
                console.log('[HANDS-FREE] 🎤 Wake word transcription:', transcription);
                console.log('[HANDS-FREE] - is_final:', data.is_final);
                console.log('[HANDS-FREE] - current isWakeWordDetected:', isWakeWordDetected);
                
                if (data.is_final) {
                  console.log('[HANDS-FREE] 📝 Processing final wake word transcription');
                  
                  // Check for wake word
                  if (!isWakeWordDetected && containsWakeWord(transcription)) {
                    console.log('[HANDS-FREE] 🚨 WAKE WORD DETECTED!');
                    console.log('[HANDS-FREE] Transcription that triggered wake word:', `"${transcription}"`);
                    console.log('[HANDS-FREE] Setting isWakeWordDetected to true');
                    
                    setIsWakeWordDetected(true);
                    wakeWordDetectedRef.current = true; // Set ref immediately
                    setHandsFreeFeedback('Wake word detected! Say your message...');
                    
                    console.log('[HANDS-FREE] About to start message recording...');
                    console.log('[HANDS-FREE] Wake word ref set to:', wakeWordDetectedRef.current);
                    
                    // Start message recording
                    setTimeout(() => {
                      console.log('[HANDS-FREE] Executing startMessageRecording...');
                      console.log('[HANDS-FREE] Wake word ref before STT:', wakeWordDetectedRef.current);
                      startMessageRecording();
                    }, 100);
                  }
                  // Check for action word if we're already recording
                  else if (isWakeWordDetected && isRecording && containsActionWord(transcription)) {
                    console.log('[HANDS-FREE] 🎯 Action word detected in wake word listener!');
                    handleHandsFreeSubmit();
                  } else {
                    console.log('[HANDS-FREE] No wake word in transcription:', `"${transcription}"`);
                    console.log('[HANDS-FREE] - Already detected:', isWakeWordDetected);
                    console.log('[HANDS-FREE] - Is recording:', isRecording);
                    console.log('[HANDS-FREE] - Contains wake word:', containsWakeWord(transcription));
                  }
                } else {
                  console.log('[HANDS-FREE] ⏸️ Interim wake word transcription, skipping');
                }
              } else {
                console.log('[HANDS-FREE] ⚠️ Empty wake word transcription');
              }
            } else {
              console.log('[HANDS-FREE] ⚠️ Invalid wake word data structure');
            }
          } catch (error) {
            console.error('[HANDS-FREE] ❌ Error parsing wake word WebSocket message:', error);
          }
        };

        socket.onerror = (error) => {
          console.error('[HANDS-FREE] Wake word WebSocket error:', error);
          setHandsFreeFeedback('Wake word detection error occurred.');
          cleanupHandsFreeResources();
          setIsListeningForWakeWord(false);
        };

        socket.onclose = (event) => {
          console.log(`[HANDS-FREE] Wake word WebSocket closed: ${event.code}, ${event.reason || 'none'}`);
          setIsListeningForWakeWord(false);
          setIsWakeWordDetected(false);
          setHandsFreeFeedback('');
        };

      } catch (socketError) {
        console.error('[HANDS-FREE] Error creating wake word WebSocket:', socketError);
        setHandsFreeFeedback('Failed to connect to wake word detection service.');
        cleanupHandsFreeResources();
      }
    } catch (error) {
      console.error('[HANDS-FREE] Error starting wake word listening:', error);
      setHandsFreeFeedback('Failed to start hands-free mode.');
      cleanupHandsFreeResources();
    }
  };

  // Start message recording after wake word is detected
  const startMessageRecording = async () => {
    console.log('[HANDS-FREE] 🎙️ Starting message recording after wake word detection');
    console.log('[HANDS-FREE] Current state before transition:');
    console.log('[HANDS-FREE] - isWakeWordDetected:', isWakeWordDetected);
    console.log('[HANDS-FREE] - isHandsFreeMode:', isHandsFreeMode);
    console.log('[HANDS-FREE] - isListeningForWakeWord:', isListeningForWakeWord);
    
    // Stop wake word detection temporarily
    cleanupHandsFreeResources();
    setIsListeningForWakeWord(false);
    
    console.log('[HANDS-FREE] 🔄 Cleaned up wake word resources, now starting STT');
    console.log('[HANDS-FREE] Wake word state should still be true:', isWakeWordDetected);
    
    // Start regular speech-to-text for message
    await startSpeechToText();
    
    console.log('[HANDS-FREE] ✅ STT started, wake word state:', isWakeWordDetected);
  };

  // Handle hands-free message submission
  const handleHandsFreeSubmit = async () => {
    // Get the current input and clean it one more time
    const currentInput = input.trim();
    
    if (currentInput) {
      console.log('[HANDS-FREE] Submitting message via hands-free:', currentInput);
      setHandsFreeFeedback('Sending message...');
      
      // Stop recording first
      stopSpeechToText();
      
      // Double-check that the input doesn't contain action words
      let cleanedInput = currentInput;
      for (const actionWord of ACTION_WORDS) {
        const actionWordRegex = new RegExp(`\\b${actionWord}\\b`, 'gi');
        cleanedInput = cleanedInput.replace(actionWordRegex, '').trim();
      }
      
      // Update input with cleaned version if needed
      if (cleanedInput !== currentInput) {
        setInput(cleanedInput);
      }
      
      // Wait a brief moment to ensure state is updated
      setTimeout(() => {
        // Submit the message using the form's submit event
        const form = document.querySelector('form');
        if (form) {
          const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
          form.dispatchEvent(submitEvent);
        }
        
        // Reset hands-free state
        setIsWakeWordDetected(false);
        wakeWordDetectedRef.current = false; // Reset ref too
        setInterimTranscript('');
        
        // Resume wake word listening after the response
        setTimeout(() => {
          if (isHandsFreeMode) {
            setHandsFreeFeedback('Resuming wake word detection...');
            startWakeWordListening();
          }
        }, 3000); // Wait longer to allow for response processing
      }, 200);
    } else {
      console.log('[HANDS-FREE] No input to submit');
      setHandsFreeFeedback('No message to send');
      
      // Reset state and resume listening
      setIsWakeWordDetected(false);
      wakeWordDetectedRef.current = false; // Reset ref too
      setInterimTranscript('');
      
      if (isHandsFreeMode) {
        setTimeout(() => {
          startWakeWordListening();
        }, 1000);
      }
    }
  };

  // Toggle hands-free mode
  const toggleHandsFreeMode = () => {
    if (isHandsFreeMode) {
      // Turn off hands-free mode
      setIsHandsFreeMode(false);
      setIsListeningForWakeWord(false);
      setIsWakeWordDetected(false);
      wakeWordDetectedRef.current = false; // Reset ref too
      setHandsFreeFeedback('');
      cleanupHandsFreeResources();
      console.log('[HANDS-FREE] Hands-free mode disabled');
    } else {
      // Turn on hands-free mode
      setIsHandsFreeMode(true);
      console.log('[HANDS-FREE] Hands-free mode enabled');
      console.log('[HANDS-FREE] Wake words configured:', WAKE_WORDS);
      console.log('[HANDS-FREE] Action words configured:', ACTION_WORDS);
      startWakeWordListening();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupSpeechResources();
      cleanupHandsFreeResources();
      cleanupAudioResources();
    };
  }, []);

  // Monitor wake word state changes for debugging
  useEffect(() => {
    console.log('[HANDS-FREE] 🔄 isWakeWordDetected state changed to:', isWakeWordDetected);
    if (isWakeWordDetected) {
      console.log('[HANDS-FREE] ✅ Wake word is now detected - ready for message recording');
    } else {
      console.log('[HANDS-FREE] ❌ Wake word detection reset');
    }
  }, [isWakeWordDetected]);

  // Monitor hands-free mode changes
  useEffect(() => {
    console.log('[HANDS-FREE] 🔄 isHandsFreeMode state changed to:', isHandsFreeMode);
  }, [isHandsFreeMode]);

  return (
    <motion.div 
      className="w-full max-w-4xl mt-auto"
      initial="hidden"
      animate="visible"
      variants={fadeIn}
    >
      <AnimatePresence>
        {isLoading && (
          <motion.div 
            className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-gray-500 text-sm mb-2">
              {waitingForFirstChunk ? 'Thinking...' : 'Generating response...'}
            </p>
            <div className="text-gray-700">
              {accumulatedContent ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  {accumulatedContent}
                  <motion.span 
                    className="inline-block"
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                  >▋</motion.span>
                </motion.div>
              ) : (
                <div className="flex items-center gap-1">
                  <motion.div 
                    className="h-2 w-2 bg-indigo-500 rounded-full" 
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                  ></motion.div>
                  <motion.div 
                    className="h-2 w-2 bg-indigo-500 rounded-full" 
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.15 }}
                  ></motion.div>
                  <motion.div 
                    className="h-2 w-2 bg-indigo-500 rounded-full" 
                    animate={{ y: [0, -4, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.3 }}
                  ></motion.div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TTS Audio Controls with summary display */}
      <AnimatePresence>
        {(audioSrc && lastResponseTimestamp && Date.now() - lastResponseTimestamp < 60000) && (
          <motion.div 
            className="mb-4 flex flex-col gap-2 bg-blue-50 text-blue-700 p-3 rounded-md border border-blue-100"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">Audio summary available</span>
              
              <motion.button
                onClick={toggleAudio}
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 px-3 py-1 rounded hover:bg-blue-100 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                {isTTSLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPlaying ? (
                  <>
                    <VolumeX className="h-4 w-4" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Volume className="h-4 w-4" />
                    <span>Play</span>
                  </>
                )}
              </motion.button>
            </div>
            
            {/* Show summary text when playing or on hover */}
            <AnimatePresence>
              {(isPlaying || currentTTSSummary) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-sm text-blue-600 bg-blue-100/50 p-2 rounded max-h-24 overflow-y-auto"
                >
                  <span className="italic">{currentTTSSummary}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Speech error message */}
      <AnimatePresence>
        {speechError && (
          <motion.div 
            className="mb-4 p-2 text-sm text-red-600 bg-red-50 rounded-md"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {speechError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hands-free mode indicator */}
      <AnimatePresence>
        {isHandsFreeMode && (
          <motion.div 
            className={`mb-4 flex items-center justify-between gap-2 text-sm p-3 rounded-md border ${
              isListeningForWakeWord 
                ? 'bg-purple-50 text-purple-700 border-purple-200' 
                : isWakeWordDetected 
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-gray-50 text-gray-700 border-gray-200'
            }`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-2">
              <motion.div
                animate={isListeningForWakeWord ? { scale: [1, 1.2, 1] } : {}}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                🤖
              </motion.div>
              <div className="flex flex-col">
                <span className="font-medium">
                  {isListeningForWakeWord 
                    ? 'Hands-free mode active' 
                    : isWakeWordDetected 
                    ? 'Wake word detected!'
                    : 'Hands-free mode'
                  }
                </span>
                {handsFreeFeedback && (
                  <span className="text-xs opacity-75">{handsFreeFeedback}</span>
                )}
              </div>
            </div>
            
            <motion.button
              onClick={toggleHandsFreeMode}
              className="text-xs px-2 py-1 rounded bg-white/50 hover:bg-white/80 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Turn Off
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wake words help */}
      <AnimatePresence>
        {isHandsFreeMode && isListeningForWakeWord && (
          <motion.div 
            className="mb-4 p-2 text-xs bg-purple-100 text-purple-600 rounded-md border border-purple-200"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <div className="flex flex-col gap-1">
              <span>💡 <strong>Wake words:</strong> "Hey Assistant", "Hello Chat", "Hey Chat", "Assistant"</span>
              <span>⏱️ <strong>Auto-submit:</strong> Messages auto-send after 2 seconds of silence</span>
              <span>🎯 <strong>Quick send:</strong> "Send", "Submit", "Go", "Execute" for immediate sending</span>
              <span className="opacity-75">Say a wake word, then your message - it will auto-send when you pause!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Speech recognition indicator */}
      <AnimatePresence>
        {isRecording && (
          <motion.div 
            className="mb-4 flex items-center gap-2 text-sm bg-green-50 text-green-700 p-2 rounded-md"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Volume2 size={16} className="animate-pulse" />
            <span>
              {isWakeWordDetected ? 'Recording your message...' : 'Listening...'}
              {interimTranscript && (
                <span className="italic ml-2 text-gray-500">"{interimTranscript}"</span>
              )}
              {autoSubmitCountdown > 0 && isWakeWordDetected && (
                <span className="ml-2 font-medium text-blue-600">
                  Auto-send in {autoSubmitCountdown}s
                </span>
              )}
            </span>
            <motion.button
              onClick={stopSpeechToText}
              className="ml-auto text-green-500 hover:text-green-700"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <MicOff size={16} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.form 
        onSubmit={handleSubmit} 
        className="flex gap-2 items-center"
        variants={slideUp}
      >
        <motion.input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={isRecording ? "Speak or type your message..." : "Type your message..."}
          className="flex-1 h-12 px-4 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white shadow-md"
          disabled={isLoading || isDisabled}
          initial={{ opacity: 0, width: '90%' }}
          animate={{ opacity: 1, width: '100%' }}
          transition={{ duration: 0.3, delay: 0.1 }}
          whileFocus={{ boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.2)" }}
        />

        {/* Voice input button */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <Button
            type="button"
            onClick={isRecording ? stopSpeechToText : startSpeechToText}
            disabled={isLoading || isDisabled || isConnecting}
            className={`h-12 px-4 rounded-md ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-700'
            }`}
          >
            {isConnecting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isRecording ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>
        </motion.div>

        {/* Hands-free toggle button */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Button
            type="button"
            onClick={toggleHandsFreeMode}
            disabled={isLoading || isDisabled}
            className={`h-12 px-4 rounded-md ${
              isHandsFreeMode 
                ? 'bg-purple-500 hover:bg-purple-600 text-white' 
                : 'bg-gray-100 border border-gray-300 hover:bg-gray-200 text-gray-700'
            }`}
            title={isHandsFreeMode ? 'Turn off hands-free mode' : 'Turn on hands-free mode'}
          >
            {isHandsFreeMode ? '🤖' : '🎤'}
          </Button>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Button
            type="submit"
            className="h-12 px-4 rounded-md bg-red-600 hover:bg-red-700 transition-colors text-white shadow-md"
            disabled={isLoading || !input.trim() || isDisabled}
          >
            <Send className="h-5 w-5 mr-2" />
            Send
          </Button>
        </motion.div>
      </motion.form>

      {/* Optional: Configuration Indicator */}
      {process.env.NODE_ENV === 'development' && (
        <motion.div 
          className="mt-2 text-xs text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {/* Show current configuration settings for debugging */}
          <span>T: {config.temperature?.toFixed(1)} | </span>
          {config.seed && <span>Seed: {config.seed} | </span>}
          <span>Stream: {config.streamResponse ? 'On' : 'Off'} | </span>
          <span>Follow-up: {config.suggestFollowUpQuestions ? 'On' : 'Off'}</span>
          {config.promptTemplate && <span> | Custom Prompt: Yes</span>}
          {isRecording && <span> | Speech Recording: Active</span>}
          {isPlaying && <span> | Audio: Playing</span>}
          {isHandsFreeMode && <span> | Hands-free: {isListeningForWakeWord ? 'Listening' : isWakeWordDetected ? 'Wake Word Detected' : 'On'}</span>}
          
          {/* Debug info for hands-free */}
          {isHandsFreeMode && (
            <div className="mt-1 p-2 bg-gray-100 rounded text-black text-xs">
              <div>Current input: "{input}"</div>
              <div>Wake word detected: {isWakeWordDetected ? 'YES' : 'NO'}</div>
              <div>Is recording: {isRecording ? 'YES' : 'NO'}</div>
              <div>Auto-submit countdown: {autoSubmitCountdown}s</div>
              <div>Timer active: {autoSubmitTimerRef.current ? 'YES' : 'NO'}</div>
              <div>Contains action word: {input ? (containsActionWord(input) ? 'YES' : 'NO') : 'N/A'}</div>
              <div>Action words: {ACTION_WORDS.join(', ')}</div>
              <div className="mt-2 flex gap-2 flex-wrap">
                <button 
                  onClick={() => {
                    console.log('[TEST] Manual start auto-submit timer test');
                    setIsWakeWordDetected(true);
                    setInput("test message");
                    setTimeout(() => startAutoSubmitTimer("test message"), 100);
                  }}
                  className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
                >
                  Test Auto-Submit
                </button>
                <button 
                  onClick={() => {
                    console.log('[TEST] Manual clear timer test');
                    clearAutoSubmitTimer();
                  }}
                  className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                >
                  Clear Timer
                </button>
                <button 
                  onClick={() => {
                    console.log('[TEST] Testing direct handleHandsFreeSubmit');
                    setInput("direct test message");
                    setIsWakeWordDetected(true);
                    setTimeout(() => {
                      console.log('[TEST] Calling handleHandsFreeSubmit directly');
                      handleHandsFreeSubmit();
                    }, 100);
                  }}
                  className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                >
                  Test Direct Submit
                </button>
                <button 
                  onClick={() => {
                    console.log('[TEST] 🚀 FORCE START TIMER - bypassing all logic');
                    setIsWakeWordDetected(true);
                    setInput("force test message");
                    clearAutoSubmitTimer();
                    // Force the timer to start regardless of conditions
                    const countdown = AUTO_SUBMIT_DELAY / 1000;
                    setAutoSubmitCountdown(countdown);
                    
                    let countdownVal = countdown;
                    countdownIntervalRef.current = setInterval(() => {
                      countdownVal -= 1;
                      setAutoSubmitCountdown(countdownVal);
                      console.log('[TEST] Force countdown:', countdownVal);
                      if (countdownVal <= 0 && countdownIntervalRef.current) {
                        clearInterval(countdownIntervalRef.current);
                        countdownIntervalRef.current = null;
                      }
                    }, 1000);
                    
                    autoSubmitTimerRef.current = setTimeout(() => {
                      console.log('[TEST] 🚀 FORCE TIMER FIRED!');
                      if (countdownIntervalRef.current) {
                        clearInterval(countdownIntervalRef.current);
                        countdownIntervalRef.current = null;
                      }
                      setAutoSubmitCountdown(0);
                      handleHandsFreeSubmit();
                    }, AUTO_SUBMIT_DELAY);
                  }}
                  className="px-2 py-1 bg-purple-500 text-white rounded text-xs"
                >
                  Force Timer
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
});