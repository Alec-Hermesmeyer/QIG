// app/api/groundx/documents/view/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GroundXClient } from "groundx";

// Initialize GroundX client
let groundxClient: GroundXClient;

try {
  groundxClient = new GroundXClient({
    apiKey: process.env.GROUNDX_API_KEY || '',
  });
} catch (error) {
  console.error('Error initializing GroundX client:', error);
}

/**
 * GET handler for document viewing
 * Fetches document content from GroundX and returns it for display
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // Validate client initialization
    if (!groundxClient) {
      return NextResponse.json(
        { success: false, error: 'GroundX client not initialized' },
        { status: 500 }
      );
    }

    const documentId = params.id;
    
    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Fetch document details
    const documentDetails = await groundxClient.documents.get(documentId);
    
    if (!documentDetails?.document) {
      return NextResponse.json(
        { success: false, error: 'Document not found or access denied' },
        { status: 404 }
      );
    }

    // Check if we need to get content
    // This depends on the GroundX API structure
    // You may need to make an additional API call to get the actual content
    
    // For a PDF or document file, we might need to get a view URL or content blob
    const contentUrl = await groundxClient.documents.getUrl(documentId, {
      download: false,
      expiresIn: 3600 // URL valid for 1 hour
    });

    if (!contentUrl) {
      return NextResponse.json(
        { success: false, error: 'Unable to generate view URL' },
        { status: 500 }
      );
    }

    // Return the document viewer information
    return NextResponse.json({
      success: true,
      document: {
        id: documentId,
        fileName: documentDetails.document.fileName,
        title: documentDetails.document.title || 'Untitled',
        contentUrl,
        metadata: documentDetails.document.metadata,
        pagesCount: documentDetails.document.pages?.length || 0
      }
    });
    
  } catch (error: any) {
    console.error('Document view API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to retrieve document' 
      },
      { status: 500 }
    );
  }
}