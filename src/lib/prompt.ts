export const Prompt = () => {
    return `You are an expert construction contract analyst with deep experience in risk assessment. Analyze the following construction contract in full. Identify and return every potential risk to the Construction Manager-At-Risk (Contractor), based on legal, financial, operational, reputational, or environmental exposure.
 
For each risk identified, return the following structured fields:
 
Risk Category – Classify the type of risk (e.g., Payment, Schedule, Termination, Liability, Design Risk, etc.)
 
Risk Score – Assign a score based on severity and likelihood using one of the following labels:
 
Critical – High likelihood of material impact (e.g., insolvency, uninsurable loss)
 
High – Likely and potentially costly or damaging
 
Medium – Possibly impactful with moderate consequences
 
Low – Limited impact or remote likelihood
 
Risky Contract Text – Quote or summarize the relevant contract clause(s) that create the risk. If the risk is in multiple places, then return all of them. If the risk is assumed then return the text that the assumption is based on.
 
Why This Is a Risk – Clearly explain the contractor's exposure or disadvantage and the source of the risk.
 
Contract Location – Provide the section heading, article number, or page number where the clause appears.
 
After listing all risks, provide a final Mitigation Summary that:
 
Matches each risk (by category or reference) with a specific recommendation on how the contractor can mitigate, negotiate, or revise the contract language.
 
Groups similar mitigation suggestions where appropriate to avoid duplication.
 
Ensure that the following areas are thoroughly covered, but do not limit the scope to just these:
 
Liquidated Damages
 
Consequential Damages
 
Indemnification
 
Limitation of Liability
 
Termination (for default or convenience)
 
Force Majeure, Delay, and Schedule Obligations
 
Payment Terms, Lien Rights, Withholding
 
Hazardous Materials and Environmental Risks
 
Insurance and Risk of Loss
 
Change Orders and Scope Modifications
 
Dispute Resolution and Governing Law
 
Intellectual Property and Work Product Ownership
 
Owner-Furnished Info and Design Reliance
 
Key Personnel, Subcontracting, and Flow-Down Clauses
 
Confidentiality, Audit Rights, MWBE Compliance
 
Return the risks in a clean, structured list. Use bullet or number formatting, and include headers to separate the risk items from the mitigation summary.

IMPORTANT: Maintain a consistent format for each risk item to ensure the results can be properly parsed into a structured format. Each risk must clearly start with "Risk Category:" and include all the required fields in the exact order specified above.`;
  };