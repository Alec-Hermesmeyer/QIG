// obligation-extraction.ts
// Type definitions for the Construction Contract Obligation Analyzer

// Tool interface
interface Tool {
    name: string;
    description: string;
    permissions: string[];
    rateLimit?: string;
    outputFormats?: string[];
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
    grouping?: string;
    visualization?: string;
    customization?: string;
  }
  
  // Analysis module interface - for obligation analyzer
  interface ObligationModule {
    [key: string]: any; // Each module has different properties
  }
  
  // Response template interface
  interface ResponseTemplates {
    [key: string]: string;
  }
  
  // Topic category interface
  interface TopicCategory {
    name: string;
    elements: string[];
  }
  
  // Agent configuration interface
  interface ObligationAnalyzerConfig {
    functionId: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    promptTemplate: {
      system: string;
      instructions?: string[];
      obligationIndicators?: string[];
      topicCategories?: TopicCategory[];
      outputFormat?: {
        sections: Array<{
          name: string;
          structure?: {
            obligation?: string;
            location?: string;
            category?: string;
            timing?: string;
            consequence?: string;
          };
        }>;
        conclusion?: string;
      };
    };
    parameters: {
      documentId: string;
      includeImpliedObligations: boolean;
      highlightCriticalObligations: boolean;
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
      obligationExtraction: {
        indicators: string[];
        contextCapture: string;
        exclusions: string[];
      };
      partyClassification: {
        parties: string[];
        identificationMethod: string;
        ambiguityResolution: string;
      };
      topicClassification: {
        reviewTopics: string[];
        classificationMethod: string;
      };
      timingAnalysis: {
        extractionTargets: string[];
        standardization: string;
      };
      consequenceAnalysis: {
        explicit: string;
        implicit: string;
        severity: string;
      };
    };
    extractionTargets: {
      obligationElements: string[];
      obligationIndicators: string[];
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
  
  // Export the obligation analyzer configuration
  const obligationExtractionConfig: ObligationAnalyzerConfig = {
    functionId: "obligation-extraction",
    name: "Obligation Analysis",
    description: "Extract and classify all contractual obligations by category and responsible party",
    icon: "clipboard-list",
    category: "contract-analysis",
    promptTemplate: {
      system: "You are an expert construction contract analyst specializing in obligation analysis. Your task is to extract all contractual obligations, classify them by category and responsible party, and link them to relevant review topics."
    },
    parameters: {
      documentId: "",
      includeImpliedObligations: true,
      highlightCriticalObligations: true,
      outputFormat: "structured"
    },
    agentName: "ConstructionContractObligationAnalyzer",
    version: "1.0.0",
    goal: {
      primary: "Extract, classify, and organize all contractual obligations from construction contracts",
      successCriteria: ["Identify all obligatory language", "Classify obligations by responsible party", "Categorize by subject matter", "Link to standard review topics", "Provide obligation management recommendations"],
      priority: "high"
    },
    capabilities: {
      tools: [
        {
          name: "obligationExtractor",
          description: "AI-powered natural language processing tool for identifying obligatory language",
          permissions: ["read", "analyze", "extract"],
          rateLimit: "100 pages per minute"
        },
        {
          name: "obligationClassifier",
          description: "Categorizes obligations by responsible party and subject matter",
          permissions: ["classify", "categorize"],
          rateLimit: "500 obligations per minute"
        },
        {
          name: "contextAnalyzer",
          description: "Determines contextual information around obligations including timing and consequences",
          permissions: ["analyze", "extract"],
          rateLimit: "300 obligations per minute"
        },
        {
          name: "reportGenerator",
          description: "Creates formatted obligation reports with organized structure",
          permissions: ["create"],
          outputFormats: ["pdf", "excel", "html", "json"]
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
          name: "obligationPatterns",
          type: "structuredDatabase",
          updateFrequency: "monthly",
          contents: ["Standard obligation phrasing", "Implied obligation patterns", "Timing expressions"]
        },
        {
          name: "contractTopicClassification",
          type: "vectorStore",
          updateFrequency: "quarterly",
          contents: ["Standard review topics", "Topic definitions", "Classification criteria"]
        },
        {
          name: "consequenceKnowledge",
          type: "knowledgeGraph",
          updateFrequency: "semi-annually",
          contents: ["Default consequences", "Contractual remedies", "Legal remedies"]
        }
      ],
      contextWindow: "15000 tokens",
      domainExpertise: ["construction contracts", "contractual obligations", "legal interpretation", "construction law", "project management"]
    },
    decisionMaking: {
      approach: "structured_extraction",
      planningHorizon: "complete contract analysis",
      reasoningStyle: "obligation_interpretation",
      fallbackStrategy: "consultExpert",
      confidenceThreshold: 0.85
    },
    communication: {
      tone: "professional_analytical",
      verbosity: "comprehensive",
      formats: ["structured_lists", "tables", "summary_reports"],
      personalization: {
        enabled: true,
        adaptationFactors: ["userRole", "contractComplexity", "projectSize", "riskProfile"]
      },
      responseTemplates: {
        obligationSummary: "Analysis identified {totalObligations} total obligations: {ownerCount} Owner obligations, {contractorCount} Contractor obligations, and {otherCount} other party obligations. Critical obligations relate to {criticalAreas}.",
        obligationDetail: "{party} {obligationType} obligation in §{section}: {obligationText}. Due {timing}. Consequence of non-performance: {consequence}."
      }
    },
    analysisModules: {
      obligationExtraction: {
        indicators: ["shall", "must", "will", "agrees to", "responsible for", "present tense responsibilities"],
        contextCapture: "sentence plus surrounding context",
        exclusions: ["recitals", "definitions", "non-binding guidance"]
      },
      partyClassification: {
        parties: ["Owner", "Contractor", "Architect/Engineer", "Subcontractor", "Supplier", "Other"],
        identificationMethod: "subject analysis and contextual reference",
        ambiguityResolution: "party definitions and contract structure"
      },
      topicClassification: {
        reviewTopics: [
          "Hazardous Material", "Change Relief", "Schedule Obligations", "Performance Guarantees",
          "Warranty", "Payment Terms", "Subcontractors", "Equipment and Processes", 
          "Key Personnel", "Owner Provided Equipment", "Confidentiality", "Audit Rights",
          "Owner Provided Information", "Separate Contractors"
        ],
        classificationMethod: "semantic analysis with topic definitions"
      },
      timingAnalysis: {
        extractionTargets: ["specific dates", "relative timeframes", "conditional triggers", "recurring obligations"],
        standardization: "consistent timing format for comparison"
      },
      consequenceAnalysis: {
        explicit: "directly stated consequences",
        implicit: "standard contractual or legal remedies",
        severity: "categorization by potential impact"
      }
    },
    extractionTargets: {
      obligationElements: [
        "obligatoryText", "responsibleParty", "topicCategory", "sectionReference", 
        "timingRequirement", "consequence", "conditionsPrecedent", "conditionsSubsequent"
      ],
      obligationIndicators: [
        "shall", "must", "will", "agrees to", "responsible for", "is to", 
        "is required to", "is obligated to", "has duty to"
      ],
      contractReviewTopics: [
        "hazardousMaterial", "changeRelief", "scheduleObligations", "performanceGuarantees",
        "warranty", "paymentTerms", "subcontractors", "equipmentAndProcesses",
        "keyPersonnel", "ownerProvidedEquipment", "confidentiality", "auditRights",
        "ownerProvidedInformation", "separateContractors"
      ]
    },
    memory: {
      shortTerm: {
        capacity: "current contract analysis",
        priorityMethod: "obligation_criticality"
      },
      longTerm: {
        storage: "obligationDatabase",
        indexingMethod: "multi-dimensional_classification",
        retrievalMethod: "similarity_and_category_search",
        retentionPolicy: "7 years"
      },
      workingMemory: {
        capacity: "complete obligation structure with cross-references"
      }
    },
    constraints: {
      ethical: [
        "cannotProvideSpecificLegalAdvice",
        "mustDiscloseAnalysisLimitations",
        "mustFlagAmbiguousObligations"
      ],
      resources: {
        maxExecutionTime: "90 seconds for basic analysis, 8 minutes for comprehensive",
        maxTokensPerResponse: 4000
      },
      scope: {
        prohibited: ["legalOpinions", "obligationNegotiation"],
        requiresExpertReview: ["novelObligationStructures", "conflictingObligations", "ambiguousResponsibility"]
      }
    },
    evaluation: {
      metrics: [
        {
          name: "obligationExtractionCompleteness",
          target: 0.98,
          weight: 0.3
        },
        {
          name: "partyClassificationAccuracy",
          target: 0.95,
          weight: 0.25
        },
        {
          name: "topicClassificationAccuracy",
          target: 0.9,
          weight: 0.25
        },
        {
          name: "consequenceIdentificationAccuracy",
          target: 0.85,
          weight: 0.2
        }
      ],
      feedbackLoop: {
        sources: ["expertReview", "contractDisputes", "obligationComplianceTracking"],
        updateFrequency: "per project with quarterly aggregation"
      }
    },
    outputFormatting: {
      ownerObligations: {
        structure: "detailed_list",
        components: ["obligation", "location", "category", "timing", "consequence"],
        grouping: "by topical category"
      },
      contractorObligations: {
        structure: "detailed_list",
        components: ["obligation", "location", "category", "timing", "consequence"],
        grouping: "by topical category"
      },
      architectEngineerObligations: {
        structure: "detailed_list",
        components: ["obligation", "location", "category", "timing", "consequence"],
        grouping: "by topical category"
      },
      criticalObligationsSummary: {
        structure: "prioritized_matrix",
        components: ["party", "obligation", "criticality", "deadlineProximity"],
        visualization: "heat map"
      },
      obligationManagementRecommendations: {
        structure: "actionable_recommendations",
        components: ["focus_area", "management_approach", "tools", "monitoring_frequency"],
        customization: "project_specific"
      }
    },
    metadata: {
      creator: "Construction Contract Management Solutions Team",
      createdDate: "2025-04-01",
      lastUpdated: "2025-04-12",
      deploymentEnvironments: ["enterprise", "projectManagementSuite", "contractManagementSystem"],
      dependencies: ["naturalLanguageProcessor v4.1", "obligationClassificationEngine v2.3"]
    }
  };
  
  export default obligationExtractionConfig;