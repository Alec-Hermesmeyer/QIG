export const runtime = 'nodejs'; // Use Node.js runtime for better proxy support

interface KernelMemorySearchResult {
  id: string;
  content: string;
  source: string;
  relevance: number;
  metadata?: Record<string, any>;
}

interface KernelMemoryResponse {
  question: string;
  text: string;
  noResult?: boolean;
  noResultReason?: string;
  relevantSources: Array<{
    link: string;
    sourceName: string;
    relevance: number;
    partitions: Array<{
      text: string;
      relevance: number;
      lastUpdate: string;
      tags: Record<string, any>;
    }>;
  }>;
  tokenUsage?: Array<{
    timestamp: string;
    modelType: string;
    tokenizerTokensIn: number;
    tokenizerTokensOut?: number;
  }>;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      query,
      index = "polaris-and-zodiac-days",
      filters = [],
      minRelevance = 0.0
    } = body;

    // Validate required parameters
    if (!query) {
      return new Response(
        JSON.stringify({ 
          error: "Query parameter is required" 
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the Kernel Memory API key from environment
    const KERNEL_API_KEY = process.env.KERNEL_API_KEY;
    if (!KERNEL_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: "Kernel Memory API key not configured" 
        }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Base URL for Kernel Memory service
    const KERNEL_BASE_URL = "http://20.246.75.167";
    
    // Construct the request payload for Kernel Memory
    const payload = {
      question: query,
      index: index,
      filters: filters,
      minRelevance: minRelevance,
      stream: false // Always disable streaming to avoid SSE parsing issues
    };

    console.log("Proxying request to Kernel Memory:", JSON.stringify(payload, null, 2));

    // Proxy the request to Kernel Memory with proper error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout for proxy
    
    const response = await fetch(`${KERNEL_BASE_URL}/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": KERNEL_API_KEY,
        "User-Agent": "NextJS-Kernel-Memory-Proxy/1.0",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    console.log(`Kernel Memory proxy response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Kernel Memory API error: ${response.status} ${response.statusText}`);
      console.error('Error details:', errorText);
      
      // Handle specific error cases
      if (response.status === 403) {
        return new Response(
          JSON.stringify({
            error: "Access denied to Kernel Memory service",
            details: "The proxy server was denied access. This may be due to IP restrictions or invalid credentials.",
            status: response.status
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Try to parse error details
      let errorDetails = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = errorJson.detail || errorJson.message || errorText;
      } catch {
        // Keep original error text if JSON parsing fails
      }
      
      return new Response(
        JSON.stringify({
          error: `Kernel Memory API error: ${response.status} ${response.statusText}`,
          details: errorDetails,
          status: response.status
        }),
        {
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Handle response (always non-streaming now)
    try {
      const responseData = await response.json() as KernelMemoryResponse;
      
      console.log(`[Kernel Memory Proxy] Processing response with ${responseData.relevantSources?.length || 0} sources`);
      
      // Extract the main content (keep it simple like chat-stream API)
      let content = responseData.text || "";
      if (responseData.noResult) {
        content = responseData.noResultReason || "No relevant information found.";
      }

      // Create simple supporting content (no nested structures)
      const supportingContent = responseData.relevantSources?.map((source, index) => {
        const combinedText = source.partitions?.map(p => p.text).join('\n\n') || '';
        const truncatedContent = combinedText.length > 800 
          ? combinedText.substring(0, 800) + '...' 
          : combinedText;
        
        return {
          title: source.sourceName || `Source ${index + 1}`,
          content: truncatedContent,
          score: source.relevance
        };
      }) || [];

      // Simple thought process (one line like other APIs)
      const thoughtProcess = `Query: "${responseData.question}" | Sources: ${responseData.relevantSources?.length || 0} | Status: ${responseData.noResult ? 'No results' : 'Success'}`;

      // Return simple, clean response format (like chat-stream API)
      const cleanResponse = {
        content: content,
        supportingContent: supportingContent,
        thoughtProcess: thoughtProcess,
        sourceCount: supportingContent.length,
        hasResults: !responseData.noResult
      };

      console.log(`[Kernel Memory Proxy] Clean response prepared: ${JSON.stringify(cleanResponse).length} characters`);

      return new Response(
        JSON.stringify(cleanResponse),
        {
          headers: { 
            'Content-Type': 'application/json',
            'X-Proxy-Status': 'success',
            'X-Source-Count': supportingContent.length.toString()
          }
        }
      );
    } catch (error) {
      console.error('Error processing Kernel Memory response:', error);
      return new Response(
        JSON.stringify({
          error: 'Failed to process Kernel Memory response',
          details: error instanceof Error ? error.message : 'Unknown error'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

  } catch (error) {
    console.error('Kernel Memory proxy error:', error);
    
    // Handle timeout errors specifically
    if (error instanceof Error && error.name === 'AbortError') {
      return new Response(
        JSON.stringify({
          error: 'Request timeout',
          details: 'The request to Kernel Memory service timed out. Please try again.'
        }),
        {
          status: 504,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    return new Response(
      JSON.stringify({
        error: 'Internal proxy server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// GET endpoint for health check and API info
export async function GET(req: Request) {
  const KERNEL_API_KEY = process.env.KERNEL_API_KEY;
  
  if (!KERNEL_API_KEY) {
    return new Response(
      JSON.stringify({ 
        status: "error",
        message: "Kernel Memory API key not configured" 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    
    const KERNEL_BASE_URL = "http://20.246.75.167";

    // Handle different GET actions
    if (action === 'indexes') {
      // Fetch available indexes
      const response = await fetch(`${KERNEL_BASE_URL}/indexes`, {
        method: "GET",
        headers: {
          "Authorization": KERNEL_API_KEY,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return new Response(
          JSON.stringify({ 
            status: "success",
            indexes: data.results || []
          }),
          { 
            headers: { 'Content-Type': 'application/json' }
          }
        );
      } else {
        return new Response(
          JSON.stringify({ 
            status: "error",
            message: `Failed to fetch indexes: ${response.status}`
          }),
          { 
            status: response.status,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Default health check
    const response = await fetch(`${KERNEL_BASE_URL}/health`, {
      method: "GET",
      headers: {
        "Authorization": KERNEL_API_KEY,
      },
    });

    if (response.ok) {
      const info = await response.json();
      return new Response(
        JSON.stringify({ 
          status: "connected",
          message: "Kernel Memory service is available",
          service_info: info,
          endpoints: {
            ask: "/ask",
            upload: "/upload-file",
            delete: "/documents/{id}",
            search: "/search",
            indexes: "/indexes"
          }
        }),
        { 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          status: "error",
          message: `Kernel Memory service returned ${response.status}`
        }),
        { 
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        status: "error",
        message: "Failed to connect to Kernel Memory service",
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 