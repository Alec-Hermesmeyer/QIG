// timeline-extraction-config.ts
// Timeline Analysis configuration using shared types

import { TimelineAnalysisConfig, TopicCategory } from './types';

// Export the timeline analysis configuration
const timelineExtractionConfig: TimelineAnalysisConfig = {
  functionId: "timeline-extraction",
  name: "Timeline & Deadline Analysis",
  description: "Extract and organize time-related provisions from construction contracts",
  icon: "calendar-clock",
  category: "contract-analysis",
  promptTemplate: {
    system: "You are an expert construction contract analyst specializing in timeline analysis. Your task is to extract and organize all time-related provisions, identify dependencies between timeline events, and flag potential scheduling conflicts.",
    instructions: [
      "Systematically review the entire contract for time-related provisions",
      "Extract all dates, deadlines, durations, and timeline requirements",
      "Organize timeline elements chronologically and by responsibility",
      "Identify dependencies between events and potential scheduling conflicts"
    ],
    extractionElements: [
      "Contract commencement date",
      "Substantial completion date",
      "Final completion date",
      "Intermediate milestones",
      "Notice periods",
      "Submission deadlines",
      "Review periods",
      "Response timeframes",
      "Cure periods",
      "Warranty periods",
      "Payment application deadlines",
      "Inspection schedules",
      "Claim notification deadlines"
    ],
    topicCategories: [
      {
        name: "Schedule Obligations",
        elements: ["Time of essence", "Completion dates", "Milestone requirements"]
      },
      {
        name: "Change Relief",
        elements: ["Notification periods", "Response timeframes", "Extension conditions"]
      },
      {
        name: "Liquidated Damages",
        elements: ["Trigger dates", "Grace periods", "Assessment schedules"]
      },
      {
        name: "Payment Terms",
        elements: ["Application deadlines", "Payment cycles", "Retention release timing"]
      },
      {
        name: "Notice",
        elements: ["Timing requirements for different notice types"]
      },
      {
        name: "Termination Rights",
        elements: ["Notice periods", "Cure periods", "Effectiveness dates"]
      },
      {
        name: "Warranty",
        elements: ["Commencement", "Duration", "Extension provisions"]
      },
      {
        name: "Title and Risk of Loss",
        elements: ["Timeline for transfer of title and risk"]
      }
    ],
    outputFormat: {
      sections: [
        {
          name: "Chronological Timeline",
          description: "All dates and deadlines in chronological order"
        },
        {
          name: "Timeline by Party Responsibility",
          description: "Obligations grouped by responsible party"
        },
        {
          name: "Critical Path Analysis",
          description: "Dependencies and critical timeline elements"
        }
      ],
      timelineElementStructure: {
        eventDescription: "Description of deadline or time requirement",
        contractReference: "Section number",
        timingRequirement: "Specific date or duration",
        responsibleParty: "Owner/Contractor/Architect",
        dependencies: "Prior events that must occur first",
        consequenceOfNonCompliance: "Result of missing deadline"
      },
      conclusion: "Analysis of potential scheduling conflicts, timeline risks, and recommendations for timeline management"
    }
  },
  parameters: {
    documentId: "",
    includeConflictAnalysis: true,
    includeCriticalPath: true,
    outputFormat: "structured"
  }
};

export default timelineExtractionConfig;