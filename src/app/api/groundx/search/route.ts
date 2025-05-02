import { NextRequest, NextResponse } from 'next/server';
import { GroundXClient } from "groundx";

// Initialize client
const groundxClient = new GroundXClient({
  apiKey: process.env.GROUNDX_API_KEY!,
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const bucketId = searchParams.get('bucketId');
  
  if (!query) {
    return NextResponse.json(
      { success: false, error: 'Query parameter is required' }, 
      { status: 400 }
    );
  }
  
  if (!bucketId) {
    return NextResponse.json(
      { success: false, error: 'BucketId parameter is required' }, 
      { status: 400 }
    );
  }
  
  try {
    const searchResponse = await groundxClient.search.content(
      Number(bucketId),
      {
        query: query,
      }
    );
    
    return NextResponse.json({ 
      success: true, 
      results: searchResponse 
    });
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Search failed' }, 
      { status: 500 }
    );
  }
}