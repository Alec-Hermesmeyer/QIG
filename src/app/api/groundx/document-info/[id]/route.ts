// app/api/groundx/document-info/[id]/route.ts
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
 * GET handler for document information
 * Fetches document metadata from GroundX and constructs a viewer URL
 */
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  try {
    // Validate client initialization
    if (!groundxClient) {
      return NextResponse.json(
        { success: false, error: 'GroundX client not initialized' },
        { status: 500 }
      );
    }

    // Use the params from the context properly - fixed the async issue
    const documentId = context.params.id;
    
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
      const metadata = documentDetails.document.metadata || {};
      
      // Construct a viewer URL using the GroundX web UI pattern
      // Replace with the actual pattern for your GroundX instance
      const groundXBaseUrl = process.env.GROUNDX_WEB_URL || 'https://app.groundx.ai';
      const viewerUrl = `${groundXBaseUrl}/documents/view/${documentId}`;
      
      // Return document information with viewer URL
      return NextResponse.json({
        success: true,
        document: {
          id: documentId,
          fileName,
          viewerUrl,
          metadata
        }
      });
      
    } catch (error: any) {
      console.error('GroundX API error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to retrieve document information' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Document info error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to process request' 
      },
      { status: 500 }
    );
  }
}