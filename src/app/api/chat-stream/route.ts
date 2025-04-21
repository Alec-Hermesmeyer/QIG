// app/api/chat-stream/route.ts

import { NextRequest, NextResponse } from 'next/server';

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
    
    // Forward the request to the target endpoint
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward authorization headers if present
        ...(request.headers.get('authorization') 
          ? { 'Authorization': request.headers.get('authorization')! } 
          : {})
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