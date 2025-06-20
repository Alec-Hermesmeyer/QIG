import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

interface VoiceCommand {
  type: 'ui_command' | 'voice_feedback';
  action?: string;
  target?: string;
  parameters?: any;
  text?: string;
  actionId?: string;
}

export const useVoiceControl = (currentContext: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastCommand, setLastCommand] = useState<VoiceCommand | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Connect to UI control WebSocket
    const ws = new WebSocket('ws://localhost:8080/ws/ui-control');
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('🎮 Voice control connected');
      
      // Send initial UI state
      ws.send(JSON.stringify({
        type: 'ui_state_update',
        currentPage: currentContext,
        focusedElement: document.activeElement?.id || '',
        availableElements: getPageElements()
      }));
    };

    ws.onmessage = (event) => {
      const command: VoiceCommand = JSON.parse(event.data);
      setLastCommand(command);
      
      if (command.type === 'ui_command') {
        executeUICommand(command);
      } else if (command.type === 'voice_feedback') {
        speakText(command.text || '');
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('🎮 Voice control disconnected');
    };

    return () => {
      ws.close();
    };
  }, [currentContext]);

  const executeUICommand = async (command: VoiceCommand) => {
    try {
      switch (command.action) {
        case 'click':
          await handleClick(command.target!);
          break;
        case 'type':
          await handleType(command.target!, command.parameters?.text);
          break;
        case 'focus':
          await handleFocus(command.target!);
          break;
        case 'navigate':
          await handleNavigate(command.target!);
          break;
        case 'scroll':
          await handleScroll(command.target!);
          break;
        case 'clear':
          await handleClear(command.target!);
          break;
      }

      // Send success confirmation
      wsRef.current?.send(JSON.stringify({
        type: 'action_completed',
        actionId: command.actionId,
        result: 'success'
      }));

    } catch (error: unknown) {
      console.error('❌ Voice command failed:', error);
      
      // Send failure notification
      wsRef.current?.send(JSON.stringify({
        type: 'action_failed',
        actionId: command.actionId,
        error: error instanceof Error ? error.message : String(error)
      }));
    }
  };

  const handleClick = async (target: string) => {
    const element = document.getElementById(target) || 
                   document.querySelector(`[data-voice-target="${target}"]`);
    
    if (element) {
      (element as HTMLElement).click();
    } else {
      throw new Error(`Element not found: ${target}`);
    }
  };

  const handleType = async (target: string, text: string) => {
    const element = document.getElementById(target) || 
                   document.querySelector(`[data-voice-target="${target}"]`) as HTMLInputElement;
    
    if (element && 'value' in element) {
      element.value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      throw new Error(`Input element not found: ${target}`);
    }
  };

  const handleFocus = async (target: string) => {
    const element = document.getElementById(target) || 
                   document.querySelector(`[data-voice-target="${target}"]`) as HTMLElement;
    
    if (element) {
      element.focus();
    } else {
      throw new Error(`Element not found: ${target}`);
    }
  };

  const handleNavigate = async (target: string) => {
    router.push(target);
  };

  const handleScroll = async (target: string) => {
    const element = document.getElementById(target) || 
                   document.querySelector(`[data-voice-target="${target}"]`);
    
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    } else {
      throw new Error(`Element not found: ${target}`);
    }
  };

  const handleClear = async (target: string) => {
    const element = document.getElementById(target) || 
                   document.querySelector(`[data-voice-target="${target}"]`) as HTMLInputElement;
    
    if (element && 'value' in element) {
      element.value = '';
      element.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      throw new Error(`Input element not found: ${target}`);
    }
  };

  const getPageElements = () => {
    // Scan page for voice-controllable elements
    const elements = document.querySelectorAll('[data-voice-target], [id]');
    const elementMap: any = {};
    
    elements.forEach(el => {
      const id = el.id || el.getAttribute('data-voice-target');
      if (id) {
        elementMap[id] = {
          tag: el.tagName.toLowerCase(),
          type: el.getAttribute('type'),
          label: el.getAttribute('aria-label') || el.textContent?.slice(0, 50)
        };
      }
    });
    
    return elementMap;
  };

  const speakText = async (text: string) => {
    try {
      const response = await fetch('http://localhost:8080/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      if (response.ok) {
        const audioBlob = await response.blob();
        const audio = new Audio(URL.createObjectURL(audioBlob));
        audio.play();
      }
    } catch (error: unknown) {
      console.error('❌ TTS failed:', error);
      // Fallback to browser speech synthesis
      const utterance = new SpeechSynthesisUtterance(text);
      speechSynthesis.speak(utterance);
    }
  };

  return {
    isConnected,
    lastCommand,
    speakText
  };
}; 