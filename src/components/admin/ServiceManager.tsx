'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { organizationServiceManager } from '@/services/organizationService';
import { 
  Service, 
  OrganizationServiceWithDetails, 
  ServiceKey, 
  AccessLevel,
  SERVICE_NAMES 
} from '@/types/services';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { 
  FileText, 
  Archive, 
  Shield, 
  Plus, 
  Trash2, 
  Settings, 
  Building2,
  RefreshCw 
} from 'lucide-react';

const ServiceIcon = ({ serviceKey }: { serviceKey: ServiceKey }) => {
  switch (serviceKey) {
    case 'contract-analyst':
      return <FileText className="h-5 w-5" />;
    case 'open-records':
      return <Archive className="h-5 w-5" />;
    case 'insurance-broker':
      return <Shield className="h-5 w-5" />;
    default:
      return <Settings className="h-5 w-5" />;
  }
};

const AccessLevelBadge = ({ level }: { level: AccessLevel }) => {
  const variants = {
    basic: 'default',
    standard: 'secondary',
    premium: 'default',
    enterprise: 'default'
  } as const;

  const colors = {
    basic: 'bg-gray-100 text-gray-800',
    standard: 'bg-blue-100 text-blue-800',
    premium: 'bg-purple-100 text-purple-800',
    enterprise: 'bg-emerald-100 text-emerald-800'
  };

  return (
    <Badge variant={variants[level]} className={colors[level]}>
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </Badge>
  );
};

export function ServiceManager() {
  const { organization, user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [organizationServices, setOrganizationServices] = useState<OrganizationServiceWithDetails[]>([]);
  const [allOrganizationOverview, setAllOrganizationOverview] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('current');

  useEffect(() => {
    loadData();
  }, [organization?.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all available services
      const allServices = await organizationServiceManager.getAllServices();
      setServices(allServices);

      if (organization?.id) {
        // Load organization's services
        const orgServices = await organizationServiceManager.getOrganizationServices(organization.id);
        setOrganizationServices(orgServices);
      }

      // Load overview of all organizations (admin view)
      const overview = await organizationServiceManager.getOrganizationServiceOverview();
      setAllOrganizationOverview(overview);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load service data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribeToService = async (serviceId: string, accessLevel: AccessLevel = 'basic') => {
    if (!organization?.id) return;

    try {
      await organizationServiceManager.subscribeToService(
        organization.id,
        serviceId,
        accessLevel
      );
      
      toast({
        title: 'Success',
        description: 'Subscribed to service successfully',
      });
      
      await loadData(); // Refresh
    } catch (error) {
      console.error('Error subscribing to service:', error);
      toast({
        title: 'Error',
        description: 'Failed to subscribe to service',
        variant: 'destructive',
      });
    }
  };

  const handleUnsubscribeFromService = async (serviceId: string) => {
    if (!organization?.id) return;

    try {
      await organizationServiceManager.unsubscribeFromService(organization.id, serviceId);
      
      toast({
        title: 'Success',
        description: 'Unsubscribed from service successfully',
      });
      
      await loadData(); // Refresh
    } catch (error) {
      console.error('Error unsubscribing from service:', error);
      toast({
        title: 'Error',
        description: 'Failed to unsubscribe from service',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateAccessLevel = async (serviceId: string, accessLevel: AccessLevel) => {
    if (!organization?.id) return;

    try {
      await organizationServiceManager.updateServiceSubscription(
        organization.id,
        serviceId,
        { access_level: accessLevel }
      );
      
      toast({
        title: 'Success',
        description: 'Access level updated successfully',
      });
      
      await loadData(); // Refresh
    } catch (error) {
      console.error('Error updating access level:', error);
      toast({
        title: 'Error',
        description: 'Failed to update access level',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading services...</span>
      </div>
    );
  }

  const subscribedServiceIds = new Set(organizationServices.map(s => s.service_id));
  const availableServices = services.filter(s => !subscribedServiceIds.has(s.id));

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Service Management</h1>
        <p className="text-gray-600 mt-2">
          Manage organization access to Contract Analyst, Open Records, and Insurance Broker services
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current">Current Services</TabsTrigger>
          <TabsTrigger value="available">Available Services</TabsTrigger>
          <TabsTrigger value="overview">All Organizations</TabsTrigger>
        </TabsList>

        {/* Current Services Tab */}
        <TabsContent value="current" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                {organization?.name} - Active Services
              </CardTitle>
              <CardDescription>
                Services your organization currently has access to
              </CardDescription>
            </CardHeader>
            <CardContent>
              {organizationServices.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No active services</p>
                  <Button 
                    onClick={() => setActiveTab('available')}
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Subscribe to Services
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {organizationServices.map((service) => (
                    <div key={service.service_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div 
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: service.merged_ui_config.theme_primary_color + '20' }}
                        >
                          <ServiceIcon serviceKey={service.service_key} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{service.display_name}</h3>
                          <p className="text-sm text-gray-600">{service.description}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <AccessLevelBadge level={service.access_level} />
                            {service.subscription_end && (
                              <Badge variant="outline" className="text-xs">
                                Expires: {new Date(service.subscription_end).toLocaleDateString()}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Select
                          value={service.access_level}
                          onValueChange={(value) => handleUpdateAccessLevel(service.service_id, value as AccessLevel)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="basic">Basic</SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnsubscribeFromService(service.service_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Available Services Tab */}
        <TabsContent value="available" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Available Services</CardTitle>
              <CardDescription>
                Subscribe to additional services for your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {availableServices.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">All available services are already subscribed</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {availableServices.map((service) => (
                    <div key={service.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div 
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: service.default_ui_config.theme_primary_color + '20' }}
                        >
                          <ServiceIcon serviceKey={service.service_key} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{service.display_name}</h3>
                          <p className="text-sm text-gray-600">{service.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Select
                          defaultValue="basic"
                          onValueChange={(value) => handleSubscribeToService(service.id, value as AccessLevel)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="basic">Basic</SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="premium">Premium</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          onClick={() => handleSubscribeToService(service.id, 'basic')}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Subscribe
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Organization Service Overview</CardTitle>
              <CardDescription>
                View all organizations and their service subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(
                  allOrganizationOverview.reduce((acc, item) => {
                    if (!acc[item.organization_name]) {
                      acc[item.organization_name] = [];
                    }
                    acc[item.organization_name].push(item);
                    return acc;
                  }, {} as Record<string, any[]>)
                ).map(([orgName, services]) => (
                  <div key={orgName} className="border rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-3 flex items-center">
                      <Building2 className="h-5 w-5 mr-2" />
                      {orgName}
                    </h3>
                    <div className="grid gap-2">
                      {(services as any[]).map((service: any) => (
                        <div key={service.service_id} className="flex items-center justify-between py-2">
                          <div className="flex items-center space-x-3">
                            <ServiceIcon serviceKey={service.service_key} />
                            <span>{service.display_name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <AccessLevelBadge level={service.access_level} />
                            <Badge variant="outline" className="text-xs">
                              {service.configuration_count} configs
                            </Badge>
                            {!service.service_active && (
                              <Badge variant="destructive" className="text-xs">
                                Inactive
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 