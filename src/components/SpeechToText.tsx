'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

// Configuration
const DEEPGRAM_API_URL = 'wss://api.deepgram.com/v1/listen';

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

export default function SpeechToTextComponent() {
  // State management
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs with proper TypeScript typing
  const socketRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Cleanup function
  const cleanupResources = () => {
    // Close WebSocket connection
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.close();
      socketRef.current = null;
    }

    // Stop media recorder if it exists
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    // Disconnect and close audio processing nodes
    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (processorNodeRef.current) {
      processorNodeRef.current.disconnect();
      processorNodeRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }

    // Stop all tracks in the media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, []);

  const startRecording = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Check if the API key is available
      const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
      if (!apiKey) {
        throw new Error('Deepgram API key is not available');
      }

      // Get user media (microphone access)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Create a WebSocket connection to Deepgram
      const socket = new WebSocket(DEEPGRAM_API_URL, [
        'token',
        apiKey
      ]);

      socketRef.current = socket;

      // Set up WebSocket event handlers
      socket.onopen = () => {
        console.log('WebSocket connection opened');
        
        // Create AudioContext (Safari-compatible)
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContext({ sampleRate: 16000 });
        audioContextRef.current = audioContext;
        
        // Create audio source from the stream
        if (mediaStreamRef.current) {
          const sourceNode = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
          sourceNodeRef.current = sourceNode;
          
          // Create script processor node (works in Safari)
          // Note: ScriptProcessorNode is deprecated but works in Safari
          // AudioWorklet is the modern replacement but has issues in some Safari versions
          const processorNode = audioContextRef.current.createScriptProcessor(4096, 1, 1);
          processorNodeRef.current = processorNode;
          
          // Connect the audio processing pipeline
          sourceNodeRef.current.connect(processorNodeRef.current);
          processorNodeRef.current.connect(audioContextRef.current.destination);
          
          // Process audio data
          processorNodeRef.current.onaudioprocess = (e) => {
            if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
              // Get audio data
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Convert to 16-bit PCM (required format for Deepgram)
              const pcmData = convertFloatToInt16(inputData);
              
              // Send audio data to Deepgram
              socketRef.current.send(pcmData);
            }
          };
        }

        setIsRecording(true);
        setIsConnecting(false);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as DeepgramResponse;
          
          // Check if this is a transcription result
          if (data && data.channel && data.channel.alternatives && data.channel.alternatives.length > 0) {
            const transcription = data.channel.alternatives[0].transcript;
            
            // Handle interim vs final results
            if (data.is_final) {
              setTranscript(prev => prev + ' ' + transcription.trim());
              setInterimTranscript('');
            } else {
              setInterimTranscript(transcription);
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error. Please try again.');
        stopRecording();
      };

      socket.onclose = () => {
        console.log('WebSocket connection closed');
        if (isRecording) {
          stopRecording();
        }
      };
    } catch (error) {
      console.error('Error starting recording:', error);
      setError(error instanceof Error ? error.message : 'Failed to start recording');
      setIsConnecting(false);
    }
  };

  const stopRecording = () => {
    cleanupResources();
    setIsRecording(false);
    setIsConnecting(false);
  };

  // Utility function to convert Float32Array to Int16Array
  // This is crucial for Safari compatibility - sends proper PCM format
  const convertFloatToInt16 = (buffer: Float32Array): ArrayBuffer => {
    const l = buffer.length;
    const buf = new Int16Array(l);
    
    for (let i = 0; i < l; i++) {
      // Convert float (-1 to 1) to int16 (-32768 to 32767)
      buf[i] = Math.min(1, Math.max(-1, buffer[i])) * 32767;
    }
    
    return buf.buffer;
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center text-gray-800">
        Speech-to-Text Streaming
      </h2>
      
      {/* Status indicator */}
      <div className="text-center">
        {isConnecting ? (
          <motion.div 
            className="flex items-center justify-center space-x-2 text-indigo-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Loader2 className="animate-spin h-5 w-5" />
            <span>Connecting...</span>
          </motion.div>
        ) : isRecording ? (
          <motion.div 
            className="flex items-center justify-center space-x-2 text-green-600"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
          >
            <Volume2 className="h-5 w-5" />
            <span>Listening...</span>
          </motion.div>
        ) : (
          <span className="text-gray-500">Ready to record</span>
        )}
      </div>
      
      {/* Transcript display */}
      <div className="min-h-32 p-4 border border-gray-200 rounded-md bg-gray-50">
        <p className="text-gray-800">
          {transcript}
          <span className="text-gray-400 italic">
            {interimTranscript ? ` ${interimTranscript}` : ''}
          </span>
        </p>
      </div>
      
      {/* Error message */}
      {error && (
        <div className="p-2 text-sm text-red-600 bg-red-50 rounded-md">
          {error}
        </div>
      )}
      
      {/* Control buttons */}
      <div className="flex justify-center space-x-4">
        <Button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isConnecting}
          className={`flex items-center gap-2 px-6 py-3 ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {isRecording ? (
            <>
              <MicOff className="h-5 w-5" />
              Stop
            </>
          ) : (
            <>
              <Mic className="h-5 w-5" />
              {isConnecting ? 'Connecting...' : 'Start Recording'}
            </>
          )}
        </Button>
        
        <Button
          onClick={() => {
            setTranscript('');
            setInterimTranscript('');
          }}
          variant="outline"
          className="px-6 py-3"
          disabled={isConnecting || (!transcript && !interimTranscript)}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}