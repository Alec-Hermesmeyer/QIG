// timeline-extraction.ts
// Type definitions for the Construction Contract Timeline Analyzer

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
    visualization?: string;
    customization?: string;
  }
  
  // Analysis module interface - for timeline analyzer
  interface TimelineModule {
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
  interface TimelineAnalyzerConfig {
    functionId: string;
    name: string;
    description: string;
    icon: string;
    category: string;
    promptTemplate: {
      system: string;
      instructions?: string[];
      extractionElements?: string[];
      topicCategories?: TopicCategory[];
      outputFormat?: {
        sections: Array<{
          name: string;
          description?: string;
        }>;
        timelineElementStructure?: {
          eventDescription: string;
          contractReference: string;
          timingRequirement: string;
          responsibleParty: string;
          dependencies: string;
          consequenceOfNonCompliance: string;
        };
        conclusion?: string;
      };
    };
    parameters: {
      documentId: string;
      includeConflictAnalysis: boolean;
      includeCriticalPath: boolean;
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
      timelineExtraction: {
        extractionTargets: string[];
        contextCapture: string;
        dateNormalization: string;
      };
      chronologicalOrganization: {
        sortingMethod: string;
        handlingOfRanges: string;
        conditionalEventHandling: string;
      };
      dependencyMapping: {
        dependencyTypes: string[];
        identificationMethod: string;
        visualizationFormat: string;
      };
      conflictDetection: {
        conflictTypes: string[];
        riskLevels: string[];
        resolutionSuggestions: string;
      };
      criticalPathAnalysis: {
        methodologyType: string;
        floatCalculation: string;
        criticalPathIdentification: string;
      };
    };
    extractionTargets: {
      timelineElements: string[];
      timeExpressions: string[];
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
  
  // Export the timeline analyzer configuration
  const timelineExtractionConfig: TimelineAnalyzerConfig = {
    functionId: "timeline-extraction",
    name: "Timeline & Deadline Analysis",
    description: "Extract and organize time-related provisions from construction contracts",
    icon: "calendar-clock",
    category: "contract-analysis",
    promptTemplate: {
      system: "You are an expert construction contract analyst specializing in timeline analysis. Your task is to extract and organize all time-related provisions, identify dependencies between timeline events, and flag potential scheduling conflicts."
    },
    parameters: {
      documentId: "",
      includeConflictAnalysis: true,
      includeCriticalPath: true,
      outputFormat: "structured"
    },
    agentName: "ConstructionContractTimelineAnalyzer",
    version: "1.0.0",
    goal: {
      primary: "Extract, organize, and analyze all time-related provisions in construction contracts",
      successCriteria: ["Extract all dates, deadlines and durations", "Organize timeline elements chronologically", "Identify dependencies between events", "Flag potential scheduling conflicts", "Provide timeline management recommendations"],
      priority: "high"
    },
    capabilities: {
      tools: [
        {
          name: "timelineExtractor",
          description: "AI-powered natural language processing tool for identifying time-related provisions",
          permissions: ["read", "analyze", "extract"],
          rateLimit: "100 pages per minute"
        },
        {
          name: "chronologicalOrganizer",
          description: "Orders timeline elements by date and creates dependency mappings",
          permissions: ["organize", "map"],
          rateLimit: "1000 events per minute"
        },
        {
          name: "conflictDetector",
          description: "Analyzes timeline for inconsistencies, overlaps, and impossible sequences",
          permissions: ["analyze", "detect"],
          rateLimit: "500 comparisons per minute"
        },
        {
          name: "criticalPathAnalyzer",
          description: "Identifies critical path elements and calculates float for timeline events",
          permissions: ["analyze", "calculate"],
          rateLimit: "300 calculations per minute"
        },
        {
          name: "reportGenerator",
          description: "Creates formatted timeline reports with visualizations",
          permissions: ["create"],
          outputFormats: ["pdf", "excel", "html", "json", "gantt"]
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
          name: "timeExpressionPatterns",
          type: "structuredDatabase",
          updateFrequency: "semi-annually",
          contents: ["Date formats", "Duration expressions", "Relative time references", "Conditional timing"]
        },
        {
          name: "constructionSchedulingPrinciples",
          type: "vectorStore",
          updateFrequency: "annually",
          contents: ["Industry scheduling standards", "Critical path methodology", "Float calculations"]
        },
        {
          name: "contractualTimelineRequirements",
          type: "knowledgeGraph",
          updateFrequency: "quarterly",
          contents: ["Standard milestone definitions", "Typical completion requirements", "Notice period standards"]
        }
      ],
      contextWindow: "15000 tokens",
      domainExpertise: ["construction scheduling", "contract time provisions", "critical path method", "construction law", "project management"]
    },
    decisionMaking: {
      approach: "temporal_analysis",
      planningHorizon: "complete contract timeline",
      reasoningStyle: "dependency_mapping",
      fallbackStrategy: "consultSchedulingExpert",
      confidenceThreshold: 0.9
    },
    communication: {
      tone: "professional_analytical",
      verbosity: "comprehensive",
      formats: ["chronological_lists", "tables", "gantt_charts", "timelines"],
      personalization: {
        enabled: true,
        adaptationFactors: ["userRole", "schedulingExpertise", "projectComplexity", "timeConstraints"]
      },
      responseTemplates: {
        timelineSummary: "Analysis identified {totalEvents} timeline elements spanning from {startDate} to {endDate}. Critical path contains {criticalPathCount} events with {conflictCount} potential conflicts detected.",
        timelineElementDetail: "{eventType} in §{section}: {description}. Required by {timing}. Responsible party: {party}. Dependencies: {dependencies}. Consequence: {consequence}."
      }
    },
    analysisModules: {
      timelineExtraction: {
        extractionTargets: [
          "contract commencement date", "substantial completion date", "final completion date", 
          "intermediate milestones", "notice periods", "submission deadlines", "review periods", 
          "response timeframes", "cure periods", "warranty periods", "payment application deadlines", 
          "inspection schedules", "claim notification deadlines"
        ],
        contextCapture: "sentence plus surrounding paragraph",
        dateNormalization: "convert all dates and durations to standard format"
      },
      chronologicalOrganization: {
        sortingMethod: "absolute and relative date calculation",
        handlingOfRanges: "start and end dates with duration tracking",
        conditionalEventHandling: "branch timelines for conditional events"
      },
      dependencyMapping: {
        dependencyTypes: ["explicit", "implicit", "contractual", "logical"],
        identificationMethod: "textual reference and logical inference",
        visualizationFormat: "directed graph and predecessor/successor lists"
      },
      conflictDetection: {
        conflictTypes: ["temporal overlap", "insufficient duration", "impossible sequence", "contradictory requirements"],
        riskLevels: ["critical", "major", "minor", "potential"],
        resolutionSuggestions: "provided for each detected conflict"
      },
      criticalPathAnalysis: {
        methodologyType: "modified CPM for contractual timelines",
        floatCalculation: "early start/finish and late start/finish for each event",
        criticalPathIdentification: "zero float path highlighting"
      }
    },
    extractionTargets: {
      timelineElements: [
        "eventDescription", "contractReference", "timingRequirement", "responsibleParty", 
        "dependencies", "consequenceOfNonCompliance"
      ],
      timeExpressions: [
        "dates", "days", "weeks", "months", "years", "prior to", "following", "within", 
        "after", "before", "no later than", "promptly", "immediately"
      ],
      contractReviewTopics: [
        "scheduleObligations", "changeRelief", "liquidatedDamages", "paymentTerms",
        "notice", "terminationRights", "warranty", "titleAndRiskOfLoss"
      ]
    },
    memory: {
      shortTerm: {
        capacity: "current contract timeline analysis",
        priorityMethod: "critical_path_relevance"
      },
      longTerm: {
        storage: "timelineDatabase",
        indexingMethod: "temporal_and_dependency_indexing",
        retrievalMethod: "timeline_traversal_and_event_lookup",
        retentionPolicy: "project lifetime + 3 years"
      },
      workingMemory: {
        capacity: "complete timeline structure with all dependencies"
      }
    },
    constraints: {
      ethical: [
        "cannotProvideSpecificLegalAdvice",
        "mustDiscloseAnalysisLimitations",
        "mustFlagAmbiguousTiming"
      ],
      resources: {
        maxExecutionTime: "2 minutes for basic analysis, 10 minutes for comprehensive",
        maxTokensPerResponse: 4500
      },
      scope: {
        prohibited: ["scheduleDevelopment", "timeExtensionJustification"],
        requiresExpertReview: ["complexConditionalTimelines", "ambiguousSequencing", "highRiskConflicts"]
      }
    },
    evaluation: {
      metrics: [
        {
          name: "timelineElementExtractionCompleteness",
          target: 0.98,
          weight: 0.25
        },
        {
          name: "dependencyIdentificationAccuracy",
          target: 0.9,
          weight: 0.25
        },
        {
          name: "conflictDetectionPrecision",
          target: 0.95,
          weight: 0.25
        },
        {
          name: "criticalPathAccuracy",
          target: 0.92,
          weight: 0.25
        }
      ],
      feedbackLoop: {
        sources: ["expertReview", "actualProjectTimelines", "delaySourceAnalysis"],
        updateFrequency: "monthly during project with quarterly aggregation"
      }
    },
    outputFormatting: {
      chronologicalTimeline: {
        structure: "sequential_event_list",
        components: ["date", "event", "section", "party", "dependencies", "consequence"],
        visualization: "interactive timeline and gantt chart"
      },
      partyResponsibilityTimeline: {
        structure: "grouped_event_list",
        components: ["party", "event", "date", "section", "dependencies", "consequence"],
        visualization: "swim lane diagram"
      },
      criticalPathAnalysis: {
        structure: "path_network",
        components: ["event", "earliestStart", "earliestFinish", "latestStart", "latestFinish", "float"],
        visualization: "network diagram with critical path highlighting"
      },
      schedulingConflicts: {
        structure: "prioritized_conflict_list",
        components: ["conflictType", "affectedEvents", "severity", "resolution"],
        visualization: "conflict matrix"
      },
      timelineManagementRecommendations: {
        structure: "actionable_recommendations",
        components: ["focus_area", "management_approach", "monitoring_frequency", "risk_mitigation"],
        customization: "project_specific"
      }
    },
    metadata: {
      creator: "Construction Scheduling Solutions Team",
      createdDate: "2025-04-01",
      lastUpdated: "2025-04-12",
      deploymentEnvironments: ["enterprise", "projectManagementSuite", "schedulingSystem"],
      dependencies: ["temporalAnalysisEngine v3.4", "criticalPathAnalyzer v2.2"]
    }
  };
  
  export default timelineExtractionConfig;