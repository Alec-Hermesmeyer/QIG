'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, Square } from 'lucide-react';

interface SimpleOpenAIVoiceProps {
  className?: string;
  onMessage?: (message: string, isVoiceGenerated: boolean) => void;
}

export const SimpleOpenAIVoice: React.FC<SimpleOpenAIVoiceProps> = ({
  className = '',
  onMessage
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastTranscription, setLastTranscription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up resources
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
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
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    if (isRecording || isProcessing) return;

    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        } 
      });
      
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsProcessing(true);

        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          if (audioBlob.size === 0) {
            throw new Error('No audio recorded');
          }
          
          // Send to OpenAI Whisper
          const formData = new FormData();
          formData.append('file', audioBlob, 'audio.webm');
          
          const sttResponse = await fetch('/api/speech-to-text', {
            method: 'POST',
            body: formData,
          });

          if (!sttResponse.ok) {
            throw new Error(`STT failed: ${sttResponse.status}`);
          }

          const sttResult = await sttResponse.json();
          const transcription = sttResult.text || '';
          
          setLastTranscription(transcription);
          
          if (transcription.trim()) {
            // Process with GPT
            const gptResponse = await fetch('/api/process-voice-command', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: transcription,
                context: { currentPath: window.location.pathname }
              }),
            });

            if (gptResponse.ok) {
              const result = await gptResponse.json();
              
              if (result.type === 'chat_message' && result.response) {
                // Send to chat and speak response
                onMessage?.(result.response, true);
                await speakText(result.response);
              } else if (result.type === 'ui_command') {
                // Execute UI command
                executeUICommand(result);
                if (result.action) {
                  onMessage?.(`Executed command: ${result.action} ${result.target || ''}`, true);
                }
              }
            } else {
              // Fallback - just send the transcription as a regular message
              onMessage?.(transcription, true);
            }
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Processing failed';
          setError(errorMsg);
          console.error('Voice processing error:', err);
        } finally {
          setIsProcessing(false);
          cleanup();
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMsg);
      console.error('Recording error:', err);
      cleanup();
    }
  }, [isRecording, isProcessing, onMessage]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (!isRecording) return;
    
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } catch (err) {
      console.error('Stop recording error:', err);
      cleanup();
    }
  }, [isRecording, cleanup]);

  // Toggle recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Speak text using OpenAI TTS
  const speakText = useCallback(async (text: string) => {
    if (isSpeaking || !text.trim()) return;

    try {
      setIsSpeaking(true);
      setError(null);
      
      const response = await fetch('/api/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: 'alloy',
          model: 'tts-1'
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS failed: ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      
      return new Promise<void>((resolve) => {
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        
        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
        
        audio.play().catch(() => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          resolve();
        });
      });
    } catch (err) {
      console.error('TTS error:', err);
      setIsSpeaking(false);
    }
  }, [isSpeaking]);

  // Execute UI commands
  const executeUICommand = useCallback((command: any) => {
    try {
      switch (command.action) {
        case 'navigate':
          if (command.target) {
            window.location.href = command.target;
          }
          break;
          
        case 'click':
          if (command.target) {
            // Simple button clicking
            const buttons = Array.from(document.querySelectorAll('button'));
            const targetButton = buttons.find(btn => 
              btn.textContent?.toLowerCase().includes(command.target.toLowerCase())
            );
            if (targetButton) {
              targetButton.click();
            }
          }
          break;
          
        case 'scroll':
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
          }
          break;
      }
    } catch (err) {
      console.error('Command execution error:', err);
    }
  }, []);

  const getStatusColor = () => {
    if (error) return 'text-red-500';
    if (isRecording) return 'text-red-500';
    if (isProcessing) return 'text-yellow-500';
    if (isSpeaking) return 'text-blue-500';
    return 'text-gray-500';
  };

  const getStatusText = () => {
    if (error) return 'Error';
    if (isRecording) return 'Recording...';
    if (isProcessing) return 'Processing...';
    if (isSpeaking) return 'Speaking...';
    return 'Ready';
  };

  return (
    <div className={`bg-white border rounded-lg shadow-sm p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium">OpenAI Voice</h3>
          <div className={`text-xs ${getStatusColor()}`}>
            {getStatusText()}
          </div>
        </div>
        
        {isSpeaking && (
          <button
            onClick={() => setIsSpeaking(false)}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Stop speaking"
          >
            <Square className="w-4 h-4" />
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-2 mb-3">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 text-xs mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-col items-center space-y-3">
        <button
          onClick={toggleRecording}
          disabled={isProcessing || isSpeaking}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-50 ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 text-white scale-110'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isRecording ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>
        
        <p className="text-xs text-gray-500 text-center">
          {isRecording
            ? 'Recording... Click to stop'
            : isProcessing
            ? 'Processing your voice...'
            : isSpeaking
            ? 'Speaking response...'
            : 'Click to start recording'
          }
        </p>
      </div>

      {lastTranscription && (
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-2">
          <p className="text-xs font-medium text-blue-800 mb-1">Last heard:</p>
          <p className="text-sm text-blue-700">{lastTranscription}</p>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-500">
        <p><strong>Commands:</strong></p>
        <p>• "Go to [page]" - Navigate</p>
        <p>• "Click [button]" - Click buttons</p>
        <p>• "Scroll down/up" - Scroll page</p>
        <p>• Ask questions for chat responses</p>
      </div>
    </div>
  );
}; 