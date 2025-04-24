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

// Backup document storage in case Supabase fails
async function saveDocumentToFile(documentId: string, content: any) {
  try {
    // In Next.js API routes in production, we can't write to the filesystem directly
    // so we'll use this as a debug function in development only
    if (process.env.NODE_ENV === 'development') {
      const fsModule = require('fs').promises;
      const pathModule = require('path');
      const dir = pathModule.join(process.cwd(), 'data');
      
      // Create directory if it doesn't exist
      await fsModule.mkdir(dir, { recursive: true });
      
      // Save document to file
      const filePath = pathModule.join(dir, `${documentId}.json`);
      await fsModule.writeFile(filePath, JSON.stringify(content, null, 2));
      
      console.log(`Document saved to file: ${filePath}`);
    }
    return true;
  } catch (error) {
    console.error('Error saving document to file:', error);
    return false;
  }
}

// Handler for GET requests (diagnostic endpoint)
export async function GET(req: NextRequest) {
  try {
    // Check Supabase environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ 
        error: 'Supabase configuration missing',
        envVars: {
          url: supabaseUrl ? 'configured' : 'missing',
          key: supabaseKey ? 'configured' : 'missing'
        }
      }, { status: 500 });
    }
    
    // Initialize service
    const initialized = await documentCacheService.initialize();
    
    if (!initialized) {
      return NextResponse.json({ 
        error: 'Document cache service failed to initialize',
        status: 'disconnected'
      }, { status: 500 });
    }
    
    // Get all documents to test connectivity
    const documents = await documentCacheService.getAllDocuments();
    
    return NextResponse.json({
      initialized,
      connectionStatus: 'connected',
      documentCount: documents.length,
      documents: documents.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        uploadDate: doc.uploadDate,
        fileType: doc.fileType,
        hasEmbeddings: doc.hasEmbeddings
      }))
    });
  } catch (error) {
    console.error('Database connection test failed:', error);
    return NextResponse.json({ 
      initialized: false,
      connectionStatus: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify Supabase configuration
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error("Supabase configuration is missing");
      return NextResponse.json({ 
        error: 'Database configuration is missing', 
        status: 'configuration_error' 
      }, { status: 500 });
    }

    // Explicitly initialize the document cache service
    console.log("Initializing document cache service...");
    const initialized = await documentCacheService.initialize();
    if (!initialized) {
      console.error("Failed to initialize document cache service");
      return NextResponse.json({ 
        error: 'Database initialization failed', 
        status: 'initialization_error' 
      }, { status: 500 });
    }
    console.log("Document cache service initialized successfully");

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
      const analysisResult = await analyzeText(text, file);
      
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
          try {
            console.log("Storing document in Supabase...");
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
              console.log(`Successfully stored document with ID: ${metadata.id}`);
              
              // Create a backup copy for debugging
              await saveDocumentToFile(metadata.id, {
                metadata,
                content: {
                  summary: analysis.summary,
                  contentPreview: text.substring(0, 500) + '...'
                },
                analysis: analysis
              });
            } else {
              console.error("Document storage returned null metadata");
            }
          } catch (storageError) {
            console.error("Error storing document in Supabase:", storageError);
            // Continue processing to return analysis even if storage fails
          }
        }
      }
      
      return NextResponse.json(analysisResult);
    } else {
      const body = await req.json();
      const input = body.input as string;
      
      // Process text input
      const analysisResult = await analyzeText(input, new File([""], "placeholder.txt"));
      
      if (analysisResult.success) {
        const { analysis } = analysisResult;
        if (analysis) {
          // Create document chunks for embeddings
          const chunks = chunkTextForEmbeddings(input);
          console.log(`Created ${chunks.length} chunks for embedding generation`);
          
          // Generate embeddings for chunks (if not too large)
          const embeddedChunks = await generateChunkEmbeddings(chunks);
          console.log(`Generated embeddings for ${embeddedChunks.length} chunks`);
          
          // Store document with chunks and embeddings
          try {
            console.log("Storing text input in Supabase...");
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
              console.log(`Successfully stored text input with ID: ${metadata.id}`);
            } else {
              console.error("Document storage returned null metadata");
            }
          } catch (storageError) {
            console.error("Error storing text input in Supabase:", storageError);
            // Continue processing to return analysis even if storage fails
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

async function analyzeDocument(content: string, filename: string) {
  try {
    // Calculate basic metrics
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const tokenCount = Math.ceil(content.length / 4); // Simple token estimate

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
            content: `You are an expert document analyzer that extracts key information from documents and returns it as clean, structured JSON. You will be given document content and must extract the relevant information.

For contract documents, extract:
1. Parties involved (names, roles)
2. Contract type and purpose
3. Key dates (effective date, termination date, etc.)
4. Financial terms (payment amounts, schedule, penalties)
5. Performance obligations
6. Termination conditions
7. Governing law
8. Risk assessment (categorized as financial, legal, performance, etc.)

Return a JSON object with these properties:
{
  "documentType": "string", // Contract, Agreement, Amendment, etc.
  "title": "string",
  "parties": [{
    "name": "string",
    "role": "string" // e.g., Owner, Contractor, Vendor, etc.
  }],
  "dates": {
    "effective": "ISO date string or null",
    "termination": "ISO date string or null",
    "other": [{
      "name": "string",
      "date": "ISO date string"
    }]
  },
  "financialTerms": {
    "totalAmount": "number or null",
    "currency": "string",
    "paymentSchedule": "string",
    "penalties": "string or null"
  },
  "keyObligations": ["string"],
  "terminationConditions": ["string"],
  "governingLaw": "string or null",
  "riskAssessment": {
    "overall": "string", // Low, Medium, High
    "financialRisks": [{
      "description": "string",
      "severity": "string", // Low, Medium, High
      "likelihood": "string" // Low, Medium, High
    }],
    "legalRisks": [{
      "description": "string",
      "severity": "string",
      "likelihood": "string"
    }],
    "performanceRisks": [{
      "description": "string",
      "severity": "string",
      "likelihood": "string"
    }],
    "terminationRisks": [{
      "description": "string", 
      "severity": "string",
      "likelihood": "string"
    }],
    "complianceRisks": [{
      "description": "string",
      "severity": "string",
      "likelihood": "string"
    }]
  },
  "criticalClauses": [{
    "clause": "string",
    "concern": "string",
    "recommendation": "string"
  }],
  "extractedContent": {
    "summary": "string"
  }
}`
          },
          {
            role: 'user',
            content: content
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });
    
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errText}`);
    }
    
    const data = await response.json();
    
    // Parse the JSON response from the API
    let jsonResponse;
    try {
      // The content should already be JSON since we specified response_format
      if (typeof data.choices[0].message.content === 'string') {
        jsonResponse = JSON.parse(data.choices[0].message.content);
      } else {
        jsonResponse = data.choices[0].message.content;
      }
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      throw new Error('Failed to parse document analysis JSON');
    }
    
    // Calculate usage metrics if available in the response
    const inputTokensUsed = data.usage?.prompt_tokens || tokenCount;
    const outputTokensUsed = data.usage?.completion_tokens || Math.ceil(data.choices[0].message.content.length / 4);
    const totalTokensUsed = data.usage?.total_tokens || (inputTokensUsed + outputTokensUsed);
    
    // Ensure we have a summary from the JSON response
    const summary = jsonResponse.extractedContent?.summary || 
                   "No summary available in the analysis.";
    
    // Return values compatible with your document storage function
    return {
      success: true,
      analysis: {
        wordCount,
        tokenCount,
        // Important: Include these required fields
        filename: filename,
        content: content,
        summary: summary,
        usage: {
          inputTokens: inputTokensUsed,
          outputTokens: outputTokensUsed,
          totalTokens: totalTokensUsed
        },
        documentId: undefined as string | undefined,
        // Include the structured JSON data
        structuredData: jsonResponse
      },
    };
  } catch (err: unknown) {
    console.error('AnalyzeDocument Error:', err);
    return {
      success: false,
      error: 'Failed to analyze document.',
      message: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

async function analyzeText(text: string, file: File) {
  try {
    // Analyze the document content
    const analysisResult = await analyzeDocument(text, file.name);

    if (analysisResult.success) {
      return {
        success: true,
        analysis: analysisResult.analysis,
      };
    } else {
      return {
        success: false,
        error: analysisResult.error || 'Unknown error during analysis',
      };
    }
  } catch (error) {
    console.error('Error in analyzeText:', error);
    return {
      success: false,
      error: 'Failed to analyze text',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}