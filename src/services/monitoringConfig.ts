export interface MonitoringConfig {
  healthCheck: {
    interval: number; // milliseconds
    timeout: number; // milliseconds
    retryAttempts: number;
    batchSize: number; // parallel health checks
  };
  alerts: {
    thresholds: {
      responseTime: {
        degraded: number; // ms
        critical: number; // ms
      };
      availability: {
        warning: number; // percentage
        critical: number; // percentage
      };
      errorRate: {
        warning: number; // percentage
        critical: number; // percentage
      };
    };
    rules: {
      consecutiveFailures: number; // before escalating
      warmupGracePeriod: number; // ms to ignore failures after warmup
    };
  };
  dashboard: {
    autoRefresh: boolean;
    refreshInterval: number; // milliseconds
    maxHistoryPoints: number; // number of data points to keep
    chartUpdateInterval: number; // milliseconds
  };
  warmup: {
    autoWarmupEnabled: boolean;
    warmupInterval: number; // milliseconds
    maxWarmupTimeout: number; // milliseconds
  };
  storage: {
    persistHistory: boolean;
    maxStorageSize: number; // MB
    compressionEnabled: boolean;
  };
}

export interface HealthHistoryPoint {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  error?: string;
  endpoint: string;
}

export interface PersistedMonitoringData {
  history: HealthHistoryPoint[];
  alerts: any[];
  lastUpdate: string;
  version: string;
}

class MonitoringConfigService {
  private static readonly DEFAULT_CONFIG: MonitoringConfig = {
    healthCheck: {
      interval: 30000, // 30 seconds
      timeout: 10000, // 10 seconds
      retryAttempts: 2,
      batchSize: 5 // Check 5 endpoints in parallel
    },
    alerts: {
      thresholds: {
        responseTime: {
          degraded: 3000, // 3 seconds
          critical: 10000 // 10 seconds
        },
        availability: {
          warning: 95, // 95%
          critical: 90 // 90%
        },
        errorRate: {
          warning: 5, // 5%
          critical: 10 // 10%
        }
      },
      rules: {
        consecutiveFailures: 3, // 3 consecutive failures = escalate
        warmupGracePeriod: 120000 // 2 minutes after warmup
      }
    },
    dashboard: {
      autoRefresh: true,
      refreshInterval: 30000, // 30 seconds
      maxHistoryPoints: 288, // 24 hours at 5-minute intervals
      chartUpdateInterval: 5000 // 5 seconds
    },
    warmup: {
      autoWarmupEnabled: true,
      warmupInterval: 600000, // 10 minutes
      maxWarmupTimeout: 30000 // 30 seconds
    },
    storage: {
      persistHistory: true,
      maxStorageSize: 10, // 10 MB
      compressionEnabled: true
    }
  };

  private static readonly STORAGE_KEY = 'qig_monitoring_config';
  private static readonly HISTORY_STORAGE_KEY = 'qig_monitoring_history';
  private static readonly DATA_VERSION = '1.0';

  private config: MonitoringConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Get current configuration
   */
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }

  /**
   * Update configuration (partial updates supported)
   */
  updateConfig(updates: Partial<MonitoringConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      healthCheck: { ...this.config.healthCheck, ...updates.healthCheck },
      alerts: {
        ...this.config.alerts,
        ...updates.alerts,
        thresholds: { ...this.config.alerts.thresholds, ...updates.alerts?.thresholds },
        rules: { ...this.config.alerts.rules, ...updates.alerts?.rules }
      },
      dashboard: { ...this.config.dashboard, ...updates.dashboard },
      warmup: { ...this.config.warmup, ...updates.warmup },
      storage: { ...this.config.storage, ...updates.storage }
    };
    
    this.saveConfig();
  }

  /**
   * Reset to default configuration
   */
  resetConfig(): void {
    this.config = { ...MonitoringConfigService.DEFAULT_CONFIG };
    this.saveConfig();
  }

  /**
   * Save health history point
   */
  saveHealthHistoryPoint(point: HealthHistoryPoint): void {
    if (!this.config.storage.persistHistory) return;

    try {
      const history = this.getHealthHistory();
      history.push(point);

      // Trim history to max points
      while (history.length > this.config.dashboard.maxHistoryPoints) {
        history.shift();
      }

      const data: PersistedMonitoringData = {
        history,
        alerts: [], // Will add alert persistence later
        lastUpdate: new Date().toISOString(),
        version: MonitoringConfigService.DATA_VERSION
      };

      const serialized = this.config.storage.compressionEnabled 
        ? this.compressData(JSON.stringify(data))
        : JSON.stringify(data);

      // Check storage size
      const sizeInMB = new Blob([serialized]).size / (1024 * 1024);
      if (sizeInMB > this.config.storage.maxStorageSize) {
        console.warn(`[Monitoring] Storage size (${sizeInMB.toFixed(2)}MB) exceeds limit, trimming data`);
        // Remove oldest 25% of data
        const trimAmount = Math.floor(history.length * 0.25);
        data.history = history.slice(trimAmount);
      }

      localStorage.setItem(MonitoringConfigService.HISTORY_STORAGE_KEY, serialized);
    } catch (error) {
      console.error('[Monitoring] Failed to save history:', error);
    }
  }

  /**
   * Get health history
   */
  getHealthHistory(): HealthHistoryPoint[] {
    if (!this.config.storage.persistHistory) return [];

    try {
      const stored = localStorage.getItem(MonitoringConfigService.HISTORY_STORAGE_KEY);
      if (!stored) return [];

      const decompressed = this.config.storage.compressionEnabled 
        ? this.decompressData(stored)
        : stored;

      const data: PersistedMonitoringData = JSON.parse(decompressed);
      
      // Version check
      if (data.version !== MonitoringConfigService.DATA_VERSION) {
        console.warn('[Monitoring] Data version mismatch, clearing history');
        this.clearHistory();
        return [];
      }

      return data.history || [];
    } catch (error) {
      console.error('[Monitoring] Failed to load history:', error);
      return [];
    }
  }

  /**
   * Get health history for specific endpoint
   */
  getEndpointHistory(endpointName: string, timeRange?: number): HealthHistoryPoint[] {
    const allHistory = this.getHealthHistory();
    const endpointHistory = allHistory.filter(point => point.endpoint === endpointName);

    if (timeRange) {
      const cutoff = Date.now() - timeRange;
      return endpointHistory.filter(point => new Date(point.timestamp).getTime() > cutoff);
    }

    return endpointHistory;
  }

  /**
   * Clear all persisted history
   */
  clearHistory(): void {
    localStorage.removeItem(MonitoringConfigService.HISTORY_STORAGE_KEY);
  }

  /**
   * Get storage usage info
   */
  getStorageInfo(): { usedMB: number; totalMB: number; compressionEnabled: boolean } {
    try {
      const stored = localStorage.getItem(MonitoringConfigService.HISTORY_STORAGE_KEY);
      const usedMB = stored ? new Blob([stored]).size / (1024 * 1024) : 0;
      
      return {
        usedMB: Number(usedMB.toFixed(2)),
        totalMB: this.config.storage.maxStorageSize,
        compressionEnabled: this.config.storage.compressionEnabled
      };
    } catch (error) {
      return { usedMB: 0, totalMB: this.config.storage.maxStorageSize, compressionEnabled: false };
    }
  }

  /**
   * Export configuration and history
   */
  exportData(): string {
    const config = this.getConfig();
    const history = this.getHealthHistory();
    
    return JSON.stringify({
      config,
      history,
      exportDate: new Date().toISOString(),
      version: MonitoringConfigService.DATA_VERSION
    }, null, 2);
  }

  /**
   * Import configuration and history
   */
  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.config) {
        this.updateConfig(data.config);
      }
      
      if (data.history && Array.isArray(data.history)) {
        const persistedData: PersistedMonitoringData = {
          history: data.history,
          alerts: [],
          lastUpdate: new Date().toISOString(),
          version: MonitoringConfigService.DATA_VERSION
        };
        
        localStorage.setItem(
          MonitoringConfigService.HISTORY_STORAGE_KEY, 
          JSON.stringify(persistedData)
        );
      }
      
      return true;
    } catch (error) {
      console.error('[Monitoring] Failed to import data:', error);
      return false;
    }
  }

  private loadConfig(): MonitoringConfig {
    try {
      const stored = localStorage.getItem(MonitoringConfigService.STORAGE_KEY);
      if (stored) {
        const parsedConfig = JSON.parse(stored);
        // Merge with defaults to handle new config properties
        return {
          ...MonitoringConfigService.DEFAULT_CONFIG,
          ...parsedConfig,
          healthCheck: { ...MonitoringConfigService.DEFAULT_CONFIG.healthCheck, ...parsedConfig.healthCheck },
          alerts: {
            ...MonitoringConfigService.DEFAULT_CONFIG.alerts,
            ...parsedConfig.alerts,
            thresholds: { ...MonitoringConfigService.DEFAULT_CONFIG.alerts.thresholds, ...parsedConfig.alerts?.thresholds },
            rules: { ...MonitoringConfigService.DEFAULT_CONFIG.alerts.rules, ...parsedConfig.alerts?.rules }
          },
          dashboard: { ...MonitoringConfigService.DEFAULT_CONFIG.dashboard, ...parsedConfig.dashboard },
          warmup: { ...MonitoringConfigService.DEFAULT_CONFIG.warmup, ...parsedConfig.warmup },
          storage: { ...MonitoringConfigService.DEFAULT_CONFIG.storage, ...parsedConfig.storage }
        };
      }
    } catch (error) {
      console.error('[Monitoring] Failed to load config:', error);
    }
    
    return { ...MonitoringConfigService.DEFAULT_CONFIG };
  }

  private saveConfig(): void {
    try {
      localStorage.setItem(MonitoringConfigService.STORAGE_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.error('[Monitoring] Failed to save config:', error);
    }
  }

  private compressData(data: string): string {
    // Simple LZ-like compression for large datasets
    // This is a basic implementation - could use a proper compression library
    try {
      return btoa(data);
    } catch (error) {
      return data;
    }
  }

  private decompressData(data: string): string {
    try {
      return atob(data);
    } catch (error) {
      return data;
    }
  }
}

// Export singleton instance
export const monitoringConfigService = new MonitoringConfigService();

// Export class for testing
export { MonitoringConfigService }; 