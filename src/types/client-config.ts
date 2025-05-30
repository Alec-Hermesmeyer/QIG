// types/client-config.ts

export interface ClientConfiguration {
  id: string;
  organization_id: string;
  client_name: string;
  client_type: 'default' | 'premium' | 'enterprise' | 'custom';
  
  // Backend Configuration
  backend_config: {
    api_url: string;
    chat_endpoint?: string;
    content_endpoint?: string;
    analyze_endpoint?: string;
  };
  
  // Azure/Authentication Configuration
  azure_config: {
    tenant_id: string;
    client_id: string;
    client_secret?: string; // Will be encrypted in database
    scope?: string;
  };
  
  // Feature Flags
  features: {
    hands_free_chat?: boolean;
    document_analysis?: boolean;
    contract_search?: boolean;
    custom_branding?: boolean;
    advanced_analytics?: boolean;
  };
  
  // UI/UX Configuration
  ui_config: {
    theme_primary_color?: string;
    theme_secondary_color?: string;
    logo_url?: string;
    custom_css?: string;
    layout_preferences?: Record<string, any>;
  };
  
  // Rate Limiting & Quotas
  limits: {
    requests_per_minute?: number;
    requests_per_day?: number;
    max_file_size_mb?: number;
    max_concurrent_sessions?: number;
  };
  
  // Metadata
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  environment: 'development' | 'staging' | 'production';
}

export interface ClientSecret {
  id: string;
  client_config_id: string;
  secret_name: string;
  encrypted_value: string;
  created_at: string;
  expires_at?: string;
}

// Default configurations for different client types
export const DEFAULT_CLIENT_CONFIGS: Record<string, Partial<ClientConfiguration>> = {
  default: {
    client_type: 'default',
    features: {
      hands_free_chat: false,
      document_analysis: true,
      contract_search: true,
      custom_branding: false,
      advanced_analytics: false,
    },
    limits: {
      requests_per_minute: 60,
      requests_per_day: 1000,
      max_file_size_mb: 10,
      max_concurrent_sessions: 5,
    },
  },
  premium: {
    client_type: 'premium',
    features: {
      hands_free_chat: true,
      document_analysis: true,
      contract_search: true,
      custom_branding: true,
      advanced_analytics: true,
    },
    limits: {
      requests_per_minute: 120,
      requests_per_day: 5000,
      max_file_size_mb: 50,
      max_concurrent_sessions: 20,
    },
  },
  enterprise: {
    client_type: 'enterprise',
    features: {
      hands_free_chat: true,
      document_analysis: true,
      contract_search: true,
      custom_branding: true,
      advanced_analytics: true,
    },
    limits: {
      requests_per_minute: 300,
      requests_per_day: 25000,
      max_file_size_mb: 100,
      max_concurrent_sessions: 100,
    },
  },
}; 