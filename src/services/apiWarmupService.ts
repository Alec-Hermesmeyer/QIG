'use client';

/**
 * API Warmup Service
 * 
 * This service sends lightweight requests to Azure RAG APIs to "wake them up"
 * and prevent cold start delays when users actually start using chat features.
 */

interface WarmupEndpoint {
  name: string;
  url: string;
  method: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

interface WarmupResult {
  endpoint: string;
  success: boolean;
  responseTime: number;
  error?: string;
}

class ApiWarmupService {
  private warmupInProgress = false;
  private lastWarmupTime: number | null = null;
  private readonly WARMUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private readonly REQUEST_TIMEOUT = 10000; // 10 seconds

  /**
   * Azure backend URLs that need warming up
   */
  private getAzureBackends(): string[] {
    return [
      'https://capps-backend-vakcnm7wmon74.salmonbush-fc2963f0.eastus.azurecontainerapps.io',
      'https://capps-backend-px4batn2ycs6a.greenground-334066dd.eastus2.azurecontainerapps.io',
      'https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io',
      'https://capps-backend-6qjzg44bnug6q.greenmeadow-8b5f0a30.eastus2.azurecontainerapps.io'
    ];
  }

  /**
   * Get all endpoints that need warming up
   */
  private getWarmupEndpoints(): WarmupEndpoint[] {
    const endpoints: WarmupEndpoint[] = [];

    // Azure RAG backends - ping with health check
    this.getAzureBackends().forEach((backend, index) => {
      endpoints.push({
        name: `Azure Backend ${index + 1}`,
        url: `${backend}/health`,
        method: 'GET',
        timeout: this.REQUEST_TIMEOUT
      });
    });

    // GroundX RAG API - lightweight warmup
    endpoints.push({
      name: 'GroundX RAG API',
      url: '/api/groundx/rag',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'warmup',
        bucketId: 1,
        messages: [],
        config: {
          maxTokens: 10,
          temperature: 0,
          skipCache: true
        }
      }),
      timeout: this.REQUEST_TIMEOUT
    });

    // GraphRAG API - ping endpoint
    // NOTE: Disabled because endpoint doesn't exist yet
    // endpoints.push({
    //   name: 'GraphRAG Query API',
    //   url: '/graph/api/v1/property_graph/query/',
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     query: 'warmup'
    //   }),
    //   timeout: this.REQUEST_TIMEOUT
    // });

    return endpoints;
  }

  /**
   * Send a warmup request to a specific endpoint
   */
  private async warmupEndpoint(endpoint: WarmupEndpoint): Promise<WarmupResult> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout || this.REQUEST_TIMEOUT);

      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: endpoint.headers,
        body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      return {
        endpoint: endpoint.name,
        success: response.ok,
        responseTime,
        error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return {
        endpoint: endpoint.name,
        success: false,
        responseTime,
        error: errorMessage
      };
    }
  }

  /**
   * Warm up all Azure RAG APIs
   */
  async warmupApis(): Promise<WarmupResult[]> {
    if (this.warmupInProgress) {
      // Only log in development to reduce spam
      if (process.env.NODE_ENV === 'development') {
        console.log('API warmup already in progress, skipping...');
      }
      return [];
    }

    // Check if we've warmed up recently
    const now = Date.now();
    if (this.lastWarmupTime && (now - this.lastWarmupTime) < this.WARMUP_INTERVAL) {
      // Only log once per session to reduce spam
      const lastLogKey = 'warmup_skip_logged';
      const lastLogTime = sessionStorage.getItem(lastLogKey);
      if (!lastLogTime || (now - parseInt(lastLogTime)) > 60000) { // Once per minute
        console.log('APIs warmed up recently, skipping...');
        sessionStorage.setItem(lastLogKey, now.toString());
      }
      return [];
    }

    this.warmupInProgress = true;
    console.log('Starting API warmup...');

    try {
      const endpoints = this.getWarmupEndpoints();
      const results = await Promise.allSettled(
        endpoints.map(endpoint => this.warmupEndpoint(endpoint))
      );

      const warmupResults: WarmupResult[] = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            endpoint: endpoints[index].name,
            success: false,
            responseTime: 0,
            error: result.reason?.message || 'Promise rejected'
          };
        }
      });

      // Log results - only show summary in production
      const successful = warmupResults.filter(r => r.success).length;
      const total = warmupResults.length;
      
      console.log(`API warmup completed: ${successful}/${total} endpoints warmed up successfully`);
      
      // Log individual results only in development
      if (process.env.NODE_ENV === 'development') {
        warmupResults.forEach(result => {
          const status = result.success ? '✅' : '❌';
          console.log(`${status} ${result.endpoint}: ${result.responseTime}ms${result.error ? ` (${result.error})` : ''}`);
        });
      }

      this.lastWarmupTime = now;
      return warmupResults;
    } finally {
      this.warmupInProgress = false;
    }
  }

  /**
   * Warm up APIs silently in the background (fire and forget)
   */
  warmupApisBackground(): void {
    this.warmupApis().catch(error => {
      console.warn('Background API warmup failed:', error);
    });
  }

  /**
   * Check if APIs need warming up based on time elapsed
   */
  shouldWarmup(): boolean {
    if (!this.lastWarmupTime) return true;
    const elapsed = Date.now() - this.lastWarmupTime;
    return elapsed >= this.WARMUP_INTERVAL;
  }

  /**
   * Get status of last warmup
   */
  getWarmupStatus(): {
    lastWarmupTime: number | null;
    shouldWarmup: boolean;
    inProgress: boolean;
  } {
    return {
      lastWarmupTime: this.lastWarmupTime,
      shouldWarmup: this.shouldWarmup(),
      inProgress: this.warmupInProgress
    };
  }
}

// Create and export singleton instance
export const apiWarmupService = new ApiWarmupService();

// Export the class for testing or custom instances
export { ApiWarmupService };

// Note: Auto-warmup is now handled by the ApiWarmupProvider component
// to avoid repeated warmup attempts during service imports 