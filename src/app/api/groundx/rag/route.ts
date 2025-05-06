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

// Cache settings
const CACHE_ENABLED = process.env.DISABLE_CACHE !== 'true'; // Enable caching by default
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '3600', 10); // Default 1 hour in seconds
const DOC_CACHE_TTL = parseInt(process.env.DOC_CACHE_TTL || '86400', 10); // Default 24 hours for documents
const XRAY_CACHE_TTL = parseInt(process.env.XRAY_CACHE_TTL || '43200', 10); // Default 12 hours for X-Ray data
const MAX_CACHE_ENTRIES = parseInt(process.env.MAX_CACHE_ENTRIES || '100', 10); // Max entries per cache

// Document cache - simple in-memory cache with size limits
// For production, replace with Redis or similar
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const documentCache: Record<string, CacheEntry<DocumentDetail>> = {};
const xrayCache: Record<string, CacheEntry<any>> = {};
const searchCache: Record<string, CacheEntry<any>> = {};

// Cache hit counters for analytics
let docCacheHits = 0;
let xrayCacheHits = 0;
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
  let xrayTime = 0;
  
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
      includeXray = true, // New flag to control whether to include X-Ray data
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
      includeXray,
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
          llmMs: 0,
          xrayMs: 0
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
    
    // 3. Process search results and fetch additional context including X-Ray data when needed
    const xrayStartTime = Date.now();
    const enhancedResults: EnhancedSearchResult[] = await Promise.all(
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
        let xrayData = undefined;
        
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
            
            // If includeXray is true and X-Ray URL is available and not Safari, fetch X-Ray data with caching
            if (includeXray && docDetails?.document?.xrayUrl && (!isSafari || index === 0)) {
              try {
                const xrayCacheKey = `xray_${documentId}`;
                
                // Use caching for X-Ray data
                xrayData = !skipCache
                  ? await getCachedOrFetch(
                      xrayCacheKey,
                      async () => {
                        console.log(`Fetching X-Ray data from: ${docDetails.document?.xrayUrl}`);
                        const xrayResponse = await fetchWithTimeout(docDetails.document?.xrayUrl as string, {}, 10000);
                        
                        if (xrayResponse.ok) {
                          const xrayResult: XRayResult = await xrayResponse.json();
                          
                          // Transform X-Ray data into a more usable format
                          return {
                            summary: xrayResult.fileSummary,
                            keywords: xrayResult.fileKeywords,
                            language: xrayResult.language,
                            chunks: isSafari ? [] : xrayResult.documentPages?.flatMap(page => 
                              page.chunks?.slice(0, 3).map(chunk => ({
                                id: chunk.chunk,
                                contentType: chunk.contentType,
                                text: chunk.text,
                                suggestedText: chunk.suggestedText,
                                sectionSummary: chunk.sectionSummary,
                                pageNumbers: chunk.pageNumbers
                              }))
                            ).filter(Boolean).slice(0, 5) // Limit chunks for better performance
                          };
                        } else {
                          console.error(`Failed to fetch X-Ray data: ${xrayResponse.status} ${xrayResponse.statusText}`);
                          return undefined;
                        }
                      },
                      xrayCache,
                      XRAY_CACHE_TTL,
                      { increment: () => xrayCacheHits++ }
                    )
                  : await (async () => {
                      console.log(`Fetching X-Ray data from: ${docDetails.document?.xrayUrl} (cache bypassed)`);
                      const xrayResponse = await fetchWithTimeout(docDetails.document?.xrayUrl as string, {}, 10000);
                      
                      if (xrayResponse.ok) {
                        const xrayResult: XRayResult = await xrayResponse.json();
                        
                        // Transform X-Ray data into a more usable format - simplified for Safari
                        return {
                          summary: xrayResult.fileSummary,
                          keywords: xrayResult.fileKeywords,
                          language: xrayResult.language,
                          chunks: isSafari ? [] : xrayResult.documentPages?.flatMap(page => 
                            page.chunks?.slice(0, 3).map(chunk => ({
                              id: chunk.chunk,
                              contentType: chunk.contentType,
                              text: chunk.text?.substring(0, 500), // Truncate for performance
                              suggestedText: chunk.suggestedText,
                              sectionSummary: chunk.sectionSummary,
                              pageNumbers: chunk.pageNumbers
                            }))
                          ).filter(Boolean).slice(0, 5)
                        };
                      }
                      return undefined;
                    })();
                
                if (xrayData) {
                  console.log(`X-Ray data successfully retrieved with ${xrayData.chunks?.length || 0} chunks`);
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
      
      // Add content - truncate for Safari
      const contentLimit = isSafari ? 2000 : 10000;
      const contentText = result.text.length > contentLimit 
        ? result.text.substring(0, contentLimit) + `... [text truncated, ${result.text.length - contentLimit} characters not shown]` 
        : result.text;
        
      context += `Content:\n${contentText}\n\n`;
      
      // Add section summaries from X-Ray if available and not Safari
      if (!isSafari && result.xray?.chunks) {
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
    const processedSources = enhancedResults.map(({ id, fileName, text, metadata, highlights, pageImages, thumbnails, xray }) => {
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
          xray: xray ? {
            summary: xray.summary,
            keywords: xray.keywords
            // No chunks for Safari
          } : undefined
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
        xray: xray
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
        llmMs: llmTime,
        xrayMs: xrayTime
      },
      cacheStats: CACHE_ENABLED && !skipCache ? {
        docCacheHits,
        xrayCacheHits,
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
        hasXray: Boolean(s.xray),
        xrayChunks: s.xray?.chunks?.length || 0
      }))
    );
    
    if (CACHE_ENABLED && !skipCache) {
      console.log('Cache stats:', { docCacheHits, xrayCacheHits, searchCacheHits });
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
          llmMs: 0,
          xrayMs: xrayTime
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
 * GET handler to test document rendering and X-Ray availability (with caching)
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const xray = searchParams.get('xray') === 'true';
    const skipCache = searchParams.get('skipCache') === 'true' || isSafariBrowser(request);
    
    if (!documentId) {
      return NextResponse.json({ error: 'documentId is required as a query parameter' }, { status: 400 });
    }
    
    if (!groundxClient) {
      return NextResponse.json({ error: 'GroundX client not initialized' }, { status: 500 });
    }
    
    console.log(`Testing document retrieval for ${documentId}, include X-Ray: ${xray}, skipCache: ${skipCache}`);
    
    // Get document details (with caching support)
    const cacheKey = `doc_${documentId}`;
    const docDetails = !skipCache 
      ? await getCachedOrFetch(
          cacheKey,
          async () => await groundxClient.documents.get(documentId) as DocumentDetail,
          documentCache,
          DOC_CACHE_TTL,
          { increment: () => docCacheHits++ }
        )
      : await groundxClient.documents.get(documentId) as DocumentDetail;
    
    // Log raw response for debugging
    console.log('Document details received:', 
      docDetails ? 'Successfully' : 'Failed - No details returned');
    
    // Extract any image URLs from response
    let responseImages: string[] = [];
    let responseThumbnails: string[] = [];
    
    if (docDetails?.document?.pages) {
      // Limit to first 3 pages for all browsers
      const limitedPages = docDetails.document.pages.slice(0, skipCache ? 1 : 3);
      
      responseImages = limitedPages
        .filter(page => Boolean(page.imageUrl))
        .map(page => page.imageUrl as string);
        
      responseThumbnails = limitedPages
        .filter(page => Boolean(page.thumbnailUrl))
        .map(page => page.thumbnailUrl as string);
    }
    
    // Check if X-Ray data is available and requested (with caching)
    let xrayData = null;
    if (xray && docDetails?.document?.xrayUrl && !skipCache) {
      try {
        const xrayCacheKey = `xray_${documentId}`;
        
        xrayData = !skipCache
          ? await getCachedOrFetch(
              xrayCacheKey,
              async () => {
                console.log(`Fetching X-Ray data from: ${docDetails.document?.xrayUrl}`);
                const xrayResponse = await fetchWithTimeout(docDetails.document?.xrayUrl as string, {}, 10000);
                
                if (xrayResponse.ok) {
                  return await xrayResponse.json();
                }
                return null;
              },
              xrayCache,
              XRAY_CACHE_TTL,
              { increment: () => xrayCacheHits++ }
            )
          : await (async () => {
              console.log(`Fetching X-Ray data from: ${docDetails.document?.xrayUrl} (cache bypassed)`);
              const xrayResponse = await fetchWithTimeout(docDetails.document?.xrayUrl as string, {}, 10000);
              
              if (xrayResponse.ok) {
                return await xrayResponse.json();
              }
              return null;
            })();
        
        if (xrayData) {
          console.log(`X-Ray data successfully retrieved`);
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
      hasXray: Boolean(docDetails?.document?.xrayUrl),
      xrayUrl: docDetails?.document?.xrayUrl,
      xrayData: xrayData && !skipCache ? {
        summary: xrayData.fileSummary,
        keywords: xrayData.fileKeywords,
        language: xrayData.language,
        chunkCount: xrayData.documentPages?.reduce((acc: number, page: any) => 
          acc + (page.chunks?.length || 0), 0) || 0
      } : null,
      cacheInfo: CACHE_ENABLED && !skipCache ? {
        fromCache: documentCache[cacheKey]?.timestamp < Date.now() - 1000,
        docCacheHits,
        xrayCacheHits
      } : undefined,
      browserInfo: {
        isSafari: skipCache,
        optimized: skipCache
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
    
  } catch (error: any) {
    console.error('Document test error:', error);
    return NextResponse.json({ 
      error: error.message || 'Unknown error',
      success: false
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
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
      timeoutMs = 60000, // Default timeout of 1 minute if waiting for completion
      invalidateCache = true // Whether to invalidate cache for this document
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
            fileType: fileType as any
          }]
        );
      } else if (fileContent) {
        // Base64 or raw content upload - use as any to bypass type check
        ingestResponse = await groundxClient.ingest(
          [{
            bucketId: bucketId.toString(),
            fileName: fileName || 'uploaded_document',
            fileContent: fileContent as any,
            fileType: fileType as any
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
            id: ingestResponse.ingest?.documentId as string || '',
          },
          processId: processId,
          message: 'Document upload initiated. X-Ray processing will be available once complete.'
        }, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
        });
      }
      
      // If waiting for completion, poll until complete or timeout
      console.log(`Waiting for X-Ray processing to complete (timeout: ${timeoutMs}ms)...`);
      
      const startWaitTime = Date.now();
      let documentId = ingestResponse.ingest?.documentId as string || '';
      let status = 'processing';
      
      // More efficient polling with increasing backoff
      let pollInterval = 1000; // Start with 1 second
      const maxPollInterval = 5000; // Max 5 seconds between polls
      
      while (status === 'processing' && (Date.now() - startWaitTime) < timeoutMs) {
        // Wait with adaptive polling interval
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
        // Increase poll interval with each attempt (capped at max)
        pollInterval = Math.min(pollInterval * 1.5, maxPollInterval);
        
        // Check processing status
        try {
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
          console.log(`Current processing status: ${status} (poll interval: ${pollInterval}ms)`);
          
          // If document ID wasn't provided initially, get it from the status
          const responseDocId = (statusResponse.ingest as any).documentId;
          if (!documentId && responseDocId) {
            documentId = responseDocId;
          }
          
          if (status === 'complete' || status === 'error') {
            break;
          }
        } catch (statusErr) {
          console.error('Error checking processing status:', statusErr);
          // Continue polling despite errors
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
        }, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
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
      
      // If invalidateCache is true, clear document and X-Ray cache entries for this document
      if (invalidateCache && CACHE_ENABLED) {
        const docCacheKey = `doc_${documentId}`;
        const xrayCacheKey = `xray_${documentId}`;
        
        if (documentCache[docCacheKey]) {
          delete documentCache[docCacheKey];
          console.log(`Invalidated document cache for ${documentId}`);
        }
        
        if (xrayCache[xrayCacheKey]) {
          delete xrayCache[xrayCacheKey];
          console.log(`Invalidated X-Ray cache for ${documentId}`);
        }
      }
      
      // If processing completed successfully, get the document details
      const docDetails = await groundxClient.documents.get(documentId) as DocumentDetail;
      
      // Always cache the fresh document details
      if (CACHE_ENABLED) {
        const docCacheKey = `doc_${documentId}`;
        safeCacheStore(documentCache, docCacheKey, docDetails);
        console.log(`Added fresh document details to cache for ${documentId}`);
      }
      
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
        },
        cacheInvalidated: invalidateCache && CACHE_ENABLED
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
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
  } catch (error: any) {
    console.error('Unhandled error in PUT handler:', error);
    return NextResponse.json(
      { 
        success: false, 
        timestamp: new Date().toISOString(),
        error: `Unhandled error: ${error.message || 'Unknown error'}`
      },
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
 * DELETE handler to manually clear cache
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('target') || 'all';
    const documentId = searchParams.get('documentId');
    
    if (target === 'document' && !documentId) {
      return NextResponse.json({ 
        error: 'documentId is required when target is "document"',
        success: false 
      }, { status: 400 });
    }
    
    if (!CACHE_ENABLED) {
      return NextResponse.json({ 
        success: false,
        error: 'Cache is disabled'
      }, { status: 400 });
    }
    
    // Clear specific document cache
    if (target === 'document' && documentId) {
      const docCacheKey = `doc_${documentId}`;
      const xrayCacheKey = `xray_${documentId}`;
      let cleared = false;
      
      if (documentCache[docCacheKey]) {
        delete documentCache[docCacheKey];
        cleared = true;
      }
      
      if (xrayCache[xrayCacheKey]) {
        delete xrayCache[xrayCacheKey];
        cleared = true;
      }
      
      return NextResponse.json({
        success: true,
        message: cleared 
          ? `Cache entries for document ${documentId} have been cleared` 
          : `No cache entries found for document ${documentId}`
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }
    
    // Clear document cache
    if (target === 'documents') {
      const count = Object.keys(documentCache).length;
      for (const key in documentCache) {
        delete documentCache[key];
      }
      return NextResponse.json({
        success: true,
        message: `Cleared ${count} document cache entries`
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }
    
    // Clear X-Ray cache
    if (target === 'xray') {
      const count = Object.keys(xrayCache).length;
      for (const key in xrayCache) {
        delete xrayCache[key];
      }
      return NextResponse.json({
        success: true,
        message: `Cleared ${count} X-Ray cache entries`
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }
    
    // Clear search cache
    if (target === 'search') {
      const count = Object.keys(searchCache).length;
      for (const key in searchCache) {
        delete searchCache[key];
      }
      return NextResponse.json({
        success: true, 
        message: `Cleared ${count} search cache entries`
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }
    
    // Clear all caches
    if (target === 'all') {
      const docCount = Object.keys(documentCache).length;
      const xrayCount = Object.keys(xrayCache).length;
      const searchCount = Object.keys(searchCache).length;
      
      for (const key in documentCache) delete documentCache[key];
      for (const key in xrayCache) delete xrayCache[key];
      for (const key in searchCache) delete searchCache[key];
      
      // Reset counters
      docCacheHits = 0;
      xrayCacheHits = 0;
      searchCacheHits = 0;
      
      return NextResponse.json({
        success: true,
        message: `Cleared all caches: ${docCount} document entries, ${xrayCount} X-Ray entries, ${searchCount} search entries`
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }
    
    return NextResponse.json({ 
      success: false,
      error: 'Invalid target. Use "document", "documents", "xray", "search", or "all"'
    }, { 
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
    
  } catch (error: any) {
    console.error('Cache clearing error:', error);
    return NextResponse.json({ 
      error: error.message || 'Unknown error',
      success: false
    }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
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
  const xrayCacheCount = Object.keys(xrayCache).length;
  const searchCacheCount = Object.keys(searchCache).length;
  
  return NextResponse.json({
    success: true,
    cacheEnabled: true,
    cacheStats: {
      documentCache: {
        entries: documentCacheCount,
        hits: docCacheHits,
      },
      xrayCache: {
        entries: xrayCacheCount,
        hits: xrayCacheHits,
      },
      searchCache: {
        entries: searchCacheCount,
        hits: searchCacheHits,
      },
      settings: {
        ttl: CACHE_TTL,
        docTtl: DOC_CACHE_TTL,
        xrayTtl: XRAY_CACHE_TTL,
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