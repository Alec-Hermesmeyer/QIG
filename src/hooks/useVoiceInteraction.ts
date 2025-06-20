import { useState, useEffect, useCallback } from 'react';

interface UseVoiceInteractionOptions {
  clientId: string;
  autoStart?: boolean;
  ttsEnabled?: boolean;
  voiceModel?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
}

interface VoiceState {
  isListening: boolean;
  isProcessing: boolean;
  currentSessionId: string | null;
  lastResponse: string | null;
  error: string | null;
  insights: {
    emotion?: string;
    userIntent?: string;
    predictedNextAction?: string;
    confidence?: number;
  } | null;
}

interface VoiceResponse {
  success: boolean;
  responseText: string;
  type: 'RAG_RESPONSE' | 'COMMAND_RESPONSE' | 'CONTROL' | 'HELP' | 'REPEAT' | 'ERROR';
  insights?: {
    emotion?: string;
    userIntent?: string;
    predictedNextAction?: string;
    confidence?: number;
  };
  audio?: string; // Base64 encoded audio for TTS
}

interface ContextData {
  page?: string;
  title?: string;
  url?: string;
  buttons?: Array<{
    text: string;
    id?: string;
    disabled?: boolean;
  }>;
  links?: Array<{
    text: string;
    href: string;
  }>;
  forms?: Array<{
    id: string;
    action: string;
    method: string;
    fields?: Array<{
      name: string;
      type: string;
      required?: boolean;
      value?: string;
    }>;
  }>;
  dataInfo?: {
    itemCount: number;
    type: string;
  };
  errors?: Record<string, string>;
  isLoading?: boolean;
  activeElement?: string;
  viewport?: {
    scrollTop: number;
    height: number;
  };
}

// Collect comprehensive context for intelligent responses
function collectPageContext(): ContextData {
  try {
    return {
      page: window.location.pathname,
      title: document.title,
      url: window.location.href,
      
      // UI Elements Analysis
      buttons: Array.from(document.querySelectorAll('button')).map(btn => ({
        text: btn.textContent?.trim() || '',
        id: btn.id || undefined,
        disabled: btn.disabled
      })).filter(btn => btn.text), // Only include buttons with text
      
      links: Array.from(document.querySelectorAll('a')).map(link => ({
        text: link.textContent?.trim() || '',
        href: link.href
      })).filter(link => link.text), // Only include links with text
      
      // Form Analysis
      forms: Array.from(document.querySelectorAll('form')).map(form => ({
        id: form.id || `form-${Array.from(document.querySelectorAll('form')).indexOf(form)}`,
        action: form.action,
        method: form.method,
        fields: Array.from(form.querySelectorAll('input, select, textarea')).map(field => ({
          name: (field as HTMLInputElement).name || (field as HTMLInputElement).id || 'unnamed',
          type: (field as HTMLInputElement).type || 'text',
          required: (field as HTMLInputElement).required,
          value: (field as HTMLInputElement).value
        }))
      })),
      
      // Data State
      dataInfo: {
        itemCount: document.querySelectorAll('[data-item]').length || 
                  document.querySelectorAll('tr').length ||
                  document.querySelectorAll('.card').length,
        type: detectDataType()
      },
      
      // Error States
      errors: collectFormErrors(),
      
      // Loading States
      isLoading: document.querySelector('.loading, [data-loading="true"]') !== null,
      
      // User Focus
      activeElement: document.activeElement?.tagName.toLowerCase(),
      
      // Viewport Info
      viewport: {
        scrollTop: window.pageYOffset,
        height: window.innerHeight
      }
    };
  } catch (error) {
    console.error('Error collecting page context:', error);
    return {
      page: window.location.pathname,
      title: document.title,
      url: window.location.href
    };
  }
}

function detectDataType(): string {
  if (document.querySelector('table')) return 'table';
  if (document.querySelector('.card, [class*="card"]')) return 'cards';
  if (document.querySelector('ul, ol')) return 'list';
  return 'content';
}

function collectFormErrors(): Record<string, string> {
  const errors: Record<string, string> = {};
  try {
    document.querySelectorAll('[data-error], .error-message, .invalid-feedback').forEach(errorEl => {
      const fieldName = errorEl.getAttribute('data-field') || 
                       errorEl.previousElementSibling?.getAttribute('name') ||
                       'unknown';
      errors[fieldName] = errorEl.textContent?.trim() || 'Error';
    });
  } catch (error) {
    console.error('Error collecting form errors:', error);
  }
  return errors;
}

export function useVoiceInteraction(options: UseVoiceInteractionOptions) {
  const [state, setState] = useState<VoiceState>({
    isListening: false,
    isProcessing: false,
    currentSessionId: null,
    lastResponse: null,
    error: null,
    insights: null
  });

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  // Start voice session
  const startSession = useCallback(async () => {
    try {
      console.log('[VoiceInteraction] Starting session...');
      
      const response = await fetch(`${apiBaseUrl}/api/voice-interaction/sessions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: options.clientId,
          config: {
            ttsEnabled: options.ttsEnabled ?? true,
            voiceModel: options.voiceModel ?? 'alloy'
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('[VoiceInteraction] Session start response:', result);
      
      if (result.success && result.sessionId) {
        setState(prev => ({
          ...prev,
          currentSessionId: result.sessionId,
          error: null
        }));
        console.log('[VoiceInteraction] Session started:', result.sessionId);
      } else {
        throw new Error(result.message || `Backend error: success=${result.success}, sessionId=${result.sessionId}`);
      }
      
      return result.sessionId;
    } catch (error) {
      console.error('[VoiceInteraction] Session start error:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to start voice session'
      }));
      throw error;
    }
  }, [options.clientId, options.ttsEnabled, options.voiceModel, apiBaseUrl]);

  // Process voice input
  const processInput = useCallback(async (transcript: string): Promise<VoiceResponse> => {
    if (!state.currentSessionId) {
      throw new Error('No active voice session');
    }

    setState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      console.log('[VoiceInteraction] Processing input:', transcript);
      
      const contextData = collectPageContext();
      console.log('[VoiceInteraction] Context data:', contextData);
      
      const response = await fetch(
        `${apiBaseUrl}/api/voice-interaction/sessions/${state.currentSessionId}/input`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript,
            currentContext: window.location.pathname,
            contextData
          })
        }
      );

      const result: VoiceResponse = await response.json();
      console.log('[VoiceInteraction] Response received:', result);

      setState(prev => ({
        ...prev,
        isProcessing: false,
        lastResponse: result.responseText,
        insights: result.insights || null,
        error: result.success ? null : result.responseText
      }));

      // Log enhanced intelligence insights
      if (result.insights) {
        console.log('🧠 Voice Intelligence:', {
          emotion: result.insights.emotion,
          intent: result.insights.userIntent,
          prediction: result.insights.predictedNextAction,
          confidence: result.insights.confidence
        });
      }

      return result;
    } catch (error) {
      console.error('[VoiceInteraction] Processing error:', error);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: 'Failed to process voice input'
      }));
      throw error;
    }
  }, [state.currentSessionId, apiBaseUrl]);

  // End session
  const endSession = useCallback(async () => {
    if (!state.currentSessionId) return;

    try {
      console.log('[VoiceInteraction] Ending session:', state.currentSessionId);
      
      await fetch(`${apiBaseUrl}/api/voice-interaction/sessions/${state.currentSessionId}/end`, {
        method: 'POST'
      });
      
      setState(prev => ({
        ...prev,
        currentSessionId: null,
        lastResponse: null,
        insights: null,
        error: null
      }));
    } catch (error) {
      console.error('[VoiceInteraction] Failed to end session:', error);
    }
  }, [state.currentSessionId, apiBaseUrl]);

  // Auto-start session
  useEffect(() => {
    if (options.autoStart && !state.currentSessionId) {
      startSession().catch(console.error);
    }
  }, [options.autoStart, state.currentSessionId, startSession]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.currentSessionId) {
        endSession();
      }
    };
  }, []);

  return {
    ...state,
    startSession,
    processInput,
    endSession
  };
} 