// Types for service-based configuration system

export interface Service {
  id: string;
  service_name: string;
  service_key: ServiceKey;
  display_name: string;
  description: string;
  default_features: Record<string, any>;
  default_limits: Record<string, any>;
  default_ui_config: ServiceUIConfig;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ServiceKey = 'contract-analyst' | 'open-records' | 'insurance-broker';

export interface ServiceUIConfig {
  theme_primary_color: string;
  theme_secondary_color: string;
  service_icon: string;
  sidebar_color: string;
}

export interface OrganizationService {
  id: string;
  organization_id: string;
  service_id: string;
  service_config: Record<string, any>;
  is_active: boolean;
  access_level: AccessLevel;
  subscription_start?: string;
  subscription_end?: string;
  created_at: string;
  updated_at: string;
}

export type AccessLevel = 'basic' | 'standard' | 'premium' | 'enterprise';

export interface OrganizationServiceWithDetails {
  service_id: string;
  service_key: ServiceKey;
  service_name: string;
  display_name: string;
  description: string;
  access_level: AccessLevel;
  is_active: boolean;
  merged_features: Record<string, any>;
  merged_limits: Record<string, any>;
  merged_ui_config: ServiceUIConfig;
  service_config: Record<string, any>;
  subscription_start?: string;
  subscription_end?: string;
}

export interface ServiceClientConfig {
  config_id: string;
  organization_id: string;
  service_id: string;
  service_key: ServiceKey;
  client_name: string;
  client_type: string;
  backend_config: Record<string, any>;
  azure_config: Record<string, any>;
  features: Record<string, any>;
  ui_config: Record<string, any>;
  limits: Record<string, any>;
  secrets: Record<string, any>;
}

// Service-specific feature definitions
export interface ContractAnalystFeatures {
  contract_analysis: boolean;
  clause_extraction: boolean;
  risk_assessment: boolean;
  template_matching: boolean;
  compliance_checking: boolean;
  redline_comparison: boolean;
  bulk_processing: boolean;
  custom_workflows: boolean;
  advanced_analytics: boolean;
}

export interface OpenRecordsFeatures {
  document_search: boolean;
  metadata_extraction: boolean;
  redaction_tools: boolean;
  foia_processing: boolean;
  batch_operations: boolean;
  audit_trails: boolean;
  public_portal: boolean;
  advanced_redaction: boolean;
  ml_classification: boolean;
}

export interface InsuranceBrokerFeatures {
  policy_analysis: boolean;
  coverage_comparison: boolean;
  risk_assessment: boolean;
  premium_calculation: boolean;
  claims_processing: boolean;
  client_portal: boolean;
  automated_quotes: boolean;
  advanced_underwriting: boolean;
  integration_apis: boolean;
}

// Service-specific limits
export interface ServiceLimits {
  requests_per_minute: number;
  requests_per_day: number;
  max_file_size_mb: number;
  max_concurrent_sessions: number;
  // Service-specific limits
  contracts_per_month?: number; // Contract Analyst
  records_per_month?: number;   // Open Records
  policies_per_month?: number;  // Insurance Broker
}

// Default configurations per service
export const SERVICE_DEFAULTS: Record<ServiceKey, {
  features: Record<string, any>;
  limits: ServiceLimits;
  ui_config: ServiceUIConfig;
}> = {
  'contract-analyst': {
    features: {
      contract_analysis: true,
      clause_extraction: true,
      risk_assessment: true,
      template_matching: true,
      compliance_checking: true,
      redline_comparison: true,
      bulk_processing: false,
      custom_workflows: false,
      advanced_analytics: false,
    } as ContractAnalystFeatures,
    limits: {
      requests_per_minute: 30,
      requests_per_day: 500,
      max_file_size_mb: 25,
      max_concurrent_sessions: 3,
      contracts_per_month: 100,
    },
    ui_config: {
      theme_primary_color: '#059669',
      theme_secondary_color: '#064e3b',
      service_icon: 'FileText',
      sidebar_color: '#065f46',
    },
  },
  'open-records': {
    features: {
      document_search: true,
      metadata_extraction: true,
      redaction_tools: true,
      foia_processing: true,
      batch_operations: true,
      audit_trails: true,
      public_portal: false,
      advanced_redaction: false,
      ml_classification: false,
    } as OpenRecordsFeatures,
    limits: {
      requests_per_minute: 50,
      requests_per_day: 800,
      max_file_size_mb: 100,
      max_concurrent_sessions: 5,
      records_per_month: 1000,
    },
    ui_config: {
      theme_primary_color: '#2563eb',
      theme_secondary_color: '#1e3a8a',
      service_icon: 'Archive',
      sidebar_color: '#1d4ed8',
    },
  },
  'insurance-broker': {
    features: {
      policy_analysis: true,
      coverage_comparison: true,
      risk_assessment: true,
      premium_calculation: true,
      claims_processing: true,
      client_portal: true,
      automated_quotes: false,
      advanced_underwriting: false,
      integration_apis: false,
    } as InsuranceBrokerFeatures,
    limits: {
      requests_per_minute: 40,
      requests_per_day: 600,
      max_file_size_mb: 15,
      max_concurrent_sessions: 4,
      policies_per_month: 200,
    },
    ui_config: {
      theme_primary_color: '#dc2626',
      theme_secondary_color: '#991b1b',
      service_icon: 'Shield',
      sidebar_color: '#b91c1c',
    },
  },
};

export const SERVICE_NAMES: Record<ServiceKey, string> = {
  'contract-analyst': 'Contract Analyst',
  'open-records': 'Open Records',
  'insurance-broker': 'Insurance Broker',
}; 