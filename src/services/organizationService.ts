import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { 
  Service, 
  OrganizationService, 
  OrganizationServiceWithDetails, 
  ServiceClientConfig,
  ServiceKey,
  AccessLevel 
} from '@/types/services';

export class OrganizationServiceManager {
  private supabase;

  constructor() {
    this.supabase = createBrowserSupabaseClient();
  }

  // Get all available services
  async getAllServices(): Promise<Service[]> {
    const { data, error } = await this.supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('service_name');

    if (error) {
      console.error('Error fetching services:', error);
      throw error;
    }

    return data || [];
  }

  // Get organization's active services with merged configurations
  async getOrganizationServices(organizationId: string): Promise<OrganizationServiceWithDetails[]> {
    const { data, error } = await this.supabase
      .rpc('get_organization_services', { org_id: organizationId });

    if (error) {
      console.error('Error fetching organization services:', error);
      throw error;
    }

    return data || [];
  }

  // Subscribe organization to a service
  async subscribeToService(
    organizationId: string, 
    serviceId: string, 
    accessLevel: AccessLevel = 'basic',
    subscriptionStart?: Date,
    subscriptionEnd?: Date,
    serviceConfig?: Record<string, any>
  ): Promise<OrganizationService> {
    const { data, error } = await this.supabase
      .from('organization_services')
      .insert([
        {
          organization_id: organizationId,
          service_id: serviceId,
          access_level: accessLevel,
          subscription_start: subscriptionStart?.toISOString().split('T')[0],
          subscription_end: subscriptionEnd?.toISOString().split('T')[0],
          service_config: serviceConfig || {},
          is_active: true,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error subscribing to service:', error);
      throw error;
    }

    return data;
  }

  // Update organization service subscription
  async updateServiceSubscription(
    organizationId: string,
    serviceId: string,
    updates: Partial<OrganizationService>
  ): Promise<OrganizationService> {
    const { data, error } = await this.supabase
      .from('organization_services')
      .update(updates)
      .eq('organization_id', organizationId)
      .eq('service_id', serviceId)
      .select()
      .single();

    if (error) {
      console.error('Error updating service subscription:', error);
      throw error;
    }

    return data;
  }

  // Unsubscribe from service
  async unsubscribeFromService(organizationId: string, serviceId: string): Promise<void> {
    const { error } = await this.supabase
      .from('organization_services')
      .update({ is_active: false })
      .eq('organization_id', organizationId)
      .eq('service_id', serviceId);

    if (error) {
      console.error('Error unsubscribing from service:', error);
      throw error;
    }
  }

  // Get client configuration for a specific service
  async getServiceClientConfig(
    organizationId: string, 
    serviceKey: ServiceKey, 
    environment: string = 'production'
  ): Promise<ServiceClientConfig | null> {
    const { data, error } = await this.supabase
      .rpc('get_service_client_config', { 
        org_id: organizationId, 
        service_key_param: serviceKey, 
        env: environment 
      });

    if (error) {
      console.error('Error fetching service client config:', error);
      throw error;
    }

    return data?.[0] || null;
  }

  // Create client configuration for a service
  async createServiceClientConfig(
    organizationId: string,
    serviceId: string,
    clientName: string,
    clientType: string,
    config: {
      backend_config: Record<string, any>;
      azure_config: Record<string, any>;
      features?: Record<string, any>;
      ui_config?: Record<string, any>;
      limits?: Record<string, any>;
    },
    environment: string = 'production'
  ): Promise<any> {
    const { data, error } = await this.supabase
      .from('client_configurations')
      .insert([
        {
          organization_id: organizationId,
          service_id: serviceId,
          client_name: clientName,
          client_type: clientType,
          backend_config: config.backend_config,
          azure_config: config.azure_config,
          features: config.features || {},
          ui_config: config.ui_config || {},
          limits: config.limits || {},
          environment: environment,
          is_active: true,
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating service client config:', error);
      throw error;
    }

    return data;
  }

  // Get service by key
  async getServiceByKey(serviceKey: ServiceKey): Promise<Service | null> {
    const { data, error } = await this.supabase
      .from('services')
      .select('*')
      .eq('service_key', serviceKey)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return null;
      }
      console.error('Error fetching service by key:', error);
      throw error;
    }

    return data;
  }

  // Get organization overview (which services they have access to)
  async getOrganizationServiceOverview(organizationId?: string): Promise<any[]> {
    let query = this.supabase.from('organization_service_overview').select('*');
    
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query.order('organization_name', { ascending: true });

    if (error) {
      console.error('Error fetching organization service overview:', error);
      throw error;
    }

    return data || [];
  }

  // Bulk subscribe organization to multiple services
  async bulkSubscribeToServices(
    organizationId: string,
    serviceSubscriptions: Array<{
      serviceId: string;
      accessLevel: AccessLevel;
      subscriptionStart?: Date;
      subscriptionEnd?: Date;
      serviceConfig?: Record<string, any>;
    }>
  ): Promise<OrganizationService[]> {
    const subscriptions = serviceSubscriptions.map(sub => ({
      organization_id: organizationId,
      service_id: sub.serviceId,
      access_level: sub.accessLevel,
      subscription_start: sub.subscriptionStart?.toISOString().split('T')[0],
      subscription_end: sub.subscriptionEnd?.toISOString().split('T')[0],
      service_config: sub.serviceConfig || {},
      is_active: true,
    }));

    const { data, error } = await this.supabase
      .from('organization_services')
      .insert(subscriptions)
      .select();

    if (error) {
      console.error('Error bulk subscribing to services:', error);
      throw error;
    }

    return data || [];
  }

  // Check if organization has access to a specific service
  async hasServiceAccess(organizationId: string, serviceKey: ServiceKey): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('organization_services')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .in('service_id', [
        this.supabase
          .from('services')
          .select('id')
          .eq('service_key', serviceKey)
          .eq('is_active', true)
      ])
      .limit(1);

    if (error) {
      console.error('Error checking service access:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  }
}

// Export singleton instance
export const organizationServiceManager = new OrganizationServiceManager(); 