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

  // Generate highlighted HTML
  useEffect(() => {
    if (!contractText || filteredRisks.length === 0) {
      setHighlightedHtml(contractText || '');
      return;
    }

    // Clone the contract text
    let textWithHighlights = contractText;
    
    // Create a structure to track all sections to highlight
    type HighlightSection = {
      text: string;
      score: string;
      index: number;
      category: string;
      reason: string;
    };
    
    const sections: HighlightSection[] = [];
    
    // Find all risk text occurrences in the full text
    filteredRisks.forEach(risk => {
      // Skip if no text to highlight
      if (!risk.text) return;
      
      const cleanRiskText = risk.text.replace(/["']/g, '').trim();
      
      // Skip empty or very short risk texts
      if (cleanRiskText.length < 5) return;
      
      // Try to find the text in the contract
      const index = textWithHighlights.indexOf(cleanRiskText);
      
      if (index >= 0) {
        sections.push({
          text: cleanRiskText,
          score: risk.score,
          index,
          category: risk.category || '',
          reason: risk.reason || '',
        });
      }
    });
    
    // Sort sections by index (from end to start to avoid position changes)
    sections.sort((a, b) => b.index - a.index);
    
    // Apply highlights from end to start
    for (const section of sections) {
      const { text, score, index, category, reason } = section;
      
      // Create the highlighted version with tooltip attributes
      const highlighted = showHighlights 
        ? `<span class="risk-highlight" 
            style="background-color: ${getRiskColor(score)}; display: inline; cursor: pointer;"
            data-risk-category="${category.replace(/"/g, '&quot;')}"
            data-risk-score="${score}"
            data-risk-reason="${reason.replace(/"/g, '&quot;')}"
          >${text}</span>`
        : text; // Don't highlight if highlights are turned off
      
      // Replace the text with highlighted version
      textWithHighlights = 
        textWithHighlights.substring(0, index) + 
        highlighted + 
        textWithHighlights.substring(index + text.length);
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