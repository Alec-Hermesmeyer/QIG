'use client';

import React, { useState, useEffect } from 'react';
import { useVoiceUIControl } from '../hooks/useVoiceUIControl';

interface VoiceUIControlPanelProps {
  isVisible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'bottom-center';
  className?: string;
}

export const VoiceUIControlPanel: React.FC<VoiceUIControlPanelProps> = ({
  isVisible = true,
  position = 'bottom-center',
  className = ''
}) => {
  const [testCommand, setTestCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    isConnected,
    isProcessing,
    lastCommand,
    currentContext,
    availableActions,
    connect,
    disconnect,
    processVoiceCommand,
    updateUIContext,
    getAvailableActions,
    setCurrentContext,
    log
  } = useVoiceUIControl({ 
    autoConnect: false, 
    enableContextUpdates: false, 
    debugMode: true 
  });

  // Expose a simple processVoiceCommand globally so chat component can use it
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).processVoiceUICommand = async (text: string) => {
        try {
          console.log('🎯 [VoiceUI] Processing command via existing chat system:', text);
          
          // Simple direct API call - no WebSocket conflicts
          const clientId = `web-client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          const response = await fetch('http://localhost:8080/api/voice/command', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transcript: text,
              currentContext: currentContext || 'general',
              clientId: clientId
            })
          });

          if (response.ok) {
            const result = await response.json();
            console.log('🎯 [VoiceUI] Command result:', result);
            setCommandHistory(prev => [...prev.slice(-4), text]); // Keep last 5
            return result;
          } else {
            console.error('🎯 [VoiceUI] Command failed:', response.status);
          }
        } catch (error) {
          console.error('🎯 [VoiceUI] Command error:', error);
        }
      };
      console.log('🌐 Simplified voice UI command handler registered');
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).processVoiceUICommand;
      }
    };
  }, [currentContext]);

  // Handle manual command testing
  const handleTestCommand = async () => {
    if (!testCommand.trim()) return;
    
    try {
      console.log('🎯 Testing command:', testCommand);
      setCommandHistory(prev => [...prev, testCommand]);
      
      const result = await processVoiceCommand(testCommand);
      console.log('🎯 Command result:', result);
      
      setTestCommand('');
    } catch (error) {
      console.error('🚨 Test command failed:', error);
    }
  };

  // Clear command history
  const clearHistory = () => {
    setCommandHistory([]);
  };

  // Test direct API call
  const testDirectAPI = async () => {
    try {
      console.log('🔧 Testing direct API call...');
      
      const response = await fetch('http://localhost:8080/api/voice/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: 'test command',
          currentContext: 'general',
          clientId: 'test-direct-123'
        })
      });
      
      console.log('🔧 Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('🔧 Direct API result:', result);
        alert(`Direct API Success: ${JSON.stringify(result)}`);
      } else {
        console.error('🔧 API call failed:', response.status);
        alert(`API call failed: ${response.status}`);
      }
    } catch (error) {
      console.error('🔧 Direct API error:', error);
      alert(`API error: ${error}`);
    }
  };

  // Position styles
  const positionStyles = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-center': 'bottom-20 left-1/2 transform -translate-x-1/2'
  };

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed ${positionStyles[position]} z-50 ${className}`}
      style={{ maxWidth: '400px' }}
    >
      {/* Control Panel */}
      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
        {/* Header */}
        <div 
          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-t-lg cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <h3 className="font-semibold text-sm">Voice UI Control</h3>
            {isProcessing && (
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          <button className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            {isExpanded ? '−' : '+'}
          </button>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="p-4 space-y-4">
            {/* Status Section */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Status</h4>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Connection:</span>
                  <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Processing:</span>
                  <span className={isProcessing ? 'text-yellow-600' : 'text-gray-600'}>
                    {isProcessing ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Context:</span>
                  <span className="text-blue-600">{currentContext}</span>
                </div>
              </div>
            </div>

            {/* Connection Controls */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Connection</h4>
              <div className="flex space-x-2">
                <button
                  onClick={connect}
                  disabled={isConnected}
                  className="px-3 py-1 bg-green-500 text-white rounded text-xs disabled:bg-gray-400"
                >
                  Connect
                </button>
                <button
                  onClick={disconnect}
                  disabled={!isConnected}
                  className="px-3 py-1 bg-red-500 text-white rounded text-xs disabled:bg-gray-400"
                >
                  Disconnect
                </button>
              </div>
            </div>

            {/* Context Controls */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Context</h4>
              <div className="flex space-x-2">
                <select
                  value={currentContext}
                  onChange={(e) => setCurrentContext(e.target.value)}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                >
                  <option value="general">General</option>
                  <option value="dashboard">Dashboard</option>
                  <option value="settings">Settings</option>
                  <option value="chat">Chat</option>
                </select>
                <button
                  onClick={() => updateUIContext()}
                  className="px-3 py-1 bg-blue-500 text-white rounded text-xs"
                >
                  Update
                </button>
              </div>
            </div>

            {/* Debug Test */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Debug</h4>
              <button
                onClick={testDirectAPI}
                className="w-full px-3 py-2 bg-orange-500 text-white rounded text-xs hover:bg-orange-600"
              >
                🔧 Test Direct API Call
              </button>
            </div>

            {/* Test Commands */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Test Commands</h4>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={testCommand}
                  onChange={(e) => setTestCommand(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleTestCommand()}
                  placeholder="Enter voice command..."
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                />
                <button
                  onClick={handleTestCommand}
                  disabled={!testCommand.trim() || isProcessing}
                  className="px-3 py-1 bg-purple-500 text-white rounded text-xs disabled:bg-gray-400"
                >
                  Test
                </button>
              </div>
              
              {/* Quick Test Commands */}
              <div className="flex flex-wrap gap-1">
                {[
                  'go to dashboard',
                  'navigate to settings', 
                  'scroll down',
                  'click search',
                  'open menu'
                ].map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => setTestCommand(cmd)}
                    className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-300"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>

            {/* Info */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Mode</h4>
              <div className="text-xs bg-blue-50 dark:bg-blue-900 p-2 rounded">
                <div className="text-blue-800 dark:text-blue-200">
                  <strong>🎯 Voice UI Command Handler</strong>
                </div>
                <div className="text-blue-600 dark:text-blue-300 mt-1">
                  Works with existing chat voice recognition
              </div>
                <div className="text-green-600 dark:text-green-300 mt-1">
                  ✅ Ready to process voice commands from chat
                      </div>
                <div className="text-orange-600 dark:text-orange-300 mt-1">
                  📍 Go to chat page and use voice recording for UI commands
                  </div>
              </div>
            </div>

            {/* Last Command */}
            {lastCommand && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Last Command</h4>
                <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs">
                  <div><strong>Type:</strong> {lastCommand.type}</div>
                  <div><strong>Action:</strong> {lastCommand.action}</div>
                  {lastCommand.target && <div><strong>Target:</strong> {lastCommand.target}</div>}
                  {lastCommand.data && <div><strong>Data:</strong> {JSON.stringify(lastCommand.data)}</div>}
                </div>
              </div>
            )}

            {/* Command History */}
            {commandHistory.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-sm">Command History</h4>
                  <button
                    onClick={clearHistory}
                    className="px-2 py-1 bg-gray-500 text-white rounded text-xs"
                  >
                    Clear
                  </button>
                </div>
                <div className="max-h-16 overflow-y-auto text-xs space-y-1">
                  {commandHistory.slice(-5).map((cmd, index) => (
                    <div key={index} className="text-gray-600 dark:text-gray-400">
                      • {cmd}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 