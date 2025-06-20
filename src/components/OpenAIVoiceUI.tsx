'use client';

import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Settings, MessageSquare, Command } from 'lucide-react';
import { useOpenAIVoice, VoiceCommand } from '@/hooks/useOpenAIVoice';
import { cn } from '@/lib/utils';

interface OpenAIVoiceUIProps {
  className?: string;
  onChatMessage?: (message: string) => void;
  onUICommand?: (command: VoiceCommand) => void;
  autoExecuteCommands?: boolean;
  voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  showTranscription?: boolean;
  showDebugInfo?: boolean;
}

export const OpenAIVoiceUI: React.FC<OpenAIVoiceUIProps> = ({
  className,
  onChatMessage,
  onUICommand,
  autoExecuteCommands = true,
  voice = 'alloy',
  showTranscription = true,
  showDebugInfo = false,
}) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(voice);

  const {
    isRecording,
    isProcessing,
    isSpeaking,
    transcription,
    lastCommand,
    error,
    startRecording,
    stopRecording,
    toggleRecording,
    speak,
    executeCommand,
    clearError,
    clearTranscription,
  } = useOpenAIVoice({
    voice: selectedVoice,
    onVoiceCommand: (command) => {
      if (command.type === 'chat_message' && command.response) {
        onChatMessage?.(command.response);
      } else if (command.type === 'ui_command') {
        onUICommand?.(command);
        if (autoExecuteCommands) {
          executeCommand(command);
        }
      }
    },
    onTranscription: (text) => {
      console.log('Transcription:', text);
    },
    onError: (error) => {
      console.error('Voice error:', error);
    },
    autoSpeak: true,
  });

  // Request microphone permission on enable
  useEffect(() => {
    if (isEnabled) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .catch((err) => {
          console.error('Microphone permission denied:', err);
          setIsEnabled(false);
        });
    }
  }, [isEnabled]);

  const handleVoiceToggle = () => {
    if (!isEnabled) {
      setIsEnabled(true);
      return;
    }
    
    toggleRecording();
  };

  const handleTestSpeak = () => {
    speak('Voice interface is working correctly. You can now use voice commands or have conversations.');
  };

  const getStatusColor = () => {
    if (error) return 'text-red-500';
    if (isRecording) return 'text-red-500 animate-pulse';
    if (isProcessing) return 'text-yellow-500 animate-pulse';
    if (isSpeaking) return 'text-blue-500 animate-pulse';
    if (isEnabled) return 'text-green-500';
    return 'text-gray-400';
  };

  const getStatusText = () => {
    if (error) return 'Error';
    if (isRecording) return 'Listening...';
    if (isProcessing) return 'Processing...';
    if (isSpeaking) return 'Speaking...';
    if (isEnabled) return 'Ready';
    return 'Disabled';
  };

  return (
    <div className={cn('bg-white border rounded-lg shadow-sm p-4 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">OpenAI Voice</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className={cn('w-2 h-2 rounded-full', getStatusColor())} />
            <span className={cn('text-xs', getStatusColor())}>{getStatusText()}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleTestSpeak}
            disabled={isSpeaking}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            title="Test voice output"
          >
            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Voice settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-600 text-xs"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-gray-50 border rounded p-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Voice
            </label>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value as any)}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="alloy">Alloy (Neutral)</option>
              <option value="echo">Echo (Male)</option>
              <option value="fable">Fable (British Male)</option>
              <option value="onyx">Onyx (Deep Male)</option>
              <option value="nova">Nova (Female)</option>
              <option value="shimmer">Shimmer (Soft Female)</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-4 text-xs">
            <label className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={autoExecuteCommands}
                onChange={(e) => {/* Handle in parent */}}
                className="rounded"
              />
              <span>Auto-execute commands</span>
            </label>
          </div>
        </div>
      )}

      {/* Main Voice Button */}
      <div className="flex flex-col items-center space-y-3">
        <button
          onClick={handleVoiceToggle}
          disabled={isProcessing || isSpeaking}
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-50',
            isRecording
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg scale-110'
              : isEnabled
              ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-md'
              : 'bg-gray-200 hover:bg-gray-300 text-gray-600'
          )}
        >
          {isRecording ? (
            <MicOff className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </button>
        
        <p className="text-xs text-gray-500 text-center max-w-48">
          {!isEnabled
            ? 'Click to enable voice interface'
            : isRecording
            ? 'Speak now... Click to stop'
            : 'Click and speak, or say "Hey assistant"'
          }
        </p>
      </div>

      {/* Transcription Display */}
      {showTranscription && transcription && (
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-blue-800 mb-1">You said:</p>
              <p className="text-sm text-blue-700">{transcription}</p>
            </div>
            <button
              onClick={clearTranscription}
              className="text-blue-400 hover:text-blue-600 text-xs"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Last Command Display */}
      {showDebugInfo && lastCommand && (
        <div className="bg-gray-50 border rounded p-3">
          <p className="text-xs font-medium text-gray-700 mb-1">Last Command:</p>
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-medium">Type:</span>
              <span className={cn(
                'px-2 py-0.5 rounded text-xs',
                lastCommand.type === 'ui_command' 
                  ? 'bg-purple-100 text-purple-700' 
                  : 'bg-green-100 text-green-700'
              )}>
                {lastCommand.type === 'ui_command' ? (
                  <div className="flex items-center space-x-1">
                    <Command className="w-3 h-3" />
                    <span>UI Command</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    <MessageSquare className="w-3 h-3" />
                    <span>Chat Message</span>
                  </div>
                )}
              </span>
              <span className="text-gray-400">
                ({(lastCommand.confidence * 100).toFixed(0)}% confidence)
              </span>
            </div>
            
            {lastCommand.action && (
              <div className="flex items-center space-x-2">
                <span className="font-medium">Action:</span>
                <span>{lastCommand.action}</span>
              </div>
            )}
            
            {lastCommand.target && (
              <div className="flex items-center space-x-2">
                <span className="font-medium">Target:</span>
                <span>{lastCommand.target}</span>
              </div>
            )}
            
            {lastCommand.response && (
              <div className="space-y-1">
                <span className="font-medium">Response:</span>
                <p className="text-gray-600">{lastCommand.response}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Commands Help */}
      <div className="bg-gray-50 border rounded p-3">
        <p className="text-xs font-medium text-gray-700 mb-2">Voice Commands:</p>
        <div className="text-xs text-gray-600 space-y-1">
          <div><span className="font-medium">Navigation:</span> "Go to dashboard", "Navigate to settings"</div>
          <div><span className="font-medium">Interaction:</span> "Click send button", "Press submit"</div>
          <div><span className="font-medium">Scrolling:</span> "Scroll down", "Scroll to top"</div>
          <div><span className="font-medium">Chat:</span> "Hello", "What is the weather?"</div>
        </div>
      </div>
    </div>
  );
}; 