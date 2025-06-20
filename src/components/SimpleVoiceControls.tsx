'use client';

import React, { useState, useEffect } from 'react';
import { ConversationalVoiceInterface } from './ConversationalVoiceInterface';
import { useVoiceActionHandler } from '../hooks/useVoiceActionHandler';

interface SimpleVoiceControlsProps {
  currentUser?: {
    name?: string;
    email?: string;
    preferences?: Record<string, any>;
  };
}

export default function SimpleVoiceControls({ 
  currentUser 
}: SimpleVoiceControlsProps) {
  const [mounted, setMounted] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string>('idle');
  const [lastTranscription, setLastTranscription] = useState<string>('');
  const [lastResponse, setLastResponse] = useState<string>('');

  // Get current page using browser APIs only
  const getCurrentPage = () => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  };

  // Simple navigation using browser APIs only
  const navigateToPage = (path: string) => {
    console.log('[SimpleVoice] Navigating to:', path);
    if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  };

  // Browser history navigation
  const navigateBack = () => {
    console.log('[SimpleVoice] Going back');
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  const navigateForward = () => {
    console.log('[SimpleVoice] Going forward');
    if (typeof window !== 'undefined') {
      window.history.forward();
    }
  };

  // Ensure component is mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted
  if (!mounted) {
    return null;
  }

  // Custom action handlers using only browser APIs
  const handleCustomNavigation = (path: string) => {
    console.log('[SimpleVoice] Custom navigation to:', path);
    navigateToPage(path);
  };

  const handleCustomUIInteraction = (action: string, target: string, parameters?: Record<string, any>) => {
    console.log('[SimpleVoice] Custom UI interaction:', { action, target, parameters });
    
    switch (action) {
      case 'toggle_sidebar':
        const sidebar = document.querySelector('[data-sidebar]');
        if (sidebar) {
          sidebar.classList.toggle('hidden');
        }
        break;
      case 'scroll_up':
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'scroll_down':
        window.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
        break;
      case 'focus_search':
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]');
        if (searchInput) {
          (searchInput as HTMLElement).focus();
        }
        break;
      case 'toggle_chat':
        const chatContainer = document.querySelector('[data-chat-container]');
        if (chatContainer) {
          chatContainer.classList.toggle('hidden');
        }
        break;
      case 'clear_chat':
        const clearEvent = new CustomEvent('clearChat');
        window.dispatchEvent(clearEvent);
        break;
      default:
        console.log('[SimpleVoice] Unhandled UI interaction:', action);
    }
  };

  const handleCustomDataOperation = (action: string, target: string, parameters?: Record<string, any>) => {
    console.log('[SimpleVoice] Custom data operation:', { action, target, parameters });
    
    switch (action) {
      case 'send_message':
        if (parameters?.message) {
          const messageEvent = new CustomEvent('sendVoiceMessage', { 
            detail: parameters.message 
          });
          window.dispatchEvent(messageEvent);
        }
        break;
      case 'search':
        if (parameters?.query) {
          const searchInput = document.querySelector('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.value = parameters.query;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            const form = searchInput.closest('form');
            if (form) {
              form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            }
          }
        }
        break;
      default:
        console.log('[SimpleVoice] Unhandled data operation:', action);
    }
  };

  const handleCustomSystemControl = (action: string, parameters?: Record<string, any>) => {
    console.log('[SimpleVoice] Custom system control:', { action, parameters });
    
    switch (action) {
      case 'toggle_theme':
        const themeToggle = document.querySelector('[data-theme-toggle]');
        if (themeToggle) {
          (themeToggle as HTMLElement).click();
        }
        break;
      case 'go_home':
        navigateToPage('/');
        break;
      case 'go_back':
        navigateBack();
        break;
      case 'go_forward':
        navigateForward();
        break;
      case 'refresh_page':
        window.location.reload();
        break;
      case 'voice_settings':
        navigateToPage('/settings/voice');
        break;
      case 'open_debug_tools':
        navigateToPage('/debug-tools');
        break;
      case 'open_voice_demo':
        navigateToPage('/voice-demo');
        break;
      default:
        console.log('[SimpleVoice] Unhandled system control:', action);
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
    console.log('[SimpleVoice] Voice transcription:', text);
    setLastTranscription(text);
  };

  const handleVoiceResponse = (text: string) => {
    console.log('[SimpleVoice] Voice response:', text);
    setLastResponse(text);
  };

  const handleVoiceStatusChange = (status: string) => {
    console.log('[SimpleVoice] Voice status changed:', status);
    setVoiceStatus(status);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
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

  // Listen for app events
  useEffect(() => {
    const handleSendVoiceMessage = (event: CustomEvent) => {
      console.log('[SimpleVoice] Sending voice message:', event.detail);
    };

    const handleClearChat = () => {
      console.log('[SimpleVoice] Clearing chat via voice command');
    };

    window.addEventListener('sendVoiceMessage', handleSendVoiceMessage as EventListener);
    window.addEventListener('clearChat', handleClearChat);

    return () => {
      window.removeEventListener('sendVoiceMessage', handleSendVoiceMessage as EventListener);
      window.removeEventListener('clearChat', handleClearChat);
    };
  }, []);

  return (
    <>
      {/* Voice Control Interface - Fixed Position */}
      <div className="fixed bottom-6 right-6 z-50">
        <ConversationalVoiceInterface
          apiBaseUrl={process.env.NEXT_PUBLIC_VOICE_SERVICE_URL || "http://localhost:3001"}
          currentPage={getCurrentPage()}
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

      {/* Voice Status Indicator */}
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

      {/* Development Helper - Voice Commands Guide */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-6 left-6 z-40 bg-black/80 text-white p-4 rounded-lg text-xs max-w-xs hidden lg:block">
          <div className="font-bold mb-2">🎤 Voice Commands:</div>
          <div className="space-y-1 text-xs">
            <div>• "Go to [page]" (dashboard, settings, etc)</div>
            <div>• "Search for [query]"</div>
            <div>• "Scroll down/up"</div>
            <div>• "Go back/forward"</div>
            <div>• "Send message [text]"</div>
            <div>• "Clear chat"</div>
            <div>• "Open debug tools"</div>
            <div>• "Refresh page"</div>
            <div className="mt-2 text-gray-300">
              Shortcut: <kbd className="bg-white/20 px-1 rounded">Ctrl+Shift+V</kbd>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 