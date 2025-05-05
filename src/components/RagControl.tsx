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

// Define bucket interface with additional metadata
interface Bucket {
  id: number | string;
  name: string;
  documentCount?: number;
  lastUpdated?: string;
  description?: string;
}

// Enhanced props interface with additional options
interface RAGControlProps {
  enabled: boolean;
  selectedBucketId: string | null;
  onToggle: (enabled: boolean) => void;
  onBucketSelect: (bucketId: string | null) => void;
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

  // Load buckets when component mounts or RAG is enabled
  useEffect(() => {
    if (isMounted && enabled) {
      loadBuckets();
    }
  }, [isMounted, enabled]);
  
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
      const selected = buckets.find(b => String(b.id) === selectedBucketId);
      setSelectedBucket(selected || null);
    } else {
      setSelectedBucket(null);
    }
  }, [selectedBucketId, buckets]);

  // Determine if using compact view
  const isCompact = variant === 'compact';
  const isExpanded = variant === 'expanded';

  // Function to load buckets with error handling
  const loadBuckets = async () => {
    if (!isMounted) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/groundx/buckets');
      
      if (!response.ok) {
        throw new Error(`Failed to load buckets: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load buckets');
      }
      
      if (data.buckets && Array.isArray(data.buckets)) {
        // Sort buckets by name for easier navigation
        const sortedBuckets = [...data.buckets].sort((a, b) => a.name.localeCompare(b.name));
        setBuckets(sortedBuckets);
        setFilteredBuckets(sortedBuckets);
        
        // Auto-select first bucket if available and none is selected
        if (sortedBuckets.length > 0 && !selectedBucketId) {
          onBucketSelect(String(sortedBuckets[0].id));
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

  // Toggle RAG functionality
  const toggleRAG = () => {
    onToggle(!enabled);
  };

  // Handle bucket selection
  const handleBucketSelect = (value: string) => {
    onBucketSelect(value);
  };
  
  // Reset search query
  const clearSearch = () => {
    setSearchQuery('');
  };

  // Don't render on server
  if (!isMounted) return null;
  
  // Render loading state
  if (enabled && isLoading && !isCompact) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <Button 
          size="sm"
          variant={enabled ? "default" : "outline"}
          className="flex items-center gap-1.5"
          onClick={toggleRAG}
        >
          {enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
          <span>Knowledge Search</span>
        </Button>
        
        <Skeleton className="h-9 w-[250px]" />
      </div>
    );
  }

  // For compact view, just show a toggle with tooltip
  if (isCompact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              size="sm" 
              variant={enabled ? "default" : "outline"}
              className={`w-9 p-0 ${className}`}
              onClick={toggleRAG}
            >
              <Database size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Knowledge Search: {enabled ? 'Active' : 'Inactive'}</p>
            {enabled && selectedBucket && (
              <p className="text-xs text-muted-foreground">{selectedBucket.name}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  // Expanded card view
  if (isExpanded) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database size={18} className="text-muted-foreground" />
                <h3 className="font-medium">Retrieval-Augmented Generation</h3>
              </div>
              
              <Button 
                size="sm"
                variant={enabled ? "default" : "outline"}
                className="flex items-center gap-1.5"
                onClick={toggleRAG}
              >
                {enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                <span>Knowledge Search</span>
              </Button>
            </div>
            
            {enabled && (
              <>
                <div className="relative">
                  {error ? (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-red-50 text-red-600 border border-red-200">
                      <AlertCircle size={16} />
                      <span className="text-sm flex-1">{error}</span>
                      <Button size="sm" variant="outline" onClick={loadBuckets} className="h-7 px-2">
                        <RefreshCw size={14} />
                      </Button>
                    </div>
                  ) : buckets.length === 0 ? (
                    <div className="flex items-center justify-between p-3 rounded-md bg-amber-50 text-amber-600 border border-amber-200">
                      <span className="text-sm">No data buckets available</span>
                      <Button size="sm" variant="outline" onClick={loadBuckets} className="h-7 px-2">
                        <RefreshCw size={14} />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="relative mb-2">
                        <input
                          type="text"
                          placeholder="Search buckets..."
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                          className="w-full px-3 py-1.5 pl-8 pr-8 border rounded-md bg-background text-sm"
                        />
                        <Search size={14} className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
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
                      
                      <Select value={selectedBucketId || undefined} onValueChange={handleBucketSelect}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a knowledge bucket" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {filteredBuckets.length === 0 ? (
                            <div className="p-2 text-sm text-center text-muted-foreground">
                              No matching buckets found
                            </div>
                          ) : (
                            filteredBuckets.map(bucket => (
                              <SelectItem 
                                key={String(bucket.id)} 
                                value={String(bucket.id)}
                                className="flex items-center py-2"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <FileText size={14} className="text-muted-foreground" />
                                    {bucket.name}
                                    {bucket.documentCount !== undefined && (
                                      <Badge variant="outline" className="ml-1 text-xs">
                                        {bucket.documentCount} docs
                                      </Badge>
                                    )}
                                  </div>
                                  {showDescription && bucket.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5">{bucket.description}</p>
                                  )}
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>
                
                {selectedBucket && (
                  <div className="mt-1 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FileText size={14} />
                      <span>
                        {selectedBucket.documentCount !== undefined
                          ? `${selectedBucket.documentCount} documents`
                          : 'Documents available'}
                      </span>
                    </div>
                    
                    {selectedBucket.lastUpdated && (
                      <div className="text-xs mt-1">
                        Last updated: {selectedBucket.lastUpdated}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default view
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button 
        size="sm"
        variant={enabled ? "default" : "outline"}
        className="flex items-center gap-1.5"
        onClick={toggleRAG}
      >
        {enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
        <span>Knowledge Search</span>
      </Button>
      
      {enabled && (
        <div className="relative">
          {error ? (
            <div className="flex items-center gap-1 px-3 py-1.5 border rounded-md bg-red-50 text-red-600" title={error}>
              <AlertCircle size={14} />
              <span className="text-sm">Error loading buckets</span>
              <Button size="sm" variant="ghost" onClick={loadBuckets} className="ml-1 h-6 w-6 p-0">
                <RefreshCw size={12} />
              </Button>
            </div>
          ) : buckets.length === 0 ? (
            <div className="flex items-center gap-1 px-3 py-1.5 border rounded-md bg-gray-50">
              <span className="text-sm">No buckets found</span>
              <Button size="sm" variant="ghost" onClick={loadBuckets} className="ml-1 h-6 w-6 p-0">
                <RefreshCw size={12} />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Select value={selectedBucketId || undefined} onValueChange={handleBucketSelect}>
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
                  </div>
                  
                  {filteredBuckets.length === 0 ? (
                    <div className="p-2 text-sm text-center text-muted-foreground">
                      No matching buckets found
                    </div>
                  ) : (
                    filteredBuckets.map(bucket => (
                      <SelectItem 
                        key={String(bucket.id)} 
                        value={String(bucket.id)}
                      >
                        <div className="flex items-center justify-between">
                          <span>{bucket.name}</span>
                          {bucket.documentCount !== undefined && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              {bucket.documentCount}
                            </Badge>
                          )}
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
          )}
        </div>
      )}
    </div>
  );
}