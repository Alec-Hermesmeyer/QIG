'use client';

import React, { useState, useEffect } from 'react';
import { Risk } from '@/lib/useContractAnalyst';
import { Stack, Text, SearchBox, Dropdown, IDropdownOption } from '@fluentui/react';

interface Props {
  contractText: string;
  risks: Risk[];
}

export const ContractTextHighlighter: React.FC<Props> = ({ contractText, risks }) => {
  const [filteredRisks, setFilteredRisks] = useState<Risk[]>(risks);
  const [searchText, setSearchText] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [highlightedHtml, setHighlightedHtml] = useState<string>('');

  const severityOptions: IDropdownOption[] = [
    { key: 'all', text: 'All Risks' },
    { key: 'critical', text: 'Critical Only' },
    { key: 'high', text: 'High and Above' },
    { key: 'medium', text: 'Medium and Above' },
    { key: 'low', text: 'All Risks' },
  ];

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
          risk.reason.toLowerCase().includes(searchLower) ||
          risk.location.toLowerCase().includes(searchLower)
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
          category: risk.category,
          reason: risk.reason,
        });
      }
    });
    
    // Sort sections by index (from end to start to avoid position changes)
    sections.sort((a, b) => b.index - a.index);
    
    // Apply highlights from end to start
    for (const section of sections) {
      const { text, score, index, category, reason } = section;
      
      // Create the highlighted version with tooltip
      const highlighted = `<span class="risk-highlight" 
        style="background-color: ${getRiskColor(score)}; position: relative; cursor: pointer;"
        data-risk-category="${category}"
        data-risk-score="${score}"
        data-risk-reason="${reason}"
      >${text}</span>`;
      
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
  }, [contractText, filteredRisks]);

  // Add tooltip handlers
  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('risk-highlight')) {
        // Create tooltip content
        const category = target.getAttribute('data-risk-category');
        const score = target.getAttribute('data-risk-score');
        const reason = target.getAttribute('data-risk-reason');
        
        const tooltip = document.createElement('div');
        tooltip.className = 'risk-tooltip';
        tooltip.innerHTML = `
          <div style="background-color: white; border: 1px solid #ccc; border-radius: 4px; 
                      padding: 8px; width: 300px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                      position: absolute; z-index: 100; top: 100%; left: 0;">
            <div style="font-weight: bold;">${category} (${score})</div>
            <div style="margin-top: 4px;">${reason}</div>
          </div>
        `;
        
        // Position tooltip
        target.style.position = 'relative';
        target.appendChild(tooltip);
      }
    };
    
    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('risk-highlight')) {
        const tooltip = target.querySelector('.risk-tooltip');
        if (tooltip) {
          target.removeChild(tooltip);
        }
      }
    };
    
    // Add event listeners
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    
    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
    };
  }, []);

  return (
    <div className="contract-highlighter">
      <Stack tokens={{ childrenGap: 16 }}>
        <Stack horizontal tokens={{ childrenGap: 16 }}>
          <Stack.Item grow>
            <SearchBox
              placeholder="Search in risk items..."
              onChange={(_, newValue) => setSearchText(newValue || '')}
              styles={{ root: { width: '100%' } }}
            />
          </Stack.Item>
          <Dropdown
            label="Filter by severity:"
            selectedKey={selectedSeverity}
            options={severityOptions}
            onChange={(_, option) => option && setSelectedSeverity(option.key as string)}
            styles={{ root: { width: 200 } }}
          />
        </Stack>

        <div className="filter-summary">
          <Text>
            Showing {filteredRisks.length} of {risks.length} risks
          </Text>
        </div>

        <div
          className="contract-text"
          style={{
            padding: '16px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            backgroundColor: '#ffffff',
            height: '600px',
            overflowY: 'auto',
            lineHeight: '1.6',
          }}
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      </Stack>
    </div>
  );
};