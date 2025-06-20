'use client';

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useVoiceUIControl } from '@/hooks/useVoiceUIControl';

interface VoiceUIControlContextType {
  isConnected: boolean;
  isProcessing: boolean;
  currentContext: string;
  availableActions: string[];
  processVoiceCommand: (text: string, context?: string) => Promise<any>;
  setCurrentContext: (context: string) => void;
  updateUIContext: (context?: string) => Promise<void>;
  getAvailableActions: (context?: string) => Promise<string[]>;
}

const VoiceUIControlContext = createContext<VoiceUIControlContextType | null>(null);

interface VoiceUIControlProviderProps {
  children: React.ReactNode;
  autoConnect?: boolean;
  enableContextUpdates?: boolean;
  debugMode?: boolean;
}

export const VoiceUIControlProvider: React.FC<VoiceUIControlProviderProps> = ({
  children,
  autoConnect = true,
  enableContextUpdates = true,
  debugMode = false
}) => {
  const voiceUIControl = useVoiceUIControl({
    autoConnect,
    enableContextUpdates,
    debugMode
  });

  const {
    isConnected,
    isProcessing,
    currentContext,
    availableActions,
    processVoiceCommand,
    setCurrentContext,
    updateUIContext,
    getAvailableActions,
    log
  } = voiceUIControl;

  // Log connection status changes
  useEffect(() => {
    log('Voice UI Control connection status changed:', isConnected);
  }, [isConnected, log]);

  const contextValue: VoiceUIControlContextType = {
    isConnected,
    isProcessing,
    currentContext,
    availableActions,
    processVoiceCommand,
    setCurrentContext,
    updateUIContext,
    getAvailableActions
  };

  return (
    <VoiceUIControlContext.Provider value={contextValue}>
      {children}
      
      {/* Debug panel in development */}
      {debugMode && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs max-w-xs z-50">
          <div className="font-bold mb-2">🎮 Voice UI Control</div>
          <div className="space-y-1">
            <div>Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
            <div>Processing: {isProcessing ? '⏳ Yes' : '✅ No'}</div>
            <div>Context: {currentContext}</div>
            <div>Actions: {availableActions.length}</div>
          </div>
        </div>
      )}
    </VoiceUIControlContext.Provider>
  );
};

// Hook to use the Voice UI Control context
export const useVoiceUIControlContext = () => {
  const context = useContext(VoiceUIControlContext);
  
  if (!context) {
    throw new Error('useVoiceUIControlContext must be used within a VoiceUIControlProvider');
  }
  
  return context;
};

// Integration component for chat
interface VoiceUIIntegrationProps {
  onVoiceCommand?: (text: string) => void;
  onCommandProcessed?: (result: any) => void;
  enabled?: boolean;
}

export const VoiceUIIntegration: React.FC<VoiceUIIntegrationProps> = ({
  onVoiceCommand,
  onCommandProcessed,
  enabled = true
}) => {
  const { processVoiceCommand, isConnected, isProcessing } = useVoiceUIControlContext();
  const processingRef = useRef(false);

  // Handle voice commands from chat
  const handleVoiceCommand = async (text: string) => {
    if (!enabled || !isConnected || processingRef.current) {
      return;
    }

    try {
      processingRef.current = true;
      
      // Notify parent that we're processing a voice command
      if (onVoiceCommand) {
        onVoiceCommand(text);
      }

      // Check if this looks like a UI command
      const uiCommandPatterns = [
        /go to|navigate to|open/i,
        /click|press|tap/i,
        /scroll|move/i,
        /search for|find/i,
        /close|open|toggle/i,
        /back|forward|refresh/i,
        /fill|type|enter/i,
        /select|choose/i
      ];

      const isUICommand = uiCommandPatterns.some(pattern => pattern.test(text));

      if (isUICommand) {
        console.log('[VoiceUIIntegration] Processing as UI command:', text);
        
        // Process the command
        const result = await processVoiceCommand(text);
        
        if (onCommandProcessed) {
          onCommandProcessed(result);
        }
        
        return true; // Indicates this was handled as a UI command
      }
    } catch (error) {
      console.error('[VoiceUIIntegration] Error processing voice command:', error);
    } finally {
      processingRef.current = false;
    }

    return false; // Not handled as a UI command
  };

  // Expose the handler for use by chat component
  React.useEffect(() => {
    if (enabled && isConnected) {
      // This could be used to register the handler globally
      (window as any).handleVoiceUICommand = handleVoiceCommand;
    }
    
    return () => {
      delete (window as any).handleVoiceUICommand;
    };
  }, [enabled, isConnected]);

  return null; // This is a logic-only component
}; 