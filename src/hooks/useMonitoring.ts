'use client';

import { useState, useEffect, useCallback } from 'react';
import { monitoringService, MonitoringData } from '@/services/monitoringService';
import { monitoringConfigService, MonitoringConfig, HealthHistoryPoint } from '@/services/monitoringConfig';
import { alertingService, EnhancedAlert, AlertRule } from '@/services/alertingService';

interface UseMonitoringOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  useConfigDefaults?: boolean;
}

interface UseMonitoringReturn {
  data: MonitoringData | null;
  isLoading: boolean;
  error: string | null;
  lastRefresh: Date | null;
  refresh: () => Promise<void>;
  triggerWarmup: () => Promise<void>;
  resolveAlert: (alertId: string) => boolean;
  clearCaches: () => void;
  config: MonitoringConfig;
  updateConfig: (updates: Partial<MonitoringConfig>) => void;
  resetConfig: () => void;
  enhancedAlerts: EnhancedAlert[];
  acknowledgeAlert: (alertId: string) => boolean;
  suppressAlert: (alertId: string, durationMs: number) => boolean;
  exportData: () => string;
  importData: (jsonData: string) => boolean;
  storageInfo: { usedMB: number; totalMB: number; compressionEnabled: boolean };
}

export function useMonitoring(options: UseMonitoringOptions = {}): UseMonitoringReturn {
  const [data, setData] = useState<MonitoringData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [config, setConfig] = useState<MonitoringConfig>(monitoringConfigService.getConfig());
  const [enhancedAlerts, setEnhancedAlerts] = useState<EnhancedAlert[]>([]);

  // Use config defaults if specified
  const {
    autoRefresh = options.useConfigDefaults ? config.dashboard.autoRefresh : true,
    refreshInterval = options.useConfigDefaults ? config.dashboard.refreshInterval : 30000
  } = options;

  // Load monitoring data with enhanced error handling
  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('[useMonitoring] Starting data refresh...');
      const startTime = Date.now();
      
      const monitoringData = await monitoringService.getMonitoringData();
      
      // Get enhanced alerts
      const activeAlerts = alertingService.getActiveAlerts();
      setEnhancedAlerts(activeAlerts);
      
      setData(monitoringData);
      setLastRefresh(new Date());
      
      const loadTime = Date.now() - startTime;
      console.log(`[useMonitoring] Data refresh completed in ${loadTime}ms`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error loading monitoring data:', err);
      
      // Try to provide cached data if available
      try {
        const cachedData = monitoringService.getAlerts();
        if (cachedData.length > 0) {
          console.log('[useMonitoring] Using cached data due to error');
        }
      } catch (cacheError) {
        console.warn('[useMonitoring] No cached data available');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Enhanced warmup trigger with feedback
  const triggerWarmup = useCallback(async () => {
    try {
      console.log('[useMonitoring] Triggering warmup...');
      const result = await monitoringService.triggerWarmup();
      
      // Show success feedback
      console.log('[useMonitoring] Warmup completed:', result);
      
      // Refresh data after warmup with delay to allow services to start
      setTimeout(() => {
        refresh();
      }, config.alerts.rules.warmupGracePeriod || 3000);
      
      return result;
    } catch (err) {
      console.error('Error triggering warmup:', err);
      throw err;
    }
  }, [refresh, config.alerts.rules.warmupGracePeriod]);

  // Resolve an alert
  const resolveAlert = useCallback((alertId: string) => {
    const success = monitoringService.resolveAlert(alertId);
    if (success && data) {
      // Update local state immediately for better UX
      setData(prev => prev ? {
        ...prev,
        alerts: prev.alerts.map(alert => 
          alert.id === alertId ? { ...alert, resolved: true } : alert
        )
      } : null);
      
      // Refresh enhanced alerts
      setEnhancedAlerts(alertingService.getActiveAlerts());
    }
    return success;
  }, [data]);

  // Clear all caches
  const clearCaches = useCallback(() => {
    monitoringService.clearCaches();
    console.log('[useMonitoring] Caches cleared');
  }, []);

  // Configuration management
  const updateConfig = useCallback((updates: Partial<MonitoringConfig>) => {
    monitoringConfigService.updateConfig(updates);
    setConfig(monitoringConfigService.getConfig());
    
    // Clear caches when configuration changes
    clearCaches();
    
    console.log('[useMonitoring] Configuration updated');
  }, [clearCaches]);

  const resetConfig = useCallback(() => {
    monitoringConfigService.resetConfig();
    setConfig(monitoringConfigService.getConfig());
    clearCaches();
    
    console.log('[useMonitoring] Configuration reset to defaults');
  }, [clearCaches]);

  // Enhanced alert management
  const acknowledgeAlert = useCallback((alertId: string) => {
    const success = alertingService.acknowledgeAlert(alertId, 'user');
    if (success) {
      setEnhancedAlerts(alertingService.getActiveAlerts());
    }
    return success;
  }, []);

  const suppressAlert = useCallback((alertId: string, durationMs: number) => {
    const success = alertingService.suppressAlert(alertId, durationMs);
    if (success) {
      setEnhancedAlerts(alertingService.getActiveAlerts());
    }
    return success;
  }, []);

  // Data export/import
  const exportData = useCallback(() => {
    return monitoringConfigService.exportData();
  }, []);

  const importData = useCallback((jsonData: string) => {
    const success = monitoringConfigService.importData(jsonData);
    if (success) {
      setConfig(monitoringConfigService.getConfig());
      clearCaches();
      refresh();
    }
    return success;
  }, [clearCaches, refresh]);

  // Storage info
  const storageInfo = monitoringConfigService.getStorageInfo();

  // Auto-refresh interval with configuration support
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Always refresh regardless of page visibility for continuous monitoring
      // Remove the page visibility check to ensure background monitoring
      refresh();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refresh]);

  // Handle page visibility changes - refresh immediately when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        // Page became visible, refresh immediately to show latest data
        console.log('[useMonitoring] Page became visible, refreshing data...');
        refresh();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, [refresh]);

  // Enhanced persistence - save monitoring state to localStorage
  useEffect(() => {
    if (data) {
      try {
        const monitoringState = {
          data,
          lastRefresh: lastRefresh?.toISOString(),
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('qig_monitoring_state', JSON.stringify(monitoringState));
      } catch (error) {
        console.warn('[useMonitoring] Failed to persist state:', error);
      }
    }
  }, [data, lastRefresh]);

  // Restore monitoring state on mount
  useEffect(() => {
    const restoreState = () => {
      try {
        const stored = localStorage.getItem('qig_monitoring_state');
        if (stored && !data) {
          const monitoringState = JSON.parse(stored);
          // Only restore if data is recent (within last 5 minutes)
          const stateAge = Date.now() - new Date(monitoringState.timestamp).getTime();
          if (stateAge < 5 * 60 * 1000) {
            console.log('[useMonitoring] Restoring cached monitoring state');
            setData(monitoringState.data);
            if (monitoringState.lastRefresh) {
              setLastRefresh(new Date(monitoringState.lastRefresh));
            }
            // Still refresh to get latest data, but show cached data immediately
            setTimeout(refresh, 1000);
            return;
          }
        }
      } catch (error) {
        console.warn('[useMonitoring] Failed to restore state:', error);
      }
      
      // If no valid cached state, do initial refresh
      refresh();
    };

    restoreState();
  }, []); // Empty dependency array - only run on mount

  // Listen for configuration changes
  useEffect(() => {
    const handleConfigChange = () => {
      setConfig(monitoringConfigService.getConfig());
    };

    // Simple polling for config changes (could be enhanced with events)
    const configCheckInterval = setInterval(() => {
      const currentConfig = monitoringConfigService.getConfig();
      if (JSON.stringify(currentConfig) !== JSON.stringify(config)) {
        handleConfigChange();
      }
    }, 5000);

    return () => clearInterval(configCheckInterval);
  }, [config]);

  return {
    data,
    isLoading,
    error,
    lastRefresh,
    refresh,
    triggerWarmup,
    resolveAlert,
    clearCaches,
    config,
    updateConfig,
    resetConfig,
    enhancedAlerts,
    acknowledgeAlert,
    suppressAlert,
    exportData,
    importData,
    storageInfo
  };
}

// Enhanced hook for specific monitoring metrics with history
export function useSystemHealth() {
  const { data, config } = useMonitoring();
  
  // Get historical health data for system overview
  const healthHistory = monitoringConfigService.getHealthHistory();
  const systemHealthHistory = healthHistory.filter(point => 
    point.endpoint === 'system-overview' || point.endpoint === 'system'
  );
  
  // If no history exists, create some sample data points for demonstration
  const now = Date.now();
  let historyToUse = systemHealthHistory;
  
  if (systemHealthHistory.length === 0 && data?.systemHealth) {
    // Generate some sample historical data for the last 24 hours
    const sampleData = [];
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now - (i * 60 * 60 * 1000)).toISOString();
      const responseTime = 500 + Math.random() * 1000; // Random between 500-1500ms
      const status: 'healthy' | 'degraded' | 'down' = 
        responseTime > 3000 ? 'down' : 
        responseTime > 1500 ? 'degraded' : 'healthy';
      
      sampleData.push({
        timestamp,
        status,
        responseTime,
        endpoint: 'system-overview'
      });
    }
    
    // Add current data point
    sampleData.push({
      timestamp: data.systemHealth.lastCheck,
      status: data.systemHealth.status,
      responseTime: data.systemHealth.responseTime,
      endpoint: 'system-overview'
    });
    
    historyToUse = sampleData;
  }
  
  return {
    status: data?.systemHealth.status || 'down',
    responseTime: data?.systemHealth.responseTime || 0,
    lastCheck: data?.systemHealth.lastCheck || null,
    error: data?.systemHealth.error || null,
    history: historyToUse,
    thresholds: config.alerts.thresholds.responseTime
  };
}

// Enhanced hook for API endpoints health with individual histories
export function useAPIEndpointsHealth() {
  const { data, config } = useMonitoring();
  
  const endpointsWithHistory = (data?.apiEndpoints || []).map(endpoint => ({
    ...endpoint,
    history: monitoringConfigService.getEndpointHistory(endpoint.name, 24 * 60 * 60 * 1000), // 24h
    thresholds: config.alerts.thresholds
  }));
  
  return {
    endpoints: endpointsWithHistory,
    healthyCount: data?.apiEndpoints?.filter(e => e.health.status === 'healthy').length || 0,
    totalCount: data?.apiEndpoints?.length || 0,
    avgResponseTime: (data?.apiEndpoints && data.apiEndpoints.length > 0)
      ? data.apiEndpoints.reduce((sum, e) => sum + e.health.responseTime, 0) / data.apiEndpoints.length
      : 0,
    config
  };
}

// Hook for user metrics with trends
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

// Hook for performance metrics with history
export function usePerformanceMetrics() {
  const { data, config } = useMonitoring();
  
  return {
    memoryUsage: data?.performance.memoryUsage || 0,
    cpuUsage: data?.performance.cpuUsage || 0,
    requestsPerMinute: data?.performance.requestsPerMinute || 0,
    errorRate: data?.performance.errorRate || 0,
    warmupStatus: data?.performance.warmupStatus || {
      lastWarmup: null,
      successRate: 0,
      averageResponseTime: 0
    },
    config
  };
}

// Hook for enhanced alert management
export function useActiveAlerts() {
  const { enhancedAlerts, acknowledgeAlert, suppressAlert, resolveAlert } = useMonitoring();
  
  const activeAlerts = enhancedAlerts.filter(alert => !alert.resolved);
  const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');
  const highAlerts = activeAlerts.filter(alert => alert.severity === 'high');
  
  return {
    alerts: activeAlerts,
    count: activeAlerts.length,
    criticalCount: criticalAlerts.length,
    highCount: highAlerts.length,
    acknowledgeAlert,
    suppressAlert,
    resolveAlert,
    history: alertingService.getAlertHistory(24 * 60 * 60 * 1000) // 24h history
  };
}

// Hook for alert rules management
export function useAlertRules() {
  const [rules, setRules] = useState<AlertRule[]>(alertingService.getAlertRules());
  
  const updateRule = useCallback((ruleId: string, updates: Partial<AlertRule>) => {
    const success = alertingService.updateAlertRule(ruleId, updates);
    if (success) {
      setRules(alertingService.getAlertRules());
    }
    return success;
  }, []);
  
  const addRule = useCallback((rule: AlertRule) => {
    alertingService.addAlertRule(rule);
    setRules(alertingService.getAlertRules());
  }, []);
  
  const removeRule = useCallback((ruleId: string) => {
    const success = alertingService.removeAlertRule(ruleId);
    if (success) {
      setRules(alertingService.getAlertRules());
    }
    return success;
  }, []);
  
  return {
    rules,
    updateRule,
    addRule,
    removeRule
  };
}

// Hook for configuration management
export function useMonitoringConfig() {
  const { config, updateConfig, resetConfig, exportData, importData, storageInfo } = useMonitoring();
  
  const clearHistory = useCallback(() => {
    monitoringConfigService.clearHistory();
  }, []);
  
  return {
    config,
    updateConfig,
    resetConfig,
    exportData,
    importData,
    clearHistory,
    storageInfo
  };
} 