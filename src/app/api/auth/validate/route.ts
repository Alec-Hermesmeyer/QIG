import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Backend URL from environment
const BACKEND_URL = process.env.BACKEND_URL || 'https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io';

/**
 * Validates an access token
 */
export async function GET(req: NextRequest) {
  try {
    // Get the token from the request headers or cookies
    let token = req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get('access_token')?.value;
    }
    
    if (!token) {
      return NextResponse.json(
        { valid: false, message: 'No token provided' },
        { status: 401 }
      );
    }
    
    // Validate the token with the backend
    const response = await fetch(`${BACKEND_URL}/auth/validate`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { valid: false, message: 'Invalid token' },
        { status: 401 }
      );
    }
    
    // Token is valid, return the user data if available
    const data = await response.json();
    
    return NextResponse.json({
      valid: true,
      user: data.user || null
    });
  } catch (error) {
    console.error('Token validation error:', error);
    
    return NextResponse.json(
      { valid: false, message: 'Token validation failed' },
      { status: 500 }
    );
  }
}