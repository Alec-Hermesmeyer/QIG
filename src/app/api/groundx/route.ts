import { NextRequest, NextResponse } from 'next/server';
import { groundXService } from '@/lib/groundx-service';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

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

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  
  try {
    let result;
    
    switch (action) {
      case 'listBuckets':
        result = await groundXService.listBuckets();
        return NextResponse.json({ success: true, buckets: result });
      
      case 'searchContent':
        const query = searchParams.get('query');
        const bucketId = searchParams.get('bucketId');
        
        if (!query) {
          return NextResponse.json({ success: false, error: 'Query parameter required' }, { status: 400 });
        }
        
        if (bucketId) {
          groundXService.setBucketId(parseInt(bucketId));
        }
        
        result = await groundXService.searchContent(query);
        return NextResponse.json({ success: true, results: result });
      
      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    // Check if it's a multipart form data request
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const bucketId = parseInt(formData.get('bucketId') as string);
      
      if (!file || !bucketId) {
        return NextResponse.json(
          { success: false, error: 'File and bucketId are required' }, 
          { status: 400 }
        );
      }
      
      groundXService.setBucketId(bucketId);
      const processId = await groundXService.uploadLocalFile(file, file.name);
      
      return NextResponse.json({ success: true, processId });
    }
    
    // Handle existing JSON requests
    const body = await request.json();
    const { action } = body;
    
    // ... rest of your existing POST handler
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}