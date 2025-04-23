// src/app/api/analyze/route.ts

import { NextRequest, NextResponse } from 'next/server';
import * as mammoth from 'mammoth';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import PDFParser from 'pdf2json';
import documentCacheService from '@/services/documentCache';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '50mb',
  },
};

// Simple function to estimate tokens (approximately 4 chars per token)
function estimateTokenCount(text: string): number {
  // GPT models typically use ~4 chars per token on average
  return Math.ceil(text.length / 4);
}

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

async function readDocx(fileBuffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer: fileBuffer });
  return result.value;
}

export async function POST(req: NextRequest) {
  try {
    if (req.headers.get('content-type')?.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }
      
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      let text = '';
      
      // Determine file type
      const fileType = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 
                       file.name.toLowerCase().endsWith('.docx') ? 'docx' : 
                       file.name.toLowerCase().endsWith('.doc') ? 'doc' : 'unknown';
      
      if (fileType === 'pdf') {
        // Create a temporary file for the PDF
        const tempFilePath = await createTempFile(buffer, '.pdf');
        
        try {
          // Process the PDF using a stream-based approach
          text = await readPDFWithStream(tempFilePath);
        } finally {
          // Clean up temporary file
          try {
            await fs.unlink(tempFilePath);
          } catch (cleanupError) {
            console.error('Error removing temp file:', cleanupError);
          }
        }
      } else if (fileType === 'docx' || fileType === 'doc') {
        text = await readDocx(buffer);
      } else {
        return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
      }
      
      // Analyze the text
      const analysisResult = await analyzeText(text);
      
      // Store the document in cache
      if (analysisResult.success) {
        const { analysis } = analysisResult;
        if (analysis) {
          const metadata = await documentCacheService.storeDocument(
            file.name,
            fileType,
            text,
            analysis.summary,
            analysis.wordCount,
            analysis.tokenCount
          );
          
          // Document ID is already added earlier if metadata exists, so this block is redundant and removed.
        }
        
        // Add document ID to the response
        if (analysis) {
          const metadata = await documentCacheService.storeDocument(
            file.name,
            fileType,
            text,
            analysis.summary,
            analysis.wordCount,
            analysis.tokenCount
          );
          if (metadata) {
            analysis.documentId = metadata.id;
          }
        }
      }
      
      return NextResponse.json(analysisResult);
    } else {
      const body = await req.json();
      const input = body.input as string;
      return await analyzeText(input);
    }
  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json({ 
      error: 'Failed to process request', 
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function analyzeText(input: string) {
  try {
    if (!input || typeof input !== 'string') {
      throw new Error('Input must be a valid string.');
    }
    
    // Calculate token count
    const tokenCount = estimateTokenCount(input);
    const wordCount = input.split(/\s+/).filter(Boolean).length;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { 
            role: 'system', 
            content: `You are a professional document analyzer. Analyze the document provided and create a comprehensive summary with the following guidelines:

1. Use markdown formatting to structure your response
2. Include headings (## and ###) to organize information
3. Use bullet points or numbered lists where appropriate
4. Bold (**text**) important terms, names, and key figures
5. Structure your analysis with the following sections:
   - Executive Summary (brief overview)
   - Key Parties and Entities (identify who's involved)
   - Main Components (outline major elements)
   - Critical Points (highlight important aspects)
   - Implications (what this means in practical terms)

Ensure your summary is well-formatted, clear, and captures the essential information from the document.`
          },
          { 
            role: 'user', 
            content: input.length > 25000 ? input.slice(0, 25000) + '...(document truncated for length)' : input
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent, focused summaries
        max_tokens: 1000, // Allow for a comprehensive summary
      }),
    });
    
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errText}`);
    }
    
    const data = await response.json();
    const output = data.choices?.[0]?.message?.content || 'No summary returned.';
    
    // Calculate usage metrics if available in the response
    const inputTokensUsed = data.usage?.prompt_tokens || tokenCount;
    const outputTokensUsed = data.usage?.completion_tokens || estimateTokenCount(output);
    const totalTokensUsed = data.usage?.total_tokens || (inputTokensUsed + outputTokensUsed);
    
    return {
      success: true,
      analysis: {
        wordCount,
        tokenCount,
        summary: output.trim(),
        usage: {
          inputTokens: inputTokensUsed,
          outputTokens: outputTokensUsed,
          totalTokens: totalTokensUsed
        },
        documentId: undefined as string | undefined, // Initialize documentId as undefined with explicit type
      },
    };
  } catch (err: unknown) {
    console.error('AnalyzeText Error:', err);
    return {
      success: false,
      error: 'Failed to analyze text.',
      message: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}