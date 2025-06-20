'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { ChatProvider, useChatContext as useIndexedDBChatContext } from '@/components/ChatProvider';
import { BackendChatProvider, useBackendChatContext } from '@/components/BackendChatProvider';

// Configuration type
export type ChatStorageType = 'indexeddb' | 'backend';

interface ChatStorageConfig {
  storageType: ChatStorageType;
  backendUrl?: string;
}

interface ChatStorageContextType {
  config: ChatStorageConfig;
  setConfig: (config: ChatStorageConfig) => void;
}

const ChatStorageContext = createContext<ChatStorageContextType | null>(null);

interface ChatStorageProviderProps {
  children: ReactNode;
  defaultConfig?: ChatStorageConfig;
}

// Default configuration
const DEFAULT_CONFIG: ChatStorageConfig = {
  storageType: 'indexeddb' // Default to IndexedDB for compatibility
};

export const ChatStorageProvider: React.FC<ChatStorageProviderProps> = ({ 
  children, 
  defaultConfig = DEFAULT_CONFIG 
}) => {
  const [config, setConfig] = React.useState<ChatStorageConfig>(defaultConfig);

  const contextValue = {
    config,
    setConfig,
  };

  return (
    <ChatStorageContext.Provider value={contextValue}>
      {config.storageType === 'backend' ? (
        <BackendChatProvider>
          {children}
        </BackendChatProvider>
      ) : (
        <ChatProvider>
          {children}
        </ChatProvider>
      )}
    </ChatStorageContext.Provider>
  );
};

// Hook to get storage configuration
export const useChatStorageConfig = (): ChatStorageContextType => {
  const context = useContext(ChatStorageContext);
  if (!context) {
    throw new Error('useChatStorageConfig must be used within a ChatStorageProvider');
  }
  return context;
};

// Unified hook that works with both storage types
export const useUnifiedChatContext = () => {
  const { config } = useChatStorageConfig();
  
  console.log('🔍 useUnifiedChatContext: Using storage type:', config.storageType);
  
  if (config.storageType === 'backend') {
    console.log('🔍 useUnifiedChatContext: Returning backend chat context');
    return useBackendChatContext();
  } else {
    console.log('🔍 useUnifiedChatContext: Returning IndexedDB chat context');
    return useIndexedDBChatContext();
  }
};

// Storage switcher component
interface StorageSwitcherProps {
  className?: string;
}

export const StorageSwitcher: React.FC<StorageSwitcherProps> = ({ className = '' }) => {
  const { config, setConfig } = useChatStorageConfig();

  const handleStorageChange = (storageType: ChatStorageType) => {
    setConfig({
      ...config,
      storageType,
    });
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm text-gray-600">Storage:</span>
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => handleStorageChange('indexeddb')}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${
            config.storageType === 'indexeddb'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          IndexedDB
        </button>
        <button
          onClick={() => handleStorageChange('backend')}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${
            config.storageType === 'backend'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Backend
        </button>
      </div>
    </div>
  );
}; 