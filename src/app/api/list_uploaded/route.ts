// app/api/proxy/list_uploaded/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { BACKEND_URL } from '@/lib/constants';

export async function GET(request: NextRequest) {
  try {
    // Build the target URL
    const targetUrl = `${BACKEND_URL}/list_uploaded`;
    
    // Forward all headers except host
    const headers = new Headers();
    request.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'host') {
        headers.append(key, value);
      }
    });
    
    // Forward cookies for authentication
    const cookies = request.cookies.getAll();
    if (cookies.length > 0) {
      const cookieHeader = cookies
        .map((cookie) => `${cookie.name}=${cookie.value}`)
        .join('; ');
      headers.set('cookie', cookieHeader);
    }
    
    // Forward the request to the backend
    const backendRes = await fetch(targetUrl, {
      method: 'GET',
      headers,
      redirect: 'follow',
    });
    
    if (!backendRes.ok) {
      return NextResponse.json(
        { error: `Backend returned error: ${backendRes.status}` },
        { status: backendRes.status }
      );
    }
    
    // Parse the JSON response
    const data = await backendRes.json();
    
    // Return the files list
    return NextResponse.json(data);
  } catch (error) {
    console.error('List uploaded files error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}