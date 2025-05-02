// app/api/groundx/proxy/[...params]/route.ts
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
 * Attempts to generate a viewer URL for GroundX documents
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { params: string[] } }
): Promise<NextResponse> {
  try {
    // Validate client initialization
    if (!groundxClient) {
      return NextResponse.json(
        { success: false, error: 'GroundX client not initialized' },
        { status: 500 }
      );
    }

    // Extract document ID and optional type (view/download)
    const [documentId, type = 'view'] = params.params;
    
    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'Document ID is required' },
        { status: 400 }
      );
    }

    try {
      // Get document details first
      const documentDetails = await groundxClient.documents.get(documentId);
      
      if (!documentDetails?.document) {
        return NextResponse.json(
          { success: false, error: 'Document not found' },
          { status: 404 }
        );
      }

      // Extract document information
      const fileName = documentDetails.document.fileName || `document-${documentId}`;
      
      // Option 1: Check if there's a viewer URL in the API response
      if ('viewerUrl' in documentDetails.document && documentDetails.document.viewerUrl) {
        return NextResponse.redirect(String(documentDetails.document.viewerUrl));
      }
      
      // Option 2: Check if there's a method to generate a viewer URL
      // This depends on the GroundX API structure
      try {
        // If the API has a method like this:
        // Option 2 removed as 'getViewerUrl' is not a valid method on the Documents type
      } catch (viewerError) {
        console.log('Viewer URL method not available:', viewerError);
      }
      
      // Option 3: Construct a viewer URL using the GroundX web UI pattern
      // This assumes GroundX has a web UI with a viewer page
      // Replace with the actual pattern for your GroundX instance
      const groundXBaseUrl = process.env.GROUNDX_WEB_URL || 'https://app.groundx.ai';
      const constructedViewerUrl = `${groundXBaseUrl}/documents/view/${documentId}`;
      
      // Return the constructed URL info to the client
      // The client-side can then redirect or embed this URL in an iframe
      return NextResponse.json({
        success: true,
        document: {
          id: documentId,
          fileName,
          viewerUrl: constructedViewerUrl,
          metadata: documentDetails.document ? { /* Add default or placeholder metadata here */ } : {}
        }
      });
      
    } catch (error: any) {
      console.error('GroundX API error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to retrieve document from GroundX' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Document proxy error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to process document request' 
      },
      { status: 500 }
    );
  }
}