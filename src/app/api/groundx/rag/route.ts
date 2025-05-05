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
 * Basic interfaces for GroundX API interaction
 */
interface SearchResultItem {
  documentId?: string;
  fileName?: string;
  score?: number;
  text?: string;
  metadata?: Record<string, any>;
  highlight?: {
    text?: string[];
  };
  searchData?: Record<string, any>;
  sourceUrl?: string;
  suggestedText?: string;
}

interface DocumentDetail {
  document?: {
    pages?: Array<{
      pageNumber: number;
      imageUrl?: string;
      thumbnailUrl?: string;
    }>;
    metadata?: Record<string, any>;
    title?: string;
    fileName?: string;
    content?: string;
    mimeType?: string;
    xrayUrl?: string; // Added for X-Ray support
  };
}

/**
 * X-Ray result interface based on GroundX documentation
 */
interface XRayResult {
  fileType?: string;
  language?: string;
  fileKeywords?: string;
  fileName?: string;
  fileSummary?: string;
  documentPages?: Array<{
    chunks?: Array<{
      boundingBoxes?: Array<{
        bottomRightX: number;
        bottomRightY: number;
        pageNumber: number;
        topLeftX: number;
        topLeftY: number;
      }>;
      chunk: number;
      contentType?: string[];
      json?: any[];
      multimodalUrl?: string;
      narrative?: string[];
      pageNumbers?: number[];
      sectionSummary?: string;
      suggestedText?: string;
      text?: string;
    }>;
    height?: number;
    pageNumber: number;
    pageUrl?: string;
    width?: number;
  }>;
  sourceUrl?: string;
}

/**
 * Enhanced search result with X-Ray data
 */
interface EnhancedSearchResult {
  id: string;
  fileName: string;
  score?: number;
  text: string;
  metadata: Record<string, any>;
  highlights: string[];
  pageImages: string[];
  thumbnails: string[];
  xray?: {
    summary?: string;
    keywords?: string;
    language?: string;
    chunks?: Array<{
      id: number;
      contentType?: string[];
      text?: string;
      suggestedText?: string;
      sectionSummary?: string;
      pageNumbers?: number[];
    }>;
  };
}

/**
 * Clean response interface with only essential fields
 */
interface RagResponse {
  success: boolean;
  timestamp: string;
  query?: string;
  response: string;
  searchResults: {
    count: number;
    sources: Array<{
      id?: string;
      fileName?: string;
      text?: string;
      metadata?: Record<string, any>;
      pageImages?: string[]; // Array of document page image URLs
      thumbnails?: string[]; // Array of document thumbnail URLs
      highlights?: string[]; // Highlighted matches from search
      xray?: {
        summary?: string;
        keywords?: string;
        language?: string;
        chunks?: Array<{
          id: number;
          contentType?: string[];
          text?: string;
          suggestedText?: string;
          sectionSummary?: string;
          pageNumbers?: number[];
        }>;
      };
    }>;
  };
  executionTime?: {
    totalMs: number;
    searchMs: number;
    llmMs: number;
    xrayMs: number; // Added for X-Ray processing time
  };
  error?: string;
}

// Initialize clients with error handling
let groundxClient: GroundXClient;
let openai: OpenAI;

// GroundX API base URL for direct URL construction if needed
const GROUNDX_BASE_URL = process.env.GROUNDX_BASE_URL || 'https://api.groundx.ai';

try {
  groundxClient = new GroundXClient({
    apiKey: process.env.GROUNDX_API_KEY || '',
    baseUrl: GROUNDX_BASE_URL
  });

  openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_KEY || '',
  });
} catch (error) {
  console.error('Error initializing API clients:', error);
}

/**
 * POST handler for RAG API
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Performance tracking
  const startTime = Date.now();
  let searchTime = 0;
  let llmTime = 0;
  let xrayTime = 0;
  
  try {
    // Validate API clients
    if (!groundxClient || !openai) {
      return NextResponse.json(
        { 
          success: false, 
          timestamp: new Date().toISOString(),
          error: 'API clients not properly initialized',
          response: '',
          searchResults: { count: 0, sources: [] },
          executionTime: {
            totalMs: Date.now() - startTime,
            searchMs: 0,
            llmMs: 0,
            xrayMs: 0
          }
        },
        { status: 500 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { 
          success: false, 
          timestamp: new Date().toISOString(),
          error: 'Invalid JSON in request body',
          response: '',
          searchResults: { count: 0, sources: [] },
          executionTime: {
            totalMs: Date.now() - startTime,
            searchMs: 0,
            llmMs: 0,
            xrayMs: 0
          }
        },
        { status: 400 }
      );
    }
    
    const { 
      query, 
      bucketId, 
      messages = [], 
      limit = 10,
      maxTokens = 2000,
      temperature = 0.3,
      model = "gpt-4-0125-preview",
      tryRenderImages = true, // Flag to control whether to try document rendering
      includeXray = true // New flag to control whether to include X-Ray data
    } = body;
    
    console.log('RAG API request:', { 
      query, 
      bucketId, 
      messageCount: messages?.length, 
      limit,
      maxTokens,
      temperature,
      model,
      tryRenderImages,
      includeXray
    });
    
    // Validate required fields
    if (!query) {
      return NextResponse.json(
        { 
          success: false, 
          timestamp: new Date().toISOString(),
          error: 'Query is required',
          response: '',
          searchResults: { count: 0, sources: [] },
          executionTime: {
            totalMs: Date.now() - startTime,
            searchMs: 0,
            llmMs: 0,
            xrayMs: 0
          }
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
          executionTime: {
            totalMs: Date.now() - startTime,
            searchMs: 0,
            llmMs: 0,
            xrayMs: 0
          }
        },
        { status: 400 }
      );
    }

    // 1. Search for content using GroundX 
    const searchStartTime = Date.now();
    console.log(`Searching bucket ${bucketId} for: "${query}"`);
    
    const searchResponse = await groundxClient.search.content(
      Number(bucketId),
      {
        query: query,
        limit: limit,
        highlight: true // Request highlighted matches if supported
      }
    );
    
    // Track search execution time
    searchTime = Date.now() - searchStartTime;
    console.log(`Search completed in ${searchTime}ms`);

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
        executionTime: {
          totalMs: Date.now() - startTime,
          searchMs: searchTime,
          llmMs: 0,
          xrayMs: 0
        }
      } as RagResponse);
    }

    console.log(`Found ${searchResponse.search.results.length} results`);
    
    // 3. Process search results and fetch additional context including X-Ray data when needed
    const xrayStartTime = Date.now();
    const enhancedResults: EnhancedSearchResult[] = await Promise.all(
      searchResponse.search.results.map(async (result: SearchResultItem, index: number) => {
        // Default values for missing properties
        const documentId = result.documentId || '';
        const fileName = result.fileName || `Document ${documentId}`;
        const score = result.score || 0; 
        const text = result.text || result.suggestedText || '';
        let metadata = result.metadata || result.searchData || {};
        let highlights = result.highlight?.text || [];
        let pageImages: string[] = [];
        let thumbnails: string[] = [];
        let xrayData = undefined;
        
        console.log(`Processing search result ${index + 1}/${searchResponse.search.results.length}: ${fileName} (ID: ${documentId})`);
        
        // Only attempt to fetch details if we have a document ID
        if (documentId) {
          try {
            console.log(`Fetching details for document: ${documentId}`);
            
            // Try to fetch document details
            const docDetails = await groundxClient.documents.get(documentId) as DocumentDetail;
            
            // Log document details for debugging
            console.log('Document details received for:', documentId, 
              docDetails ? 'Successfully' : 'Failed - No details returned');
            
            // Add document title and metadata if available
            if (docDetails?.document?.title) {
              metadata.title = docDetails.document.title;
            }
            
            if (docDetails?.document?.metadata) {
              metadata = { ...metadata, ...docDetails.document.metadata };
            }
            
            // Extract page images if available in response
            if (tryRenderImages && docDetails?.document?.pages) {
              pageImages = docDetails.document.pages
                .filter(page => Boolean(page.imageUrl))
                .map(page => page.imageUrl as string);
                
              thumbnails = docDetails.document.pages
                .filter(page => Boolean(page.thumbnailUrl))
                .map(page => page.thumbnailUrl as string);
                
              console.log(`Found ${pageImages.length} images and ${thumbnails.length} thumbnails in response`);
            }
            
            // If no images found, try constructing render URLs
            if (tryRenderImages && pageImages.length === 0 && docDetails?.document?.pages) {
              const apiKey = process.env.GROUNDX_API_KEY || '';
              const pageCount = docDetails.document.pages.length;
              
              // Try constructing direct render URLs as a fallback
              const possibleRenderUrls = [
                `${GROUNDX_BASE_URL}/documents/${documentId}/render?apiKey=${apiKey}`,
                `${GROUNDX_BASE_URL}/documents/${documentId}/pages/1/render?apiKey=${apiKey}`
              ];
              
              console.log(`No image URLs found in response. Trying constructed URLs: ${possibleRenderUrls.join(', ')}`);
              pageImages = [possibleRenderUrls[0]]; // Add first URL as a test
            }
            
            // If includeXray is true and X-Ray URL is available, fetch X-Ray data
            if (includeXray && docDetails?.document?.xrayUrl) {
              try {
                console.log(`Fetching X-Ray data from: ${docDetails.document.xrayUrl}`);
                const xrayResponse = await fetch(docDetails.document.xrayUrl);
                
                if (xrayResponse.ok) {
                  const xrayResult: XRayResult = await xrayResponse.json();
                  
                  // Transform X-Ray data into a more usable format
                  xrayData = {
                    summary: xrayResult.fileSummary,
                    keywords: xrayResult.fileKeywords,
                    language: xrayResult.language,
                    chunks: xrayResult.documentPages?.flatMap(page => 
                      page.chunks?.map(chunk => ({
                        id: chunk.chunk,
                        contentType: chunk.contentType,
                        text: chunk.text,
                        suggestedText: chunk.suggestedText,
                        sectionSummary: chunk.sectionSummary,
                        pageNumbers: chunk.pageNumbers
                      }))
                    ).filter(Boolean)
                  };
                  
                  console.log(`X-Ray data successfully retrieved with ${xrayData.chunks?.length || 0} chunks`);
                } else {
                  console.error(`Failed to fetch X-Ray data: ${xrayResponse.status} ${xrayResponse.statusText}`);
                }
              } catch (xrayErr) {
                console.error(`Error processing X-Ray data:`, xrayErr);
              }
            }
          } catch (err) {
            console.error(`Error fetching document details for ${documentId}:`, err);
          }
        }
        
        // Extract source URL if available
        if (result.sourceUrl) {
          metadata.sourceUrl = result.sourceUrl;
        }
        
        return {
          id: documentId,
          fileName,
          score,
          text,
          metadata,
          highlights,
          pageImages,
          thumbnails,
          xray: xrayData
        };
      })
    );
    
    // Track X-Ray processing time
    xrayTime = Date.now() - xrayStartTime;
    console.log(`X-Ray processing completed in ${xrayTime}ms`);

    // 4. Prepare context for LLM from search results
    let context = `# Search Results for Query: "${query}"\n\n`;
    
    enhancedResults.forEach((result, index) => {
      context += `## Document ${index + 1}: ${result.fileName}\n`;
      
      if (result.metadata?.title) {
        context += `Title: ${result.metadata.title}\n`;
      }
      
      if (result.metadata?.page) {
        context += `Page: ${result.metadata.page}\n`;
      }
      
      // Add document ID for reference
      context += `Document ID: ${result.id}\n\n`;
      
      // Add X-Ray summary if available
      if (result.xray?.summary) {
        context += `Document Summary: ${result.xray.summary}\n\n`;
      }
      
      // Add X-Ray keywords if available
      if (result.xray?.keywords) {
        context += `Keywords: ${result.xray.keywords}\n\n`;
      }
      
      // Add highlighted matches if available
      if (result.highlights && result.highlights.length > 0) {
        context += `Highlighted Matches:\n`;
        result.highlights.slice(0, 3).forEach(highlight => {
          context += `- ${highlight}\n`;
        });
        context += '\n';
      }
      
      // Add content
      context += `Content:\n${result.text}\n\n`;
      
      // Add section summaries from X-Ray if available
      if (result.xray?.chunks) {
        const sectionSummaries = result.xray.chunks
          .filter(chunk => chunk.sectionSummary)
          .map(chunk => chunk.sectionSummary);
          
        if (sectionSummaries.length > 0) {
          context += `Section Summaries:\n`;
          sectionSummaries.slice(0, 3).forEach((summary, idx) => {
            context += `- Section ${idx + 1}: ${summary}\n`;
          });
          context += '\n';
        }
      }
      
      context += '---\n\n';
    });
    
    // 5. Create system prompt
    const systemPrompt = `You are an AI assistant answering questions based on retrieved documents.
Base your answers only on the content provided below and avoid making assumptions.
If the documents don't contain relevant information, acknowledge that you don't have enough information.

Use citations when referencing specific information from the documents.
Citation format: [Document Name, Page X] or simply [Document Name] if page is not available.

CONTEXT FROM DOCUMENTS:
${context}

When responding:
1. Be concise and direct, focusing only on information from the documents
2. Cite your sources using the format shown above
3. If multiple documents provide the same information, cite the most relevant sources
4. Only discuss information found in the documents
5. Present information in clear sections with proper formatting
6. If documents contradict each other, acknowledge the different perspectives`;

    // 6. Prepare conversation history for OpenAI
    const conversationHistory: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt } as ChatCompletionSystemMessageParam
    ];
    
    // Include recent conversation history if provided
    if (Array.isArray(messages) && messages.length > 0) {
      // Include up to 5 recent messages for context
      const recentMessages = messages.slice(-5);
      
      const filteredMessages = recentMessages.filter(msg => 
        msg && typeof msg === 'object' && 
        ['user', 'assistant', 'system'].includes(msg.role) &&
        typeof msg.content === 'string'
      );
      
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
    
    // 7. Generate response using OpenAI
    const llmStartTime = Date.now();
    const completion = await openai.chat.completions.create({
      model: model,
      messages: conversationHistory,
      temperature: temperature,
      max_tokens: maxTokens,
    }).catch(error => {
      console.error('OpenAI API error:', error);
      throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    });
    llmTime = Date.now() - llmStartTime;
    console.log(`LLM processing completed in ${llmTime}ms`);

    // Validate OpenAI response
    if (!completion?.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI');
    }

    const response = completion.choices[0].message.content;
    
    // 8. Return clean response
    const totalTime = Date.now() - startTime;
    
    // Final response with clearly structured sources
    const finalResponse = {
      success: true,
      timestamp: new Date().toISOString(),
      query: query,
      response: response,
      searchResults: {
        count: enhancedResults.length,
        sources: enhancedResults.map(({ id, fileName, text, metadata, highlights, pageImages, thumbnails, xray }) => {
          return { 
            id, 
            fileName, 
            text, 
            metadata: { 
              ...metadata, 
              hasImages: pageImages && pageImages.length > 0,
              pageCount: pageImages?.length || 0
            },
            pageImages: pageImages || [], 
            thumbnails: thumbnails || [],
            highlights: highlights || [],
            xray: xray
          };
        })
      },
      executionTime: {
        totalMs: totalTime,
        searchMs: searchTime,
        llmMs: llmTime,
        xrayMs: xrayTime
      }
    };
    
    // Debug logging of final response structure
    console.log('Final response sources summary:', 
      finalResponse.searchResults.sources.map(s => ({
        id: s.id,
        fileName: s.fileName,
        pageImagesCount: s.pageImages?.length || 0,
        hasPageImages: Boolean(s.pageImages?.length),
        hasXray: Boolean(s.xray),
        xrayChunks: s.xray?.chunks?.length || 0
      }))
    );
    
    return NextResponse.json(finalResponse as RagResponse);
    
  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    console.error('RAG API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        timestamp: new Date().toISOString(),
        error: error.message || 'RAG processing failed',
        response: '',
        searchResults: { count: 0, sources: [] },
        executionTime: {
          totalMs: totalTime,
          searchMs: searchTime,
          llmMs: 0,
          xrayMs: xrayTime
        }
      } as RagResponse,
      { status: 500 }
    );
  }
}

/**
 * GET handler to test document rendering and X-Ray availability
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const xray = searchParams.get('xray') === 'true';
    
    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required as a query parameter' }, { status: 400 });
    }
    
    if (!groundxClient) {
      return NextResponse.json({ error: 'GroundX client not initialized' }, { status: 500 });
    }
    
    console.log(`Testing document retrieval for ${documentId}, include X-Ray: ${xray}`);
    
    // Get document details
    const docDetails = await groundxClient.documents.get(documentId) as DocumentDetail;
    
    // Log raw response for debugging
    console.log('Raw document details:', JSON.stringify(docDetails, null, 2));
    
    // Extract any image URLs from response
    let responseImages: string[] = [];
    let responseThumbnails: string[] = [];
    
    if (docDetails?.document?.pages) {
      responseImages = docDetails.document.pages
        .filter(page => Boolean(page.imageUrl))
        .map(page => page.imageUrl as string);
        
      responseThumbnails = docDetails.document.pages
        .filter(page => Boolean(page.thumbnailUrl))
        .map(page => page.thumbnailUrl as string);
    }
    
    // Try some potential render URL patterns as a test
    const apiKey = process.env.GROUNDX_API_KEY || '';
    const testRenderUrls = [
      `${GROUNDX_BASE_URL}/documents/${documentId}/render?apiKey=${apiKey}`,
      `${GROUNDX_BASE_URL}/documents/${documentId}/preview?apiKey=${apiKey}`,
      `${GROUNDX_BASE_URL}/documents/${documentId}/pages/1/render?apiKey=${apiKey}`,
      `${GROUNDX_BASE_URL}/documents/${documentId}/pages/1/image?apiKey=${apiKey}`,
      `${GROUNDX_BASE_URL}/documents/${documentId}/thumbnail?apiKey=${apiKey}`
    ];
    
    // Check if X-Ray data is available and requested
    let xrayData = null;
    if (xray && docDetails?.document?.xrayUrl) {
      try {
        console.log(`Fetching X-Ray data from: ${docDetails.document.xrayUrl}`);
        const xrayResponse = await fetch(docDetails.document.xrayUrl);
        
        if (xrayResponse.ok) {
          xrayData = await xrayResponse.json();
          console.log(`X-Ray data successfully retrieved`);
        } else {
          console.error(`Failed to fetch X-Ray data: ${xrayResponse.status} ${xrayResponse.statusText}`);
        }
      } catch (err) {
        console.error(`Error fetching X-Ray data:`, err);
      }
    }
    
    return NextResponse.json({
      success: true,
      documentId,
      fileName: docDetails?.document?.fileName || 'Unknown',
      mimeType: docDetails?.document?.mimeType || 'Unknown',
      pageCount: docDetails?.document?.pages?.length || 0,
      responseImages: responseImages,
      responseThumbnails: responseThumbnails,
      testRenderUrls: testRenderUrls,
      hasXray: Boolean(docDetails?.document?.xrayUrl),
      xrayUrl: docDetails?.document?.xrayUrl,
      xrayData: xrayData ? {
        summary: xrayData.fileSummary,
        keywords: xrayData.fileKeywords,
        language: xrayData.language,
        chunkCount: xrayData.documentPages?.reduce((acc, page) => acc + (page.chunks?.length || 0), 0) || 0
      } : null
    });
    
  } catch (error: any) {
    console.error('Document test error:', error);
    return NextResponse.json({ 
      error: error.message || 'Unknown error',
      success: false
    }, { status: 500 });
  }
}

/**
 * PUT handler to upload a document and trigger X-Ray processing
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    // Validate API client
    if (!groundxClient) {
      return NextResponse.json(
        { 
          success: false, 
          timestamp: new Date().toISOString(),
          error: 'GroundX client not properly initialized'
        },
        { status: 500 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { 
          success: false, 
          timestamp: new Date().toISOString(),
          error: 'Invalid JSON in request body'
        },
        { status: 400 }
      );
    }
    
    const { 
      bucketId,
      fileName,
      filePath,
      fileContent,
      fileType = 'pdf',
      waitForCompletion = false,
      timeoutMs = 60000 // Default timeout of 1 minute if waiting for completion
    } = body;
    
    // Validate request
    if (!bucketId) {
      return NextResponse.json(
        { 
          success: false, 
          timestamp: new Date().toISOString(),
          error: 'bucketId is required'
        },
        { status: 400 }
      );
    }
    
    if (!fileName && !filePath && !fileContent) {
      return NextResponse.json(
        { 
          success: false, 
          timestamp: new Date().toISOString(),
          error: 'Either fileName+filePath or fileContent is required for document upload'
        },
        { status: 400 }
      );
    }
    
    try {
      console.log(`Uploading document to bucket ${bucketId} for X-Ray processing`);
      
      let ingestResponse;
      
      // Handle file upload based on provided parameters
      if (filePath && fileName) {
        // Local file upload
        ingestResponse = await groundxClient.ingest(
          [{
            bucketId: bucketId.toString(),
            fileName: fileName,
            filePath: filePath,
            fileType: fileType
          }]
        );
      } else if (fileContent) {
        // Base64 or raw content upload
        ingestResponse = await groundxClient.ingest(
          [{
            bucketId: bucketId.toString(),
            fileName: fileName || 'uploaded_document',
            fileContent: fileContent,
            fileType: fileType
          }]
        );
      } else {
        return NextResponse.json(
          { 
            success: false, 
            timestamp: new Date().toISOString(),
            error: 'Invalid file upload parameters'
          },
          { status: 400 }
        );
      }
      
      if (!ingestResponse?.ingest?.processId) {
        return NextResponse.json(
          { 
            success: false, 
            timestamp: new Date().toISOString(),
            error: 'Failed to initiate document processing'
          },
          { status: 500 }
        );
      }
      
      const processId = ingestResponse.ingest.processId;
      console.log(`Document upload initiated with process ID: ${processId}`);
      
      // If not waiting for completion, return the process ID
      if (!waitForCompletion) {
        return NextResponse.json({
          success: true,
          timestamp: new Date().toISOString(),
          status: 'processing',
          document: {
            id: ingestResponse.ingest.documentId,
          },
          processId: processId,
          message: 'Document upload initiated. X-Ray processing will be available once complete.'
        });
      }
      
      // If waiting for completion, poll until complete or timeout
      console.log(`Waiting for X-Ray processing to complete (timeout: ${timeoutMs}ms)...`);
      
      const startWaitTime = Date.now();
      let documentId = ingestResponse.ingest.documentId;
      let status = 'processing';
      
      while (status === 'processing' && (Date.now() - startWaitTime) < timeoutMs) {
        // Wait 3 seconds between polls
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check processing status
        const statusResponse = await groundxClient.documents.getProcessingStatusById(processId);
        
        if (!statusResponse?.ingest?.status) {
          return NextResponse.json(
            { 
              success: false, 
              timestamp: new Date().toISOString(),
              error: 'Failed to retrieve processing status'
            },
            { status: 500 }
          );
        }
        
        status = statusResponse.ingest.status;
        console.log(`Current processing status: ${status}`);
        
        // If document ID wasn't provided initially, get it from the status
        if (!documentId && statusResponse.ingest.documentId) {
          documentId = statusResponse.ingest.documentId;
        }
        
        if (status === 'complete' || status === 'error') {
          break;
        }
      }
      
      // Check if processing timed out
      if (status === 'processing') {
        return NextResponse.json({
          success: true,
          timestamp: new Date().toISOString(),
          status: 'processing',
          document: {
            id: documentId,
          },
          processId: processId,
          message: 'Processing timeout - X-Ray parsing is still in progress'
        });
      }
      
      // If processing completed with error
      if (status === 'error') {
        return NextResponse.json(
          { 
            success: false, 
            timestamp: new Date().toISOString(),
            status: 'error',
            document: {
              id: documentId,
            },
            processId: processId,
            error: 'X-Ray processing failed'
          },
          { status: 500 }
        );
      }
      
      // If processing completed successfully, get the document details
      const docDetails = await groundxClient.documents.get(documentId) as DocumentDetail;
      
      return NextResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        status: 'complete',
        document: {
          id: documentId,
          fileName: docDetails?.document?.fileName || fileName || 'uploaded_document',
          fileType: fileType,
          hasXray: Boolean(docDetails?.document?.xrayUrl),
          xrayUrl: docDetails?.document?.xrayUrl
        },
        processId: processId,
        message: 'Document uploaded and X-Ray processing completed successfully',
        executionTime: {
          totalMs: Date.now() - startTime
        }
      });
      
    } catch (error: any) {
      console.error('Error during document upload or processing:', error);
      return NextResponse.json(
        { 
          success: false, 
          timestamp: new Date().toISOString(),
          error: `Document processing failed: ${error.message || 'Unknown error'}`
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Unhandled error in PUT handler:', error);
    return NextResponse.json(
      { 
        success: false, 
        timestamp: new Date().toISOString(),
        error: `Unhandled error: ${error.message || 'Unknown error'}`
      },
      { status: 500 }
    );
  }
}