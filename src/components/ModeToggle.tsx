// src/components/ModeToggle.tsx
import { Database, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { motion } from "framer-motion";

interface ModeToggleProps {
  mode: 'RAG' | 'CAG';
  onModeChange: (mode: 'RAG' | 'CAG') => void;
}

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <TooltipProvider>
      <div className="flex bg-gray-200 rounded-md p-1 shadow-sm">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={mode === 'RAG' ? "default" : "ghost"}
              size="sm"
              className="flex items-center gap-1 px-2 py-1 text-xs"
              onClick={() => onModeChange('RAG')}
            >
              <Database className="h-3 w-3" />
              <span>Knowledge Base</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="max-w-xs">
              Use Knowledge Base (RAG) mode to answer questions based on existing information
            </p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={mode === 'CAG' ? "default" : "ghost"}
              size="sm"
              className="flex items-center gap-1 px-2 py-1 text-xs"
              onClick={() => onModeChange('CAG')}
            >
              <FileText className="h-3 w-3" />
              <span>Document Analysis</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="max-w-xs">
              Use Document Analysis (CAG) mode to analyze uploaded documents
            </p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export function ModeIndicator({ mode }: { mode: 'RAG' | 'CAG' }) {
  return (
    <motion.div 
      className={`py-1 px-4 text-xs flex items-center justify-center ${
        mode === 'RAG' 
          ? 'bg-blue-50 text-blue-700 border-b border-blue-100' 
          : 'bg-green-50 text-green-700 border-b border-green-100'
      }`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {mode === 'RAG' ? (
        <span className="flex items-center gap-1">
          <Database className="h-3 w-3" />
          Using Knowledge Base (RAG) mode
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          Using Document Analysis (CAG) mode
        </span>
      )}
    </motion.div>
  );
}