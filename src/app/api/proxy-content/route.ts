import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Backend URL from environment
const BACKEND_URL = process.env.BACKEND_URL || 'https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io';

/**
 * Proxies file content requests to the backend
 */
export async function GET(req: NextRequest) {
  try {
    // Get the access token from cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    
    if (!accessToken) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          message: 'Authentication required. Please log in to access file content.' 
        },
        { status: 401 }
      );
    }
    
    // Get the filename from the query params
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');
    
    if (!filename) {
      return NextResponse.json(
        { message: 'Filename is required' },
        { status: 400 }
      );
    }
    
    // Call the backend API to get the file content
    const response = await fetch(`${BACKEND_URL}/files/content?filename=${encodeURIComponent(filename)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      // Handle specific error cases
      if (response.status === 401 || response.status === 403) {
        return NextResponse.json(
          { 
            error: 'Authentication error',
            message: 'Your session has expired. Please log in again.'
          },
          { status: response.status }
        );
      }
      
      // Try to get the error message from response
      try {
        const errorData = await response.json();
        return NextResponse.json(
          { 
            error: 'Backend API error',
            message: errorData.message || `Error ${response.status}: ${response.statusText}`
          },
          { status: response.status }
        );
      } catch (jsonError) {
        // If we can't parse the JSON, just use the status
        return NextResponse.json(
          { 
            error: 'Backend API error',
            message: `Error ${response.status}: ${response.statusText}`
          },
          { status: response.status }
        );
      }
    }
    
    // Get the content type from the response
    const contentType = response.headers.get('content-type') || 'text/plain';
    
    // Get the response as an array buffer
    const contentBuffer = await response.arrayBuffer();
    
    // Return the content with the correct content type
    return new Response(contentBuffer, {
      headers: {
        'Content-Type': contentType
      }
    });
  } catch (error) {
    console.error('Proxy content error:', error);
    
    return NextResponse.json(
      { message: 'Failed to retrieve file content' },
      { status: 500 }
    );
  }
}