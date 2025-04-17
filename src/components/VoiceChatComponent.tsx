'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Stack, 
  IconButton, 
  Text, 
  DefaultButton, 
  Spinner,
  ProgressIndicator,
  MessageBar,
  MessageBarType
} from '@fluentui/react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface VoiceChatProps {
  onSendMessage: (message: string) => Promise<string>; // Function to send text to chat API
  isProcessing?: boolean; // Are we already processing a chat message
}

export const VoiceChat: React.FC<VoiceChatProps> = ({ 
  onSendMessage,
  isProcessing = false
}) => {
  // State
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Setup audio element
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.addEventListener('ended', () => {
      setIsPlayingAudio(false);
    });
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener('ended', () => {
          setIsPlayingAudio(false);
        });
      }
    };
  }, []);
  
  // Handle recording timer
  useEffect(() => {
    if (isListening) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecordingTime(0);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isListening]);
  
  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };
  
  // Toggle microphone recording
  const toggleListening = async () => {
    if (isProcessing || isProcessingVoice) return; // Prevent starting if already busy
    
    if (isListening) {
      stopListening();
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        startListening(stream);
      } catch (err) {
        console.error('Error accessing microphone:', err);
        setError('Could not access your microphone. Please check your permissions and try again.');
      }
    }
  };
  
  // Start listening for audio
  const startListening = (stream: MediaStream) => {
    setIsListening(true);
    setTranscript('');
    audioChunksRef.current = [];
    
    // Create media recorder
    const options = { mimeType: 'audio/webm' };
    const mediaRecorder = new MediaRecorder(stream, options);
    mediaRecorderRef.current = mediaRecorder;
    
    // Collect audio chunks
    mediaRecorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    });
    
    // Handle recording stop
    mediaRecorder.addEventListener('stop', () => {
      processRecording();
    });
    
    // Start recording
    mediaRecorder.start(1000); // Collect data in 1-second chunks
  };
  
  // Stop listening/recording
  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      
      // Stop all tracks on the stream
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
    
    setIsListening(false);
  };
  
  // Process the recorded audio
  const processRecording = async () => {
    setIsProcessingVoice(true);
    setProgress(0.1);
    setProgressStatus('Converting speech to text...');
    
    try {
      if (audioChunksRef.current.length === 0) {
        throw new Error('No audio recorded');
      }
      
      // Create audio blob from chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Convert speech to text using Deepgram
      const text = await transcribeAudio(audioBlob);
      
      if (!text || text.trim() === '') {
        setProgress(0);
        setIsProcessingVoice(false);
        setProgressStatus('');
        setError('No speech detected. Please try again.');
        return;
      }
      
      setTranscript(text);
      setProgress(0.3);
      setProgressStatus('Processing your question...');
      
      // Send text to chat API and get response
      const response = await onSendMessage(text);
      
      setProgress(0.6);
      setProgressStatus('Converting response to speech...');
      
      // Convert response text to speech
      await textToSpeech(response);
      
      setProgress(1);
      setProgressStatus('Done!');
      
    } catch (err) {
      console.error('Error processing recording:', err);
      setError(`Error processing your voice: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessingVoice(false);
    }
  };
  
  // Transcribe audio using Deepgram
  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    try {
      // Create form data to send the audio file
      const formData = new FormData();
      formData.append('audio', audioBlob);
      
      // Send to your Deepgram proxy endpoint
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Transcription failed with status: ${response.status}`);
      }
      
      const result = await response.json();
      return result.transcript || '';
      
    } catch (err) {
      console.error('Transcription error:', err);
      throw new Error('Failed to transcribe audio');
    }
  };
  
  // Convert text to speech using ElevenLabs
  const textToSpeech = async (text: string) => {
    try {
      // Release previous audio URL if it exists
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      
      // Call your ElevenLabs API route
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          stability: 0.75,
          similarity_boost: 0.75,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Text-to-speech failed with status: ${response.status}`);
      }
      
      // Create blob from response
      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
      // Play the audio
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setIsPlayingAudio(true);
      }
      
    } catch (err) {
      console.error('Text-to-speech error:', err);
      setError('Failed to convert response to speech');
    }
  };
  
  // Toggle audio playback
  const toggleAudioPlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };
  
  // Calculate the circular progress
  const getCircleStyle = () => {
    const circumference = 2 * Math.PI * 45; // r=45
    const strokeDashoffset = circumference * (1 - recordingTime / 60); // Max 60 seconds
    
    return {
      strokeDasharray: `${circumference} ${circumference}`,
      strokeDashoffset: strokeDashoffset,
    };
  };
  
  return (
    <Stack className="voice-chat-component" tokens={{ childrenGap: 12 }}>
      {error && (
        <MessageBar 
          messageBarType={MessageBarType.error}
          onDismiss={() => setError(null)}
          isMultiline={false}
        >
          {error}
        </MessageBar>
      )}
      
      {/* Voice input controls */}
      <Stack horizontal horizontalAlign="center" tokens={{ childrenGap: 12 }}>
        <div className="mic-button-container" style={{ position: 'relative' }}>
          <IconButton
            iconProps={{ iconName: isListening ? 'MicOff' : 'Mic' }}
            className={`mic-button ${isListening ? 'recording' : ''}`}
            onClick={toggleListening}
            disabled={isProcessing || isProcessingVoice}
            styles={{
              root: {
                width: 100,
                height: 100,
                borderRadius: '50%',
                backgroundColor: isListening ? '#ef4444' : '#f3f4f6',
                color: isListening ? 'white' : '#374151',
                position: 'relative',
                zIndex: 2,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              },
              rootHovered: {
                backgroundColor: isListening ? '#dc2626' : '#e5e7eb',
              },
              rootDisabled: {
                backgroundColor: '#e5e7eb',
                color: '#9ca3af',
              },
              icon: {
                fontSize: 32,
                marginLeft: 0,
                marginRight: 0,
              },
            }}
          >
            {isListening ? <MicOff size={32} /> : <Mic size={32} />}
          </IconButton>
          
          {/* Recording indicator */}
          {isListening && (
            <>
              <svg 
                className="recording-progress" 
                width="120" 
                height="120" 
                viewBox="0 0 120 120"
                style={{
                  position: 'absolute',
                  top: -10,
                  left: -10,
                  zIndex: 1,
                }}
              >
                <circle
                  cx="60"
                  cy="60"
                  r="45"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="4"
                  style={getCircleStyle()}
                />
              </svg>
              <div 
                className="recording-time"
                style={{
                  position: 'absolute',
                  bottom: -30,
                  left: 0,
                  right: 0,
                  textAlign: 'center',
                  color: '#ef4444',
                  fontWeight: 600,
                }}
              >
                {formatTime(recordingTime)}
              </div>
            </>
          )}
        </div>
        
        {/* Audio playback controls */}
        {audioUrl && (
          <IconButton
            iconProps={{ iconName: isPlayingAudio ? 'VolumeX' : 'Volume2' }}
            onClick={toggleAudioPlayback}
            styles={{
              root: {
                width: 50,
                height: 50,
                borderRadius: '50%',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.1)',
              },
              rootHovered: {
                backgroundColor: '#e5e7eb',
              },
              icon: {
                fontSize: 24,
              },
            }}
          >
            {isPlayingAudio ? <VolumeX size={24} /> : <Volume2 size={24} />}
          </IconButton>
        )}
      </Stack>
      
      {/* Status display */}
      {transcript && (
        <div className="transcript-container" style={{ marginTop: 20 }}>
          <Text variant="mediumPlus" style={{ fontWeight: 600 }}>You said:</Text>
          <div className="transcript" style={{ 
            padding: 12,
            backgroundColor: '#f9fafb',
            borderRadius: 8,
            marginTop: 8 
          }}>
            <Text>{transcript}</Text>
          </div>
        </div>
      )}
      
      {/* Processing indicator */}
      {isProcessingVoice && (
        <ProgressIndicator
          label={progressStatus}
          percentComplete={progress}
        />
      )}
    </Stack>
  );
};