import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Configuration for backend UI control endpoints
const BACKEND_UI_CONTROL_WS_URL = process.env.NEXT_PUBLIC_BACKEND_UI_CONTROL_WS_URL || 'ws://localhost:8080/ws/ui-control';
const BACKEND_UI_COMMAND_URL = process.env.NEXT_PUBLIC_BACKEND_UI_COMMAND_URL || 'http://localhost:8080/api/voice/command';
const BACKEND_UI_ACTIONS_URL = process.env.NEXT_PUBLIC_BACKEND_UI_ACTIONS_URL || 'http://localhost:8080/api/voice/actions';
const BACKEND_UI_CONTEXT_URL = process.env.NEXT_PUBLIC_BACKEND_UI_CONTEXT_URL || 'http://localhost:8080/api/ui/context';

// Types for UI commands
interface UICommand {
  type: 'navigation' | 'action' | 'scroll' | 'click' | 'form' | 'search';
  action: string;
  target?: string;
  data?: any;
  context?: string;
}

interface UIState {
  currentPage: string;
  availableActions: string[];
  elements: {
    buttons: string[];
    links: string[];
    forms: string[];
    inputs: string[];
  };
}

interface VoiceUIControlConfig {
  autoConnect?: boolean;
  enableContextUpdates?: boolean;
  debugMode?: boolean;
}

export const useVoiceUIControl = (config: VoiceUIControlConfig = {}) => {
  const {
    autoConnect = true,
    enableContextUpdates = true,
    debugMode = process.env.NODE_ENV === 'development'
  } = config;

  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCommand, setLastCommand] = useState<UICommand | null>(null);
  const [currentContext, setCurrentContext] = useState<string>('general');
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Debug logging
  const log = useCallback((message: string, data?: any) => {
    if (debugMode) {
      console.log(`[VoiceUIControl] ${message}`, data || '');
    }
  }, [debugMode]);

  // Connect to the UI control WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      log('Already connected to UI control WebSocket');
      return;
    }

    try {
      log('Connecting to UI control WebSocket...');
      const ws = new WebSocket(BACKEND_UI_CONTROL_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        log('UI control WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        // Send initial context
        if (enableContextUpdates) {
          updateUIContext();
        }
      };

      ws.onmessage = (event) => {
        try {
          const command: UICommand = JSON.parse(event.data);
          log('Received UI command:', command);
          setLastCommand(command);
          executeUICommand(command);
        } catch (error) {
          console.error('[VoiceUIControl] Error parsing command:', error);
        }
      };

      ws.onclose = (event) => {
        log(`UI control WebSocket closed: ${event.code} - ${event.reason}`);
        setIsConnected(false);
        
        // Attempt to reconnect if it wasn't a clean close
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 10000);
          log(`Attempting to reconnect in ${delay}ms...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('[VoiceUIControl] WebSocket error:', error);
      };

    } catch (error) {
      console.error('[VoiceUIControl] Error creating WebSocket connection:', error);
    }
  }, [enableContextUpdates, log]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    log('Disconnected from UI control WebSocket');
  }, [log]);

  // Execute UI commands received from the backend
  const executeUICommand = useCallback(async (command: UICommand) => {
    setIsProcessing(true);
    log('Executing UI command:', command);

    try {
      switch (command.type) {
        case 'navigation':
          await handleNavigation(command);
          break;
        case 'action':
          await handleAction(command);
          break;
        case 'scroll':
          await handleScroll(command);
          break;
        case 'click':
          await handleClick(command);
          break;
        case 'form':
          await handleForm(command);
          break;
        case 'search':
          await handleSearch(command);
          break;
        default:
          log('Unknown command type:', command.type);
      }
    } catch (error) {
      console.error('[VoiceUIControl] Error executing command:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [log]);

  // Handle navigation commands
  const handleNavigation = useCallback(async (command: UICommand) => {
    const { action, target } = command;
    
    switch (action) {
      case 'navigate_to':
        if (target) {
          log('Navigating to:', target);
          router.push(target);
        }
        break;
      case 'go_back':
        log('Going back');
        router.back();
        break;
      case 'go_forward':
        log('Going forward');
        router.forward();
        break;
      case 'refresh':
        log('Refreshing page');
        window.location.reload();
        break;
      default:
        log('Unknown navigation action:', action);
    }
  }, [router, log]);

  // Handle general actions
  const handleAction = useCallback(async (command: UICommand) => {
    const { action, target, data } = command;
    
    switch (action) {
      case 'open_menu':
        // Find and click menu button
        const menuButton = document.querySelector('[data-testid="menu-button"], .menu-button, [aria-label*="menu" i]');
        if (menuButton) {
          (menuButton as HTMLElement).click();
          log('Opened menu');
        }
        break;
      case 'close_modal':
        // Find and click close button or overlay
        const closeButton = document.querySelector('[data-testid="close-button"], .close-button, [aria-label*="close" i]');
        if (closeButton) {
          (closeButton as HTMLElement).click();
          log('Closed modal');
        }
        break;
      case 'submit_form':
        // Find and submit form
        const form = target ? document.querySelector(target) : document.querySelector('form');
        if (form) {
          (form as HTMLFormElement).submit();
          log('Submitted form');
        }
        break;
      case 'toggle_theme':
        // Find theme toggle button
        const themeButton = document.querySelector('[data-testid="theme-toggle"], .theme-toggle');
        if (themeButton) {
          (themeButton as HTMLElement).click();
          log('Toggled theme');
        }
        break;
      default:
        log('Unknown action:', action);
    }
  }, [log]);

  // Handle scroll commands
  const handleScroll = useCallback(async (command: UICommand) => {
    const { action, data } = command;
    
    switch (action) {
      case 'scroll_up':
        window.scrollBy(0, -(data?.amount || 300));
        log('Scrolled up');
        break;
      case 'scroll_down':
        window.scrollBy(0, data?.amount || 300);
        log('Scrolled down');
        break;
      case 'scroll_to_top':
        window.scrollTo(0, 0);
        log('Scrolled to top');
        break;
      case 'scroll_to_bottom':
        window.scrollTo(0, document.body.scrollHeight);
        log('Scrolled to bottom');
        break;
      default:
        log('Unknown scroll action:', action);
    }
  }, [log]);

  // Handle click commands
  const handleClick = useCallback(async (command: UICommand) => {
    const { target, data } = command;
    
    if (target) {
      const element = document.querySelector(target);
      if (element) {
        (element as HTMLElement).click();
        log('Clicked element:', target);
      } else {
        log('Element not found:', target);
      }
    } else if (data?.text) {
      // Try to find element by text content
      const elements = Array.from(document.querySelectorAll('button, a, [role="button"]'));
      const targetElement = elements.find(el => 
        el.textContent?.toLowerCase().includes(data.text.toLowerCase())
      );
      
      if (targetElement) {
        (targetElement as HTMLElement).click();
        log('Clicked element by text:', data.text);
      } else {
        log('Element not found by text:', data.text);
      }
    }
  }, [log]);

  // Handle form commands
  const handleForm = useCallback(async (command: UICommand) => {
    const { action, target, data } = command;
    
    switch (action) {
      case 'fill_input':
        if (target && data?.value) {
          const input = document.querySelector(target) as HTMLInputElement;
          if (input) {
            input.value = data.value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            log('Filled input:', target, 'with value:', data.value);
          }
        }
        break;
      case 'select_option':
        if (target && data?.value) {
          const select = document.querySelector(target) as HTMLSelectElement;
          if (select) {
            select.value = data.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            log('Selected option:', data.value);
          }
        }
        break;
      case 'check_checkbox':
        if (target) {
          const checkbox = document.querySelector(target) as HTMLInputElement;
          if (checkbox && checkbox.type === 'checkbox') {
            checkbox.checked = data?.checked !== false;
            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
            log('Toggled checkbox:', target);
          }
        }
        break;
      default:
        log('Unknown form action:', action);
    }
  }, [log]);

  // Handle search commands
  const handleSearch = useCallback(async (command: UICommand) => {
    const { data } = command;
    
    if (data?.query) {
      // Find search input
      const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i], [data-testid="search-input"]') as HTMLInputElement;
      
      if (searchInput) {
        searchInput.value = data.query;
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Try to submit the search
        const searchForm = searchInput.closest('form');
        if (searchForm) {
          searchForm.submit();
        } else {
          // Look for search button
          const searchButton = document.querySelector('button[type="submit"], [data-testid="search-button"], .search-button');
          if (searchButton) {
            (searchButton as HTMLElement).click();
          }
        }
        
        log('Performed search:', data.query);
      }
    }
  }, [log]);

  // Send voice command to backend for processing
  const processVoiceCommand = useCallback(async (text: string, context?: string) => {
    try {
      log('Processing voice command:', text);
      setIsProcessing(true);

      // Generate a unique client ID for this session
      const clientId = `web-client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const response = await fetch(BACKEND_UI_COMMAND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: text,
          currentContext: context || currentContext,
          clientId: clientId
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to process command: ${response.status}`);
      }

      const result = await response.json();
      log('Command processing result:', result);
      
      return result;
    } catch (error) {
      console.error('[VoiceUIControl] Error processing voice command:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [currentContext, log]);

  // Get available actions for current context
  const getAvailableActions = useCallback(async (context?: string) => {
    // For now, just return empty array since /api/voice/actions is optional
    log('Available actions: (disabled - using only /api/voice/command)');
    setAvailableActions([]);
      return [];
  }, [log]);

  // Update UI context information (disabled - only using /api/voice/command)
  const updateUIContext = useCallback(async (context?: string) => {
    // Just update the local context without calling the API
      const contextToSend = context || currentContext;
        setCurrentContext(contextToSend);
    log('Updated local context (API call disabled):', contextToSend);
  }, [currentContext, log]);

  // Send UI state update via WebSocket
  const sendUIStateUpdate = useCallback((state: Partial<UIState>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'ui_state_update',
        data: state
      }));
      log('Sent UI state update:', state);
    }
  }, [log]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Update context when page changes
  useEffect(() => {
    if (enableContextUpdates && isConnected) {
      const timer = setTimeout(() => {
        updateUIContext();
      }, 1000); // Small delay to ensure page is loaded

      return () => clearTimeout(timer);
    }
  }, [window.location.pathname, isConnected, enableContextUpdates, updateUIContext]);

  return {
    // Connection state
    isConnected,
    isProcessing,
    lastCommand,
    currentContext,
    availableActions,
    
    // Connection methods
    connect,
    disconnect,
    
    // Command processing
    processVoiceCommand,
    executeUICommand,
    
    // Context management
    updateUIContext,
    getAvailableActions,
    setCurrentContext,
    
    // WebSocket communication
    sendUIStateUpdate,
    
    // Utils
    log
  };
}; 