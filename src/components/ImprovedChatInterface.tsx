'use client';

import React, { useState } from 'react';
import { useIndexedDBChat } from '@/hooks/useIndexedDBChat';
import { MigrationPrompt } from './MigrationPrompt';
import { ChatHistoryPanel } from './ChatHistoryPanel';
import { MessageSquare, Settings, BarChart3, Trash2, Plus, X } from 'lucide-react';

export const ImprovedChatInterface: React.FC = () => {
  const {
    sessions,
    activeSession,
    messages,
    isLoading,
    error,
    migration,
    runMigration,
    createSession,
    selectSession,
    updateSessionTitle,
    deleteSession,
    addMessage,
    clearSessionMessages,
    getStorageStats,
    cleanupOldSessions,
    clearError
  } = useIndexedDBChat();

  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [storageStats, setStorageStats] = useState<{ sessionsCount: number; messagesCount: number; estimatedSize: string } | null>(null);

  // Auto-show migration prompt if needed
  React.useEffect(() => {
    if (migration.isNeeded && !migration.result) {
      setShowMigrationPrompt(true);
    }
  }, [migration.isNeeded, migration.result]);

  const handleNewSession = async () => {
    const session = await createSession();
    if (session) {
      setShowHistoryPanel(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !activeSession) return;

    // Add user message
    await addMessage({
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    });

    // Simulate AI response (replace with your actual AI integration)
    setTimeout(async () => {
      await addMessage({
        role: 'assistant',
        content: `I received your message: "${content.trim()}". This is a demo response using the new IndexedDB storage system!`,
        timestamp: new Date().toISOString()
      });
    }, 1000);
  };

  const handleShowStats = async () => {
    const stats = await getStorageStats();
    setStorageStats(stats);
    setShowSettings(true);
  };

  const handleCleanup = async () => {
    const deletedCount = await cleanupOldSessions(30);
    alert(`Cleaned up ${deletedCount} old sessions`);
    if (deletedCount > 0) {
      const stats = await getStorageStats();
      setStorageStats(stats);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-600">Loading chat history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistoryPanel(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Chat History"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-semibold text-gray-900">
                {activeSession?.title || 'New Chat'}
              </h1>
              {activeSession && (
                <p className="text-sm text-gray-500">
                  {messages.length} messages
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleShowStats}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Storage Statistics"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2">
          <div className="flex items-center justify-between">
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!activeSession ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="w-12 h-12 text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Welcome to Enhanced Chat
            </h2>
            <p className="text-gray-500 mb-6 max-w-md">
              Start a new conversation or select from your chat history. 
              Your chats are now stored with improved performance and reliability.
            </p>
            <button
              onClick={handleNewSession}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Start New Chat
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-900'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      {activeSession && (
        <div className="bg-white border-t border-gray-200 p-4">
          <MessageInput onSend={handleSendMessage} />
        </div>
      )}

      {/* Chat History Panel */}
      <ChatHistoryPanel
        isOpen={showHistoryPanel}
        onClose={() => setShowHistoryPanel(false)}
        onSelectSession={(sessionId) => {
          selectSession(sessionId);
          setShowHistoryPanel(false);
        }}
        onNewSession={handleNewSession}
        activeSessionId={activeSession?.id || null}
      />

      {/* Migration Prompt */}
      <MigrationPrompt
        isVisible={showMigrationPrompt}
        onMigrate={runMigration}
        onDismiss={() => setShowMigrationPrompt(false)}
        isInProgress={migration.isInProgress}
      />

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Chat Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {storageStats && (
              <div className="mb-6">
                <h3 className="font-medium mb-3">Storage Statistics</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Chat Sessions:</span>
                    <span>{storageStats.sessionsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Messages:</span>
                    <span>{storageStats.messagesCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Storage Used:</span>
                    <span>{storageStats.estimatedSize}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleCleanup}
                className="w-full flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>Cleanup Old Chats (30+ days)</span>
              </button>

              {activeSession && (
                <button
                  onClick={() => {
                    clearSessionMessages(activeSession.id);
                    setShowSettings(false);
                  }}
                  className="w-full flex items-center gap-2 p-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear Current Chat</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Simple message input component
const MessageInput: React.FC<{ onSend: (message: string) => void }> = ({ onSend }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSend(message);
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        disabled={!message.trim()}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors"
      >
        Send
      </button>
    </form>
  );
}; 