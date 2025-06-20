'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { resourceTracker } from '../utils/resourceCleanup';

interface ActionCommand {
  type: 'navigation' | 'ui_interaction' | 'data_operation' | 'system_control' | 'conversation';
  action: string;
  parameters?: Record<string, any>;
  target?: string;
  confirmation_required?: boolean;
}

interface ConversationalVoiceInterfaceProps {
  apiBaseUrl: string;
  sessionId?: string;
  currentPage?: string;
  userProfile?: {
    name?: string;
    preferences?: Record<string, any>;
  };
  onAction?: (action: ActionCommand) => void;
  onTranscription?: (text: string) => void;
  onResponse?: (text: string) => void;
  onStatusChange?: (status: string) => void;
  enableAutoPlayback?: boolean;
  showTranscriptions?: boolean;
  className?: string;
}

export const ConversationalVoiceInterface: React.FC<ConversationalVoiceInterfaceProps> = ({
  apiBaseUrl,
  sessionId: providedSessionId,
  currentPage = '/',
  userProfile,
  onAction,
  onTranscription,
  onResponse,
  onStatusChange,
  enableAutoPlayback = true,
  showTranscriptions = true,
  className = ''
}) => {
  // State management
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingResponse, setIsPlayingResponse] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState(providedSessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.onended = () => setIsPlayingResponse(false);
    
    // Track the audio element
    resourceTracker.trackAudioElement(audioRef.current);
    
    return () => {
      if (audioRef.current) {
        resourceTracker.cleanupAudioElement(audioRef.current);
        audioRef.current = null;
      }
    };
  }, []);

  // Update session context when page or user changes
  useEffect(() => {
    updateContext();
  }, [currentPage, userProfile]);

  const updateContext = async () => {
    try {
      await fetch(`${apiBaseUrl}/api/voice/conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action: 'update_context',
          currentPage,
          userProfile
        })
      });
    } catch (error) {
      console.error('Failed to update context:', error);
    }
  };

  const startListening = async () => {
    try {
      setError(null);
      setIsListening(true);
      onStatusChange?.('listening');

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Track the media stream
      resourceTracker.trackMediaStream(stream);

      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      // Track the media recorder
      resourceTracker.trackMediaRecorder(mediaRecorder);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsListening(false);
        setIsProcessing(true);
        onStatusChange?.('processing');

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await processVoiceInput(audioBlob);
        
        // Clean up the media stream
        resourceTracker.cleanupMediaStream(stream);
      };

      mediaRecorder.start();
    } catch (error) {
      console.error('Error starting voice recording:', error);
      setError('Failed to access microphone');
      setIsListening(false);
      onStatusChange?.('error');
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    // Clean up media stream
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(track => {
        track.stop();
        console.log('[Voice] Stopped media track:', track.kind);
      });
    }
  };

  const processVoiceInput = async (audioBlob: Blob) => {
    try {
      // Convert audio to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        const response = await fetch(`${apiBaseUrl}/api/voice/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioData: base64Audio,
            context: {
              sessionId,
              userId: userProfile?.name || 'anonymous'
            },
            currentPage,
            useConversationalAI: true,
            options: {
              skipTTS: !enableAutoPlayback
            }
          })
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Processing failed');
        }

        // Handle transcription
        if (result.transcription && showTranscriptions) {
          setCurrentTranscription(result.transcription);
          onTranscription?.(result.transcription);
        }

        // Handle AI response
        if (result.response) {
          setAiResponse(result.response);
          onResponse?.(result.response);
        }

        // Handle actions
        if (result.actions && result.actions.length > 0) {
          for (const action of result.actions) {
            onAction?.(action);
          }
        }

        // Handle audio response
        if (result.audio && enableAutoPlayback && audioRef.current) {
          playAudioResponse(result.audio);
        }

        onStatusChange?.('completed');
      };
      
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('Error processing voice input:', error);
      setError(error instanceof Error ? error.message : 'Processing failed');
      onStatusChange?.('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudioResponse = (base64Audio: string) => {
    if (!audioRef.current) return;

    try {
      // Clean up any existing URL first
      if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audioBlob = new Blob([
        Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0))
      ], { type: 'audio/mpeg' });
      
      const audioUrl = URL.createObjectURL(audioBlob);
      resourceTracker.trackObjectUrl(audioUrl);
      
      audioRef.current.src = audioUrl;
      audioRef.current.play();
      setIsPlayingResponse(true);

      // Clean up URL after playing
      const cleanupAudio = () => {
        setIsPlayingResponse(false);
        URL.revokeObjectURL(audioUrl);
        if (audioRef.current) {
          audioRef.current.onended = null;
          audioRef.current.onerror = null;
        }
      };

      audioRef.current.onended = cleanupAudio;
      audioRef.current.onerror = cleanupAudio;
      
      // Fallback cleanup after 30 seconds
      setTimeout(() => {
        try {
          URL.revokeObjectURL(audioUrl);
        } catch (e) {
          // URL might already be revoked
        }
      }, 30000);
    } catch (error) {
      console.error('Error playing audio response:', error);
    }
  };

  const toggleAudioPlayback = () => {
    if (!audioRef.current) return;

    if (isPlayingResponse) {
      audioRef.current.pause();
      setIsPlayingResponse(false);
    } else {
      audioRef.current.play();
      setIsPlayingResponse(true);
    }
  };

  const clearTranscriptions = () => {
    setCurrentTranscription('');
    setAiResponse('');
    setError(null);
  };

  // Cleanup all resources on unmount
  useEffect(() => {
    return () => {
      console.log('[Voice] Component unmounting, cleaning up resources...');
      
      // Stop any active recording
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      
      // Clean up media streams
      if (mediaRecorderRef.current?.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      
      // Clean up audio
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src);
        }
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }
      
      // Clear session reference
      setSessionId('');
    };
  }, []);

  return (
    <div className={`conversational-voice-interface ${className}`}>
      {/* Main Voice Control Button */}
      <div className="flex items-center gap-2">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing}
            data-voice-button
            className={`h-12 w-12 rounded-full ${
              isListening 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white shadow-lg`}
            title={isListening ? 'Stop listening' : 'Start voice command'}
          >
            {isProcessing ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : isListening ? (
              <MicOff className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </Button>
        </motion.div>

        {/* Audio Control Button */}
        {aiResponse && enableAutoPlayback && (
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={toggleAudioPlayback}
              className="h-10 w-10 rounded-full bg-green-500 hover:bg-green-600 text-white"
              title={isPlayingResponse ? 'Pause audio' : 'Play audio response'}
            >
              {isPlayingResponse ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </Button>
          </motion.div>
        )}

        {/* Clear Button */}
        {(currentTranscription || aiResponse) && (
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              onClick={clearTranscriptions}
              className="h-10 w-10 rounded-full bg-gray-500 hover:bg-gray-600 text-white"
              title="Clear transcriptions"
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </div>

      {/* Status and Transcription Display */}
      <AnimatePresence>
        {(isListening || isProcessing || currentTranscription || aiResponse || error) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="mt-3 bg-white rounded-lg shadow-lg border p-4 max-w-sm"
          >
            {/* Status */}
            {isListening && (
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  <Mic className="h-4 w-4" />
                </motion.div>
                <span className="text-sm font-medium">Listening...</span>
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center gap-2 text-yellow-600 mb-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">Processing...</span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="text-red-600 text-sm mb-2 font-medium">
                ❌ {error}
              </div>
            )}

            {/* User Transcription */}
            {currentTranscription && showTranscriptions && (
              <div className="mb-3">
                <div className="text-xs text-gray-500 mb-1">You said:</div>
                <div className="text-sm bg-blue-50 p-2 rounded italic">
                  "{currentTranscription}"
                </div>
              </div>
            )}

            {/* AI Response */}
            {aiResponse && (
              <div>
                <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                  Assistant:
                  {isPlayingResponse && (
                    <motion.div
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ repeat: Infinity, duration: 1 }}
                    >
                      <Volume2 className="h-3 w-3" />
                    </motion.div>
                  )}
                </div>
                <div className="text-sm bg-green-50 p-2 rounded">
                  {aiResponse}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}; 