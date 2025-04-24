import { NextRequest, NextResponse } from 'next/server';
import documentCacheService from '@/services/documentCache';

// GET endpoint to retrieve a specific document
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // @ts-ignore: Suppressing the Next.js warning about params.id
    const id = context.params.id;
    
    if (!id) {
      return NextResponse.json(
        { message: 'Document ID is required' },
        { status: 400 }
      );
    }
    
    // Add better error handling with retry logic
    let retries = 0;
    const maxRetries = 2;
    let document = null;
    
    while (retries <= maxRetries && !document) {
      try {
        document = await documentCacheService.getDocument(id);
        if (!document && retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500));
          retries++;
        }
      } catch (error) {
        console.error(`Error fetching document (attempt ${retries + 1}):`, error);
        if (retries < maxRetries) {
          retries++;
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          throw error;
        }
      }
    }
    
    if (!document) {
      return NextResponse.json(
        { message: 'Document not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ document });
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE endpoint to remove a document
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // @ts-ignore: Suppressing the Next.js warning about params.id
    const id = context.params.id;
    
    if (!id) {
      return NextResponse.json(
        { message: 'Document ID is required' },
        { status: 400 }
      );
    }
    
    const success = await documentCacheService.deleteDocument(id);
    
    if (!success) {
      return NextResponse.json(
        { message: 'Failed to delete document' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}