'use client';

import { useRef, useState, useEffect } from 'react';
import { 
  Text, 
  Stack, 
  SearchBox, 
  DefaultButton, 
  IconButton, 
  TooltipHost 
} from '@fluentui/react';

interface ContractTextPreviewProps {
  contractText: string;
  lineNumbers?: boolean;
  enableSearch?: boolean;
  enableWordWrap?: boolean;
}

export const ContractTextPreview: React.FC<ContractTextPreviewProps> = ({
  contractText,
  lineNumbers = true,
  enableSearch = true,
  enableWordWrap = true,
}) => {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
  const [wordWrap, setWordWrap] = useState(enableWordWrap);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Search functionality
  useEffect(() => {
    if (!searchText || !contractText) {
      setSearchResults([]);
      setCurrentSearchIndex(-1);
      return;
    }
    
    const results: number[] = [];
    const lines = contractText.split('\n');
    const searchLower = searchText.toLowerCase();
    
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(searchLower)) {
        results.push(index);
      }
    });
    
    setSearchResults(results);
    setCurrentSearchIndex(results.length > 0 ? 0 : -1);
  }, [searchText, contractText]);
  
  // Scroll to search result
  useEffect(() => {
    if (currentSearchIndex >= 0 && searchResults.length > 0 && containerRef.current) {
      const lineIndex = searchResults[currentSearchIndex];
      const lineElements = containerRef.current.querySelectorAll('.contract-text-line');
      if (lineElements[lineIndex]) {
        lineElements[lineIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentSearchIndex, searchResults]);
  
  const handleSearchChange = (ev?: React.ChangeEvent<HTMLInputElement>, newValue?: string) => {
    setSearchText(newValue || '');
  };
  
  const handleNextResult = () => {
    if (searchResults.length === 0) return;
    setCurrentSearchIndex((prevIndex) => (prevIndex + 1) % searchResults.length);
  };
  
  const handlePrevResult = () => {
    if (searchResults.length === 0) return;
    setCurrentSearchIndex((prevIndex) => (prevIndex - 1 + searchResults.length) % searchResults.length);
  };
  
  const handleToggleWordWrap = () => {
    setWordWrap(!wordWrap);
  };
  
  // Highlight search terms in text
  const highlightSearchTerm = (text: string, lineIndex: number) => {
    if (!searchText || searchResults.indexOf(lineIndex) === -1) {
      return <span>{text}</span>;
    }
    
    const parts = text.split(new RegExp(`(${searchText})`, 'gi'));
    const isCurrentResult = searchResults[currentSearchIndex] === lineIndex;
    
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === searchText.toLowerCase() ? (
            <span key={i} style={{ 
              backgroundColor: isCurrentResult ? '#FDBA74' : '#FEF3C7', 
              fontWeight: isCurrentResult ? 'bold' : 'normal',
              padding: '0 2px',
              borderRadius: '2px'
            }}>
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };
  
  if (!contractText) {
    return (
      <Text style={{ fontStyle: 'italic', color: '#6b7280' }}>
        No text content extracted yet.
      </Text>
    );
  }
  
  const lines = contractText.split('\n');
  
  return (
    <Stack tokens={{ childrenGap: 10 }} style={{ height: '100%' }}>
      {enableSearch && (
        <Stack horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
          <Stack.Item grow>
            <SearchBox 
              placeholder="Search contract text..." 
              onChange={handleSearchChange}
              value={searchText}
              styles={{ root: { width: '100%' } }}
            />
          </Stack.Item>
          <Text>
            {searchResults.length > 0 ? 
              `${currentSearchIndex + 1} of ${searchResults.length} results` : 
              searchText ? 'No results' : ''}
          </Text>
          <TooltipHost content="Previous result">
            <IconButton 
              iconProps={{ iconName: 'ChevronUp' }} 
              onClick={handlePrevResult}
              disabled={searchResults.length === 0}
              title="Previous result"
            />
          </TooltipHost>
          <TooltipHost content="Next result">
            <IconButton 
              iconProps={{ iconName: 'ChevronDown' }} 
              onClick={handleNextResult}
              disabled={searchResults.length === 0}
              title="Next result"
            />
          </TooltipHost>
          <TooltipHost content={wordWrap ? 'Disable word wrap' : 'Enable word wrap'}>
            <DefaultButton 
              iconProps={{ iconName: wordWrap ? 'WrapText' : 'UnwrapText' }}
              onClick={handleToggleWordWrap}
              title={wordWrap ? 'Disable word wrap' : 'Enable word wrap'}
            />
          </TooltipHost>
        </Stack>
      )}
      
      <div 
        ref={containerRef}
        style={{ 
          height: 'calc(100% - 40px)',
          overflow: 'auto',
          border: '1px solid #e5e7eb',
          borderRadius: '4px',
          backgroundColor: '#ffffff',
          padding: '12px',
          flex: 1
        }}
      >
        <div 
          style={{ 
            display: 'flex',
            fontFamily: 'Consolas, Monaco, "Andale Mono", monospace',
            fontSize: '14px',
            lineHeight: '1.5',
            color: '#374151',
          }}
        >
          {lineNumbers && (
            <div style={{
              borderRight: '1px solid #e5e7eb',
              paddingRight: '10px',
              marginRight: '10px',
              color: '#9CA3AF',
              userSelect: 'none',
              textAlign: 'right',
              minWidth: '40px',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {lines.map((_, i) => (
                <div key={i} style={{ height: '1.5em' }}>{i + 1}</div>
              ))}
            </div>
          )}
          
          <div style={{ 
            flex: 1,
            whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
            overflowX: wordWrap ? 'hidden' : 'auto',
          }}>
            {lines.map((line, i) => (
              <div 
                key={i} 
                className="contract-text-line" 
                style={{ 
                  backgroundColor: searchResults[currentSearchIndex] === i ? '#F3F4F6' : 'transparent',
                  paddingLeft: '4px',
                  minHeight: '1.5em'
                }}
              >
                {highlightSearchTerm(line, i)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Stack>
  );
};