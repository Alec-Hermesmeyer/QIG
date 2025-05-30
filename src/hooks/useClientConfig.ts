'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { clientConfigService } from '@/services/clientConfigService';
import { ClientConfiguration } from '@/types/client-config';

interface UseClientConfigResult {
  config: ClientConfiguration | null;
  loading: boolean;
  error: string | null;
  refreshConfig: () => Promise<void>;
  hasFeature: (feature: keyof ClientConfiguration['features']) => boolean;
  getBackendUrl: (endpoint?: string) => string;
  isWithinLimits: (checkType: keyof ClientConfiguration['limits'], currentValue: number) => boolean;
}

export function useClientConfig(): UseClientConfigResult {
  const { organization } = useAuth();
  const [config, setConfig] = useState<ClientConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = async () => {
    if (!organization?.id) {
      setConfig(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const clientConfig = await clientConfigService.getClientConfig(organization.id);
      setConfig(clientConfig);
    } catch (err) {
      console.error('Error loading client config:', err);
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const refreshConfig = async () => {
    await loadConfig();
  };

  const hasFeature = (feature: keyof ClientConfiguration['features']): boolean => {
    if (!config?.features) return false;
    return Boolean(config.features[feature]);
  };

  const getBackendUrl = (endpoint?: string): string => {
    if (!config?.backend_config?.api_url) {
      // Fallback to environment variable or default
      const fallbackUrl = process.env.NEXT_PUBLIC_DEFAULT_BACKEND_URL || 
                         'https://capps-backend-vakcnm7wmon74.salmonbush-fc2963f0.eastus.azurecontainerapps.io';
      return endpoint ? `${fallbackUrl}${endpoint}` : fallbackUrl;
    }

    const baseUrl = config.backend_config.api_url;
    
    if (!endpoint) return baseUrl;

    // Check for specific endpoint configurations
    if (endpoint === '/chat' && config.backend_config.chat_endpoint) {
      return `${baseUrl}${config.backend_config.chat_endpoint}`;
    }
    if (endpoint === '/content' && config.backend_config.content_endpoint) {
      return `${baseUrl}${config.backend_config.content_endpoint}`;
    }
    if (endpoint === '/analyze' && config.backend_config.analyze_endpoint) {
      return `${baseUrl}${config.backend_config.analyze_endpoint}`;
    }

    return `${baseUrl}${endpoint}`;
  };

  const isWithinLimits = (checkType: keyof ClientConfiguration['limits'], currentValue: number): boolean => {
    if (!config?.limits) return true; // No limits configured
    
    const limit = config.limits[checkType];
    if (typeof limit !== 'number') return true; // No limit set for this type
    
    return currentValue <= limit;
  };

  // Load config when organization changes
  useEffect(() => {
    loadConfig();
  }, [organization?.id]);

  return {
    config,
    loading,
    error,
    refreshConfig,
    hasFeature,
    getBackendUrl,
    isWithinLimits,
  };
}

// Helper hook for feature flags
export function useFeatureFlags() {
  const { hasFeature } = useClientConfig();
  
  return {
    canUseHandsFreeChat: hasFeature('hands_free_chat'),
    canAnalyzeDocuments: hasFeature('document_analysis'),
    canSearchContracts: hasFeature('contract_search'),
    hasCustomBranding: hasFeature('custom_branding'),
    hasAdvancedAnalytics: hasFeature('advanced_analytics'),
  };
}

// Helper hook for backend URLs
export function useBackendUrls() {
  const { getBackendUrl } = useClientConfig();
  
  return {
    chatUrl: getBackendUrl('/chat'),
    contentUrl: getBackendUrl('/content'),
    analyzeUrl: getBackendUrl('/analyze'),
    baseUrl: getBackendUrl(),
  };
} 