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
    xrayUrl?: string; // We'll keep this to pass to the X-ray endpoint
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
      hasXray?: boolean; // Flag indicating X-ray data is available
    }>;
  };
  executionTime?: {
    totalMs: number;
    searchMs: number;
    llmMs: number;
  };
  error?: string;
}

// Initialize clients with error handling
let groundxClient: GroundXClient;
let openai: OpenAI;

// GroundX API base URL for direct URL construction if needed
const GROUNDX_BASE_URL = process.env.GROUNDX_BASE_URL || 'https://api.groundx.ai';

// Cache settings
const CACHE_ENABLED = process.env.DISABLE_CACHE !== 'true'; // Enable caching by default
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '3600', 10); // Default 1 hour in seconds
const DOC_CACHE_TTL = parseInt(process.env.DOC_CACHE_TTL || '86400', 10); // Default 24 hours for documents
const MAX_CACHE_ENTRIES = parseInt(process.env.MAX_CACHE_ENTRIES || '100', 10); // Max entries per cache

// Document cache - simple in-memory cache with size limits
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const documentCache: Record<string, CacheEntry<DocumentDetail>> = {};
const searchCache: Record<string, CacheEntry<any>> = {};

// Cache hit counters for analytics
let docCacheHits = 0;
let searchCacheHits = 0;

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
 * Helper function to get cached data or fetch and cache
 */
async function getCachedOrFetch<T>(
  cacheKey: string, 
  fetchFn: () => Promise<T>, 
  cache: Record<string, CacheEntry<T>>,
  ttl: number = CACHE_TTL,
  cacheHitCounter?: { increment: () => void }
): Promise<T> {
  if (CACHE_ENABLED && cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp) < ttl * 1000) {
    console.log(`Cache hit for ${cacheKey}`);
    
    // Increment cache hit counter if provided
    if (cacheHitCounter) {
      cacheHitCounter.increment();
    }
    
    return cache[cacheKey].data;
  }
  
  console.log(`Cache miss for ${cacheKey}, fetching data...`);
  const data = await fetchFn();
  
  if (CACHE_ENABLED) {
    // Store in cache
    safeCacheStore(cache, cacheKey, data);
    console.log(`Cached ${cacheKey}`);
  }
  
  return data;
}

/**
 * Helper to safely store in cache with size management
 */
function safeCacheStore<T>(cache: Record<string, CacheEntry<T>>, key: string, data: T): void {
  try {
    // Add to cache
    cache[key] = { 
      data, 
      timestamp: Date.now() 
    };
    
    // Manage cache size - remove oldest entries if needed
    const keys = Object.keys(cache);
    if (keys.length > MAX_CACHE_ENTRIES) {
      // Sort by timestamp (oldest first)
      const sortedKeys = keys.sort((a, b) => 
        cache[a].timestamp - cache[b].timestamp
      );
      
      // Remove oldest entries to stay under size limit
      const keysToRemove = sortedKeys.slice(0, keys.length - MAX_CACHE_ENTRIES);
      keysToRemove.forEach(k => delete cache[k]);
      
      console.log(`Cache size limit reached. Removed ${keysToRemove.length} oldest entries.`);
    }
  } catch (error) {
    console.error('Error storing in cache:', error);
    // If caching fails, just continue without caching
  }
}

/**
 * Helper to fetch with timeout
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

/**
 * Generate a cache key for search queries
 */
function getSearchCacheKey(bucketId: number, query: string, limit: number): string {
  return `search_${bucketId}_${query.toLowerCase().trim()}_${limit}`;
}

/**
 * Detect if request is from Safari (for response size optimization)
 */
function isSafariBrowser(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent') || '';
  return /^((?!chrome|android).)*safari/i.test(userAgent);
}

/**
 * POST handler for RAG API
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Performance tracking
  const startTime = Date.now();
  let searchTime = 0;
  let llmTime = 0;
  
  // Check if request is from Safari
  const isSafari = isSafariBrowser(request);
  
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
            llmMs: 0
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
            llmMs: 0
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
      skipCache = isSafari || false // Skip cache for Safari or if explicitly requested
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
      skipCache,
      isSafari
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
            llmMs: 0
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
            llmMs: 0
          }
        },
        { status: 400 }
      );
    }

    // 1. Search for content using GroundX (with caching) 
    const searchStartTime = Date.now();
    console.log(`Searching bucket ${bucketId} for: "${query}"`);
    
    const searchCacheKey = getSearchCacheKey(Number(bucketId), query, limit);
    
    // Check cache or perform search
    const searchResponse = !skipCache 
      ? await getCachedOrFetch(
          searchCacheKey,
          async () => groundxClient.search.content(
            Number(bucketId),
            {
              query: query,
              limit: limit,
              highlight: true // Request highlighted matches if supported
            }
          ),
          searchCache,
          CACHE_TTL,
          { increment: () => searchCacheHits++ }
        )
      : await groundxClient.search.content(
          Number(bucketId),
          {
            query: query,
            limit: limit,
            highlight: true
          }
        );
    
    // Track search execution time
    searchTime = Date.now() - searchStartTime;
    console.log(`Search completed in ${searchTime}ms${!skipCache && searchCache[searchCacheKey]?.timestamp === startTime ? ' (cache miss)' : (skipCache ? '' : ' (cache hit)')}`);

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
          llmMs: 0
        }
      } as RagResponse, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }

    // For Safari, limit results count to prevent performance issues
    const resultsToProcess = isSafari 
      ? searchResponse.search.results.slice(0, Math.min(5, searchResponse.search.results.length))
      : searchResponse.search.results;
    
    console.log(`Found ${searchResponse.search.results.length} results, processing ${resultsToProcess.length}`);
    
    // 3. Process search results without X-Ray data
    const enhancedResults = await Promise.all(
      resultsToProcess.map(async (result: SearchResultItem, index: number) => {
        // Default values for missing properties
        const documentId = result.documentId || '';
        const fileName = result.fileName || `Document ${documentId}`;
        const score = result.score || 0; 
        const text = result.text || result.suggestedText || '';
        let metadata = result.metadata || result.searchData || {};
        let highlights = result.highlight?.text || [];
        let pageImages: string[] = [];
        let thumbnails: string[] = [];
        let hasXray = false;
        
        console.log(`Processing search result ${index + 1}/${resultsToProcess.length}: ${fileName} (ID: ${documentId})`);
        
        // Only attempt to fetch details if we have a document ID
        if (documentId) {
          try {
            // Use caching for document details
            const cacheKey = `doc_${documentId}`;
            
            console.log(`Fetching details for document: ${documentId}${!skipCache && documentCache[cacheKey] ? ' (checking cache)' : ''}`);
            
            // Try to fetch document details (with caching)
            const docDetails = !skipCache 
              ? await getCachedOrFetch(
                  cacheKey,
                  async () => await groundxClient.documents.get(documentId) as DocumentDetail,
                  documentCache,
                  DOC_CACHE_TTL,
                  { increment: () => docCacheHits++ }
                )
              : await groundxClient.documents.get(documentId) as DocumentDetail;
            
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
              // For Safari, limit to fewer pages
              const pagesToProcess = isSafari 
                ? docDetails.document.pages.slice(0, 1) 
                : docDetails.document.pages;
                
              pageImages = pagesToProcess
                .filter(page => Boolean(page.imageUrl))
                .map(page => page.imageUrl as string);
                
              thumbnails = pagesToProcess
                .filter(page => Boolean(page.thumbnailUrl))
                .map(page => page.thumbnailUrl as string);
                
              console.log(`Found ${pageImages.length} images and ${thumbnails.length} thumbnails in response`);
            }
            
            // If no images found and not Safari, try constructing render URLs
            if (tryRenderImages && pageImages.length === 0 && docDetails?.document?.pages && !isSafari) {
              // Construct URLs without exposing API key in logs
              const possibleRenderUrls = [
                `${GROUNDX_BASE_URL}/documents/${documentId}/render`,
                `${GROUNDX_BASE_URL}/documents/${documentId}/pages/1/render`
              ];
              
              console.log(`No image URLs found in response. Trying constructed URLs.`);
              pageImages = [possibleRenderUrls[0]]; // Add first URL as a test
            }
            
            // Just check if X-ray data is available but don't fetch it
            hasXray = Boolean(docDetails?.document?.xrayUrl);
            
            if (hasXray) {
              console.log(`X-Ray data is available for document ${documentId}`);
            }
          } catch (err) {
            console.error(`Error fetching document details for ${documentId}:`, err);
          }
        }
        
        // Extract source URL if available
        if (result.sourceUrl) {
          metadata.sourceUrl = result.sourceUrl;
        }
        
        // For Safari, truncate text to improve performance
        const processedText = isSafari ? text.substring(0, 3000) + (text.length > 3000 ? '... (text truncated for performance)' : '') : text;
        
        return {
          id: documentId,
          fileName,
          score,
          text: processedText,
          metadata,
          highlights,
          pageImages,
          thumbnails,
          hasXray
        };
      })
    );

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
      
      // Add highlighted matches if available
      if (result.highlights && result.highlights.length > 0) {
        context += `Highlighted Matches:\n`;
        result.highlights.slice(0, 3).forEach(highlight => {
          context += `- ${highlight}\n`;
        });
        context += '\n';
      }
      
      // Add content - truncate for Safari
      const contentLimit = isSafari ? 2000 : 10000;
      const contentText = result.text.length > contentLimit 
        ? result.text.substring(0, contentLimit) + `... [text truncated, ${result.text.length - contentLimit} characters not shown]` 
        : result.text;
        
      context += `Content:\n${contentText}\n\n`;
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
      // Include up to 5 recent messages for context - fewer for Safari
      const maxMessages = isSafari ? 3 : 5;
      const recentMessages = messages.slice(-maxMessages);
      
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
    
    // For Safari, simplify the response significantly
    const processedSources = enhancedResults.map(({ id, fileName, text, metadata, highlights, pageImages, thumbnails, hasXray }) => {
      // For Safari, further limit response payload
      if (isSafari) {
        return { 
          id, 
          fileName, 
          text: text.substring(0, 1000) + (text.length > 1000 ? '...' : ''),
          metadata: { 
            title: metadata.title || '',
            hasImages: pageImages && pageImages.length > 0
          },
          pageImages: pageImages ? pageImages.slice(0, 1) : [], // Only include first image
          thumbnails: thumbnails ? thumbnails.slice(0, 1) : [], // Only include first thumbnail
          highlights: highlights ? highlights.slice(0, 2) : [], // Include just a couple of highlights
          hasXray
        };
      }
      
      // Normal response for other browsers
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
        hasXray
      };
    });
    
    // Final response with clearly structured sources
    const finalResponse = {
      success: true,
      timestamp: new Date().toISOString(),
      query: query,
      response: response,
      searchResults: {
        count: enhancedResults.length,
        sources: processedSources
      },
      executionTime: {
        totalMs: totalTime,
        searchMs: searchTime,
        llmMs: llmTime
      },
      cacheStats: CACHE_ENABLED && !skipCache ? {
        docCacheHits,
        searchCacheHits
      } : undefined,
      browserInfo: {
        isSafari,
        optimized: isSafari
      }
    };
    
    // Debug logging of final response structure
    console.log('Final response sources summary:', 
      finalResponse.searchResults.sources.map(s => ({
        id: s.id,
        fileName: s.fileName,
        pageImagesCount: s.pageImages?.length || 0,
        hasPageImages: Boolean(s.pageImages?.length),
        hasXray: s.hasXray
      }))
    );
    
    if (CACHE_ENABLED && !skipCache) {
      console.log('Cache stats:', { docCacheHits, searchCacheHits });
    }
    
    // Add CORS headers for better compatibility
    return NextResponse.json(finalResponse as RagResponse, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
    
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
          llmMs: 0
        }
      } as RagResponse,
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    );
  }
}

/**
 * OPTIONS handler for CORS and cache stats
 */
export async function OPTIONS(request: NextRequest): Promise<NextResponse> {
  // For CORS preflight requests
  if (request.headers.get('Access-Control-Request-Method')) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    });
  }
  
  // For cache stats requests
  if (!CACHE_ENABLED) {
    return NextResponse.json({
      success: true,
      cacheEnabled: false,
      message: 'Cache is disabled'
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  }
  
  const documentCacheCount = Object.keys(documentCache).length;
  const searchCacheCount = Object.keys(searchCache).length;
  
  return NextResponse.json({
    success: true,
    cacheEnabled: true,
    cacheStats: {
      documentCache: {
        entries: documentCacheCount,
        hits: docCacheHits,
      },
      searchCache: {
        entries: searchCacheCount,
        hits: searchCacheHits,
      },
      settings: {
        ttl: CACHE_TTL,
        docTtl: DOC_CACHE_TTL,
        maxCacheEntries: MAX_CACHE_ENTRIES
      }
    }
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}