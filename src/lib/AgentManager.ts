// AgentManager.ts
// This file manages multiple agent configurations and integrates them with the prompt system

import { Prompt } from './prompt';
import { analysisTypeConfig } from '@/components/DataDrivenAnalysisButtons';

// Interface for agent configuration
interface AgentConfig {
  agentName: string;
  version: string;
  description: string;
  goal: {
    primary: string;
    successCriteria: string[];
    priority: string;
  };
  capabilities: {
    tools: any[];
  };
  knowledge: {
    bases: any[];
    contextWindow: string;
    domainExpertise: string[];
  };
  analysisModules: Record<string, any>;
  extractionTargets: Record<string, any>;
  outputFormatting: Record<string, any>;
  [key: string]: any;
}

// Map of analysis types to agent configuration files
const analysisTypeToAgentMap: Record<string, string> = {
  'obligation': 'ConstructionContractObligationAnalyzer',
  'timeline': 'ConstructionContractTimelineAnalyzer',
  'financial': 'ConstructionContractFinancialAnalyzer',
  'risk': 'ConstructionContractRiskAnalyzer',
  'legal': 'ConstructionContractLegalAnalyzer',
  'definitions': 'ConstructionContractDefinitionAnalyzer',
  'stakeholders': 'ConstructionContractStakeholderAnalyzer',
  'disputes': 'ConstructionContractDisputeAnalyzer',
  'comprehensive': 'ConstructionContractComprehensiveAnalyzer',
};

// Cache for loaded agent configurations
const agentConfigCache: Record<string, AgentConfig> = {};

/**
 * Loads an agent configuration by name
 */
export const loadAgentConfig = async (agentName: string): Promise<AgentConfig | null> => {
  try {
    // Check if we already have this agent in cache
    if (agentConfigCache[agentName]) {
      return agentConfigCache[agentName];
    }
    
    // In a real implementation, this would load from your file system or API
    // For demonstration purposes, we'll simulate loading different configs
    let agentConfig: AgentConfig;
    
    try {
      // Dynamic import of the agent configuration
      // In a real implementation, this path would be adjusted to your project structure
      const module = await import(`@/lib/agents/${agentName}.json`);
      agentConfig = module.default;
    } catch (error) {
      console.warn(`Failed to load agent configuration for ${agentName}:`, error);
      return null;
    }
    
    // Cache the loaded configuration
    agentConfigCache[agentName] = agentConfig;
    return agentConfig;
  } catch (error) {
    console.error(`Error loading agent configuration for ${agentName}:`, error);
    return null;
  }
};

/**
 * Gets the appropriate agent configuration for an analysis type
 */
export const getAgentForAnalysisType = async (analysisType: string): Promise<AgentConfig | null> => {
  const agentName = analysisTypeToAgentMap[analysisType] || 'ConstructionContractComprehensiveAnalyzer';
  return await loadAgentConfig(agentName);
};

/**
 * Enhances a prompt with agent-specific capabilities
 */
export const enhancePromptWithAgent = (
  basePrompt: string,
  agentConfig: AgentConfig | null,
  analysisType: string
): string => {
  if (!agentConfig) {
    return basePrompt;
  }
  
  // Start with the base prompt
  let enhancedPrompt = basePrompt;
  
  // Add agent-specific extraction capabilities
  if (agentConfig.extractionTargets) {
    const extractionSection = `
## ENHANCED EXTRACTION CAPABILITIES

I am utilizing the ${agentConfig.agentName} (v${agentConfig.version}) capabilities to provide an advanced analysis.

${agentConfig.description}

My primary goal is to ${agentConfig.goal.primary}.

Success criteria for this analysis:
${agentConfig.goal.successCriteria.map(criteria => `- ${criteria}`).join('\n')}
`;
    
    enhancedPrompt += extractionSection;
    
    // Add extraction targets specific to this analysis type
    const extractionTargets = agentConfig.extractionTargets;
    if (extractionTargets) {
      let targetsSection = '\n### EXTRACTION TARGETS\n\n';
      
      for (const [targetType, targets] of Object.entries(extractionTargets)) {
        if (Array.isArray(targets) && targets.length > 0) {
          targetsSection += `${targetType}:\n`;
          targetsSection += targets.map(target => `- ${target}`).join('\n');
          targetsSection += '\n\n';
        }
      }
      
      enhancedPrompt += targetsSection;
    }
  }
  
  // Add analysis modules specific to this analysis type
  if (agentConfig.analysisModules) {
    let moduleSection = '\n## ANALYSIS MODULES\n\n';
    
    // Filter to relevant modules for this analysis type
    const relevantModuleKeys = Object.keys(agentConfig.analysisModules).filter(key => {
      // Map analysis types to relevant module keywords
      const analysisToModuleMap: Record<string, string[]> = {
        'obligation': ['obligation', 'party', 'topic'],
        'timeline': ['timing', 'schedule', 'deadline'],
        'financial': ['payment', 'financial', 'cost'],
        'risk': ['risk', 'consequence', 'mitigation'],
        'legal': ['legal', 'compliance', 'regulatory'],
        'definitions': ['definition', 'term', 'interpretation'],
        'stakeholders': ['party', 'stakeholder', 'role'],
        'disputes': ['dispute', 'claim', 'resolution'],
      };
      
      // Check if this module is relevant to the analysis type
      const relevantKeywords = analysisToModuleMap[analysisType] || [];
      return relevantKeywords.some(keyword => key.toLowerCase().includes(keyword));
    });
    
    // Add the relevant modules
    for (const moduleKey of relevantModuleKeys) {
      const module = agentConfig.analysisModules[moduleKey];
      
      moduleSection += `### ${moduleKey}\n`;
      
      // Add module details based on its structure
      if (typeof module === 'object') {
        for (const [key, value] of Object.entries(module)) {
          if (Array.isArray(value)) {
            moduleSection += `${key}:\n${value.map(item => `- ${item}`).join('\n')}\n`;
          } else if (typeof value === 'string') {
            moduleSection += `${key}: ${value}\n`;
          }
        }
      }
      
      moduleSection += '\n';
    }
    
    enhancedPrompt += moduleSection;
  }
  
  // Add output formatting guidance
  if (agentConfig.outputFormatting) {
    let formattingSection = '\n## OUTPUT FORMATTING\n\n';
    
    // Find the most relevant output format for this analysis type
    const formatKeys = Object.keys(agentConfig.outputFormatting);
    const relevantFormatKey = formatKeys.find(key => 
      key.toLowerCase().includes(analysisType.toLowerCase())
    ) || formatKeys[0];
    
    const format = agentConfig.outputFormatting[relevantFormatKey];
    
    if (format) {
      formattingSection += `Use a ${format.structure} structure with these components:\n`;
      
      if (format.components && Array.isArray(format.components)) {
        formattingSection += (format.components as string[]).map((comp: string) => `- ${comp}`).join('\n');
      }
      
      if (format.grouping) {
        formattingSection += `\n\nGroup items ${format.grouping}`;
      }
    }
    
    enhancedPrompt += formattingSection;
  }
  
  return enhancedPrompt;
};

/**
 * Gets an enhanced prompt for a specific analysis type and contract type,
 * integrating any available agent capabilities
 */
export const getEnhancedPrompt = async (
  analysisType: string,
  contractType: string
): Promise<string> => {
  try {
    // Get the base prompt
    const basePrompt = Prompt(analysisType, contractType);
    
    // Get the agent configuration for this analysis type
    const agentConfig = await getAgentForAnalysisType(analysisType);
    
    // Return the enhanced prompt
    return enhancePromptWithAgent(basePrompt, agentConfig, analysisType);
  } catch (error) {
    console.error('Error generating enhanced prompt:', error);
    // Fall back to the standard prompt
    return Prompt(analysisType, contractType);
  }
};

/**
 * Main function to get the appropriate prompt for analysis
 * This is what you would use in your ContractAnalyzerPanel
 */
export const getAnalysisPrompt = async (
  analysisType: string = 'comprehensive',
  contractType: string = 'construction',
  useAgent: boolean = true
): Promise<string> => {
  if (useAgent) {
    return await getEnhancedPrompt(analysisType, contractType);
  } else {
    return Prompt(analysisType, contractType);
  }
};