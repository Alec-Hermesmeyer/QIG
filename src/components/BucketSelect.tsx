'use client';

import { useState, useEffect } from 'react';
import { Search, RefreshCw, AlertCircle, FileText } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { 
  Select, SelectContent, SelectItem, 
  SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getGroundXBuckets } from '@/services/backendApi';

// Define bucket interface
interface Bucket {
  id: number;
  name: string;
  documentCount: number;
  lastUpdated?: string;
  description?: string;
}

// Props for the BucketSelect component
interface BucketSelectProps {
  selectedBucketId: number | null;
  onBucketSelect: (bucketId: number | null) => void;
  className?: string;
  showDescription?: boolean;
  placeholder?: string;
}

export function BucketSelect({ 
  selectedBucketId, 
  onBucketSelect,
  className = "",
  showDescription = true,
  placeholder = "Select a bucket"
}: BucketSelectProps) {
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

  // Load buckets when component mounts
  useEffect(() => {
    if (isMounted) {
      loadBuckets();
    }
  }, [isMounted]);
  
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

  // Function to load buckets with error handling
  const loadBuckets = async () => {
    if (!isMounted) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await getGroundXBuckets();
      
      if (data.success) {
        // Sort buckets by name for easier navigation
        const sortedBuckets = [...data.buckets].sort((a, b) => a.name.localeCompare(b.name));
        setBuckets(sortedBuckets);
        setFilteredBuckets(sortedBuckets);
        
        // Auto-select first bucket if available and none is selected
        if (sortedBuckets.length > 0 && !selectedBucketId) {
          onBucketSelect(sortedBuckets[0].id);
        }
      } else {
        // If no buckets found
        setBuckets([]);
        setFilteredBuckets([]);
        onBucketSelect(null);
      }
    } catch (err) {
      console.error('Error loading buckets:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
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
          <SelectValue placeholder={placeholder} />
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