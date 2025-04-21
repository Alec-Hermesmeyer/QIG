import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Backend URL from environment
const BACKEND_URL = process.env.BACKEND_URL || 'https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io';

/**
 * Logs the user out by clearing cookies and notifying the backend
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('access_token')?.value;
    const refreshToken = cookieStore.get('refresh_token')?.value;
    
    // Clear the cookies regardless of backend response
    cookieStore.delete('access_token');
    cookieStore.delete('refresh_token');
    
    // If we have a token, notify the backend
    if (accessToken) {
      try {
        await fetch(`${BACKEND_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refresh_token: refreshToken
          }),
        });
      } catch (backendError) {
        // We still want to log out locally even if the backend call fails
        console.error('Backend logout error:', backendError);
      }
    }
    
    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    
    // Still try to clear cookies even if there was an error
    try {
      const cookieStore = await cookies();
      cookieStore.delete('access_token');
      cookieStore.delete('refresh_token');
    } catch (cookieError) {
      console.error('Error clearing cookies:', cookieError);
    }
    
    return NextResponse.json(
      { success: false, message: 'Error during logout, but cookies have been cleared' },
      { status: 500 }
    );
  }
}