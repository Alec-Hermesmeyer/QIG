// app/api/prompts/import/route.ts
import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

// POST handler for importing prompts
export async function POST(req: NextRequest) {
  try {
    // Use FormData API to handle the file upload
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    // Read the file content
    const fileContent = await file.text();
    
    // Parse the JSON content
    let promptsToImport;
    try {
      promptsToImport = JSON.parse(fileContent);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON file' }, { status: 400 });
    }
    
    // Handle both array of prompts and single prompt object
    const promptsArray = Array.isArray(promptsToImport) ? promptsToImport : [promptsToImport];
    
    // Validate each prompt
    const validPrompts = promptsArray.filter(prompt => 
      prompt && 
      typeof prompt === 'object' && 
      prompt.id && 
      prompt.name && 
      prompt.content
    );
    
    if (validPrompts.length === 0) {
      return NextResponse.json({ error: 'No valid prompts found in the file' }, { status: 400 });
    }
    
    // Upload each prompt to Vercel Blob storage
    const uploadPromises = validPrompts.map(async (prompt) => {
      try {
        const filename = `prompts/${prompt.id}.json`;
        
        // Add timestamp if missing
        if (!prompt.createdAt) {
          prompt.createdAt = new Date().toISOString();
        }
        if (!prompt.updatedAt) {
          prompt.updatedAt = new Date().toISOString();
        }
        
        // Save the prompt
        const blob = await put(filename, JSON.stringify(prompt, null, 2), {
          access: 'public',
          contentType: 'application/json',
        });
        
        return {
          success: true,
          promptId: prompt.id,
          name: prompt.name,
          url: blob.url
        };
      } catch (error) {
        console.error(`Error uploading prompt ${prompt.id}:`, error);
        return {
          success: false,
          promptId: prompt.id,
          name: prompt.name,
          error: 'Failed to upload prompt'
        };
      }
    });
    
    // Wait for all uploads to complete
    const results = await Promise.all(uploadPromises);
    
    // Count successes and failures
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    return NextResponse.json({
      success: true,
      message: `Imported ${successCount} prompts successfully${failureCount > 0 ? `, ${failureCount} failed` : ''}`,
      results
    }, { status: 200 });
  } catch (error) {
    console.error('Error in prompts import API route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}