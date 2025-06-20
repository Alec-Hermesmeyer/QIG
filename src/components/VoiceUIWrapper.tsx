'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Simple configuration for backend UI control endpoints
const BACKEND_UI_CONTROL_WS_URL = process.env.NEXT_PUBLIC_BACKEND_UI_CONTROL_WS_URL || 'ws://localhost:8080/ws/ui-control';
const BACKEND_UI_COMMAND_URL = process.env.NEXT_PUBLIC_BACKEND_UI_COMMAND_URL || 'http://localhost:8080/api/voice/command';

interface UICommand {
  type: 'navigation' | 'action' | 'scroll' | 'click' | 'form' | 'search';
  action: string;
  target?: string;
  data?: any;
}

interface VoiceUIWrapperProps {
  children: React.ReactNode;
  enabled?: boolean;
  debugMode?: boolean;
}

export const VoiceUIWrapper: React.FC<VoiceUIWrapperProps> = ({
  children,
  enabled = true,
  debugMode = process.env.NODE_ENV === 'development'
}) => {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastCommand, setLastCommand] = useState<string>('');
  
  const wsRef = useRef<WebSocket | null>(null);

  const log = useCallback((message: string, data?: any) => {
    if (debugMode) {
      console.log(`[VoiceUI] ${message}`, data || '');
    }
  }, [debugMode]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!enabled || wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      log('Connecting to voice UI control WebSocket...');
      const ws = new WebSocket(BACKEND_UI_CONTROL_WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        log('Voice UI control connected');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const command: UICommand = JSON.parse(event.data);
          log('Received UI command:', command);
          executeCommand(command);
        } catch (error) {
          console.error('[VoiceUI] Error parsing command:', error);
        }
      };

      ws.onclose = () => {
        log('Voice UI control disconnected');
        setIsConnected(false);
      };

      ws.onerror = (error) => {
        console.error('[VoiceUI] WebSocket error:', error);
      };

    } catch (error) {
      console.error('[VoiceUI] Error creating WebSocket:', error);
    }
  }, [enabled, log]);

  // Execute UI commands
  const executeCommand = useCallback(async (command: UICommand) => {
    setIsProcessing(true);
    setLastCommand(`${command.type}:${command.action}`);
    
    try {
      switch (command.type) {
        case 'navigation':
          if (command.action === 'navigate_to' && command.target) {
            router.push(command.target);
          } else if (command.action === 'go_back') {
            router.back();
          } else if (command.action === 'refresh') {
            window.location.reload();
          }
          break;
          
        case 'scroll':
          if (command.action === 'scroll_up') {
            window.scrollBy(0, -300);
          } else if (command.action === 'scroll_down') {
            window.scrollBy(0, 300);
          } else if (command.action === 'scroll_to_top') {
            window.scrollTo(0, 0);
          }
          break;
          
        case 'click':
          if (command.target) {
            const element = document.querySelector(command.target);
            if (element) {
              (element as HTMLElement).click();
            }
          } else if (command.data?.text) {
            const elements = Array.from(document.querySelectorAll('button, a, [role="button"]'));
            const targetElement = elements.find(el => 
              el.textContent?.toLowerCase().includes(command.data.text.toLowerCase())
            );
            if (targetElement) {
              (targetElement as HTMLElement).click();
            }
          }
          break;
          
        default:
          log('Unknown command type:', command.type);
      }
      
      log('Command executed:', command);
    } catch (error) {
      console.error('[VoiceUI] Error executing command:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [router, log]);

  // Process voice command
  const processVoiceCommand = useCallback(async (text: string) => {
    if (!enabled || !text.trim()) return false;

    try {
      setIsProcessing(true);
      log('Processing voice command:', text);

      // Generate a unique client ID for this session
      const clientId = `web-client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const response = await fetch(BACKEND_UI_COMMAND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          transcript: text, 
          currentContext: 'general',
          clientId: clientId
        })
      });

      if (response.ok) {
        const result = await response.json();
        log('Voice command processed:', result);
        return result.success || false;
      }
    } catch (error) {
      console.error('[VoiceUI] Error processing voice command:', error);
    } finally {
      setIsProcessing(false);
    }

    return false;
  }, [enabled, log]);

  // Auto-connect
  useEffect(() => {
    if (enabled) {
      connect();
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [enabled, connect]);

  // Expose global handler for integration with chat
  useEffect(() => {
    if (enabled) {
      (window as any).processVoiceUICommand = processVoiceCommand;
    }
    
    return () => {
      delete (window as any).processVoiceUICommand;
    };
  }, [enabled, processVoiceCommand]);

  return (
    <>
      {children}
      
      {/* Debug indicator */}
      {debugMode && enabled && (
        <div className="fixed top-4 right-4 bg-purple-600 text-white px-3 py-1 rounded-full text-sm z-50">
          🎮 {isConnected ? '🟢' : '🔴'} 
          {isProcessing && ' ⏳'}
          {lastCommand && <span className="ml-2 text-xs">{lastCommand}</span>}
        </div>
      )}
    </>
  );
}; 