'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

// Define the types for our context
interface RAGContextType {
  isRAGEnabled: boolean;
  selectedBucket: number | null;
  availableBuckets: BucketInfo[];
  isLoadingBuckets: boolean;
  toggleRAG: () => void;
  selectBucket: (bucketId: number | null) => void;
  loadBuckets: () => Promise<void>;
}

interface BucketInfo {
  id: number;
  name: string;
  documentCount?: number;
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
  const [isRAGEnabled, setIsRAGEnabled] = useState<boolean>(false);
  const [selectedBucket, setSelectedBucket] = useState<number | null>(null);
  const [availableBuckets, setAvailableBuckets] = useState<BucketInfo[]>([]);
  const [isLoadingBuckets, setIsLoadingBuckets] = useState<boolean>(false);

  // Toggle RAG functionality
  const toggleRAG = useCallback(() => {
    setIsRAGEnabled(prev => !prev);
    if (!isRAGEnabled && availableBuckets.length === 0) {
      loadBuckets();
    }
  }, [isRAGEnabled, availableBuckets]);

  // Select a bucket
  const selectBucket = useCallback((bucketId: number | null) => {
    setSelectedBucket(bucketId);
  }, []);

  // Load available buckets
  const loadBuckets = useCallback(async () => {
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
  }, [selectedBucket]);

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