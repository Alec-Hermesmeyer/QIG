import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple test endpoint to verify API warmup is working
 * This endpoint can be called to check if warmup requests are being received
 */
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  return NextResponse.json({
    success: true,
    message: 'Warmup test endpoint reached successfully',
    timestamp,
    endpoint: '/api/warmup-test',
    method: 'GET'
  });
}

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  let body = null;
  
  try {
    body = await request.json();
  } catch (e) {
    // Ignore JSON parsing errors for warmup requests
  }
  
  return NextResponse.json({
    success: true,
    message: 'Warmup test endpoint reached successfully',
    timestamp,
    endpoint: '/api/warmup-test',
    method: 'POST',
    body: body
  });
} 