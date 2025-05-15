// app/api/chat-stream/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ConfidentialClientApplication } from '@azure/msal-node';

// Type definition for client configuration
interface ClientConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  apiUrl: string;
}

// Function to load client configurations from environment variables
function loadClientConfigurations(): Record<string, ClientConfig> {
  const clients: Record<string, ClientConfig> = {};
  
  // Default client (backward compatibility)
  clients['default'] = {
    tenantId: process.env.AZURE_TENANT_ID || '',
    clientId: process.env.AZURE_CLIENT_ID || '',
    clientSecret: process.env.AZURE_SECRET || '',
   apiUrl: 'https://capps-backend-px4batn2ycs6a.greenground-334066dd.eastus2.azurecontainerapps.io'
  };
  
  // Add the new backend
  clients['client2'] = {
    tenantId: process.env.CLIENT2_AZURE_TENANT_ID || '',
    clientId: process.env.CLIENT2_AZURE_CLIENT_ID || '',
    clientSecret: process.env.CLIENT2_AZURE_SECRET || '',
    apiUrl: 'https://capps-backend-px4batn2ycs6a.greenground-334066dd.eastus2.azurecontainerapps.io'
  };
  
  return clients;
}

// Global client configurations
const clientConfigs = loadClientConfigurations();

// Validate specific client configuration
function validateClientConfig(clientId: string): { valid: boolean; error?: string } {
  const config = clientConfigs[clientId];
  
  if (!config) {
    return { valid: false, error: `Client configuration not found: ${clientId}` };
  }
  
  const missingVars = [];
  if (!config.tenantId) missingVars.push('tenantId');
  if (!config.clientId) missingVars.push('clientId');
  if (!config.clientSecret) missingVars.push('clientSecret');
  if (!config.apiUrl) missingVars.push('apiUrl');
  
  if (missingVars.length > 0) {
    const errorMsg = `Missing configuration for client ${clientId}: ${missingVars.join(', ')}`;
    console.error(errorMsg);
    return { valid: false, error: errorMsg };
  }
  
  return { valid: true };
}

// Function to get an access token using MSAL for a specific client
async function getAccessToken(clientId: string): Promise<string> {
  const config = clientConfigs[clientId];
  
  if (!config) {
    throw new Error(`Client configuration not found: ${clientId}`);
  }
  
  try {
    console.log(`Requesting Azure token for client: ${clientId}`);
    
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
      throw new Error(`No access token returned from MSAL for client: ${clientId}`);
    }
    
    console.log(`Azure token obtained successfully for client: ${clientId}`);
    return tokenResponse.accessToken;
  } catch (error) {
    console.error(`Error getting Azure token for client ${clientId}:`, error);
    throw error;
  }
}

// Enhanced stream transformation
function enhancedTransformStream(
  readable: ReadableStream, 
  options: {
    includeThoughtProcess: boolean;
    styling: string;
  }
): ReadableStream {
  const textDecoder = new TextDecoder();
  const textEncoder = new TextEncoder();
  
  // Track accumulated content, citations, and thought process
  let accumulatedContent = '';
  let accumulatedData = '';
  let foundThoughts = '';
  let citationCounter = 0;
  
  // Track extracted citations
  const extractedCitations: any[] = [];
  const extractedSources: any[] = [];
  const sentCitationIds = new Set<string>();
  
  // Track new citations found in each chunk
  let newCitationsInChunk: any[] = [];
  let newSourcesInChunk: any[] = [];
  
  const transform = new TransformStream({
    transform(chunk, controller) {
      const text = textDecoder.decode(chunk);
      accumulatedData += text;
      
      // First, pass through the original chunk
      controller.enqueue(chunk);
      
      // Clear the new citations array
      newCitationsInChunk = [];
      newSourcesInChunk = [];
      
      // Check if this chunk has citations
      const updatedText = processCitationsInContent(text);
      
      // Update accumulated content
      accumulatedContent += updatedText;
      
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
      
      // Send a final 'done' message with complete data
      const completeAnswer = {
        content: accumulatedContent,
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
    
    // Determine which client to use - can be extracted from headers or body
    let clientId = request.headers.get('x-client-id') || 'default';
    
    // From request body (if not in headers)
    if (clientId === 'default' && body.clientId) {
      clientId = body.clientId;
      // Remove clientId from body before forwarding
      delete body.clientId;
    }
    
    // Check for thought process and styling preferences
    const includeThoughtProcess = body.include_thought_process === true;
    const styling = body.styling || 'default';
    
    console.log(`Using client configuration: ${clientId}`);
    console.log(`Include thought process: ${includeThoughtProcess}`);
    console.log(`Styling: ${styling}`);
    
    // Validate client configuration
    const configCheck = validateClientConfig(clientId);
    if (!configCheck.valid) {
      return createErrorResponse('Client configuration error', 400, configCheck.error);
    }
    
    // Get Azure token using MSAL for the specific client
    let token;
    try {
      token = await getAccessToken(clientId);
    } catch (tokenError) {
      console.error(`Failed to obtain Azure token for client ${clientId}:`, tokenError);
      return createErrorResponse(
        'Authentication failed', 
        401, 
        { message: (tokenError as Error).message }
      );
    }
    
    // Get the API URL for this client
    const targetUrl = `${clientConfigs[clientId].apiUrl}/chat/stream`;
    console.log(`Forwarding request to: ${targetUrl}`);
    
    // Azure OpenAI specific parameters
    if (clientId === 'client2') {
      // Add parameters specifically for Azure OpenAI
      if (includeThoughtProcess) {
        // Make sure to include these parameters for Azure OpenAI so it returns thoughts
        body.show_thoughts = true;
        body.show_thinking = true;
      }
    } else {
      // For default client or other clients
      if (includeThoughtProcess) {
        body.include_thoughts = true;
        body.include_reasoning = true;
      }
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
        'X-Client-ID': clientId,
        'X-Include-Thought-Process': includeThoughtProcess ? 'true' : 'false',
        'X-Include-Citations': 'true',
        'X-Styling': styling
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
        console.error(`Access forbidden (403) to target API for client ${clientId}:`, errorDetails);
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
    
    // Use our enhanced transform that extracts citations while preserving the original stream
    const transformedStream = enhancedTransformStream(responseBody, {
      includeThoughtProcess,
      styling
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
        'X-Styling': styling
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

// Enhanced GET handler to check API configuration and abilities
export async function GET(request: NextRequest) {
  // Check if a client ID is provided in the request
  const clientId = request.headers.get('x-client-id') || 
                   request.nextUrl.searchParams.get('clientId') || 
                   'default';
  
  const configCheck = validateClientConfig(clientId);
  
  if (!configCheck.valid) {
    return createErrorResponse('API misconfigured', 500, configCheck.error);
  }
  
  try {
    // Test token acquisition for the specified client
    await getAccessToken(clientId);
    
    return NextResponse.json({
      status: 'ok',
      message: `Chat stream API is properly configured with MSAL for client: ${clientId}`,
      timestamp: new Date().toISOString(),
      features: {
        thought_process: true,
        citations: true,
        styling: ['default', 'modern', 'minimal', 'corporate', 'red'],
        enhanced_features: true
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