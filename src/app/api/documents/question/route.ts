import { NextRequest, NextResponse } from 'next/server';
import documentCacheService from '@/services/documentCache';
import { OpenAI } from 'openai';
import PDFParser from 'pdf2json';
import * as mammoth from 'mammoth';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface MemoryStore {
  [key: string]: {
    content: string;
    filename: string;
  }
}

// In-memory document store for testing without a database
const memoryDocumentStore: MemoryStore = {};

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
        resolve(pdfParser.getRawTextContent());
      } catch (error) {
        reject(error);
      }
    });
    pdfParser.loadPDF(filePath);
  });
}

// Helper function to detect if content is a binary file format and what type
function detectContentType(content: string): { isBinary: boolean; fileType: string | null } {
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
  
  // Default to plain text
  return { isBinary: false, fileType: null };
}

// Extract text from binary content
async function extractTextFromBinaryContent(content: string, fileType: string): Promise<string> {
  if (!content) return '';
  
  try {
    // Create buffer from binary content
    const buffer = Buffer.from(content, 'binary');
    console.log(`Processing ${fileType} content, buffer size: ${buffer.length}`);
    
    if (fileType === 'pdf') {
      // Process PDF
      const tempFilePath = await createTempFile(buffer, '.pdf');
      
      try {
        // Extract text from PDF
        const extractedText = await readPDFWithStream(tempFilePath);
        console.log(`PDF text extraction completed, text length: ${extractedText.length}`);
        return extractedText;
      } catch (pdfError) {
        console.error('Error extracting PDF text:', pdfError);
        return "Error extracting text from PDF document.";
      } finally {
        try {
          await fs.unlink(tempFilePath);
        } catch (err) {
          console.error('Error removing temp PDF file:', err);
        }
      }
    } else if (fileType === 'docx') {
      // Process DOCX
      try {
        const result = await mammoth.extractRawText({ buffer });
        console.log(`DOCX text extraction completed, text length: ${result.value.length}`);
        return result.value;
      } catch (err) {
        console.error('Error extracting text from DOCX:', err);
        return "Failed to extract text from this document format.";
      }
    } else {
      return "Unsupported binary format";
    }
  } catch (error) {
    console.error('Error in extractTextFromBinaryContent:', error);
    return "Error processing binary content";
  }
}

// NEW: Function to identify if a question can be answered from structured data
function canUseStructuredData(question: string): boolean {
  const structuredDataPatterns = [
    // General document information
    /what (type|kind) of (document|contract)/i,
    /who (are|is) the part(y|ies)/i,
    /who (signed|executed) the (document|contract|agreement)/i,
    
    // Financial terms
    /what('s| is| are) the (financial terms|payment terms|total amount|contract sum)/i,
    /how much (money|payment|is the contract worth)/i,
    /(what|when|how) (is|are) (payment|payments) (made|scheduled)/i,
    
    // Dates and timelines
    /when (was|is) the (effective date|termination date|completion date)/i,
    /what('s| is| are) the (deadline|timeline|schedule)/i,
    
    // Risks
    /what (are|is) the (risk|risks)/i,
    /what financial risks/i,
    /what legal (risk|risks)/i,
    /what performance (risk|risks)/i,
    /what termination (risk|risks)/i,
    /what compliance (risk|risks)/i,
    
    // Obligations
    /what (are|is) the (key|main) obligations/i,
    /what (must|should|is required to) the (contractor|owner|party)/i,
    
    // Termination
    /how can (this|the) (contract|agreement) be terminated/i,
    /what are the termination (conditions|clauses|terms)/i,
    
    // Critical clauses
    /what (are|is) the (critical|important|key) clauses/i,
    /which clauses (are|pose) (a risk|risks|problematic)/i
  ];
  
  return structuredDataPatterns.some(pattern => pattern.test(question));
}

// NEW: Function to query structured data for answers
async function queryStructuredData(question: string, structuredData: any): Promise<string> {
  try {
    const prompt = `
You are an AI assistant that answers questions about documents based on structured data.
You have access to the following structured data about a document:

${JSON.stringify(structuredData, null, 2)}

Question: ${question}

Provide a concise, factual answer based strictly on the structured data above. 
Do not make up information. If the structured data doesn't contain the information needed to answer the question, 
say "I don't have that specific information in the structured data."

Answer:
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4", // You can change this to a different model
      messages: [
        { role: "system", content: "You are a helpful AI document assistant." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2, // Very low temperature for factual responses
      max_tokens: 500
    });
    
    return response.choices[0].message.content || "I couldn't generate an answer based on the structured data.";
  } catch (error) {
    console.error('Error querying structured data:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentId, question, documentContent } = body;

    // If OpenAI is not configured, return a demo response
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        answer: "This is a demo response. To get real AI-powered answers, please configure your OpenAI API key in the environment variables.",
        sources: [
          { 
            text: "This is a sample source text that would normally come from your document.", 
            score: 0.95 
          }
        ]
      });
    }

    // Get document content - either from memory store, passed in request, or from database
    let content: string;
    let filename: string;
    let document: any = null;
    let useEmbeddingSearch = false;
    let structuredData = null;  // NEW: Variable to hold structured data
    
    if (documentContent) {
      // If document content is passed directly in the request
      content = documentContent;
      filename = "Document";
      
      // Store in memory for future reference
      const tempId = `temp_${Date.now()}`;
      memoryDocumentStore[tempId] = { content, filename };
    } 
    else if (documentId && memoryDocumentStore[documentId]) {
      // If we have the document in our memory store
      content = memoryDocumentStore[documentId].content;
      filename = memoryDocumentStore[documentId].filename;
    } 
    else if (documentId) {
      // Try to get from database
      document = await documentCacheService.getDocument(documentId);
      
      if (!document) {
        return NextResponse.json(
          { message: 'Document not found' },
          { status: 404 }
        );
      }
      
      // NEW: Try to get structured data
      if (document.analysis && document.analysis.structuredData) {
        structuredData = document.analysis.structuredData;
        console.log('Found structured data for document');
      }
      
      // First check for extracted text if it exists
      if (document.metadata.hasExtractedText && document.content.extractedText) {
        console.log(`Using extracted text for document ${documentId}`);
        content = document.content.extractedText;
      }
      // Check if chunked and if we need to get full content
      else if (document.metadata.chunked) {
        if (document.metadata.hasEmbeddings) {
          // If document has embeddings, we'll use them instead of loading full content
          useEmbeddingSearch = true;
          content = document.content.content; // Just use preview content for now
        } else {
          // Load full content if embeddings aren't available
          const fullContent = await documentCacheService.getFullDocumentContent(documentId);
          content = fullContent || document.content.content;
        }
      } else {
        content = document.content.content;
      }
      
      filename = document.metadata.filename;
      
      // Check if content is binary and needs extraction
      const { isBinary, fileType } = detectContentType(content);
      if (isBinary) {
        console.log(`Document ${documentId} contains binary ${fileType} content, extracting text`);
        const extractedText = await extractTextFromBinaryContent(content, fileType || '');
        
        // Save the extracted text for future use
        try {
          await documentCacheService.updateExtractedContent(documentId, extractedText);
          console.log(`Saved extracted text for future use, length: ${extractedText.length}`);
        } catch (updateError) {
          console.error("Error saving extracted text:", updateError);
        }
        
        // Use the extracted text
        content = extractedText;
      }
    }
    else {
      // No document available
      return NextResponse.json(
        { message: 'Document not found or content not provided' },
        { status: 400 }
      );
    }

    // NEW: Check if we can use structured data for this question
    if (structuredData && canUseStructuredData(question)) {
      try {
        console.log('Using structured data to answer the question');
        const answer = await queryStructuredData(question, structuredData);
        
        return NextResponse.json({
          answer,
          sources: [{
            text: "This answer was generated from structured analysis of the document.",
            score: 1.0
          }]
        });
      } catch (structuredDataError) {
        console.error('Error using structured data, falling back to text search:', structuredDataError);
        // Fall back to text search if structured data query fails
      }
    }

    // If structured data couldn't be used, proceed with text search
    console.log('Using text search to answer the question');
    
    // Find relevant content for the question
    let relevantChunks;
    
    if (useEmbeddingSearch && document) {
      // Use embedding-based search
      relevantChunks = await findRelevantChunksWithEmbeddings(question, documentId);
    } else {
      // Use text-based chunking and search
      const chunks = chunkText(content);
      relevantChunks = await findRelevantChunks(question, chunks);
    }
    
    // Build context from relevant chunks
    const context = relevantChunks.map(chunk => chunk.text).join("\n\n");
    
    // Generate answer using OpenAI
    const answer = await generateAnswer(question, context, filename);
    
    // Return response
    return NextResponse.json({
      answer,
      sources: relevantChunks.slice(0, 3) // Return top 3 sources
    });
    
  } catch (error) {
    console.error('Error in document question API:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Improved text chunking function with error handling
function chunkText(text: string, maxChunkSize = 1000, overlap = 200): string[] {
  // Defensive programming - handle null, undefined or non-string inputs
  if (!text || typeof text !== 'string') {
    console.warn('Invalid text provided for chunking:', typeof text);
    return [];
  }
  
  try {
    const chunks: string[] = [];
    let i = 0;
    
    // Safety check to prevent infinite loops
    const maxIterations = Math.ceil(text.length / (maxChunkSize - overlap)) + 10;
    let iterations = 0;
    
    while (i < text.length && iterations < maxIterations) {
      iterations++;
      
      // Calculate chunk end with bounds checking
      let chunkEnd = Math.min(i + maxChunkSize, text.length);
      
      // If we're not at the end of the text, try to find a natural break point
      if (chunkEnd < text.length) {
        try {
          // Look for the next period, question mark, or exclamation point followed by a space or newline
          const searchText = text.substring(i, Math.min(chunkEnd + 100, text.length));
          const nextBreak = searchText.search(/[.!?]\s/);
          
          if (nextBreak !== -1 && nextBreak < maxChunkSize + 100) {
            chunkEnd = i + nextBreak + 2; // +2 to include the punctuation and space
          }
        } catch (err) {
          console.warn('Error finding break point:', err);
          // Continue with the original chunkEnd if there's an error
        }
      }
      
      // Add the chunk with bounds checking
      try {
        const start = Math.max(0, i);
        const end = Math.min(text.length, chunkEnd);
        
        if (start < end) {
          chunks.push(text.substring(start, end));
        }
      } catch (err) {
        console.error('Error adding chunk:', err);
      }
      
      // Move to next position with bounds checking
      i = Math.min(text.length, chunkEnd - overlap);
      
      // Ensure we're making progress
      if (i <= 0) i = chunkEnd;
    }
    
    if (iterations >= maxIterations) {
      console.warn('Chunking terminated after maximum iterations');
    }
    
    return chunks;
  } catch (err) {
    console.error('Catastrophic error in chunking:', err);
    
    // Fall back to a simpler chunking approach
    try {
      const simpleChunks: string[] = [];
      const chunkCount = Math.ceil(text.length / maxChunkSize);
      
      for (let i = 0; i < chunkCount; i++) {
        const start = i * maxChunkSize;
        const end = Math.min(start + maxChunkSize, text.length);
        simpleChunks.push(text.substring(start, end));
      }
      
      return simpleChunks;
    } catch (fallbackErr) {
      console.error('Even fallback chunking failed:', fallbackErr);
      return ["Error processing document content"];
    }
  }
}

// Function to find relevant chunks using embeddings and cosine similarity
async function findRelevantChunks(question: string, chunks: string[], topK = 5) {
  try {
    // If there are no chunks, return an empty array
    if (!chunks || chunks.length === 0) {
      return [];
    }
    
    // Get embedding for the question
    const questionEmbeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small", // Use the newest embedding model
      input: question,
      encoding_format: "float"
    });
    const questionEmbedding = questionEmbeddingResponse.data[0].embedding;
    
    // Process chunks in batches to avoid rate limits
    const batchSize = 20;
    let allEmbeddedChunks: {text: string, embedding: number[]}[] = [];
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batchChunks = chunks.slice(i, i + batchSize);
      
      // Get embeddings for this batch of chunks
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: batchChunks,
        encoding_format: "float"
      });
      
      // Map the embeddings to their text chunks
      for (let j = 0; j < batchChunks.length; j++) {
        allEmbeddedChunks.push({
          text: batchChunks[j],
          embedding: response.data[j].embedding
        });
      }
      
      // Add a small delay between batches to avoid rate limits
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    // Calculate cosine similarity between question and each chunk
    const scoredChunks = allEmbeddedChunks.map(chunk => {
      return {
        text: chunk.text,
        score: calculateCosineSimilarity(questionEmbedding, chunk.embedding)
      };
    });
    
    // Sort by score and return top K
    return scoredChunks.sort((a, b) => b.score - a.score).slice(0, topK);
  } catch (error) {
    console.error('Error finding relevant chunks with embeddings:', error);
    // Fallback: return all chunks with no scoring
    return chunks.map(chunk => ({ text: chunk, score: 1 })).slice(0, topK);
  }
}

// Function to find relevant chunks using pre-stored embeddings
async function findRelevantChunksWithEmbeddings(question: string, documentId: string, topK = 5) {
  try {
    // Generate embedding for the question
    const embeddingResponse = await fetch('/api/generate-embedding', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: question }),
    });
    
    if (!embeddingResponse.ok) {
      throw new Error('Failed to generate question embedding');
    }
    
    const { embedding } = await embeddingResponse.json();
    
    // Find similar chunks using the document service
    const similarChunks = await documentCacheService.findSimilarChunks(embedding, documentId, topK);
    
    // Format results
    return similarChunks.map(result => ({
      text: result.chunk.content,
      score: result.similarity
    }));
  } catch (error) {
    console.error('Error finding relevant chunks with stored embeddings:', error);
    
    // Fallback to getting document chunks and searching without embeddings
    const document = await documentCacheService.getDocument(documentId);
    if (!document || !document.chunks) {
      throw new Error('Document or chunks not found');
    }
    
    // Use the chunks we have but without sophisticated scoring
    const chunks = document.chunks.map(chunk => chunk.content);
    
    // Simple keyword matching as a fallback
    return findRelevantChunksSimple(question, chunks, topK);
  }
}

// Simple function to find relevant chunks based on keyword matching (fallback)
function findRelevantChunksSimple(question: string, chunks: string[], topK = 5) {
  try {
    // Handle empty input
    if (!chunks || chunks.length === 0 || !question) {
      return [];
    }
    
    // Extract keywords from the question (simple approach)
    const stopWords = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'about', 'is', 'are', 'was', 'were']);
    const keywords = question.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
    
    // If no keywords were found, return chunks with equal scores
    if (keywords.length === 0) {
      return chunks.slice(0, topK).map(chunk => ({
        text: chunk,
        score: 0.5
      }));
    }
    
    // Score chunks based on keyword occurrences
    const scoredChunks = chunks.map(chunk => {
      const chunkLower = chunk.toLowerCase();
      let score = 0;
      
      keywords.forEach(keyword => {
        try {
          // Count occurrences of the keyword in the chunk
          const regex = new RegExp(`\\b${keyword}\\b`, 'g');
          const matches = chunkLower.match(regex);
          if (matches) {
            score += matches.length;
          }
        } catch (err) {
          // Ignore regex errors and continue
        }
      });
      
      return {
        text: chunk,
        score: score / Math.max(1, keywords.length) // Normalize by number of keywords
      };
    });
    
    // Sort by score and return top K
    return scoredChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(chunk => ({
        ...chunk,
        score: Math.min(0.95, Math.max(0.5, chunk.score / 5)) // Normalize to a reasonable range
      }));
  } catch (err) {
    console.error('Error in simple chunk relevance scoring:', err);
    return chunks.slice(0, topK).map(chunk => ({
      text: chunk,
      score: 0.5
    }));
  }
}

// Calculate cosine similarity between two vectors
function calculateCosineSimilarity(a: number[], b: number[]): number {
  try {
    // Check for valid inputs
    if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0 || a.length !== b.length) {
      console.warn('Invalid vectors for cosine similarity calculation');
      return 0;
    }
    
    // Dot product
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    
    // Magnitude of vector a
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    
    // Magnitude of vector b
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    // Check for zero magnitudes to avoid division by zero
    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }
    
    // Cosine similarity
    return dotProduct / (magnitudeA * magnitudeB);
  } catch (err) {
    console.error('Error calculating cosine similarity:', err);
    return 0;
  }
}

// Generate an answer using OpenAI
async function generateAnswer(question: string, context: string, documentName: string): Promise<string> {
  const prompt = `
You are an AI assistant that answers questions about documents.
You are currently answering a question about the document: "${documentName}".

CONTEXT:
${context}

QUESTION:
${question}

INSTRUCTIONS:
1. Answer the question based only on the provided context.
2. If the answer is not in the context, say "I couldn't find information about that in the document."
3. Don't make up information or reference things not in the context.
4. Keep your answer concise and to the point.

ANSWER:
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4", // You can change this to a different model
      messages: [
        { role: "system", content: "You are a helpful AI document assistant." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3, // Low temperature for more factual responses
      max_tokens: 500
    });
    
    return response.choices[0].message.content || "I couldn't generate an answer for this question.";
  } catch (error) {
    console.error('Error generating answer:', error);
    return "Sorry, I encountered an error while trying to answer your question.";
  }
}