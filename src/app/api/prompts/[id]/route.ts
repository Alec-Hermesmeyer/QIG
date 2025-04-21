// app/api/prompts/[id]/route.ts
import { del, head } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

// Helper to get prompt ID from the route params
interface RouteParams {
  params: {
    id: string;
  };
}

// DELETE handler for deleting a prompt
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Invalid prompt ID' }, { status: 400 });
    }
    
    // Construct the filename
    const filename = `prompts/${id}.json`;
    
    // Check if the blob exists first
    try {
      await head(filename);
    } catch (error) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }
    
    // Delete the blob
    await del(filename);
    
    return NextResponse.json({
      success: true,
      promptId: id
    }, { status: 200 });
  } catch (error) {
    console.error('Error in prompt ID API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET handler for retrieving a specific prompt
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json({ error: 'Invalid prompt ID' }, { status: 400 });
    }
    
    // Construct the filename
    const filename = `prompts/${id}.json`;
    
    // First check if the blob exists
    try {
      const blob = await head(filename);
      
      // Fetch the blob content
      const response = await fetch(blob.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch blob: ${blob.url}`);
      }
      
      // Parse JSON content
      const promptData = await response.json();
      
      return NextResponse.json(promptData, { status: 200 });
    } catch (error) {
      return NextResponse.json({ error: 'Prompt not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error in prompt ID API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

