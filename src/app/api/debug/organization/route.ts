import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });
  
  // Verify authentication
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Get user's profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
    
  if (profileError) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }
  
  // Get organization if user has one
  let orgData = null;
  
  if (profile.organization_id) {
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profile.organization_id)
      .single();
      
    if (!orgError) {
      orgData = organization;
    }
  }
  
  return NextResponse.json({ 
    profile,
    organization: orgData
  });
} 