/**
 * Utility functions for processing JSON input in chat messages
 */

/**
 * Check if a string contains valid JSON
 * @param text Text to check for JSON content
 * @returns True if valid JSON is found, false otherwise
 */
export function containsJSON(text: string): boolean {
    // Look for text that starts with { and ends with } or starts with [ and ends with ]
    const jsonRegex = /\{[\s\S]*\}|\[[\s\S]*\]/g;
    const matches = text.match(jsonRegex);
    
    if (!matches) return false;
    
    // Try to parse at least one of the matches
    for (const match of matches) {
      try {
        JSON.parse(match);
        return true;
      } catch (e) {
        // Continue to next match if this one isn't valid JSON
        continue;
      }
    }
    
    return false;
  }
  
  /**
   * Extract JSON objects from a string
   * @param text Text containing JSON
   * @returns Array of parsed JSON objects
   */
  export function extractJSONObjects(text: string): any[] {
    const jsonRegex = /\{[\s\S]*?\}|\[[\s\S]*?\]/g;
    const matches = text.match(jsonRegex);
    
    if (!matches) return [];
    
    const results: any[] = [];
    
    for (const match of matches) {
      try {
        const parsed = JSON.parse(match);
        results.push(parsed);
      } catch (e) {
        // Skip invalid JSON
        console.log("Failed to parse JSON:", match);
      }
    }
    
    return results;
  }
  
  /**
   * Extract contract analysis JSON from text
   * @param text Text containing contract analysis JSON
   * @returns Contract analysis object or null if not found
   */
  export function extractContractAnalysis(text: string): any {
    const jsonObjects = extractJSONObjects(text);
    
    // Find an object that has a contractAnalysis property
    for (const obj of jsonObjects) {
      if (obj.contractAnalysis) {
        return obj.contractAnalysis;
      }
    }
    
    return null;
  }
  
  /**
   * Format contract analysis for display
   * @param analysis Contract analysis object
   * @returns Formatted string for display
   */
  export function formatContractAnalysis(analysis: any): string {
    if (!analysis) return '';
    
    let result = '';
    
    // Add contract name as header
    if (analysis.contractName) {
      result += `# Contract Analysis: ${analysis.contractName}\n\n`;
    }
    
    // Add summary section
    result += "## Summary\n\n";
    if (analysis.summary) {
      result += `${analysis.summary}\n\n`;
    } else {
      result += "Analysis of contract terms and financial provisions.\n\n";
    }
    
    // Add financial provisions section
    if (analysis.financialProvisions) {
      result += "## Financial Provisions\n\n";
      
      if (typeof analysis.financialProvisions === 'string') {
        result += `${analysis.financialProvisions}\n\n`;
      } else {
        for (const [key, value] of Object.entries(analysis.financialProvisions)) {
          const formattedKey = key
            .replace(/([A-Z])/g, ' $1') // Add space before capital letters
            .replace(/^./, (str: string) => str.toUpperCase()) // Capitalize first letter
            .trim();
            
          result += `### ${formattedKey}\n\n`;
          
          if (Array.isArray(value)) {
            for (const item of value) {
              result += `- ${item}\n`;
            }
            result += "\n";
          } else {
            result += `${value}\n\n`;
          }
        }
      }
    }
    
    // Add risk allocation section
    if (analysis.riskAllocation) {
      result += "## Risk Allocation\n\n";
      
      if (typeof analysis.riskAllocation === 'string') {
        result += `${analysis.riskAllocation}\n\n`;
      } else {
        for (const [key, value] of Object.entries(analysis.riskAllocation)) {
          const formattedKey = key
            .replace(/([A-Z])/g, ' $1') // Add space before capital letters
            .replace(/^./, (str: string) => str.toUpperCase()) // Capitalize first letter
            .trim();
            
          result += `### ${formattedKey}\n\n${value}\n\n`;
        }
      }
    }
    
    // Add compliance requirements section if available
    if (analysis.complianceRequirements) {
      result += "## Compliance Requirements\n\n";
      
      if (Array.isArray(analysis.complianceRequirements)) {
        for (const item of analysis.complianceRequirements) {
          result += `- ${item}\n`;
        }
        result += "\n";
      } else {
        result += `${analysis.complianceRequirements}\n\n`;
      }
    }
    
    return result;
  }