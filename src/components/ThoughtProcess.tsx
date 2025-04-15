// ThoughtProcess.tsx
import React from 'react';
import { Lightbulb } from 'lucide-react';

interface ThoughtItem {
  title?: string;
  thought: string;
}

interface Props {
  thoughts: ThoughtItem[] | string[] | null | undefined;
}

export const ThoughtProcess: React.FC<Props> = ({ thoughts }) => {
  // Handle different formats of thought data
  const processedThoughts = React.useMemo(() => {
    if (!thoughts) return [];
    
    return Array.isArray(thoughts) 
      ? thoughts.map(item => {
          if (typeof item === 'string') {
            return { thought: item };
          }
          return item;
        })
      : [];
  }, [thoughts]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4 px-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Thought Process ({processedThoughts.length} steps)
        </h3>
      </div>
      
      <ul className="list-none p-0 m-0">
        {processedThoughts.length > 0 ? (
          processedThoughts.map((thought, index) => (
            <li key={`thought-${index}`} className="p-4 mb-3 bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
              <div className="flex items-center mb-2">
                <div className="flex items-center text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full mr-2">
                  <Lightbulb size={14} className="mr-1" />
                  <span>Step {index + 1}</span>
                </div>
                {thought.title && (
                  <div className="text-sm font-semibold text-blue-700">{thought.title}</div>
                )}
              </div>
              <div className="text-sm leading-relaxed whitespace-pre-wrap text-blue-900">{thought.thought}</div>
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
    </div>
  );
};