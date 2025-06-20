import { NextRequest, NextResponse } from 'next/server';
import { groundxService } from '@/services/groundxService';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { BucketInfo } from '@/types/groundx';

export async function GET(request: NextRequest) {
  // Check authentication
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  // Get user's organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, organizations!inner(name)')
    .eq('id', session.user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
  }

  try {
    const buckets = await groundxService.getBuckets();
    
    // Filter buckets based on organization
    const organizationName = (profile.organizations as any)?.name;
    let filteredBuckets = buckets;
    
    // If not QIG, filter buckets
    if (organizationName !== 'QIG') {
      const bucketPatterns = [organizationName || ''];
      filteredBuckets = buckets.filter((bucket: BucketInfo) => {
        const name = bucket.name || '';
        return bucketPatterns.some(pattern => 
          name.toLowerCase().includes(pattern.toLowerCase())
        );
      });
    }
    
    return NextResponse.json({
      success: true,
      buckets: filteredBuckets
    });
  } catch (error) {
    console.error('Error listing buckets:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 