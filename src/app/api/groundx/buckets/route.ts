// app/api/groundx/buckets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GroundXClient } from "groundx";
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Initialize GroundX client
const groundxClient = new GroundXClient({
  apiKey: process.env.GROUNDX_API_KEY!,
});

// Define a proper interface for the bucket data
interface ProcessedBucket {
  id: number | string;
  name: string;
  documentCount: number;
}

export async function GET(request: NextRequest) {
  try {
    // Create a Supabase client for auth
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get the user's profile to find their organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', session.user.id)
      .single();
      
    if (profileError || !profile?.organization_id) {
      return NextResponse.json(
        { success: false, error: 'User organization not found' },
        { status: 404 }
      );
    }
    
    // Get the organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', profile.organization_id)
      .single();
      
    if (orgError || !organization) {
      return NextResponse.json(
        { success: false, error: 'Organization details not found' },
        { status: 404 }
      );
    }
    
    // Get all buckets from GroundX
    const response = await groundxClient.buckets.list();
    
    if (!response || !response.buckets || !Array.isArray(response.buckets)) {
      console.error('Invalid response structure from GroundX:', response);
      return NextResponse.json(
        { success: false, error: 'Invalid response structure from GroundX API' },
        { status: 500 }
      );
    }
    
    // Define a mapping between organization names and bucket name patterns
    const orgToBucketMapping: Record<string, string[]> = {
      'Austin Industries': ['Austin Industries', 'Austin', 'AI'],
      'QIG': ['QIG', 'Quality Improvement Group'],
      // Add more organizations as needed
    };
    
    // Default patterns to look for in bucket names
    let bucketPatterns = orgToBucketMapping[organization.name] || [organization.name];
    
    // Special case: QIG can see all buckets
    const isQIG = organization.name === 'QIG';
    
    // Filter buckets based on organization
    let filteredBuckets = response.buckets;
    
    // If not QIG, filter buckets to only show those relevant to the organization
    if (!isQIG) {
      filteredBuckets = response.buckets.filter(bucket => {
        const bucketAny = bucket as any;
        const name = bucketAny.name || bucketAny.title || bucketAny.bucketName || '';
        
        // Check if the bucket name contains any of the organization patterns
        return bucketPatterns.some(pattern => 
          name.toLowerCase().includes(pattern.toLowerCase())
        );
      });
    }
    
    // Process the filtered buckets
    const processedBuckets: ProcessedBucket[] = filteredBuckets.map(bucket => {
      const bucketAny = bucket as any;
      return {
        id: bucketAny.bucket_id || bucketAny.bucketId || bucketAny.id ||
          bucketAny.bId || `unknown-${Math.random().toString(36).substr(2, 9)}`,
        name: bucketAny.name || bucketAny.title || bucketAny.bucketName ||
          `Bucket ${bucketAny.bucket_id || bucketAny.id || 'Unknown'}`,
        documentCount: typeof bucketAny.documentCount === 'number' ? bucketAny.documentCount :
          typeof bucketAny.count === 'number' ? bucketAny.count :
          typeof bucketAny.documents === 'number' ? bucketAny.documents : 0
      };
    });
    
    return NextResponse.json({
      success: true,
      buckets: processedBuckets,
      organization: organization.name
    });
    
  } catch (error: any) {
    console.error('Error listing buckets:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}