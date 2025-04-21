// app/api/proxy/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Get the backend URL from environment variables
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const url = new URL(request.url);
  const targetUrl = `${BACKEND_URL}/${path}${url.search}`;
  
  // Forward all headers except host
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'host') {
      headers.append(key, value);
    }
  });
  
  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers,
      credentials: 'include',
    });
    
    // Read the response as array buffer to handle any type of content
    const data = await response.arrayBuffer();
    
    // Create a new response
    const newResponse = new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
    });
    
    // Copy all headers from the backend response
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-length') {
        newResponse.headers.set(key, value);
      }
    });
    
    return newResponse;
  } catch (error) {
    console.error(`Error proxying request to ${targetUrl}:`, error);
    return new NextResponse(JSON.stringify({ error: 'Failed to proxy request' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/');
  const targetUrl = `${BACKEND_URL}/${path}`;
  
  // Forward all headers except host
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'host') {
      headers.append(key, value);
    }
  });
  
  try {
    // Get the request body
    const body = await request.blob();
    
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body,
      credentials: 'include',
    });
    
    // Read the response as array buffer to handle any type of content
    const data = await response.arrayBuffer();
    
    // Create a new response
    const newResponse = new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
    });
    
    // Copy all headers from the backend response
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-length') {
        newResponse.headers.set(key, value);
      }
    });
    
    return newResponse;
  } catch (error) {
    console.error(`Error proxying request to ${targetUrl}:`, error);
    return new NextResponse(JSON.stringify({ error: 'Failed to proxy request' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}