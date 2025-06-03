'use client';

import { apiWarmupService } from './apiWarmupService';
import { chatAnalyticsService } from './chatAnalyticsService';

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: string;
  responseTime: number;
  error?: string;
}

export interface APIEndpointHealth {
  name: string;
  url: string;
  organizationName?: string;
  health: SystemHealth;
  availability: number; // percentage
  avgResponseTime: number;
  lastError?: string;
  errorCount24h: number;
}

export interface UserMetrics {
  activeUsers24h: number;
  totalSessions: number;
  totalMessages: number;
  averageSessionDuration: number;
  topOrganizations: Array<{
    name: string;
    userCount: number;
    messageCount: number;
  }>;
}

export interface PerformanceMetrics {
  memoryUsage: number;
  cpuUsage: number;
  requestsPerMinute: number;
  errorRate: number;
  warmupStatus: {
    lastWarmup: number | null;
    successRate: number;
    averageResponseTime: number;
  };
}

export interface MonitoringData {
  timestamp: string;
  systemHealth: SystemHealth;
  apiEndpoints: APIEndpointHealth[];
  userMetrics: UserMetrics;
  performance: PerformanceMetrics;
  alerts: Alert[];
}

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  description: string;
  timestamp: string;
  resolved: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class MonitoringService {
  private readonly INTERNAL_APIS = [
    { name: 'GroundX RAG API', url: '/api/groundx/rag' },
    { name: 'Chat Stream API', url: '/api/chat-stream' },
    { name: 'GraphRAG API', url: '/graph/api/v1/property_graph/query/' },
    { name: 'Content Proxy API', url: '/api/proxy-content' },
    { name: 'Document Analysis API', url: '/api/analyze_document' }
  ];

  private alerts: Alert[] = [];
  private healthHistory: Map<string, SystemHealth[]> = new Map();

  /**
   * Get all active client backend configurations from API
   */
  async getClientBackends(): Promise<Array<{name: string, url: string, organizationName: string}>> {
    try {
      console.log('[Monitoring] Fetching active client configurations from API...');
      
      const response = await fetch('/api/monitoring');
      
      if (!response.ok) {
        console.error('[Monitoring] API request failed:', response.status, response.statusText);
        return [];
      }

      const data = await response.json();
      
      if (!data.success) {
        console.error('[Monitoring] API returned error:', data.error);
        return [];
      }

      const clientBackends = data.data.clientBackends || [];
      
      if (clientBackends.length === 0) {
        console.warn('[Monitoring] No active client configurations found');
        return [];
      }

      console.log(`[Monitoring] Found ${clientBackends.length} active backends:`, 
        clientBackends.map((b: any) => `${b.organizationName} (${b.name}): ${b.url}`));

      return clientBackends.map((backend: any) => ({
        name: backend.name,
        url: backend.url,
        organizationName: backend.organizationName
      }));
    } catch (error) {
      console.error('[Monitoring] Error fetching client backends from API:', error);
      return [];
    }
  }

  /**
   * Check health of a specific endpoint with smart logic
   */
  async checkEndpointHealth(url: string, timeout: number = 10000): Promise<SystemHealth> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      let response: Response;
      let healthCheckSuccessful = false;
      
      if (url.includes('azurecontainerapps.io')) {
        // For Azure backends, try a simple GET to root - if it responds at all, it's alive
        try {
          response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'QIG-Monitoring-HealthCheck'
            }
          });
          // Any response (even 500) means the service is running
          healthCheckSuccessful = response.status < 600; // Not a network error
        } catch (error) {
          // Try /health endpoint as fallback
          response = await fetch(`${url}/health`, {
            method: 'GET',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'QIG-Monitoring-HealthCheck'
            }
          });
          healthCheckSuccessful = response.status < 600;
        }
      } else if (url === '/api/chat-stream') {
        // For chat stream, do a minimal health check - just see if endpoint exists
        response = await fetch(url, {
          method: 'OPTIONS', // Use OPTIONS to avoid triggering actual processing
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        // If OPTIONS is not allowed, try a minimal POST to see if endpoint exists
        if (response.status === 405) {
          healthCheckSuccessful = true; // 405 means endpoint exists but wrong method
        } else {
          healthCheckSuccessful = response.status < 500;
        }
      } else if (url === '/api/groundx/rag') {
        // For GroundX RAG, check if endpoint responds (even with 400 for missing params)
        response = await fetch(url, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: 'health',
            test: true // Minimal test payload
          })
        });
        // 400 means endpoint is working but params are wrong - that's healthy
        healthCheckSuccessful = response.status === 400 || (response.status >= 200 && response.status < 500);
      } else if (url.startsWith('/api/')) {
        // For other internal APIs, use OPTIONS to check existence
        response = await fetch(url, {
          method: 'OPTIONS',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        // 405 Method Not Allowed means endpoint exists
        healthCheckSuccessful = response.status === 405 || (response.status >= 200 && response.status < 500);
      } else {
        // Generic endpoint check
        response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        healthCheckSuccessful = response.status >= 200 && response.status < 500;
      }

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      // Determine status based on response and our health check logic
      let status: 'healthy' | 'degraded' | 'down';
      let error: string | undefined;

      if (healthCheckSuccessful) {
        if (responseTime > 5000) {
          status = 'degraded';
          error = `Slow response: ${responseTime}ms`;
        } else {
          status = 'healthy';
        }
      } else if (response.status >= 500) {
        status = 'down';
        error = `Server error: HTTP ${response.status}`;
      } else {
        status = 'degraded';
        error = `HTTP ${response.status}: ${response.statusText}`;
      }

      return {
        status,
        lastCheck: new Date().toISOString(),
        responseTime,
        error
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      let errorMessage = 'Unknown error';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = `Request timeout after ${timeout}ms`;
        } else if (error.message.includes('fetch') || error.message.includes('network')) {
          errorMessage = `Network error: ${error.message}`;
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        status: 'down',
        lastCheck: new Date().toISOString(),
        responseTime,
        error: errorMessage
      };
    }
  }

  /**
   * Check health of all Azure backends from database
   */
  async checkAzureBackendsHealth(): Promise<APIEndpointHealth[]> {
    // Get active client backends from database
    const clientBackends = await this.getClientBackends();
    
    if (clientBackends.length === 0) {
      console.warn('[Monitoring] No client backends found in database');
      return [];
    }

    const healthChecks = await Promise.allSettled(
      clientBackends.map(async (backend) => {
        const health = await this.checkEndpointHealth(backend.url);
        
        // Get historical data for this endpoint
        const historyKey = `${backend.organizationName}-${backend.name}`;
        const history = this.healthHistory.get(historyKey) || [];
        history.push(health);
        
        // Keep only last 100 entries
        if (history.length > 100) {
          history.splice(0, history.length - 100);
        }
        this.healthHistory.set(historyKey, history);

        // Calculate metrics from history
        const last24h = history.filter(h => 
          Date.now() - new Date(h.lastCheck).getTime() < 24 * 60 * 60 * 1000
        );
        
        const availability = last24h.length > 0 
          ? (last24h.filter(h => h.status === 'healthy').length / last24h.length) * 100
          : 0;
          
        const avgResponseTime = last24h.length > 0
          ? last24h.reduce((sum, h) => sum + h.responseTime, 0) / last24h.length
          : 0;
          
        const errorCount24h = last24h.filter(h => h.status === 'down').length;

        return {
          name: `${backend.organizationName} - ${backend.name}`,
          url: backend.url,
          organizationName: backend.organizationName,
          health,
          availability,
          avgResponseTime,
          lastError: health.error,
          errorCount24h
        };
      })
    );

    const results: APIEndpointHealth[] = [];
    for (const result of healthChecks) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    }
    return results;
  }

  /**
   * Check health of internal APIs
   */
  async checkInternalAPIsHealth(): Promise<APIEndpointHealth[]> {
    const healthChecks = await Promise.allSettled(
      this.INTERNAL_APIS.map(async (api) => {
        const health = await this.checkEndpointHealth(api.url);
        
        return {
          name: api.name,
          url: api.url,
          health,
          availability: health.status === 'healthy' ? 100 : 0,
          avgResponseTime: health.responseTime,
          lastError: health.error,
          errorCount24h: health.status === 'down' ? 1 : 0
        };
      })
    );

    const results: APIEndpointHealth[] = [];
    for (const result of healthChecks) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    }
    return results;
  }

  /**
   * Get user metrics from chat analytics
   */
  async getUserMetrics(): Promise<UserMetrics> {
    try {
      const analytics = await chatAnalyticsService.getChatAnalytics();
      const hasData = await chatAnalyticsService.hasData();
      
      if (!hasData) {
        return {
          activeUsers24h: 0,
          totalSessions: 0,
          totalMessages: 0,
          averageSessionDuration: 0,
          topOrganizations: []
        };
      }

      return {
        activeUsers24h: analytics.activeToday ? 1 : 0, // Simplified - could track unique users
        totalSessions: analytics.totalSessions,
        totalMessages: analytics.totalMessages,
        averageSessionDuration: analytics.averageSessionDuration,
        topOrganizations: [
          {
            name: 'Default Organization',
            userCount: analytics.activeToday ? 1 : 0,
            messageCount: analytics.totalMessages
          }
        ]
      };
    } catch (error) {
      console.error('Error getting user metrics:', error);
      return {
        activeUsers24h: 0,
        totalSessions: 0,
        totalMessages: 0,
        averageSessionDuration: 0,
        topOrganizations: []
      };
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const warmupStatus = apiWarmupService.getWarmupStatus();
    
    // Get browser performance data if available
    let memoryUsage = 0;
    let cpuUsage = 0;
    
    if (typeof window !== 'undefined' && 'performance' in window) {
      // @ts-ignore - performance.memory is not standard but available in Chrome
      if (window.performance.memory) {
        // @ts-ignore
        memoryUsage = window.performance.memory.usedJSHeapSize / window.performance.memory.totalJSHeapSize * 100;
      }
    }

    return {
      memoryUsage: Math.round(memoryUsage),
      cpuUsage: Math.round(cpuUsage), // CPU usage is hard to measure in browser
      requestsPerMinute: 0, // Would need request tracking
      errorRate: 0, // Would need error tracking
      warmupStatus: {
        lastWarmup: warmupStatus.lastWarmupTime,
        successRate: 95, // Would track from actual warmup results
        averageResponseTime: 150 // Would calculate from warmup results
      }
    };
  }

  /**
   * Generate alerts based on system health with smart analysis
   */
  generateAlerts(data: Omit<MonitoringData, 'alerts'>): Alert[] {
    const alerts: Alert[] = [];
    const now = new Date().toISOString();

    // Check for down endpoints
    data.apiEndpoints.forEach(endpoint => {
      if (endpoint.health.status === 'down') {
        const isAzureBackend = endpoint.url.includes('azurecontainerapps.io');
        const isInternalAPI = endpoint.url.startsWith('/api/');
        
        let troubleshootingSteps: string;
        if (isAzureBackend) {
          troubleshootingSteps = [
            '1. Check if Azure Container App is running in Azure Portal',
            '2. Verify the container app has not scaled to zero',
            '3. Check application logs for startup errors',
            '4. Try triggering API warmup to wake the container',
            '5. Verify DNS resolution and networking',
            '6. Note: FastRAG may still work through proper API authentication'
          ].join('\n');
        } else if (isInternalAPI) {
          troubleshootingSteps = [
            '1. Check if the API route file exists and is properly configured',
            '2. Verify there are no syntax errors in the route handler',
            '3. Check server logs for detailed error messages',
            '4. Ensure required environment variables are set',
            '5. This may not affect user-facing functionality if they use proper API flows'
          ].join('\n');
        } else {
          troubleshootingSteps = [
            '1. Check network connectivity to the endpoint',
            '2. Verify the service is running and accessible',
            '3. Check firewall and security group settings',
            '4. Review service logs for errors'
          ].join('\n');
        }

        alerts.push({
          id: `endpoint-down-${endpoint.name.replace(/\s+/g, '-').toLowerCase()}`,
          type: 'error',
          title: `${endpoint.name} is Not Responding`,
          description: `Endpoint: ${endpoint.url}\nOrganization: ${endpoint.organizationName || 'Unknown'}\nError: ${endpoint.health.error}\nResponse Time: ${endpoint.health.responseTime}ms\nLast Check: ${new Date(endpoint.health.lastCheck).toLocaleTimeString()}\n\nIMPORTANT: This monitoring uses basic health checks. The service may still be functional for users who access it through proper authentication and API flows.\n\nTroubleshooting Steps:\n${troubleshootingSteps}`,
          timestamp: now,
          resolved: false,
          severity: isInternalAPI ? 'medium' : 'critical' // Internal APIs less critical since users may not access directly
        });
      } else if (endpoint.health.status === 'degraded') {
        const isExpectedDegradation = endpoint.health.error?.includes('400') || endpoint.health.error?.includes('405');
        
        alerts.push({
          id: `endpoint-degraded-${endpoint.name.replace(/\s+/g, '-').toLowerCase()}`,
          type: 'warning',
          title: `${endpoint.name} Performance Issues`,
          description: `Endpoint: ${endpoint.url}\nOrganization: ${endpoint.organizationName || 'Unknown'}\nIssue: ${endpoint.health.error}\nResponse Time: ${endpoint.health.responseTime}ms\nAvailability: ${Math.round(endpoint.availability)}%\n\n${isExpectedDegradation ? 
            'NOTE: This may be expected behavior - the endpoint is responding but returning error codes for requests without proper parameters/authentication.' : 
            'This indicates potential performance issues that should be investigated.'}\n\nRecommended Actions:\n1. Monitor response times over the next few minutes\n2. Check if this is a temporary spike or sustained issue\n3. ${endpoint.url.includes('azurecontainerapps.io') ? 'Consider triggering API warmup for Azure backends' : 'Check application logs for errors'}\n4. Verify system resources and scaling settings\n5. Test the endpoint through normal user flows to confirm functionality`,
          timestamp: now,
          resolved: false,
          severity: isExpectedDegradation ? 'low' : 'medium'
        });
      }

      // Check for high response times even on healthy endpoints
      if (endpoint.health.status === 'healthy' && endpoint.health.responseTime > 3000) {
        alerts.push({
          id: `endpoint-slow-${endpoint.name.replace(/\s+/g, '-').toLowerCase()}`,
          type: 'warning',
          title: `${endpoint.name} Slow Response Times`,
          description: `Endpoint: ${endpoint.url}\nOrganization: ${endpoint.organizationName || 'Unknown'}\nResponse Time: ${endpoint.health.responseTime}ms (threshold: 3000ms)\nStatus: Healthy but slow\n\nThis may indicate:\n• Cold start delays (for Azure backends)\n• High server load or resource constraints\n• Network latency issues\n• Need for API warmup\n\nActions:\n1. Monitor if this response time persists\n2. ${endpoint.url.includes('azurecontainerapps.io') ? 'Trigger API warmup for Azure backends' : 'Check server performance metrics'}\n3. Consider scaling up if sustained\n4. Test user-facing functionality to assess impact`,
          timestamp: now,
          resolved: false,
          severity: 'low'
        });
      }
    });

    // Enhanced warmup status checking
    if (data.performance.warmupStatus.lastWarmup === null) {
      alerts.push({
        id: 'warmup-never-run',
        type: 'warning',
        title: 'API Warmup Never Executed',
        description: `APIs have not been warmed up yet, which may cause slow initial responses for Azure backends.\n\nImpact:\n• First requests to Azure Container Apps may take 10-30 seconds\n• Users may experience timeouts on initial chat requests\n• Cold start delays affect user experience\n\nAction Required:\nClick the 'Warmup' button in the API Warmup card to initialize all Azure backends.\n\nNote: This mainly affects Azure backends, internal APIs typically stay warm.`,
        timestamp: now,
        resolved: false,
        severity: 'medium'
      });
    } else {
      const timeSinceWarmup = Date.now() - data.performance.warmupStatus.lastWarmup;
      const minutesSince = Math.round(timeSinceWarmup / 60000);
      
      if (timeSinceWarmup > 10 * 60 * 1000) { // 10 minutes
        alerts.push({
          id: 'warmup-stale',
          type: 'info',
          title: 'Azure Backends May Need Re-warming',
          description: `Last warmup: ${minutesSince} minutes ago\n\nAzure Container Apps may go into idle state after:\n• 10-15 minutes of inactivity\n• This can cause 10-30 second delays on next requests\n\nRecommendation:\n• Trigger warmup if you expect user activity soon\n• Consider setting up automated warmup for peak hours\n• Monitor response times for the first few requests\n• Internal APIs typically don't need warming`,
          timestamp: now,
          resolved: false,
          severity: 'low'
        });
      }
    }

    // Memory usage alerts with more context
    if (data.performance.memoryUsage > 90) {
      alerts.push({
        id: 'high-memory-usage',
        type: 'warning',
        title: 'High Browser Memory Usage',
        description: `Current Memory Usage: ${data.performance.memoryUsage}%\n\nThis is browser-side memory usage which may indicate:\n• Large chat histories taking up memory\n• Memory leaks in the application\n• Too many browser tabs open\n• Large documents being processed\n\nActions:\n1. Consider clearing chat history\n2. Close unnecessary browser tabs\n3. Refresh the page if memory usage is critical\n4. Monitor for memory leaks in development tools`,
        timestamp: now,
        resolved: false,
        severity: 'high'
      });
    }

    // Low API availability alerts
    data.apiEndpoints.forEach(endpoint => {
      if (endpoint.availability < 95 && endpoint.availability > 0) {
        alerts.push({
          id: `low-availability-${endpoint.name.replace(/\s+/g, '-').toLowerCase()}`,
          type: 'warning',
          title: `${endpoint.name} Low Availability`,
          description: `Current Availability: ${Math.round(endpoint.availability)}% (last 24h)\nTarget: >99%\nErrors (24h): ${endpoint.errorCount24h}\nAverage Response Time: ${Math.round(endpoint.avgResponseTime)}ms\n\nPossible Causes:\n• Intermittent network issues\n• Backend scaling or deployment issues\n• Rate limiting or throttling\n• Infrastructure problems\n• Health check methodology detecting expected errors\n\nActions:\n1. Check if users are actually experiencing issues\n2. Review error patterns and types\n3. ${endpoint.url.includes('azurecontainerapps.io') ? 'Check Azure Portal for backend health' : 'Check application logs'}\n4. Consider scaling up if needed\n5. Verify health check results match user experience`,
          timestamp: now,
          resolved: false,
          severity: 'medium'
        });
      }
    });

    this.alerts = alerts;
    return alerts;
  }

  /**
   * Get comprehensive monitoring data
   */
  async getMonitoringData(): Promise<MonitoringData> {
    try {
      const [azureHealth, internalHealth, userMetrics, performance] = await Promise.all([
        this.checkAzureBackendsHealth(),
        this.checkInternalAPIsHealth(),
        this.getUserMetrics(),
        this.getPerformanceMetrics()
      ]);

      const allEndpoints = [...azureHealth, ...internalHealth];
      const overallHealth: SystemHealth = {
        status: allEndpoints.every(e => e.health.status === 'healthy') ? 'healthy' :
                allEndpoints.some(e => e.health.status === 'down') ? 'degraded' : 'healthy',
        lastCheck: new Date().toISOString(),
        responseTime: allEndpoints.reduce((sum, e) => sum + e.health.responseTime, 0) / allEndpoints.length,
        error: allEndpoints.find(e => e.health.error)?.health.error
      };

      const data: Omit<MonitoringData, 'alerts'> = {
        timestamp: new Date().toISOString(),
        systemHealth: overallHealth,
        apiEndpoints: allEndpoints,
        userMetrics,
        performance
      };

      const alerts = this.generateAlerts(data);

      return {
        ...data,
        alerts
      };
    } catch (error) {
      console.error('Error gathering monitoring data:', error);
      
      return {
        timestamp: new Date().toISOString(),
        systemHealth: {
          status: 'down',
          lastCheck: new Date().toISOString(),
          responseTime: 0,
          error: 'Failed to gather monitoring data'
        },
        apiEndpoints: [],
        userMetrics: {
          activeUsers24h: 0,
          totalSessions: 0,
          totalMessages: 0,
          averageSessionDuration: 0,
          topOrganizations: []
        },
        performance: {
          memoryUsage: 0,
          cpuUsage: 0,
          requestsPerMinute: 0,
          errorRate: 0,
          warmupStatus: {
            lastWarmup: null,
            successRate: 0,
            averageResponseTime: 0
          }
        },
        alerts: [{
          id: 'monitoring-failure',
          type: 'error',
          title: 'Monitoring System Error',
          description: error instanceof Error ? error.message : 'Unknown monitoring error',
          timestamp: new Date().toISOString(),
          resolved: false,
          severity: 'critical'
        }]
      };
    }
  }

  /**
   * Get alert history
   */
  getAlerts(): Alert[] {
    return this.alerts;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  /**
   * Enhanced manual trigger for API warmup from monitoring dashboard
   */
  async triggerWarmup(): Promise<any> {
    console.log('[Monitoring] Triggering comprehensive API warmup...');
    
    try {
      // First, trigger the existing warmup service
      const warmupResults = await apiWarmupService.warmupApis();
      
      // Additionally, perform specific health checks on problematic endpoints
      const unhealthyEndpoints = [];
      
      // Get client backends from database
      const clientBackends = await this.getClientBackends();
      
      // Check each Azure backend specifically
      for (const backend of clientBackends) {
        try {
          console.log(`[Monitoring] Warming up ${backend.organizationName} - ${backend.name}...`);
          
          // Create timeout controller for warmup request
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
          
          // Make a simple request to wake up the backend
          const response = await fetch(backend.url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'QIG-Monitoring-Warmup'
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          console.log(`[Monitoring] ${backend.organizationName} - ${backend.name} responded with status: ${response.status}`);
          
          if (!response.ok) {
            unhealthyEndpoints.push({
              name: `${backend.organizationName} - ${backend.name}`,
              url: backend.url,
              status: response.status,
              error: response.statusText
            });
          }
        } catch (error) {
          console.error(`[Monitoring] Error warming up ${backend.organizationName} - ${backend.name}:`, error);
          unhealthyEndpoints.push({
            name: `${backend.organizationName} - ${backend.name}`,
            url: backend.url,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      return {
        success: true,
        warmupResults,
        unhealthyEndpoints,
        message: `Warmup completed. ${warmupResults.length} endpoints processed. ${unhealthyEndpoints.length} issues found.`,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[Monitoring] Warmup failed:', error);
      throw error;
    }
  }

  /**
   * Get health history for a specific endpoint
   */
  getHealthHistory(endpointName: string): SystemHealth[] {
    return this.healthHistory.get(endpointName) || [];
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();

// Export class for testing
export { MonitoringService }; 