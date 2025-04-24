// src/app/api/analyze/route.ts

import { NextRequest, NextResponse } from 'next/server';
import * as mammoth from 'mammoth';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import PDFParser from 'pdf2json';
import documentCacheService from '@/services/documentCache';
import { OpenAI } from 'openai';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '50mb',
  },
};

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

// Function to chunk text into sections for embedding
// Fixed function to chunk text into sections for embedding
function chunkTextForEmbeddings(text: string, maxChunkSize = 1000, overlap = 200): string[] {
  // Input validation
  if (!text || typeof text !== 'string') {
    console.warn('Invalid text provided for chunking');
    return [];
  }
  
  // Ensure parameters are reasonable
  maxChunkSize = Math.max(100, Math.min(maxChunkSize, 8000)); // Limit to reasonable range
  overlap = Math.max(0, Math.min(overlap, maxChunkSize / 2)); // Ensure overlap is reasonable
  
  const chunks: string[] = [];
  let i = 0;
  
  try {
    // Safety check for infinite loops
    const maxIterations = Math.ceil(text.length / (maxChunkSize - overlap)) * 2;
    let iterations = 0;
    
    while (i < text.length && iterations < maxIterations) {
      iterations++;
      
      // Calculate the end position for this chunk
      const remainingLength = text.length - i;
      let chunkEnd = i + Math.min(maxChunkSize, remainingLength);
      
      // Don't go beyond text length
      if (chunkEnd > text.length) {
        chunkEnd = text.length;
      }
      
      // If we're not at the end and have room to look for a clean break
      if (chunkEnd < text.length && chunkEnd - i > 10) {
        // Look for sentence boundaries
        const searchText = text.substring(i, Math.min(chunkEnd + 100, text.length));
        const match = searchText.match(/[.!?]\s/);
        
        if (match && match.index !== undefined && match.index < maxChunkSize) {
          chunkEnd = i + match.index + 2; // +2 to include the punctuation and space
        }
      }
      
      // Safety check for valid substring indices
      if (i >= chunkEnd || i >= text.length || chunkEnd > text.length) {
        break;
      }
      
      // Add the chunk
      chunks.push(text.substring(i, chunkEnd));
      
      // Move to next position with overlap
      i = chunkEnd - overlap;
      
      // Ensure forward progress
      if (i <= 0 || i >= text.length) {
        break;
      }
    }
    
    console.log(`Created ${chunks.length} chunks from text of length ${text.length}`);
    return chunks;
  } catch (error) {
    console.error('Error in chunkTextForEmbeddings:', error);
    
    // Fallback approach: create fewer, larger chunks
    try {
      const simpleChunks = [];
      const simpleChunkSize = Math.min(text.length, 8000);
      
      for (let j = 0; j < text.length; j += simpleChunkSize) {
        const end = Math.min(j + simpleChunkSize, text.length);
        simpleChunks.push(text.substring(j, end));
      }
      
      console.log(`Fallback created ${simpleChunks.length} simple chunks`);
      return simpleChunks;
    } catch (fallbackError) {
      console.error('Fallback chunking also failed:', fallbackError);
      return [text.substring(0, Math.min(8000, text.length))]; // Return just the beginning if all else fails
    }
  }
}
// Generate embeddings for document chunks
async function generateChunkEmbeddings(chunks: string[]): Promise<{text: string, embedding: number[]}[]> {
  try {
    // Process in batches if there are many chunks
    const batchSize = 20; // Adjust based on rate limits and performance
    const embeddingResults: {text: string, embedding: number[]}[] = [];
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batchChunks = chunks.slice(i, i + batchSize);
      console.log(`Generating embeddings for chunks ${i+1} to ${Math.min(i+batchSize, chunks.length)}`);
      
      try {
        const response = await openai.embeddings.create({
          model: "text-embedding-3-small", // or text-embedding-ada-002 for older models
          input: batchChunks,
          encoding_format: "float"
        });
        
        // Map the embeddings to their text chunks
        for (let j = 0; j < batchChunks.length; j++) {
          embeddingResults.push({
            text: batchChunks[j],
            embedding: response.data[j].embedding
          });
        }
      } catch (error) {
        console.error(`Error generating embeddings for batch ${i+1}-${Math.min(i+batchSize, chunks.length)}:`, error);
        // Add chunks without embeddings to not lose the text
        batchChunks.forEach(chunk => {
          embeddingResults.push({
            text: chunk,
            embedding: [] // Empty embedding
          });
        });
      }
      
      // Add a small delay between batches to avoid rate limits
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    return embeddingResults;
  } catch (error) {
    console.error('Error generating embeddings:', error);
    // Return chunks without embeddings as fallback
    return chunks.map(chunk => ({
      text: chunk,
      embedding: []
    }));
  }
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
      
      // Process and store document embeddings
      if (analysisResult.success) {
        const { analysis } = analysisResult;
        if (analysis) {
          // Create document chunks for embeddings
          const chunks = chunkTextForEmbeddings(text);
          console.log(`Created ${chunks.length} chunks for embedding generation`);
          
          // Generate embeddings for chunks
          const embeddedChunks = await generateChunkEmbeddings(chunks);
          console.log(`Generated embeddings for ${embeddedChunks.length} chunks`);
          
          // Store document with chunks and embeddings
          const metadata = await documentCacheService.storeDocumentWithEmbeddings(
            file.name,
            fileType,
            text,
            analysis.summary,
            analysis.wordCount,
            analysis.tokenCount,
            embeddedChunks
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
      
      // Process text input
      const analysisResult = await analyzeText(input);
      
      if (analysisResult.success) {
        const { analysis } = analysisResult;
        if (analysis) {
          // Create document chunks for embeddings
          const chunks = chunkTextForEmbeddings(input);
          
          // Generate embeddings for chunks (if not too large)
          const embeddedChunks = await generateChunkEmbeddings(chunks);
          
          // Store document with chunks and embeddings
          const metadata = await documentCacheService.storeDocumentWithEmbeddings(
            'text-input.txt',
            'txt',
            input,
            analysis.summary,
            analysis.wordCount,
            analysis.tokenCount,
            embeddedChunks
          );
          
          if (metadata) {
            analysis.documentId = metadata.id;
          }
        }
      }
      
      return NextResponse.json(analysisResult);
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
            content: `You are an expert legal document analyzer specializing in contract risk assessment. Analyze the contract provided and create a detailed risk assessment with the following structure:
          
          1. Use markdown formatting to organize your response clearly
          2. Include headings (## and ###) to structure different risk categories
          3. Use bullet points for specific risks and their potential impacts
          4. Bold (**text**) critical risk factors, liability clauses, and key obligations
          
          Structure your analysis with these specific sections:
             - ## Executive Summary
               - Brief overview of the contract and overall risk assessment (low/medium/high)
             
             - ## Risk Profile Analysis
               - ### Financial Risks
                 - Payment terms, penalties, cost escalation clauses
                 - Currency and inflation risks
                 - Budget overrun provisions
               
               - ### Legal Liability Risks
                 - Indemnification clauses
                 - Limitation of liability provisions
                 - Warranty and guarantee obligations
                 - Intellectual property protection/exposure
               
               - ### Performance Risks
                 - Deliverable specifications and quality standards
                 - Timeline commitments and delay consequences
                 - Force majeure provisions
                 - Change request mechanisms
               
               - ### Termination Risks
                 - Termination rights and notice periods
                 - Post-termination obligations
                 - Transition and wind-down provisions
               
               - ### Compliance Risks
                 - Regulatory requirements
                 - Data privacy and security obligations
                 - Industry-specific compliance issues
          
             - ## Critical Clauses Assessment
               - Identify the 3-5 most concerning clauses that present the highest risk
               - Explain specifically why these clauses are problematic
             
             - ## Risk Mitigation Recommendations
               - Specific suggestions for addressing each major risk identified
               - Prioritization of which risks need immediate attention
          
          Ensure your analysis is comprehensive but focused on material risks. For each identified risk, explain both the potential consequences and the likelihood of occurrence. Flag any unusual terms, ambiguous language, or missing provisions that should typically be present in this type of contract.`
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