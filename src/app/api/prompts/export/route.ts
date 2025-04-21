// app/api/prompts/export/route.ts
import { list } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

// GET handler for exporting all prompts
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
    
    // Create response with appropriate headers
    const response = NextResponse.json(prompts, { status: 200 });
    response.headers.set('Content-Type', 'application/json');
    response.headers.set('Content-Disposition', 'attachment; filename=prompt-library-export.json');
    
    return response;
  } catch (error) {
    console.error('Error in prompts export API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

