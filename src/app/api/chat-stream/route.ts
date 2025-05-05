// app/api/chat-stream/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ConfidentialClientApplication } from '@azure/msal-node';

// Azure credentials from environment variables
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_SECRET = process.env.AZURE_SECRET;
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Validate configuration
function validateConfig() {
  const missingVars = [];
  
  if (!AZURE_TENANT_ID) missingVars.push('AZURE_TENANT_ID');
  if (!AZURE_CLIENT_ID) missingVars.push('AZURE_CLIENT_ID');
  if (!AZURE_SECRET) missingVars.push('AZURE_SECRET');
  if (!API_URL) missingVars.push('NEXT_PUBLIC_API_URL');
  
  if (missingVars.length > 0) {
    const errorMsg = `Missing environment variables: ${missingVars.join(', ')}`;
    console.error(errorMsg);
    return { valid: false, error: errorMsg };
  }
  
  return { valid: true };
}

// MSAL configuration
const msalConfig = {
  auth: {
    clientId: AZURE_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${AZURE_TENANT_ID}`,
    clientSecret: AZURE_SECRET!
  }
};

// Function to get an access token using MSAL
async function getAccessToken(scopes: string[] = [`${AZURE_CLIENT_ID}/.default`]) {
  try {
    console.log('Requesting Azure token using MSAL...');
    
    // Create confidential client application
    const msalInstance = new ConfidentialClientApplication(msalConfig);
    
    // Acquire token for application (client credentials flow)
    const tokenResponse = await msalInstance.acquireTokenByClientCredential({
      scopes: scopes
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

// This function transforms a ReadableStream into a more manageable ReadableStream
function transformStream(readable: ReadableStream): ReadableStream {
  const textDecoder = new TextDecoder();
  const textEncoder = new TextEncoder();
  
  // Create a TransformStream to process the incoming data
  const transform = new TransformStream({
    transform(chunk, controller) {
      // Decode the incoming chunk
      const text = textDecoder.decode(chunk);
      
      // Split by newlines and process each line
      const lines = text.split('\n').filter(line => line.trim());
      for (const line of lines) {
        try {
          // Try to parse as JSON and encode back
          controller.enqueue(textEncoder.encode(line + '\n'));
        } catch (e) {
          // If parsing fails, just pass through the line
          controller.enqueue(textEncoder.encode(line + '\n'));
        }
      }
    }
  });
  
  // Pipe the original stream through our transform
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
  
  // Validate configuration first
  const configCheck = validateConfig();
  if (!configCheck.valid) {
    return createErrorResponse('Server configuration error', 500, configCheck.error);
  }
  
  try {
    // Get request body
    const body = await request.json();
    console.log('Request body parsed');
    
    // Get Azure token using MSAL
    let token;
    try {
      token = await getAccessToken();
    } catch (tokenError) {
      console.error('Failed to obtain Azure token:', tokenError);
      return createErrorResponse(
        'Authentication failed', 
        401, 
        { message: (tokenError as Error).message }
      );
    }
    
    // Construct the target URL
    const targetUrl = `${API_URL}/chat/stream`;
    console.log(`Forwarding request to: ${targetUrl}`);
    
    // Forward the request to the target endpoint
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'NextJS-MSAL-Chat-Stream',
        'Accept': 'text/event-stream'
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
        // Try to parse as JSON first
        errorDetails = await clonedResponse.json();
      } catch {
        // Fall back to text if not JSON
        errorDetails = await clonedResponse.text();
      }
      
      if (response.status === 403) {
        console.error('Access forbidden (403) to target API:', errorDetails);
        return createErrorResponse(
          'Access denied to chat service', 
          403, 
          { 
            message: 'The server was denied access to the chat service. This may be due to invalid credentials or insufficient permissions.'
          }
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
    
    // Create a transformed stream
    const transformedStream = transformStream(responseBody);
    
    // Return the streaming response
    console.log('Streaming response back to client');
    return new Response(transformedStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // Prevents buffering in Nginx
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

// Add a GET handler to check if the API is properly configured
export async function GET() {
  const configCheck = validateConfig();
  
  if (!configCheck.valid) {
    return createErrorResponse('API misconfigured', 500, configCheck.error);
  }
  
  try {
    // Test token acquisition
    await getAccessToken();
    
    return NextResponse.json({
      status: 'ok',
      message: 'Chat stream API is properly configured with MSAL',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return createErrorResponse(
      'Configuration test failed', 
      500, 
      { message: (error as Error).message }
    );
  }
}