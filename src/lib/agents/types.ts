// types.ts
// Shared type definitions for contract analysis configuration files

/**
 * Topic category with name and related elements
 */
export interface TopicCategory {
    name: string;
    elements: string[];
  }
  
  /**
   * Output section for analysis results
   */
  export interface OutputSection {
    name: string;
    description?: string;
    elements?: string[];
    structure?: Record<string, string>;
  }
  
  /**
   * Common prompt template interface for all analyzers
   */
  export interface PromptTemplate {
    system: string;
    instructions?: string[];
    
    // Financial analyzer specific properties
    financialElements?: string[];
    
    // Obligation analyzer specific properties
    obligationIndicators?: string[];
    
    // Timeline analyzer specific properties
    extractionElements?: string[];
    
    // Common properties
    topicCategories?: TopicCategory[];
    outputFormat?: {
      sections: OutputSection[];
      conclusion?: string;
      timelineElementStructure?: Record<string, string>;
    };
  }
  
  /**
   * Common parameters interface for all analyzers
   */
  export interface AnalysisParameters {
    documentId: string;
    outputFormat: string;
    
    // Financial analyzer specific parameters
    calculateTotalExposure?: boolean;
    includeCashFlowProjection?: boolean;
    
    // Obligation analyzer specific parameters
    includeImpliedObligations?: boolean;
    highlightCriticalObligations?: boolean;
    
    // Timeline analyzer specific parameters
    includeConflictAnalysis?: boolean;
    includeCriticalPath?: boolean;
  }
  
  /**
   * Base interface for all analyzer configurations
   */
  export interface AnalyzerConfig {
    functionId: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    promptTemplate: PromptTemplate;
    parameters: AnalysisParameters;
  }
  
  /**
   * Financial analyzer configuration 
   */
  export interface FinancialAnalysisConfig extends AnalyzerConfig {
    functionId: "financial-analysis";
    parameters: AnalysisParameters & {
      calculateTotalExposure: boolean;
      includeCashFlowProjection: boolean;
    };
  }
  
  /**
   * Obligation analyzer configuration
   */
  export interface ObligationAnalysisConfig extends AnalyzerConfig {
    functionId: "obligation-extraction";
    parameters: AnalysisParameters & {
      includeImpliedObligations: boolean;
      highlightCriticalObligations: boolean;
    };
  }
  
  /**
   * Timeline analyzer configuration
   */
  export interface TimelineAnalysisConfig extends AnalyzerConfig {
    functionId: "timeline-extraction";
    parameters: AnalysisParameters & {
      includeConflictAnalysis: boolean;
      includeCriticalPath: boolean;
    };
  }
  
  /**
   * Union type of all analyzer configurations
   */
  export type ContractAnalyzerConfig = 
    | FinancialAnalysisConfig 
    | ObligationAnalysisConfig 
    | TimelineAnalysisConfig;
  
  /**
   * Interface for the agent detailed implementation
   */
  export interface AgentImplementation {
    agentName: string;
    version: string;
    description: string;
    goal: {
      primary: string;
      successCriteria: string[];
      priority: string;
    };
    capabilities: {
      tools: Array<{
        name: string;
        description: string;
        permissions: string[];
        rateLimit?: string;
        outputFormats?: string[];
        modelTypes?: string[];
      }>;
    };
    knowledge: {
      bases: Array<{
        name: string;
        type: string;
        updateFrequency: string;
        contents?: string[];
      }>;
      contextWindow: string;
      domainExpertise: string[];
    };
    decisionMaking: {
      approach: string;
      planningHorizon: string;
      reasoningStyle: string;
      fallbackStrategy: string;
      confidenceThreshold: number;
    };
    communication: {
      tone: string;
      verbosity: string;
      formats: string[];
      personalization: {
        enabled: boolean;
        adaptationFactors: string[];
      };
      responseTemplates: Record<string, string>;
    };
    analysisModules: Record<string, any>;
    extractionTargets: Record<string, string[]>;
    memory: {
      shortTerm: {
        capacity: string;
        priorityMethod: string;
      };
      longTerm: {
        storage: string;
        indexingMethod: string;
        retrievalMethod: string;
        retentionPolicy: string;
      };
      workingMemory: {
        capacity: string;
      };
    };
    constraints: {
      ethical: string[];
      resources: {
        maxExecutionTime: string;
        maxTokensPerResponse: number;
      };
      scope: {
        prohibited: string[];
        requiresExpertReview: string[];
      };
    };
    evaluation: {
      metrics: Array<{
        name: string;
        target: number;
        weight: number;
      }>;
      feedbackLoop: {
        sources: string[];
        updateFrequency: string;
      };
    };
    outputFormatting: Record<string, {
      structure: string;
      components: string[];
      visualization?: string;
      grouping?: string;
      customization?: string;
    }>;
    metadata: {
      creator: string;
      createdDate: string;
      lastUpdated: string;
      deploymentEnvironments: string[];
      dependencies: string[];
    };
  }