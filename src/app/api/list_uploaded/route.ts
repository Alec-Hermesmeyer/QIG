import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Backend URL from environment
const BACKEND_URL = process.env.BACKEND_URL || 'https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io';

/**
 * Lists uploaded files from the backend
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
          message: 'Authentication required. Please log in to access your files.' 
        },
        { status: 401 }
      );
    }
    
    // Call the backend API to get the files
    const response = await fetch(`${BACKEND_URL}/files/list`, {
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
    
    // Process the response
    const data = await response.json();
    
    // Return the file list
    return NextResponse.json(data);
  } catch (error) {
    console.error('List files error:', error);
    
    return NextResponse.json(
      { message: 'Failed to fetch file list' },
      { status: 500 }
    );
  }
}