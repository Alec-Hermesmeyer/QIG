'use client';

import React, { useState } from 'react';
// Using div instead of Card for simplicity
import VoiceButton from './VoiceButton';
import { VoiceChat } from './VoiceChatComponent';
import { useVoiceCommands } from '@/hooks/useVoiceCommands';

export const VoiceIntegrationExample: React.FC = () => {
  const [transcript, setTranscript] = useState<string>('');
  const [lastCommand, setLastCommand] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatHistory, setChatHistory] = useState<string[]>([]);

  const { executeCommand, lastResponse } = useVoiceCommands();

  // Handle chat messages (example implementation)
  const handleSendMessage = async (message: string): Promise<string> => {
    setIsProcessing(true);
    setChatHistory(prev => [...prev, `You: ${message}`]);
    
    try {
      // Simulate API call to your chat service
      // In reality, this would call your existing chat API
      const response = await new Promise<string>((resolve) => {
        setTimeout(() => {
          resolve(`I received your message: "${message}". This is a simulated response.`);
        }, 1000);
      });
      
      setChatHistory(prev => [...prev, `Assistant: ${response}`]);
      return response;
    } catch (error) {
      const errorMsg = 'Sorry, I encountered an error processing your message.';
      setChatHistory(prev => [...prev, `Assistant: ${errorMsg}`]);
      return errorMsg;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTranscript = (text: string) => {
    setTranscript(text);
  };

  const handleCommand = (command: any) => {
    setLastCommand(command);
    executeCommand(command);
  };

  const handleError = (error: string) => {
    console.error('Voice error:', error);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Voice Integration Examples</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Voice Button Examples */}
        <div className="p-6 bg-white rounded-lg border shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Voice Button Components</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Simple Voice Button</h3>
              <VoiceButton
                onTranscript={handleTranscript}
                onError={handleError}
                autoProcess={false}
                size="medium"
                variant="button"
              />
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Voice Command Button (Auto-process)</h3>
              <VoiceButton
                onTranscript={handleTranscript}
                onCommand={handleCommand}
                onError={handleError}
                autoProcess={true}
                size="large"
                variant="fab"
              />
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Minimal Voice Button</h3>
              <VoiceButton
                onTranscript={handleTranscript}
                onError={handleError}
                autoProcess={false}
                size="small"
                variant="minimal"
                showStatus={false}
              />
            </div>
          </div>
          
          {transcript && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm font-medium text-blue-800">Last Transcript:</p>
              <p className="text-sm text-blue-700">"{transcript}"</p>
            </div>
          )}
          
          {lastCommand && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-sm font-medium text-green-800">Last Command:</p>
              <pre className="text-xs text-green-700 mt-1">
                {JSON.stringify(lastCommand, null, 2)}
              </pre>
            </div>
          )}
          
          {lastResponse && (
            <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded">
              <p className="text-sm font-medium text-purple-800">Command Result:</p>
              <p className="text-sm text-purple-700">{lastResponse.message}</p>
            </div>
                     )}
         </div>
         
         {/* Voice Chat Example */}
         <div className="p-6 bg-white rounded-lg border shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Full Voice Chat</h2>
          
          <VoiceChat
            onSendMessage={handleSendMessage}
            isProcessing={isProcessing}
          />
          
          {chatHistory.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Chat History:</h3>
              <div className="max-h-32 overflow-y-auto space-y-1 text-sm">
                {chatHistory.map((message, index) => (
                  <div key={index} className="text-gray-600">
                    {message}
                  </div>
                ))}
              </div>
            </div>
                     )}
         </div>
       </div>
       
       {/* Usage Instructions */}
       <div className="p-6 bg-white rounded-lg border shadow-sm">
        <h2 className="text-lg font-semibold mb-4">How to Use Voice Commands</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Navigation Commands</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• "Open Contract Analyst"</li>
              <li>• "Navigate to Open Records"</li>
              <li>• "Go to Insurance Broker"</li>
              <li>• "Open Dashboard"</li>
              <li>• "Go to Settings"</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Action Commands</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• "Click [button name]"</li>
              <li>• "Search for [query]"</li>
              <li>• "Scroll up/down"</li>
              <li>• "Close modal"</li>
              <li>• "Refresh page"</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> Make sure the voice service is running on localhost:3001 for voice commands to work.
            The service handles speech-to-text, command routing, and text-to-speech automatically.
          </p>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            <strong>Environment Variables:</strong> Add these to your .env.local:
          </p>
          <pre className="text-xs text-blue-700 mt-2 font-mono">
{`NEXT_PUBLIC_VOICE_SERVICE_URL=http://localhost:3001
VOICE_SERVICE_URL=http://localhost:3001
MAIN_SOFTWARE_URL=http://localhost:3000
AI_AGENTS_URL=http://localhost:3002`}
          </pre>
                 </div>
       </div>
     </div>
   );
 };

export default VoiceIntegrationExample; 