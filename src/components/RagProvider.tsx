// components/RAGProvider.tsx
'use client';

import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { BucketInfo } from '@/types/groundx';

// Define the context type
interface RAGContextType {
  isRAGEnabled: boolean;
  selectedBucket: number | null;
  availableBuckets: BucketInfo[];
  isLoadingBuckets: boolean;
  toggleRAG: () => void;
  selectBucket: (bucketId: number | null) => void;
  loadBuckets: () => Promise<void>;
}

// Create the context with default values
const RAGContext = createContext<RAGContextType>({
  isRAGEnabled: false,
  selectedBucket: null,
  availableBuckets: [],
  isLoadingBuckets: false,
  toggleRAG: () => {},
  selectBucket: () => {},
  loadBuckets: async () => {},
});

// Hook to use the RAG context
export const useRAG = () => useContext(RAGContext);

interface RAGProviderProps {
  children: ReactNode;
}

export function RAGProvider({ children }: RAGProviderProps) {
  // State for RAG settings
  const [isRAGEnabled, setIsRAGEnabled] = useState<boolean>(false);
  const [selectedBucket, setSelectedBucket] = useState<number | null>(null);
  const [availableBuckets, setAvailableBuckets] = useState<BucketInfo[]>([]);
  const [isLoadingBuckets, setIsLoadingBuckets] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Client-side only
  useEffect(() => {
    setIsMounted(true);
    
    // Load settings from localStorage on mount
    try {
      const savedRAGEnabled = localStorage.getItem('rag_enabled');
      const savedBucketId = localStorage.getItem('rag_selected_bucket');
      
      if (savedRAGEnabled === 'true') {
        setIsRAGEnabled(true);
      }
      
      if (savedBucketId) {
        const bucketId = parseInt(savedBucketId);
        if (!isNaN(bucketId)) {
          setSelectedBucket(bucketId);
        }
      }
    } catch (error) {
      console.error('Error loading RAG settings from localStorage:', error);
    }
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    if (!isMounted) return;
    
    try {
      localStorage.setItem('rag_enabled', isRAGEnabled.toString());
      localStorage.setItem('rag_selected_bucket', selectedBucket?.toString() || '');
    } catch (error) {
      console.error('Error saving RAG settings to localStorage:', error);
    }
  }, [isRAGEnabled, selectedBucket, isMounted]);

  // Toggle RAG functionality
  const toggleRAG = useCallback(() => {
    setIsRAGEnabled(prev => !prev);
  }, []);

  // Select a bucket
  const selectBucket = useCallback((bucketId: number | null) => {
    setSelectedBucket(bucketId);
  }, []);

  // Load available buckets from API
  const loadBuckets = useCallback(async () => {
    if (!isMounted) return;
    
    setIsLoadingBuckets(true);
    try {
      const response = await fetch('/api/groundx/buckets');
      const data = await response.json();
      
      if (data.success && data.buckets) {
        setAvailableBuckets(data.buckets);
        
        // Auto-select the first bucket if none is selected
        if (data.buckets.length > 0 && selectedBucket === null) {
          setSelectedBucket(data.buckets[0].id);
        }
      } else {
        console.error('Failed to load buckets:', data.error);
      }
    } catch (error) {
      console.error('Error loading buckets:', error);
    } finally {
      setIsLoadingBuckets(false);
    }
  }, [selectedBucket, isMounted]);

  // Load buckets when RAG is enabled
  useEffect(() => {
    if (isMounted && isRAGEnabled && availableBuckets.length === 0) {
      loadBuckets();
    }
  }, [isRAGEnabled, availableBuckets.length, loadBuckets, isMounted]);

  return (
    <RAGContext.Provider
      value={{
        isRAGEnabled,
        selectedBucket,
        availableBuckets,
        isLoadingBuckets,
        toggleRAG,
        selectBucket,
        loadBuckets,
      }}
    >
      {children}
    </RAGContext.Provider>
  );
}