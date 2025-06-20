import { useRouter } from 'next/router';
import { useCallback } from 'react';

interface ActionCommand {
  type: 'navigation' | 'ui_interaction' | 'data_operation' | 'system_control' | 'conversation';
  action: string;
  parameters?: Record<string, any>;
  target?: string;
  confirmation_required?: boolean;
}

interface UseVoiceActionHandlerProps {
  onNavigate?: (path: string) => void;
  onUIInteraction?: (action: string, target: string, parameters?: Record<string, any>) => void;
  onDataOperation?: (action: string, target: string, parameters?: Record<string, any>) => void;
  onSystemControl?: (action: string, parameters?: Record<string, any>) => void;
  onCustomAction?: (action: ActionCommand) => void;
}

export const useVoiceActionHandler = ({
  onNavigate,
  onUIInteraction,
  onDataOperation,
  onSystemControl,
  onCustomAction
}: UseVoiceActionHandlerProps = {}) => {
  const router = useRouter();

  const handleNavigationAction = useCallback((action: ActionCommand) => {
    console.log('[Voice] Executing navigation action:', action);
    
    switch (action.action) {
      case 'navigate':
        if (action.target) {
          onNavigate?.(action.target) || router.push(action.target);
        }
        break;
      case 'back':
        router.back();
        break;
      case 'forward':
        router.forward();
        break;
      case 'refresh':
        router.reload();
        break;
      case 'home':
        router.push('/');
        break;
      case 'dashboard':
        router.push('/dashboard');
        break;
      case 'profile':
        router.push('/profile');
        break;
      case 'settings':
        router.push('/settings');
        break;
      default:
        console.warn('[Voice] Unknown navigation action:', action.action);
    }
  }, [router, onNavigate]);

  const handleUIInteraction = useCallback((action: ActionCommand) => {
    console.log('[Voice] Executing UI interaction:', action);
    
    switch (action.action) {
      case 'click':
        if (action.target) {
          const element = document.querySelector(action.target);
          if (element) {
            (element as HTMLElement).click();
          } else {
            console.warn('[Voice] Element not found:', action.target);
          }
        }
        break;
      case 'scroll':
        const direction = action.parameters?.direction || 'down';
        const amount = action.parameters?.amount || 300;
        window.scrollBy(0, direction === 'down' ? amount : -amount);
        break;
      case 'focus':
        if (action.target) {
          const element = document.querySelector(action.target);
          if (element) {
            (element as HTMLElement).focus();
          }
        }
        break;
      case 'toggle':
        if (action.target) {
          // Handle common toggle scenarios
          const element = document.querySelector(action.target);
          if (element) {
            const isHidden = element.classList.contains('hidden') || 
                           getComputedStyle(element).display === 'none';
            if (isHidden) {
              element.classList.remove('hidden');
              (element as HTMLElement).style.display = '';
            } else {
              element.classList.add('hidden');
            }
          }
        }
        break;
      case 'open_modal':
        // Trigger modal opening - this would depend on your modal system
        if (action.target) {
          const event = new CustomEvent('openModal', { detail: action.target });
          window.dispatchEvent(event);
        }
        break;
      case 'close_modal':
        // Trigger modal closing
        const event = new CustomEvent('closeModal');
        window.dispatchEvent(event);
        break;
      case 'sidebar_toggle':
        // Toggle sidebar - common pattern
        const sidebar = document.querySelector('[data-sidebar]');
        if (sidebar) {
          sidebar.classList.toggle('hidden');
        }
        break;
      default:
        onUIInteraction?.(action.action, action.target || '', action.parameters);
    }
  }, [onUIInteraction]);

  const handleDataOperation = useCallback((action: ActionCommand) => {
    console.log('[Voice] Executing data operation:', action);
    
    switch (action.action) {
      case 'search':
        const query = action.parameters?.query || action.target;
        if (query) {
          // Try to find and fill search input
          const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i]') as HTMLInputElement;
          if (searchInput) {
            searchInput.value = query;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            searchInput.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Try to submit the search
            const form = searchInput.closest('form');
            if (form) {
              form.dispatchEvent(new Event('submit', { bubbles: true }));
            }
          }
        }
        break;
      case 'filter':
        // Handle filtering - this would depend on your filter implementation
        console.log('[Voice] Filter action:', action.parameters);
        break;
      case 'sort':
        // Handle sorting
        console.log('[Voice] Sort action:', action.parameters);
        break;
      default:
        onDataOperation?.(action.action, action.target || '', action.parameters);
    }
  }, [onDataOperation]);

  const handleSystemControl = useCallback((action: ActionCommand) => {
    console.log('[Voice] Executing system control:', action);
    
    switch (action.action) {
      case 'theme_toggle':
        // Toggle theme - common pattern
        const html = document.documentElement;
        if (html.classList.contains('dark')) {
          html.classList.remove('dark');
          localStorage.setItem('theme', 'light');
        } else {
          html.classList.add('dark');
          localStorage.setItem('theme', 'dark');
        }
        break;
      case 'fullscreen_toggle':
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
        break;
      case 'logout':
        // Trigger logout - this would depend on your auth system
        const logoutEvent = new CustomEvent('logout');
        window.dispatchEvent(logoutEvent);
        break;
      default:
        onSystemControl?.(action.action, action.parameters);
    }
  }, [onSystemControl]);

  const handleAction = useCallback(async (action: ActionCommand) => {
    console.log('[Voice] Processing action:', action);
    
    // Handle confirmation if required
    if (action.confirmation_required) {
      const confirmed = window.confirm(
        `Are you sure you want to ${action.action}${action.target ? ` ${action.target}` : ''}?`
      );
      if (!confirmed) {
        console.log('[Voice] Action cancelled by user');
        return;
      }
    }

    try {
      switch (action.type) {
        case 'navigation':
          handleNavigationAction(action);
          break;
        case 'ui_interaction':
          handleUIInteraction(action);
          break;
        case 'data_operation':
          handleDataOperation(action);
          break;
        case 'system_control':
          handleSystemControl(action);
          break;
        case 'conversation':
          // Pure conversation, no action needed
          console.log('[Voice] Conversation action (no execution needed)');
          break;
        default:
          console.warn('[Voice] Unknown action type:', action.type);
          onCustomAction?.(action);
      }
    } catch (error) {
      console.error('[Voice] Error executing action:', error);
    }
  }, [handleNavigationAction, handleUIInteraction, handleDataOperation, handleSystemControl, onCustomAction]);

  // Utility functions for common operations
  const triggerSearch = useCallback((query: string) => {
    handleAction({
      type: 'data_operation',
      action: 'search',
      parameters: { query }
    });
  }, [handleAction]);

  const navigateTo = useCallback((path: string) => {
    handleAction({
      type: 'navigation',
      action: 'navigate',
      target: path
    });
  }, [handleAction]);

  const clickElement = useCallback((selector: string) => {
    handleAction({
      type: 'ui_interaction',
      action: 'click',
      target: selector
    });
  }, [handleAction]);

  const toggleTheme = useCallback(() => {
    handleAction({
      type: 'system_control',
      action: 'theme_toggle'
    });
  }, [handleAction]);

  return {
    handleAction,
    triggerSearch,
    navigateTo,
    clickElement,
    toggleTheme
  };
}; 