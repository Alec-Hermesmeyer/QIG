// app/api/groundx/rag/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GroundXClient } from "groundx";
import OpenAI from "openai";
import { 
  ChatCompletionMessageParam,
  ChatCompletionUserMessageParam,
  ChatCompletionSystemMessageParam,
  ChatCompletionAssistantMessageParam
} from "openai/resources/chat/completions";

/**
 * Interface definitions to match GroundX API types
 */
interface DocumentPage {
  pageNumber: number;
  imageUrl: string;
}

interface DocumentMetadata {
  [key: string]: any;
}

interface DocumentDetail {
  document?: {
    pages?: DocumentPage[];
    metadata?: DocumentMetadata;
    title?: string;
    fileName?: string;
  };
}

interface SearchResultItem {
  documentId?: string;
  fileName?: string;
  score?: number; // Allow undefined to match the GroundX library type
  text?: string;
  metadata?: {
    page?: string;
    section?: string;
    [key: string]: any;
  };
}

interface EnhancedSource {
  id?: string;
  fileName?: string;
  score?: number;
  text: string;
  pageImages: string[];
  metadata: Record<string, any>;
  narrative: string[];
  keyPhrases?: string[];
  viewUrl?: string;
  downloadUrl?: string;
  // New fields for better excerpts
  extractedSections?: string[];
  fullExcerpt?: string;
}

interface DocumentExcerpt {
  id: string;
  fileName: string;
  excerpts: string[];
  narrative: string[];
  metadata?: Record<string, any>;
}

interface RagResponse {
  success: boolean;
  timestamp?: string;
  query?: string;
  response: string;
  searchResults: {
    count: number;
    sources: Array<{
      id?: string;
      fileName?: string;
      score?: number;
    }>;
  };
  thoughts?: string[] | null;
  supportingContent: {
    text: string[];
  };
  enhancedResults: {
    totalResults: number;
    sources: EnhancedSource[];
  };
  // New field for document excerpts
  documentExcerpts?: DocumentExcerpt[];
  modelUsed?: string;
  error?: string;
  errorDetails?: {
    name: string;
    stack?: string;
  };
}

// Initialize clients with error handling
let groundxClient: GroundXClient;
let openai: OpenAI;

try {
  groundxClient = new GroundXClient({
    apiKey: process.env.GROUNDX_API_KEY || '',
  });

  openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_KEY || '',
  });
} catch (error) {
  console.error('Error initializing API clients:', error);
}

/**
 * Extract key phrases from text content
 * This helps identify important sections in the document
 */
function extractKeyPhrases(text: string, maxPhrases: number = 5): string[] {
  // Look for phrases that appear to be headings or important points
  const headings = text.match(/(?:^|\n)([A-Z][A-Za-z\s]{3,}:)/g) || [];
  
  // Look for phrases with potential keywords (customize this based on your domain)
  const keywords = ['important', 'key', 'significant', 'result', 'conclusion', 'finding'];
  const sentencesWithKeywords = keywords.flatMap(keyword => {
    const regex = new RegExp(`[^.!?]*(?:\\b${keyword}\\b)[^.!?]*[.!?]`, 'gi');
    return (text.match(regex) || []).map(s => s.trim());
  });
  
  // Combine and limit
  return [...headings, ...sentencesWithKeywords]
    .filter(Boolean)
    .slice(0, maxPhrases)
    .map(phrase => phrase.trim());
}

/**
 * Extracts sections from text content
 * This splits text into meaningful chunks for better excerpt displays
 */
function extractTextSections(text: string, maxSections: number = 5): string[] {
  if (!text || text.length === 0) return [];
  
  // First, try to split by paragraphs (two newlines)
  let sections = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  // If we don't have clear paragraphs, try to split by single newlines
  if (sections.length <= 1) {
    sections = text.split(/\n/).filter(p => p.trim().length > 0);
  }
  
  // If we still don't have good sections, split by sentences and group them
  if (sections.length <= 1) {
    const sentences = text.split(/(?<=[.!?])\s+/);
    sections = [];
    
    // Group sentences into logical sections (3-4 sentences per section)
    for (let i = 0; i < sentences.length; i += 3) {
      const section = sentences.slice(i, i + 3).join(' ');
      if (section.trim()) {
        sections.push(section.trim());
      }
    }
  }
  
  // Return a limited number of sections
  return sections.slice(0, maxSections).map(s => s.trim());
}

/**
 * Handles POST requests to the GroundX RAG endpoint
 * Performs document search and generates AI responses based on retrieved content
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Validate API clients
    if (!groundxClient || !openai) {
      return NextResponse.json(
        { 
          success: false, 
          timestamp: new Date().toISOString(),
          error: 'API clients not properly initialized',
          errorDetails: {
            name: 'InitializationError',
            stack: process.env.NODE_ENV === 'development' ? 'Failed to initialize GroundX or OpenAI client' : undefined
          },
          response: '',
          searchResults: { count: 0, sources: [] },
          supportingContent: { text: [] },
          enhancedResults: { totalResults: 0, sources: [] }
        },
        { status: 500 }
      );
    }

    // Parse and validate request body
    const body = await request.json().catch(() => ({}));
    const { 
      query, 
      bucketId, 
      messages = [], 
      includeThoughts = false,
      limit = 10, // New parameter: control number of search results
      maxTokens = 2000, // New parameter: control response length
      temperature = 0.3 // New parameter: control response randomness
    } = body;
    
    console.log('RAG API request:', { 
      query, 
      bucketId, 
      messageCount: messages?.length, 
      includeThoughts,
      limit,
      maxTokens,
      temperature
    });
    
    if (!query) {
      return NextResponse.json(
        { 
          success: false, 
          timestamp: new Date().toISOString(),
          error: 'Query is required',
          response: '',
          searchResults: { count: 0, sources: [] },
          supportingContent: { text: [] },
          enhancedResults: { totalResults: 0, sources: [] }
        },
        { status: 400 }
      );
    }
    
    if (!bucketId) {
      return NextResponse.json(
        { 
          success: false, 
          timestamp: new Date().toISOString(),
          error: 'BucketId is required',
          response: '',
          searchResults: { count: 0, sources: [] },
          supportingContent: { text: [] },
          enhancedResults: { totalResults: 0, sources: [] }
        },
        { status: 400 }
      );
    }

    // 1. Search for content using GroundX with configurable limit
    console.log(`Searching bucket ${bucketId} for: "${query}" with limit ${limit}`);
    const searchResponse = await groundxClient.search.content(
      Number(bucketId),
      {
        query: query,
        // limit: limit, // Removed as 'limit' is not a valid property in 'SearchRequest'
      }
    );

    // 2. Check if we found any results
    if (!searchResponse?.search?.results || searchResponse.search.results.length === 0) {
      console.log('No search results found');
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        query: query,
        response: "I couldn't find any relevant information about that in the documents.",
        searchResults: {
          count: 0,
          sources: []
        },
        thoughts: includeThoughts ? ["Searched for information but found no relevant results in the documents."] : null,
        supportingContent: { text: [] },
        enhancedResults: { totalResults: 0, sources: [] },
        modelUsed: "gpt-4-0125-preview"
      } as RagResponse);
    }

    console.log(`Found ${searchResponse.search.results.length} results`);
    
    // 3. Prepare enhanced results for the UI with improved error handling for each document
    const sources: EnhancedSource[] = await Promise.all(
      searchResponse.search.results.map(async (result: SearchResultItem) => {
        // Default values for missing properties
        const documentId = result.documentId || '';
        const fileName = result.fileName || `Document ${documentId}`;
        const score = result.score || 0; 
        const text = result.text || '';
        
        // Initialize empty collections
        let pageImages: string[] = [];
        let metadata: Record<string, any> = {};
        let narrative: string[] = [];
        let keyPhrases: string[] = [];
        let extractedSections: string[] = [];
        let fullExcerpt = text;
        
        // Only attempt to fetch details if we have a document ID
        if (documentId) {
          try {
            // Fetch document details with error handling
            const docDetails = await groundxClient.documents.get(documentId) as DocumentDetail;
            
            // Process page images if available
            if (docDetails?.document?.pages?.length) {
              pageImages = docDetails.document.pages
                .filter((page: DocumentPage) => Boolean(page.imageUrl))
                .map((page: DocumentPage) => page.imageUrl);
            }
            
            // Process metadata if available
            if (docDetails?.document?.metadata) {
              metadata = { ...docDetails.document.metadata };
            }
            
            // Add document title and filename to metadata if available
            if (docDetails?.document?.title) {
              metadata.title = docDetails.document.title;
            }
            
            if (docDetails?.document?.fileName) {
              metadata.originalFileName = docDetails.document.fileName;
            }
            
            // Generate a narrative summary if we have text content
            if (text.length > 0) {
              // Enhanced summary extraction with longer context
              const summaryLength = Math.min(500, text.length); 
              const summary = text.substring(0, summaryLength) + (text.length > summaryLength ? '...' : '');
              
              // Extract key phrases from the text
              keyPhrases = extractKeyPhrases(text);
              
              // Extract meaningful sections from the text for better excerpts
              extractedSections = extractTextSections(text, 5);
              
              // Create a narrative with document summary and key points
              narrative = [
                `Document summary: ${summary}`,
              ];
              
              if (keyPhrases.length > 0) {
                narrative.push(`Key points: ${keyPhrases.join('; ')}`);
              }
              
              // Add location context if available
              if (metadata.page) {
                narrative.push(`Page: ${metadata.page}`);
              }
              
              if (metadata.section) {
                narrative.push(`Section: ${metadata.section}`);
              }
            }
          } catch (err) {
            console.warn(`Error fetching enhanced details for document ${documentId}:`, err);
            // Add error info to narrative for debugging
            narrative = [`Could not load enhanced details for this document. ${err instanceof Error ? err.message : ''}`];
          }
        }
        
        // Add metadata from search result
        if (result.metadata) {
          metadata = {
            ...metadata,
            page: result.metadata.page,
            section: result.metadata.section,
            ...result.metadata
          };
        }
        
        // Create document viewing and download URLs
        let viewUrl;
        let downloadUrl;
        
        if (documentId) {
          // Create URLs for viewing and downloading the document
          // These URL patterns will depend on your frontend routes
          viewUrl = `/api/groundx/documents/view/${documentId}`;
          downloadUrl = `/api/groundx/documents/download/${documentId}`;
        }
        
        // Return complete source object with all information
        return {
          id: documentId,
          fileName,
          score,
          text,
          pageImages,
          metadata,
          narrative,
          keyPhrases,
          viewUrl,
          downloadUrl,
          // New excerpt fields
          extractedSections,
          fullExcerpt
        };
      })
    );

    // 4. Create formatted sources for the supporting content
    const enhancedResults = {
      totalResults: searchResponse.search.results.length,
      sources
    };
    
    // 5. Prepare enhanced context for LLM from search results
    const searchText = searchResponse.search.text || '';
    
    // Create more structured context with clearer source information
    let enhancedSearchText = `ORIGINAL SEARCH CONTEXT:\n${searchText}\n\nDETAILED DOCUMENT SOURCES:`;
    
    // Add document titles and page numbers to make sources clearer
    sources.forEach((source, index) => {
      enhancedSearchText += `\n\nDocument ${index + 1}: ${source.fileName || source.id || 'Unknown'}`;
      
      if (source.metadata?.page) {
        enhancedSearchText += ` (Page ${source.metadata.page})`;
      }
      
      if (source.metadata?.title) {
        enhancedSearchText += `\nTitle: ${source.metadata.title}`;
      }
      
      enhancedSearchText += `\nContent: ${source.text}`;
      
      if (source.keyPhrases && source.keyPhrases.length > 0) {
        enhancedSearchText += `\nKey sections: ${source.keyPhrases.join('; ')}`;
      }
    });
    
    // 6. Create system prompt with improved formatting
    let systemPrompt = `You are an AI assistant answering questions based on retrieved documents.
Base your answers only on the content provided below and avoid making assumptions.
If the documents don't contain relevant information, acknowledge that you don't have enough information.
Use citations when referencing specific information from the documents.

CONTEXT FROM DOCUMENTS:
${enhancedSearchText}

When responding:
1. Be concise and focus on information from the documents
2. Cite your sources using the format [Document Name]
3. If multiple documents provide the same information, cite all relevant sources
4. Only discuss information found in the documents
5. Format your response with clear sections, bullet points for lists, and bold text for important concepts
6. Present numerical data in tables when appropriate
7. If documents contradict each other, acknowledge the different perspectives`;

    // Add thought process instructions if requested with improved formatting guidance
    if (includeThoughts) {
      systemPrompt += `\n\nAdditionally, explain your thought process in the following format:
1. First, think about the key aspects of the question.
2. Identify the most relevant information from the documents.
3. Organize the information to formulate a clear response.
4. Provide citations for all facts from the documents.
5. Consider alternative interpretations if the documents contain ambiguous information.

Format your entire response as a JSON object with two fields:
{
  "answer": "Your complete answer with citations here",
  "thoughts": ["Step 1: ...", "Step 2: ...", "Step 3: ..."]
}`;
    }

    // 7. Prepare conversation history for OpenAI with type validation
    const conversationHistory: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt } as ChatCompletionSystemMessageParam
    ];
    
    // Include recent conversation history if provided with validation
    if (Array.isArray(messages) && messages.length > 0) {
      // Include up to 8 recent messages for more context (increased from 5)
      const recentMessages = messages.slice(-8, -1);
      
      // Only keep user, assistant, and system messages to avoid the name/tool_call_id requirements
      const filteredMessages = recentMessages.filter(msg => 
        msg && typeof msg === 'object' && 
        ['user', 'assistant', 'system'].includes(msg.role) &&
        typeof msg.content === 'string'
      );
      
      // Map messages to their appropriate types
      const typedMessages: ChatCompletionMessageParam[] = filteredMessages.map(msg => {
        if (msg.role === 'user') {
          return { role: 'user', content: msg.content } as ChatCompletionUserMessageParam;
        } else if (msg.role === 'assistant') {
          return { role: 'assistant', content: msg.content } as ChatCompletionAssistantMessageParam;
        } else {
          return { role: 'system', content: msg.content } as ChatCompletionSystemMessageParam;
        }
      });
      
      conversationHistory.push(...typedMessages);
    }
    
    // Add current query as user message
    conversationHistory.push({ 
      role: 'user', 
      content: query 
    } as ChatCompletionUserMessageParam);

    console.log('Sending to OpenAI with conversation history length:', conversationHistory.length);
    
    // 8. Generate response using OpenAI with configurable parameters
    const completion = await openai.chat.completions.create({
      model: "gpt-4-0125-preview",
      messages: conversationHistory,
      temperature: temperature, // Use configurable temperature
      max_tokens: maxTokens, // Use configurable max_tokens
      top_p: 0.95, // Slightly adjusted for better diversity with accuracy
    }).catch(error => {
      console.error('OpenAI API error:', error);
      throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    });

    // Validate OpenAI response
    if (!completion?.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI');
    }

    const response = completion.choices[0].message.content;
    
    // 9. Process the response to extract thoughts if needed
    let finalResponse = response;
    let thoughts: string[] | null = null;
    
    // Parse the response if it's JSON format with thoughts
    if (includeThoughts && response) {
      try {
        const jsonResponse = JSON.parse(response);
        if (jsonResponse?.answer && Array.isArray(jsonResponse?.thoughts)) {
          finalResponse = jsonResponse.answer;
          thoughts = jsonResponse.thoughts;
        }
      } catch (e) {
        console.warn('Failed to parse JSON response with thoughts', e);
        // Use the original response, and create a more detailed thought process
        thoughts = [
          "Analyzed the search results to find relevant information",
          "Identified key documents based on relevance scores",
          "Extracted important context from " + sources.length + " sources",
          "Recognized key sections and metadata in the documents",
          "Formulated a response based on document content",
          "Added citations to reference the source documents"
        ];
      }
    }
    
    // 10. Format content for the supporting content component with more detail
    const supportingContent = {
      text: sources.map(source => {
        let content = `${source.fileName || source.id || 'Unknown document'}`;
        
        if (source.metadata?.page) {
          content += ` (Page ${source.metadata.page})`;
        }
        
        if (source.metadata?.title) {
          content += `: ${source.metadata.title}`;
        }
        
        content += `\n${source.text}`;
        
        return content;
      })
    };
    
    // Create document excerpts array for easy access in the UI
    const documentExcerpts: DocumentExcerpt[] = sources.map(source => ({
      id: source.id || '',
      fileName: source.fileName || 'Unknown document',
      excerpts: source.extractedSections || [],
      narrative: source.narrative || [],
      metadata: source.metadata
    }));
    
    // 11. Return comprehensive response with all available data and timestamps
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      query: query,
      response: finalResponse,
      searchResults: {
        count: searchResponse.search.results.length,
        sources: sources.map(({ id, fileName, score }) => ({ id, fileName, score }))
      },
      thoughts,
      supportingContent,
      enhancedResults,
      // Include document excerpts in the response
      documentExcerpts,
      modelUsed: "gpt-4-0125-preview"
    } as RagResponse);
    
  } catch (error: any) {
    console.error('RAG API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        timestamp: new Date().toISOString(),
        query: error.query || '', 
        error: error.message || 'RAG processing failed',
        errorDetails: error instanceof Error ? {
          name: error.name,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        } : undefined,
        response: '',
        searchResults: { count: 0, sources: [] },
        supportingContent: { text: [] },
        enhancedResults: { totalResults: 0, sources: [] }
      } as RagResponse,
      { status: 500 }
    );
  }
}