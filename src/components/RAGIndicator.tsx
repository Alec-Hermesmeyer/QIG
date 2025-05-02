// components/RAGIndicator.tsx
'use client';

import { useState } from 'react';
import { Database, FileText, ExternalLink, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

interface Source {
  id: string | number;
  fileName: string;
  title?: string;
  score?: number;
}

interface RAGIndicatorProps {
  sources: Source[];
  onSourceClick?: (source: Source) => void;
}

export function RAGIndicator({ sources, onSourceClick }: RAGIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!sources || sources.length === 0) return null;
  
  return (
    <motion.div 
      className="mt-2 p-2 rounded-md border border-blue-100 bg-blue-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-blue-700 text-sm">
          <Database size={14} />
          <span>Answer enhanced with document knowledge</span>
          <Badge variant="info" className="ml-1">RAG</Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-blue-700 hover:bg-blue-100 p-1 h-auto"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Hide sources' : 'Show sources'}
        </Button>
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="mt-2 space-y-1"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-xs text-blue-600 mb-1 flex items-center gap-1">
              <Search size={10} />
              <span>Documents referenced:</span>
            </div>
            
            {sources.map((source, index) => (
              <motion.div
                key={index}
                className="flex items-center gap-2 text-sm p-1 hover:bg-blue-100 rounded-md"
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <FileText size={12} className="text-blue-700" />
                <span className="flex-1 truncate">{source.fileName || source.title || `Document ${source.id}`}</span>
                {source.score !== undefined && (
                  <Badge 
                    variant="outline" 
                    className="text-xs"
                    title={`Relevance score: ${source.score}`}
                  >
                    {(source.score * 100).toFixed(0)}%
                  </Badge>
                )}
                {onSourceClick && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 h-6 w-6"
                    onClick={() => onSourceClick(source)}
                    title="View document"
                  >
                    <ExternalLink size={12} className="text-blue-700" />
                  </Button>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}