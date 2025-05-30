'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AdminServiceManager from '@/components/AdminServiceManager';
import { ClientConfigManager } from '@/components/admin/ClientConfigManager';
import { 
  Settings, 
  Users, 
  Shield, 
  Clock, 
  Globe, 
  Database,
  Zap,
  Lock,
  BarChart3,
  Cog,
  FileText,
  Key
} from 'lucide-react';

export default function AdminClientConfigPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-600 rounded-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">QIG Admin Dashboard</h1>
                <p className="text-sm text-gray-600">Multi-tenant service management platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className="bg-purple-100 text-purple-800 border-purple-200 px-3 py-1">
                Super Admin
              </Badge>
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Users className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="services" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="grid grid-cols-2 w-96 p-1 bg-white border shadow-sm">
              <TabsTrigger 
                value="services" 
                className="flex items-center space-x-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                <Users className="h-4 w-4" />
                <span>Service Management</span>
              </TabsTrigger>
              <TabsTrigger 
                value="client-config" 
                className="flex items-center space-x-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                <Settings className="h-4 w-4" />
                <span>Client Configuration</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="services" className="space-y-6">
            <AdminServiceManager />
          </TabsContent>

          <TabsContent value="client-config" className="space-y-6">
            <ClientConfigManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 