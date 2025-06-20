import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface UICommand {
  action: string;
  target: string;
  parameters?: Record<string, any>;
  context: string;
}

interface UseUIControlOptions {
  clientId: string;
  onCommand?: (command: UICommand) => void;
}

export function useUIControl(options: UseUIControlOptions) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  // Execute UI command
  const executeCommand = useCallback((command: UICommand) => {
    console.log('[UIControl] Executing command:', command);
    
    try {
      switch (command.action) {
        case 'NAVIGATE':
          if (command.parameters?.url) {
            router.push(command.parameters.url);
            console.log('[UIControl] Navigated to:', command.parameters.url);
          }
          break;

        case 'CLICK_BUTTON':
          const button = command.target 
            ? document.getElementById(command.target) || 
              document.querySelector(`button[data-id="${command.target}"]`) ||
              Array.from(document.querySelectorAll('button')).find(btn => 
                btn.textContent?.toLowerCase().includes(command.target.toLowerCase())
              )
            : null;
          
          if (button) {
            (button as HTMLButtonElement).click();
            console.log('[UIControl] Clicked button:', command.target);
          } else {
            console.warn('[UIControl] Button not found:', command.target);
          }
          break;

        case 'FILL_FORM':
          if (command.parameters?.fieldName && command.parameters?.value) {
            const field = document.querySelector(`[name="${command.parameters.fieldName}"]`) ||
                         document.querySelector(`#${command.parameters.fieldName}`) as HTMLInputElement;
            
            if (field) {
              const input = field as HTMLInputElement;
              
              // Set value using React-compatible method
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
              if (nativeInputValueSetter) {
                nativeInputValueSetter.call(input, command.parameters.value);
              } else {
                input.value = command.parameters.value;
              }
              
              // Trigger React events
              const inputEvent = new Event('input', { bubbles: true });
              input.dispatchEvent(inputEvent);
              
              console.log('[UIControl] Filled form field:', command.parameters.fieldName, 'with:', command.parameters.value);
            }
          }
          break;

        case 'SUBMIT_FORM':
          const form = command.target 
            ? document.getElementById(command.target) ||
              document.querySelector(`form[data-id="${command.target}"]`)
            : document.querySelector('form');
          
          if (form) {
            // Try to find and click submit button first
            const submitButton = form.querySelector('button[type="submit"], input[type="submit"]') as HTMLButtonElement;
            if (submitButton && !submitButton.disabled) {
              submitButton.click();
              console.log('[UIControl] Submitted form via button');
            } else {
              // Fallback to form submission
              if (typeof (form as HTMLFormElement).requestSubmit === 'function') {
                (form as HTMLFormElement).requestSubmit();
              } else {
                const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                form.dispatchEvent(submitEvent);
              }
              console.log('[UIControl] Submitted form via event');
            }
          }
          break;

        case 'SCROLL_TO':
          const element = command.target 
            ? document.getElementById(command.target) ||
              document.querySelector(`[data-id="${command.target}"]`)
            : null;
          
          if (element) {
            element.scrollIntoView({ 
              behavior: 'smooth', 
              block: command.parameters?.position || 'center' 
            });
            console.log('[UIControl] Scrolled to element:', command.target);
          }
          break;

        case 'FOCUS_ELEMENT':
          const focusElement = command.target 
            ? document.getElementById(command.target) ||
              document.querySelector(`[name="${command.target}"]`)
            : null;
          
          if (focusElement && 'focus' in focusElement) {
            (focusElement as HTMLElement).focus();
            console.log('[UIControl] Focused element:', command.target);
          }
          break;

        case 'SET_INPUT_VALUE':
          if (command.parameters?.value) {
            // Find the currently focused input or a specific one
            const targetInput = command.target 
              ? document.querySelector(`[name="${command.target}"], #${command.target}`)
              : document.activeElement;
            
            if (targetInput && ('value' in targetInput)) {
              const input = targetInput as HTMLInputElement;
              
              // Set value using React-compatible method
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
              if (nativeInputValueSetter) {
                nativeInputValueSetter.call(input, command.parameters.value);
              } else {
                input.value = command.parameters.value;
              }
              
              // Trigger React events
              const inputEvent = new Event('input', { bubbles: true });
              input.dispatchEvent(inputEvent);
              
              console.log('[UIControl] Set input value:', command.parameters.value);
            }
          }
          break;

        default:
          console.warn('[UIControl] Unknown command action:', command.action);
      }

      // Call custom handler if provided
      if (options.onCommand) {
        options.onCommand(command);
      }
    } catch (error) {
      console.error('[UIControl] Error executing command:', error);
    }
  }, [router, options.onCommand]);

  // Execute voice command via POST request
  const executeVoiceCommand = useCallback(async (commandText: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      console.log('[UIControl] Sending voice command:', commandText);
      
      const response = await fetch(`${apiBaseUrl}/api/voice/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: options.clientId,
          transcript: commandText
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[UIControl] Command response:', result);

      if (result.success && result.uiCommand) {
        const command: UICommand = result.uiCommand;
        console.log('[UIControl] Executing UI command:', command);
        executeCommand(command);
      }

      return result;
    } catch (error) {
      console.error('[UIControl] Command execution failed:', error);
      setError(error instanceof Error ? error.message : 'Command execution failed');
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [options.clientId, apiBaseUrl, executeCommand]);

  return {
    isProcessing,
    error,
    executeVoiceCommand,
    executeCommand
  };
} 