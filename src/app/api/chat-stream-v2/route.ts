import { NextRequest, NextResponse } from 'next/server';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { clientConfigService } from '@/services/clientConfigService';
import { ClientConfiguration } from '@/types/client-config';

// Enhanced stream transformation with consistent formatting
function enhancedTransformStream(
  readable: ReadableStream, 
  options: {
    includeThoughtProcess: boolean;
    styling: string;
    browser: string;
  }
): ReadableStream {
  const textDecoder = new TextDecoder();
  const textEncoder = new TextEncoder();
  
  // Track accumulated content, citations, and thought process
  let accumulatedContent = '';
  let accumulatedData = '';
  let fullResponse = '';
  let foundThoughts = '';
  let isFirstChunk = true;
  let citationCounter = 0;
  
  // Track extracted citations
  const extractedCitations: any[] = [];
  const extractedSources: any[] = [];
  const sentCitationIds = new Set<string>();
  
  // Track new citations found in each chunk
  let newCitationsInChunk: any[] = [];
  let newSourcesInChunk: any[] = [];
  
  // Track policies found in the response
  const policies: { title: string, description: string, source: string }[] = [];
  
  const transform = new TransformStream({
    transform(chunk, controller) {
      const text = textDecoder.decode(chunk);
      accumulatedData += text;
      
      // Extract any policy information from the chunk
      extractPoliciesFromChunk(text);
      
      // First, pass through the original chunk
      controller.enqueue(chunk);
      
      // Clear the new citations array
      newCitationsInChunk = [];
      newSourcesInChunk = [];
      
      // Check if this chunk has citations
      const updatedText = processCitationsInContent(text);
      
      // Update accumulated content
      accumulatedContent += updatedText;
      
      // Format full response consistently
      if (isFirstChunk) {
        isFirstChunk = false;
        
        // If we detect this is a policy-related query, start with a consistent header
        if (isPolicyRelatedQuery(accumulatedContent)) {
          fullResponse = "The available policies to review include:\n\n";
        }
      }
      
      // Send any new citations found in this chunk
      newCitationsInChunk.forEach(citation => {
        controller.enqueue(textEncoder.encode(JSON.stringify({
          type: 'citation',
          citation: citation
        }) + '\n'));
      });
      
      // Send any new sources found in this chunk
      newSourcesInChunk.forEach(source => {
        controller.enqueue(textEncoder.encode(JSON.stringify({
          type: 'supporting_content',
          source: source
        }) + '\n'));
      });
      
      // Check for thought process in the chunk
      if (options.includeThoughtProcess) {
        const thoughtsMatch = text.match(/"thoughts":\s*(\[.*?\])/s);
        if (thoughtsMatch && thoughtsMatch[1]) {
          try {
            const thoughts = JSON.parse(thoughtsMatch[1]);
            foundThoughts = extractThoughtProcess(thoughts);
          } catch (e) {
            console.warn('Failed to parse thoughts:', e);
          }
        }
      }
    },
    
    flush(controller) {
      // Send accumulated data on stream end
      if (foundThoughts && options.includeThoughtProcess) {
        controller.enqueue(textEncoder.encode(JSON.stringify({
          type: 'thought_process',
          thoughts: foundThoughts
        }) + '\n'));
      }
      
      // Send policy summary if applicable
      if (policies.length > 0) {
        const policyList = formatPolicies();
        controller.enqueue(textEncoder.encode(JSON.stringify({
          type: 'policy_summary',
          policies: policyList
        }) + '\n'));
      }
    }
  });
  
  function isPolicyRelatedQuery(content: string): boolean {
    const policyKeywords = [
      'policy', 'policies', 'procedure', 'procedures', 'guidelines', 'rules', 
      'compliance', 'standard', 'standards', 'regulation', 'regulations'
    ];
    
    const lowerContent = content.toLowerCase();
    return policyKeywords.some(keyword => lowerContent.includes(keyword));
  }
  
  function extractPoliciesFromChunk(chunk: string) {
    try {
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.trim().startsWith('data: ')) {
          const jsonStr = line.substring(6);
          try {
            const data = JSON.parse(jsonStr);
            if (data.data_points) {
              data.data_points.forEach((point: any) => {
                if (point.title && point.content) {
                  extractPoliciesFromSource(point);
                }
              });
            }
          } catch (e) {
            // Not JSON, continue
          }
        }
      }
    } catch (error) {
      console.warn('Error extracting policies from chunk:', error);
    }
  }
  
  function extractPoliciesFromSource(source: any) {
    try {
      const title = source.title || '';
      const content = source.content || '';
      
      // Look for policy-like content
      const policyIndicators = [
        'policy', 'procedure', 'guideline', 'standard', 'rule',
        'must', 'shall', 'required', 'mandatory', 'compliance'
      ];
      
      const hasPolicy = policyIndicators.some(indicator => 
        title.toLowerCase().includes(indicator) || 
        content.toLowerCase().includes(indicator)
      );
      
      if (hasPolicy) {
        // Extract a brief description
        let description = content.substring(0, 200);
        if (content.length > 200) {
          description += '...';
        }
        
        // Check if we already have this policy
        const existsAlready = policies.some(p => 
          p.title.toLowerCase() === title.toLowerCase()
        );
        
        if (!existsAlready) {
          policies.push({
            title: title,
            description: description,
            source: source.filepath || source.filename || 'Unknown'
          });
        }
      }
    } catch (error) {
      console.warn('Error extracting policy from source:', error);
    }
  }
  
  function formatPolicies(): string {
    if (policies.length === 0) return '';
    
    let formatted = "📋 **Related Policies Found:**\n\n";
    
    policies.forEach((policy, index) => {
      formatted += `${index + 1}. **${policy.title}**\n`;
      formatted += `   ${policy.description}\n`;
      formatted += `   *Source: ${policy.source}*\n\n`;
    });
    
    return formatted;
  }
  
  function processCitationsInContent(content: string, isFinal: boolean = false): string {
    try {
      const lines = content.split('\n');
      let processedContent = '';
      
      for (const line of lines) {
        if (line.trim().startsWith('data: ')) {
          const jsonStr = line.substring(6);
          try {
            const data = JSON.parse(jsonStr);
            
            if (data.data_points && Array.isArray(data.data_points)) {
              // Extract sources from data points
              const sources = extractSourcesFromDataPoints(data.data_points);
              sources.forEach(source => {
                const sourceId = `source_${source.title}_${source.filepath || 'unknown'}`;
                if (!sentCitationIds.has(sourceId)) {
                  newSourcesInChunk.push(source);
                  sentCitationIds.add(sourceId);
                }
              });
            }
            
            if (data.content) {
              processedContent += data.content;
            }
          } catch (e) {
            // Not JSON, add as regular content
            processedContent += line;
          }
        } else {
          processedContent += line;
        }
      }
      
      return processedContent;
    } catch (error) {
      console.warn('Error processing citations:', error);
      return content;
    }
  }
  
  function extractSourcesFromDataPoints(dataPoints: any[]): any[] {
    const sources: any[] = [];
    
    dataPoints.forEach(point => {
      try {
        if (typeof point === 'string') {
          // Try to parse as JSON
          const parsed = JSON.parse(point);
          if (parsed.title && parsed.content) {
            sources.push({
              title: parsed.title,
              content: parsed.content,
              filepath: parsed.filepath || 'Unknown',
              filename: getDocumentType(parsed.filepath)
            });
          }
        } else if (typeof point === 'object' && point !== null && 'title' in point) {
          sources.push({
            title: point.title,
            content: point.content || '',
            filepath: point.filepath || 'Unknown',
            filename: getDocumentType(point.filepath)
          });
        }
      } catch (e) {
        // Skip invalid points
      }
    });
    
    return sources;
  }
  
  function extractThoughtProcess(thoughts: any[]): string {
    try {
      if (!Array.isArray(thoughts)) return '';
      
      const formattedThoughts = thoughts
        .filter(thought => thought && typeof thought === 'string')
        .map((thought, index) => `${index + 1}. ${thought}`)
        .join('\n');
      
      return formattedThoughts;
    } catch (error) {
      console.warn('Error formatting thoughts:', error);
      return '';
    }
  }
  
  function getDocumentType(fileName?: string): string {
    if (!fileName) return 'Document';
    
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf': return 'PDF Document';
      case 'doc':
      case 'docx': return 'Word Document';
      case 'xls':
      case 'xlsx': return 'Excel Spreadsheet';
      case 'ppt':
      case 'pptx': return 'PowerPoint Presentation';
      case 'txt': return 'Text File';
      default: return 'Document';
    }
  }
  
  return readable.pipeThrough(transform);
}

// Function to get an access token using MSAL for a specific client configuration
async function getAccessToken(config: ClientConfiguration): Promise<string> {
  try {
    console.log(`Requesting Azure token for client: ${config.client_name}`);
    
    // Create MSAL config for this client
    const msalConfig = {
      auth: {
        clientId: config.azure_config.client_id,
        authority: `https://login.microsoftonline.com/${config.azure_config.tenant_id}`,
        clientSecret: config.azure_config.client_secret
      }
    };
    
    // Create confidential client application
    const msalInstance = new ConfidentialClientApplication(msalConfig);
    
    // Acquire token for application (client credentials flow)
    const tokenResponse = await msalInstance.acquireTokenByClientCredential({
      scopes: [`${config.azure_config.client_id}/.default`]
    });
    
    if (!tokenResponse || !tokenResponse.accessToken) {
      throw new Error(`No access token returned from MSAL for client: ${config.client_name}`);
    }
    
    console.log(`Azure token obtained successfully for client: ${config.client_name}`);
    return tokenResponse.accessToken;
  } catch (error) {
    console.error(`Error getting Azure token for client ${config.client_name}:`, error);
    throw error;
  }
}

// Helper to detect browser from user agent
function detectBrowser(userAgent: string | null): string {
  if (!userAgent) return 'unknown';
  
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    return 'safari';
  } else if (userAgent.includes('Chrome')) {
    return 'chrome';
  } else {
    return 'other';
  }
}

function createErrorResponse(message: string, status: number, details?: any) {
  return NextResponse.json(
    { 
      error: message, 
      details: details,
      timestamp: new Date().toISOString()
    }, 
    { status }
  );
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user and organization
    const supabase = createRouteHandlerClient({ cookies: () => cookies() });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return createErrorResponse('Authentication required', 401);
    }

    // Get user's profile to find organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();

    if (!profile?.organization_id) {
      return createErrorResponse('Organization not found for user', 404);
    }

    // Load client configuration for the organization
    const clientConfig = await clientConfigService.getClientConfig(profile.organization_id);
    
    if (!clientConfig) {
      return createErrorResponse('Client configuration not found for organization', 404);
    }

    // Validate client configuration
    const configValidation = clientConfigService.validateConfig(clientConfig);
    if (!configValidation.valid) {
      return createErrorResponse('Invalid client configuration', 400, configValidation.errors);
    }

    console.log(`Using client configuration: ${clientConfig.client_name} (${clientConfig.client_type})`);

    // Parse request body
    const { 
      message, 
      sessionId, 
      includeThoughtProcess = false, 
      styling = 'default' 
    } = await request.json();

    if (!message) {
      return createErrorResponse('Message is required', 400);
    }

    // Check rate limits
    // TODO: Implement rate limiting based on clientConfig.limits

    // Get access token using the client configuration
    const accessToken = await getAccessToken(clientConfig);

    // Detect browser for optimal streaming
    const userAgent = request.headers.get('user-agent');
    const browser = detectBrowser(userAgent);

    // Prepare the request to the backend using the configured URL
    const backendUrl = `${clientConfig.backend_config.api_url}/chat`;
    console.log(`Making request to backend: ${backendUrl}`);

    const backendResponse = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message,
        session_id: sessionId,
        user_id: session.user.id,
        organization_id: profile.organization_id,
        stream: true,
        include_thought_process: includeThoughtProcess,
        client_config: {
          name: clientConfig.client_name,
          type: clientConfig.client_type,
          features: clientConfig.features,
        }
      }),
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      console.error(`Backend error: ${backendResponse.status} - ${errorText}`);
      return createErrorResponse(
        `Backend service error: ${backendResponse.status}`, 
        backendResponse.status,
        { backendError: errorText }
      );
    }

    if (!backendResponse.body) {
      return createErrorResponse('No response body from backend', 500);
    }

    // Transform the stream with enhanced formatting
    const transformedStream = enhancedTransformStream(backendResponse.body, {
      includeThoughtProcess,
      styling,
      browser
    });

    // Return the streaming response
    return new Response(transformedStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
        'X-Client-Config': clientConfig.client_name,
        'X-Client-Type': clientConfig.client_type,
      },
    });

  } catch (error) {
    console.error('Chat stream error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('MSAL')) {
        return createErrorResponse('Authentication service error', 401, error.message);
      }
      if (error.message.includes('fetch')) {
        return createErrorResponse('Backend service unavailable', 503, error.message);
      }
    }
    
    return createErrorResponse('Internal server error', 500, error instanceof Error ? error.message : 'Unknown error');
  }
}

function isPolicyRelatedQuery(content: string): boolean {
  const policyKeywords = [
    'policy', 'policies', 'procedure', 'procedures', 'guidelines', 'rules', 
    'compliance', 'standard', 'standards', 'regulation', 'regulations'
  ];
  
  const lowerContent = content.toLowerCase();
  return policyKeywords.some(keyword => lowerContent.includes(keyword));
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Chat stream endpoint v2 - POST only',
    version: '2.0',
    features: ['database-driven-config', 'organization-based', 'feature-flags', 'rate-limiting']
  });
} 