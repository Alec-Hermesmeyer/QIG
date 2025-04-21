// src/services/apiClient.ts

/**
 * Service for handling API calls to the language model providers
 */
export const apiClient = {
    /**
     * Get contract analysis from the Groq API
     */
    async getContractAnalysis(prompt: string, model = 'llama3-8b-8192', temperature = 0.2): Promise<string> {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content: 'You are a contract analysis expert specialized in identifying contract risks and their precise locations. Be extremely specific about where each risk appears in the contract.'
              },
              { 
                role: 'user', 
                content: prompt 
              }
            ],
            temperature,
            max_tokens: 4096,
          }),
        });
  
        if (!res.ok) {
          let errorMessage = `API error: ${res.status} ${res.statusText}`;
          try {
            const errorData = await res.json();
            errorMessage = errorData.error?.message || errorMessage;
          } catch (e) {
            // If JSON parsing fails, use the status text
          }
          throw new Error(errorMessage);
        }
  
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
  
        if (!content) {
          throw new Error('No content received from API');
        }
  
        return content;
      } catch (error) {
        console.error('Error calling Groq API:', error);
        throw error;
      }
    },
  
    /**
     * Generate a fix suggestion for a risky contract clause
     */
    async generateFixSuggestion(riskCategory: string, riskScore: string, riskText: string, riskReason: string, riskLocation: string, model = 'llama3-8b-8192'): Promise<string> {
      try {
        const fixPrompt = `
  You are an expert contract attorney. Review the following contract clause that has been identified as risky and suggest specific language to fix the issue.
  
  RISK CATEGORY: ${riskCategory}
  RISK SEVERITY: ${riskScore}
  PROBLEMATIC CONTRACT TEXT: "${riskText}"
  ISSUE DESCRIPTION: ${riskReason}
  LOCATION IN CONTRACT: ${riskLocation}
  
  Please provide:
  1. A specific rewritten version of this clause that would fix the issue
  2. A brief explanation of how your rewrite addresses the risk
  3. Any additional advice on implementing this change
        `;
  
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: fixPrompt }],
            temperature: 0.7, // Slightly higher temperature for more creative solutions
            max_tokens: 2048,
          }),
        });
  
        if (!res.ok) {
          throw new Error(`API error: ${res.status} ${res.statusText}`);
        }
  
        const data = await res.json();
        const fixContent = data.choices?.[0]?.message?.content;
  
        if (!fixContent) {
          throw new Error('No content received from API');
        }
  
        return fixContent;
      } catch (error) {
        console.error('Error generating fix suggestion:', error);
        throw error;
      }
    },
  
    /**
     * Generate a redline comparison between original and revised contract text
     * Note: This is a placeholder for future implementation
     */
    async generateRedlines(originalText: string, revisedText: string): Promise<{ 
      htmlDiff: string, 
      changes: { 
        added: string[], 
        removed: string[], 
        modified: string[] 
      } 
    }> {
      // This would normally call a diff algorithm or an API service
      // For now, returning a placeholder
      console.log("Would generate redlines between original and revised texts");
      
      return {
        htmlDiff: '<p>Sample redline content would be generated here</p>',
        changes: {
          added: ['Added section 1', 'Added section 2'],
          removed: ['Removed section 1'],
          modified: ['Modified section 1']
        }
      };
    }
  };