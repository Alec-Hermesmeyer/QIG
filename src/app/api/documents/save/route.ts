// app/api/documents/save/route.ts with content sanitization

import { NextRequest, NextResponse } from 'next/server';
import documentCacheService from '@/services/documentCache';

// Function to sanitize text for storage
function sanitizeTextForStorage(text: string): string {
  // Replace null characters
  let sanitized = text.replace(/\u0000/g, '');
  
  // Replace other problematic characters
  sanitized = sanitized.replace(/\\u[\dA-F]{4}/gi, match => {
    try {
      // Try to convert Unicode escape sequences
      return JSON.parse(`"${match}"`);
    } catch (e) {
      // If conversion fails, replace with empty string
      return '';
    }
  });
  
  // Remove any other control characters (except tabs and newlines)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  return sanitized;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { filename, fileType, content, summary, wordCount, tokenCount } = body;
    
    // Validate required fields
    if (!filename || !content || !summary) {
      return NextResponse.json(
        { message: 'Missing required fields: filename, content, and summary' },
        { status: 400 }
      );
    }
    
    // Sanitize content and summary
    content = sanitizeTextForStorage(content);
    summary = sanitizeTextForStorage(summary);
    
    // Truncate content if it's too large (PostgreSQL TEXT has a limit)
    // Most PostgreSQL installations can handle up to 1GB of text,
    // but we'll be more conservative
    const MAX_CONTENT_LENGTH = 10000000; // 10MB
    if (content.length > MAX_CONTENT_LENGTH) {
      console.warn(`Content too large (${content.length} chars), truncating to ${MAX_CONTENT_LENGTH}`);
      content = content.substring(0, MAX_CONTENT_LENGTH) + 
        '\n\n[Content truncated due to size limitations]';
    }
    
    console.log(`Storing document: ${filename}, content length: ${content.length} chars`);
    
    // Store the document in the cache
    const document = await documentCacheService.storeDocument(
      filename,
      fileType || 'txt',
      content,
      summary,
      wordCount || 0,
      tokenCount || 0
    );
    
    if (!document) {
      return NextResponse.json(
        { message: 'Failed to save document' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      message: 'Document saved successfully',
      document
    });
  } catch (error) {
    console.error('Error saving document:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}