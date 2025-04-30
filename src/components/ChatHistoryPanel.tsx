'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Edit, Trash2, Check, Plus } from 'lucide-react';
import { chatHistoryService, ChatSession } from '@/services/chatHistoryService';

interface ChatHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  activeSessionId: string | null;
}

export const ChatHistoryPanel: React.FC<ChatHistoryPanelProps> = ({
  isOpen,
  onClose,
  onSelectSession,
  onNewSession,
  activeSessionId
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState('');

  // Load sessions when the panel opens
  useEffect(() => {
    if (isOpen) {
      const allSessions = chatHistoryService.getAllSessions();
      setSessions(allSessions);
    }
  }, [isOpen]);

  const handleDeleteSession = (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (confirm('Are you sure you want to delete this chat history?')) {
      const success = chatHistoryService.deleteSession(sessionId);
      if (success) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        
        // If we deleted the active session and there are other sessions
        if (sessionId === activeSessionId && sessions.length > 1) {
          // Find the next session to select
          const nextSession = sessions.find(s => s.id !== sessionId);
          if (nextSession) {
            onSelectSession(nextSession.id);
          }
        }
      }
    }
  };

  const handleStartEditing = (sessionId: string, currentTitle: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingSession(sessionId);
    setEditedTitle(currentTitle);
  };

  const handleSaveTitle = (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (editedTitle.trim() === '') return;
    
    const success = chatHistoryService.updateSessionTitle(sessionId, editedTitle.trim());
    if (success) {
      setSessions(prev => 
        prev.map(session => 
          session.id === sessionId 
            ? { ...session, title: editedTitle.trim() } 
            : session
        )
      );
      setEditingSession(null);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedTitle(e.target.value);
  };

  const handleTitleKeyDown = (sessionId: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = e.target as HTMLElement;
      target.blur(); // Remove focus
      handleSaveTitle(sessionId, e as unknown as React.MouseEvent);
    } else if (e.key === 'Escape') {
      setEditingSession(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      if (date.toDateString() === now.toDateString()) {
        return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } else if (date.toDateString() === yesterday.toDateString()) {
        return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } else {
        return date.toLocaleDateString([], { 
          month: 'short', 
          day: 'numeric', 
          year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined 
        });
      }
    } catch (error) {
      return 'Unknown date';
    }
  };

  // Animation variants
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } }
  };

  const panelVariants = {
    hidden: { x: '-100%', opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { type: 'spring', damping: 25, stiffness: 300 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (custom: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: custom * 0.05, duration: 0.3 }
    })
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
          />
          
          {/* Panel */}
          <motion.div
            className="fixed left-0 top-0 bottom-0 w-80 bg-white z-50 shadow-xl flex flex-col"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold">Chat History</h2>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* New Chat Button */}
            <div className="p-3 border-b">
              <motion.button
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded flex items-center justify-center gap-2"
                onClick={onNewSession}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus size={16} />
                <span>New Chat</span>
              </motion.button>
            </div>
            
            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto p-2">
              {sessions.length === 0 ? (
                <div className="text-gray-500 text-center p-6">
                  No chat history found
                </div>
              ) : (
                <div className="space-y-1">
                  {sessions.map((session, index) => (
                    <motion.div
                      key={session.id}
                      custom={index}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      whileHover={{ backgroundColor: "#f5f5f5" }}
                      className={`rounded-md transition-colors cursor-pointer ${
                        session.id === activeSessionId ? 'bg-indigo-50' : ''
                      }`}
                      onClick={() => onSelectSession(session.id)}
                    >
                      <div className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <MessageSquare size={16} className={`${session.id === activeSessionId ? 'text-indigo-600' : 'text-gray-600'}`} />
                          
                          {editingSession === session.id ? (
                            <div className="flex-1 flex items-center">
                              <input
                                type="text"
                                value={editedTitle}
                                onChange={handleTitleChange}
                                onKeyDown={(e) => handleTitleKeyDown(session.id, e)}
                                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button 
                                onClick={(e) => handleSaveTitle(session.id, e)}
                                className="ml-1 text-green-600 hover:text-green-800"
                              >
                                <Check size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex-1 flex items-center justify-between">
                              <span className="font-medium truncate" title={session.title}>
                                {session.title}
                              </span>
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={(e) => handleStartEditing(session.id, session.title, e)}
                                  className="text-gray-400 hover:text-gray-700"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteSession(session.id, e)}
                                  className="text-gray-400 hover:text-red-600"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 ml-6">
                          {formatDate(session.updatedAt)}
                          {session.messages.length > 0 && ` • ${session.messages.length} message${session.messages.length !== 1 ? 's' : ''}`}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatHistoryPanel;