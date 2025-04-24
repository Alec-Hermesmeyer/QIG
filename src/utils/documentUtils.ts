// src/utils/documentUtils.ts

import PDFParser from 'pdf2json';
import * as mammoth from 'mammoth';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Helper function to create a temporary file
export async function createTempFile(buffer: Buffer, extension: string): Promise<string> {
  const tempDir = os.tmpdir();
  const tempFilePath = path.join(tempDir, `temp-${Date.now()}${extension}`);
  await fs.writeFile(tempFilePath, buffer);
  return tempFilePath;
}

// Enhanced PDF extraction with better error handling
export async function extractTextFromPDF(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, 1 as any);
    
    // Set a timeout for the parsing process (30 seconds)
    const timeout = setTimeout(() => {
      reject(new Error('PDF parsing timed out after 30 seconds'));
    }, 30000);
    
    pdfParser.on("pdfParser_dataError", (errData: Record<"parserError", Error>) => {
      clearTimeout(timeout);
      reject(errData.parserError);
    });
    
    pdfParser.on("pdfParser_dataReady", () => {
      try {
        clearTimeout(timeout);
        const text = pdfParser.getRawTextContent();
        
        // Basic validation of the extracted text
        if (!text || text.trim().length === 0) {
          reject(new Error('Extracted empty text from PDF'));
        } else {
          // Clean up text by removing excessive whitespace
          const cleanedText = text
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n\n')
            .trim();
            
          resolve(cleanedText);
        }
      } catch (error) {
        reject(error);
      }
    });
    
    try {
      pdfParser.loadPDF(filePath);
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

// Detect content type
export function detectContentType(content: string): { isBinary: boolean; fileType: string | null } {
  if (!content || typeof content !== 'string') {
    return { isBinary: false, fileType: null };
  }
  
  // Check for PDF signature
  if (content.startsWith('%PDF') || content.includes('%PDF-')) {
    console.log("Detected PDF content");
    return { isBinary: true, fileType: 'pdf' };
  }
  
  // Check for Word document signature
  if (content.startsWith('PK') || content.includes('[Content_Types]') || content.includes('word/document.xml')) {
    console.log("Detected DOCX content");
    return { isBinary: true, fileType: 'docx' };
  }
  
  // Check for possible image or other binary content
  // This is a simple heuristic - binary files often have many non-printable characters
  const nonPrintableChars = content.slice(0, 1000).replace(/[ -~\n\r\t]/g, '').length;
  if (nonPrintableChars > 200) {
    console.log("Detected binary content of unknown type");
    return { isBinary: true, fileType: 'binary' };
  }
  
  // Default to plain text
  return { isBinary: false, fileType: null };
}

// Main function to extract text from any binary content
export async function extractTextFromBinaryContent(content: string, fileType: string): Promise<string> {
  if (!content) return '';
  
  try {
    // Create buffer from binary content
    const buffer = Buffer.from(content, 'binary');
    console.log(`Processing ${fileType} content, buffer size: ${buffer.length}`);
    
    if (fileType === 'pdf') {
      // Process PDF
      try {
        // Create a temporary file for the PDF
        const tempFilePath = await createTempFile(buffer, '.pdf');
        
        try {
          console.log(`Created temporary PDF file at ${tempFilePath}`);
          // Extract text from PDF
          const extractedText = await extractTextFromPDF(tempFilePath);
          console.log(`Successfully extracted text from PDF, length: ${extractedText.length} chars`);
          return extractedText;
        } catch (pdfError) {
          console.error('Error extracting PDF text:', pdfError);
          const errorMessage = pdfError instanceof Error ? pdfError.message : 'Unknown error';
          return `Error extracting text from PDF: ${errorMessage}. The document may be encrypted, damaged, or scanned.`;
        } finally {
          // Clean up temporary file
          try {
            await fs.unlink(tempFilePath);
            console.log('Removed temporary PDF file');
          } catch (cleanupError) {
            console.error('Error removing temp PDF file:', cleanupError);
          }
        }
      } catch (fileError) {
        console.error('Error creating temp file for PDF:', fileError);
        const errorMessage = fileError instanceof Error ? fileError.message : 'Unknown error';
        return `Error processing PDF: ${errorMessage}`;
      }
    } else if (fileType === 'docx') {
      // Process DOCX
      try {
        const result = await mammoth.extractRawText({ buffer });
        console.log(`DOCX text extraction completed, text length: ${result.value.length}`);
        return result.value;
      } catch (err) {
        console.error('Error extracting text from DOCX:', err);
        return "Failed to extract text from this DOCX document.";
      }
    } else {
      return `Unsupported binary format: ${fileType}`;
    }
  } catch (error) {
    console.error('Error in extractTextFromBinaryContent:', error);
    if (error instanceof Error) {
      return `Error processing binary content: ${error.message}`;
    }
    return 'Error processing binary content: Unknown error';
  }
}