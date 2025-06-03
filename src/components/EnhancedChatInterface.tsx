'use client';

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Settings, BarChart3, Trash2, X, History } from 'lucide-react';
import { ImprovedChat, ImprovedChatHandle } from './chat';
import { ChatHistoryPanel } from './ChatHistoryPanel';
import { useChatContext } from './ChatProvider';

interface EnhancedChatInterfaceProps {
  // Pass through props for ImprovedChat
  onUserMessage?: (message: string) => void;
  onAssistantMessage?: (message: string) => void;
  onConversationStart?: () => void;
  onStreamingChange?: (isStreaming: boolean) => void;
  isDisabled?: boolean;
  useRAG?: boolean;
  ragBucketId?: number | null;
  isRAGEnabled?: boolean;
  selectedBucketId?: string | null;
  temperature?: number;
  seed?: string;
  streamResponses?: boolean;
  suggestFollowUpQuestions?: boolean;
  promptTemplate?: string;
  searchConfig?: any;
  conversationContext?: any;
}

export interface EnhancedChatHandle {
  submitMessage: (message: string) => void;
  updateConfig?: (config: any) => void;
  showHistory: () => void;
  newSession: () => void;
}

export const EnhancedChatInterface = forwardRef<EnhancedChatHandle, EnhancedChatInterfaceProps>(
  function EnhancedChatInterface(props, ref) {
    const {
      activeSession,
      messages,
      isLoading,
      error,
      createSession,
      selectSession,
      addMessage,
      clearSessionMessages,
      showChatHistory,
      setShowChatHistory,
      getStorageStats,
      cleanupOldSessions,
      clearError
    } = useChatContext();

    const [showSettings, setShowSettings] = useState(false);
    const [storageStats, setStorageStats] = useState<{ 
      sessionsCount: number; 
      messagesCount: number; 
      estimatedSize: string 
    } | null>(null);

    const improvedChatRef = useRef<ImprovedChatHandle>(null);

    // Imperative handle for parent components
    useImperativeHandle(ref, () => ({
      submitMessage: (message: string) => {
        improvedChatRef.current?.submitMessage(message);
      },
      updateConfig: (config: any) => {
        improvedChatRef.current?.updateConfig?.(config);
      },
      showHistory: () => {
        setShowChatHistory(true);
      },
      newSession: () => {
        handleNewSession();
      }
    }));

    // Enhanced message handlers that save to IndexedDB
    const handleUserMessage = async (message: string) => {
      // Add to IndexedDB
      await addMessage({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      });

      // Call original handler if provided
      props.onUserMessage?.(message);
    };

    const handleAssistantMessage = async (message: string) => {
      // Add to IndexedDB
      await addMessage({
        role: 'assistant',
        content: message,
        timestamp: new Date().toISOString()
      });

      // Call original handler if provided
      props.onAssistantMessage?.(message);
    };

    const handleNewSession = async () => {
      await createSession();
      setShowChatHistory(false);
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

    return (
      <div className="flex flex-col h-full bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowChatHistory(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Chat History"
              >
                <History className="w-5 h-5" />
              </button>
              <div>
                <h1 className="font-semibold text-gray-900">
                  {activeSession?.title || 'New Chat'}
                </h1>
                {activeSession && (
                  <p className="text-sm text-gray-500">
                    {messages.length} messages • {activeSession.messageCount} total
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
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-red-50 border-b border-red-200 px-4 py-2"
            >
              <div className="flex items-center justify-between">
                <p className="text-red-700 text-sm">{error}</p>
                <button
                  onClick={clearError}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Interface */}
        <div className="flex-1 flex flex-col min-h-0">
          {!activeSession ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageSquare className="w-16 h-16 text-gray-400 mb-4" />
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">
                Welcome to Enhanced Chat
              </h2>
              <p className="text-gray-500 mb-6 max-w-md">
                Start a new conversation or select from your chat history. 
                Your chats are now stored with improved performance and reliability using IndexedDB.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleNewSession}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2"
                >
                  <MessageSquare className="w-5 h-5" />
                  Start New Chat
                </button>
                <button
                  onClick={() => setShowChatHistory(true)}
                  className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-lg flex items-center gap-2"
                >
                  <History className="w-5 h-5" />
                  Browse History
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0">
              {/* Render your existing ImprovedChat component */}
              <ImprovedChat
                ref={improvedChatRef}
                {...props}
                onUserMessage={handleUserMessage}
                onAssistantMessage={handleAssistantMessage}
                conversationContext={messages} // Pass current messages as context
              />
            </div>
          )}
        </div>

        {/* Chat History Panel */}
        <ChatHistoryPanel
          isOpen={showChatHistory}
          onClose={() => setShowChatHistory(false)}
          onSelectSession={selectSession}
          onNewSession={handleNewSession}
          activeSessionId={activeSession?.id || null}
        />

        {/* Settings Modal */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
              >
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
                        if (confirm('Are you sure you want to clear all messages in this chat?')) {
                          clearSessionMessages(activeSession.id);
                          setShowSettings(false);
                        }
                      }}
                      className="w-full flex items-center gap-2 p-3 border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Clear Current Chat</span>
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
); 