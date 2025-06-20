'use client';

import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Loader2, AlertCircle } from 'lucide-react';
import { voiceService, voiceUtils } from '@/services/voiceService';

interface VoiceButtonProps {
  onTranscript?: (transcript: string) => void;
  onCommand?: (command: any) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'button' | 'fab' | 'minimal';
  showStatus?: boolean;
  autoProcess?: boolean; // If true, automatically processes voice to commands
  className?: string;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({
  onTranscript,
  onCommand,
  onError,
  disabled = false,
  size = 'medium',
  variant = 'button',
  showStatus = true,
  autoProcess = true,
  className = ''
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isServiceAvailable, setIsServiceAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');

  // Check voice service availability on mount
  useEffect(() => {
    checkServiceHealth();
  }, []);

  const checkServiceHealth = async () => {
    const available = await voiceService.isAvailable();
    setIsServiceAvailable(available);
    if (!available) {
      setError('Voice service unavailable');
      onError?.('Voice service is not available. Please ensure the voice service is running on localhost:3001');
    }
  };

  const handleVoiceClick = async () => {
    if (disabled || isProcessing || !isServiceAvailable) return;

    if (isListening) {
      setIsListening(false);
      setStatus('');
    } else {
      await startListening();
    }
  };

  const startListening = async () => {
    try {
      setError(null);
      setIsListening(true);
      setStatus('Listening...');

      // Check microphone permission
      const hasPermission = await voiceUtils.requestMicrophonePermission();
      if (!hasPermission) {
        throw new Error('Microphone permission denied');
      }

      // Record audio for 5 seconds (can be made configurable)
      const audioBlob = await voiceUtils.recordAudio(5000);
      
      setIsListening(false);
      
      if (!audioBlob) {
        throw new Error('Failed to record audio');
      }

      setIsProcessing(true);
      setStatus('Processing...');

      if (autoProcess) {
        // Use full voice processing pipeline
        const result = await voiceService.processVoice({
          audio: audioBlob,
          options: {
            returnAudio: true,
            responseType: 'both'
          }
        });

        if (result.success) {
          if (result.transcript) {
            onTranscript?.(result.transcript);
          }
          
          if (result.command) {
            onCommand?.(result.command);
          }
          
          setStatus(`Processed: "${result.transcript}"`);
          
          // Play response audio if available
          if (result.audioUrl) {
            const audio = new Audio(result.audioUrl);
            audio.play().catch(console.error);
          }
        } else {
          throw new Error(result.error || 'Voice processing failed');
        }
      } else {
        // Just transcribe
        const result = await voiceService.transcribe({ audio: audioBlob });
        
        if (result.success) {
          onTranscript?.(result.transcript);
          setStatus(`"${result.transcript}"`);
        } else {
          throw new Error(result.error || 'Transcription failed');
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      onError?.(errorMessage);
      setStatus('');
    } finally {
      setIsListening(false);
      setIsProcessing(false);
    }
  };

  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'w-8 h-8 text-sm';
      case 'large':
        return 'w-16 h-16 text-xl';
      default:
        return 'w-12 h-12 text-base';
    }
  };

  // Get variant classes
  const getVariantClasses = () => {
    switch (variant) {
      case 'fab':
        return 'rounded-full shadow-lg hover:shadow-xl';
      case 'minimal':
        return 'rounded border border-gray-300 hover:border-gray-400';
      default:
        return 'rounded-lg';
    }
  };

  // Get status color
  const getStatusColor = () => {
    if (error) return 'text-red-600';
    if (isProcessing) return 'text-blue-600';
    if (isListening) return 'text-green-600';
    return 'text-gray-600';
  };

  const renderIcon = () => {
    if (isProcessing) {
      return <Loader2 className="animate-spin" />;
    }
    
    if (!isServiceAvailable) {
      return <AlertCircle className="text-red-500" />;
    }
    
    return isListening ? <MicOff /> : <Mic />;
  };

  const getButtonState = () => {
    if (!isServiceAvailable) return 'bg-red-100 hover:bg-red-200 text-red-700';
    if (isProcessing) return 'bg-blue-100 text-blue-700';
    if (isListening) return 'bg-green-100 text-green-700 animate-pulse';
    if (disabled) return 'bg-gray-100 text-gray-400 cursor-not-allowed';
    return 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900';
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <button
        onClick={handleVoiceClick}
        disabled={disabled || isProcessing || !isServiceAvailable}
        className={`
          ${getSizeClasses()}
          ${getVariantClasses()}
          ${getButtonState()}
          flex items-center justify-center
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${className}
        `}
        title={
          !isServiceAvailable 
            ? 'Voice service unavailable' 
            : isListening 
              ? 'Click to stop listening' 
              : 'Click to start voice input'
        }
      >
        {renderIcon()}
      </button>

      {showStatus && (status || error) && (
        <div className={`text-xs max-w-xs text-center ${getStatusColor()}`}>
          {error || status}
        </div>
      )}
    </div>
  );
};

export default VoiceButton; 