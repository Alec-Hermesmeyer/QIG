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
      // Get document details first to find X-ray URL
      console.log('Getting document details...');
      const documentDetails = await groundxClient.documents.get(documentId);
      
      console.log('Document details received:', documentDetails ? 'has data' : 'no data');
      
      if (!documentDetails) {
        console.log('No document details returned');
        return NextResponse.json(
          { success: false, error: 'Document not found' },
          { 
            status: 404,
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          }
        );
      }
      
      // Check if document has X-ray URL
      const xrayUrl = (documentDetails as any)?.document?.xrayUrl;
      
      if (!xrayUrl) {
        console.log('No X-ray URL found in document details');
        return NextResponse.json(
          { success: false, error: 'X-ray data not available for this document' },
          { 
            status: 404,
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          }
        );
      }
      
      console.log(`Fetching X-ray data from URL: ${xrayUrl}`);
      
      // Fetch X-ray data from the URL
      const xrayResponse = await fetch(xrayUrl);
      
      if (!xrayResponse.ok) {
        throw new Error(`Failed to fetch X-ray data: ${xrayResponse.status} ${xrayResponse.statusText}`);
      }
      
      const xrayData = await xrayResponse.json();
      
      console.log(`Successfully retrieved X-ray data for document: ${documentId}`);
      
      return NextResponse.json({
        success: true,
        documentId,
        xray: xrayData
      }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
      
    } catch (error) {
      console.error(`Error fetching X-ray data for document ${documentId}:`, error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to fetch X-ray data: ${error instanceof Error ? error.message : 'Unknown error'}` 
        },
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