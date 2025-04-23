import { NextRequest, NextResponse } from 'next/server';
import documentCacheService from '@/services/documentCache';

// GET endpoint to retrieve all documents
export async function GET(request: NextRequest) {
  try {
    const documents = await documentCacheService.getAllDocuments();
    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST endpoint for document search
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;
    
    if (!query) {
      return NextResponse.json(
        { message: 'Search query is required' },
        { status: 400 }
      );
    }
    
    const documents = await documentCacheService.searchDocuments(query);
    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error searching documents:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}