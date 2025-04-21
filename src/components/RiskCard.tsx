// src/components/ContractAnalyzer/AnalysisResults/RiskCard.tsx
import React from 'react';
import { Text, DefaultButton } from '@fluentui/react';
import { RiskCardProps } from '@/types';
import { getRiskScoreColor } from '@/utils/formatters';

/**
 * Component for displaying an individual contract risk
 */
const RiskCard: React.FC<RiskCardProps> = ({
  risk,
  index,
  highlightInDocument,
  generateFixSuggestion
}) => {
  return (
    <div 
      className="border border-gray-200 rounded-lg p-4 mb-4 bg-white shadow-sm"
      style={{ borderLeftWidth: '4px', borderLeftColor: getRiskScoreColor(risk.score) }}
    >
      <div className="flex justify-between items-center mb-2">
        <Text variant="large" className="font-semibold">
          Risk {index + 1}: {risk.category}
        </Text>
        <div 
          className="px-2 py-1 rounded text-xs font-bold text-white"
          style={{ backgroundColor: getRiskScoreColor(risk.score) }}
        >
          {risk.score}
        </div>
      </div>

      <Text variant="small" className="text-gray-500 mb-2">
        <b>Location:</b> {risk.location}
      </Text>

      <div className="bg-gray-50 p-3 rounded mb-2 border-l-2 border-gray-300 italic">
        "{risk.text}"
      </div>

      <Text>
        <b>Why This Is a Risk:</b> {risk.reason}
      </Text>
      
      <div className="mt-3 flex gap-2">
        <DefaultButton
          text="Highlight in Document"
          iconProps={{ iconName: 'Search' }}
          onClick={() => highlightInDocument(risk, index)}
          className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-300 text-xs"
        />
        <DefaultButton
          text="Suggest Fix"
          iconProps={{ iconName: 'Edit' }}
          onClick={() => generateFixSuggestion(risk)}
          className="bg-green-50 hover:bg-green-100 text-green-700 border-green-300 text-xs"
        />
      </div>
    </div>
  );
};

export default RiskCard;