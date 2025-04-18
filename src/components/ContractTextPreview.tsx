import React, { useState, useEffect, useMemo } from 'react';
import { SearchBox, Stack, Text, IconButton } from '@fluentui/react';

// Define the Risk type
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
  risks?: Risk[];
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
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [activeRiskScore, setActiveRiskScore] = useState<string | null>(null);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [searchMatches, setSearchMatches] = useState<number[]>([]);

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

  // Find all search matches
  useEffect(() => {
    if (!searchText || !searchRegex) {
      setSearchMatches([]);
      setCurrentSearchIndex(-1);
      return;
    }

    const matches: number[] = [];
    const lines = contractText.split('\n');
    
    lines.forEach((line, lineIndex) => {
      if (line.match(searchRegex)) {
        matches.push(lineIndex);
      }
    });
    
    setSearchMatches(matches);
    setCurrentSearchIndex(matches.length > 0 ? 0 : -1);
  }, [searchText, searchRegex, contractText]);

  // Navigate to match
  const navigateToMatch = (index: number) => {
    if (searchMatches.length === 0) return;
    
    const validIndex = ((index % searchMatches.length) + searchMatches.length) % searchMatches.length;
    setCurrentSearchIndex(validIndex);
    
    const lineElement = document.getElementById(`line-${searchMatches[validIndex]}`);
    if (lineElement) {
      lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Highlight a single line of text
  const highlightLine = (line: string, lineIndex: number) => {
    let segments: any[] = [{ text: line, type: 'normal' }];
    
    // First, apply risk highlighting
    if (showRiskHighlights && cleanedRisks.length > 0) {
      for (const risk of cleanedRisks) {
        // Skip if we're filtering by risk score and this doesn't match
        if (activeRiskScore && risk.score.toLowerCase() !== activeRiskScore.toLowerCase()) {
          continue;
        }
        
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
                score: risk.score,
                reason: risk.reason
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
            title={segment.reason || `${segment.score} Risk`}
            style={{ 
              backgroundColor: getRiskScoreColor(segment.score),
              cursor: 'help',
              padding: '1px 0'
            }}
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

  // Handle fullscreen mode
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
      }
    };
    
    document.addEventListener('keydown', handleEsc);
    
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isFullScreen]);

  const filterRiskByScore = (score: string | null) => {
    setActiveRiskScore(activeRiskScore === score ? null : score);
  };

  // Calculate risk counts
  const riskCounts = useMemo(() => {
    const counts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };
    
    cleanedRisks.forEach(risk => {
      const score = risk.score.toLowerCase();
      if (counts.hasOwnProperty(score)) {
        counts[score as keyof typeof counts]++;
      }
    });
    
    return counts;
  }, [cleanedRisks]);

  return (
    <Stack 
      className={`h-full flex flex-col ${isFullScreen ? 'fixed inset-0 z-50 bg-white p-4' : ''}`}
    >
      <Stack horizontal horizontalAlign="space-between" verticalAlign="center" className="mb-2">
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          {enableSearch && (
            <div className="flex-1 min-w-72">
              <div className="relative">
                <SearchBox
                  placeholder="Search in document..."
                  onChange={(_, newValue) => setSearchText(newValue || '')}
                  styles={{ root: { width: '100%' } }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (e.shiftKey) {
                        navigateToMatch(currentSearchIndex - 1);
                      } else {
                        navigateToMatch(currentSearchIndex + 1);
                      }
                    }
                  }}
                />
                {searchMatches.length > 0 && (
                  <div className="absolute right-10 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                    {currentSearchIndex + 1}/{searchMatches.length}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {searchText && searchMatches.length > 0 && (
            <Stack horizontal tokens={{ childrenGap: 4 }}>
              <IconButton
                iconProps={{ iconName: 'ChevronUp' }}
                onClick={() => navigateToMatch(currentSearchIndex - 1)}
                title="Previous match (Shift+Enter)"
              />
              <IconButton
                iconProps={{ iconName: 'ChevronDown' }}
                onClick={() => navigateToMatch(currentSearchIndex + 1)}
                title="Next match (Enter)"
              />
            </Stack>
          )}
        </Stack>
        
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          {enableWordWrap && (
            <IconButton
              onClick={() => setWordWrap(!wordWrap)}
              iconProps={{ iconName: wordWrap ? 'FullWidth' : 'Wrap' }}
              title={wordWrap ? "Disable word wrap" : "Enable word wrap"}
              ariaLabel={wordWrap ? "Disable word wrap" : "Enable word wrap"}
              checked={wordWrap}
              styles={{ root: { marginBottom: 0 } }}
            />
          )}
          
          {risks && risks.length > 0 && (
            <IconButton
              onClick={() => setShowRiskHighlights(!showRiskHighlights)}
              iconProps={{ iconName: 'Warning' }}
              title={showRiskHighlights ? "Hide risks" : "Show risks"}
              ariaLabel={showRiskHighlights ? "Hide risks" : "Show risks"}
              checked={showRiskHighlights}
              styles={{ root: { marginBottom: 0 } }}
            />
          )}
          
          <IconButton
            onClick={() => setIsFullScreen(!isFullScreen)}
            iconProps={{ iconName: isFullScreen ? 'BackToWindow' : 'FullScreen' }}
            title={isFullScreen ? "Exit full screen" : "Full screen"}
            ariaLabel={isFullScreen ? "Exit full screen" : "Full screen"}
            styles={{ root: { marginBottom: 0 } }}
          />
        </Stack>
      </Stack>

      {risks && risks.length > 0 && showRiskHighlights && (
        <div className="mb-2 p-2 bg-gray-100 rounded border border-gray-200">
          <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
            <Text variant="small" className="font-medium">Risk Highlighting:</Text>
            <Stack horizontal tokens={{ childrenGap: 8 }}>
              <div 
                className={`flex items-center cursor-pointer p-1 rounded ${activeRiskScore === 'critical' ? 'ring-2 ring-gray-500' : ''}`}
                onClick={() => filterRiskByScore('critical')}
                title={`Filter by Critical risks (${riskCounts.critical})`}
              >
                <div className="w-3 h-3 mr-1" style={{ backgroundColor: getRiskScoreColor('critical') }}></div>
                <Text variant="small">Critical ({riskCounts.critical})</Text>
              </div>
              <div 
                className={`flex items-center cursor-pointer p-1 rounded ${activeRiskScore === 'high' ? 'ring-2 ring-gray-500' : ''}`}
                onClick={() => filterRiskByScore('high')}
                title={`Filter by High risks (${riskCounts.high})`}
              >
                <div className="w-3 h-3 mr-1" style={{ backgroundColor: getRiskScoreColor('high') }}></div>
                <Text variant="small">High ({riskCounts.high})</Text>
              </div>
              <div 
                className={`flex items-center cursor-pointer p-1 rounded ${activeRiskScore === 'medium' ? 'ring-2 ring-gray-500' : ''}`}
                onClick={() => filterRiskByScore('medium')}
                title={`Filter by Medium risks (${riskCounts.medium})`}
              >
                <div className="w-3 h-3 mr-1" style={{ backgroundColor: getRiskScoreColor('medium') }}></div>
                <Text variant="small">Medium ({riskCounts.medium})</Text>
              </div>
              <div 
                className={`flex items-center cursor-pointer p-1 rounded ${activeRiskScore === 'low' ? 'ring-2 ring-gray-500' : ''}`}
                onClick={() => filterRiskByScore('low')}
                title={`Filter by Low risks (${riskCounts.low})`}
              >
                <div className="w-3 h-3 mr-1" style={{ backgroundColor: getRiskScoreColor('low') }}></div>
                <Text variant="small">Low ({riskCounts.low})</Text>
              </div>
            </Stack>
          </Stack>
        </div>
      )}

      <div className="flex-1 overflow-auto border border-gray-300 rounded bg-gray-50 font-mono text-sm">
        {contractText ? (
          <div className="p-4 min-h-full">
            {contractText.split('\n').map((line, lineIndex) => (
              <div 
                id={`line-${lineIndex}`}
                key={`line-${lineIndex}`}
                className={`flex hover:bg-gray-100 ${searchMatches.includes(lineIndex) && currentSearchIndex !== -1 && searchMatches[currentSearchIndex] === lineIndex ? 'bg-blue-50' : ''}`}
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
      
      {isFullScreen && (
        <div className="mt-2 text-center">
          <Text variant="small" className="text-gray-500">
            Press ESC to exit full screen mode
          </Text>
        </div>
      )}
    </Stack>
  );
};