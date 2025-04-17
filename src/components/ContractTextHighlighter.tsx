'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Risk } from '@/lib/useContractAnalyst';

interface Props {
  contractText: string;
  risks: Risk[];
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
}

export const ContractTextHighlighter: React.FC<Props> = ({ 
  contractText, 
  risks,
  containerClassName = "",
  containerStyle = {}
}) => {
  const [filteredRisks, setFilteredRisks] = useState<Risk[]>(risks);
  const [searchText, setSearchText] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [highlightedHtml, setHighlightedHtml] = useState<string>('');
  const [showTooltip, setShowTooltip] = useState<boolean>(true);
  const [showHighlights, setShowHighlights] = useState<boolean>(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTooltip, setActiveTooltip] = useState<HTMLElement | null>(null);

  // Helper function to get color based on risk score
  const getRiskColor = (score: string) => {
    switch (score.toLowerCase()) {
      case 'critical': return '#ffcccc'; // Light red
      case 'high': return '#ffd8b5';     // Light orange  
      case 'medium': return '#fff4b5';   // Light yellow
      case 'low': return '#d1ffd1';      // Light green
      default: return '#f0f0f0';         // Light gray
    }
  };

  // Filter risks based on search and severity
  useEffect(() => {
    let filtered = [...risks];
    
    // Filter by severity
    if (selectedSeverity !== 'all') {
      const severityOrder = ['critical', 'high', 'medium', 'low'];
      const selectedIndex = severityOrder.indexOf(selectedSeverity);
      
      if (selectedIndex >= 0) {
        const allowedSeverities = severityOrder.slice(0, selectedIndex + 1);
        filtered = filtered.filter(risk => 
          allowedSeverities.includes(risk.score.toLowerCase())
        );
      }
    }
    
    // Filter by search text
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(
        risk => 
          risk.category.toLowerCase().includes(searchLower) ||
          risk.text.toLowerCase().includes(searchLower) ||
          (risk.reason && risk.reason.toLowerCase().includes(searchLower)) ||
          (risk.location && risk.location.toLowerCase().includes(searchLower))
      );
    }
    
    setFilteredRisks(filtered);
  }, [risks, searchText, selectedSeverity]);

  // Generate highlighted HTML with improved text search
  useEffect(() => {
    if (!contractText || filteredRisks.length === 0) {
      setHighlightedHtml(contractText || '');
      return;
    }

    // Create a structure to track all sections to highlight
    type HighlightSection = {
      text: string;
      score: string;
      startIndex: number;
      endIndex: number;
      category: string;
      reason: string;
    };
    
    const sections: HighlightSection[] = [];
    
    // Find all risk text occurrences in the full text with more robust search
    filteredRisks.forEach(risk => {
      // Skip if no text to highlight
      if (!risk.text) return;
      
      // Create a more gentle cleaning approach that preserves more context
      const cleanRiskText = risk.text.trim();
      
      // Don't skip short risks, they might be important
      if (cleanRiskText.length === 0) return;
      
      // Use a more robust approach to find all occurrences
      let startIndex = 0;
      let foundIndex;
      
      // Find all occurrences of this risk text
      while ((foundIndex = contractText.indexOf(cleanRiskText, startIndex)) !== -1) {
        sections.push({
          text: cleanRiskText,
          score: risk.score,
          startIndex: foundIndex,
          endIndex: foundIndex + cleanRiskText.length,
          category: risk.category || '',
          reason: risk.reason || '',
        });
        
        // Move to position after this match to find the next one
        startIndex = foundIndex + 1;
      }
      
      // If we didn't find an exact match, try with a fuzzy matching approach
      // for risks with location information
      if (sections.length === 0 && risk.location) {
        try {
          // If location contains line/paragraph info, use it
          const locationMatch = /paragraph (\d+)|line (\d+)/i.exec(risk.location);
          if (locationMatch) {
            const paragraphs = contractText.split('\n\n');
            const lines = contractText.split('\n');
            
            let targetText = '';
            let targetIndex = -1;
            
            if (locationMatch[1]) { // Paragraph reference
              const paragraphNum = parseInt(locationMatch[1], 10) - 1;
              if (paragraphs[paragraphNum]) {
                targetText = paragraphs[paragraphNum];
                
                // Find the index of this paragraph in the full text
                let tempIndex = 0;
                for (let i = 0; i < paragraphNum; i++) {
                  tempIndex += paragraphs[i].length + 2; // +2 for '\n\n'
                }
                
                targetIndex = tempIndex;
              }
            } else if (locationMatch[2]) { // Line reference
              const lineNum = parseInt(locationMatch[2], 10) - 1;
              if (lines[lineNum]) {
                targetText = lines[lineNum];
                
                // Find the index of this line in the full text
                let tempIndex = 0;
                for (let i = 0; i < lineNum; i++) {
                  tempIndex += lines[i].length + 1; // +1 for '\n'
                }
                
                targetIndex = tempIndex;
              }
            }
            
            // If we found a target section, check if risk text is a substring
            if (targetText && targetIndex >= 0) {
              // Try to find a fuzzy match in this section
              const words = cleanRiskText.split(' ');
              if (words.length > 3) { // Only for risks with enough words to be distinctive
                // Look for 3+ consecutive words as a match
                for (let i = 0; i <= words.length - 3; i++) {
                  const phrase = words.slice(i, i + 3).join(' ');
                  const phraseIndex = targetText.indexOf(phrase);
                  
                  if (phraseIndex >= 0) {
                    // Found a partial match in the correct location
                    sections.push({
                      text: targetText,
                      score: risk.score,
                      startIndex: targetIndex,
                      endIndex: targetIndex + targetText.length,
                      category: risk.category || '',
                      reason: risk.reason || '',
                    });
                    break;
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error("Error in fuzzy matching:", error);
        }
      }
    });
    
    // Sort sections by start index (ascending order)
    sections.sort((a, b) => a.startIndex - b.startIndex);
    
    // Handle overlapping sections by merging them
    const mergedSections: HighlightSection[] = [];
    
    for (const section of sections) {
      if (mergedSections.length === 0) {
        mergedSections.push(section);
        continue;
      }
      
      const lastSection = mergedSections[mergedSections.length - 1];
      
      // Check if current section overlaps with the last merged section
      if (section.startIndex <= lastSection.endIndex) {
        // Sections overlap, merge them and take the higher severity
        const severityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
        const highestSeverity = 
          (severityOrder[section.score.toLowerCase() as keyof typeof severityOrder] || 4) < 
          (severityOrder[lastSection.score.toLowerCase() as keyof typeof severityOrder] || 4) ? 
          section.score : lastSection.score;
        
        // Update the last section with merged information
        lastSection.endIndex = Math.max(lastSection.endIndex, section.endIndex);
        lastSection.score = highestSeverity;
        lastSection.text = contractText.substring(lastSection.startIndex, lastSection.endIndex);
        
        // Combine categories and reasons
        lastSection.category = `${lastSection.category}, ${section.category}`.trim();
        lastSection.reason = 
          lastSection.reason && section.reason ? 
          `${lastSection.reason}; ${section.reason}` : 
          (lastSection.reason || section.reason || '');
      } else {
        // No overlap, add as a new section
        mergedSections.push(section);
      }
    }
    
    // Apply highlights from end to start (to avoid position changes)
    let textWithHighlights = contractText;
    
    // Sort merged sections by end index (descending)
    mergedSections.sort((a, b) => b.endIndex - a.endIndex);
    
    for (const section of mergedSections) {
      const { text, score, startIndex, endIndex, category, reason } = section;
      
      // Extract the actual text from the original contract text
      const actualText = contractText.substring(startIndex, endIndex);
      
      // Create the highlighted version with tooltip attributes
      const highlighted = showHighlights 
        ? `<span class="risk-highlight" 
            style="background-color: ${getRiskColor(score)}; display: inline; cursor: pointer;"
            data-risk-category="${category.replace(/"/g, '&quot;')}"
            data-risk-score="${score}"
            data-risk-reason="${reason.replace(/"/g, '&quot;')}"
          >${actualText}</span>`
        : actualText; // Don't highlight if highlights are turned off
      
      // Replace the text with highlighted version
      textWithHighlights = 
        textWithHighlights.substring(0, startIndex) + 
        highlighted + 
        textWithHighlights.substring(endIndex);
    }
    
    // Add paragraph formatting for readability
    textWithHighlights = textWithHighlights
      .split('\n\n')
      .map(para => `<p>${para}</p>`)
      .join('');
    
    setHighlightedHtml(textWithHighlights);
  }, [contractText, filteredRisks, showHighlights]);

  // Handle tooltip events
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      if (target.classList.contains('risk-highlight') && showTooltip) {
        // Remove any existing tooltips
        if (activeTooltip) {
          container.removeChild(activeTooltip);
          setActiveTooltip(null);
        }
        
        // Get data attributes
        const category = target.getAttribute('data-risk-category') || '';
        const score = target.getAttribute('data-risk-score') || '';
        const reason = target.getAttribute('data-risk-reason') || '';
        
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'risk-tooltip';
        tooltip.style.position = 'absolute';
        tooltip.style.zIndex = '100';
        tooltip.style.backgroundColor = 'white';
        tooltip.style.border = '1px solid #ccc';
        tooltip.style.borderRadius = '4px';
        tooltip.style.padding = '8px';
        tooltip.style.width = '300px';
        tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        
        // Add content
        tooltip.innerHTML = `
          <div style="font-weight: bold;">${category} (${score})</div>
          <div style="margin-top: 4px;">${reason}</div>
        `;
        
        // Calculate position
        const targetRect = target.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Position relative to container
        const top = targetRect.bottom - containerRect.top + container.scrollTop;
        const left = targetRect.left - containerRect.left + container.scrollLeft;
        
        // Adjust if tooltip would go outside container
        if (left + 300 > containerRect.width) {
          tooltip.style.left = `${Math.max(0, containerRect.width - 310)}px`;
        } else {
          tooltip.style.left = `${Math.max(0, left)}px`;
        }
        
        tooltip.style.top = `${top + 5}px`;
        
        // Add to container
        container.appendChild(tooltip);
        setActiveTooltip(tooltip);
      }
    };
    
    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const relatedTarget = e.relatedTarget as HTMLElement;
      
      // Check if mouse moved to tooltip or to another element
      if (activeTooltip && 
          target.classList.contains('risk-highlight') && 
          (!relatedTarget || !activeTooltip.contains(relatedTarget))) {
        container.removeChild(activeTooltip);
        setActiveTooltip(null);
      }
    };
    
    // Add scroll handler to reposition or hide tooltip
    const handleScroll = () => {
      if (activeTooltip) {
        container.removeChild(activeTooltip);
        setActiveTooltip(null);
      }
    };
    
    // Handle document click to remove tooltip
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      if (activeTooltip && !target.classList.contains('risk-highlight')) {
        container.removeChild(activeTooltip);
        setActiveTooltip(null);
      }
    };
    
    // Add event listeners
    container.addEventListener('mouseover', handleMouseOver);
    container.addEventListener('mouseout', handleMouseOut);
    container.addEventListener('scroll', handleScroll);
    document.addEventListener('click', handleClick);
    
    return () => {
      container.removeEventListener('mouseover', handleMouseOver);
      container.removeEventListener('mouseout', handleMouseOut);
      container.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleClick);
      
      if (activeTooltip && container.contains(activeTooltip)) {
        container.removeChild(activeTooltip);
      }
    };
  }, [showTooltip, activeTooltip]);

  return (
    <div className="contract-highlighter w-full">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* Search input */}
        <div className="w-full sm:w-auto flex-grow">
          <input
            type="text"
            placeholder="Search in risk items..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        
        {/* Filter dropdown */}
        <div className="w-full sm:w-auto flex items-center gap-2">
          <label className="text-sm whitespace-nowrap">Filter by severity:</label>
          <select
            className="px-3 py-2 border border-gray-300 rounded-md"
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
          >
            <option value="all">All Risks</option>
            <option value="critical">Critical Only</option>
            <option value="high">High and Above</option>
            <option value="medium">Medium and Above</option>
            <option value="low">All Risks</option>
          </select>
        </div>
        
        {/* Toggle controls */}
        <div className="w-full sm:w-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show-tooltips"
              checked={showTooltip}
              onChange={() => setShowTooltip(!showTooltip)}
              className="h-4 w-4"
            />
            <label htmlFor="show-tooltips" className="text-sm whitespace-nowrap">Show tooltips</label>
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show-highlights"
              checked={showHighlights}
              onChange={() => setShowHighlights(!showHighlights)}
              className="h-4 w-4"
            />
            <label htmlFor="show-highlights" className="text-sm whitespace-nowrap">Show highlights</label>
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-500 mb-3">
        Showing {filteredRisks.length} of {risks.length} risks
      </div>

      {/* Risk legend */}
      <div className="flex flex-wrap gap-4 mb-3">
        <div className="flex items-center">
          <div className="w-4 h-4 mr-1" style={{ backgroundColor: getRiskColor('critical') }}></div>
          <span className="text-sm">Critical</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 mr-1" style={{ backgroundColor: getRiskColor('high') }}></div>
          <span className="text-sm">High</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 mr-1" style={{ backgroundColor: getRiskColor('medium') }}></div>
          <span className="text-sm">Medium</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 mr-1" style={{ backgroundColor: getRiskColor('low') }}></div>
          <span className="text-sm">Low</span>
        </div>
      </div>

      {/* Contract text container with highlights */}
      <div
        ref={containerRef}
        className={`contract-text-container relative ${containerClassName}`}
        style={{
          padding: '16px',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          backgroundColor: '#ffffff',
          height: '600px',
          overflowY: 'auto',
          lineHeight: '1.6',
          position: 'relative',
          ...containerStyle
        }}
      >
        <div
          className="contract-text"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      </div>
    </div>
  );
};