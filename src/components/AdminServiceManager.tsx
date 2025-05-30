'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Building2, 
  Users, 
  ShieldCheck, 
  Activity, 
  Search, 
  Filter,
  BarChart3,
  Settings,
  CheckCircle2,
  XCircle,
  Calendar,
  TrendingUp
} from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Service {
  id: string
  service_name: string
  service_key: string
  display_name: string
  description: string
  is_active: boolean
}

interface Organization {
  id: string
  name: string
}

interface ServiceOverview {
  organization_id: string
  organization_name: string
  service_id: string
  service_key: string
  service_name: string
  display_name: string
  access_level: string
  service_active: boolean
  subscription_start: string
  subscription_end?: string
  configuration_count: number
}

const AccessLevelBadge = ({ level }: { level: string }) => {
  const styles = {
    enterprise: 'bg-purple-100 text-purple-800 border-purple-200',
    premium: 'bg-amber-100 text-amber-800 border-amber-200',
    standard: 'bg-blue-100 text-blue-800 border-blue-200',
    basic: 'bg-gray-100 text-gray-800 border-gray-200'
  }
  
  return (
    <Badge className={`${styles[level as keyof typeof styles]} border font-medium`}>
      {level.toUpperCase()}
    </Badge>
  )
}

const ServiceIcon = ({ serviceKey }: { serviceKey: string }) => {
  const iconMap = {
    'contract-analyst': '📄',
    'open-records': '📁',
    'insurance-broker': '🛡️'
  }
  
  return (
    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center text-lg border">
      {iconMap[serviceKey as keyof typeof iconMap] || '⚙️'}
    </div>
  )
}

export default function AdminServiceManager() {
  const [services, setServices] = useState<Service[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [serviceOverview, setServiceOverview] = useState<ServiceOverview[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [selectedOrg, setSelectedOrg] = useState<string>('all')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .order('service_name')

      if (servicesError) throw servicesError

      // Load organizations
      const { data: orgsData, error: orgsError } = await supabase
        .from('organizations')
        .select('*')
        .order('name')

      if (orgsError) throw orgsError

      // Load service overview
      const { data: overviewData, error: overviewError } = await supabase
        .from('organization_service_overview')
        .select('*')
        .order('organization_name, service_name')

      if (overviewError) throw overviewError

      setServices(servicesData || [])
      setOrganizations(orgsData || [])
      setServiceOverview(overviewData || [])
      
    } catch (error) {
      console.error('Error loading data:', error)
      setMessage({ type: 'error', text: 'Failed to load data' })
    } finally {
      setLoading(false)
    }
  }

  const toggleServiceForOrg = async (orgId: string, serviceId: string, currentlyActive: boolean) => {
    try {
      setSaving(true)

      if (currentlyActive) {
        const { error } = await supabase
          .from('organization_services')
          .update({ is_active: false })
          .eq('organization_id', orgId)
          .eq('service_id', serviceId)

        if (error) throw error
      } else {
        const { data: existing } = await supabase
          .from('organization_services')
          .select('*')
          .eq('organization_id', orgId)
          .eq('service_id', serviceId)
          .single()

        if (existing) {
          const { error } = await supabase
            .from('organization_services')
            .update({ is_active: true })
            .eq('organization_id', orgId)
            .eq('service_id', serviceId)

          if (error) throw error
        } else {
          const { error } = await supabase
            .from('organization_services')
            .insert({
              organization_id: orgId,
              service_id: serviceId,
              access_level: 'basic',
              is_active: true,
              subscription_start: new Date().toISOString().split('T')[0],
              service_config: {}
            })

          if (error) throw error
        }
      }

      await loadData()
      setMessage({ type: 'success', text: 'Service assignment updated successfully' })
      
    } catch (error) {
      console.error('Error updating service assignment:', error)
      setMessage({ type: 'error', text: 'Failed to update service assignment' })
    } finally {
      setSaving(false)
    }
  }

  const updateAccessLevel = async (orgId: string, serviceId: string, newAccessLevel: string) => {
    try {
      setSaving(true)

      const { error } = await supabase
        .from('organization_services')
        .update({ access_level: newAccessLevel })
        .eq('organization_id', orgId)
        .eq('service_id', serviceId)

      if (error) throw error

      await loadData()
      setMessage({ type: 'success', text: 'Access level updated successfully' })
      
    } catch (error) {
      console.error('Error updating access level:', error)
      setMessage({ type: 'error', text: 'Failed to update access level' })
    } finally {
      setSaving(false)
    }
  }

  const getServiceStatusForOrg = (orgId: string, serviceId: string) => {
    return serviceOverview.find(
      item => item.organization_id === orgId && item.service_id === serviceId
    )
  }

  // Calculate stats
  const stats = {
    totalOrganizations: organizations.length,
    totalServices: services.length,
    activeAssignments: serviceOverview.filter(item => item.service_active).length,
    totalAssignments: serviceOverview.length
  }

  if (loading) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-gray-600">Loading service management dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Service Management</h1>
            <p className="text-blue-100 text-lg">
              Manage service assignments and access levels across organizations
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={loadData} 
              variant="outline" 
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              disabled={loading}
            >
              <Activity className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-blue-200" />
              <div>
                <p className="text-blue-100 text-sm">Organizations</p>
                <p className="text-2xl font-bold">{stats.totalOrganizations}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <Settings className="h-8 w-8 text-blue-200" />
              <div>
                <p className="text-blue-100 text-sm">Available Services</p>
                <p className="text-2xl font-bold">{stats.totalServices}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="h-8 w-8 text-green-300" />
              <div>
                <p className="text-blue-100 text-sm">Active Assignments</p>
                <p className="text-2xl font-bold">{stats.activeAssignments}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center space-x-3">
              <TrendingUp className="h-8 w-8 text-blue-200" />
              <div>
                <p className="text-blue-100 text-sm">Total Assignments</p>
                <p className="text-2xl font-bold">{stats.totalAssignments}</p>
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

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 p-1 bg-gray-100 rounded-lg">
          <TabsTrigger value="overview" className="flex items-center space-x-2 data-[state=active]:bg-white">
            <BarChart3 className="h-4 w-4" />
            <span>Service Overview</span>
          </TabsTrigger>
          <TabsTrigger value="matrix" className="flex items-center space-x-2 data-[state=active]:bg-white">
            <Users className="h-4 w-4" />
            <span>Assignment Matrix</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gray-50 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl text-gray-900">Organization Services</CardTitle>
                  <p className="text-gray-600 mt-1">View and manage active service assignments</p>
                </div>
                <div className="flex items-center space-x-4">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Filter by organization" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Organizations</SelectItem>
                      {organizations.map(org => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {organizations.map(org => {
                  const orgServices = serviceOverview.filter(item => 
                    item.organization_id === org.id && item.service_active === true
                  )
                  if (selectedOrg && selectedOrg !== 'all' && selectedOrg !== org.id) return null
                  
                  return (
                    <div key={org.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                            <Building2 className="h-6 w-6 text-gray-600" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">{org.name}</h3>
                            <p className="text-gray-500">{orgServices.length} active service{orgServices.length !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        {org.name === 'QIG' && (
                          <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                            ADMIN
                          </Badge>
                        )}
                      </div>
                      
                      {orgServices.length === 0 ? (
                        <div className="text-center py-8">
                          <XCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500 font-medium">No active services assigned</p>
                          <p className="text-gray-400 text-sm">Use the Assignment Matrix to configure services</p>
                        </div>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {orgServices.map(service => (
                            <div key={service.service_id} className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-all">
                              <div className="flex items-start space-x-3">
                                <ServiceIcon serviceKey={service.service_key} />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-semibold text-gray-900 truncate">{service.display_name}</h4>
                                    <AccessLevelBadge level={service.access_level} />
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex items-center text-sm text-gray-600">
                                      <Settings className="h-3 w-3 mr-1" />
                                      <span>{service.configuration_count} configuration{service.configuration_count !== 1 ? 's' : ''}</span>
                                    </div>
                                    <div className="flex items-center text-sm text-gray-600">
                                      <Calendar className="h-3 w-3 mr-1" />
                                      <span>Since {new Date(service.subscription_start).toLocaleDateString()}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matrix" className="space-y-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="text-xl text-gray-900 flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Service Assignment Matrix</span>
              </CardTitle>
              <p className="text-gray-600 mt-1">
                Toggle service assignments and manage access levels for each organization
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-4 font-semibold text-gray-900 sticky left-0 bg-gray-50 z-10">
                        Organization
                      </th>
                      {services.map(service => (
                        <th key={service.id} className="text-center p-4 font-semibold text-gray-900 min-w-40">
                          <div className="flex flex-col items-center space-y-2">
                            <ServiceIcon serviceKey={service.service_key} />
                            <span className="text-sm">{service.display_name}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {organizations.map((org, index) => (
                      <tr key={org.id} className={`border-b hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-25'}`}>
                        <td className="p-4 sticky left-0 bg-inherit z-10">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-gray-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{org.name}</p>
                              {org.name === 'QIG' && (
                                <Badge className="text-xs bg-purple-100 text-purple-800 border-purple-200">
                                  ADMIN
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        {services.map(service => {
                          const serviceStatus = getServiceStatusForOrg(org.id, service.id)
                          const isActive = serviceStatus?.service_active || false
                          
                          return (
                            <td key={service.id} className="p-4 text-center">
                              <div className="flex flex-col items-center space-y-3">
                                <Switch
                                  checked={isActive}
                                  onCheckedChange={() => toggleServiceForOrg(org.id, service.id, isActive)}
                                  disabled={saving}
                                  className="data-[state=checked]:bg-green-600"
                                />
                                {isActive && serviceStatus && (
                                  <Select
                                    value={serviceStatus.access_level}
                                    onValueChange={(value: string) => updateAccessLevel(org.id, service.id, value)}
                                  >
                                    <SelectTrigger className="w-28 h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="basic">Basic</SelectItem>
                                      <SelectItem value="standard">Standard</SelectItem>
                                      <SelectItem value="premium">Premium</SelectItem>
                                      <SelectItem value="enterprise">Enterprise</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 