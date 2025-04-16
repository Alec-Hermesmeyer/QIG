import React, { useState, useEffect, useMemo } from 'react';
import { SearchBox, Stack, Text, Toggle } from '@fluentui/react';

// Define the Risk type to match your existing interface
interface Risk {
  category: string;
  score: string;
  text: string;
  reason: string;
  location: string;
}

interface ContractTextPreviewProps {
  contractText: string;
  lineNumbers?: boolean;
  enableSearch?: boolean;
  enableWordWrap?: boolean;
  risks?: Risk[]; // Add the risks prop
}

// Helper function to get color based on risk score
const getRiskScoreColor = (score: string) => {
  switch (score.toLowerCase()) {
    case 'critical': return '#fecaca'; // Light red
    case 'high': return '#fed7aa';     // Light orange
    case 'medium': return '#fef08a';   // Light yellow
    case 'low': return '#bbf7d0';      // Light green
    default: return '#e5e7eb';         // Light gray
  }
};

export const ContractTextPreview: React.FC<ContractTextPreviewProps> = ({
  contractText,
  lineNumbers = true,
  enableSearch = true,
  enableWordWrap = true,
  risks = []
}) => {
  const [searchText, setSearchText] = useState('');
  const [wordWrap, setWordWrap] = useState(enableWordWrap);
  const [showRiskHighlights, setShowRiskHighlights] = useState(true);

  // Clean up risk texts to improve matching
  const cleanedRisks = useMemo(() => {
    return risks.map(risk => ({
      ...risk,
      // Clean and normalize the risk text for better matching
      cleanText: risk.text
        .replace(/^["']|["']$/g, '') // Remove leading/trailing quotes
        .trim()
    }));
  }, [risks]);
  
  // Prepare search regex if needed
  const searchRegex = useMemo(() => {
    if (!searchText) return null;
    try {
      return new RegExp(`(${escapeRegExp(searchText)})`, 'gi');
    } catch (e) {
      return null;
    }
  }, [searchText]);

  // Function to escape regex special characters
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  // Highlight a single line of text
  const highlightLine = (line: string, lineIndex: number) => {
    let segments: any[] = [{ text: line, type: 'normal' }];
    
    // First, apply risk highlighting
    if (showRiskHighlights && cleanedRisks.length > 0) {
      for (const risk of cleanedRisks) {
        const riskText = risk.cleanText;
        if (!riskText || riskText.length < 5) continue; // Skip very short risk texts
        
        // Check if this line contains the risk text
        const riskIndex = line.indexOf(riskText);
        if (riskIndex >= 0) {
          // Split this segment to highlight the risk
          const newSegments: any[] = [];
          
          for (const segment of segments) {
            if (segment.type !== 'normal') {
              newSegments.push(segment);
              continue;
            }
            
            const segmentText = segment.text;
            const segmentRiskIndex = segmentText.indexOf(riskText);
            
            if (segmentRiskIndex >= 0) {
              // Split this segment into three parts: before, risk, after
              if (segmentRiskIndex > 0) {
                newSegments.push({ 
                  text: segmentText.substring(0, segmentRiskIndex), 
                  type: 'normal' 
                });
              }
              
              newSegments.push({ 
                text: segmentText.substring(segmentRiskIndex, segmentRiskIndex + riskText.length), 
                type: 'risk', 
                score: risk.score 
              });
              
              if (segmentRiskIndex + riskText.length < segmentText.length) {
                newSegments.push({ 
                  text: segmentText.substring(segmentRiskIndex + riskText.length), 
                  type: 'normal' 
                });
              }
            } else {
              newSegments.push(segment);
            }
          }
          
          segments = newSegments;
        }
      }
    }
    
    // Then, apply search highlighting
    if (searchRegex) {
      const newSegments: any[] = [];
      
      for (const segment of segments) {
        if (segment.type !== 'normal') {
          newSegments.push(segment);
          continue;
        }
        
        const parts = segment.text.split(searchRegex);
        if (parts.length > 1) {
          parts.forEach((part: string, i: number) => {
            if (i % 2 === 0) {
              if (part) newSegments.push({ text: part, type: 'normal' });
            } else {
              newSegments.push({ text: part, type: 'search' });
            }
          });
        } else {
          newSegments.push(segment);
        }
      }
      
      segments = newSegments;
    }
    
    // Render the segments
    return segments.map((segment, i) => {
      if (segment.type === 'risk') {
        return (
          <span 
            key={`${lineIndex}-risk-${i}`}
            style={{ backgroundColor: getRiskScoreColor(segment.score) }}
          >
            {segment.text}
          </span>
        );
      } else if (segment.type === 'search') {
        return (
          <span 
            key={`${lineIndex}-search-${i}`}
            className="bg-yellow-200"
          >
            {segment.text}
          </span>
        );
      } else {
        return (
          <span key={`${lineIndex}-normal-${i}`}>
            {segment.text}
          </span>
        );
      }
    });
  };

  return (
    <Stack className="h-full flex flex-col">
      <Stack horizontal horizontalAlign="space-between" verticalAlign="center" className="mb-2">
        {enableSearch && (
          <div className="flex-1 max-w-md">
            <SearchBox
              placeholder="Search in document..."
              onChange={(_, newValue) => setSearchText(newValue || '')}
              styles={{ root: { width: '100%' } }}
            />
          </div>
        )}
        
        <div className="flex items-center">
          {risks && risks.length > 0 && (
            <Toggle
              label="Show Risks"
              checked={showRiskHighlights}
              onChange={(_, checked) => setShowRiskHighlights(checked || false)}
              styles={{ 
                root: { marginRight: 16, marginBottom: 0 },
                label: { marginBottom: 0 }
              }}
            />
          )}
          
          {enableWordWrap && (
            <Toggle
              label="Word Wrap"
              checked={wordWrap}
              onChange={(_, checked) => setWordWrap(checked || false)}
              styles={{ 
                root: { marginBottom: 0 },
                label: { marginBottom: 0 }
              }}
            />
          )}
        </div>
      </Stack>

      <div className="flex-1 overflow-auto border border-gray-300 rounded bg-gray-50 font-mono text-sm">
        {contractText ? (
          <div className="p-4 min-h-full">
            {contractText.split('\n').map((line, lineIndex) => (
              <div 
                key={`line-${lineIndex}`}
                className="flex" 
              >
                {lineNumbers && (
                  <div 
                    className="select-none text-gray-400 text-right pr-2 border-r border-gray-300 flex-shrink-0" 
                    style={{ minWidth: '3rem' }}
                  >
                    {lineIndex + 1}
                  </div>
                )}
                <div 
                  className="pl-2 flex-1"
                  style={{ 
                    whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                    overflowX: wordWrap ? 'visible' : 'auto'
                  }}
                >
                  {highlightLine(line, lineIndex)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            No document text to display
          </div>
        )}
      </div>
      
      {risks && risks.length > 0 && showRiskHighlights && (
        <div className="mt-2 p-2 bg-gray-100 rounded border border-gray-200">
          <Text variant="small" className="font-medium mb-1">Risk Highlighting Legend:</Text>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center">
              <div className="w-3 h-3 mr-1" style={{ backgroundColor: getRiskScoreColor('critical') }}></div>
              <Text variant="small">Critical</Text>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 mr-1" style={{ backgroundColor: getRiskScoreColor('high') }}></div>
              <Text variant="small">High</Text>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 mr-1" style={{ backgroundColor: getRiskScoreColor('medium') }}></div>
              <Text variant="small">Medium</Text>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 mr-1" style={{ backgroundColor: getRiskScoreColor('low') }}></div>
              <Text variant="small">Low</Text>
            </div>
          </div>
        </div>
      )}
    </Stack>
  );
};