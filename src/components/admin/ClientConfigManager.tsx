'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Save, 
  RefreshCw, 
  Globe, 
  Database,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit,
  Building2,
  X
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Organization {
  id: string;
  name: string;
  created_at: string;
}

interface ClientBackend {
  id?: string;
  organization_id: string;
  organization_name: string;
  backend_url: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Known backend URLs to help with setup
const KNOWN_BACKENDS = [
  {
    name: "Default Backend",
    url: "https://capps-backend-vakcnm7wmon74.salmonbush-fc2963f0.eastus.azurecontainerapps.io",
    description: "Primary backend service"
  },
  {
    name: "Client 2 Backend", 
    url: "https://capps-backend-px4batn2ycs6a.greenground-334066dd.eastus2.azurecontainerapps.io",
    description: "Secondary client backend"
  },
  {
    name: "Contracts Backend",
    url: "https://capps-backend-dka66scue7f4y.kindhill-16008ecf.eastus.azurecontainerapps.io", 
    description: "Contract analysis backend"
  },
  {
    name: "Content Backend",
    url: "https://capps-backend-6qjzg44bnug6q.greenmeadow-8b5f0a30.eastus2.azurecontainerapps.io",
    description: "Content management backend"
  }
];

export function ClientConfigManager() {
  const { organization, user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [clientBackends, setClientBackends] = useState<ClientBackend[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [editingBackend, setEditingBackend] = useState<ClientBackend | null>(null);
  const [newBackendUrls, setNewBackendUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (orgsError) throw orgsError;

      // Load existing client configurations with organization names
      const { data: configsData, error: configsError } = await supabase
        .from('client_configurations')
        .select(`
          id,
          organization_id,
          backend_config,
          is_active,
          created_at,
          updated_at,
          organizations!inner(name)
        `)
        .order('created_at', { ascending: false });

      if (configsError) {
        console.error('Error loading configs:', configsError);
        // This is expected if the table doesn't exist yet
      }

      setOrganizations(orgsData || []);
      
      // Transform configs to client backends format
      const backends: ClientBackend[] = (configsData || []).map(config => ({
        id: config.id,
        organization_id: config.organization_id,
        organization_name: (config.organizations as any)?.name || 'Unknown',
        backend_url: config.backend_config?.api_url || '',
        is_active: config.is_active,
        created_at: config.created_at,
        updated_at: config.updated_at
      }));

      setClientBackends(backends);
      
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBackend = async (orgId: string, backendUrl: string, isNew: boolean = false) => {
    if (!backendUrl.trim()) {
      setMessage({ type: 'error', text: 'Backend URL is required' });
      return;
    }

    try {
      setSaving(true);
      console.log('Starting save operation:', { orgId, backendUrl, isNew });

      const org = organizations.find(o => o.id === orgId);
      if (!org) {
        console.error('Organization not found:', orgId);
        setMessage({ type: 'error', text: 'Organization not found' });
        return;
      }

      console.log('Found organization:', org);

      if (isNew) {
        console.log('Creating new configuration...');
        
        // First, check if there's already an active configuration for this org/environment
        const { data: existingConfigs } = await supabase
          .from('client_configurations')
          .select('id, is_active')
          .eq('organization_id', orgId)
          .eq('environment', 'production')
          .eq('is_active', true);

        if (existingConfigs && existingConfigs.length > 0) {
          console.log('Found existing active configuration, updating instead of creating new');
          // Update the existing configuration instead of creating a new one
          const existingConfig = existingConfigs[0];
          
          const updateData = {
            backend_config: {
              api_url: backendUrl,
              chat_endpoint: '/chat',
              content_endpoint: '/content',
              analyze_endpoint: '/analyze'
            },
            updated_at: new Date().toISOString()
          };

          console.log('Update data:', updateData);

          const { error } = await supabase
            .from('client_configurations')
            .update(updateData)
            .eq('id', existingConfig.id);

          console.log('Update result:', { error });

          if (error) {
            console.error('Update error details:', error);
            throw error;
          }
          setMessage({ type: 'success', text: `Backend URL updated for ${org.name}` });
        } else {
          // No existing active config, safe to create new one
          const insertData = {
            organization_id: orgId,
            client_name: `${org.name} Client`,
            client_type: 'default',
            backend_config: {
              api_url: backendUrl,
              chat_endpoint: '/chat',
              content_endpoint: '/content',
              analyze_endpoint: '/analyze'
            },
            azure_config: {
              tenant_id: '',
              client_id: ''
            },
            features: {
              hands_free_chat: false,
              document_analysis: true,
              contract_search: true,
              custom_branding: false,
              advanced_analytics: false
            },
            limits: {
              requests_per_minute: 60,
              requests_per_day: 1000,
              max_file_size_mb: 10,
              max_concurrent_sessions: 5
            },
            is_active: true,
            environment: 'production',
            created_by: user?.id || orgId
          };

          console.log('Insert data:', insertData);

          const { data, error } = await supabase
            .from('client_configurations')
            .insert([insertData])
            .select()
            .single();

          console.log('Insert result:', { data, error });

          if (error) {
            console.error('Insert error details:', error);
            throw error;
          }
          setMessage({ type: 'success', text: `Backend URL added for ${org.name}` });
        }
      } else {
        console.log('Updating existing configuration...');
        // Update existing configuration
        const backend = clientBackends.find(b => b.organization_id === orgId);
        if (!backend?.id) {
          console.error('Configuration not found for org:', orgId);
          setMessage({ type: 'error', text: 'Configuration not found' });
          return;
        }

        const updateData = {
          backend_config: {
            api_url: backendUrl,
            chat_endpoint: '/chat',
            content_endpoint: '/content', 
            analyze_endpoint: '/analyze'
          },
          updated_at: new Date().toISOString()
        };

        console.log('Update data:', updateData);

        const { error } = await supabase
          .from('client_configurations')
          .update(updateData)
          .eq('id', backend.id);

        console.log('Update result:', { error });

        if (error) {
          console.error('Update error details:', error);
          throw error;
        }
        setMessage({ type: 'success', text: `Backend URL updated for ${org.name}` });
      }

      console.log('Reloading data...');
      await loadData();
      setEditingBackend(null);
      
      // Clear the specific organization's URL from the new URLs state
      setNewBackendUrls(prev => {
        const updated = { ...prev };
        delete updated[orgId];
        return updated;
      });
      
    } catch (error) {
      console.error('Error saving backend:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setMessage({ type: 'error', text: `Failed to save backend URL: ${errorMessage}` });
    } finally {
      setSaving(false);
    }
  };

  const getBackendForOrg = (orgId: string) => {
    return clientBackends.find(b => b.organization_id === orgId);
  };

  const getUnassignedOrganizations = () => {
    return organizations.filter(org => !getBackendForOrg(org.id));
  };

  const setNewBackendUrlForOrg = (orgId: string, url: string) => {
    setNewBackendUrls(prev => ({
      ...prev,
      [orgId]: url
    }));
  };

  const getNewBackendUrlForOrg = (orgId: string) => {
    return newBackendUrls[orgId] || '';
  };

  if (loading) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-gray-600">Loading client configurations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Client Backend Management</h1>
            <p className="text-green-100 text-lg">
              Manage backend URLs for each client organization
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={loadData} 
              variant="outline" 
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-green-200" />
              <div>
                <p className="text-green-100 text-sm">Total Organizations</p>
                <p className="text-2xl font-bold">{organizations.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="h-8 w-8 text-green-200" />
              <div>
                <p className="text-green-100 text-sm">Configured Backends</p>
                <p className="text-2xl font-bold">{clientBackends.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-8 w-8 text-green-200" />
              <div>
                <p className="text-green-100 text-sm">Needs Configuration</p>
                <p className="text-2xl font-bold">{getUnassignedOrganizations().length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {message && (
        <Alert className={`border-l-4 ${message.type === 'error' 
          ? 'border-l-red-500 bg-red-50 border-red-200' 
          : 'border-l-green-500 bg-green-50 border-green-200'}`}>
          <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Known Backend URLs Reference */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-blue-50 border-b">
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-blue-600" />
            <span>Known Backend URLs</span>
          </CardTitle>
          <CardDescription>
            Reference list of available backend services
            {(editingBackend || getUnassignedOrganizations().some(org => getNewBackendUrlForOrg(org.id))) && 
              " - Click 'Use' to apply to organizations being edited"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-4">
            {KNOWN_BACKENDS.map((backend, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900">{backend.name}</h4>
                    <p className="text-sm text-gray-600 mb-2">{backend.description}</p>
                    <p className="text-xs text-gray-500 font-mono break-all">{backend.url}</p>
                  </div>
                </div>
                
                {/* Show "Use" buttons for organizations currently being edited */}
                <div className="flex flex-wrap gap-2">
                  {editingBackend && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setNewBackendUrlForOrg(editingBackend.organization_id, backend.url)}
                      className="shrink-0"
                    >
                      Use for {editingBackend.organization_name}
                    </Button>
                  )}
                  
                  {getUnassignedOrganizations()
                    .filter(org => getNewBackendUrlForOrg(org.id)) // Only show for orgs with input focus
                    .map(org => (
                      <Button
                        key={org.id}
                        size="sm"
                        variant="outline"
                        onClick={() => setNewBackendUrlForOrg(org.id, backend.url)}
                        className="shrink-0"
                      >
                        Use for {org.name}
                      </Button>
                    ))
                  }
                  
                  {!editingBackend && !getUnassignedOrganizations().some(org => getNewBackendUrlForOrg(org.id)) && (
                    <p className="text-xs text-gray-500 italic">
                      Start editing an organization to use these URLs
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configured Client Backends */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gray-50 border-b">
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span>Configured Client Backends</span>
          </CardTitle>
          <CardDescription>
            Organizations with backend URLs configured
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {clientBackends.length === 0 ? (
            <div className="text-center py-8">
              <Globe className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No backend URLs configured yet</p>
              <p className="text-gray-400 text-sm">Add backend URLs for your organizations below</p>
            </div>
          ) : (
            <div className="space-y-4">
              {clientBackends.map((backend) => (
                <div key={backend.id} className="border rounded-lg p-4 bg-gradient-to-br from-white to-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <Building2 className="h-5 w-5 text-gray-500" />
                        <h3 className="font-semibold text-gray-900">{backend.organization_name}</h3>
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      </div>
                      {editingBackend?.organization_id === backend.organization_id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Enter backend URL"
                            value={getNewBackendUrlForOrg(backend.organization_id)}
                            onChange={(e) => setNewBackendUrlForOrg(backend.organization_id, e.target.value)}
                            className="font-mono text-sm"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSaveBackend(backend.organization_id, getNewBackendUrlForOrg(backend.organization_id))}
                            disabled={saving || !getNewBackendUrlForOrg(backend.organization_id).trim()}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingBackend(null);
                              // Clear the editing URL for this organization
                              setNewBackendUrls(prev => {
                                const updated = { ...prev };
                                delete updated[backend.organization_id];
                                return updated;
                              });
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm break-all">
                            {backend.backend_url}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingBackend(backend);
                              setNewBackendUrlForOrg(backend.organization_id, backend.backend_url);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unassigned Organizations */}
      {getUnassignedOrganizations().length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader className="bg-amber-50 border-b">
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <span>Organizations Needing Backend Configuration</span>
            </CardTitle>
            <CardDescription>
              These organizations don't have backend URLs configured yet
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {getUnassignedOrganizations().map((org) => (
                <div key={org.id} className="border border-amber-200 rounded-lg p-4 bg-amber-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{org.name}</h3>
                      <p className="text-sm text-gray-600">Created: {new Date(org.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Input
                        placeholder="Enter backend URL"
                        value={getNewBackendUrlForOrg(org.id)}
                        onChange={(e) => setNewBackendUrlForOrg(org.id, e.target.value)}
                        className="w-80 font-mono text-sm"
                      />
                      <Button
                        onClick={() => handleSaveBackend(org.id, getNewBackendUrlForOrg(org.id), true)}
                        disabled={saving || !getNewBackendUrlForOrg(org.id).trim()}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 