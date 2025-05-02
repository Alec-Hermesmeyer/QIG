// components/RAGControl.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, Loader2 } from 'lucide-react';

// Define bucket interface
interface Bucket {
  id: number | string;
  name: string;
  documentCount?: number;
}

// Updated props interface
interface RAGControlProps {
  enabled: boolean;
  selectedBucketId: string | null;
  onToggle: (enabled: boolean) => void;
  onBucketSelect: (bucketId: string | null) => void;
}

export function RAGControl({ 
  enabled, 
  selectedBucketId, 
  onToggle, 
  onBucketSelect 
}: RAGControlProps) {
  // Local state
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Set mounted flag on client side
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Load buckets when component mounts or RAG is enabled
  useEffect(() => {
    if (isMounted && enabled) {
      loadBuckets();
    }
  }, [isMounted, enabled]);

  // Function to load buckets
  const loadBuckets = async () => {
    if (!isMounted) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Loading buckets...');
      const response = await fetch('/api/groundx/buckets');
      const data = await response.json();
      
      console.log('Buckets API response:', data);
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load buckets');
      }
      
      if (data.buckets && Array.isArray(data.buckets)) {
        setBuckets(data.buckets);
        
        // Auto-select first bucket if available and none is selected
        if (data.buckets.length > 0 && !selectedBucketId) {
          // Convert bucket ID to string for the select component
          onBucketSelect(String(data.buckets[0].id));
        }
      } else {
        // If no buckets found
        setBuckets([]);
        onBucketSelect(null);
      }
    } catch (err) {
      console.error('Error loading buckets:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle RAG functionality
  const toggleRAG = () => {
    onToggle(!enabled);
  };

  // Handle bucket selection
  const handleBucketSelect = (value: string) => {
    console.log('Selected bucket ID:', value);
    onBucketSelect(value);
  };

  // Don't render on server
  if (!isMounted) return null;

  return (
    <div className="flex items-center gap-2">
      <Button 
        size="sm"
        variant={enabled ? "default" : "outline"}
        className="flex items-center gap-1"
        onClick={toggleRAG}
      >
        <Database size={16} />
        <span>{enabled ? 'RAG: ON' : 'RAG: OFF'}</span>
      </Button>
      
      {enabled && (
        <div className="relative">
          {isLoading ? (
            <div className="flex items-center gap-1 px-3 py-1 border rounded-md bg-gray-50">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-1 px-3 py-1 border rounded-md bg-red-50 text-red-600" title={error}>
              <span className="text-sm">Error loading buckets</span>
              <Button size="sm" variant="outline" onClick={loadBuckets} className="ml-2 h-6 px-1.5 py-0">Retry</Button>
            </div>
          ) : buckets.length === 0 ? (
            <div className="flex items-center gap-1 px-3 py-1 border rounded-md bg-gray-50">
              <span className="text-sm">No buckets found</span>
            </div>
          ) : (
            <Select value={selectedBucketId || undefined} onValueChange={handleBucketSelect}>
              <SelectTrigger className="min-w-[200px] h-8">
                <SelectValue placeholder="Select a bucket" />
              </SelectTrigger>
              <SelectContent>
                {buckets.map(bucket => (
                  <SelectItem 
                    key={String(bucket.id)} 
                    value={String(bucket.id)}
                  >
                    {bucket.name} {bucket.documentCount !== undefined && `(${bucket.documentCount})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}