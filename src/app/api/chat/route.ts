export const runtime = 'edge';

// Define types for contract analysis
interface ContractSection {
  sectionTitle: string;
  content: string;
}

interface ContractDocument {
  title: string;
  sections: ContractSection[];
}

interface FinancialProvisions {
  [key: string]: string | string[];
}

interface RiskAllocation {
  [key: string]: string;
}

interface ContractAnalysis {
  contractName?: string;
  contractDocuments?: ContractDocument[];
  financialProvisions?: FinancialProvisions;
  riskAllocation?: RiskAllocation;
  complianceRequirements?: string[] | string;
  summary?: string;
}

interface ResponseData {
  message?: {
    content: string;
  };
  contractAnalysis?: ContractAnalysis;
  context?: {
    followup_questions?: string[];
    [key: string]: any;
  };
}

export async function POST(req: Request) {
  try {
    // Parse the request body
    const body = await req.json();
    const { 
      messages,
      // Extract all the settings parameters
      temperature = 0.3,
      seed,
      stream: shouldStream = true,
      suggestFollowUpQuestions = false,
      promptTemplate,
      // Search config
      minSearchScore,
      minRerankerScore,
      includeCategory,
      excludeCategory,
      useSemanticRanker,
      useSemanticCaptions,
      retrievalMode,
      // Contract analysis parameters
      contractAnalysis,
      contractName,
      analysisPrompt
    } = body;

    // Get the last user message
    let lastUserMessage = "";
    if (Array.isArray(messages) && messages.length > 0) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          lastUserMessage = messages[i].content;
          break;
        }
      }
    }

    // Use the backend URL
    const BACKEND_URL = "https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io";
    const apiUrl = new URL("/chat", BACKEND_URL);

    // Look for contract analysis keywords in the message
    const isContractAnalysisRequest = 
      /analyze.*contract|contract.*analysis|contract.*risk/i.test(lastUserMessage);

    // Create a complete payload with all settings
    const payload = {
      messages: [{ role: "user", content: lastUserMessage }],
      // Include all settings parameters
      temperature,
      seed,
      stream: shouldStream,
      suggestFollowUpQuestions,
      promptTemplate,
      // Include search config if parameters are provided
      ...(minSearchScore !== undefined || 
         minRerankerScore !== undefined || 
         includeCategory !== undefined || 
         excludeCategory !== undefined || 
         useSemanticRanker !== undefined || 
         useSemanticCaptions !== undefined || 
         retrievalMode !== undefined) && {
        searchConfig: {
          ...(minSearchScore !== undefined && { minSearchScore }),
          ...(minRerankerScore !== undefined && { minRerankerScore }),
          ...(includeCategory !== undefined && { includeCategory }),
          ...(excludeCategory !== undefined && { excludeCategory }),
          ...(useSemanticRanker !== undefined && { useSemanticRanker }),
          ...(useSemanticCaptions !== undefined && { useSemanticCaptions }),
          ...(retrievalMode !== undefined && { retrievalMode })
        }
      },
      // Include contract analysis parameters
      ...(contractAnalysis || isContractAnalysisRequest ? {
        contractAnalysis: true,
        contractName: contractName || extractContractName(lastUserMessage),
        ...(analysisPrompt && { analysisPrompt })
      } : {})
    };

    // Log the payload for debugging
    console.log("Sending payload to backend:", JSON.stringify(payload, null, 2));

    // Call the backend API with timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(apiUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Add any required auth headers here
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend API error: ${response.status} ${response.statusText}`);
      console.error('Error details:', errorText);
      return new Response(
        JSON.stringify({
          error: `Backend API error: ${response.status} ${response.statusText}`,
          details: errorText
        }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // For non-streaming responses, handle it directly
    if (shouldStream === false) {
      try {
        // Get the response data
        const responseData = await response.json() as ResponseData;
        
        // Handle different response formats
        let messageContent: string;
        const context = responseData.context || {};
        
        if (responseData.message?.content) {
          // Standard chat response format
          messageContent = responseData.message.content;
        } else if (responseData.contractAnalysis) {
          // Handle structured contract analysis response
          messageContent = formatContractAnalysis(responseData.contractAnalysis);
        } else {
          // Fallback for other formats
          messageContent = JSON.stringify(responseData, null, 2);
        }

        // Add follow-up questions if enabled and not already present
        if (suggestFollowUpQuestions && !context.followup_questions?.length) {
          context.followup_questions = generateFollowUpQuestions(lastUserMessage, messageContent);
        }

        // Return a regular JSON response
        return new Response(
          JSON.stringify({ 
            content: messageContent,
            context
          }),
          {
            headers: { 'Content-Type': 'application/json' }
          }
        );
      } catch (error) {
        console.error('Error handling non-streaming response:', error);
        return new Response(
          JSON.stringify({
            error: 'Failed to process backend response',
            details: error instanceof Error ? error.message : 'Unknown error'
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // For streaming responses, use the simplified approach from the working version
    try {
      // First get the full response (this is the key change - we get the full response first)
      const responseData = await response.json() as ResponseData;
      
      // Extract content based on response format
      let messageContent: string;
      const context = responseData.context || {};
      
      if (responseData.message?.content) {
        messageContent = responseData.message.content;
      } else if (responseData.contractAnalysis) {
        messageContent = formatContractAnalysis(responseData.contractAnalysis);
      } else {
        messageContent = JSON.stringify(responseData, null, 2);
      }

      // Add follow-up questions if needed
      let followupQuestions: string[] = [];
      if (suggestFollowUpQuestions && !context.followup_questions?.length) {
        followupQuestions = generateFollowUpQuestions(lastUserMessage, messageContent);
      } else if (context.followup_questions) {
        followupQuestions = context.followup_questions;
      }

      // Create a simple word-by-word stream that simulates chunk-by-chunk delivery
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          // Split the message into word chunks to simulate streaming
          const words = messageContent.split(/\s+/);
          for (let i = 0; i < words.length; i++) {
            // Add a space after each word except the last one
            const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
            // Format the chunk to match what the component is expecting
            const jsonLine = JSON.stringify({ content: chunk });
            controller.enqueue(encoder.encode(jsonLine + '\n'));
            // Add a small delay to simulate streaming (adjust as needed)
            await new Promise(resolve => setTimeout(resolve, 10));
          }
          
          // Send the follow-up questions at the end if needed
          if (followupQuestions.length > 0) {
            const contextLine = JSON.stringify({ 
              content: '', 
              context: { followup_questions: followupQuestions }
            });
            controller.enqueue(encoder.encode(contextLine + '\n'));
          }
          
          controller.close();
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error handling streaming response:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to process streaming response',
          details: error instanceof Error ? error.message : 'Unknown error'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An error occurred'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Helper function to generate follow-up questions
function generateFollowUpQuestions(userMessage: string, aiResponse: string): string[] {
  const lowerUserMessage = userMessage.toLowerCase();
  const lowerAiResponse = aiResponse.toLowerCase();
  
  // Default questions
  const defaultQuestions = [
    "What types of construction contracts are commonly used?",
    "How are risks typically allocated in construction contracts?",
    "What are the key financial considerations in construction projects?"
  ];

  // Contract analysis related questions
  if (lowerUserMessage.includes('contract') || lowerAiResponse.includes('contract')) {
    if (lowerUserMessage.includes('risk') || lowerAiResponse.includes('risk')) {
      return [
        "What are the most common risks in construction contracts?",
        "How can financial risks be mitigated in construction projects?",
        "What insurance requirements should be included in construction contracts?"
      ];
    }
    
    if (lowerUserMessage.includes('payment') || lowerAiResponse.includes('payment')) {
      return [
        "What are typical payment terms in construction contracts?",
        "How are retainage amounts typically structured?",
        "What methods are used to verify work before payment?"
      ];
    }
    
    return [
      "What are the key differences between contract types?",
      "How do change orders impact contract pricing?",
      "What financial provisions should be included in construction contracts?"
    ];
  }
  
  // CMAR specific questions
  if (lowerUserMessage.includes('construction manager') || 
      lowerUserMessage.includes('cmar') || 
      lowerAiResponse.includes('construction manager at risk')) {
    return [
      "How does a CMAR contract differ from Design-Bid-Build?",
      "What preconstruction services are typically included in CMAR?",
      "How is the GMP (Guaranteed Maximum Price) established in CMAR contracts?"
    ];
  }
  
  // City contracts
  if (lowerUserMessage.includes('city of houston') || lowerUserMessage.includes('houston contract')) {
    return [
      "What are typical insurance requirements in municipal contracts?",
      "How are change orders handled in city construction contracts?",
      "What bonding requirements are common in municipal projects?"
    ];
  }
  
  // Return default questions if no specific category matches
  return defaultQuestions;
}

// Helper function to extract contract name from message
function extractContractName(message: string): string | null {
  // Look for patterns like "analyze the contract [name]"
  const contractNameRegex = /analyze\s+(?:the\s+)?contract\s+(?:for\s+)?[\"']?([^\"']+)[\"']?/i;
  const match = message.match(contractNameRegex);
  return match ? match[1].trim() : null;
}

// Helper function to format contract analysis as structured text
function formatContractAnalysis(analysis: ContractAnalysis): string {
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
      Object.entries(analysis.financialProvisions).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          result += `### ${formatKey(key)}\n\n`;
          value.forEach((item: string) => {
            result += `- ${item}\n`;
          });
          result += "\n";
        } else {
          result += `### ${formatKey(key)}\n\n${value}\n\n`;
        }
      });
    }
  }
  
  // Add risk allocation section
  if (analysis.riskAllocation) {
    result += "## Risk Allocation\n\n";
    
    if (typeof analysis.riskAllocation === 'string') {
      result += `${analysis.riskAllocation}\n\n`;
    } else {
      Object.entries(analysis.riskAllocation).forEach(([key, value]) => {
        result += `### ${formatKey(key)}\n\n${value}\n\n`;
      });
    }
  }
  
  // Add compliance requirements section if available
  if (analysis.complianceRequirements) {
    result += "## Compliance Requirements\n\n";
    
    if (Array.isArray(analysis.complianceRequirements)) {
      analysis.complianceRequirements.forEach((item: string) => {
        result += `- ${item}\n`;
      });
      result += "\n";
    } else {
      result += `${analysis.complianceRequirements}\n\n`;
    }
  }
  
  return result;
}

// Helper function to format keys for better readability
function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, (str: string) => str.toUpperCase()) // Capitalize first letter
    .trim();
}