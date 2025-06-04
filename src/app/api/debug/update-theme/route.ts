import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies: () => cookies() });
    const { orgId, themeColor } = await req.json();
    
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
    
    // Verify user belongs to organization or is admin
    if (profile.organization_id !== orgId && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Update organization theme color
    const { data, error } = await supabase
      .from('organizations')
      .update({ theme_color: themeColor })
      .eq('id', orgId)
      .select()
      .single();
      
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, organization: data });
    
  } catch (error) {
    console.error('Error updating theme color:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 