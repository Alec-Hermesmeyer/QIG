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
    const pdfParser = new PDFParser(null, 1 as any);
    pdfParser.on("pdfParser_dataError", (errData: Record<"parserError", Error>) => reject(errData.parserError));
    pdfParser.on("pdfParser_dataReady", () => {
      try {
        // Get raw text content from the PDF
        const text = pdfParser.getRawTextContent();
        console.log(`PDF text extraction succeeded, length: ${text.length} chars`);
        resolve(text);
      } catch (error) {
        console.error("Error extracting PDF text content:", error);
        reject(error);
      }
    });
    
    try {
      pdfParser.loadPDF(filePath);
    } catch (error) {
      console.error("Error loading PDF file:", error);
      reject(error);
    }
  });
}

// Enhanced helper function to detect if content is a binary file format and what type
function detectContentType(content: string): { isBinary: boolean; fileType: string | null } {
  // If content is empty or not a string, return as not binary
  if (!content || typeof content !== 'string') {
    return { isBinary: false, fileType: null };
  }
  
  // Check for PDF signature (both at start or embedded)
  if (content.startsWith('%PDF') || content.includes('%PDF-')) {
    console.log("Detected PDF content");
    return { isBinary: true, fileType: 'pdf' };
  }
  
  // Check for Word document signature
  if (content.startsWith('PK') || content.includes('[Content_Types]') || content.includes('word/document.xml')) {
    console.log("Detected DOCX content");
    return { isBinary: true, fileType: 'docx' };
  }
  
  // Default to plain text
  return { isBinary: false, fileType: null };
}

// API endpoint to fetch full document content, including all chunks if needed
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {    
    const id = params.id;
    
    if (!id) {
      return NextResponse.json({ message: 'Document ID is required' }, { status: 400 });
    }
    
    console.log(`Fetching document content for ID: ${id}`);
    const document = await documentCacheService.getDocument(id);
    
    if (!document) {
      console.log(`Document not found for ID: ${id}`);
      return NextResponse.json({ message: 'Document not found' }, { status: 404 });
    }
    
    let content = '';
    
    // Handle chunked documents
    if (document.metadata.chunked) {
      console.log(`Document is chunked, fetching full content`);
      const fullContent = await documentCacheService.getFullDocumentContent(id);
      if (fullContent) {
        content = fullContent;
        console.log(`Successfully loaded chunked content, length: ${content.length}`);
      } else {
        // Fallback to regular content if we can't load chunks
        content = document.content.content;
        console.warn(`Could not load chunks for document ${id}, using preview content`);
      }
    } else {
      content = document.content.content;
      console.log(`Loaded non-chunked content, length: ${content.length}`);
    }
    
    // Detect content type
    const { isBinary, fileType } = detectContentType(content);
    console.log(`Content detection: isBinary=${isBinary}, fileType=${fileType}`);
    
    // Process binary content
    if (isBinary) {
      try {
        console.log(`Processing binary ${fileType} content`);
        let extractedText = '';
        
        // Create buffer from binary content
        const buffer = Buffer.from(content, 'binary');
        console.log(`Created buffer of size: ${buffer.length}`);
        
        if (fileType === 'pdf') {
          // Process PDF
          console.log('Processing PDF content');
          const tempFilePath = await createTempFile(buffer, '.pdf');
          console.log(`Created temp file: ${tempFilePath}`);
          
          try {
            // Extract text from PDF
            extractedText = await readPDFWithStream(tempFilePath);
            console.log(`PDF text extraction completed, text length: ${extractedText.length}`);
          } catch (pdfError) {
            console.error('Error extracting PDF text:', pdfError);
            extractedText = "Error extracting text from PDF document.";
          } finally {
            try {
              await fs.unlink(tempFilePath);
              console.log('Temp PDF file removed');
            } catch (err) {
              console.error('Error removing temp PDF file:', err);
            }
          }
        } else if (fileType === 'docx') {
          // Process DOCX
          console.log('Processing DOCX content');
          try {
            const result = await mammoth.extractRawText({ buffer });
            extractedText = result.value;
            console.log(`DOCX text extraction completed, text length: ${extractedText.length}`);
          } catch (err) {
            console.error('Error extracting text from DOCX:', err);
            extractedText = "Failed to extract text from this document format.";
          }
        }
        
        // Update content with extracted text
        if (extractedText && extractedText.length > 0) {
          content = extractedText;
          console.log(`Using extracted text for response, length: ${content.length}`);
        } else {
          content = "This document appears to be in a binary format that couldn't be parsed properly.";
          console.warn('No text extracted from binary content');
        }
      } catch (error) {
        console.error('Error processing binary content:', error);
        content = "Error: Could not process this document format.";
      }
    }
    
    // Save extracted text back to cache for future queries
    if (isBinary && content.length > 100 && !content.startsWith("Error") && !content.startsWith("This document appears")) {
      try {
        console.log(`Saving extracted text to cache for future queries, ID: ${id}`);
        await documentCacheService.updateExtractedContent(id, content);
      } catch (cacheError) {
        console.error('Error updating extracted content in cache:', cacheError);
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
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}