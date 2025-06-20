'use client';

import React, { useState } from 'react';
import { SimpleOpenAIVoice } from '@/components/SimpleOpenAIVoice';
import { MessageSquare, Home, Settings, User, Send, ArrowUp, ArrowDown } from 'lucide-react';

export default function VoiceTestPage() {
  const [messages, setMessages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState('home');
  const [testInput, setTestInput] = useState('');

  const handleVoiceMessage = (message: string, isVoiceGenerated: boolean) => {
    const prefix = isVoiceGenerated ? 'Voice: ' : 'User: ';
    setMessages(prev => [...prev, `${prefix}${message}`]);
  };

  const handleSendMessage = () => {
    if (testInput.trim()) {
      setMessages(prev => [...prev, `User: ${testInput}`]);
      setTestInput('');
    }
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    setMessages(prev => [...prev, `Navigated to: ${page}`]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white border rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            OpenAI Voice Interface Test (Simplified)
          </h1>
          <p className="text-gray-600">
            Test voice commands and chat functionality using OpenAI Whisper + GPT
          </p>
          <div className="mt-2 text-sm text-blue-600">
            ⚠️ Note: The existing SimpleVoiceNavigation is disabled to prevent conflicts
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Voice UI Panel */}
          <div className="lg:col-span-1">
            <SimpleOpenAIVoice
              onMessage={handleVoiceMessage}
              className="h-fit"
            />
          </div>

          {/* Test Interface */}
          <div className="lg:col-span-2 space-y-6">
            {/* Navigation Test */}
            <div className="bg-white border rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Navigation Test</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                <button
                  onClick={() => handleNavigate('home')}
                  className={`px-4 py-2 rounded-md flex items-center space-x-2 transition-colors ${
                    currentPage === 'home'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  data-testid="home"
                >
                  <Home className="w-4 h-4" />
                  <span>Home</span>
                </button>
                
                <button
                  onClick={() => handleNavigate('settings')}
                  className={`px-4 py-2 rounded-md flex items-center space-x-2 transition-colors ${
                    currentPage === 'settings'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  data-testid="settings"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
                
                <button
                  onClick={() => handleNavigate('profile')}
                  className={`px-4 py-2 rounded-md flex items-center space-x-2 transition-colors ${
                    currentPage === 'profile'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  data-testid="profile"
                >
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </button>
              </div>
              
              <p className="text-sm text-gray-600">
                <strong>Try saying:</strong> "Go to settings", "Navigate to profile", "Click home"
              </p>
            </div>

            {/* Form Test */}
            <div className="bg-white border rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Form Interaction Test</h2>
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="Type a message or use voice..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    data-testid="message-input"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center space-x-2"
                    data-testid="send"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </button>
                </div>
                
                <p className="text-sm text-gray-600">
                  <strong>Try saying:</strong> "Click send", "Press send button"
                </p>
              </div>
            </div>

            {/* Scroll Test */}
            <div className="bg-white border rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Scroll Test</h2>
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => window.scrollBy(0, -300)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center space-x-2"
                >
                  <ArrowUp className="w-4 h-4" />
                  <span>Scroll Up</span>
                </button>
                
                <button
                  onClick={() => window.scrollBy(0, 300)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center space-x-2"
                >
                  <ArrowDown className="w-4 h-4" />
                  <span>Scroll Down</span>
                </button>
              </div>
              
              <p className="text-sm text-gray-600">
                <strong>Try saying:</strong> "Scroll down", "Scroll up", "Scroll to top"
              </p>
            </div>

            {/* Chat Messages */}
            <div className="bg-white border rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Activity Log</h2>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-gray-500 text-sm">No messages yet. Try using voice commands!</p>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-md text-sm ${
                        message.startsWith('Voice:')
                          ? 'bg-blue-50 text-blue-800'
                          : message.startsWith('Navigated:')
                          ? 'bg-green-50 text-green-800'
                          : 'bg-gray-50 text-gray-800'
                      }`}
                    >
                      {message}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="bg-white border rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Setup Instructions</h2>
          <div className="space-y-4 text-sm text-gray-600">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">1. Environment Setup</h3>
              <p>Add your OpenAI API key to your <code>.env.local</code> file:</p>
              <code className="block bg-gray-100 p-2 rounded mt-1">
                OPENAI_API_KEY=your_openai_api_key_here
              </code>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">2. Usage</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Click the microphone button to start recording</li>
                <li>Grant microphone permissions when prompted</li>
                <li>Speak your command or question</li>
                <li>Click again to stop recording and process</li>
                <li>Voice responses will be spoken automatically</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">3. Example Commands</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Navigation:</strong> "Go to settings", "Navigate to profile"</li>
                <li><strong>Clicks:</strong> "Click send", "Press home button"</li>
                <li><strong>Scrolling:</strong> "Scroll down", "Scroll to top"</li>
                <li><strong>Chat:</strong> "Hello", "What's the weather like?", "Tell me a joke"</li>
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-2">4. Troubleshooting</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>If pages won't load, check the browser console for errors</li>
                <li>Make sure your OpenAI API key is set correctly</li>
                <li>Ensure microphone permissions are granted</li>
                <li>Try refreshing the page if voice stops working</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 