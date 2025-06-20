'use client';

import React, { useState } from 'react';
import { BackendChatProvider, useBackendChatContext } from '@/components/BackendChatProvider';
import { MessageSquare, Plus, Trash2, Edit3, History, Send, AlertCircle } from 'lucide-react';

// Main component that uses the backend chat context
const BackendChatDemo: React.FC = () => {
  const {
    sessions,
    activeSession,
    messages,
    isLoading,
    error,
    createSession,
    selectSession,
    updateSessionTitle,
    deleteSession,
    addMessage,
    showChatHistory,
    setShowChatHistory,
    clearError,
  } = useBackendChatContext();

  // Debug logging
  console.log('🎯 BackendChatDemo render:', {
    sessionsType: typeof sessions,
    sessionsLength: sessions ? sessions.length : 'N/A',
    isArray: Array.isArray(sessions),
    isLoading,
    error,
    activeSession: activeSession?.id
  });

  const [newMessage, setNewMessage] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Handle sending a new message
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    // Add user message
    await addMessage({
      role: 'user',
      content: newMessage,
      timestamp: new Date().toISOString(),
    });

    // Simulate AI response (you can replace this with actual AI integration)
    setTimeout(async () => {
      await addMessage({
        role: 'assistant',
        content: `I received your message: "${newMessage}". This is a demo response from the backend chat system!`,
        timestamp: new Date().toISOString(),
      });
    }, 1000);

    setNewMessage('');
  };

  // Handle creating new session
  const handleCreateSession = async () => {
    await createSession('New Chat Session');
  };

  // Handle editing session title
  const handleEditSession = (sessionId: string, currentTitle: string) => {
    setEditingSessionId(sessionId);
    setEditingTitle(currentTitle);
  };

  const handleSaveEdit = async () => {
    if (editingSessionId && editingTitle.trim()) {
      await updateSessionTitle(editingSessionId, editingTitle.trim());
      setEditingSessionId(null);
      setEditingTitle('');
    }
  };

  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setEditingTitle('');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar - Session History */}
      <div className={`bg-white shadow-lg transition-all duration-300 ${
        showChatHistory ? 'w-80' : 'w-0'
      } overflow-hidden`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Chat Sessions</h2>
            <button
              onClick={handleCreateSession}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              disabled={isLoading}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="p-4 text-center text-gray-500">
              Loading sessions...
            </div>
          )}

          {error && !isLoading && (
            <div className="p-4 text-center text-red-500">
              <p className="text-sm">Failed to load sessions</p>
              <p className="text-xs text-gray-500 mt-1">{error}</p>
            </div>
          )}

          {!isLoading && !error && (sessions || []).length === 0 && (
            <div className="p-4 text-center text-gray-500">
              <p className="text-sm">No chat sessions yet</p>
              <p className="text-xs mt-1">Create your first session to get started</p>
            </div>
          )}

          {(sessions || []).map((session) => (
            <div
              key={session.id}
              className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                activeSession?.id === session.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
              onClick={() => selectSession(session.id)}
            >
              {editingSessionId === session.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    className="w-full p-1 border rounded text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleSaveEdit();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <button
                      onClick={handleSaveEdit}
                      className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{session.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(session.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditSession(session.id, session.title);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-600"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white shadow-sm p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowChatHistory(!showChatHistory)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <History className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold">Backend Chat Demo</h1>
            {activeSession && (
              <span className="text-sm text-gray-500">
                Session: {activeSession.title}
              </span>
            )}
          </div>
          
          {error && (
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
              <button
                onClick={clearError}
                className="text-xs underline hover:no-underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!activeSession ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare className="w-16 h-16 text-gray-400 mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                Welcome to Backend Chat
              </h2>
              <p className="text-gray-500 mb-6">
                This demo showcases integration with your backend chat session management system.
              </p>
              <button
                onClick={handleCreateSession}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create New Session
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Input */}
        {activeSession && (
          <div className="bg-white border-t p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your message..."
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isLoading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main page component with provider
const BackendChatPage: React.FC = () => {
  return (
    <BackendChatProvider>
      <BackendChatDemo />
    </BackendChatProvider>
  );
};

export default BackendChatPage; 