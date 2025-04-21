// app/api/prompts/route.ts
import { list, put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

// GET handler for retrieving all prompts
export async function GET() {
  try {
    // List all blobs with the prompt/ prefix
    const blobs = await list({ prefix: 'prompts/' });
    
    // Load and parse each prompt file
    const promptsPromises = blobs.blobs.map(async (blob) => {
      try {
        // Fetch the blob content
        const response = await fetch(blob.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch blob: ${blob.url}`);
        }
        
        // Parse JSON content
        const promptData = await response.json();
        return promptData;
      } catch (error) {
        console.error(`Error loading prompt from ${blob.url}:`, error);
        return null;
      }
    });
    
    // Wait for all prompts to be loaded
    const promptsWithNulls = await Promise.all(promptsPromises);
    
    // Filter out any nulls (failed loads)
    const prompts = promptsWithNulls.filter(Boolean);
    
    return NextResponse.json({ prompts }, { status: 200 });
  } catch (error) {
    console.error('Error in prompts API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST handler for creating or updating a prompt
export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const promptData = await req.json();
    
    // Validate the prompt data
    if (!promptData.id || !promptData.name || !promptData.content) {
      return NextResponse.json({ error: 'Missing required prompt fields' }, { status: 400 });
    }
    
    // Create a filename based on the prompt ID
    const filename = `prompts/${promptData.id}.json`;
    
    // Save the prompt to Vercel Blob storage
    const blob = await put(filename, JSON.stringify(promptData, null, 2), {
      access: 'public',
      contentType: 'application/json',
    });
    
    return NextResponse.json({ 
      success: true,
      url: blob.url,
      promptId: promptData.id
    }, { status: 200 });
  } catch (error) {
    console.error('Error in prompts API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

