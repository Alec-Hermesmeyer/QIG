'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseServiceStatusService } from '@/services/supabaseServiceStatusService';
import { 
  QIGService, 
  ServiceUpdate, 
  ServiceMetrics, 
  ServiceStatus, 
  ServiceCategory,
  ServicePriority,
  UpdateType 
} from '@/types/services';

export interface UseServiceStatusOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UseServiceStatusReturn {
  services: QIGService[];
  metrics: ServiceMetrics;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createService: (serviceData: Omit<QIGService, 'id' | 'createdAt' | 'lastUpdated'>) => Promise<QIGService>;
  updateService: (id: string, serviceData: Partial<QIGService>) => Promise<QIGService>;
  deleteService: (id: string) => Promise<boolean>;
  updateServiceStatus: (id: string, status: ServiceStatus, progress?: number) => Promise<boolean>;
  exportData: () => Promise<string>;
  importData: (jsonData: string) => Promise<boolean>;
}

export function useServiceStatus(options: UseServiceStatusOptions = {}): UseServiceStatusReturn {
  const { autoRefresh = false, refreshInterval = 30000 } = options;
  
  const [services, setServices] = useState<QIGService[]>([]);
  const [metrics, setMetrics] = useState<ServiceMetrics>({
    totalServices: 0,
    servicesByStatus: {} as Record<ServiceStatus, number>,
    servicesByCategory: {} as Record<ServiceCategory, number>,
    completionRate: 0,
    upcomingDeadlines: [],
    recentUpdates: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use refs to track mounted state and prevent race conditions
  const isMountedRef = useRef(true);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Load data from service with better error handling and race condition prevention
  const loadData = useCallback(async () => {
    // Clear any existing timeout
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    // Set loading with a timeout to prevent infinite loading
    if (isMountedRef.current) {
      setIsLoading(true);
      setError(null);
    }

    // Set a timeout to force loading to false if it takes too long
    loadingTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setIsLoading(false);
        setError('Request timed out. Please try refreshing the page.');
      }
    }, 30000); // 30 second timeout

    try {
      const [allServices, serviceMetrics] = await Promise.all([
        supabaseServiceStatusService.getAllServices(),
        supabaseServiceStatusService.getServiceMetrics()
      ]);
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setServices(allServices);
        setMetrics(serviceMetrics);
        setError(null);
        retryCountRef.current = 0; // Reset retry count on success
      }
    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('Service status loading error:', err);
        
        // Implement retry logic for failed requests
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          console.log(`Retrying data fetch (attempt ${retryCountRef.current}/${maxRetries})`);
          
          // Retry with exponential backoff
          setTimeout(() => {
            if (isMountedRef.current) {
              loadData();
            }
          }, Math.pow(2, retryCountRef.current) * 1000);
          return;
        }
        
        setError(errorMessage);
      }
    } finally {
      // Clear timeout and set loading to false
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []); // Remove dependencies to prevent infinite loops

  // Initial load with proper cleanup
  useEffect(() => {
    isMountedRef.current = true;
    loadData();

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []); // Empty dependency array for initial load only

  // Auto-refresh interval with proper cleanup
  useEffect(() => {
    if (!autoRefresh || !isMountedRef.current) return;

    const interval = setInterval(() => {
      if (isMountedRef.current && !isLoading) {
        loadData();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isLoading, loadData]);

  // Service management functions with better error handling
  const createService = useCallback(async (serviceData: Omit<QIGService, 'id' | 'createdAt' | 'lastUpdated'>) => {
    try {
      const newService = await supabaseServiceStatusService.saveService(serviceData);
      // Only refresh if component is still mounted
      if (isMountedRef.current) {
        await loadData();
      }
      return newService;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create service';
      if (isMountedRef.current) {
        setError(errorMessage);
      }
      throw err;
    }
  }, [loadData]);

  const updateService = useCallback(async (id: string, serviceData: Partial<QIGService>) => {
    try {
      // Get existing service to merge with updates
      const existingService = await supabaseServiceStatusService.getServiceById(id);
      if (!existingService) {
        throw new Error('Service not found');
      }
      
      const updatedService = await supabaseServiceStatusService.saveService({ 
        ...existingService, 
        ...serviceData, 
        id 
      });
      
      // Only refresh if component is still mounted
      if (isMountedRef.current) {
        await loadData();
      }
      return updatedService;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update service';
      if (isMountedRef.current) {
        setError(errorMessage);
      }
      throw err;
    }
  }, [loadData]);

  const deleteService = useCallback(async (id: string) => {
    try {
      const success = await supabaseServiceStatusService.deleteService(id);
      if (success && isMountedRef.current) {
        await loadData();
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete service';
      if (isMountedRef.current) {
        setError(errorMessage);
      }
      throw err;
    }
  }, [loadData]);

  const updateServiceStatus = useCallback(async (id: string, status: ServiceStatus, progress?: number) => {
    try {
      const success = await supabaseServiceStatusService.updateServiceStatus(id, status, progress);
      if (success && isMountedRef.current) {
        await loadData();
      }
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update service status';
      if (isMountedRef.current) {
        setError(errorMessage);
      }
      throw err;
    }
  }, [loadData]);

  const exportData = useCallback(async () => {
    try {
      return await supabaseServiceStatusService.exportData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export data';
      if (isMountedRef.current) {
        setError(errorMessage);
      }
      throw err;
    }
  }, []);

  const importData = useCallback(async (jsonData: string) => {
    try {
      // For now, we'll just implement a basic import
      // In a full implementation, you'd parse and validate the data
      if (isMountedRef.current) {
        await loadData();
      }
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import data';
      if (isMountedRef.current) {
        setError(errorMessage);
      }
      return false;
    }
  }, [loadData]);

  const refresh = useCallback(async () => {
    if (isMountedRef.current) {
      retryCountRef.current = 0; // Reset retry count on manual refresh
      await loadData();
    }
  }, [loadData]);

  return {
    services,
    metrics,
    isLoading,
    error,
    refresh,
    createService,
    updateService,
    deleteService,
    updateServiceStatus,
    exportData,
    importData
  };
}

// Hook for service details with updates
export function useServiceDetails(serviceId: string) {
  const [updates, setUpdates] = useState<ServiceUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUpdates = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const serviceUpdates = await supabaseServiceStatusService.getServiceUpdates(serviceId);
      setUpdates(serviceUpdates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load service updates');
    } finally {
      setIsLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    if (serviceId) {
      loadUpdates();
    }
  }, [serviceId, loadUpdates]);

  const addUpdate = useCallback(async (update: Omit<ServiceUpdate, 'id' | 'timestamp'>) => {
    try {
      await supabaseServiceStatusService.addServiceUpdate({ ...update, serviceId });
      await loadUpdates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add update');
      throw err;
    }
  }, [serviceId, loadUpdates]);

  return {
    updates,
    isLoading,
    error,
    addUpdate,
    refresh: loadUpdates
  };
}

// Hook for filtering services
export function useServiceFilters() {
  const { services } = useServiceStatus();
  
  const getServicesByStatus = useCallback((status: ServiceStatus) => {
    return services.filter(service => service.status === status);
  }, [services]);

  const getServicesByCategory = useCallback((category: ServiceCategory) => {
    return services.filter(service => service.category === category);
  }, [services]);

  const getServicesByPriority = useCallback((priority: ServicePriority) => {
    return services.filter(service => service.priority === priority);
  }, [services]);

  const getClientFacingServices = useCallback(() => {
    return services.filter(service => service.clientFacing);
  }, [services]);

  const getInternalServices = useCallback(() => {
    return services.filter(service => service.internalOnly);
  }, [services]);

  const getServicesInDevelopment = useCallback(() => {
    return services.filter(service => 
      ['PLANNING', 'IN_DEVELOPMENT', 'TESTING', 'BETA'].includes(service.status)
    );
  }, [services]);

  const getLiveServices = useCallback(() => {
    return services.filter(service => service.status === 'LIVE');
  }, [services]);

  return {
    getServicesByStatus,
    getServicesByCategory,
    getServicesByPriority,
    getClientFacingServices,
    getInternalServices,
    getServicesInDevelopment,
    getLiveServices
  };
}

// Hook for analytics
export function useServiceAnalytics() {
  const { services } = useServiceStatus();
  
  const calculateAnalytics = useCallback(() => {
    const totalServices = services.length;
    
    // Calculate development velocity (services launched in last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const developmentVelocity = services.filter(service => 
      service.actualLaunchDate && 
      new Date(service.actualLaunchDate).getTime() > thirtyDaysAgo
    ).length;
    
    // Calculate average time to launch
    const launchedServices = services.filter(service => 
      service.actualLaunchDate && service.createdAt
    );
    const totalTimeToLaunch = launchedServices.reduce((sum, service) => {
      const created = new Date(service.createdAt).getTime();
      const launched = new Date(service.actualLaunchDate!).getTime();
      return sum + (launched - created);
    }, 0);
    const averageTimeToLaunch = launchedServices.length > 0 
      ? totalTimeToLaunch / (launchedServices.length * 24 * 60 * 60 * 1000) 
      : 0;
    
    // Calculate completion rate
    const totalProgress = services.reduce((sum, service) => sum + service.progress, 0);
    const completionRate = totalServices > 0 ? totalProgress / totalServices : 0;
    
    // Determine overall health
    const liveServices = services.filter(s => s.status === 'LIVE').length;
    const healthPercentage = totalServices > 0 ? (liveServices / totalServices) * 100 : 0;
    const overallHealth = healthPercentage >= 80 ? 'excellent' : 
                         healthPercentage >= 60 ? 'good' : 'needs-attention';
    
    return {
      developmentVelocity,
      averageTimeToLaunch,
      completionRate,
      overallHealth
    };
  }, [services]);
  
  return calculateAnalytics();
} 