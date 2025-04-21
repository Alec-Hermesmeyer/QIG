// /app/api/proxy/[...path]/route.ts

import { NextRequest, NextResponse } from 'next/server';

// Function to get the backend URL from environment variables
const getBackendUrl = () => {
  // Check various environment variables in order of preference
  return process.env.BACKEND_URL || 
         process.env.NEXT_PUBLIC_BACKEND_URL || 
         'http://localhost:5000'; // Default fallback
};

/**
 * Generic API route that proxies requests to the backend
 * This allows the frontend to make requests to /api/proxy/* which will be forwarded to the backend
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const backendUrl = getBackendUrl();
  const path = params.path.join('/');
  
  // Forward the request to the backend
  const response = await fetch(`${backendUrl}/${path}`, {
    method: 'GET',
    headers: {
      // Forward relevant headers
      'Content-Type': req.headers.get('Content-Type') || 'application/json',
      'Authorization': req.headers.get('Authorization') || '',
      'Cookie': req.headers.get('Cookie') || '',
    },
    credentials: 'include',
  });
  
  // Create a new response with the same status and body
  const newResponse = new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
    },
  });
  
  // Forward cookies from the backend to the client
  const cookies = response.headers.getSetCookie();
  if (cookies.length > 0) {
    cookies.forEach(cookie => {
      newResponse.headers.append('Set-Cookie', cookie);
    });
  }
  
  return newResponse;
}

/**
 * POST method for the proxy
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const backendUrl = getBackendUrl();
  const path = params.path.join('/');
  
  // Get the request body
  const body = await req.text();
  
  // Forward the request to the backend
  const response = await fetch(`${backendUrl}/${path}`, {
    method: 'POST',
    headers: {
      // Forward relevant headers
      'Content-Type': req.headers.get('Content-Type') || 'application/json',
      'Authorization': req.headers.get('Authorization') || '',
      'Cookie': req.headers.get('Cookie') || '',
    },
    body: body,
    credentials: 'include',
  });
  
  // Create a new response with the same status and body
  const newResponse = new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
    },
  });
  
  // Forward cookies from the backend to the client
  const cookies = response.headers.getSetCookie();
  if (cookies.length > 0) {
    cookies.forEach(cookie => {
      newResponse.headers.append('Set-Cookie', cookie);
    });
  }
  
  return newResponse;
}