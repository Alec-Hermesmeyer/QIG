// Add this API endpoint: app/api/groundx/documents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GroundXClient } from "groundx";

const groundxClient = new GroundXClient({
  apiKey: process.env.GROUNDX_API_KEY!,
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const bucketId = searchParams.get('bucketId');
  
  if (!bucketId) {
    return NextResponse.json(
      { success: false, error: 'BucketId parameter is required' }, 
      { status: 400 }
    );
  }
  
  try {
    // Get list of documents in the bucket
    const documents = await groundxClient.documents.list({
      filter: `bucketId:${bucketId}`
    });
    
    return NextResponse.json({ 
      success: true, 
      documents: documents
    });
  } catch (error: any) {
    console.error('Document listing error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list documents' }, 
      { status: 500 }
    );
  }
}