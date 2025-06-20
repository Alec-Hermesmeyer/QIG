'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ConversationalVoiceInterface } from './ConversationalVoiceInterface';
import { useVoiceActionHandler } from '../hooks/useVoiceActionHandler';

interface VoiceInterfaceWithRouterProps {
  currentUser?: {
    name?: string;
    email?: string;
    preferences?: Record<string, any>;
  };
}

export default function VoiceInterfaceWithRouter({ 
  currentUser 
}: VoiceInterfaceWithRouterProps) {
  const [mounted, setMounted] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string>('idle');
  const [lastTranscription, setLastTranscription] = useState<string>('');
  const [lastResponse, setLastResponse] = useState<string>('');
  const [routerReady, setRouterReady] = useState(false);
  const [routerError, setRouterError] = useState(false);

  // Always call hooks unconditionally
  const router = useRouter();
  const pathname = usePathname();

  // Handle router mounting state
  useEffect(() => {
    try {
      if (router && typeof router.push === 'function') {
        setRouterReady(true);
        setRouterError(false);
      }
    } catch (error) {
      console.warn('[VoiceInterface] Router error:', error);
      setRouterError(true);
      setRouterReady(false);
    }
  }, [router]);

  // Ensure component is mounted before using router
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything until mounted
  if (!mounted) {
    return null;
  }

  // Custom action handlers for app-specific functionality
  const handleCustomNavigation = (path: string) => {
    console.log('[GlobalVoice] Custom navigation to:', path);
    if (router && routerReady && mounted && !routerError) {
      try {
        router.push(path);
      } catch (error) {
        console.warn('[VoiceInterface] Router push failed:', error);
        window.location.href = path;
      }
    } else {
      // Fallback to window.location
      window.location.href = path;
    }
  };

  const handleCustomUIInteraction = (action: string, target: string, parameters?: Record<string, any>) => {
    console.log('[GlobalVoice] Custom UI interaction:', { action, target, parameters });
    
    // Add app-specific UI interactions here
    switch (action) {
      case 'toggle_sidebar':
        // Example: Toggle sidebar
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
        // Example: Toggle chat interface if it exists
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
        console.log('[GlobalVoice] Unhandled UI interaction:', action);
    }
  };

  const handleCustomDataOperation = (action: string, target: string, parameters?: Record<string, any>) => {
    console.log('[GlobalVoice] Custom data operation:', { action, target, parameters });
    
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
      case 'search':
        // Example: Perform search
        if (parameters?.query) {
          const searchInput = document.querySelector('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.value = parameters.query;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            // Trigger form submission if there's a form
            const form = searchInput.closest('form');
            if (form) {
              form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            }
          }
        }
        break;
      default:
        console.log('[GlobalVoice] Unhandled data operation:', action);
    }
  };

  const handleCustomSystemControl = (action: string, parameters?: Record<string, any>) => {
    console.log('[GlobalVoice] Custom system control:', { action, parameters });
    
    // Add app-specific system controls here
    switch (action) {
      case 'toggle_theme':
        // Example: Toggle theme if you have theme switching
        const themeToggle = document.querySelector('[data-theme-toggle]');
        if (themeToggle) {
          (themeToggle as HTMLElement).click();
        }
        break;
      case 'go_home':
        if (router && routerReady && mounted && !routerError) {
          try {
            router.push('/');
          } catch (error) {
            window.location.href = '/';
          }
        } else {
          window.location.href = '/';
        }
        break;
      case 'go_back':
        if (router && routerReady && mounted && !routerError) {
          try {
            router.back();
          } catch (error) {
            window.history.back();
          }
        } else {
          window.history.back();
        }
        break;
      case 'go_forward':
        if (router && routerReady && mounted && !routerError) {
          try {
            router.forward();
          } catch (error) {
            window.history.forward();
          }
        } else {
          window.history.forward();
        }
        break;
      case 'refresh_page':
        window.location.reload();
        break;
      case 'voice_settings':
        if (router && routerReady && mounted && !routerError) {
          try {
            router.push('/settings/voice');
          } catch (error) {
            window.location.href = '/settings/voice';
          }
        } else {
          window.location.href = '/settings/voice';
        }
        break;
      case 'open_debug_tools':
        if (router && routerReady && mounted && !routerError) {
          try {
            router.push('/debug-tools');
          } catch (error) {
            window.location.href = '/debug-tools';
          }
        } else {
          window.location.href = '/debug-tools';
        }
        break;
      case 'open_voice_demo':
        if (router && routerReady && mounted && !routerError) {
          try {
            router.push('/voice-demo');
          } catch (error) {
            window.location.href = '/voice-demo';
          }
        } else {
          window.location.href = '/voice-demo';
        }
        break;
      default:
        console.log('[GlobalVoice] Unhandled system control:', action);
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
    console.log('[GlobalVoice] Voice transcription:', text);
    setLastTranscription(text);
  };

  const handleVoiceResponse = (text: string) => {
    console.log('[GlobalVoice] Voice response:', text);
    setLastResponse(text);
  };

  const handleVoiceStatusChange = (status: string) => {
    console.log('[GlobalVoice] Voice status changed:', status);
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
      console.log('[GlobalVoice] Sending voice message:', event.detail);
    };

    const handleClearChat = () => {
      console.log('[GlobalVoice] Clearing chat via voice command');
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
          currentPage={pathname || (typeof window !== 'undefined' ? window.location.pathname : '/')}
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

      {/* Voice Status Indicator (optional) - Only show when active */}
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