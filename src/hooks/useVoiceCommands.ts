'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

interface VoiceCommand {
  type: string;
  action: string;
  parameters: Record<string, any>;
}

interface VoiceCommandResponse {
  success: boolean;
  message: string;
  action?: string;
  data?: any;
  error?: string;
}

export const useVoiceCommands = () => {
  const router = useRouter();
  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const [lastResponse, setLastResponse] = useState<VoiceCommandResponse | null>(null);

  /**
   * Execute a voice command received from the voice service
   */
  const executeCommand = useCallback(async (command: VoiceCommand): Promise<VoiceCommandResponse> => {
    console.log('Executing voice command:', command);
    setLastCommand(command);

    try {
      const { action, parameters } = command;

      switch (action) {
        case 'NAVIGATE':
          return await handleNavigation(parameters);
        
        case 'CLICK':
          return await handleClick(parameters);
        
        case 'SEARCH':
          return await handleSearch(parameters);
        
        case 'SCROLL':
          return await handleScroll(parameters);
        
        case 'CLOSE':
          return await handleClose(parameters);
        
        case 'MINIMIZE':
          return await handleMinimize(parameters);
        
        case 'MAXIMIZE':
          return await handleMaximize(parameters);
        
        case 'REFRESH':
          return await handleRefresh(parameters);
        
        default:
          const response = {
            success: false,
            message: `Unknown action: ${action}`,
            error: 'UNKNOWN_ACTION'
          };
          setLastResponse(response);
          return response;
      }
    } catch (error) {
      const response = {
        success: false,
        message: 'Failed to execute command',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      setLastResponse(response);
      return response;
    }
  }, [router]);

  /**
   * Handle navigation commands
   */
  const handleNavigation = useCallback(async (parameters: Record<string, any>): Promise<VoiceCommandResponse> => {
    const { url, service } = parameters;
    
    if (url) {
      router.push(url);
      const response = {
        success: true,
        message: `Navigated to ${url}`,
        action: 'NAVIGATE',
        data: { url }
      };
      setLastResponse(response);
      return response;
    }
    
    const response = {
      success: false,
      message: 'Navigation URL not provided',
      error: 'MISSING_URL'
    };
    setLastResponse(response);
    return response;
  }, [router]);

  /**
   * Handle click commands
   */
  const handleClick = useCallback(async (parameters: Record<string, any>): Promise<VoiceCommandResponse> => {
    const { target, selector } = parameters;
    
    if (!target) {
      const response = {
        success: false,
        message: 'Click target not specified',
        error: 'MISSING_TARGET'
      };
      setLastResponse(response);
      return response;
    }

    // Try to find and click the element
    try {
      let element: HTMLElement | null = null;

      // Try different strategies to find the element
      if (selector) {
        element = document.querySelector(selector);
      }
      
      if (!element) {
        // Try finding by data attribute
        element = document.querySelector(`[data-voice-command="${target.toLowerCase()}"]`);
      }
      
      if (!element) {
        // Try finding buttons or links containing the text
        const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
        element = buttons.find(btn => 
          btn.textContent?.toLowerCase().includes(target.toLowerCase())
        ) as HTMLElement | undefined || null;
      }
      
      if (!element) {
        // Try finding by aria-label
        element = document.querySelector(`[aria-label*="${target.toLowerCase()}" i]`);
      }

      if (element) {
        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Wait a bit for scroll to complete
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Click the element
        if (element instanceof HTMLElement) {
          element.click();
        } else if ('click' in element) {
          (element as any).click();
        }
        
        const response = {
          success: true,
          message: `Clicked ${target}`,
          action: 'CLICK',
          data: { target }
        };
        setLastResponse(response);
        return response;
      } else {
        const response = {
          success: false,
          message: `Could not find clickable element: ${target}`,
          error: 'ELEMENT_NOT_FOUND'
        };
        setLastResponse(response);
        return response;
      }
    } catch (error) {
      const response = {
        success: false,
        message: `Error clicking ${target}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: 'CLICK_ERROR'
      };
      setLastResponse(response);
      return response;
    }
  }, []);

  /**
   * Handle search commands
   */
  const handleSearch = useCallback(async (parameters: Record<string, any>): Promise<VoiceCommandResponse> => {
    const { query, focusSearchInput } = parameters;
    
    if (!query) {
      const response = {
        success: false,
        message: 'Search query not provided',
        error: 'MISSING_QUERY'
      };
      setLastResponse(response);
      return response;
    }

    try {
      // Try to find and focus search input
      const searchInputs = document.querySelectorAll('input[type="search"], input[placeholder*="search" i], [role="searchbox"]');
      const searchInput = searchInputs[0] as HTMLInputElement;
      
      if (searchInput) {
        searchInput.focus();
        searchInput.value = query;
        
        // Trigger input events
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Try to submit the search
        const form = searchInput.closest('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true }));
        } else {
          // Try pressing Enter
          searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        }
        
        const response = {
          success: true,
          message: `Searching for "${query}"`,
          action: 'SEARCH',
          data: { query }
        };
        setLastResponse(response);
        return response;
      } else {
        const response = {
          success: false,
          message: 'Search input not found',
          error: 'SEARCH_INPUT_NOT_FOUND'
        };
        setLastResponse(response);
        return response;
      }
    } catch (error) {
      const response = {
        success: false,
        message: `Search error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: 'SEARCH_ERROR'
      };
      setLastResponse(response);
      return response;
    }
  }, []);

  /**
   * Handle scroll commands
   */
  const handleScroll = useCallback(async (parameters: Record<string, any>): Promise<VoiceCommandResponse> => {
    const { direction } = parameters;
    
    try {
      switch (direction?.toLowerCase()) {
        case 'up':
          window.scrollBy({ top: -500, behavior: 'smooth' });
          break;
        case 'down':
          window.scrollBy({ top: 500, behavior: 'smooth' });
          break;
        case 'top':
          window.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 'bottom':
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
          break;
        default:
          const response = {
            success: false,
            message: `Invalid scroll direction: ${direction}`,
            error: 'INVALID_DIRECTION'
          };
          setLastResponse(response);
          return response;
      }
      
      const response = {
        success: true,
        message: `Scrolled ${direction}`,
        action: 'SCROLL',
        data: { direction }
      };
      setLastResponse(response);
      return response;
    } catch (error) {
      const response = {
        success: false,
        message: `Scroll error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: 'SCROLL_ERROR'
      };
      setLastResponse(response);
      return response;
    }
  }, []);

  /**
   * Handle close commands
   */
  const handleClose = useCallback(async (parameters: Record<string, any>): Promise<VoiceCommandResponse> => {
    const { target } = parameters;
    
    try {
      // Try to find and close modals, dialogs, etc.
      const closeSelectors = [
        '[role="dialog"] button[aria-label*="close" i]',
        '[role="dialog"] button[aria-label*="dismiss" i]',
        '.modal button[aria-label*="close" i]',
        '.modal .close',
        'button[data-dismiss="modal"]',
        '[data-voice-command="close"]'
      ];
      
      for (const selector of closeSelectors) {
        const element = document.querySelector(selector) as HTMLElement;
        if (element) {
          element.click();
          const response = {
            success: true,
            message: `Closed ${target || 'modal'}`,
            action: 'CLOSE',
            data: { target }
          };
          setLastResponse(response);
          return response;
        }
      }
      
      // If no close button found, try pressing Escape
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      
      const response = {
        success: true,
        message: 'Pressed Escape to close',
        action: 'CLOSE',
        data: { target }
      };
      setLastResponse(response);
      return response;
    } catch (error) {
      const response = {
        success: false,
        message: `Close error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: 'CLOSE_ERROR'
      };
      setLastResponse(response);
      return response;
    }
  }, []);

  /**
   * Handle minimize commands
   */
  const handleMinimize = useCallback(async (parameters: Record<string, any>): Promise<VoiceCommandResponse> => {
    // For web apps, we can't actually minimize the window, but we can provide feedback
    const response = {
      success: true,
      message: 'Minimize command received (web apps cannot minimize browser windows)',
      action: 'MINIMIZE',
      data: parameters
    };
    setLastResponse(response);
    return response;
  }, []);

  /**
   * Handle maximize commands
   */
  const handleMaximize = useCallback(async (parameters: Record<string, any>): Promise<VoiceCommandResponse> => {
    // For web apps, we can try to request fullscreen
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
        const response = {
          success: true,
          message: 'Entered fullscreen mode',
          action: 'MAXIMIZE',
          data: parameters
        };
        setLastResponse(response);
        return response;
      } else {
        const response = {
          success: false,
          message: 'Fullscreen not supported',
          error: 'FULLSCREEN_NOT_SUPPORTED'
        };
        setLastResponse(response);
        return response;
      }
    } catch (error) {
      const response = {
        success: false,
        message: `Maximize error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: 'MAXIMIZE_ERROR'
      };
      setLastResponse(response);
      return response;
    }
  }, []);

  /**
   * Handle refresh commands
   */
  const handleRefresh = useCallback(async (parameters: Record<string, any>): Promise<VoiceCommandResponse> => {
    window.location.reload();
    const response = {
      success: true,
      message: 'Refreshing page',
      action: 'REFRESH',
      data: parameters
    };
    setLastResponse(response);
    return response;
  }, []);

  return {
    executeCommand,
    isListening,
    setIsListening,
    lastCommand,
    lastResponse,
    // Individual command handlers for direct use
    handleNavigation,
    handleClick,
    handleSearch,
    handleScroll,
    handleClose,
    handleMinimize,
    handleMaximize,
    handleRefresh
  };
};

export default useVoiceCommands; 