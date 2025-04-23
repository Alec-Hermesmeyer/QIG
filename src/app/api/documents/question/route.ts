import { NextRequest, NextResponse } from 'next/server';
import documentCacheService from '@/services/documentCache';
import { OpenAI } from 'openai';

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
      
      // Check if chunked and if we need to get full content
      if (document.metadata.chunked) {
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
    }
    else {
      // No document available
      return NextResponse.json(
        { message: 'Document not found or content not provided' },
        { status: 400 }
      );
    }

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