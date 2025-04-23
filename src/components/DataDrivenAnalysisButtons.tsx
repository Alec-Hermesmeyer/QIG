// DataDrivenAnalysisButtons.tsx
import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  FileText, 
  DollarSign, 
  ClipboardList, 
  AlertTriangle, 
  Gavel, 
  Search, 
  Users, 
  Scale,
  Calendar 
} from 'lucide-react';
import { ContractAnalyzerConfig } from '@/lib/agents/types';

// Import analysis configurations
import financialAnalysisConfig from '@/lib/agents/financial-analysis-config';
import obligationExtractionConfig from '@/lib/agents/obligation-extraction-config';
import timelineExtractionConfig from '@/lib/agents/timeline-extraction-config';

// Function to get icon component by name
const getIconByName = (iconName: string) => {
  const iconMap: Record<string, React.ReactElement> = {
    'clock': <Clock className="h-6 w-6" />,
    'file-text': <FileText className="h-6 w-6" />,
    'dollar-sign': <DollarSign className="h-6 w-6" />,
    'clipboard-list': <ClipboardList className="h-6 w-6" />,
    'alert-triangle': <AlertTriangle className="h-6 w-6" />,
    'gavel': <Gavel className="h-6 w-6" />,
    'search': <Search className="h-6 w-6" />,
    'users': <Users className="h-6 w-6" />,
    'scale': <Scale className="h-6 w-6" />,
    'calendar-clock': <Clock className="h-6 w-6" /> // Using Clock for calendar-clock since it's not in lucide-react
  };
  
  // Handle hyphenated icon names like "dollar-sign" vs "dollarSign" format differences
  if (!(iconName in iconMap)) {
    // Try converting from camelCase to kebab-case
    const kebabCase = iconName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    if (iconMap[kebabCase]) return iconMap[kebabCase];
    
    // If still not found, return a default icon
    return <FileText className="h-6 w-6" />;
  }
  
  return iconMap[iconName];
};

// Configuration for color themes by analysis type
const analysisColorConfig = {
  timeline: {
    color: 'bg-blue-100 hover:bg-blue-200 border-blue-300',
    textColor: 'text-blue-800',
    iconColor: 'text-blue-500'
  },
  obligation: {
    color: 'bg-purple-100 hover:bg-purple-200 border-purple-300',
    textColor: 'text-purple-800',
    iconColor: 'text-purple-500'
  },
  financial: {
    color: 'bg-green-100 hover:bg-green-200 border-green-300',
    textColor: 'text-green-800',
    iconColor: 'text-green-500'
  },
  risk: {
    color: 'bg-red-100 hover:bg-red-200 border-red-300',
    textColor: 'text-red-800',
    iconColor: 'text-red-500'
  },
  legal: {
    color: 'bg-indigo-100 hover:bg-indigo-200 border-indigo-300',
    textColor: 'text-indigo-800',
    iconColor: 'text-indigo-500'
  },
  definitions: {
    color: 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300',
    textColor: 'text-yellow-800',
    iconColor: 'text-yellow-500'
  },
  stakeholders: {
    color: 'bg-teal-100 hover:bg-teal-200 border-teal-300',
    textColor: 'text-teal-800',
    iconColor: 'text-teal-500'
  },
  disputes: {
    color: 'bg-orange-100 hover:bg-orange-200 border-orange-300',
    textColor: 'text-orange-800',
    iconColor: 'text-orange-500'
  },
  comprehensive: {
    color: 'bg-gray-100 hover:bg-gray-200 border-gray-300',
    textColor: 'text-gray-800',
    iconColor: 'text-gray-500'
  }
};

// Interface for analysis type config used by the component
interface AnalysisTypeConfig {
  id: string;
  name: string; 
  description: string;
  icon: React.ReactElement;
  color: string;
  textColor: string;
  iconColor: string;
  prompt: string;
  fullConfig: ContractAnalyzerConfig;
}

// Function to map the imported configs to the internal format used by the component
export const generateAnalysisConfig = (jsonConfigs: ContractAnalyzerConfig[]): Record<string, AnalysisTypeConfig> => {
  const config: Record<string, AnalysisTypeConfig> = {};

  jsonConfigs.forEach(jsonConfig => {
    // Extract category from the functionId (e.g., "financial-analysis" -> "financial")
    const categoryId = jsonConfig.functionId.split('-')[0]; 
    
    // Create a config entry using the appropriate color theme based on category
    config[categoryId] = {
      id: categoryId,
      name: jsonConfig.name,
      description: jsonConfig.description,
      icon: getIconByName(jsonConfig.icon),
      // Use the matching color config or fallback to 'comprehensive' config
      color: (analysisColorConfig[categoryId as keyof typeof analysisColorConfig]?.color || 
             analysisColorConfig.comprehensive.color),
      textColor: (analysisColorConfig[categoryId as keyof typeof analysisColorConfig]?.textColor || 
                analysisColorConfig.comprehensive.textColor),
      iconColor: (analysisColorConfig[categoryId as keyof typeof analysisColorConfig]?.iconColor || 
               analysisColorConfig.comprehensive.iconColor),
      prompt: jsonConfig.promptTemplate.system,
      // Store the full configuration for reference
      fullConfig: jsonConfig
    };
  });

  return config;
};

// Interface for user context
interface UserContext {
  role?: string;
  preferredAnalysisTypes?: string[];
  [key: string]: any;
}

// Helper function to determine which analysis types to show based on contract type and user context
const determineRelevantAnalysisTypes = (contractType: string, userContext: UserContext = {}): string[] => {
  // Default analysis types for all contracts
  const defaultTypes = ['comprehensive', 'risk'];
  
  // Contract-type specific analysis types
  const contractTypeMap: Record<string, string[]> = {
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

// Props interface for the component
interface DataDrivenAnalysisButtonsProps {
  onAnalysisSelect: (analysisType: string, prompt: string, fullConfig: ContractAnalyzerConfig) => void;
  contractType?: string;
  userContext?: UserContext;
  customAnalysisTypes?: string[] | null;
  maxButtons?: number | null;
  layout?: 'grid' | 'flex';
  showIcons?: boolean;
}

// Main component for data-driven analysis buttons
const DataDrivenAnalysisButtons: React.FC<DataDrivenAnalysisButtonsProps> = ({ 
  onAnalysisSelect, 
  contractType = 'general',
  userContext = {},
  customAnalysisTypes = null,
  maxButtons = null,
  layout = 'grid',
  showIcons = true
}) => {
  const [analysisTypeConfig, setAnalysisTypeConfig] = useState<Record<string, AnalysisTypeConfig>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load all analysis configurations
    const configs: ContractAnalyzerConfig[] = [
      financialAnalysisConfig,
      obligationExtractionConfig,
      timelineExtractionConfig
    ];
    
    try {
      const generatedConfig = generateAnalysisConfig(configs);
      setAnalysisTypeConfig(generatedConfig);
    } catch (error) {
      console.error("Error processing analysis configurations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">Loading analysis options...</span>
      </div>
    );
  }

  // Determine which analysis types to show
  const analysisTypeIds = customAnalysisTypes || 
                        determineRelevantAnalysisTypes(contractType, userContext);
  
  // Limit the number of buttons if specified
  const limitedAnalysisTypeIds = maxButtons ? 
                              analysisTypeIds.slice(0, maxButtons) : 
                              analysisTypeIds;
  
  // Get the full configuration for each analysis type
  const analysisTypes = limitedAnalysisTypeIds
    .map(id => analysisTypeConfig[id])
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
  const renderButtonContent = (type: AnalysisTypeConfig) => {
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
            onClick={() => onAnalysisSelect(type.id, type.prompt, type.fullConfig)}
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

// Export a helper function to get an analysis configuration by type
export const getAnalysisConfigByType = (type: string): ContractAnalyzerConfig | null => {
  // Array of all available configurations
  const configs: ContractAnalyzerConfig[] = [
    financialAnalysisConfig,
    obligationExtractionConfig,
    timelineExtractionConfig
  ];
  
  // Generate the internal config format
  const analysisConfig = generateAnalysisConfig(configs);
  
  // Return the requested config or null if not found
  return analysisConfig[type]?.fullConfig || null;
};

// Export the component and helper functions
export { 
  DataDrivenAnalysisButtons, 
  determineRelevantAnalysisTypes,
  financialAnalysisConfig,
  obligationExtractionConfig,
  timelineExtractionConfig
};