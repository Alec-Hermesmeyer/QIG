import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Backend URL from environment
const BACKEND_URL = process.env.BACKEND_URL || 'https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io';

/**
 * Checks if the user has a valid session
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    
    if (!accessToken) {
      return NextResponse.json({ 
        authenticated: false,
        message: 'No access token found'
      });
    }
    
    // Validate the token with the backend
    const response = await fetch(`${BACKEND_URL}/auth/validate`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      // Token is invalid, try refreshing
      const refreshToken = cookieStore.get('refresh_token')?.value;
      
      if (refreshToken) {
        // Try to refresh the token
        const refreshResponse = await fetch(`${BACKEND_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refresh_token: refreshToken,
          }),
        });
        
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          const { access_token, expires_in } = refreshData;
          
          // Update the access token cookie
          cookieStore.set('access_token', access_token, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: expires_in || 3600,
            sameSite: 'lax',
          });
          
          // Return the successful response with user data
          return NextResponse.json({
            authenticated: true,
            token: access_token,
            user: refreshData.user || null
          });
        }
      }
      
      // If we're here, either there was no refresh token or refreshing failed
      return NextResponse.json({ 
        authenticated: false,
        message: 'Invalid token and unable to refresh'
      });
    }
    
    // Token is valid
    const userData = await response.json();
    
    return NextResponse.json({
      authenticated: true,
      token: accessToken,
      user: userData.user || null
    });
  } catch (error) {
    console.error('Session check error:', error);
    
    return NextResponse.json({ 
      authenticated: false,
      message: 'Session check failed'
    }, { status: 500 });
  }
}