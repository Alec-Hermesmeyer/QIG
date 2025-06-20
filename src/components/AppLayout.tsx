'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { ConversationalVoiceInterface } from './ConversationalVoiceInterface';
import { useVoiceActionHandler } from '../hooks/useVoiceActionHandler';
import { MemoryMonitor } from './MemoryMonitor';

interface AppLayoutProps {
  children: React.ReactNode;
  currentUser?: {
    name?: string;
    email?: string;
    preferences?: Record<string, any>;
  };
  showVoiceControl?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  currentUser,
  showVoiceControl = true
}) => {
  const router = useRouter();
  const [voiceStatus, setVoiceStatus] = useState<string>('idle');
  const [lastTranscription, setLastTranscription] = useState<string>('');
  const [lastResponse, setLastResponse] = useState<string>('');

  // Custom action handlers for app-specific functionality
  const handleCustomNavigation = (path: string) => {
    console.log('[AppLayout] Custom navigation to:', path);
    // Add any custom navigation logic here
    router.push(path);
  };

  const handleCustomUIInteraction = (action: string, target: string, parameters?: Record<string, any>) => {
    console.log('[AppLayout] Custom UI interaction:', { action, target, parameters });
    
    // Add app-specific UI interactions here
    switch (action) {
      case 'toggle_chat':
        // Example: Toggle chat interface
        const chatContainer = document.querySelector('[data-chat-container]');
        if (chatContainer) {
          chatContainer.classList.toggle('hidden');
        }
        break;
      case 'clear_chat':
        // Example: Clear chat messages
        const clearEvent = new CustomEvent('clearChat');
        window.dispatchEvent(clearEvent);
        break;
      default:
        console.log('[AppLayout] Unhandled UI interaction:', action);
    }
  };

  const handleCustomDataOperation = (action: string, target: string, parameters?: Record<string, any>) => {
    console.log('[AppLayout] Custom data operation:', { action, target, parameters });
    
    // Add app-specific data operations here
    switch (action) {
      case 'send_message':
        // Example: Send a message via voice
        if (parameters?.message) {
          const messageEvent = new CustomEvent('sendVoiceMessage', { 
            detail: parameters.message 
          });
          window.dispatchEvent(messageEvent);
        }
        break;
      default:
        console.log('[AppLayout] Unhandled data operation:', action);
    }
  };

  const handleCustomSystemControl = (action: string, parameters?: Record<string, any>) => {
    console.log('[AppLayout] Custom system control:', { action, parameters });
    
    // Add app-specific system controls here
    switch (action) {
      case 'voice_settings':
        router.push('/settings/voice');
        break;
      default:
        console.log('[AppLayout] Unhandled system control:', action);
    }
  };

  // Initialize voice action handler
  const { handleAction } = useVoiceActionHandler({
    onNavigate: handleCustomNavigation,
    onUIInteraction: handleCustomUIInteraction,
    onDataOperation: handleCustomDataOperation,
    onSystemControl: handleCustomSystemControl
  });

  // Voice event handlers
  const handleVoiceTranscription = (text: string) => {
    console.log('[AppLayout] Voice transcription:', text);
    setLastTranscription(text);
  };

  const handleVoiceResponse = (text: string) => {
    console.log('[AppLayout] Voice response:', text);
    setLastResponse(text);
  };

  const handleVoiceStatusChange = (status: string) => {
    console.log('[AppLayout] Voice status changed:', status);
    setVoiceStatus(status);
  };

  // Keyboard shortcuts for voice control
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + V to toggle voice interface
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'V') {
        event.preventDefault();
        const voiceButton = document.querySelector('[data-voice-button]');
        if (voiceButton) {
          (voiceButton as HTMLElement).click();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Listen for custom app events that can be triggered by voice
  useEffect(() => {
    const handleSendVoiceMessage = (event: CustomEvent) => {
      console.log('[AppLayout] Sending voice message:', event.detail);
      // This would integrate with your chat component
      // For now, we'll just trigger a custom event that the chat component can listen to
    };

    const handleClearChat = () => {
      console.log('[AppLayout] Clearing chat via voice command');
      // Trigger chat clearing
    };

    window.addEventListener('sendVoiceMessage', handleSendVoiceMessage as EventListener);
    window.addEventListener('clearChat', handleClearChat);

    return () => {
      window.removeEventListener('sendVoiceMessage', handleSendVoiceMessage as EventListener);
      window.removeEventListener('clearChat', handleClearChat);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Main Content */}
      <main className="relative z-0">
        {children}
      </main>

      {/* Voice Control Interface */}
      {showVoiceControl && (
        <div className="fixed bottom-6 right-6 z-50">
          <ConversationalVoiceInterface
            apiBaseUrl={process.env.NEXT_PUBLIC_VOICE_SERVICE_URL || "http://localhost:3001"}
            currentPage={router.pathname}
            userProfile={currentUser}
            onAction={handleAction}
            onTranscription={handleVoiceTranscription}
            onResponse={handleVoiceResponse}
            onStatusChange={handleVoiceStatusChange}
            enableAutoPlayback={true}
            showTranscriptions={true}
            className="voice-control-interface"
          />
        </div>
      )}

      {/* Voice Status Indicator (optional) */}
      {voiceStatus !== 'idle' && (
        <div className="fixed top-4 right-4 z-40 bg-white rounded-lg shadow-lg p-3 border">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              voiceStatus === 'listening' ? 'bg-blue-500 animate-pulse' :
              voiceStatus === 'processing' ? 'bg-yellow-500 animate-spin' :
              voiceStatus === 'error' ? 'bg-red-500' :
              'bg-green-500'
            }`} />
            <span className="text-sm font-medium capitalize">
              {voiceStatus === 'listening' ? 'Listening...' :
               voiceStatus === 'processing' ? 'Processing...' :
               voiceStatus === 'error' ? 'Error' :
               'Voice Active'}
            </span>
          </div>
        </div>
      )}

      {/* Memory Monitor (Development Only) */}
      <MemoryMonitor position="top-left" warningThreshold={150} />

      {/* Development Helper - Voice Commands Guide */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-6 left-6 z-40 bg-black/80 text-white p-4 rounded-lg text-xs max-w-xs hidden lg:block">
          <div className="font-bold mb-2">Voice Commands:</div>
          <div className="space-y-1 text-xs">
            <div>• "Go to dashboard"</div>
            <div>• "Search for [query]"</div>
            <div>• "Scroll down/up"</div>
            <div>• "Toggle theme"</div>
            <div>• "Go back"</div>
            <div>• "Send message [text]"</div>
            <div>• "Clear chat"</div>
            <div className="mt-2 text-gray-300">
              Shortcut: Ctrl+Shift+V
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 