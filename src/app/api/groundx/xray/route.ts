// app/api/groundx/xray/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { GroundXClient } from "groundx";

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
 * Document detail interface
 */
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
    xrayUrl?: string;
  };
}

/**
 * Simplified X-Ray data for response
 */
interface XRayResponse {
  success: boolean;
  timestamp: string;
  documentId: string;
  fileName?: string;
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
      boundingBoxes?: Array<{
        bottomRightX: number;
        bottomRightY: number;
        pageNumber: number;
        topLeftX: number;
        topLeftY: number;
      }>;
    }>;
    pages?: Array<{
      pageNumber: number;
      pageUrl?: string;
      width?: number;
      height?: number;
    }>;
  };
  executionTime?: {
    totalMs: number;
  };
  error?: string;
}

// Initialize GroundX client
let groundxClient: GroundXClient;

// GroundX API base URL for direct URL construction if needed
const GROUNDX_BASE_URL = process.env.GROUNDX_BASE_URL || 'https://api.groundx.ai';

// Cache settings
const CACHE_ENABLED = process.env.DISABLE_CACHE !== 'true'; // Enable caching by default
const XRAY_CACHE_TTL = parseInt(process.env.XRAY_CACHE_TTL || '43200', 10); // Default 12 hours for X-Ray data
const DOC_CACHE_TTL = parseInt(process.env.DOC_CACHE_TTL || '86400', 10); // Default 24 hours for documents
const MAX_CACHE_ENTRIES = parseInt(process.env.MAX_CACHE_ENTRIES || '100', 10); // Max entries per cache

// Cache structures
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const xrayCache: Record<string, CacheEntry<any>> = {};
const documentCache: Record<string, CacheEntry<DocumentDetail>> = {};

// Cache hit counters for analytics
let xrayCacheHits = 0;
let docCacheHits = 0;

try {
  groundxClient = new GroundXClient({
    apiKey: process.env.GROUNDX_API_KEY || '',
  });
} catch (error) {
  console.error('Error initializing GroundX client:', error);
}

/**
 * Helper function to get cached data or fetch and cache
 */
async function getCachedOrFetch<T>(
  cacheKey: string, 
  fetchFn: () => Promise<T>, 
  cache: Record<string, CacheEntry<T>>,
  ttl: number = XRAY_CACHE_TTL,
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
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 10000): Promise<Response> {
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
 * GET handler to fetch X-Ray data for a document
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    // Validate GroundX client
    if (!groundxClient) {
      return NextResponse.json(
        { 
          success: false, 
          timestamp: new Date().toISOString(),
          error: 'GroundX client not properly initialized',
          documentId: '',
        },
        { status: 500 }
      );
    }
    
    // Get request parameters
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    const skipCache = searchParams.get('skipCache') === 'true';
    const limitChunks = parseInt(searchParams.get('limitChunks') || '0', 10);
    const includeText = searchParams.get('includeText') !== 'false'; // Default to true
    
    // Validate document ID
    if (!documentId) {
      return NextResponse.json(
        { 
          success: false, 
          timestamp: new Date().toISOString(),
          error: 'documentId is required',
          documentId: '',
        },
        { status: 400 }
      );
    }
    
    console.log(`Fetching X-Ray data for document: ${documentId}, skipCache: ${skipCache}, limitChunks: ${limitChunks}, includeText: ${includeText}`);
    
    // First, get document details to find X-Ray URL
    const docCacheKey = `doc_${documentId}`;
    
    const docDetails = !skipCache 
      ? await getCachedOrFetch(
          docCacheKey,
          async () => await groundxClient.documents.get(documentId) as DocumentDetail,
          documentCache,
          DOC_CACHE_TTL,
          { increment: () => docCacheHits++ }
        )
      : await groundxClient.documents.get(documentId) as DocumentDetail;
    
    // Check if document has X-Ray URL
    if (!docDetails?.document?.xrayUrl) {
      return NextResponse.json(
        { 
          success: false, 
          timestamp: new Date().toISOString(),
          error: 'X-Ray data not available for this document',
          documentId,
          fileName: docDetails?.document?.fileName || '',
        },
        { status: 404 }
      );
    }
    
    // Fetch X-Ray data with caching
    const xrayCacheKey = `xray_${documentId}`;
    
    try {
      const xrayData = !skipCache
        ? await getCachedOrFetch(
            xrayCacheKey,
            async () => {
              console.log(`Fetching X-Ray data from: ${docDetails.document?.xrayUrl}`);
              const xrayResponse = await fetchWithTimeout(docDetails.document?.xrayUrl as string, {}, 15000); // Longer timeout for X-Ray data
              
              if (xrayResponse.ok) {
                const xrayResult: XRayResult = await xrayResponse.json();
                return xrayResult;
              } else {
                throw new Error(`Failed to fetch X-Ray data: ${xrayResponse.status} ${xrayResponse.statusText}`);
              }
            },
            xrayCache,
            XRAY_CACHE_TTL,
            { increment: () => xrayCacheHits++ }
          )
        : await (async () => {
            console.log(`Fetching X-Ray data from: ${docDetails.document?.xrayUrl} (cache bypassed)`);
            const xrayResponse = await fetchWithTimeout(docDetails.document?.xrayUrl as string, {}, 15000);
            
            if (xrayResponse.ok) {
              const xrayResult: XRayResult = await xrayResponse.json();
              return xrayResult;
            } else {
              throw new Error(`Failed to fetch X-Ray data: ${xrayResponse.status} ${xrayResponse.statusText}`);
            }
          })();
      
      // Process and format X-Ray data for response
      const chunks = xrayData.documentPages?.flatMap(page => 
        page.chunks?.map(chunk => ({
          id: chunk.chunk,
          contentType: chunk.contentType,
          text: includeText ? chunk.text : undefined,
          suggestedText: chunk.suggestedText,
          sectionSummary: chunk.sectionSummary,
          pageNumbers: chunk.pageNumbers,
          boundingBoxes: chunk.boundingBoxes
        }))
      ).filter(Boolean) || [];
      
      // Apply chunk limit if specified
      const limitedChunks = limitChunks > 0 
        ? chunks.slice(0, limitChunks) 
        : chunks;
      
      // Process page information
      const pages = xrayData.documentPages?.map(page => ({
        pageNumber: page.pageNumber,
        pageUrl: page.pageUrl,
        width: page.width,
        height: page.height
      }));
      
      // Build response
      const response: XRayResponse = {
        success: true,
        timestamp: new Date().toISOString(),
        documentId,
        fileName: xrayData.fileName || docDetails.document?.fileName,
        xray: {
          summary: xrayData.fileSummary,
          keywords: xrayData.fileKeywords,
          language: xrayData.language,
          chunks: limitedChunks,
          pages
        },
        executionTime: {
          totalMs: Date.now() - startTime
        }
      };
      
      console.log(`X-Ray data successfully retrieved with ${limitedChunks.length} chunks and ${pages?.length || 0} pages`);
      
      return NextResponse.json(response, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
      
    } catch (error: any) {
      console.error('Error fetching X-Ray data:', error);
      return NextResponse.json(
        { 
          success: false, 
          timestamp: new Date().toISOString(),
          error: `Failed to fetch X-Ray data: ${error.message || 'Unknown error'}`,
          documentId,
          fileName: docDetails?.document?.fileName || '',
          executionTime: {
            totalMs: Date.now() - startTime
          }
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
    console.error('Unhandled error in X-Ray route:', error);
    return NextResponse.json(
      { 
        success: false, 
        timestamp: new Date().toISOString(),
        error: `Unhandled error: ${error.message || 'Unknown error'}`,
        documentId: '',
        executionTime: {
          totalMs: Date.now() - startTime
        }
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
 * POST handler to cache-invalidate or trigger X-Ray processing
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    // Validate GroundX client
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
    
    // Parse request body
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
    
    const { documentId, action = 'refresh' } = body;
    
    // Validate document ID
    if (!documentId) {
      return NextResponse.json(
        { 
          success: false, 
          timestamp: new Date().toISOString(),
          error: 'documentId is required'
        },
        { status: 400 }
      );
    }
    
    // Handle different actions
    if (action === 'invalidateCache') {
      // Clear cache entries for this document
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
        timestamp: new Date().toISOString(),
        action: 'invalidateCache',
        documentId,
        message: cleared 
          ? `Cache entries for document ${documentId} have been invalidated` 
          : `No cache entries found for document ${documentId}`,
        executionTime: {
          totalMs: Date.now() - startTime
        }
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      });
    }
    
    if (action === 'refresh') {
      // Attempt to refresh document details and X-Ray data
      try {
        // Get fresh document details
        const docDetails = await groundxClient.documents.get(documentId) as DocumentDetail;
        
        // Update document cache
        if (CACHE_ENABLED) {
          const docCacheKey = `doc_${documentId}`;
          safeCacheStore(documentCache, docCacheKey, docDetails);
        }
        
        // Check if X-Ray URL exists
        if (!docDetails?.document?.xrayUrl) {
          return NextResponse.json({
            success: false,
            timestamp: new Date().toISOString(),
            action: 'refresh',
            documentId,
            fileName: docDetails?.document?.fileName || '',
            message: 'X-Ray data not available for this document',
            executionTime: {
              totalMs: Date.now() - startTime
            }
          }, {
            status: 404,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
          });
        }
        
        // Fetch fresh X-Ray data
        console.log(`Refreshing X-Ray data from: ${docDetails.document.xrayUrl}`);
        const xrayResponse = await fetchWithTimeout(docDetails.document.xrayUrl, {}, 15000);
        
        if (xrayResponse.ok) {
          const xrayResult: XRayResult = await xrayResponse.json();
          
          // Update X-Ray cache
          if (CACHE_ENABLED) {
            const xrayCacheKey = `xray_${documentId}`;
            safeCacheStore(xrayCache, xrayCacheKey, xrayResult);
          }
          
          return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            action: 'refresh',
            documentId,
            fileName: xrayResult.fileName || docDetails.document.fileName,
            message: 'X-Ray data refreshed successfully',
            summary: xrayResult.fileSummary,
            keywords: xrayResult.fileKeywords,
            chunkCount: xrayResult.documentPages?.reduce((acc, page) => 
              acc + (page.chunks?.length || 0), 0) || 0,
            executionTime: {
              totalMs: Date.now() - startTime
            }
          }, {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
          });
        } else {
          throw new Error(`Failed to fetch X-Ray data: ${xrayResponse.status} ${xrayResponse.statusText}`);
        }
      } catch (error: any) {
        console.error('Error refreshing X-Ray data:', error);
        return NextResponse.json({
          success: false,
          timestamp: new Date().toISOString(),
          action: 'refresh',
          documentId,
          error: `Failed to refresh X-Ray data: ${error.message || 'Unknown error'}`,
          executionTime: {
            totalMs: Date.now() - startTime
          }
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
    
    // Invalid action
    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: `Invalid action: ${action}. Supported actions: invalidateCache, refresh`,
      executionTime: {
        totalMs: Date.now() - startTime
      }
    }, {
      status: 400,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
    
  } catch (error: any) {
    console.error('Unhandled error in X-Ray route:', error);
    return NextResponse.json({
      success: false,
      timestamp: new Date().toISOString(),
      error: `Unhandled error: ${error.message || 'Unknown error'}`,
      executionTime: {
        totalMs: Date.now() - startTime
      }
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
  
  const xrayCacheCount = Object.keys(xrayCache).length;
  
  return NextResponse.json({
    success: true,
    cacheEnabled: true,
    cacheStats: {
      xrayCache: {
        entries: xrayCacheCount,
        hits: xrayCacheHits,
      },
      settings: {
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