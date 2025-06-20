import { useState, useRef, useCallback, useEffect } from 'react';
import { openaiVoiceService } from '@/services/openai-voice';

export interface VoiceCommand {
  type: 'ui_command' | 'chat_message';
  action?: string;
  target?: string;
  response?: string;
  confidence: number;
}

export interface UseOpenAIVoiceOptions {
  onVoiceCommand?: (command: VoiceCommand) => void;
  onTranscription?: (text: string) => void;
  onError?: (error: Error) => void;
  autoSpeak?: boolean; // Automatically speak chat responses
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
}

export const useOpenAIVoice = (options: UseOpenAIVoiceOptions = {}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const isCleanedUpRef = useRef(false);
  const processingRef = useRef(false);

  const {
    onVoiceCommand,
    onTranscription,
    onError,
    autoSpeak = true,
    voice = 'alloy'
  } = options;

  // Clean up resources
  const cleanup = useCallback(() => {
    if (isCleanedUpRef.current) return;
    
    isCleanedUpRef.current = true;
    
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        streamRef.current = null;
      }
      
      if (mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current = null;
      }
      
      setIsRecording(false);
      setIsProcessing(false);
      setIsSpeaking(false);
    } catch (error) {
      console.warn('Error during cleanup:', error);
    }
  }, []);

  // Initialize media recorder
  const initializeRecording = useCallback(async () => {
    if (isCleanedUpRef.current || processingRef.current) return false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000, // Optimized for Whisper
        } 
      });
      
      if (isCleanedUpRef.current) {
        // Clean up if component was unmounted during async operation
        stream.getTracks().forEach(track => track.stop());
        return false;
      }
      
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && !isCleanedUpRef.current) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (isCleanedUpRef.current || processingRef.current) return;
        
        processingRef.current = true;
        setIsProcessing(true);
        setError(null);

        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          if (audioBlob.size === 0) {
            throw new Error('No audio data recorded');
          }
          
          // Convert to text using OpenAI Whisper
          const transcribedText = await openaiVoiceService.speechToText(audioBlob);
          
          if (isCleanedUpRef.current) return;
          
          setTranscription(transcribedText);
          onTranscription?.(transcribedText);

          if (transcribedText.trim()) {
            // Process with GPT to determine command type
            const command = await openaiVoiceService.processVoiceCommand(transcribedText, {
              currentPath: typeof window !== 'undefined' ? window.location.pathname : '/',
              timestamp: new Date().toISOString()
            });

            if (isCleanedUpRef.current) return;

            setLastCommand(command);
            onVoiceCommand?.(command);

            // Auto-speak responses for chat messages
            if (autoSpeak && command.type === 'chat_message' && command.response && !isCleanedUpRef.current) {
              await speak(command.response);
            }
          }
        } catch (err) {
          if (isCleanedUpRef.current) return;
          
          const error = err instanceof Error ? err : new Error('Unknown error occurred');
          setError(error.message);
          onError?.(error);
        } finally {
          processingRef.current = false;
          if (!isCleanedUpRef.current) {
            setIsProcessing(false);
          }
        }
      };

      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to access microphone');
      setError(error.message);
      onError?.(error);
      return false;
    }
  }, [onVoiceCommand, onTranscription, onError, autoSpeak]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (isRecording || isCleanedUpRef.current || processingRef.current) return false;

    const initialized = await initializeRecording();
    if (!initialized || isCleanedUpRef.current) return false;

    try {
      mediaRecorderRef.current?.start();
      setIsRecording(true);
      setError(null);
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to start recording');
      setError(error.message);
      onError?.(error);
      return false;
    }
  }, [isRecording, initializeRecording, onError]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (!isRecording || isCleanedUpRef.current) return;

    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } catch (err) {
      console.error('Error stopping recording:', err);
    }
  }, [isRecording]);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isCleanedUpRef.current) return;
    
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Speak text using OpenAI TTS
  const speak = useCallback(async (text: string) => {
    if (isSpeaking || isCleanedUpRef.current) return false;

    try {
      setIsSpeaking(true);
      setError(null);
      
      const audioBuffer = await openaiVoiceService.textToSpeech(text, voice);
      
      if (isCleanedUpRef.current) return false;
      
      await openaiVoiceService.playAudio(audioBuffer);
      
      return true;
    } catch (err) {
      if (isCleanedUpRef.current) return false;
      
      const error = err instanceof Error ? err : new Error('Failed to speak text');
      setError(error.message);
      onError?.(error);
      return false;
    } finally {
      if (!isCleanedUpRef.current) {
        setIsSpeaking(false);
      }
    }
  }, [isSpeaking, voice, onError]);

  // Execute UI command
  const executeCommand = useCallback((command: VoiceCommand) => {
    if (command.type !== 'ui_command' || isCleanedUpRef.current) return;

    try {
      switch (command.action) {
        case 'navigate':
          if (command.target && typeof window !== 'undefined') {
            window.location.href = command.target;
          }
          break;
          
        case 'click':
          if (command.target && typeof document !== 'undefined') {
            // Simple selector-based clicking
            const element = document.querySelector(`[data-testid="${command.target}"], button:contains("${command.target}"), a:contains("${command.target}")`);
            if (element && element instanceof HTMLElement) {
              element.click();
            }
          }
          break;
          
        case 'scroll':
          if (typeof window !== 'undefined') {
            switch (command.target) {
              case 'up':
                window.scrollBy(0, -300);
                break;
              case 'down':
                window.scrollBy(0, 300);
                break;
              case 'top':
                window.scrollTo(0, 0);
                break;
              case 'bottom':
                window.scrollTo(0, document.body.scrollHeight);
                break;
            }
          }
          break;
          
        default:
          console.warn('Unknown UI command:', command.action);
      }
    } catch (err) {
      console.error('Error executing command:', err);
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Reset cleanup flag when hook is re-initialized
  useEffect(() => {
    isCleanedUpRef.current = false;
    processingRef.current = false;
  }, []);

  return {
    // State
    isRecording,
    isProcessing,
    isSpeaking,
    transcription,
    lastCommand,
    error,
    
    // Actions
    startRecording,
    stopRecording,
    toggleRecording,
    speak,
    executeCommand,
    
    // Utilities
    clearError: () => !isCleanedUpRef.current && setError(null),
    clearTranscription: () => !isCleanedUpRef.current && setTranscription(''),
  };
}; 