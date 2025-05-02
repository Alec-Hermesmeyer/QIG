// app/api/groundx/buckets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GroundXClient } from "groundx";

// Initialize client
const groundxClient = new GroundXClient({
  apiKey: process.env.GROUNDX_API_KEY!,
});

// Define a proper interface for the bucket data we need
interface ProcessedBucket {
  id: number | string;
  name: string;
  documentCount: number;
}

export async function GET() {
  try {
    // Using list method as in your example
    const response = await groundxClient.buckets.list();
    console.log('Raw GroundX response:', JSON.stringify(response));
    
    // Check if response has buckets and it's an array
    if (!response || !response.buckets || !Array.isArray(response.buckets)) {
      console.error('Invalid response structure from GroundX:', response);
      return NextResponse.json(
        { success: false, error: 'Invalid response structure from GroundX API' },
        { status: 500 }
      );
    }
    
    // Process buckets to ensure they have the required fields
    // Use type assertion with any to bypass TypeScript errors
    const processedBuckets: ProcessedBucket[] = response.buckets
      .filter(bucket => bucket !== null && bucket !== undefined)
      .map(bucket => {
        // Access properties safely using optional chaining and type assertion
        const bucketAny = bucket as any;
        
        // Create a properly formatted bucket object with defaults for missing properties
        return {
          // Use bucket_id, bId, bucketId, or any property that might represent the ID
          id: bucketAny.bucket_id || bucketAny.bucketId || bucketAny.id || 
              bucketAny.bId || `unknown-${Math.random().toString(36).substr(2, 9)}`,
          
          // Use name, title, or generate a name if none exists
          name: bucketAny.name || bucketAny.title || bucketAny.bucketName || 
                `Bucket ${bucketAny.bucket_id || bucketAny.id || 'Unknown'}`,
          
          // Use any property that might represent document count or default to 0
          documentCount: typeof bucketAny.documentCount === 'number' ? bucketAny.documentCount :
                         typeof bucketAny.count === 'number' ? bucketAny.count : 
                         typeof bucketAny.documents === 'number' ? bucketAny.documents : 0
        };
      });
    
    return NextResponse.json({ 
      success: true, 
      buckets: processedBuckets,
      rawBuckets: response.buckets // Include raw data for debugging
    });
  } catch (error: any) {
    console.error('Error listing buckets:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}