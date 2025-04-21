// app/api/auth_setup/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Backend URL from environment
const BACKEND_URL = process.env.BACKEND_URL || 'https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io';

/**
 * This API route proxies requests to the Flask backend's auth_setup endpoint,
 * avoiding CORS issues when calling directly from the frontend
 */
export async function GET(req: NextRequest) {
  try {
    console.log(`Proxying auth_setup request to: ${BACKEND_URL}/auth_setup`);
    
    // Call the Flask backend auth_setup endpoint
    const response = await fetch(`${BACKEND_URL}/auth_setup`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Log response status
    console.log(`Flask API auth_setup response status: ${response.status}`);
    
    if (!response.ok) {
      // Try to get more information from the error response
      let errorText = '';
      try {
        errorText = await response.text();
        console.error('Error details:', errorText);
      } catch (e) {
        console.error('Could not extract error details');
      }
      
      // Return a default configuration if we can't get it from the backend
      return NextResponse.json({
        clientId: '3a5bf240-a65a-47f0-a5f9-c21a70f08b0a', // Replace with your actual client ID
        authority: `https://login.microsoftonline.com/d97de02a-4882-4368-af5b-39b68295eeea`,
        scopes: ['User.Read', 'openid', 'profile'],
      });
    }
    
    // Get the auth configuration from the response
    const authConfig = await response.json();
    
    // Return the auth configuration
    return NextResponse.json(authConfig);
  } catch (error: any) {
    console.error('Error proxying auth_setup request:', error);
    
    // Return a default configuration if we can't get it from the backend
    return NextResponse.json({
      clientId: '3a5bf240-a65a-47f0-a5f9-c21a70f08b0a', // Replace with your actual client ID
      authority: `https://login.microsoftonline.com/d97de02a-4882-4368-af5b-39b68295eeea`,
      scopes: ['User.Read', 'openid', 'profile'],
    });
  }
}