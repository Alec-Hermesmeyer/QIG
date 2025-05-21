// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  // Create a response object
  const res = NextResponse.next();
  
  // Supabase middleware client to refresh session if needed
  const supabase = createMiddlewareClient({ req, res });
  
  // This will refresh the session if it exists
  // We always do this to keep authentication working
  await supabase.auth.getSession();
  
  // Continue with the request
  return res;
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    // Include all pages except for specific public ones
    '/((?!_next/static|_next/image|favicon.ico|api/public).*)',
  ],
};