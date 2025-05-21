import { NextResponse } from 'next/server';

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ 
      error: 'This endpoint is only available in development mode' 
    }, { status: 403 });
  }
  
  // Check for critical environment variables
  const envCheck = {
    // Supabase Variables
    supabase: {
      url: {
        name: 'NEXT_PUBLIC_SUPABASE_URL',
        value: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        actual: maskValue(process.env.NEXT_PUBLIC_SUPABASE_URL)
      },
      anonKey: {
        name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        value: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        actual: maskValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      },
      serviceRole: {
        name: 'SUPABASE_SERVICE_ROLE_KEY',
        value: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        actual: maskValue(process.env.SUPABASE_SERVICE_ROLE_KEY)
      }
    },
    
    // Next.js Variables
    next: {
      appUrl: {
        name: 'NEXT_PUBLIC_APP_URL',
        value: !!process.env.NEXT_PUBLIC_APP_URL,
        actual: process.env.NEXT_PUBLIC_APP_URL
      }
    },
    
    // Node Environment
    node: {
      env: {
        name: 'NODE_ENV',
        value: !!process.env.NODE_ENV,
        actual: process.env.NODE_ENV
      }
    }
  };
  
  // Check if any critical variables are missing
  const missingVars = [];
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missingVars.push('NEXT_PUBLIC_SUPABASE_URL');
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    missingVars.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  
  // Return the environment check
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    variables: envCheck,
    missingCriticalVars: missingVars,
    status: missingVars.length === 0 ? 'OK' : 'MISSING_VARIABLES'
  });
}

// Helper to mask sensitive values
function maskValue(value: string | undefined): string {
  if (!value) return 'Not set';
  if (value.length <= 8) return '******';
  return value.substring(0, 4) + '******' + value.substring(value.length - 4);
} 