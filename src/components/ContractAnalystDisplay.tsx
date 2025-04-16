import React, { useState, useEffect } from 'react';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';
import { Risk } from '@/lib/useContractAnalyst';
import { ContractTextHighlighter } from './ContractTextHighlighter';
import { ContractExporter } from './ContractExporter';

// Helper function to get color based on risk score
const getRiskScoreColor = (score: string) => {
  switch (score.toLowerCase()) {
    case 'critical': return '#ef4444'; // Red
    case 'high': return '#f97316';     // Orange
    case 'medium': return '#eab308';   // Yellow
    case 'low': return '#22c55e';      // Green
    default: return '#6b7280';         // Gray
  }
};

interface ContractAnalysisDisplayProps {
  risks: Risk[];
  mitigationPoints: string[];
  contractText?: string;
  onTabChange?: (index: number) => void;
  documentTitle?: string;
}

const ContractAnalysisDisplay: React.FC<ContractAnalysisDisplayProps> = ({ 
  risks, 
  mitigationPoints,
  contractText = '',
  onTabChange,
  documentTitle = 'Contract Analysis'
}) => {
  const [activeTab, setActiveTab] = useState(0);
  
  // Group risks by severity for easy filtering
  const criticalRisks = risks.filter(risk => risk.score.toLowerCase() === 'critical');
  const highRisks = risks.filter(risk => risk.score.toLowerCase() === 'high');
  const mediumRisks = risks.filter(risk => risk.score.toLowerCase() === 'medium');
  const lowRisks = risks.filter(risk => risk.score.toLowerCase() === 'low');
  
  // Check if we have any risks to display
  const hasRisks = risks.length > 0;

  // Determine if we should show the export button
  const showExportButton = hasRisks && contractText;

  // If risks are found and contractText is provided, auto-select the Redline View tab
  useEffect(() => {
    if (hasRisks && contractText && risks.length > 0) {
      // Find the index of the Redline View tab
      let redlineTabIndex = 0;
      
      // Count tabs to find redline tab index
      if (hasRisks) redlineTabIndex++; // Summary tab
      if (criticalRisks.length > 0) redlineTabIndex++;
      if (highRisks.length > 0) redlineTabIndex++;
      if (mediumRisks.length > 0) redlineTabIndex++;
      if (lowRisks.length > 0) redlineTabIndex++;
      redlineTabIndex++; // Mitigation tab
      
      // Set the active tab to the Redline View
      setActiveTab(redlineTabIndex);
    }
  }, [hasRisks, contractText, risks.length]);
  
  // Handle tab changes
  const handleTabChange = (index: number) => {
    setActiveTab(index);
    if (onTabChange) {
      onTabChange(index);
    }
  };

  // Load the document export script
  useEffect(() => {
    if (typeof window !== 'undefined' && showExportButton) {
      const script = document.createElement('script');
      script.src = '/js/document-export.js'; // Adjust the path based on your public folder structure
      script.async = true;
      document.body.appendChild(script);
      
      return () => {
        document.body.removeChild(script);
      };
    }
  }, [showExportButton]);
  
  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Error message when no risks are found */}
      {!hasRisks && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <p className="text-yellow-700">
            No risks were detected in the contract. Please check if the document was processed correctly.
          </p>
        </div>
      )}
      
      {/* Tabs navigation */}
      {hasRisks && (
        <Tabs 
          selectedIndex={activeTab} 
          onSelect={handleTabChange}
          className="h-full flex flex-col"
        >
          <div className="flex justify-between items-center border-b">
            <TabList className="flex overflow-x-auto">
              <Tab className="px-4 py-2 cursor-pointer border-b-2 border-transparent hover:text-blue-600 hover:border-blue-600 focus:outline-none aria-selected:border-blue-600 aria-selected:text-blue-600 whitespace-nowrap">
                Summary ({risks.length})
              </Tab>
              {criticalRisks.length > 0 && (
                <Tab className="px-4 py-2 cursor-pointer border-b-2 border-transparent hover:text-red-600 hover:border-red-600 focus:outline-none aria-selected:border-red-600 aria-selected:text-red-600 whitespace-nowrap">
                  Critical ({criticalRisks.length})
                </Tab>
              )}
              {highRisks.length > 0 && (
                <Tab className="px-4 py-2 cursor-pointer border-b-2 border-transparent hover:text-orange-600 hover:border-orange-600 focus:outline-none aria-selected:border-orange-600 aria-selected:text-orange-600 whitespace-nowrap">
                  High ({highRisks.length})
                </Tab>
              )}
              {mediumRisks.length > 0 && (
                <Tab className="px-4 py-2 cursor-pointer border-b-2 border-transparent hover:text-yellow-600 hover:border-yellow-600 focus:outline-none aria-selected:border-yellow-600 aria-selected:text-yellow-600 whitespace-nowrap">
                  Medium ({mediumRisks.length})
                </Tab>
              )}
              {lowRisks.length > 0 && (
                <Tab className="px-4 py-2 cursor-pointer border-b-2 border-transparent hover:text-green-600 hover:border-green-600 focus:outline-none aria-selected:border-green-600 aria-selected:text-green-600 whitespace-nowrap">
                  Low ({lowRisks.length})
                </Tab>
              )}
              <Tab className="px-4 py-2 cursor-pointer border-b-2 border-transparent hover:text-purple-600 hover:border-purple-600 focus:outline-none aria-selected:border-purple-600 aria-selected:text-purple-600 whitespace-nowrap">
                Mitigation
              </Tab>
              
              {/* Redline tab - always show if contract text is available */}
              {contractText && (
                <Tab className="px-4 py-2 cursor-pointer border-b-2 border-transparent hover:text-rose-600 hover:border-rose-600 focus:outline-none aria-selected:border-rose-600 aria-selected:text-rose-600 whitespace-nowrap">
                  Redline View
                </Tab>
              )}
            </TabList>
            
            {/* Export button - show when we have risks and contract text */}
            {/* {showExportButton && (
              <div className="px-4">
                <ContractExporter 
                  contractText={contractText}
                  risks={risks}
                  mitigationPoints={mitigationPoints}
                  documentTitle={documentTitle}
                />
              </div>
            )} */}
          </div>

          {/* Tab panels */}
          <div className="overflow-y-auto flex-grow">
            {/* All risks summary */}
            <TabPanel>
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4">All Identified Risks</h3>
                {risks.map((risk, index) => (
                  <RiskCard key={index} risk={risk} index={index} />
                ))}
              </div>
            </TabPanel>
            
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
            
            {/* Medium risks */}
            {mediumRisks.length > 0 && (
              <TabPanel>
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Medium Risks</h3>
                  {mediumRisks.map((risk, index) => (
                    <RiskCard key={index} risk={risk} index={index} />
                  ))}
                </div>
              </TabPanel>
            )}
            
            {/* Low risks */}
            {lowRisks.length > 0 && (
              <TabPanel>
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-4">Low Risks</h3>
                  {lowRisks.map((risk, index) => (
                    <RiskCard key={index} risk={risk} index={index} />
                  ))}
                </div>
              </TabPanel>
            )}
            
            {/* Mitigation suggestions */}
            <TabPanel>
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4">Mitigation Strategies</h3>
                {mitigationPoints.length > 0 ? (
                  <div className="bg-green-50 border-l-4 border-green-400 p-4">
                    <ul className="list-disc ml-5 space-y-2">
                      {mitigationPoints.map((point, index) => (
                        <li key={index} className="text-gray-800">{point}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No mitigation strategies were provided.</p>
                )}
              </div>
            </TabPanel>
            
            {/* Redline View - always provide panel if contract text exists */}
            {contractText && (
              <TabPanel>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Contract Redline View</h3>
                    {showExportButton && (
                      <ContractExporter 
                        contractText={contractText}
                        risks={risks}
                        mitigationPoints={mitigationPoints}
                        documentTitle={documentTitle}
                      />
                    )}
                  </div>
                  <ContractTextHighlighter 
                    contractText={contractText} 
                    risks={risks} 
                    containerClassName="min-h-screen"
                    containerStyle={{ 
                      height: 'calc(100vh - 240px)',
                      maxHeight: '800px'
                    }}
                  />
                </div>
              </TabPanel>
            )}
          </div>
        </Tabs>
      )}
    </div>
  );
};

// Individual risk card component
const RiskCard: React.FC<{ risk: Risk; index: number }> = ({ risk, index }) => {
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

export default ContractAnalysisDisplay;