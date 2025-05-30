import { supabase } from '@/lib/supabase/client';
import { ClientConfiguration, DEFAULT_CLIENT_CONFIGS } from '@/types/client-config';

class ClientConfigurationService {
  private configCache: Map<string, ClientConfiguration> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get client configuration by organization ID
   */
  async getClientConfig(organizationId: string): Promise<ClientConfiguration | null> {
    // Check cache first
    const cached = this.getFromCache(organizationId);
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('client_configurations')
        .select(`
          *,
          client_secrets (
            secret_name,
            encrypted_value
          )
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching client config:', error);
        return null;
      }

      if (data) {
        // Merge secrets into the config
        const config = this.processConfigWithSecrets(data);
        this.setCache(organizationId, config);
        return config;
      }

      return null;
    } catch (error) {
      console.error('Unexpected error fetching client config:', error);
      return null;
    }
  }

  /**
   * Create a new client configuration
   */
  async createClientConfig(
    organizationId: string,
    clientName: string,
    clientType: 'default' | 'premium' | 'enterprise' | 'custom',
    customConfig?: Partial<ClientConfiguration>
  ): Promise<ClientConfiguration | null> {
    try {
      // Get default config for the client type
      const defaultConfig = DEFAULT_CLIENT_CONFIGS[clientType] || DEFAULT_CLIENT_CONFIGS.default;
      
      // Merge with custom config
      const newConfig = {
        organization_id: organizationId,
        client_name: clientName,
        client_type: clientType,
        backend_config: customConfig?.backend_config || {
          api_url: process.env.NEXT_PUBLIC_DEFAULT_BACKEND_URL || 'https://default-backend.com'
        },
        azure_config: customConfig?.azure_config || {
          tenant_id: '',
          client_id: '',
        },
        features: { ...defaultConfig.features, ...customConfig?.features },
        ui_config: { ...customConfig?.ui_config },
        limits: { ...defaultConfig.limits, ...customConfig?.limits },
        is_active: true,
        environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
        created_by: organizationId, // You might want to use actual user ID
      };

      const { data, error } = await supabase
        .from('client_configurations')
        .insert([newConfig])
        .select()
        .single();

      if (error) {
        console.error('Error creating client config:', error);
        return null;
      }

      // Clear cache to force refresh
      this.clearCache(organizationId);
      
      return data;
    } catch (error) {
      console.error('Unexpected error creating client config:', error);
      return null;
    }
  }

  /**
   * Update client configuration
   */
  async updateClientConfig(
    organizationId: string,
    updates: Partial<ClientConfiguration>
  ): Promise<ClientConfiguration | null> {
    try {
      const { data, error } = await supabase
        .from('client_configurations')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) {
        console.error('Error updating client config:', error);
        return null;
      }

      // Clear cache to force refresh
      this.clearCache(organizationId);
      
      return data;
    } catch (error) {
      console.error('Unexpected error updating client config:', error);
      return null;
    }
  }

  /**
   * Store encrypted secrets for a client configuration
   */
  async storeClientSecret(
    clientConfigId: string,
    secretName: string,
    secretValue: string,
    expiresAt?: Date
  ): Promise<boolean> {
    try {
      // In a real implementation, you'd encrypt the secret value here
      // For now, we'll just store it (YOU SHOULD ENCRYPT THIS!)
      const { error } = await supabase
        .from('client_secrets')
        .upsert([{
          client_config_id: clientConfigId,
          secret_name: secretName,
          encrypted_value: btoa(secretValue), // Basic encoding - USE PROPER ENCRYPTION!
          expires_at: expiresAt?.toISOString(),
        }]);

      if (error) {
        console.error('Error storing client secret:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Unexpected error storing client secret:', error);
      return false;
    }
  }

  /**
   * Get all client configurations (admin only)
   */
  async getAllConfigs(): Promise<ClientConfiguration[]> {
    try {
      const { data, error } = await supabase
        .from('client_configurations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching all configs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Unexpected error fetching all configs:', error);
      return [];
    }
  }

  /**
   * Validate that a client configuration has all required fields
   */
  validateConfig(config: ClientConfiguration): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.organization_id) errors.push('Organization ID is required');
    if (!config.client_name) errors.push('Client name is required');
    if (!config.backend_config?.api_url) errors.push('Backend API URL is required');
    if (!config.azure_config?.tenant_id) errors.push('Azure tenant ID is required');
    if (!config.azure_config?.client_id) errors.push('Azure client ID is required');

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Cache management methods
  private getFromCache(organizationId: string): ClientConfiguration | null {
    const expiry = this.cacheExpiry.get(organizationId);
    if (expiry && Date.now() > expiry) {
      this.clearCache(organizationId);
      return null;
    }
    return this.configCache.get(organizationId) || null;
  }

  private setCache(organizationId: string, config: ClientConfiguration): void {
    this.configCache.set(organizationId, config);
    this.cacheExpiry.set(organizationId, Date.now() + this.CACHE_TTL);
  }

  private clearCache(organizationId: string): void {
    this.configCache.delete(organizationId);
    this.cacheExpiry.delete(organizationId);
  }

  private processConfigWithSecrets(data: any): ClientConfiguration {
    // Process secrets and merge them into the config
    if (data.client_secrets) {
      const secrets: Record<string, string> = {};
      data.client_secrets.forEach((secret: any) => {
        // In a real implementation, you'd decrypt the secret value here
        secrets[secret.secret_name] = atob(secret.encrypted_value); // Basic decoding
      });

      // Merge secrets into azure_config
      if (secrets.client_secret) {
        data.azure_config = {
          ...data.azure_config,
          client_secret: secrets.client_secret
        };
      }
    }

    return data;
  }
}

// Export singleton instance
export const clientConfigService = new ClientConfigurationService();
export default clientConfigService; 