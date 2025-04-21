// app/api/list-files/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Get the backend URL from environment variables
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io';

export async function listFilesGET(request: NextRequest) {
  try {
    // Forward the request to the backend
    const response = await fetch(`${BACKEND_URL}/list_uploaded`, {
      method: 'GET',
      headers: {
        // Forward relevant headers
        'Content-Type': 'application/json',
        // Forward authorization header if present
        ...(request.headers.get('authorization') 
          ? { 'Authorization': request.headers.get('authorization')! } 
          : {})
      },
      credentials: 'include',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend returned error: ${response.status}` },
        { status: response.status }
      );
    }

    // Parse the response as JSON
    const data = await response.json();

    // Return the data
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error listing files:', error);
    return NextResponse.json(
      { error: 'Failed to list files from backend' },
      { status: 500 }
    );
  }
}

// app/api/proxy-content/route.ts
export async function GET(request: NextRequest) {
  try {
    // Get the filename from the URL search params
    const url = new URL(request.url);
    const filename = url.searchParams.get('filename');
    
    if (!filename) {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      );
    }
    
    // Forward the request to the backend
    const response = await fetch(`${BACKEND_URL}/proxy-content?filename=${encodeURIComponent(filename)}`, {
      method: 'GET',
      headers: {
        // Forward relevant headers
        ...(request.headers.get('authorization') 
          ? { 'Authorization': request.headers.get('authorization')! } 
          : {})
      },
      credentials: 'include',
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Backend returned error: ${response.status}` },
        { status: response.status }
      );
    }
    
    // Get the content type
    const contentType = response.headers.get('content-type');
    
    // Read the response as array buffer
    const data = await response.arrayBuffer();
    
    // Create a new response with the same data
    const newResponse = new NextResponse(data);
    
    // Set the content type if available
    if (contentType) {
      newResponse.headers.set('Content-Type', contentType);
    }
    
    return newResponse;
  } catch (error) {
    console.error('Error getting file content:', error);
    return NextResponse.json(
      { error: 'Failed to get file content from backend' },
      { status: 500 }
    );
  }
}