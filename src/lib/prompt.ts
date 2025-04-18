// prompt.ts
import { analysisTypeConfig } from '@/components/DataDrivenAnalysisButtons';

// The base comprehensive contract analysis prompt
export const BaseContractPrompt = `# CONSTRUCTION CONTRACT RISK ANALYSIS

## ROLE AND OBJECTIVE
You are a specialized construction contract analyst with 20+ years of experience in contract risk assessment, specifically for Construction Manager-At-Risk (CMAR) agreements. Your task is to methodically analyze the provided contract excerpt and identify all potential risks to the Contractor.

## ANALYSIS FRAMEWORK
For each identified risk, provide the following structured information:

### Risk Category:
Select the most specific category from this taxonomy:
- Financial (Payment Terms, Retainage, Cash Flow)
- Schedule (Delays, Acceleration, Completion)
- Liability (Indemnification, Damages, Third-Party Claims)
- Scope (Changes, Unforeseen Conditions, Design Evolution)
- Termination (Default, Convenience, Force Majeure)
- Legal (Dispute Resolution, Governing Law, Compliance)
- Operational (Site Conditions, Labor, Subcontractor Risks)
- Environmental (Hazardous Materials, Remediation, Permits)
- Documentation (Submittals, Warranties, Close-out Requirements)

### Risk Score:
Assign a score based on both severity and likelihood:
- Critical: High likelihood of material impact exceeding 5% of contract value or causing severe reputation damage
- High: Significant financial/legal exposure with moderate likelihood
- Medium: Moderate impact or likelihood, manageable with proper attention
- Low: Limited impact or remote likelihood, standard industry risk

### Risky Contract Text:
Quote the exact language that creates the risk. If the risk spans multiple clauses, quote the most relevant portions. If the risk is due to omission, note what language is missing.

### Why This Is a Risk:
Clearly explain:
1. The specific exposure created for the Contractor
2. The potential downstream consequences
3. How this deviates from industry standards (if applicable)
4. The practical impact on operations or finances

### Contract Location:
Specify the exact location by section number, page, and paragraph if available.

## PRIORITY RISK AREAS
Carefully analyze these high-priority areas that frequently create significant risks:

1. Liquidated and Consequential Damages provisions
2. Indemnification language and scope
3. Limitation of Liability (or lack thereof)
4. Payment terms, timing, and withholding conditions
5. Change order procedures and pricing mechanisms
6. Differing site conditions and risk allocation
7. Schedule requirements, float ownership, and delay provisions
8. Force majeure definitions and relief structure
9. Termination rights (both owner and contractor)
10. Insurance requirements and exclusions
11. Warranty obligations and duration
12. Hazardous materials procedures and responsibility
13. Design liability and responsibility for errors/omissions
14. Dispute resolution mechanisms and governing law
15. Performance standards (especially subjective ones)

## MITIGATION SUMMARY
After listing all risks, provide a structured "Mitigation Summary" that:
1. Groups similar risks where mitigation strategies overlap
2. Prioritizes the most critical/high risks first
3. Provides specific contractual language revisions where appropriate
4. Suggests practical operational steps to manage unavoidable risks
5. Identifies insurance or bonding solutions where applicable

## OUTPUT FORMAT
Format each risk using this exact structure to ensure proper parsing:

Risk Category: [Category]
Risk Score: [Score]
Risky Contract Text: "[Exact quote]"
Why This Is a Risk: [Explanation]
Contract Location: [Section reference]

After all risks, provide:

Mitigation Summary:
- [Mitigation recommendations organized by risk category or priority]

## ANALYTICAL APPROACH
1. First examine the foundational contract elements (parties, scope, compensation)
2. Then analyze timing provisions (schedule, milestones, completion)
3. Next review risk allocation sections (indemnities, warranties, damages)
4. Finally assess procedural elements (changes, disputes, termination)

Focus on both explicit risks (problematic language) and implicit risks (omissions, ambiguities, or unusual provisions).

## IMPORTANT NOTES
- Maintain consistent formatting exactly as specified above
- Each risk must start with "Risk Category:" to enable proper parsing
- Be specific about whether risks are in the current contract text or result from omissions
- Analyze this particular contract, not generic industry risks
- Consider both immediate contractual issues and practical project execution concerns
- Balance legal analysis with practical business implications`;

// Function to generate specialized prompts based on analysis type
export const getSpecializedPrompt = (analysisType: keyof typeof analysisTypeConfig, contractType: string = 'construction') => {
  // Get the base prompt from the analysis type config
  const specializedBase = analysisTypeConfig[analysisType]?.prompt || '';
  
  // If it's the comprehensive analysis, return the full base prompt
  if (analysisType === 'comprehensive') {
    return BaseContractPrompt;
  }
  
  // For specific analysis types, we'll create a specialized prompt
  let specializedPrompt = '';
  
  // Common intro for all specialized prompts
  const promptIntro = `# ${(analysisTypeConfig[analysisType]?.name || '').toUpperCase()} FOR ${contractType.toUpperCase()} CONTRACT\n\n`;
  
  // Start with the specialized base from the config
  specializedPrompt = promptIntro + specializedBase + '\n\n';
  
  // Add specialized output format instructions based on analysis type
  switch (analysisType) {
    case 'timeline':
      specializedPrompt += `
## OUTPUT FORMAT
Format your analysis with the following structure:

Timeline Event: [Event description]
Timing Requirement: [Specific timing or deadline]
Dependencies: [Any predecessor events or conditions]
Responsible Party: [Party responsible for this timeline item]
Contract Location: [Section reference]
Potential Conflicts: [Any scheduling conflicts or unrealistic timelines]

After all timeline events, provide:

Timeline Recommendations:
- [Recommendations for managing critical timeline events and potential conflicts]
`;
      break;
      
    case 'obligation':
      specializedPrompt += `
## OUTPUT FORMAT
Format your analysis with the following structure:

Obligation: [Obligation description]
Responsible Party: [Party with this obligation]
Category: [Subject matter category]
Timing: [When this must be performed]
Conditionality: [Any conditions that trigger or modify this obligation]
Contract Location: [Section reference]
Related Topic: [Link to standard review topic]

After all obligations, provide:

Obligation Management Recommendations:
- [Recommendations for tracking and managing critical obligations]
`;
      break;
      
    case 'financial':
      specializedPrompt += `
## OUTPUT FORMAT
Format your analysis with the following structure:

Financial Term: [Term description]
Financial Impact: [Estimated monetary impact]
Risk Allocation: [How financial risk is allocated]
Payment Trigger: [What triggers this financial term]
Contract Location: [Section reference]
Potential Exposure: [Worst case financial scenario]

After all financial terms, provide:

Financial Recommendations:
- [Recommendations for managing financial exposure and optimizing terms]
`;
      break;
      
    case 'risk':
      // For risk analysis, we actually want to use the base risk prompt
      return BaseContractPrompt;
      
    case 'legal':
      specializedPrompt += `
## OUTPUT FORMAT
Format your analysis with the following structure:

Legal Requirement: [Requirement description]
Regulatory Source: [Applicable law or regulation]
Compliance Status: [Compliant, Non-compliant, or Unclear]
Risk Level: [Risk level of non-compliance]
Contract Location: [Section reference]
Recommendation: [How to address compliance issues]

After all legal requirements, provide:

Compliance Recommendations:
- [Recommendations for ensuring legal compliance]
`;
      break;
      
    case 'definitions':
      specializedPrompt += `
## OUTPUT FORMAT
Format your analysis with the following structure:

Defined Term: [Term name]
Definition: [How it's defined in the contract]
Contract Location: [Section reference]
Usage Impact: [How this definition affects contract interpretation]
Potential Issues: [Any ambiguities or problems with the definition]
Standard Comparison: [How this definition compares to industry standards]

After all defined terms, provide:

Definition Recommendations:
- [Recommendations for clarifying or improving definitions]
`;
      break;
      
    case 'stakeholders':
      specializedPrompt += `
## OUTPUT FORMAT
Format your analysis with the following structure:

Stakeholder: [Party name/role]
Primary Responsibilities: [Core responsibilities]
Key Rights: [Important rights granted]
Contract Location: [Section references]
Relationship Map: [How this stakeholder interacts with others]
Risk Exposure: [Risks specific to this stakeholder]

After all stakeholders, provide:

Stakeholder Management Recommendations:
- [Recommendations for managing stakeholder relationships]
`;
      break;
      
    case 'disputes':
      specializedPrompt += `
## OUTPUT FORMAT
Format your analysis with the following structure:

Dispute Mechanism: [Type of dispute resolution]
Process Description: [How the process works]
Timing Requirements: [Relevant timing for claims/disputes]
Jurisdiction/Venue: [Where disputes will be resolved]
Contract Location: [Section reference]
Risk Assessment: [Strengths/weaknesses of this approach]

After all dispute mechanisms, provide:

Dispute Resolution Recommendations:
- [Recommendations for improving dispute resolution procedures]
`;
      break;
      
    default:
      // If it's not a recognized type, use the base prompt
      return BaseContractPrompt;
  }
  
  // Add common ending guidance for all specialized prompts
  specializedPrompt += `
## IMPORTANT NOTES
- Maintain consistent formatting exactly as specified above
- Be specific about findings in the current contract text
- Analyze this particular contract, not generic industry standards
- Consider both immediate contractual issues and practical execution concerns
- Balance legal analysis with practical business implications
`;

  return specializedPrompt;
};

// Main prompt function for backward compatibility
export const Prompt = (analysisType: string = 'comprehensive', contractType: string = 'construction') => {
  return getSpecializedPrompt(analysisType as keyof typeof analysisTypeConfig, contractType);
};

// Backward compatibility for your existing code
export default () => BaseContractPrompt;