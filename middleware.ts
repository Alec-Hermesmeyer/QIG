// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8080',
  'https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io',
  // Add your production domain here
];

// Options for all responses
const corsOptions = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400', // 24 hours
};

export function middleware(request: NextRequest) {
  // Get the origin from the request
  const origin = request.headers.get('origin') || '';
  const isAllowedOrigin = allowedOrigins.includes(origin);
  
  // Skip CORS for non-API routes and static files
  if (
    !request.nextUrl.pathname.startsWith('/api') &&
    request.nextUrl.pathname.startsWith('/_next')
  ) {
    return NextResponse.next();
  }
  
  // Critical: Handle preflight OPTIONS requests properly
  if (request.method === 'OPTIONS') {
    // Create a new response for OPTIONS with appropriate headers
    const response = new NextResponse(null, { status: 204 }); // No content needed for preflight
    
    // Set CORS headers
    response.headers.set('Access-Control-Allow-Origin', isAllowedOrigin ? origin : '*');
    
    // Set all CORS options
    Object.entries(corsOptions).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  }
  
  // For normal requests, add CORS headers to the response
  const response = NextResponse.next();
  
  // Set the allowed origin
  response.headers.set('Access-Control-Allow-Origin', isAllowedOrigin ? origin : '*');
  
  // Set all other CORS headers
  Object.entries(corsOptions).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

// Only run middleware for API routes and the root to avoid unnecessary overhead
export const config = {
  matcher: [
    '/api/:path*',       // Match all API routes
    '/((?!_next/static|_next/image|favicon.ico).*)', // Match all routes except static files
  ],
};