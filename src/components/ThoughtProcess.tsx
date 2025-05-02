// ThoughtProcess.tsx
import React, { useState } from 'react';
import { Lightbulb, ChevronDown, ChevronUp, Copy, Check, Sparkles, ArrowDownNarrowWide } from 'lucide-react';

interface ThoughtItem {
  title?: string;
  thought: string;
}

interface Props {
  thoughts: ThoughtItem[] | string[] | null | undefined;
  highlightTerms?: string[];
  collapsible?: boolean;
  initiallyCollapsed?: boolean;
}

export const ThoughtProcess: React.FC<Props> = ({ 
  thoughts, 
  highlightTerms = [],
  collapsible = true,
  initiallyCollapsed = false
}) => {
  // State for collapse functionality
  const [isCollapsed, setIsCollapsed] = useState(initiallyCollapsed && collapsible);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Process and extract thoughts from different formats
  const processedThoughts = React.useMemo(() => {
    // If no thoughts provided, return empty array
    if (!thoughts) return [];

    // Handle array format (most common)
    if (Array.isArray(thoughts)) {
      return thoughts.map(item => {
        if (typeof item === 'string') {
          return { thought: item };
        }
        return item;
      });
    }

    // Handle GroundX format - extract thoughts from various places in the response
    if (typeof thoughts === 'object' && thoughts !== null) {
      // If there's a thoughts property directly
      if ('thoughts' in thoughts && Array.isArray((thoughts as any).thoughts)) {
        return (thoughts as any).thoughts.map((item: any) => {
          if (typeof item === 'string') {
            return { thought: item };
          }
          return item;
        });
      }
      
      // Check for GroundX response format
      if ('response' in thoughts) {
        const response = (thoughts as any).response;
        
        // Check for thoughts in the response tools
        if (response?.message?.tool_calls) {
          const toolCalls = response.message.tool_calls;
          for (const call of toolCalls) {
            if (call.function?.name === 'thinking' && call.function.arguments) {
              try {
                const args = JSON.parse(call.function.arguments);
                if (args.thoughts && Array.isArray(args.thoughts)) {
                  return args.thoughts.map((t: any) => ({ thought: t }));
                }
              } catch (e) {
                console.error("Error parsing thoughts:", e);
              }
            }
          }
        }
        
        // Check for thinking section in the response
        if (response?.thinking && Array.isArray(response.thinking)) {
          return response.thinking.map((t: string) => ({ thought: t }));
        }
      }
      
      // Last resort, try to stringify the object
      const stringified = JSON.stringify(thoughts);
      if (stringified) {
        return [{ thought: `Thought process data: ${stringified}` }];
      }
    }

    // Fallback for string thought
    if (typeof thoughts === 'string') {
      // Try to detect JSON format
      try {
        const parsed = JSON.parse(thoughts);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => {
            if (typeof item === 'string') {
              return { thought: item };
            }
            return item;
          });
        } else if (parsed && typeof parsed === 'object') {
          return [{ thought: thoughts }];
        }
      } catch {
        // Not JSON, treat as plain string
        // Split into paragraphs if it's a multi-paragraph string
        if (typeof thoughts === 'string' && (thoughts as string).includes('\n\n')) {
            return typeof thoughts === 'string'
              ? thoughts.split('\n\n').map((p: string): ThoughtItem => ({ thought: p.trim() }))
              : [];
        }
        return [{ thought: thoughts }];
      }
    }

    return [];
  }, [thoughts]);

  // Determine if we should limit the display (for very long thought processes)
  const isLongThoughtProcess = processedThoughts.length > 5;
  const displayedThoughts = showAll || !isLongThoughtProcess 
    ? processedThoughts 
    : processedThoughts.slice(0, 5);

  // Format thought text with highlights
  const formatThought = (text: string): string => {
    if (!text || highlightTerms.length === 0) return text;

    // Create a regex pattern for highlighting multiple terms
    const pattern = new RegExp(`(${highlightTerms.join('|')})`, 'gi');
    return text.replace(pattern, '<mark>$1</mark>');
  };

  // Copy thought to clipboard
  const handleCopy = (thought: string, index: number) => {
    navigator.clipboard.writeText(thought).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  // Toggle collapse state
  const toggleCollapse = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  // Check if there are any groundx-specific thoughts
  const hasGroundXThoughts = React.useMemo(() => {
    if (typeof thoughts === 'object' && thoughts !== null) {
      return 'response' in thoughts || 
             ('thinking' in thoughts && Array.isArray((thoughts as any).thinking));
    }
    return false;
  }, [thoughts]);

  return (
    <div className="thought-process-component">
      <div className="flex justify-between items-center mb-4 px-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Lightbulb size={18} className="mr-2 text-amber-500" />
          Thought Process ({processedThoughts.length} steps)
          {hasGroundXThoughts && (
            <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold flex items-center">
              <Sparkles size={12} className="mr-1" />
              GroundX
            </span>
          )}
        </h3>
        
        {collapsible && processedThoughts.length > 0 && (
          <button 
            onClick={toggleCollapse} 
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
          >
            {isCollapsed ? (
              <>
                <ChevronDown size={16} className="mr-1" />
                Show
              </>
            ) : (
              <>
                <ChevronUp size={16} className="mr-1" />
                Hide
              </>
            )}
          </button>
        )}
      </div>
      
      {!isCollapsed && (
        <>
          <ul className="list-none p-0 m-0">
            {displayedThoughts.length > 0 ? (
              displayedThoughts.map((thought: ThoughtItem, index: number) => (
              <li 
                key={`thought-${index}`} 
                className="p-4 mb-3 bg-blue-50 border border-blue-200 rounded-lg overflow-hidden transition-all hover:shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                <div className="flex items-center flex-wrap gap-2">
                  <div className="flex items-center text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                  <Lightbulb size={14} className="mr-1" />
                  <span>Step {index + 1}</span>
                  </div>
                  {thought.title && (
                  <div className="text-sm font-semibold text-blue-700">{thought.title}</div>
                  )}
                </div>
                
                <button
                  onClick={() => handleCopy(thought.thought, index)}
                  className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded-full hover:bg-blue-100"
                  title="Copy thought"
                >
                  {copiedIndex === index ? (
                  <Check size={14} className="text-green-500" />
                  ) : (
                  <Copy size={14} />
                  )}
                </button>
                </div>
                
                <div 
                className="text-sm leading-relaxed whitespace-pre-wrap text-blue-900"
                dangerouslySetInnerHTML={{ __html: formatThought(thought.thought) }}
                />
              </li>
              ))
            ) : (
              <li className="p-4 mb-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <Lightbulb size={24} className="mb-2" />
                <p>No thought process information available</p>
              </div>
              </li>
            )}
          </ul>
          
          {/* Show more button for long thought processes */}
          {isLongThoughtProcess && !showAll && (
            <div className="text-center mb-4">
              <button
                onClick={() => setShowAll(true)}
                className="inline-flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              >
                <ArrowDownNarrowWide size={14} className="mr-1.5" />
                Show {processedThoughts.length - 5} more steps
              </button>
            </div>
          )}
        </>
      )}
      
      {isCollapsed && processedThoughts.length > 0 && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-500">
          Thought process is collapsed. Click "Show" to view {processedThoughts.length} steps.
        </div>
      )}
    </div>
  );
};