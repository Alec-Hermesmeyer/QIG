import { NextRequest, NextResponse } from 'next/server';

const BASE_URL = "https://python-langgraph-production.up.railway.app";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint') || '/';
  
  try {
    console.log(`[LLM Battlefield Proxy] GET ${endpoint}`);
    
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'QIG-Frontend-Proxy/1.0',
      },
    });

    const data = await response.text();
    let jsonData;
    
    try {
      jsonData = JSON.parse(data);
    } catch {
      jsonData = { raw_response: data, status: response.status };
    }

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      data: jsonData,
      headers: Object.fromEntries(response.headers.entries()),
    });

  } catch (error) {
    console.error('[LLM Battlefield Proxy] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 500,
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint') || '/run_graph';
  
  try {
    console.log(`[LLM Battlefield Proxy] POST ${endpoint}`);
    
    const body = await request.json();
    
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'QIG-Frontend-Proxy/1.0',
      },
      body: JSON.stringify(body),
    });

    const data = await response.text();
    let jsonData;
    
    try {
      jsonData = JSON.parse(data);
    } catch {
      jsonData = { raw_response: data, status: response.status };
    }

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      data: jsonData,
      headers: Object.fromEntries(response.headers.entries()),
      execution_time: response.headers.get('x-execution-time') || undefined,
    });

  } catch (error) {
    console.error('[LLM Battlefield Proxy] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 500,
    }, { status: 500 });
  }
} 