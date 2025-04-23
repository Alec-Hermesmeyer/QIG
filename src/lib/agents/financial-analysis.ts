// financial-analysis.ts
// Type definitions for the Construction Contract Financial Analyzer

// Tool interface
interface Tool {
    name: string;
    description: string;
    permissions: string[];
    rateLimit?: string;
    outputFormats?: string[];
    modelTypes?: string[];
  }
  
  // Knowledge base interface
  interface KnowledgeBase {
    name: string;
    type: string;
    updateFrequency: string;
    contents?: string[];
  }
  
  // Metric interface
  interface Metric {
    name: string;
    target: number;
    weight: number;
  }
  
  // Output format interface
  interface OutputFormat {
    structure: string;
    components: string[];
    visualization: string;
  }
  
  // Analysis module interface
  interface AnalysisModule {
    components: string[];
    outputFormat: string;
  }
  
  // Response template interface
  interface ResponseTemplates {
    [key: string]: string;
  }
  
  // Agent configuration interface
  interface FinancialAnalyzerConfig {
    functionId: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    promptTemplate: {
      system: string;
      instructions?: string[];
      financialElements?: string[];
      topicCategories?: Array<{
        name: string;
        elements: string[];
      }>;
      outputFormat?: {
        sections: Array<{
          name: string;
          elements?: string[];
        }>;
        conclusion?: string;
      };
    };
    parameters: {
      documentId: string;
      calculateTotalExposure: boolean;
      includeCashFlowProjection: boolean;
      outputFormat: string;
    };
    agentName: string;
    version: string;
    goal: {
      primary: string;
      successCriteria: string[];
      priority: string;
    };
    capabilities: {
      tools: Tool[];
    };
    knowledge: {
      bases: KnowledgeBase[];
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
      responseTemplates: ResponseTemplates;
    };
    analysisModules: {
      [key: string]: AnalysisModule;
    };
    extractionTargets: {
      financialProvisions: string[];
      contractReviewTopics: string[];
    };
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
      metrics: Metric[];
      feedbackLoop: {
        sources: string[];
        updateFrequency: string;
      };
    };
    outputFormatting: {
      [key: string]: OutputFormat;
    };
    metadata: {
      creator: string;
      createdDate: string;
      lastUpdated: string;
      deploymentEnvironments: string[];
      dependencies: string[];
    };
  }
  
  // Export the financial analyzer configuration
  const financialAnalysisConfig: FinancialAnalyzerConfig = {
    functionId: "financial-analysis",
    name: "Financial Provision Analysis",
    description: "Analyze financial terms, calculate potential exposure, and identify risk allocation",
    icon: "dollar-sign",
    category: "contract-analysis",
    promptTemplate: {
      system: "You are an expert construction contract analyst specializing in financial provision analysis. Your task is to analyze and extract all financial terms, calculate potential financial exposure, and identify risk allocation mechanisms."
    },
    parameters: {
      documentId: "",
      calculateTotalExposure: true,
      includeCashFlowProjection: true,
      outputFormat: "structured"
    },
    agentName: "ConstructionContractFinancialAnalyzer",
    version: "1.0.0",
    goal: {
      primary: "Analyze construction contracts to provide comprehensive financial analysis and risk assessment",
      successCriteria: ["Extract all financial provisions", "Calculate total financial exposure", "Identify risk allocation mechanisms", "Generate actionable financial insights"],
      priority: "high"
    },
    capabilities: {
      tools: [
        {
          name: "contractParser",
          description: "AI-powered document analysis tool for contract interpretation",
          permissions: ["read", "analyze", "extract"],
          rateLimit: "20 contracts per hour"
        },
        {
          name: "financialCalculator",
          description: "Tool for calculating financial projections, exposures, and contingencies",
          permissions: ["calculate", "project", "model"],
          rateLimit: "200 calculations per minute"
        },
        {
          name: "reportGenerator",
          description: "Creates formatted financial reports with visualizations",
          permissions: ["create"],
          outputFormats: ["pdf", "excel", "html", "json"]
        },
        {
          name: "cashFlowAnalyzer",
          description: "Projects contract-based cash flows and financial scenarios",
          permissions: ["analyze", "project"],
          modelTypes: ["baseline", "optimistic", "pessimistic"]
        }
      ]
    },
    knowledge: {
      bases: [
        {
          name: "constructionContractStandards",
          type: "documentCollection",
          updateFrequency: "quarterly",
          contents: ["AIA contracts", "ConsensusDocs", "FIDIC", "Industry-specific terms"]
        },
        {
          name: "legalPrecedents",
          type: "structuredDatabase",
          updateFrequency: "monthly",
          contents: ["Contract disputes", "Financial interpretation precedents"]
        },
        {
          name: "financialRiskModels",
          type: "vectorStore",
          updateFrequency: "weekly",
          contents: ["Industry benchmarks", "Risk quantification models"]
        },
        {
          name: "constructionAccountingPrinciples",
          type: "knowledgeGraph",
          updateFrequency: "quarterly"
        }
      ],
      contextWindow: "12000 tokens",
      domainExpertise: ["construction contracts", "financial analysis", "risk assessment", "construction law", "project accounting"]
    },
    decisionMaking: {
      approach: "structured_analysis",
      planningHorizon: "full contract lifecycle",
      reasoningStyle: "financial_risk_assessment",
      fallbackStrategy: "consultExpert",
      confidenceThreshold: 0.85
    },
    communication: {
      tone: "professional_analytical",
      verbosity: "comprehensive",
      formats: ["text", "tables", "charts", "financial_summaries"],
      personalization: {
        enabled: true,
        adaptationFactors: ["userRole", "financialExpertise", "contractComplexity", "projectSize"]
      },
      responseTemplates: {
        financialAnalysis: "Based on contract analysis, the financial structure includes {contractSum} base value, {contingencyAmount} contingency, and {exposureAmount} potential risk exposure. Key financial terms indicate {riskAllocation} risk allocation profile.",
        riskAssessment: "Financial risk assessment indicates {riskLevel} exposure with primary concerns in {riskAreas}. Recommended mitigation includes {mitigationStrategies}."
      }
    },
    analysisModules: {
      contractValueAnalysis: {
        components: ["baseContractSum", "allowances", "contingencyProvisions", "potentialBonuses", "changeOrderCapacity"],
        outputFormat: "structured_summary_with_totals"
      },
      paymentAnalysis: {
        components: ["paymentCycle", "documentationRequirements", "approvalProcess", "retentionDetails", "finalPaymentConditions"],
        outputFormat: "process_flow_with_requirements"
      },
      financialRiskExposure: {
        components: ["liquidatedDamagesExposure", "warrantyCosts", "liabilityLimitations", "indemnificationImpact", "insuranceRequirements"],
        outputFormat: "risk_quantification_matrix"
      },
      financialRiskControls: {
        components: ["changeOrderLimits", "contingencyUsageRules", "paymentSafeguards", "costControlMechanisms"],
        outputFormat: "control_effectiveness_assessment"
      },
      cashFlowProjections: {
        components: ["paymentSchedule", "retentionRelease", "contingencyUtilization", "changeOrderImpact"],
        outputFormat: "time_series_projections"
      }
    },
    extractionTargets: {
      financialProvisions: [
        "contractSum", "unitPrices", "allowances", "contingencyFunds", "scheduleOfValues",
        "paymentTerms", "retentionAmounts", "changeOrderMechanisms", "liquidatedDamages",
        "bonusProvisions", "insuranceRequirements", "performanceSecurity", "liabilityLimitations"
      ],
      contractReviewTopics: [
        "paymentTermsProcess", "liquidatedDamages", "limitationOfLiability", "contingency",
        "allowanceSavingsBuyout", "performanceSecurity", "termination", "changeRelief",
        "insurances", "indemnities", "titleRiskOfLoss"
      ]
    },
    memory: {
      shortTerm: {
        capacity: "current contract analysis",
        priorityMethod: "financial_materiality"
      },
      longTerm: {
        storage: "contractDatabase",
        indexingMethod: "financial_provision_classification",
        retrievalMethod: "similarity_and_precedent_search",
        retentionPolicy: "7 years"
      },
      workingMemory: {
        capacity: "complete financial structure"
      }
    },
    constraints: {
      ethical: [
        "cannotProvideSpecificLegalAdvice",
        "mustDiscloseAnalysisLimitations",
        "mustFlagHighRiskProvisions"
      ],
      resources: {
        maxExecutionTime: "60 seconds for basic analysis, 5 minutes for comprehensive",
        maxTokensPerResponse: 4000
      },
      scope: {
        prohibited: ["legalOpinions", "negotiationRepresentation"],
        requiresExpertReview: ["novelFinancialStructures", "unusualRiskAllocation", "highValueExposure"]
      }
    },
    evaluation: {
      metrics: [
        {
          name: "financialTermExtractionAccuracy",
          target: 0.95,
          weight: 0.3
        },
        {
          name: "riskAssessmentPrecision",
          target: 0.9,
          weight: 0.25
        },
        {
          name: "financialExposureCalculationAccuracy",
          target: 0.92,
          weight: 0.25
        },
        {
          name: "recommendationRelevance",
          target: 0.85,
          weight: 0.2
        }
      ],
      feedbackLoop: {
        sources: ["expertReview", "actualContractOutcomes", "financialDiscrepancyTracking"],
        updateFrequency: "per project cycle with quarterly aggregation"
      }
    },
    outputFormatting: {
      contractValueAnalysis: {
        structure: "tabular",
        components: ["lineItem", "amount", "notes", "riskLevel"],
        visualization: "stacked bar chart"
      },
      paymentAnalysis: {
        structure: "process flow",
        components: ["stage", "requirements", "timeline", "stakeholders"],
        visualization: "timeline diagram"
      },
      financialRiskExposure: {
        structure: "matrix",
        components: ["riskType", "exposureAmount", "probability", "mitigationStrategy"],
        visualization: "heat map"
      },
      cashFlowProjections: {
        structure: "time series",
        components: ["period", "inflows", "outflows", "netPosition", "cumulativePosition"],
        visualization: "line chart with confidence intervals"
      }
    },
    metadata: {
      creator: "Construction Finance Solutions Team",
      createdDate: "2025-04-01",
      lastUpdated: "2025-04-12",
      deploymentEnvironments: ["enterprise", "projectManagementSuite"],
      dependencies: ["contractAnalysisEngine v3.2", "financialModelingFramework v2.1"]
    }
  };
  
  export default financialAnalysisConfig;