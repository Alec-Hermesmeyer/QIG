// components/RAGControl.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, RefreshCw, AlertCircle, Search, FileText, ToggleLeft, ToggleRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useOrganizationAwareAPI } from '@/hooks/useOrganizationAwareAPI';
import { getGroundXBuckets } from '@/services/backendApi';

// Define bucket interface with additional metadata
interface Bucket {
  id: number;
  name: string;
  documentCount: number;
  lastUpdated?: string;
  description?: string;
}

// Enhanced props interface with additional options
interface RAGControlProps {
  enabled: boolean;
  selectedBucketId: number | null;
  onToggle: (enabled: boolean) => void;
  onBucketSelect: (bucketId: number | null) => void;
  className?: string;
  showDescription?: boolean;
  variant?: 'default' | 'compact' | 'expanded';
}

export function RAGControl({ 
  enabled, 
  selectedBucketId, 
  onToggle, 
  onBucketSelect,
  className = "",
  showDescription = true,
  variant = 'default'
}: RAGControlProps) {
  const { organizationAwareFetch, activeOrganization } = useOrganizationAwareAPI();
  
  // Local state
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [filteredBuckets, setFilteredBuckets] = useState<Bucket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBucket, setSelectedBucket] = useState<Bucket | null>(null);
  
  // Debounce search query to prevent too many re-renders
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Set mounted flag on client side
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  // Load buckets when component mounts, RAG is enabled, or organization changes
  useEffect(() => {
    if (isMounted && enabled) {
      loadBuckets();
    }
  }, [isMounted, enabled, activeOrganization?.id]);
  
  // Filter buckets based on search query
  useEffect(() => {
    if (!debouncedSearchQuery) {
      setFilteredBuckets(buckets);
      return;
    }
    
    const query = debouncedSearchQuery.toLowerCase();
    const filtered = buckets.filter(bucket => 
      bucket.name.toLowerCase().includes(query) || 
      (bucket.description && bucket.description.toLowerCase().includes(query))
    );
    
    setFilteredBuckets(filtered);
  }, [debouncedSearchQuery, buckets]);
  
  // Update selected bucket details when buckets load or selection changes
  useEffect(() => {
    if (selectedBucketId && buckets.length > 0) {
      const selected = buckets.find(b => b.id === selectedBucketId);
      setSelectedBucket(selected || null);
    } else {
      setSelectedBucket(null);
    }
  }, [selectedBucketId, buckets]);

  // Determine if using compact view
  const isCompact = variant === 'compact';
  const isExpanded = variant === 'expanded';

  // Function to load buckets with error handling and organization awareness
  const loadBuckets = async () => {
    if (!isMounted) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Loading buckets for organization:', activeOrganization?.name);
      const data = await getGroundXBuckets();
      
      if (data.success) {
        // Sort buckets by name for easier navigation
        const sortedBuckets = [...data.buckets].sort((a, b) => a.name.localeCompare(b.name));
        setBuckets(sortedBuckets);
        setFilteredBuckets(sortedBuckets);
        
        console.log(`Loaded ${sortedBuckets.length} buckets for ${activeOrganization?.name}:`, 
          sortedBuckets.map(b => b.name));
        
        // Auto-select first bucket if available and none is selected
        if (sortedBuckets.length > 0 && !selectedBucketId) {
          onBucketSelect(sortedBuckets[0].id);
        }
      } else {
        // If no buckets found
        console.log('No buckets found for organization:', activeOrganization?.name);
        setBuckets([]);
        setFilteredBuckets([]);
        onBucketSelect(null);
      }
    } catch (err) {
      console.error('Error loading buckets for organization:', activeOrganization?.name, err);
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
    onBucketSelect(Number(value));
  };
  
  // Reset search query
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Don't render on server
  if (!isMounted) return null;
  
  // Render loading state
  if (isLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-9 w-[220px] bg-gray-100 animate-pulse rounded-md"></div>
        <div className="h-9 w-9 bg-gray-100 animate-pulse rounded-md"></div>
      </div>
    );
  }

  // Render error or empty state
  if (error) {
    return (
      <div className="flex items-center gap-1 px-3 py-1.5 border rounded-md bg-red-50 text-red-600" title={error}>
        <AlertCircle size={14} />
        <span className="text-sm">Error loading buckets</span>
        <Button size="sm" variant="ghost" onClick={loadBuckets} className="ml-1 h-6 w-6 p-0">
          <RefreshCw size={12} />
        </Button>
      </div>
    );
  }

  if (buckets.length === 0) {
    return (
      <div className="flex items-center gap-1 px-3 py-1.5 border rounded-md bg-gray-50">
        <span className="text-sm">No buckets found</span>
        <Button size="sm" variant="ghost" onClick={loadBuckets} className="ml-1 h-6 w-6 p-0">
          <RefreshCw size={12} />
        </Button>
      </div>
    );
  }

  // Render normal state
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Select value={selectedBucketId?.toString() || undefined} onValueChange={handleBucketSelect}>
        <SelectTrigger className="min-w-[220px] h-9">
          <SelectValue placeholder="Select a bucket" />
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          <div className="relative mb-2 px-2 pt-1.5 pb-2 border-b">
            <input
              type="text"
              placeholder="Search buckets..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-2 py-1 pl-7 text-sm border rounded"
            />
            <Search size={14} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            {searchQuery && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearSearch}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
              >
                ×
              </Button>
            )}
          </div>
          
          {filteredBuckets.length === 0 ? (
            <div className="p-2 text-sm text-center text-muted-foreground">
              No matching buckets found
            </div>
          ) : (
            filteredBuckets.map(bucket => (
              <SelectItem 
                key={bucket.id} 
                value={bucket.id.toString()}
              >
                <div className="flex items-center justify-between">
                  <span>{bucket.name}</span>
                  <Badge variant="outline" className="ml-2 text-xs">
                    {bucket.documentCount}
                  </Badge>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={loadBuckets}>
              <RefreshCw size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Refresh buckets</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}