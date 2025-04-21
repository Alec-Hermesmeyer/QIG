import { NextRequest, NextResponse } from 'next/server';

// Function to get the backend URL from environment variables
const getBackendUrl = () => {
  // Check various environment variables in order of preference
  return process.env.BACKEND_URL_LOGIN || 
         process.env.NEXT_PUBLIC_BACKEND_URL || 
         'http://localhost:5000'; // Default fallback
};

/**
 * Redirects the user to the backend login page
 * This route matches the pattern expected by the frontend but then redirects to the actual backend
 */
export async function GET(req: NextRequest) {
  const backendUrl = getBackendUrl();
  
  // Get the origin for constructing the redirect back URL
  const origin = req.headers.get('origin') || req.nextUrl.origin;
  
  // Redirect to the backend authentication endpoint
  // Note: The backend is expected to redirect back to the origin after authentication
  return NextResponse.redirect(`${backendUrl}/`);
}