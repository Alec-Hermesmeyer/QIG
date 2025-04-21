import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Backend URL from environment
const BACKEND_URL = process.env.BACKEND_URL || 'https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io';

/**
 * Handles the callback from the backend authentication service
 */
export async function GET(req: NextRequest) {
  // Get auth code from query params
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  
  if (error) {
    // Authentication failed
    return new Response(
      `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Authentication Failed</title>
            <script>
              window.onload = function() {
                // Send message to parent window
                window.opener.postMessage({
                  type: 'AUTH_CALLBACK',
                  success: false,
                  error: "${error}"
                }, window.location.origin);
                
                // Close window after a short delay
                setTimeout(function() {
                  window.close();
                }, 500);
              };
            </script>
          </head>
          <body>
            <h3>Authentication failed</h3>
            <p>Error: ${error}</p>
            <p>This window will close automatically.</p>
          </body>
        </html>
      `,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  }
  
  if (!code) {
    // No code provided
    return new Response(
      `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Authentication Failed</title>
            <script>
              window.onload = function() {
                // Send message to parent window
                window.opener.postMessage({
                  type: 'AUTH_CALLBACK',
                  success: false,
                  error: "No authorization code provided"
                }, window.location.origin);
                
                // Close window after a short delay
                setTimeout(function() {
                  window.close();
                }, 500);
              };
            </script>
          </head>
          <body>
            <h3>Authentication failed</h3>
            <p>Error: No authorization code provided</p>
            <p>This window will close automatically.</p>
          </body>
        </html>
      `,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  }
  
  try {
    // Exchange code for tokens with backend
    const tokenResponse = await fetch(`${BACKEND_URL}/auth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        redirect_uri: `${req.nextUrl.origin}/api/auth/callback`,
      }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      
      return new Response(
        `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Authentication Failed</title>
              <script>
                window.onload = function() {
                  // Send message to parent window
                  window.opener.postMessage({
                    type: 'AUTH_CALLBACK',
                    success: false,
                    error: "Failed to exchange code for token"
                  }, window.location.origin);
                  
                  // Close window after a short delay
                  setTimeout(function() {
                    window.close();
                  }, 500);
                };
              </script>
            </head>
            <body>
              <h3>Authentication failed</h3>
              <p>Error: Failed to exchange code for token</p>
              <p>This window will close automatically.</p>
            </body>
          </html>
        `,
        {
          headers: {
            'Content-Type': 'text/html',
          },
        }
      );
    }
    
    // Get token and user info
    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in, user } = tokenData;
    
    // Set cookies for the session
    const cookieStore = await cookies();
    
    // Set access token cookie
    cookieStore.set('access_token', access_token, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: expires_in || 3600,
      sameSite: 'lax',
    });
    
    // Set refresh token cookie if available
    if (refresh_token) {
      cookieStore.set('refresh_token', refresh_token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        sameSite: 'lax',
      });
    }
    
    // Return success page that sends message to opener and closes
    return new Response(
      `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Authentication Successful</title>
            <script>
              window.onload = function() {
                // Send message to parent window
                window.opener.postMessage({
                  type: 'AUTH_CALLBACK',
                  success: true,
                  token: "${access_token}",
                  user: ${JSON.stringify(user || {})}
                }, window.location.origin);
                
                // Close window after a short delay
                setTimeout(function() {
                  window.close();
                }, 500);
              };
            </script>
          </head>
          <body>
            <h3>Authentication successful!</h3>
            <p>You can close this window now.</p>
          </body>
        </html>
      `,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  } catch (error) {
    console.error('Error in auth callback:', error);
    
    return new Response(
      `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Authentication Error</title>
            <script>
              window.onload = function() {
                // Send message to parent window
                window.opener.postMessage({
                  type: 'AUTH_CALLBACK',
                  success: false,
                  error: "Internal server error"
                }, window.location.origin);
                
                // Close window after a short delay
                setTimeout(function() {
                  window.close();
                }, 500);
              };
            </script>
          </head>
          <body>
            <h3>Authentication error</h3>
            <p>An unexpected error occurred during authentication.</p>
            <p>This window will close automatically.</p>
          </body>
        </html>
      `,
      {
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  }
}