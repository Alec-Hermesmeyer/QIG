'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';

interface VoiceChatProps {
  onTranscriptChange: (transcript: string) => void;
  onSendMessage: (message: string) => Promise<string>;
  isProcessing?: boolean;
}

export const SimpleVoiceChat: React.FC<VoiceChatProps> = ({
  onTranscriptChange,
  onSendMessage,
  isProcessing = false
}) => {
  // State
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
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
    if (isRecording) {
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
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };
  
  // Start recording
  const startRecording = async () => {
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      streamRef.current = stream;
      
      // Reset chunks
      audioChunksRef.current = [];
      
      // Create MediaRecorder - try with different formats
      let mediaRecorder;
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/mp4' });
      } else {
        // Fallback to browser default
        mediaRecorder = new MediaRecorder(stream);
      }
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Set up data collection
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Start recording
      mediaRecorder.start(100);
      setIsRecording(true);
      setTranscript('');
      console.log('Recording started with MIME type:', mediaRecorder.mimeType);
      
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Could not access microphone. Please check permissions.');
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (!isRecording) return;
    
    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      
      // Process the recording when stopped
      mediaRecorderRef.current.onstop = () => {
        processRecording();
      };
    }
    
    // Stop all tracks on the stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setIsRecording(false);
  };
  
  // Process the recording
  const processRecording = async () => {
    if (audioChunksRef.current.length === 0) {
      console.log('No audio recorded');
      return;
    }
    
    setIsProcessingVoice(true);
    
    try {
      // Create audio blob from chunks
      const audioBlob = new Blob(audioChunksRef.current, { 
        type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
      });
      
      // Create FormData
      const formData = new FormData();
      formData.append('audio', audioBlob);
      
      // Get format hint from MIME type
      const mimeType = audioBlob.type || '';
      const format = mimeType.includes('webm') ? 'webm' : 
                     mimeType.includes('mp4') ? 'mp4' : 
                     'auto';
      
      formData.append('format', format);
      
      console.log('Sending audio for transcription:', {
        size: audioBlob.size,
        type: audioBlob.type,
        format: format
      });
      
      // Send to transcription API
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error (${response.status}): ${errorText}`);
      }
      
      // Get transcription result
      const result = await response.json();
      console.log('Transcription result:', result);
      
      if (!result.transcript) {
        throw new Error('No transcript returned');
      }
      
      // Update transcript
      setTranscript(result.transcript);
      onTranscriptChange(result.transcript);
      
      // Now send transcript to get response
      const responseText = await onSendMessage(result.transcript);
      
      // Convert response to speech
      await textToSpeech(responseText);
      
    } catch (err) {
      console.error('Error processing recording:', err);
      setError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessingVoice(false);
    }
  };
  
  // Convert text to speech
  const textToSpeech = async (text: string) => {
    try {
      // Release previous audio URL if it exists
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
      }
      
      // Call your text-to-speech API
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
  
  // Toggle recording on/off
  const toggleRecording = () => {
    if (isProcessing || isProcessingVoice) return;
    
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  
  return (
    <div className="voice-chat-container p-4 border rounded-md">
      {error && (
        <div className="error-message p-2 mb-3 bg-red-50 text-red-700 rounded border border-red-200">
          {error}
          <button 
            onClick={() => setError(null)} 
            className="ml-2 text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}
      
      <div className="flex flex-col items-center">
        {/* Voice input button */}
        <button
          onClick={toggleRecording}
          disabled={isProcessing || isProcessingVoice}
          className={`w-16 h-16 rounded-full flex items-center justify-center ${
            isRecording ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700'
          } ${(isProcessing || isProcessingVoice) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
        </button>
        
        {/* Recording status */}
        <div className="mt-2 text-sm text-gray-500">
          {isRecording 
            ? `Recording... ${formatTime(recordingTime)}` 
            : 'Click to start recording'}
        </div>
        
        {/* Processing indicator */}
        {isProcessingVoice && (
          <div className="mt-2 text-sm text-amber-600">
            Processing your voice...
          </div>
        )}
      </div>
      
      {/* Transcript */}
      {transcript && (
        <div className="mt-4">
          <div className="text-sm font-medium text-gray-700">You said:</div>
          <div className="p-2 mt-1 bg-white border rounded-md">
            {transcript}
          </div>
        </div>
      )}
      
      {/* Audio playback */}
      {audioUrl && (
        <div className="mt-4 flex items-center gap-2 justify-center">
          <button
            onClick={toggleAudioPlayback}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
          >
            {isPlayingAudio ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <span className="text-sm text-gray-600">
            {isPlayingAudio ? 'Pause' : 'Play response'}
          </span>
        </div>
      )}
    </div>
  );
};

export default SimpleVoiceChat;