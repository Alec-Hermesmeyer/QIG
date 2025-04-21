// app/api/debug/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const FLASK_API_URL = process.env.FLASK_API_URL;
    
    // Collect environment information
    const environmentInfo = {
      FLASK_API_URL: FLASK_API_URL || 'Not set',
      NODE_ENV: process.env.NODE_ENV || 'Not set',
      // Don't include sensitive credentials
    };
    
    // Collect request headers (omit sensitive values)
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      // Don't include sensitive headers
      if (!['authorization', 'cookie'].includes(key.toLowerCase())) {
        headers[key] = value;
      } else {
        headers[key] = '[REDACTED]';
      }
    });
    
    // Test connection to Flask API
    let flaskApiStatus = 'Not tested';
    let flaskApiResponse = null;
    
    if (FLASK_API_URL) {
      try {
        // Test a simple endpoint that doesn't require authentication
        const response = await fetch(`${FLASK_API_URL}/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
        });
        
        flaskApiStatus = `${response.status} ${response.statusText}`;
        
        if (response.ok) {
          try {
            flaskApiResponse = await response.json();
          } catch {
            const text = await response.text();
            flaskApiResponse = { text: text.substring(0, 1000) }; // Limit text size
          }
        } else {
          try {
            const text = await response.text();
            flaskApiResponse = { error: text.substring(0, 1000) }; // Limit text size
          } catch {
            flaskApiResponse = { error: 'Could not read response body' };
          }
        }
      } catch (error: any) {
        flaskApiStatus = 'Connection error';
        flaskApiResponse = { error: error.message };
      }
    }
    
    // Return all debug information
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: environmentInfo,
      request: {
        method: req.method,
        url: req.url,
        headers
      },
      flaskApi: {
        status: flaskApiStatus,
        response: flaskApiResponse
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Debug error', message: error.message },
      { status: 500 }
    );
  }
}