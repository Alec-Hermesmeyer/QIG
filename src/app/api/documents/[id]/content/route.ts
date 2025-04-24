import { NextRequest, NextResponse } from 'next/server';
import documentCacheService from '@/services/documentCache';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import PDFParser from 'pdf2json';
import * as mammoth from 'mammoth';

// Helper function to create a temporary file
async function createTempFile(buffer: Buffer, extension: string): Promise<string> {
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `temp-${Date.now()}${extension}`);
  await fs.writeFile(tempFilePath, buffer);
  return tempFilePath;
}

// Helper function to process a PDF
async function readPDFWithStream(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, 1 as any); // Type cast to any to avoid TypeScript error
    
    pdfParser.on("pdfParser_dataError", (errData: Record<"parserError", Error>) => {
      reject(errData.parserError);
    });
    
    pdfParser.on("pdfParser_dataReady", () => {
      try {
        // Get text content
        const text = pdfParser.getRawTextContent();
        resolve(text);
      } catch (error) {
        reject(error);
      }
    });
    
    // Load the PDF
    pdfParser.loadPDF(filePath);
  });
}

// Helper function to detect if content is a binary file format and what type
function detectContentType(content: string): { isBinary: boolean; fileType: string | null } {
  // Check for Word document signature
  if (content.startsWith('PK') || content.includes('[Content_Types]') || content.includes('word/document.xml')) {
    return { isBinary: true, fileType: 'docx' };
  }
  
  // Check for PDF signature
  if (content.startsWith('%PDF') || content.includes('%PDF-')) {
    return { isBinary: true, fileType: 'pdf' };
  }
  
  // Default to plain text
  return { isBinary: false, fileType: null };
}

// API endpoint to fetch full document content, including all chunks if needed
// Use NextJS's expected parameter pattern
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { message: 'Document ID is required' },
        { status: 400 }
      );
    }
    
    // Get document metadata first to check if it's chunked
    const document = await documentCacheService.getDocument(id);
    
    if (!document) {
      return NextResponse.json(
        { message: 'Document not found' },
        { status: 404 }
      );
    }
    
    let content = '';
    
    // If document is chunked, get full content
    if (document.metadata.chunked) {
      const fullContent = await documentCacheService.getFullDocumentContent(id);
      
      if (fullContent) {
        content = fullContent;
      } else {
        // Fallback to regular content if we can't load chunks
        content = document.content.content;
        console.warn(`Could not load chunks for document ${id}, using preview content`);
      }
    } else {
      // For non-chunked documents, just return the regular content
      content = document.content.content;
    }
    
    // Check if the content appears to be a binary file format
    const { isBinary, fileType } = detectContentType(content);
    
    // If it's binary, we need to extract the text
    if (isBinary) {
      try {
        let extractedText = '';
        
        if (fileType === 'pdf') {
          // Create a temporary buffer from the string
          const buffer = Buffer.from(content, 'binary');
          const tempFilePath = await createTempFile(buffer, '.pdf');
          
          try {
            extractedText = await readPDFWithStream(tempFilePath);
          } finally {
            // Clean up temp file
            try {
              await fs.unlink(tempFilePath);
            } catch (err) {
              console.error('Error removing temp PDF file:', err);
            }
          }
        } else if (fileType === 'docx') {
          // Convert string to buffer
          const buffer = Buffer.from(content, 'binary');
          try {
            const result = await mammoth.extractRawText({ buffer });
            extractedText = result.value;
          } catch (err) {
            console.error('Error extracting text from DOCX:', err);
            extractedText = "Failed to extract text from this document format.";
          }
        }
        
        // Use extracted text if we got it, otherwise indicate there was an issue
        if (extractedText) {
          content = extractedText;
        } else {
          content = "This document appears to be in a binary format that couldn't be parsed properly.";
        }
      } catch (error) {
        console.error('Error processing binary content:', error);
        content = "Error: Could not process this document format.";
      }
    }
    
    return NextResponse.json({ 
      content,
      isChunked: document.metadata.chunked || false,
      totalChunks: document.metadata.totalChunks || 0,
      isBinary,
      fileType
    });
  } catch (error) {
    console.error('Error fetching document content:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}