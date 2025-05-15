// app/api/groundx/rag/route.ts - MODIFIED TO REMOVE SAFARI LIMITATIONS
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
  relevanceScore?: number; // Add alternative score property
  rankingScore?: number;   // Add another possible score property
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
  thoughts?: string; // Added field for AI reasoning process
  searchResults: {
    count: number;
    sources: Array<{
      id?: string;
      fileName?: string;
      text?: string;
      metadata?: Record<string, any>;
      sourceUrl?: string; 
      score?: number;       // Explicitly include score in response
      rawScore?: number;    // Include raw score for debugging
      scoreSource?: string; // Track where the score came from
      highlights?: string[]; 
      hasXray?: boolean; 
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
 * Generate a cache key for search queries
 */
function getSearchCacheKey(bucketId: number, query: string, limit: number): string {
  return `search_${bucketId}_${query.toLowerCase().trim()}_${limit}`;
}

/**
 * Extract the best available score from a search result
 * This function tries multiple potential score properties and returns the best one
 */
function extractBestScore(result: SearchResultItem): { score: number, source: string } {
  // Log all potential score fields for debugging
  console.log('Score fields for document:', {
    primaryScore: result.score,
    relevanceScore: result.relevanceScore,
    rankingScore: result.rankingScore,
    metadataScore: result.metadata?.score,
    searchDataScore: result.searchData?.score
  });
  
  // Try different possible score locations in order of preference
  if (typeof result.score === 'number' && result.score > 0) {
    return { score: result.score, source: 'primary' };
  }
  
  if (typeof result.relevanceScore === 'number' && result.relevanceScore > 0) {
    return { score: result.relevanceScore, source: 'relevance' };
  }
  
  if (typeof result.rankingScore === 'number' && result.rankingScore > 0) {
    return { score: result.rankingScore, source: 'ranking' };
  }
  
  if (result.metadata && typeof result.metadata.score === 'number' && result.metadata.score > 0) {
    return { score: result.metadata.score, source: 'metadata' };
  }
  
  if (result.searchData && typeof result.searchData.score === 'number' && result.searchData.score > 0) {
    return { score: result.searchData.score, source: 'searchData' };
  }
  
  // If no valid score found, calculate a normalized position score
  return { score: 0, source: 'default' };
}

/**
 * POST handler for RAG API
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Performance tracking
  const startTime = Date.now();
  let searchTime = 0;
  let llmTime = 0;
  
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
      skipCache = false, // Skip cache if explicitly requested
      includeThoughts = true // New parameter to control thoughts output
    } = body;
    
    console.log('RAG API request:', { 
      query, 
      bucketId, 
      messageCount: messages?.length, 
      limit,
      maxTokens,
      temperature,
      model,
      skipCache,
      includeThoughts
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
    
    // Log the raw search response structure for debugging
    console.log('Raw search response structure:', JSON.stringify({
      hasResults: Boolean(searchResponse?.search?.results),
      resultCount: searchResponse?.search?.results?.length || 0,
      sampleResult: searchResponse?.search?.results?.[0] 
        ? {
            documentId: searchResponse.search.results[0].documentId,
            score: searchResponse.search.results[0].score,
            hasScore: 'score' in searchResponse.search.results[0],
            scoreType: typeof searchResponse.search.results[0].score,
            keys: Object.keys(searchResponse.search.results[0])
          }
        : null
    }, null, 2).substring(0, 1000) + '...');
    
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
        thoughts: includeThoughts ? "I searched for relevant documents but couldn't find any matches. The search returned zero results." : undefined,
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

    // Process all results - SAFARI LIMITATION REMOVED
    const resultsToProcess = searchResponse.search.results;
    
    console.log(`Found ${searchResponse.search.results.length} results, processing ${resultsToProcess.length}`);
    
    // 3. Process search results without X-Ray data
    const enhancedResults = await Promise.all(
      resultsToProcess.map(async (result: SearchResultItem, index: number) => {
        // Default values for missing properties
        const documentId = result.documentId || '';
        const fileName = result.fileName || `Document ${documentId}`;
        
        // Extract the best available score using our helper function
        const { score, source: scoreSource } = extractBestScore(result);
        
        // Save raw score for debugging
        const rawScore = result.score;
        
        const text = result.text || result.suggestedText || '';
        let metadata = result.metadata || result.searchData || {};
        let highlights = result.highlight?.text || [];
        let hasXray = false;
        
        // IMPORTANT: Extract sourceUrl as a top-level field
        let sourceUrl = result.sourceUrl || null;
        
        console.log(`Processing search result ${index + 1}/${resultsToProcess.length}: ${fileName} (ID: ${documentId}, Score: ${score}, Source: ${scoreSource})`);
        
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
              
              // Extra sourceURL extraction from metadata (with various possible case forms)
              if (!sourceUrl) {
                // Check for various possible property names
                sourceUrl = docDetails.document.metadata.sourceUrl || 
                            docDetails.document.metadata.sourceURL ||
                            docDetails.document.metadata.source_url ||
                            docDetails.document.metadata.source_URL ||
                            docDetails.document.metadata.url ||
                            docDetails.document.metadata.URL ||
                            null;
                            
                // Log if we found it
                if (sourceUrl) {
                  console.log(`Found sourceUrl in document metadata: ${sourceUrl}`);
                }
              }
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
        
        // Move sourceUrl from metadata to top level if found in metadata
        if (!sourceUrl && metadata.sourceUrl) {
          sourceUrl = metadata.sourceUrl;
          console.log(`Found sourceUrl in metadata: ${sourceUrl}`);
        }
        
        // Also check for uppercase version
        if (!sourceUrl && metadata.sourceURL) {
          sourceUrl = metadata.sourceURL;
          console.log(`Found sourceURL in metadata: ${sourceUrl}`);
        }
        
        // No truncation for Safari - SAFARI LIMITATION REMOVED
        return {
          id: documentId,
          fileName,
          score, // Use our extracted best score
          rawScore, // Include raw score for debugging
          scoreSource, // Track where we got the score from
          text, // Full text without truncation
          metadata,
          sourceUrl, // Include as top-level field
          highlights,
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
        result.highlights.forEach(highlight => {
          context += `- ${highlight}\n`;
        });
        context += '\n';
      }
      
      // Add full content - no truncation - SAFARI LIMITATION REMOVED
      context += `Content:\n${result.text}\n\n`;
      context += '---\n\n';
    });
    
    // 5. Create system prompt with new instructions for thoughts
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
6. If documents contradict each other, acknowledge the different perspectives

IMPORTANT: Your response must be in JSON format with two parts:
- "thoughts": Your internal reasoning process, analyzing the documents and explaining how you're formulating your answer. Be detailed.
- "answer": Your final, polished response to the query that will be shown to the user.

Example format:
{
  "thoughts": "Looking at the documents, I found relevant information in Document 1 and Document 3...",
  "answer": "Based on the documents, [Document 1] states that..."
}`;

    // 6. Prepare conversation history for OpenAI
    const conversationHistory: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt } as ChatCompletionSystemMessageParam
    ];
    
    // Include recent conversation history if provided
    if (Array.isArray(messages) && messages.length > 0) {
      // Include up to 5 recent messages for context - SAFARI LIMITATION REMOVED
      const maxMessages = 5;
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
      response_format: { type: "json_object" } // Ensure response is in JSON format
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

    // Parse the JSON response
    let parsedResponse;
    let answer = '';
    let thoughts = '';
    
    try {
      parsedResponse = JSON.parse(completion.choices[0].message.content);
      
      if (parsedResponse.answer) {
        answer = parsedResponse.answer;
      } else {
        // Fallback if format is incorrect
        answer = completion.choices[0].message.content;
      }
      
      if (parsedResponse.thoughts) {
        thoughts = parsedResponse.thoughts;
      }
    } catch (error) {
      console.error('Error parsing JSON response:', error);
      // If JSON parsing fails, use the raw content as the answer
      answer = completion.choices[0].message.content;
      thoughts = `Failed to parse thoughts from LLM response. Raw response: ${completion.choices[0].message.content.substring(0, 100)}...`;
    }
    
    // 8. Return clean response
    const totalTime = Date.now() - startTime;
    
    // Prepare response - No Safari-specific truncation - SAFARI LIMITATION REMOVED
    const processedSources = enhancedResults.map(({ id, fileName, text, metadata, sourceUrl, highlights, hasXray, score, rawScore, scoreSource }) => {
      return { 
        id, 
        fileName, 
        text, // Full text without truncation
        metadata, // Full metadata
        sourceUrl, // Include sourceUrl at top level
        highlights: highlights || [],
        hasXray,
        score,
        rawScore,
        scoreSource
      };
    });
    
    // Final response with clearly structured sources and thoughts
    const finalResponse = {
      success: true,
      timestamp: new Date().toISOString(),
      query: query,
      response: answer,
      thoughts: includeThoughts ? thoughts : undefined,
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
      } : undefined
    };
    
    // Debug logging of final response structure with focus on scores and sourceUrls
    console.log('Final response sources summary:', 
      finalResponse.searchResults.sources.map(s => ({
        id: s.id,
        fileName: s.fileName,
        score: s.score,
        rawScore: s.rawScore,
        scoreSource: s.scoreSource,
        sourceUrl: s.sourceUrl,
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
        thoughts: 'Error occurred during processing, unable to generate thoughts.',
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
