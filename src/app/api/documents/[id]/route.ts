import { NextRequest, NextResponse } from 'next/server';
import documentCacheService from '@/services/documentCache';

// API endpoint to fetch document metadata
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const id = context.params.id;
    
    if (!id) {
      return NextResponse.json({ message: 'Document ID is required' }, { status: 400 });
    }
    
    const document = await documentCacheService.getDocument(id);
    
    if (!document) {
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }
    
    // Return what's available on the document object
    // This should match the actual structure from your documentCacheService
    return NextResponse.json({
      metadata: document.metadata,
      content: {
        summary: document.content.summary || ''
      }
      // Include any other properties that actually exist on your document object
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}