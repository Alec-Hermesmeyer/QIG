import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  
  try {
    // Check if there's a session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Auth test error:', error);
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    
    if (!session) {
      return NextResponse.json({ 
        message: 'No active session',
        authenticated: false
      });
    }
    
    // Return session details
    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
      },
      expires_at: session.expires_at
    });
  } catch (err) {
    console.error('Unexpected error in auth test:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 