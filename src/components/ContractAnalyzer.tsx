'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Clock, FileText, DollarSign, ClipboardList, AlertTriangle, Gavel, Search, Users, Scale } from 'lucide-react';
import { Prompt } from "@/lib/prompt";

// Define the Risk interface
export interface Risk {
  category: string;
  score: string;
  text: string;
  reason?: string;
  location?: string;
  id?: string | number;
}

// Helper function to parse risk data from API response
export function parseRiskData(riskText: string): Risk[] {
  const risks: Risk[] = [];
  
  // Split by "Risk" keyword to identify individual risks
  const riskSections = riskText.split(/Risk\s+\d+:|Risk\s+Category:/);
  
  for (let i = 1; i < riskSections.length; i++) {
    const section = riskSections[i].trim();
    
    try {
      // Parse based on common patterns in the data
      const categoryMatch = section.match(/([^-\n]+)(?:\s+-\s+Risk\s+Score:|:\s*-\s*Risk\s+Score:)/i) 
        || section.match(/([^-\n]+)\s+-\s+/i);
      const scoreMatch = section.match(/Risk\s+Score:\s*([^-\n]+)|-\s*([^-\n]+)\s*-/i);
      const textMatch = section.match(/Risky\s+Contract\s+Text:\s*["'](.+?)["']/i) || 
        section.match(/Risky\s+Contract\s+Text:\s*(.+?)\s*-\s*Why/i) ||
        section.match(/Location:.+?\n"(.+?)"/i);
      const reasonMatch = section.match(/Why\s+This\s+Is\s+a\s+Risk:\s*(.+?)\s*-\s*Contract\s+Location:/i) ||
        section.match(/Why\s+This\s+Is\s+a\s+Risk:\s*(.+?)(\n|$)/i);
      const locationMatch = section.match(/Contract\s+Location:\s*(.+?)(\n|$)/i) ||
        section.match(/Location:\s*(.+?)(\n|$)/i);
      
      // Extract values
      const category = categoryMatch ? categoryMatch[1].trim() : 'Unknown';
      const score = (scoreMatch && (scoreMatch[1] || scoreMatch[2])) ? 
        (scoreMatch[1] || scoreMatch[2]).trim() : 'Unknown';
      const text = textMatch ? textMatch[1].trim() : '';
      const reason = reasonMatch ? reasonMatch[1].trim() : '';
      const location = locationMatch ? locationMatch[1].trim() : '';
      
      // Only add if we have at least some basic info
      if (category !== 'Unknown' || score !== 'Unknown' || text) {
        risks.push({
          category,
          score,
          text,
          reason,
          location,
          id: i
        });
      }
    } catch (error) {
      console.error("Error parsing risk section:", error);
    }
  }
  
  return risks;
}

// Analysis type configuration
const analysisTypeConfig = {
  timeline: {
    id: 'timeline',
    name: 'Timeline Analysis',
    description: 'Extract time-related provisions, dependencies, and scheduling conflicts',
    icon: <Clock className="h-6 w-6" />,
    color: 'bg-blue-100 hover:bg-blue-200 border-blue-300',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-500',
    prompt: `You are an expert construction contract analyst specializing in timeline analysis. Your task is to extract and organize all time-related provisions, identify dependencies between timeline events, and flag potential scheduling conflicts.`
  },
  obligation: {
    id: 'obligation',
    name: 'Obligation Analysis',
    description: 'Extract contractual obligations by category and responsible party',
    icon: <ClipboardList className="h-6 w-6" />,
    color: 'bg-purple-100 hover:bg-purple-200 border-purple-300',
    textColor: 'text-purple-800',
    iconColor: 'text-purple-500',
    prompt: `You are an expert construction contract analyst specializing in obligation analysis. Your task is to extract all contractual obligations, classify them by category and responsible party, and link them to relevant review topics.`
  },
  financial: {
    id: 'financial',
    name: 'Financial Analysis',
    description: 'Analyze financial terms, exposure, and risk allocation',
    icon: <DollarSign className="h-6 w-6" />,
    color: 'bg-green-100 hover:bg-green-200 border-green-300',
    textColor: 'text-green-800',
    iconColor: 'text-green-500',
    prompt: `You are an expert construction contract analyst specializing in financial provision analysis. Your task is to analyze and extract all financial terms, calculate potential financial exposure, and identify risk allocation mechanisms.`
  },
  risk: {
    id: 'risk',
    name: 'Risk Assessment',
    description: 'Identify risk factors, allocations, and mitigation strategies',
    icon: <AlertTriangle className="h-6 w-6" />,
    color: 'bg-red-100 hover:bg-red-200 border-red-300',
    textColor: 'text-red-800',
    iconColor: 'text-red-500',
    prompt: `You are an expert construction contract analyst specializing in risk assessment. Your task is to identify all risk factors, analyze risk allocations, and suggest mitigation strategies.`
  },
  legal: {
    id: 'legal',
    name: 'Legal Compliance',
    description: 'Evaluate regulatory compliance and legal requirements',
    icon: <Gavel className="h-6 w-6" />,
    color: 'bg-indigo-100 hover:bg-indigo-200 border-indigo-300',
    textColor: 'text-indigo-800',
    iconColor: 'text-indigo-500',
    prompt: `You are an expert construction contract analyst specializing in legal compliance. Your task is to evaluate regulatory compliance and identify any legal requirements that need attention.`
  },
  definitions: {
    id: 'definitions',
    name: 'Definition Analysis',
    description: 'Extract and analyze key defined terms and their implications',
    icon: <Search className="h-6 w-6" />,
    color: 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300',
    textColor: 'text-yellow-800',
    iconColor: 'text-yellow-500',
    prompt: `You are an expert construction contract analyst specializing in definition analysis. Your task is to extract all defined terms, analyze their implications, and identify potential inconsistencies or issues.`
  },
  comprehensive: {
    id: 'comprehensive',
    name: 'Comprehensive Analysis',
    description: 'Complete contract review covering all analysis types',
    icon: <FileText className="h-6 w-6" />,
    color: 'bg-gray-100 hover:bg-gray-200 border-gray-300',
    textColor: 'text-gray-800',
    iconColor: 'text-gray-500',
    prompt: `You are an expert construction contract analyst. Your task is to perform a comprehensive analysis of the contract, covering timeline, obligations, financial terms, risk factors, and all other key contract elements.`
  }
};

// Main ContractAnalyzer component
export function EnhancedContractAnalyzer({ 
  contractText,
  contractType = 'general',
  userContext = {}
}: { 
  contractText: string,
  contractType?: string,
  userContext?: any
}) {
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsedRisks, setParsedRisks] = useState<Risk[]>([]);
  const [showHighlighter, setShowHighlighter] = useState(false);
  const [error, setError] = useState("");
  const [activeAnalysisType, setActiveAnalysisType] = useState<string | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<{[key: string]: {
    analysis: string;
    risks: Risk[];
  }}>({});
    
  
  // Determine which analysis types to show based on contract type and user context
  const determineRelevantAnalysisTypes = () => {
    // Default analysis types for all contracts
    const defaultTypes = ['comprehensive', 'risk'];
    
    // Contract-type specific analysis types
    const contractTypeMap: {[key: string]: string[]} = {
      construction: ['timeline', 'obligation', 'financial', 'risk'],
      service: ['obligation', 'financial', 'risk'],
      purchase: ['financial', 'definitions', 'risk'],
      employment: ['obligation', 'legal', 'risk'],
      lease: ['timeline', 'financial', 'risk'],
      loan: ['financial', 'legal', 'risk'],
      license: ['obligation', 'legal', 'risk'],
      consulting: ['obligation', 'timeline', 'risk'],
      general: defaultTypes
    };
    
    // Get contract-specific types or default if contract type not recognized
    let relevantTypes = contractTypeMap[contractType] || defaultTypes;
    
    // Add user-role specific analysis types
    if (userContext.role === 'lawyer') {
      relevantTypes = [...new Set([...relevantTypes, 'legal', 'definitions'])];
    } else if (userContext.role === 'project_manager') {
      relevantTypes = [...new Set([...relevantTypes, 'timeline', 'obligation'])];
    } else if (userContext.role === 'financial_analyst') {
      relevantTypes = [...new Set([...relevantTypes, 'financial'])];
    }
    
    // Add user's preferred analysis types if specified
    if (userContext.preferredAnalysisTypes && Array.isArray(userContext.preferredAnalysisTypes)) {
      relevantTypes = [...new Set([...relevantTypes, ...userContext.preferredAnalysisTypes])];
    }
    
    // Comprehensive analysis is always available
    if (!relevantTypes.includes('comprehensive')) {
      relevantTypes.push('comprehensive');
    }
    
    return relevantTypes;
  };
  
  // Get relevant analysis types
  const relevantAnalysisTypeIds = determineRelevantAnalysisTypes();
  
  // Get the full configuration for each relevant analysis type
  const analysisTypes = relevantAnalysisTypeIds
    .map(id => analysisTypeConfig[id as keyof typeof analysisTypeConfig])
    .filter(Boolean);
  
  const analyzeContract = async (analysisTypeId: string) => {
    // Check if we already have cached results for this analysis type
    if (analysisHistory[analysisTypeId]) {
      setAnalysis(analysisHistory[analysisTypeId].analysis);
      setParsedRisks(analysisHistory[analysisTypeId].risks);
      setShowHighlighter(analysisHistory[analysisTypeId].risks.length > 0);
      setActiveAnalysisType(analysisTypeId);
      return;
    }
    
    setLoading(true);
    setError("");
    setActiveAnalysisType(analysisTypeId);
    
    try {
      // Get the analysis config
      const analysisConfig = analysisTypeConfig[analysisTypeId as keyof typeof analysisTypeConfig];
      
      if (!analysisConfig) {
        throw new Error(`Unknown analysis type: ${analysisTypeId}`);
      }
      
      // Use the specialized prompt for this analysis type
      const promptHeader = analysisConfig.prompt || Prompt;
      const fullPrompt = `${promptHeader}\n\n${contractText}`;
      
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [{ role: "user", content: fullPrompt }],
          temperature: 0.01,
        }),
      });
      
      if (!res.ok) {
        throw new Error(`API request failed with status ${res.status}`);
      }
      
      const data = await res.json();
      const analysisText = data.choices?.[0]?.message?.content || "No response.";
      
      // Set the raw analysis text
      setAnalysis(analysisText);
      
      // Parse the risks from the analysis
      try {
        const risks = parseRiskData(analysisText);
        setParsedRisks(risks);
        
        // Only show highlighter if we have risks and contract text
        setShowHighlighter(risks.length > 0 && contractText.length > 0);
        
        // Cache the results
        setAnalysisHistory(prev => ({
          ...prev,
          [analysisTypeId]: {
            analysis: analysisText,
            risks: risks
          }
        }));
      } catch (parseError) {
        console.error("Error parsing risks:", parseError);
        setError("Failed to parse risk data from analysis.");
        setShowHighlighter(false);
      }
    } catch (err) {
      console.error("Error analyzing contract:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setShowHighlighter(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Analysis Type Buttons */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Analysis Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {analysisTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => analyzeContract(type.id)}
              className={`p-3 rounded-lg border transition-colors flex items-center ${type.color} ${
                activeAnalysisType === type.id ? 'ring-2 ring-blue-500' : ''
              }`}
              disabled={loading}
            >
              <div className="mr-3">
                {React.cloneElement(type.icon, { className: `h-5 w-5 ${type.iconColor}` })}
              </div>
              <div className="text-left">
                <h4 className={`font-medium ${type.textColor}`}>{type.name}</h4>
                <p className="text-xs text-gray-600">{type.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Loading indicator */}
      {loading && (
        <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
            <span>Analyzing contract...</span>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
          {error}
        </div>
      )}
      
      {/* Analysis Results */}
      {showHighlighter ? (
        <ContractTextHighlighter 
          contractText={contractText} 
          risks={parsedRisks}
        />
      ) : (
        analysis && (
          <div className="prose max-w-none mt-6">
            <h2>Analysis Results</h2>
            <p className="text-sm text-gray-500 mb-2">
              Analysis type: {activeAnalysisType && analysisTypeConfig[activeAnalysisType as keyof typeof analysisTypeConfig]?.name}
            </p>
            <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded border">{analysis}</pre>
          </div>
        )
      )}
    </div>
  );
}

// ContractTextHighlighter component
interface HighlighterProps {
  contractText: string;
  risks: Risk[];
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
}

export const ContractTextHighlighter: React.FC<HighlighterProps> = ({ 
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
  const [highlightStats, setHighlightStats] = useState<{total: number, found: number}>({
    total: 0,
    found: 0
  });

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

  // Find article/section references in the contract
  const findSectionByReference = (contractText: string, reference: string): { text: string, index: number } | null => {
    // Common patterns for contract sections
    const patterns = [
      // Article X
      new RegExp(`(ARTICLE\\s+${reference.replace(/article\s+/i, '')}[\\s\\S]*?(?=ARTICLE|$))`, 'i'),
      // Article X.Y
      new RegExp(`((?:ARTICLE|Section)\\s+${reference.replace(/article\s+|section\s+/i, '')}[\\s\\S]*?(?=(?:ARTICLE|Section)|$))`, 'i'),
      // X.Y format
      new RegExp(`((?:^|\\n)\\s*${reference}\\s*[\\s\\S]*?(?=(?:^|\\n)\\s*\\d+\\.\\d+|$))`, 'i'),
      // Look for the exact location reference
      new RegExp(`(${reference.replace(/[-[\]{}()*+?.,\\^$|#\\s]/g, '\\$&')}[\\s\\S]*?(?=\\n\\n|$))`, 'i')
    ];
    
    for (const pattern of patterns) {
      const match = contractText.match(pattern);
      if (match && match[1]) {
        const index = contractText.indexOf(match[1]);
        return { text: match[1].trim(), index };
      }
    }
    
    return null;
  };

  // Generate highlighted HTML with improved text search
  useEffect(() => {
    if (!contractText || filteredRisks.length === 0) {
      setHighlightedHtml(contractText || '');
      setHighlightStats({ total: filteredRisks.length, found: 0 });
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
      riskId: string | number;
    };
    
    const sections: HighlightSection[] = [];
    let foundCount = 0;
    
    // Find all risk text occurrences in the full text with more robust search
    filteredRisks.forEach(risk => {
      let found = false;
      
      // Skip if no text to highlight
      if (!risk.text || risk.text.trim() === '') {
        return;
      }
      
      // Clean the risk text for better matching
      const cleanRiskText = risk.text.trim()
        .replace(/^["']|["']$/g, '') // Remove quotes at start/end
        .replace(/\\n/g, '\n')       // Handle newline characters
        .trim();
      
      if (cleanRiskText.length === 0) return;
      
      // Try to find exact matches first
      let startIndex = 0;
      let foundIndex;
      
      // Find all occurrences of this risk text
      while ((foundIndex = contractText.indexOf(cleanRiskText, startIndex)) !== -1) {
        foundCount++;
        found = true;
        
        sections.push({
          text: cleanRiskText,
          score: risk.score,
          startIndex: foundIndex,
          endIndex: foundIndex + cleanRiskText.length,
          category: risk.category || '',
          reason: risk.reason || '',
          riskId: risk.id || ''
        });
        
        // Move to position after this match to find the next one
        startIndex = foundIndex + 1;
      }
      
      // If exact match wasn't found, try location-based matching
      if (!found && risk.location) {
        const locationReference = risk.location.trim();
        const sectionMatch = findSectionByReference(contractText, locationReference);
        
        if (sectionMatch) {
          foundCount++;
          found = true;
          
          // Try to find the risk text within this section
          const subIndex = sectionMatch.text.indexOf(cleanRiskText);
          
          if (subIndex >= 0) {
            // Found the exact text within the section
            sections.push({
              text: cleanRiskText,
              score: risk.score,
              startIndex: sectionMatch.index + subIndex,
              endIndex: sectionMatch.index + subIndex + cleanRiskText.length,
              category: risk.category || '',
              reason: risk.reason || '',
              riskId: risk.id || ''
            });
          } else {
            // Highlight the whole section if exact text not found
            sections.push({
              text: sectionMatch.text,
              score: risk.score,
              startIndex: sectionMatch.index,
              endIndex: sectionMatch.index + sectionMatch.text.length,
              category: risk.category || '',
              reason: risk.reason || '',
              riskId: risk.id || ''
            });
          }
        } else if (cleanRiskText.length > 15) {
          // For longer texts, try a fuzzy match using keywords
          const words = cleanRiskText.split(' ');
          
          // Look for multiple consecutive words (3+ word phrases)
          for (let i = 0; i <= words.length - 3; i++) {
            const phrase = words.slice(i, i + 3).join(' ');
            const phraseIndex = contractText.indexOf(phrase);
            
            if (phraseIndex >= 0) {
              // Found partial match, look for how much of the text matches
              let startPos = phraseIndex;
              let endPos = phraseIndex + phrase.length;
              
              // Try to extend the match backward
              while (startPos > 0) {
                const prevWord = words[i - 1];
                if (prevWord && contractText.substring(startPos - prevWord.length - 1, startPos).includes(prevWord)) {
                  startPos -= prevWord.length + 1;
                  i--;
                } else {
                  break;
                }
              }
              
              // Try to extend the match forward
              let j = i + 3;
              while (j < words.length) {
                const nextWord = words[j];
                if (nextWord && contractText.substring(endPos, endPos + nextWord.length + 1).includes(nextWord)) {
                  endPos += nextWord.length + 1;
                  j++;
                } else {
                  break;
                }
              }
              
              // If we matched enough of the text (at least 60%), add it
              const matchLength = endPos - startPos;
              const originalLength = cleanRiskText.length;
              
              if (matchLength > originalLength * 0.6) {
                foundCount++;
                found = true;
                
                sections.push({
                  text: contractText.substring(startPos, endPos),
                  score: risk.score,
                  startIndex: startPos,
                  endIndex: endPos,
                  category: risk.category || '',
                  reason: risk.reason || '',
                  riskId: risk.id || ''
                });
                
                // Only use the first good match
                break;
              }
            }
          }
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
      const { score, startIndex, endIndex, category, reason, riskId } = section;
      
      // Extract the actual text from the original contract text
      const actualText = contractText.substring(startIndex, endIndex);
      
      // Create the highlighted version with tooltip attributes
      const highlighted = showHighlights 
        ? `<span class="risk-highlight" 
            style="background-color: ${getRiskColor(score)}; display: inline; cursor: pointer;"
            data-risk-category="${category.replace(/"/g, '&quot;')}"
            data-risk-score="${score}"
            data-risk-reason="${reason.replace(/"/g, '&quot;')}"
            data-risk-id="${riskId}"
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
    
    // Update stats
    setHighlightStats({
      total: filteredRisks.length,
      found: foundCount
    });
    
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
        const riskId = target.getAttribute('data-risk-id') || '';
        
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
          <div style="font-weight: bold; display: flex; justify-content: space-between;">
            <span>${category} (${score})</span>
            <span style="opacity: 0.7">Risk ID: ${riskId}</span>
          </div>
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
        Showing {filteredRisks.length} of {risks.length} risks | 
        Found {highlightStats.found} of {highlightStats.total} in document
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