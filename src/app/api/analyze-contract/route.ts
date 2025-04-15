// src/app/api/analyze-contract/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const { model, prompt, temperature } = await request.json();
    
    // Validate required parameters
    if (!model || !prompt) {
      return NextResponse.json(
        { message: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: temperature || 0.4,
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('API error:', data);
      return NextResponse.json(
        { message: data.error?.message || 'API request failed' },
        { status: response.status }
      );
    }
    
    return NextResponse.json({
      content: data.choices?.[0]?.message?.content || ''
    });
  } catch (error: any) {
    console.error('Server error:', error);
    return NextResponse.json(
      { message: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// This prevents other HTTP methods
export async function GET() {
  return NextResponse.json(
    { message: 'Method not allowed. Only POST requests are supported.' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { message: 'Method not allowed. Only POST requests are supported.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { message: 'Method not allowed. Only POST requests are supported.' },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { message: 'Method not allowed. Only POST requests are supported.' },
    { status: 405 }
  );
}  
