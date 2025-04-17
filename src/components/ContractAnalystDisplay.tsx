import React, { useState } from 'react';
import { Risk } from '@/lib/useContractAnalyst';
import ContractAnalysisModal from './ContractAnalystModal';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Check if we have any risks to display
  const hasRisks = risks.length > 0;
  
  // Open modal function
  const openModal = () => {
    setIsModalOpen(true);
  };
  
  // Close modal function
  const closeModal = () => {
    setIsModalOpen(false);
  };
  
  return (
    <div className="p-4">
      <div className="mb-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Contract Risk Analysis</h2>
          
          <button
            onClick={openModal}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            View Risk Assessment
          </button>
        </div>
        
        {/* Summary information visible without opening modal */}
        <div className="mt-4">
          {!hasRisks ? (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-yellow-700">
                No risks were detected in the contract. Please check if the document was processed correctly.
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
              <p className="font-medium">
                {risks.length} risks identified in this contract
              </p>
              
              <div className="flex flex-wrap gap-2 mt-2">
                {/* Risk badges showing counts by severity */}
                {risks.filter(risk => risk.score.toLowerCase() === 'critical').length > 0 && (
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                    {risks.filter(risk => risk.score.toLowerCase() === 'critical').length} Critical
                  </span>
                )}
                
                {risks.filter(risk => risk.score.toLowerCase() === 'high').length > 0 && (
                  <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                    {risks.filter(risk => risk.score.toLowerCase() === 'high').length} High
                  </span>
                )}
                
                {risks.filter(risk => risk.score.toLowerCase() === 'medium').length > 0 && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                    {risks.filter(risk => risk.score.toLowerCase() === 'medium').length} Medium
                  </span>
                )}
                
                {risks.filter(risk => risk.score.toLowerCase() === 'low').length > 0 && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    {risks.filter(risk => risk.score.toLowerCase() === 'low').length} Low
                  </span>
                )}
              </div>
              
              {/* Brief note about mitigation */}
              {mitigationPoints.length > 0 && (
                <p className="mt-3 text-sm text-gray-600">
                  {mitigationPoints.length} mitigation strategies available. Click "View Risk Assessment" for details.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* The modal component */}
      <ContractAnalysisModal 
        isOpen={isModalOpen}
        onClose={closeModal}
        risks={risks}
        mitigationPoints={mitigationPoints}
        contractText={contractText}
        onTabChange={onTabChange}
        documentTitle={documentTitle}
      />
    </div>
  );
};

export default ContractAnalysisDisplay;