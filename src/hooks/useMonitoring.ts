'use client';

import { useState, useEffect, useCallback } from 'react';
import { monitoringService, MonitoringData } from '@/services/monitoringService';

interface UseMonitoringOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
}

interface UseMonitoringReturn {
  data: MonitoringData | null;
  isLoading: boolean;
  error: string | null;
  lastRefresh: Date | null;
  refresh: () => Promise<void>;
  triggerWarmup: () => Promise<void>;
  resolveAlert: (alertId: string) => boolean;
}

export function useMonitoring(options: UseMonitoringOptions = {}): UseMonitoringReturn {
  const {
    autoRefresh = true,
    refreshInterval = 30000 // 30 seconds
  } = options;

  const [data, setData] = useState<MonitoringData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Load monitoring data
  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const monitoringData = await monitoringService.getMonitoringData();
      setData(monitoringData);
      setLastRefresh(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error loading monitoring data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Trigger API warmup
  const triggerWarmup = useCallback(async () => {
    try {
      await monitoringService.triggerWarmup();
      // Refresh data after warmup to see updated status
      setTimeout(refresh, 2000);
    } catch (err) {
      console.error('Error triggering warmup:', err);
      throw err;
    }
  }, [refresh]);

  // Resolve an alert
  const resolveAlert = useCallback((alertId: string) => {
    const success = monitoringService.resolveAlert(alertId);
    if (success && data) {
      // Update local state to reflect resolved alert
      setData(prev => prev ? {
        ...prev,
        alerts: prev.alerts.map(alert => 
          alert.id === alertId ? { ...alert, resolved: true } : alert
        )
      } : null);
    }
    return success;
  }, [data]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refresh]);

  return {
    data,
    isLoading,
    error,
    lastRefresh,
    refresh,
    triggerWarmup,
    resolveAlert
  };
}

// Hook for specific monitoring metrics
export function useSystemHealth() {
  const { data } = useMonitoring();
  
  return {
    status: data?.systemHealth.status || 'down',
    responseTime: data?.systemHealth.responseTime || 0,
    lastCheck: data?.systemHealth.lastCheck || null,
    error: data?.systemHealth.error || null
  };
}

// Hook for API endpoints health
export function useAPIEndpointsHealth() {
  const { data } = useMonitoring();
  
  return {
    endpoints: data?.apiEndpoints || [],
    healthyCount: data?.apiEndpoints?.filter(e => e.health.status === 'healthy').length || 0,
    totalCount: data?.apiEndpoints?.length || 0,
    avgResponseTime: (data?.apiEndpoints && data.apiEndpoints.length > 0)
      ? data.apiEndpoints.reduce((sum, e) => sum + e.health.responseTime, 0) / data.apiEndpoints.length
      : 0
  };
}

// Hook for user metrics
export function useUserMetrics() {
  const { data } = useMonitoring();
  
  return {
    activeUsers24h: data?.userMetrics.activeUsers24h || 0,
    totalSessions: data?.userMetrics.totalSessions || 0,
    totalMessages: data?.userMetrics.totalMessages || 0,
    averageSessionDuration: data?.userMetrics.averageSessionDuration || 0,
    topOrganizations: data?.userMetrics.topOrganizations || []
  };
}

// Hook for performance metrics
export function usePerformanceMetrics() {
  const { data } = useMonitoring();
  
  return {
    memoryUsage: data?.performance.memoryUsage || 0,
    cpuUsage: data?.performance.cpuUsage || 0,
    requestsPerMinute: data?.performance.requestsPerMinute || 0,
    errorRate: data?.performance.errorRate || 0,
    warmupStatus: data?.performance.warmupStatus || {
      lastWarmup: null,
      successRate: 0,
      averageResponseTime: 0
    }
  };
}

// Hook for active alerts
export function useActiveAlerts() {
  const { data, resolveAlert } = useMonitoring();
  
  const activeAlerts = data?.alerts.filter(alert => !alert.resolved) || [];
  const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');
  const highAlerts = activeAlerts.filter(alert => alert.severity === 'high');
  
  return {
    alerts: activeAlerts,
    count: activeAlerts.length,
    criticalCount: criticalAlerts.length,
    highCount: highAlerts.length,
    resolveAlert
  };
} 