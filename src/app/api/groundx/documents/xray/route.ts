import { NextRequest, NextResponse } from 'next/server';
import { getGroundxClient } from '@/lib/groundx-client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'Document ID is required' },
        { status: 400 }
      );
    }

    const groundxClient = await getGroundxClient();
    
    if (!groundxClient) {
      return NextResponse.json(
        { success: false, error: 'Failed to initialize GroundX client' },
        { status: 500 }
      );
    }

    console.log(`Fetching X-ray data for document: ${documentId}`);
    
    try {
      // Get X-ray data for the document
      const xrayResponse = await groundxClient.documents.getXray(documentId);
      
      if (!xrayResponse) {
        return NextResponse.json(
          { success: false, error: 'X-ray data not available for this document' },
          { status: 404 }
        );
      }
      
      console.log(`Successfully retrieved X-ray data for document: ${documentId}`);
      
      return NextResponse.json({
        success: true,
        documentId,
        xray: xrayResponse
      });
      
    } catch (error) {
      console.error(`Error fetching X-ray data for document ${documentId}:`, error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch X-ray data' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing X-ray request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 