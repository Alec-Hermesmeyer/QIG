// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

// List of paths that require QIG organization access
const QIG_ONLY_PATHS = [
  '/admin/services',
  '/admin/monitoring',
  '/admin/sample-questions', 
  '/admin/client-config',
  '/admin/analytics',
  '/admin/system',
  '/admin/user-management',
  '/admin/api-keys',
  '/admin/audit-logs',
  '/rag-debug'
];

export async function middleware(req: NextRequest) {
  // Create a response object
  const res = NextResponse.next();
  
  // Supabase middleware client to refresh session if needed
  const supabase = createMiddlewareClient({ req, res });
  
  // This will refresh the session if it exists
  // We always do this to keep authentication working
  await supabase.auth.getSession();
  
  const { pathname } = req.nextUrl;
  
  // Check if the current path requires QIG access
  const requiresQIGAccess = QIG_ONLY_PATHS.some(path => pathname.startsWith(path));
  
  if (requiresQIGAccess) {
    // Add security headers for admin routes
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.headers.set('X-Admin-Route', 'true');
  }
  
  // Continue with the request
  return res;
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};