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
    // Create a Supabase client for auth - FIXED: synchronous cookies
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookies() 
    });
    
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Check for organization override header (QIG users switching organizations)
    const organizationOverride = request.headers.get('x-organization-override');
    
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
    
    // Determine which organization to use for bucket filtering
    let targetOrganizationId = profile.organization_id;
    
    // If organization override is provided, verify the user is from QIG and use the override
    if (organizationOverride) {
      // First check if the user's organization is QIG
      const { data: userOrg, error: userOrgError } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', profile.organization_id)
        .single();
        
      if (userOrg?.name === 'QIG') {
        targetOrganizationId = organizationOverride;
        console.log(`QIG user overriding organization to: ${organizationOverride}`);
      } else {
        console.warn('Non-QIG user attempted organization override');
      }
    }
    
    // Get the target organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', targetOrganizationId)
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
    
    // Log organization name for debugging
    console.log('Organization name:', organization.name);
    
    // Define a mapping between organization names and bucket name patterns
    const orgToBucketMapping: Record<string, string[]> = {
      'Austin Industries': ['Austin Industries', 'Austin', 'AI'],
      'QIG': ['QIG', 'Quality Improvement Group'],
      'Spinakr': ['Spinakr', 'Spinaker', 'Spnkr'], 
      // Add more variations if needed - ensure exact match to your database
    };
    
    // Default patterns to look for in bucket names
    let bucketPatterns = orgToBucketMapping[organization.name] || [organization.name];
    
    // Special case for Spinakr - add additional check
    if (organization.name.toLowerCase().includes('spinak')) {
      bucketPatterns = ['Spinakr', 'Spinaker', 'Spnkr'];
      console.log('Spinakr organization detected, using patterns:', bucketPatterns);
    }
    
    // Special case: QIG can see all buckets
    const isQIG = organization.name === 'QIG';
    
    // Filter buckets based on organization
    let filteredBuckets = response.buckets;
    
    // Debug log all available buckets
    console.log('All buckets before filtering:', response.buckets.map((b: any) => {
      return {
        id: b.bucket_id || b.bucketId || b.id || b.bId,
        name: b.name || b.title || b.bucketName
      };
    }));
    
    // If not QIG, filter buckets to only show those relevant to the organization
    if (!isQIG) {
      filteredBuckets = response.buckets.filter(bucket => {
        const bucketAny = bucket as any;
        const name = bucketAny.name || bucketAny.title || bucketAny.bucketName || '';
        
        // Debug log each bucket name evaluation
        const matches = bucketPatterns.some(pattern => 
          name.toLowerCase().includes(pattern.toLowerCase())
        );
        console.log(`Bucket "${name}" matches patterns for "${organization.name}": ${matches}`);
        
        // Check if the bucket name contains any of the organization patterns
        return matches;
      });
    }
    
    console.log('Filtered buckets count:', filteredBuckets.length);
    
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