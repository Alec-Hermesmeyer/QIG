import React, { useState } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

// Helper function to extract risks from raw text
interface Risk {
    category: string;
    score: string;
    text: string;
    reason: string;
    location: string;
}

const extractRisksFromText = (analysisText: string): Risk[] => {
    // Look for patterns like "Risk Category: X" in the text
    const risks: Risk[] = [];
    const riskRegex = /Risk Category:\s*(.*?)\s*\n\s*Risk Score:\s*(.*?)\s*\n\s*Risky Contract Text:\s*"(.*?)"\s*\n\s*Why This Is a Risk:\s*(.*?)\s*\n\s*Contract Location:\s*(.*?)(?:\n\n|\n$|$)/gs;
    
    let match;
    while ((match = riskRegex.exec(analysisText)) !== null) {
        risks.push({
            category: match[1]?.trim(),
            score: match[2]?.trim(),
            text: match[3]?.trim(),
            reason: match[4]?.trim(),
            location: match[5]?.trim()
        });
    }
    
    return risks;
};

// Helper function to extract mitigation points from raw text
interface MitigationExtractor {
    (analysisText: string): string[];
}

const extractMitigationFromText: MitigationExtractor = (analysisText) => {
    const mitigations: string[] = [];
    
    // Look for a mitigation section
    const mitigationSectionRegex = /Mitigation Summary:(.+?)(?:\n\n|\n[A-Z]|$)/gs;
    const mitigationSection = mitigationSectionRegex.exec(analysisText);
    
    if (mitigationSection && mitigationSection[1]) {
        // Extract bullet points
        const mitigationText = mitigationSection[1];
        const bulletPointRegex = /-\s*(.*?)(?:\n-|\n\n|$)/gs;
        
        let bulletMatch: RegExpExecArray | null;
        while ((bulletMatch = bulletPointRegex.exec(mitigationText)) !== null) {
            if (bulletMatch[1]?.trim()) {
                mitigations.push(bulletMatch[1].trim());
            }
        }
        
        // If no bullet points found, try paragraph extraction
        if (mitigations.length === 0) {
            mitigations.push(...mitigationText.split('\n').map(line => line.trim()).filter(line => line));
        }
    }
    
    return mitigations;
};

// Helper function to get color based on risk score
const getRiskScoreColor = (score: string): string => {
    switch (score.toLowerCase()) {
        case 'critical': return '#ef4444'; // Red
        case 'high': return '#f97316';     // Orange
        case 'medium': return '#eab308';   // Yellow
        case 'low': return '#22c55e';      // Green
        default: return '#6b7280';         // Gray
    }
};

interface StyledFallbackAnalysisProps {
  analysisText: string;
}

const StyledFallbackAnalysis = ({ analysisText }: StyledFallbackAnalysisProps) => {
  const [activeTab, setActiveTab] = useState(0);
  
  // Parse the raw text to extract risks and mitigation points
  const extractedRisks = extractRisksFromText(analysisText);
  const extractedMitigations = extractMitigationFromText(analysisText);
  
  // Group risks by severity for easy filtering
  const criticalRisks = extractedRisks.filter(risk => risk.score.toLowerCase() === 'critical');
  const highRisks = extractedRisks.filter(risk => risk.score.toLowerCase() === 'high');
  const mediumRisks = extractedRisks.filter(risk => risk.score.toLowerCase() === 'medium');
  const lowRisks = extractedRisks.filter(risk => risk.score.toLowerCase() === 'low');
  
  return (
    <div className="h-full overflow-hidden flex flex-col">
      <Tabs 
        selectedIndex={activeTab} 
        onSelect={index => setActiveTab(index)}
        className="h-full flex flex-col"
      >
        <TabList className="flex border-b">
          <Tab className="px-4 py-2 cursor-pointer border-b-2 border-transparent hover:text-blue-600 hover:border-blue-600 focus:outline-none aria-selected:border-blue-600 aria-selected:text-blue-600">
            Raw Analysis
          </Tab>
          {extractedRisks.length > 0 && (
            <Tab className="px-4 py-2 cursor-pointer border-b-2 border-transparent hover:text-blue-600 hover:border-blue-600 focus:outline-none aria-selected:border-blue-600 aria-selected:text-blue-600">
              Parsed Risks ({extractedRisks.length})
            </Tab>
          )}
          {criticalRisks.length > 0 && (
            <Tab className="px-4 py-2 cursor-pointer border-b-2 border-transparent hover:text-red-600 hover:border-red-600 focus:outline-none aria-selected:border-red-600 aria-selected:text-red-600">
              Critical ({criticalRisks.length})
            </Tab>
          )}
          {highRisks.length > 0 && (
            <Tab className="px-4 py-2 cursor-pointer border-b-2 border-transparent hover:text-orange-600 hover:border-orange-600 focus:outline-none aria-selected:border-orange-600 aria-selected:text-orange-600">
              High ({highRisks.length})
            </Tab>
          )}
          {extractedMitigations.length > 0 && (
            <Tab className="px-4 py-2 cursor-pointer border-b-2 border-transparent hover:text-purple-600 hover:border-purple-600 focus:outline-none aria-selected:border-purple-600 aria-selected:text-purple-600">
              Mitigation
            </Tab>
          )}
        </TabList>

        {/* Tab panels */}
        <div className="overflow-y-auto flex-grow">
          {/* Raw text panel */}
          <TabPanel>
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4">Full Analysis</h3>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 whitespace-pre-wrap">
                {analysisText}
              </div>
            </div>
          </TabPanel>
          
          {/* All extracted risks */}
          {extractedRisks.length > 0 && (
            <TabPanel>
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4">All Identified Risks</h3>
                {extractedRisks.map((risk, index) => (
                  <RiskCard key={index} risk={risk} index={index} />
                ))}
              </div>
            </TabPanel>
          )}
          
          {/* Critical risks */}
          {criticalRisks.length > 0 && (
            <TabPanel>
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4">Critical Risks</h3>
                {criticalRisks.map((risk, index) => (
                  <RiskCard key={index} risk={risk} index={index} />
                ))}
              </div>
            </TabPanel>
          )}
          
          {/* High risks */}
          {highRisks.length > 0 && (
            <TabPanel>
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4">High Risks</h3>
                {highRisks.map((risk, index) => (
                  <RiskCard key={index} risk={risk} index={index} />
                ))}
              </div>
            </TabPanel>
          )}
          
          {/* Mitigation suggestions */}
          {extractedMitigations.length > 0 && (
            <TabPanel>
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4">Mitigation Strategies</h3>
                <div className="bg-green-50 border-l-4 border-green-400 p-4">
                  <ul className="list-disc ml-5 space-y-2">
                    {extractedMitigations.map((point, index) => (
                      <li key={index} className="text-gray-800">{point}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </TabPanel>
          )}
        </div>
      </Tabs>
    </div>
  );
};

// Individual risk card component
interface RiskCardProps {
  risk: Risk;
  index: number;
}

const RiskCard = ({ risk, index }: RiskCardProps) => {
  return (
    <div 
      className="mb-4 p-4 rounded-lg border shadow-sm"
      style={{ borderLeftWidth: '4px', borderLeftColor: getRiskScoreColor(risk.score) }}
    >
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-medium text-gray-900">
          {index + 1}. {risk.category}
        </h4>
        <span 
          className="px-2 py-1 text-xs font-bold text-white rounded-md"
          style={{ backgroundColor: getRiskScoreColor(risk.score) }}
        >
          {risk.score}
        </span>
      </div>
      
      <div className="mb-2">
        <span className="text-sm text-gray-500">Location: {risk.location}</span>
      </div>
      
      <div className="bg-gray-100 p-2 rounded-md mb-3 italic text-gray-700">
        "{risk.text}"
      </div>
      
      <div>
        <span className="font-medium">Why This Is a Risk:</span>
        <p className="text-gray-700">{risk.reason}</p>
      </div>
    </div>
  );
};

export default StyledFallbackAnalysis;