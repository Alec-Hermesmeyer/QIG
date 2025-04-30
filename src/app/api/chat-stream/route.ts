// app/api/chat-stream/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Azure credentials from environment variables
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_SECRET = process.env.AZURE_SECRET;

// Function to get an access token using client credentials flow
async function getAzureToken() {
  try {
    const tokenEndpoint = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`;
    
    const body = new URLSearchParams({
      client_id: AZURE_CLIENT_ID!,
      scope: `${AZURE_CLIENT_ID}/.default`,
      client_secret: AZURE_SECRET!,
      grant_type: 'client_credentials'
    });
    
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to get Azure token:', errorText);
      throw new Error(`Azure token request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.access_token;
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

export async function POST(request: NextRequest) {
  try {
    // Get request body
    const body = await request.json();
    
    // Get Azure token using client credentials flow (no user interaction)
    const token = await getAzureToken();
    
    // Forward the request to the target endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
    
    // Handle error responses
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: `Failed to fetch from chat/stream: ${response.statusText}`,
          details: errorText
        },
        { status: response.status }
      );
    }
    
    // Ensure we have a response body
    const responseBody = response.body;
    if (!responseBody) {
      return NextResponse.json(
        { error: 'No response body received' },
        { status: 500 }
      );
    }
    
    // Create a transformed stream
    const transformedStream = transformStream(responseBody);
    
    // Return the streaming response
    return new Response(transformedStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  } catch (error) {
    console.error('Error in chat-stream API:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}