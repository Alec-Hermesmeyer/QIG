// app/api/chat-stream/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { clientConfigService } from '@/services/clientConfigService';

// Type definition for client configuration
interface ClientConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  apiUrl: string;
}

// Function to get client configuration from database
async function getClientConfiguration(organizationId?: string): Promise<ClientConfig | null> {
  if (!organizationId) {
    console.log('No organization ID provided, using fallback configuration');
    return getFallbackConfiguration();
  }

  try {
    console.log(`Loading configuration for organization: ${organizationId}`);
    const config = await clientConfigService.getClientConfig(organizationId);
    
    if (!config) {
      console.log('No database configuration found, using fallback');
      return getFallbackConfiguration();
    }

    // Extract configuration values
    const clientConfig: ClientConfig = {
      tenantId: config.azure_config?.tenant_id || process.env.AZURE_TENANT_ID || '',
      clientId: config.azure_config?.client_id || process.env.AZURE_CLIENT_ID || '',
      clientSecret: process.env.AZURE_SECRET || '', // Always from env for security
      apiUrl: config.backend_config?.api_url || getFallbackConfiguration().apiUrl
    };

    console.log(`Database configuration loaded for ${organizationId}:`, {
      ...clientConfig,
      clientSecret: clientConfig.clientSecret ? '[REDACTED]' : '[MISSING]'
    });

    return clientConfig;
  } catch (error) {
    console.error('Error loading client configuration from database:', error);
    return getFallbackConfiguration();
  }
}

// Fallback configuration (backward compatibility)
function getFallbackConfiguration(): ClientConfig {
  return {
    tenantId: process.env.AZURE_TENANT_ID || '',
    clientId: process.env.AZURE_CLIENT_ID || '',
    clientSecret: process.env.AZURE_SECRET || '',
    apiUrl: process.env.NEXT_PUBLIC_DEFAULT_BACKEND_URL || 
            'https://capps-backend-vakcnm7wmon74.salmonbush-fc2963f0.eastus.azurecontainerapps.io'
  };
}

// Global client configurations - removed, now using database

// Validate specific client configuration
function validateClientConfig(config: ClientConfig | null): { valid: boolean; error?: string } {
  if (!config) {
    return { valid: false, error: 'Client configuration not found' };
  }
  
  const missingVars = [];
  if (!config.tenantId) missingVars.push('tenantId');
  if (!config.clientId) missingVars.push('clientId');
  if (!config.clientSecret) missingVars.push('clientSecret');
  if (!config.apiUrl) missingVars.push('apiUrl');
  
  if (missingVars.length > 0) {
    const errorMsg = `Missing configuration: ${missingVars.join(', ')}`;
    console.error(errorMsg);
    return { valid: false, error: errorMsg };
  }
  
  return { valid: true };
}

// Function to get an access token using MSAL for a specific client configuration
async function getAccessToken(config: ClientConfig): Promise<string> {
  try {
    console.log('Requesting Azure token with database configuration');
    
    // Create MSAL config for this client
    const msalConfig = {
      auth: {
        clientId: config.clientId,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
        clientSecret: config.clientSecret
      }
    };
    
    // Create confidential client application
    const msalInstance = new ConfidentialClientApplication(msalConfig);
    
    // Acquire token for application (client credentials flow)
    const tokenResponse = await msalInstance.acquireTokenByClientCredential({
      scopes: [`${config.clientId}/.default`]
    });
    
    if (!tokenResponse || !tokenResponse.accessToken) {
      throw new Error('No access token returned from MSAL');
    }
    
    console.log('Azure token obtained successfully');
    return tokenResponse.accessToken;
  } catch (error) {
    console.error('Error getting Azure token:', error);
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
            
            // Send thought process as a separate message
            controller.enqueue(textEncoder.encode(JSON.stringify({
              type: 'thought_process',
              content: foundThoughts
            }) + '\n'));
          } catch (e) {
            console.error('Error parsing thoughts:', e);
          }
        }
      }
      
      // Check for sources data in the chunk
      const dataPointsMatch = text.match(/"data_points":\s*(\{.*?\})/s);
      if (dataPointsMatch && dataPointsMatch[1]) {
        try {
          const dataPoints = JSON.parse(dataPointsMatch[1]);
          if (dataPoints.text && Array.isArray(dataPoints.text)) {
            const sources = extractSourcesFromDataPoints(dataPoints.text);
            sources.forEach(source => {
              if (!sentCitationIds.has(source.id)) {
                sentCitationIds.add(source.id);
                extractedSources.push(source);
                
                // Check for policy information in this source
                extractPoliciesFromSource(source);
                
                // Send supporting content
                controller.enqueue(textEncoder.encode(JSON.stringify({
                  type: 'supporting_content',
                  source: source
                }) + '\n'));
                
                // Send citation
                controller.enqueue(textEncoder.encode(JSON.stringify({
                  type: 'citation',
                  citation: {
                    id: source.id,
                    fileName: source.fileName,
                    page: source.page,
                    text: source.excerpts?.[0] || ''
                  }
                }) + '\n'));
              }
            });
          }
        } catch (e) {
          console.error('Error parsing data points:', e);
        }
      }
    },
    
    flush(controller) {
      // Final scan for citations in the full content
      processCitationsInContent(accumulatedContent, true);
      
      // Create a consistently formatted response for policy information
      let formattedContent = accumulatedContent;
      
      // If we detected policies, format them consistently regardless of browser
      if (policies.length > 0) {
        formattedContent = formatPolicies();
      }
      
      // Send a final 'done' message with complete data
      const completeAnswer = {
        content: formattedContent,
        thoughts: foundThoughts,
        sources: extractedSources,
        documentExcerpts: extractedSources,
        citations: extractedCitations
      };
      
      controller.enqueue(textEncoder.encode(JSON.stringify({
        type: 'done',
        answer: completeAnswer
      }) + '\n'));
    }
  });
  
  // Function to check if this is a policy-related query
  function isPolicyRelatedQuery(content: string): boolean {
    const policyKeywords = [
      'policy', 'policies', 'insurance', 'coverage', 'liability', 
      'commercial', 'executive', 'available', 'review'
    ];
    
    // Check if multiple policy keywords are present
    const keywordCount = policyKeywords.filter(keyword => 
      content.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    
    return keywordCount >= 2;
  }
  
  // Function to extract policy information from chunks
  function extractPoliciesFromChunk(chunk: string) {
    // Look for patterns like "1. **Policy Name** - Description"
    const policyRegex = /(\d+)\.\s+\*\*([^*]+)\*\*\s+-\s+([^[]+)(\[[^\]]+\])?/g;
    let match;
    
    while ((match = policyRegex.exec(chunk)) !== null) {
      const policyNumber = match[1];
      const policyTitle = match[2].trim();
      const policyDescription = match[3].trim();
      const policySource = match[4] || '';
      
      // Check if we already have this policy
      const existingIndex = policies.findIndex(p => p.title === policyTitle);
      if (existingIndex >= 0) {
        // Update existing policy
        policies[existingIndex].description = policyDescription;
        if (policySource) policies[existingIndex].source = policySource;
      } else {
        // Add new policy
        policies.push({
          title: policyTitle,
          description: policyDescription,
          source: policySource
        });
      }
    }
  }
  
  // Function to extract policy information from source
  function extractPoliciesFromSource(source: any) {
    if (!source.excerpts || source.excerpts.length === 0) return;
    
    const excerpt = source.excerpts[0];
    
    // Look for policy titles in the source
    const policyTitleRegex = /(Commercial\s+Insurance|Executive\s+Liability|Investment\s+Management\s+Liability)\s+(Policy|Policies|Solutions)/gi;
    let match;
    
    while ((match = policyTitleRegex.exec(excerpt)) !== null) {
      const policyTitle = match[0];
      
      // Extract a reasonable description (up to 200 chars after the title)
      let startIdx = match.index + match[0].length;
      let endIdx = Math.min(startIdx + 200, excerpt.length);
      let description = excerpt.substring(startIdx, endIdx).trim();
      
      // Truncate at sentence end if possible
      const sentenceEnd = description.search(/[.!?]\s/);
      if (sentenceEnd > 0) {
        description = description.substring(0, sentenceEnd + 1);
      }
      
      // Only add if this is a substantial description
      if (description.length > 30) {
        // Check if we already have this policy
        const existingIndex = policies.findIndex(p => 
          p.title.toLowerCase().includes(policyTitle.toLowerCase()) ||
          policyTitle.toLowerCase().includes(p.title.toLowerCase())
        );
        
        if (existingIndex >= 0) {
          // Update if the new description is longer
          if (description.length > policies[existingIndex].description.length) {
            policies[existingIndex].description = description;
            policies[existingIndex].source = `[${source.fileName}]`;
          }
        } else {
          // Add new policy
          policies.push({
            title: policyTitle,
            description: description,
            source: `[${source.fileName}]`
          });
        }
      }
    }
  }
  
  // Function to format policies consistently
  function formatPolicies(): string {
    let formattedText = "The available policies to review include:\n\n";
    
    policies.forEach((policy, index) => {
      formattedText += `${index + 1}. **${policy.title}** - ${policy.description} ${policy.source}\n\n`;
    });
    
    // Add a closing statement if there are policies
    if (policies.length > 0) {
      formattedText += "For more specific details about the policies, you may want to contact your local independent agency or review the policy documents directly.";
    }
    
    return formattedText;
  }
  
  // Function to process citations in text content
  function processCitationsInContent(content: string, isFinal: boolean = false): string {
    // Look for citation patterns like [FILENAME.pdf#page=123] or [page=123]
    const citationRegex = /\[(.*?\.(pdf|docx?|txt)(?:#page=\d+)?|page=\d+)\]/g;
    let match;
    
    const updatedContent = content.replace(citationRegex, (match, citation) => {
      // Extract file name and page if available
      let fileName = citation;
      let page: number | undefined = undefined;
      
      // Check if citation is just a page reference like [page=123]
      if (citation.startsWith('page=')) {
        page = parseInt(citation.substring(5), 10);
        // If we've seen page-only citations, they should reference the last full filename
        if (extractedCitations.length > 0) {
          fileName = extractedCitations[extractedCitations.length - 1].fileName;
        } else {
          fileName = 'Unknown Document';
        }
      } else {
        // Check if citation includes a page number like [file.pdf#page=123]
        const pageMatch = citation.match(/#page=(\d+)/);
        if (pageMatch) {
          page = parseInt(pageMatch[1], 10);
          fileName = citation.split('#')[0];
        }
      }
      
      // Generate source/citation ID
      const citationId = `citation-${++citationCounter}`;
      
      // Create citation object
      const citationObj = {
        id: citationId,
        fileName: fileName,
        page: page,
        text: `Content from ${fileName}${page ? ` page ${page}` : ''}`
      };
      
      // Only add if we haven't seen this exact citation before
      const citationKey = `${fileName}-${page || 0}`;
      if (!sentCitationIds.has(citationKey)) {
        sentCitationIds.add(citationKey);
        extractedCitations.push(citationObj);
        
        // Create source object
        const sourceObj = {
          id: citationId,
          fileName: fileName,
          page: page,
          score: 0.8,
          excerpts: [`Content from ${fileName}${page ? ` page ${page}` : ''}`],
          type: getDocumentType(fileName)
        };
        
        extractedSources.push(sourceObj);
        
        // IMPORTANT: Only collect these events during processing, not during final flush
        if (!isFinal) {
          newCitationsInChunk.push(citationObj);
          newSourcesInChunk.push(sourceObj);
        }
      }
      
      // Return the original citation text (don't modify the content)
      return match;
    });
    
    return updatedContent;
  }
  
  // Helper function to extract sources from data points
  function extractSourcesFromDataPoints(dataPoints: string[]): any[] {
    if (!dataPoints || !Array.isArray(dataPoints)) {
      return [];
    }
    
    const sources: any[] = [];
    let sourceCounter = 0;
    
    dataPoints.forEach((dataPoint, index) => {
      // Pattern like: "FILENAME.pdf#page=123: Content"
      const sourceMatch = dataPoint.match(/^(.*?\.(pdf|docx?|txt|html|xlsx?)(?:#page=(\d+))?):(.*)$/s);
      
      if (sourceMatch) {
        const fileName = sourceMatch[1].trim();
        const pageNumber = sourceMatch[3] ? parseInt(sourceMatch[3], 10) : undefined;
        const content = sourceMatch[4].trim();
        const sourceId = `source-${sourceCounter++}`;
        
        // Create source object
        sources.push({
          id: sourceId,
          fileName: fileName,
          page: pageNumber,
          score: 0.8, // Default relevance score
          excerpts: [content],
          type: getDocumentType(fileName)
        });
      }
    });
    
    return sources;
  }
  
  // Helper function to extract thought process
  function extractThoughtProcess(thoughts: any[]): string {
    if (!thoughts || !Array.isArray(thoughts)) {
      return '';
    }
    
    return thoughts.map(thought => {
      let content = `## ${thought.title || 'Thought'}\n\n`;
      
      if (thought.description) {
        if (Array.isArray(thought.description)) {
          thought.description.forEach((item: any) => {
            if (item.role && item.content) {
              if (item.role !== 'system') {
                content += `**${item.role}**: ${item.content}\n\n`;
              }
            } else if (typeof item === 'string') {
              content += item + '\n\n';
            } else {
              content += JSON.stringify(item, null, 2) + '\n\n';
            }
          });
        } else if (typeof thought.description === 'string') {
          content += thought.description;
        } else {
          content += JSON.stringify(thought.description, null, 2);
        }
      }
      
      return content;
    }).join('\n\n---\n\n');
  }
  
  // Helper function to determine document type
  function getDocumentType(fileName?: string): string {
    if (!fileName) return 'document';
    const extension = fileName.split('.').pop()?.toLowerCase();
  
    switch (extension) {
      case 'pdf': return 'pdf';
      case 'docx': case 'doc': return 'word';
      case 'xlsx': case 'xls': case 'csv': return 'spreadsheet';
      case 'txt': return 'text';
      case 'html': case 'htm': return 'web';
      case 'json': case 'js': case 'py': return 'code';
      case 'jpg': case 'jpeg': case 'png': case 'gif': case 'bmp': case 'svg': return 'image';
      default: return 'document';
    }
  }
  
  return readable.pipeThrough(transform);
}

// Helper function to create error responses
function createErrorResponse(message: string, status: number, details?: any) {
  const errorObj = {
    error: message,
    timestamp: new Date().toISOString()
  };
  
  if (details) {
    Object.assign(errorObj, { details });
  }
  
  return NextResponse.json(errorObj, { status });
}

export async function POST(request: NextRequest) {
  console.log('Chat stream API request received');
  
  try {
    // Get request body
    const body = await request.json();
    console.log('Request body parsed');
    
    // Get user's organization from Supabase auth
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    let organizationId: string | undefined;
    
    if (session?.user) {
      // Get user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, organizations!inner(name)')
        .eq('id', session.user.id)
        .single();
      
      const userOrganizationId = profile?.organization_id;
      const userOrganizationName = (profile?.organizations as any)?.name;
      
      console.log(`User organization: ${userOrganizationName} (${userOrganizationId})`);
      
      // Check if this is a QIG user trying to act as another organization
      const organizationOverride = request.headers.get('x-organization-override');
      
      if (organizationOverride && userOrganizationName === 'QIG') {
        console.log(`QIG user requesting to act as organization: ${organizationOverride}`);
        
        // Verify the override organization exists
        const { data: targetOrg } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('id', organizationOverride)
          .single();
        
        if (targetOrg) {
          organizationId = organizationOverride;
          console.log(`QIG user successfully acting as: ${targetOrg.name} (${organizationId})`);
        } else {
          console.warn(`Invalid organization override: ${organizationOverride}`);
          organizationId = userOrganizationId;
        }
      } else if (organizationOverride && userOrganizationName !== 'QIG') {
        console.warn(`Non-QIG user (${userOrganizationName}) attempted organization override - denied`);
        organizationId = userOrganizationId;
      } else {
        organizationId = userOrganizationId;
      }
      
      console.log(`Final organization ID for request: ${organizationId}`);
    } else {
      console.log('No authenticated user, using fallback configuration');
    }
    
    // Load client configuration from database
    const clientConfig = await getClientConfiguration(organizationId);
    
    // Check for thought process and styling preferences
    const includeThoughtProcess = body.include_thought_process === true;
    const styling = body.styling || 'default';
    
    // Detect browser from user agent for consistent response formatting
    const browser = detectBrowser(request.headers.get('user-agent'));
    console.log(`Browser detected: ${browser}`);
    
    console.log(`Include thought process: ${includeThoughtProcess}`);
    console.log(`Styling: ${styling}`);
    
    // Validate client configuration
    const configCheck = validateClientConfig(clientConfig);
    if (!configCheck.valid) {
      return createErrorResponse('Client configuration error', 400, configCheck.error);
    }
    
    // Get Azure token using MSAL with the loaded configuration
    let token;
    try {
      token = await getAccessToken(clientConfig!);
    } catch (tokenError) {
      console.error('Failed to obtain Azure token:', tokenError);
      return createErrorResponse(
        'Authentication failed', 
        401, 
        { message: (tokenError as Error).message }
      );
    }
    
    // Get the API URL from the configuration
    const targetUrl = `${clientConfig!.apiUrl}/chat/stream`;
    console.log(`Forwarding request to: ${targetUrl}`);
    
    // Check if this is a policy-related query
    const isPolicyQuery = body.messages && body.messages.length > 0 && 
                         isPolicyRelatedQuery(body.messages[body.messages.length - 1].content);
    
    // For policy queries, ensure consistent formatting across browsers
    if (isPolicyQuery) {
      console.log('Detected policy-related query, applying consistent formatting');
      
      // Add a marker to ensure consistent response formatting
      body.format_style = 'policy_summary';
    }
    
    // Add parameters for thought process based on configuration
    if (includeThoughtProcess) {
      body.include_thoughts = true;
      body.include_reasoning = true;
      body.show_thoughts = true;
      body.show_thinking = true;
    }
    
    // Always request sources/citations
    body.include_sources = true;
    body.include_citations = true;
    
    // Forward the request with enhanced options
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'NextJS-MSAL-Chat-Stream',
        'Accept': 'text/event-stream',
        'X-Include-Thought-Process': includeThoughtProcess ? 'true' : 'false',
        'X-Include-Citations': 'true',
        'X-Styling': styling,
        'X-Browser': browser
      },
      body: JSON.stringify(body)
    });
    
    // Log response status
    console.log(`Target API responded with status: ${response.status} ${response.statusText}`);
    
    // Handle error responses
    if (!response.ok) {
      // Create a copy of the response to read the body
      const clonedResponse = response.clone();
      
      let errorDetails;
      try {
        errorDetails = await clonedResponse.json();
      } catch {
        errorDetails = await clonedResponse.text();
      }
      
      if (response.status === 403) {
        console.error('Access forbidden (403) to target API:', errorDetails);
        return createErrorResponse(
          'Access denied to chat service', 
          403, 
          { message: 'The server was denied access to the chat service. This may be due to invalid credentials or insufficient permissions.' }
        );
      }
      
      return createErrorResponse(
        `Failed to fetch from chat/stream: ${response.statusText}`,
        response.status,
        { apiResponse: errorDetails }
      );
    }
    
    // Ensure we have a response body
    const responseBody = response.body;
    if (!responseBody) {
      return createErrorResponse('No response body received', 500);
    }
    
    // Use our enhanced transform that ensures consistent formatting across browsers
    const transformedStream = enhancedTransformStream(responseBody, {
      includeThoughtProcess,
      styling,
      browser
    });
    
    // Return the streaming response with appropriate headers
    console.log('Streaming enhanced response back to client');
    return new Response(transformedStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'X-Include-Thought-Process': includeThoughtProcess ? 'true' : 'false',
        'X-Styling': styling,
        'X-Browser': browser
      }
    });
  } catch (error) {
    console.error('Unhandled error in chat-stream API:', error);
    return createErrorResponse(
      'Internal server error', 
      500, 
      { message: (error as Error).message, stack: (error as Error).stack }
    );
  }
}

// Helper function to check if a query is policy-related
function isPolicyRelatedQuery(content: string): boolean {
  if (!content) return false;
  
  const policyKeywords = [
    'policy', 'policies', 'insurance', 'coverage', 'liability', 
    'commercial', 'executive', 'available', 'review'
  ];
  
  // Check if multiple policy keywords are present
  const keywordCount = policyKeywords.filter(keyword => 
    content.toLowerCase().includes(keyword.toLowerCase())
  ).length;
  
  return keywordCount >= 2;
}

// Enhanced GET handler to check API configuration and abilities
export async function GET(request: NextRequest) {
  try {
    // Get user's organization from Supabase auth
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    let organizationId: string | undefined;
    
    if (session?.user) {
      // Get user's organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', session.user.id)
        .single();
      
      organizationId = profile?.organization_id;
    }
    
    // Load client configuration from database
    const clientConfig = await getClientConfiguration(organizationId);
    
    const configCheck = validateClientConfig(clientConfig);
    
    if (!configCheck.valid) {
      return createErrorResponse('API misconfigured', 500, configCheck.error);
    }
    
    // Test token acquisition with the loaded configuration
    await getAccessToken(clientConfig!);
    
    // Detect browser
    const browser = detectBrowser(request.headers.get('user-agent'));
    
    return NextResponse.json({
      status: 'ok',
      message: 'Chat stream API is properly configured with database-driven configuration',
      timestamp: new Date().toISOString(),
      configuration: {
        organizationId,
        backendUrl: clientConfig!.apiUrl,
        hasAzureConfig: !!(clientConfig!.tenantId && clientConfig!.clientId)
      },
      features: {
        thought_process: true,
        citations: true,
        styling: ['default', 'modern', 'minimal', 'corporate', 'red'],
        enhanced_features: true,
        browser_specific_handling: true,
        detected_browser: browser
      }
    });
  } catch (error) {
    return createErrorResponse(
      'Configuration test failed', 
      500, 
      { message: (error as Error).message }
    );
  }
}