'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ConversationalVoiceInterface } from './ConversationalVoiceInterface';
import { resourceTracker } from '../utils/resourceCleanup';

export default function StandaloneVoiceControls() {
  const [mounted, setMounted] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<string>('idle');
  const [lastTranscription, setLastTranscription] = useState<string>('');
  const cleanupRef = useRef<(() => void)[]>([]);

  // Ensure component is mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // Cleanup on unmount and add periodic cleanup
  useEffect(() => {
    const periodicCleanup = setInterval(() => {
      console.log('[StandaloneVoice] Running periodic cleanup...');
      resourceTracker.cleanupAll();
      
      // Force garbage collection if available
      if (typeof window !== 'undefined' && window.gc) {
        window.gc();
      }
    }, 30000); // Every 30 seconds

    cleanupRef.current.push(() => clearInterval(periodicCleanup));

    return () => {
      console.log('[StandaloneVoice] Component unmounting, running cleanup...');
      cleanupRef.current.forEach(cleanup => cleanup());
      resourceTracker.cleanupAll();
    };
  }, []);

  // Don't render until mounted
  if (!mounted) {
    return null;
  }

  // Get current page using browser APIs only
  const getCurrentPage = () => {
    if (typeof window !== 'undefined') {
      return window.location.pathname;
    }
    return '/';
  };

  // Map voice commands to actual routes
  const mapVoiceCommandToRoute = (command: string): string => {
    const commandMap: Record<string, string> = {
      // Main pages
      'home': '/',
      'fast-rag': '/fast-rag',
      'fast rag': '/fast-rag',
      'fastrag': '/fast-rag',
      'deep-rag': '/deep-rag',
      'deep rag': '/deep-rag',
      'deeprag': '/deep-rag',
      'dual-rag': '/dual-rag',
      'dual rag': '/dual-rag',
      'dualrag': '/dual-rag',
      'profile': '/profile',
      'settings': '/settings',
      'documents': '/documents',
      'analytics': '/analytics',
      'analyze': '/analyze',
      'landing': '/landing',
      'rag-debug': '/rag-debug',
      'rag debug': '/rag-debug',
      'ragdebug': '/rag-debug',
      'json-test': '/json-test',
      'json test': '/json-test',
      'debug-tools': '/debug-tools',
      'debug tools': '/debug-tools',
      'debugtools': '/debug-tools',
      
      // Admin pages
      'admin': '/admin',
      'admin services': '/admin/services',
      'admin/services': '/admin/services',
      'services': '/admin/services',
      'admin monitoring': '/admin/monitoring',
      'admin/monitoring': '/admin/monitoring',
      'monitoring': '/admin/monitoring',
      'admin config': '/admin/client-config',
      'admin/config': '/admin/client-config',
      'client config': '/admin/client-config',
      'client-config': '/admin/client-config',
      'admin questions': '/admin/sample-questions',
      'admin/questions': '/admin/sample-questions',
      'sample questions': '/admin/sample-questions',
      'sample-questions': '/admin/sample-questions',
      
      // Dashboard fallback to admin
      'dashboard': '/admin',
      
      // Auth pages
      'login': '/login',
      'signup': '/signup',
      'sign up': '/signup'
    };

    // Direct match
    if (commandMap[command]) {
      return commandMap[command];
    }

    // If command starts with '/', use as-is
    if (command.startsWith('/')) {
      return command;
    }

    // Check for partial matches (e.g., "go to admin services")
    for (const [key, value] of Object.entries(commandMap)) {
      if (command.includes(key) || key.includes(command)) {
        return value;
      }
    }

    // Default fallback - try to construct a path
    return command.startsWith('/') ? command : `/${command}`;
  };

  // Check if text looks like a question
  const isQuestion = (text: string): boolean => {
    const lowerText = text.toLowerCase().trim();
    console.log('🔍 [Question Detection] Analyzing:', JSON.stringify(lowerText));
    
    // Skip very short text
    if (lowerText.length < 5) {
      console.log('❌ [Question Detection] Text too short');
      return false;
    }
    
    // Check if it ends with a question mark
    if (lowerText.endsWith('?')) {
      console.log('✅ [Question Detection] Found question mark');
      return true;
    }
    
    // Expanded question words including more conversational starters
    const questionWords = [
      'what', 'how', 'why', 'when', 'where', 'who', 'which', 
      'can', 'could', 'would', 'should', 'is', 'are', 'do', 'does', 'did',
      'tell', 'explain', 'describe', 'show', 'find', 'search', 'get',
      'review', 'analyze', 'summarize', 'compare'
    ];
    
    // Check if it starts with question words
    const firstWord = lowerText.split(' ')[0];
    if (questionWords.includes(firstWord)) {
      console.log('✅ [Question Detection] Starts with question word:', firstWord);
      return true;
    }
    
    // Enhanced question patterns including contract-specific patterns
    const questionPatterns = [
      /^(how to|how do|how can|how should)/i,
      /^(what is|what are|what does|what can|what contracts|what documents)/i,
      /^(why is|why are|why does|why would)/i,
      /^(where is|where are|where can|where should)/i,
      /^(when is|when are|when does|when should)/i,
      /^(who is|who are|who can|who should)/i,
      /^(tell me|explain|describe|show me)/i,
      /^(can you|could you|would you|will you)/i,
      /^(find|search|get|review|analyze)/i,
      /\b(contracts?|documents?|agreements?|reviews?)\b.*\b(review|analyze|summarize|find|search|show|available|able)\b/i,
      /\b(able to|available to|can review|can analyze|can summarize)\b/i
    ];
    
    // Check each pattern
    for (const pattern of questionPatterns) {
      if (pattern.test(lowerText)) {
        console.log('✅ [Question Detection] Matches pattern:', pattern.source);
        return true;
      }
    }
    
    console.log('❌ [Question Detection] No question patterns matched');
    return false;
  };

  // Extract possible question text from any action type
  const extractPossibleQuestion = (action: any): string | null => {
    // Check all possible locations where question text might be
    if (action.parameters?.question) return action.parameters.question;
    if (action.parameters?.query) return action.parameters.query;
    if (action.parameters?.message) return action.parameters.message;
    if (action.parameters?.text) return action.parameters.text;
    if (action.parameters?.content) return action.parameters.content;
    if (action.content) return action.content;
    if (action.text) return action.text;
    if (action.message) return action.message;
    
    // Check if the action itself contains question-like text
    if (typeof action.action === 'string' && action.action.length > 10) {
      return action.action;
    }
    
    // Check target if it looks like a question
    if (action.target && typeof action.target === 'string' && action.target.length > 10) {
      return action.target;
    }
    
    return null;
  };

  // Handle RAG questions - navigate to fast-rag with the question
  const handleRagQuestion = (question: string) => {
    console.log('[StandaloneVoice] Handling RAG question:', question);
    
    if (typeof window !== 'undefined') {
      // Store the question in sessionStorage so fast-rag can pick it up
      console.log('[StandaloneVoice] Storing question in sessionStorage...');
      sessionStorage.setItem('voiceQuestion', question);
      sessionStorage.setItem('voiceQuestionTimestamp', Date.now().toString());
      
      // Verify storage
      const stored = sessionStorage.getItem('voiceQuestion');
      console.log('[StandaloneVoice] Verification - stored question:', stored);
      
      // Force cleanup before navigation
      if (window.gc) {
        window.gc();
      }
      
      console.log('[StandaloneVoice] Navigating to fast-rag...');
      // Navigate to fast-rag page with both sessionStorage and URL param as backup
      const encodedQuestion = encodeURIComponent(question);
      window.location.href = `/fast-rag?voiceQuestion=${encodedQuestion}`;
    }
  };

  // Simple action handler - no external dependencies
  const handleAction = (action: any) => {
    console.log('🎬 [StandaloneVoice] === ACTION RECEIVED ===');
    console.log('🎬 [StandaloneVoice] Full action object:', JSON.stringify(action, null, 2));
    console.log('🎬 [StandaloneVoice] Timestamp:', new Date().toISOString());
    console.log('🎬 [StandaloneVoice] Current lastTranscription:', JSON.stringify(lastTranscription));
    
    // Check if we already processed this as a question via transcription
    if (lastTranscription && isQuestion(lastTranscription)) {
      console.log('⏭️ [StandaloneVoice] SKIPPING ACTION - Already processed as question via transcription');
      console.log('⏭️ [StandaloneVoice] Original transcription was:', lastTranscription);
      return; // Skip action processing, transcription handler already took care of it
    }
    
    // FALLBACK: Check if this is actually a question regardless of action type
    // This only runs if transcription handler didn't catch it
    const possibleQuestion = extractPossibleQuestion(action);
    console.log('🔍 [StandaloneVoice] Extracted possible question:', JSON.stringify(possibleQuestion));
    
    if (possibleQuestion && isQuestion(possibleQuestion)) {
      console.log('⚠️ [StandaloneVoice] FALLBACK - Detected question in action:', possibleQuestion);
      
      // Use the extracted question from action as fallback
      handleRagQuestion(possibleQuestion);
      return; // Exit early, don't process as other action types
    }
    
    // Handle navigation
    if (action.type === 'navigation') {
      let targetPath = '/';
      
      // Extract path from parameters or target
      if (action.parameters?.path) {
        targetPath = action.parameters.path;
      } else if (action.parameters?.page) {
        // Map voice commands to actual routes
        const page = action.parameters.page.toLowerCase().trim();
        targetPath = mapVoiceCommandToRoute(page);
      } else if (action.target) {
        const target = action.target.toLowerCase().trim();
        targetPath = mapVoiceCommandToRoute(target);
      }
      
      console.log('[StandaloneVoice] Navigating to:', targetPath);
      
      if (typeof window !== 'undefined') {
        // Force cleanup before navigation to prevent memory issues
        if (window.gc) {
          window.gc();
        }
        window.location.href = targetPath;
      }
    }
    
    // Handle UI interactions
    if (action.type === 'ui_interaction') {
      switch (action.action) {
        case 'scroll_up':
          window.scrollTo({ top: 0, behavior: 'smooth' });
          break;
        case 'scroll_down':
          window.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
          break;
        case 'refresh_page':
          window.location.reload();
          break;
        case 'go_back':
          window.history.back();
          break;
        case 'go_forward':
          window.history.forward();
          break;
        default:
          console.log('[StandaloneVoice] Unhandled UI action:', action.action);
      }
    }
    
    // Handle data operations (questions, search, etc.)
    if (action.type === 'data_operation') {
      switch (action.action) {
        case 'ask_question':
        case 'search':
        case 'query':
          if (action.parameters?.question || action.parameters?.query) {
            const question = action.parameters.question || action.parameters.query;
            handleRagQuestion(question);
          }
          break;
        default:
          console.log('[StandaloneVoice] Unhandled data operation:', action.action);
      }
    }

    // Handle conversation type (natural questions)
    if (action.type === 'conversation') {
      if (action.parameters?.message || action.parameters?.question) {
        const question = action.parameters.message || action.parameters.question;
        // Check if this looks like a question rather than a command
        if (isQuestion(question)) {
          handleRagQuestion(question);
        }
      }
    }

    // Handle system controls
    if (action.type === 'system_control') {
      switch (action.action) {
        case 'refresh_page':
          window.location.reload();
          break;
        case 'go_back':
          window.history.back();
          break;
        case 'go_forward':
          window.history.forward();
          break;
        case 'open_debug_tools':
          if (typeof window !== 'undefined') {
            window.location.href = '/debug-tools';
          }
          break;
        default:
          console.log('[StandaloneVoice] Unhandled system control:', action.action);
      }
    }
  };

  // Voice event handlers
  const handleVoiceTranscription = (text: string) => {
    console.log('🎤 [StandaloneVoice] === TRANSCRIPTION RECEIVED ===');
    console.log('🎤 [StandaloneVoice] Raw transcription text:', JSON.stringify(text));
    console.log('🎤 [StandaloneVoice] Is question?', isQuestion(text));
    console.log('🎤 [StandaloneVoice] Timestamp:', new Date().toISOString());
    
    // Store the original transcription
    setLastTranscription(text);
    
    // IMMEDIATE CHECK: If this is a question, handle it immediately with original text
    // This prevents the voice service from processing and transforming the question
    if (isQuestion(text)) {
      console.log('✅ [StandaloneVoice] QUESTION DETECTED IN TRANSCRIPTION!');
      console.log('✅ [StandaloneVoice] Immediately processing with original text:', text);
      
      // Use original transcription immediately to prevent transformation
      handleRagQuestion(text);
      
      // Set a flag to prevent action handler from processing this
      setTimeout(() => {
        console.log('🧹 [StandaloneVoice] Clearing transcription flag to prevent duplicates');
        setLastTranscription(''); // Clear to prevent duplicate processing
      }, 3000);
    } else {
      console.log('ℹ️ [StandaloneVoice] Not detected as question, will wait for action processing');
    }
  };

  const handleVoiceResponse = (text: string) => {
    console.log('[StandaloneVoice] Voice response:', text);
    
    // If we get a direct response, that means the question wasn't properly redirected
    console.warn('[StandaloneVoice] Got direct response - question may not have been redirected to RAG');
  };

  const handleVoiceStatusChange = (status: string) => {
    console.log('[StandaloneVoice] Voice status changed:', status);
    setVoiceStatus(status);
  };

  return (
    <>
      {/* Voice Control Interface - Fixed Position */}
      <div 
        className="fixed right-6 z-50"
        style={{ bottom: '160px !important' }}
      >
        <ConversationalVoiceInterface
          apiBaseUrl={process.env.NEXT_PUBLIC_VOICE_SERVICE_URL || "http://localhost:3001"}
          currentPage={getCurrentPage()}
          userProfile={undefined}
          onAction={handleAction}
          onTranscription={handleVoiceTranscription}
          onResponse={handleVoiceResponse}
          onStatusChange={handleVoiceStatusChange}
          enableAutoPlayback={true}
          showTranscriptions={true}
          className="voice-control-interface"
        />
      </div>

      {/* Voice Status Indicator */}
      {voiceStatus !== 'idle' && (
        <div className="fixed top-4 right-4 z-40 bg-white rounded-lg shadow-lg p-3 border">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              voiceStatus === 'listening' ? 'bg-blue-500 animate-pulse' :
              voiceStatus === 'processing' ? 'bg-yellow-500 animate-spin' :
              voiceStatus === 'error' ? 'bg-red-500' :
              'bg-green-500'
            }`} />
            <span className="text-sm font-medium capitalize">
              {voiceStatus === 'listening' ? 'Listening...' :
               voiceStatus === 'processing' ? 'Processing...' :
               voiceStatus === 'error' ? 'Error' :
               'Voice Active'}
            </span>
          </div>
        </div>
      )}

      {/* Development Helper */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-6 left-6 z-40 bg-black/80 text-white p-4 rounded-lg text-xs max-w-xs hidden lg:block overflow-y-auto max-h-96">
          <div className="font-bold mb-2">🎤 Voice Commands:</div>
          <div className="space-y-1 text-xs">
            <div className="font-semibold text-blue-300">Navigation:</div>
            <div>• "Go to fast rag"</div>
            <div>• "Go to deep rag"</div>
            <div>• "Go to profile"</div>
            <div>• "Go to settings"</div>
            <div>• "Go to admin"</div>
            <div>• "Go to admin services"</div>
            <div>• "Go to admin monitoring"</div>
            <div>• "Go to documents"</div>
            <div>• "Go to analytics"</div>
            <div className="font-semibold text-green-300 mt-2">Actions:</div>
            <div>• "Scroll down/up"</div>
            <div>• "Go back/forward"</div>
            <div>• "Refresh page"</div>
            <div>• "Open debug tools"</div>
            <div className="font-semibold text-yellow-300 mt-2">Ask Questions:</div>
            <div>• "What is [topic]?"</div>
            <div>• "How do I [task]?"</div>
            <div>• "Explain [concept]"</div>
            <div className="text-gray-400 text-xs">→ Auto-navigates to Fast RAG</div>
          </div>
        </div>
      )}
    </>
  );
} 