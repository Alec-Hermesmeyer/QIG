// lib/corsWrapper.ts
import { NextRequest, NextResponse } from 'next/server';

// List of allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8080',
  'https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io',
  // Add any other origins you need
];

// CORS options
const corsHeaders = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
  'Access-Control-Max-Age': '86400', // 24 hours
};

/**
 * Wrapper for API route handlers with CORS support
 * @param handler The original API route handler
 * @returns A wrapped handler with CORS support
 */
export function withCors(handler: (req: NextRequest) => Promise<NextResponse>) {
  return async function corsHandler(req: NextRequest) {
    // Get the origin from the request
    const origin = req.headers.get('origin') || '';
    const isAllowedOrigin = allowedOrigins.includes(origin);

    // Handle OPTIONS preflight request
    if (req.method === 'OPTIONS') {
      // Create a new response for the OPTIONS request
      const response = new NextResponse(null, { status: 204 });
      
      // Set the CORS headers for the preflight request
      response.headers.set('Access-Control-Allow-Origin', isAllowedOrigin ? origin : '*');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      
      // Add all CORS headers
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      return response;
    }
    
    try {
      // Process the request with the original handler
      const response = await handler(req);
      
      // Add CORS headers to the response
      response.headers.set('Access-Control-Allow-Origin', isAllowedOrigin ? origin : '*');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      
      return response;
    } catch (error) {
      console.error('API error:', error);
      
      // Create an error response
      const errorResponse = NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
      
      // Add CORS headers to the error response
      errorResponse.headers.set('Access-Control-Allow-Origin', isAllowedOrigin ? origin : '*');
      errorResponse.headers.set('Access-Control-Allow-Credentials', 'true');
      
      return errorResponse;
    }
  };
}