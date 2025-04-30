// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

// This middleware can be used if you want to bypass authentication checks for chat routes
// while still protecting other routes
export async function middleware(req: NextRequest) {
  // Create a response object
  const res = NextResponse.next();
  
  // Check if the route is a chat API route that we want to bypass authentication for
  const isChatRoute = req.nextUrl.pathname.startsWith('/api/chat-stream') || 
                      req.nextUrl.pathname.startsWith('/api/chat');
  
  // If it's a chat route, we'll skip the authentication check
  if (isChatRoute) {
    // Just continue without checking authentication
    return res;
  }
  
  // For all other routes, perform normal authentication check
  try {
    // Create Supabase client
    const supabase = createMiddlewareClient({ req, res });
    
    // Check if there's an active session
    const { data: { session } } = await supabase.auth.getSession();
    
    // If no session and trying to access a protected route, redirect to login
    const isProtectedRoute = req.nextUrl.pathname.startsWith('/dashboard') || 
                           req.nextUrl.pathname.startsWith('/profile');
    
    if (!session && isProtectedRoute) {
      // Redirect to login page
      const redirectUrl = new URL('/login', req.url);
      redirectUrl.searchParams.set('next', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
    
    // Otherwise, continue with the request
    return res;
  } catch (error) {
    console.error('Middleware error:', error);
    return res;
  }
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    // Include chat routes but we'll bypass auth checks for them in the middleware
    '/api/chat-stream/:path*',
    '/api/chat/:path*',
    // Include protected routes
    '/dashboard/:path*',
    '/profile/:path*',
  ],
};