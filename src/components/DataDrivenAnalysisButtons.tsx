import React from 'react';
import { Clock, FileText, DollarSign, ClipboardList, AlertTriangle, Gavel, Search, Users, Scale } from 'lucide-react';

// Map of all possible analysis types with their configuration
export const analysisTypeConfig = {
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
  stakeholders: {
    id: 'stakeholders',
    name: 'Stakeholder Mapping',
    description: 'Identify all parties and their roles, rights, and responsibilities',
    icon: <Users className="h-6 w-6" />,
    color: 'bg-teal-100 hover:bg-teal-200 border-teal-300',
    textColor: 'text-teal-800',
    iconColor: 'text-teal-500',
    prompt: `You are an expert construction contract analyst specializing in stakeholder mapping. Your task is to identify all parties mentioned in the contract and analyze their roles, rights, and responsibilities.`
  },
  disputes: {
    id: 'disputes',
    name: 'Dispute Resolution',
    description: 'Analyze dispute resolution mechanisms and procedures',
    icon: <Scale className="h-6 w-6" />,
    color: 'bg-orange-100 hover:bg-orange-200 border-orange-300',
    textColor: 'text-orange-800',
    iconColor: 'text-orange-500',
    prompt: `You are an expert construction contract analyst specializing in dispute resolution. Your task is to analyze all dispute resolution mechanisms, procedures, and identify potential improvement areas.`
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
  },
  
};

// Helper function to determine which analysis types to show based on contract type and user context
const determineRelevantAnalysisTypes = (contractType: string, userContext: any = {}) => {
  // Default analysis types for all contracts
  const defaultTypes = ['comprehensive', 'risk'];
  
  // Contract-type specific analysis types
  const contractTypeMap: {[key: string]: string[]} = {
    construction: ['timeline', 'obligation', 'financial'],
    service: ['obligation', 'financial', 'stakeholders'],
    purchase: ['financial', 'stakeholders', 'definitions'],
    employment: ['obligation', 'legal', 'disputes'],
    lease: ['timeline', 'financial', 'legal'],
    loan: ['financial', 'legal', 'definitions'],
    license: ['obligation', 'legal', 'definitions'],
    consulting: ['obligation', 'timeline', 'stakeholders'],
    distribution: ['obligation', 'financial', 'stakeholders'],
    general: defaultTypes
  };
  
  // Get contract-specific types or default if contract type not recognized
  let relevantTypes = contractTypeMap[contractType] || defaultTypes;
  
  // Add user-role specific analysis types
  if (userContext.role === 'lawyer') {
    relevantTypes = [...new Set([...relevantTypes, 'legal', 'disputes', 'definitions'])];
  } else if (userContext.role === 'project_manager') {
    relevantTypes = [...new Set([...relevantTypes, 'timeline', 'obligation', 'stakeholders'])];
  } else if (userContext.role === 'financial_analyst') {
    relevantTypes = [...new Set([...relevantTypes, 'financial', 'risk'])];
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

// Main component for data-driven analysis buttons
interface DataDrivenAnalysisButtonsProps {
  onAnalysisSelect: (analysisType: string, prompt: string) => void;
  contractType?: string;
  userContext?: any;
  customAnalysisTypes?: string[] | null;
  maxButtons?: number | null;
  layout?: 'grid' | 'flex';
  showIcons?: boolean;
}

export const DataDrivenAnalysisButtons: React.FC<DataDrivenAnalysisButtonsProps> = ({ 
  onAnalysisSelect, 
  contractType = 'general',
  userContext = {},
  customAnalysisTypes = null,
  maxButtons = null,
  layout = 'grid',
  showIcons = true
}) => {
  // Determine which analysis types to show (either use custom list or determine from context)
  const analysisTypeIds = customAnalysisTypes || 
                         determineRelevantAnalysisTypes(contractType, userContext);
  
  // Limit the number of buttons if specified
  const limitedAnalysisTypeIds = maxButtons ? 
                               analysisTypeIds.slice(0, maxButtons) : 
                               analysisTypeIds;
  
  // Get the full configuration for each analysis type
  const analysisTypes = limitedAnalysisTypeIds
    .map(id => analysisTypeConfig[id as keyof typeof analysisTypeConfig])
    .filter(Boolean); // Filter out any undefined types
  
  // Grid layout classes
  const containerClasses = layout === 'grid' 
    ? "grid grid-cols-1 md:grid-cols-2 gap-4" 
    : "flex flex-wrap gap-4";
  
  // Button container classes
  const buttonClasses = layout === 'grid'
    ? "p-4 rounded-lg border transition-colors flex items-start w-full"
    : "p-3 rounded-lg border transition-colors flex items-center gap-2";
  
  // Conditional rendering for button content based on layout
  const renderButtonContent = (type: any) => {
    if (layout === 'grid') {
      return (
        <>
          {showIcons && (
            <div className="mr-4 mt-1">
              {React.cloneElement(type.icon, { className: `h-6 w-6 ${type.iconColor}` })}
            </div>
          )}
          <div className="text-left">
            <h3 className={`font-medium ${type.textColor}`}>{type.name}</h3>
            <p className="text-gray-600 text-sm">{type.description}</p>
          </div>
        </>
      );
    } else {
      return (
        <>
          {showIcons && React.cloneElement(type.icon, { className: `h-5 w-5 ${type.iconColor}` })}
          <span className={`font-medium ${type.textColor}`}>{type.name}</span>
        </>
      );
    }
  };

  return (
    <div className="w-full">
      <div className={containerClasses}>
        {analysisTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => onAnalysisSelect(type.id, type.prompt)}
            className={`${buttonClasses} ${type.color}`}
            title={type.description}
          >
            {renderButtonContent(type)}
          </button>
        ))}
      </div>
    </div>
  );
};

export { determineRelevantAnalysisTypes };