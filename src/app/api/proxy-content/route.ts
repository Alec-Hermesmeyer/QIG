import { NextRequest, NextResponse } from 'next/server';

// Azure credentials from environment variables
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_SECRET = process.env.AZURE_SECRET;

// Function to get an access token using client credentials flow
async function getAzureToken() {
  try {
    const tokenEndpoint = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      client_id: AZURE_CLIENT_ID!,
      scope: `${AZURE_CLIENT_ID}/.default`,
      client_secret: AZURE_SECRET!,
      grant_type: 'client_credentials'
    });
    
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to get Azure token:', errorText);
      throw new Error(`Azure token request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting Azure token:', error);
    throw error;
  }
}

export async function GET(req: NextRequest) {
  try {
    // Get the filename from search params
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');
    
    // Validate filename
    if (!filename) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'Filename is required' },
        { status: 400 }
      );
    }
    
    // Get Azure token using client credentials flow
    const token = await getAzureToken();
    
    // Create the backend URL
    const backendUrl = `${process.env.NEXT_PUBLIC_API_URL}/content/${encodeURIComponent(filename)}`;
    
    // Make the authenticated request to the backend
    const backendResponse = await fetch(backendUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Handle error responses
    if (!backendResponse.ok) {
      return NextResponse.json(
        { error: 'Backend Error', details: `Status ${backendResponse.status}: ${backendResponse.statusText}` },
        { status: backendResponse.status }
      );
    }
    
    // Get content type and disposition headers
    const contentType = backendResponse.headers.get('content-type') || 'application/octet-stream';
    const contentDisposition = backendResponse.headers.get('content-disposition');
    
    // Get the response data
    const arrayBuffer = await backendResponse.arrayBuffer();
    
    // Create the response with proper headers
    const response = new NextResponse(Buffer.from(arrayBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        ...(contentDisposition ? { 'Content-Disposition': contentDisposition } : {}),
      },
    });
    
    return response;
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Proxy Error', details: error.message },
      { status: 500 }
    );
  }
}