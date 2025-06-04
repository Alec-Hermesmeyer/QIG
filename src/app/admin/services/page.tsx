'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Monitor, Activity, Users, Database, Bell, 
  AlertTriangle, X, RefreshCw, Plus, Search,
  Settings, Download, Upload, Trash2, BarChart3,
  Clock, Shield, Gauge, History, AlertCircle,
  CheckCircle2, XCircle, Eye, Edit, Calendar,
  TrendingUp, TrendingDown, Code, ExternalLink,
  Filter, SortAsc, Grid, List, GitBranch,
  Zap, Target, Package
} from 'lucide-react';

// UI Components
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// Service Management Hooks
import { useStaleServiceStatus } from '@/hooks/useStaleData';

// Task Management Hooks  
import { useTaskManagement } from '@/hooks/useTaskManagement';

// Types
import type { QIGService, ServiceStatus, ServiceCategory, ServicePriority } from '@/types/services';

// Service
import { serviceStatusService } from '@/services/serviceStatusService';

// Components
import ProtectedRoute from '@/components/ProtectedRoute';
import QIGOnlyAccess from '@/components/QIGOnlyAccess';
import { StaleDataIndicator } from '@/components/StaleDataIndicator';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Auth
import { useAuth } from '@/lib/auth/AuthContext';

// Mock some types if they don't exist
interface Task {
  id: string;
  title: string;
  description?: string;
  service_id: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'TESTING' | 'DONE' | 'BLOCKED' | 'CANCELLED';
  assignee_name?: string;
  estimated_hours?: number;
  actual_hours?: number;
  due_date?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

const SERVICE_STATUS_LABELS = {
  'PLANNING': 'Planning',
  'IN_DEVELOPMENT': 'In Development', 
  'TESTING': 'Testing',
  'BETA': 'Beta',
  'LIVE': 'Live',
  'MAINTENANCE': 'Maintenance',
  'ON_HOLD': 'On Hold',
  'DEPRECATED': 'Deprecated'
};

const SERVICE_STATUS_COLORS = {
  'PLANNING': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  'IN_DEVELOPMENT': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  'TESTING': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  'BETA': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  'LIVE': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  'MAINTENANCE': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
  'ON_HOLD': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  'DEPRECATED': { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' }
};

const SERVICE_CATEGORY_LABELS = {
  'CORE': 'Core Service',
  'INTEGRATION': 'Integration',
  'INTEGRATIONS': 'Integrations',
  'ANALYTICS': 'Analytics',
  'AI_ANALYSIS': 'AI Analysis',
  'AUTOMATION': 'Automation',
  'DATA_PROCESSING': 'Data Processing',
  'CLIENT_TOOLS': 'Client Tools',
  'INTERNAL_TOOLS': 'Internal Tools',
  'INFRASTRUCTURE': 'Infrastructure'
};

const SERVICE_PRIORITY_COLORS = {
  'LOW': { bg: 'bg-green-100', text: 'text-green-800' },
  'MEDIUM': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  'HIGH': { bg: 'bg-orange-100', text: 'text-orange-800' },
  'CRITICAL': { bg: 'bg-red-100', text: 'text-red-800' }
};

function ServiceStatusBadge({ status }: { status: ServiceStatus }) {
  const config = SERVICE_STATUS_COLORS[status] || SERVICE_STATUS_COLORS['PLANNING'];
  return (
    <Badge className={`${config.bg} ${config.text} ${config.border} border`}>
      {SERVICE_STATUS_LABELS[status] || status}
    </Badge>
  );
}

function ServicePriorityBadge({ priority }: { priority: ServicePriority }) {
  const config = SERVICE_PRIORITY_COLORS[priority] || SERVICE_PRIORITY_COLORS['MEDIUM'];
  return (
    <Badge className={`${config.bg} ${config.text}`}>
      {priority}
    </Badge>
  );
}

function ProgressBar({ progress, status }: { progress: number; status: ServiceStatus }) {
  const getProgressColor = () => {
    if (status === 'LIVE') return 'bg-green-500';
    if (status === 'ON_HOLD' || status === 'DEPRECATED') return 'bg-gray-400';
    if (progress >= 80) return 'bg-blue-500';
    if (progress >= 60) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div 
        className={`h-2 rounded-full ${getProgressColor()} transition-all duration-300`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

function ServiceCard({ service, onEdit, onView }: { 
  service: QIGService; 
  onEdit: (service: QIGService) => void;
  onView: (service: QIGService) => void;
}) {
  const daysAgo = (dateString: string) => {
    const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (24 * 60 * 60 * 1000));
    return days;
  };

  const timeUntilTarget = service.targetLaunchDate 
    ? Math.ceil((new Date(service.targetLaunchDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="h-full hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="font-semibold text-lg">{service.name}</h3>
                {service.clientFacing && (
                  <Badge variant="outline" className="text-xs">Client</Badge>
                )}
                {service.internalOnly && (
                  <Badge variant="outline" className="text-xs">Internal</Badge>
                )}
              </div>
              <div className="flex items-center space-x-2 mb-2">
                <ServiceStatusBadge status={service.status} />
                <ServicePriorityBadge priority={service.priority} />
                <Badge variant="outline" className="text-xs">
                  {SERVICE_CATEGORY_LABELS[service.category]}
                </Badge>
              </div>
            </div>
            <div className="flex space-x-1">
              <Button variant="ghost" size="sm" onClick={() => onView(service)}>
                <Eye className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onEdit(service)}>
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 line-clamp-2">{service.description}</p>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span>Progress</span>
              <span className="font-medium">{service.progress}%</span>
            </div>
            <ProgressBar progress={service.progress} status={service.status} />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Team:</span>
              <p className="font-medium">{service.team}</p>
            </div>
            <div>
              <span className="text-gray-500">Owner:</span>
              <p className="font-medium">{service.owner}</p>
            </div>
          </div>

          {service.keyFeatures && service.keyFeatures.length > 0 && (
            <div>
              <span className="text-sm text-gray-500">Key Features:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {service.keyFeatures.slice(0, 3).map((feature, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {feature}
                  </Badge>
                ))}
                {service.keyFeatures.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{service.keyFeatures.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          )}

          <div className="pt-2 border-t">
            <div className="flex justify-between items-center text-xs text-gray-500">
              <span>Updated {daysAgo(service.lastUpdated)} days ago</span>
              {timeUntilTarget && timeUntilTarget > 0 ? (
                <span className="text-orange-600 font-medium">
                  {timeUntilTarget} days to target
                </span>
              ) : timeUntilTarget && timeUntilTarget < 0 ? (
                <span className="text-red-600 font-medium">
                  {Math.abs(timeUntilTarget)} days overdue
                </span>
              ) : service.actualLaunchDate ? (
                <span className="text-green-600 font-medium">
                  Launched {daysAgo(service.actualLaunchDate)} days ago
                </span>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ServiceModal({ 
  service, 
  isOpen, 
  onClose, 
  mode 
}: { 
  service: QIGService | null; 
  isOpen: boolean; 
  onClose: () => void;
  mode: 'view' | 'edit' | 'create';
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto w-full"
      >
        <div className="sticky top-0 bg-white border-b p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              {mode === 'create' ? 'Create New Service' : service?.name}
            </h2>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
        
        <div className="p-6">
          {service && mode === 'view' && (
            <ServiceDetailsView service={service} />
          )}
          {mode === 'edit' && service && (
            <ServiceEditForm service={service} onClose={onClose} />
          )}
          {mode === 'create' && (
            <ServiceCreateForm onClose={onClose} />
          )}
        </div>
      </motion.div>
    </div>
  );
}

function ServiceDetailsView({ service }: { service: QIGService }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-3">Service Information</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <ServiceStatusBadge status={service.status} />
              <ServicePriorityBadge priority={service.priority} />
            </div>
            <p>{service.description}</p>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Category:</span> {SERVICE_CATEGORY_LABELS[service.category]}</p>
              <p><span className="font-medium">Team:</span> {service.team}</p>
              <p><span className="font-medium">Owner:</span> {service.owner}</p>
              <p><span className="font-medium">Progress:</span> {service.progress}%</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Key Features</h3>
          <div className="space-y-2">
            {service.keyFeatures?.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-sm">{feature}</span>
              </div>
            )) || <p className="text-gray-500 text-sm">No features listed</p>}
          </div>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-3">Technical Stack</h3>
          <div className="flex flex-wrap gap-2">
            {service.technicalStack?.map((tech, index) => (
              <Badge key={index} variant="outline">{tech}</Badge>
            )) || <p className="text-gray-500 text-sm">No technical stack specified</p>}
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3">Dependencies</h3>
          <div className="flex flex-wrap gap-2">
            {service.dependencies?.map((dep, index) => (
              <Badge key={index} variant="outline" className="bg-yellow-50">{dep}</Badge>
            )) || <p className="text-gray-500 text-sm">No dependencies listed</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function ServiceEditForm({ service, onClose }: { service: QIGService; onClose: () => void }) {
  return (
    <div className="space-y-4">
      <p>Service editing form would be implemented here with all fields</p>
      <div className="flex space-x-2">
        <Button onClick={onClose}>Save Changes</Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

function ServiceCreateForm({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-4">
      <p>Service creation form would be implemented here</p>
      <div className="flex space-x-2">
        <Button onClick={onClose}>Create Service</Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

function TaskCreationModal({ 
  isOpen, 
  onClose, 
  onCreateTask,
  services 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onCreateTask: (task: any) => Promise<void>;
  services: QIGService[];
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    service_id: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    status: 'TODO' as 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'TESTING' | 'DONE' | 'BLOCKED' | 'CANCELLED',
    assignee_name: '',
    estimated_hours: '',
    due_date: '',
    tags: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.service_id) return;

    setIsSubmitting(true);
    try {
      const taskData = {
        title: formData.title,
        description: formData.description || null,
        service_id: formData.service_id,
        priority: formData.priority,
        status: formData.status,
        assignee_name: formData.assignee_name || null,
        estimated_hours: formData.estimated_hours ? parseInt(formData.estimated_hours) : null,
        due_date: formData.due_date || null,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : []
      };

      await onCreateTask(taskData);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        service_id: '',
        priority: 'MEDIUM',
        status: 'TODO',
        assignee_name: '',
        estimated_hours: '',
        due_date: '',
        tags: ''
      });
      
      onClose();
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Create New Task</h2>
                  <p className="text-sm text-gray-600">Add a new task to track progress</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* Essential Fields */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-sm font-medium text-gray-900">
                  Task Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="What needs to be done?"
                  className="mt-1 text-base"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-900">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Provide more details about this task..."
                  rows={3}
                  className="mt-1 resize-none"
                />
              </div>
            </div>

            {/* Organization */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <h3 className="text-sm font-medium text-gray-900 flex items-center">
                <Package className="w-4 h-4 mr-2" />
                Organization
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="service" className="text-sm font-medium text-gray-700">
                    Service <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.service_id} onValueChange={(value) => setFormData(prev => ({ ...prev, service_id: value }))}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choose a service" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map(service => (
                        <SelectItem key={service.id} value={service.id}>
                          <div className="flex items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                            {service.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="assignee" className="text-sm font-medium text-gray-700">Assignee</Label>
                  <Input
                    id="assignee"
                    value={formData.assignee_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, assignee_name: e.target.value }))}
                    placeholder="Who will work on this?"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !formData.title || !formData.service_id}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Task
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function OverviewTab({ services, tasks }: { services: QIGService[]; tasks: Task[] }) {
  const statusCounts = services.reduce((acc, service) => {
    acc[service.status] = (acc[service.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryCounts = services.reduce((acc, service) => {
    acc[service.category] = (acc[service.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-blue-900">Total Services</CardTitle>
              <Package className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">{services.length}</div>
              <p className="text-sm text-blue-700 mt-2">Actively managed</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-green-900">Live Services</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900">{statusCounts.LIVE || 0}</div>
              <p className="text-sm text-green-700 mt-2">Currently operational</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-purple-900">In Development</CardTitle>
              <Code className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900">
                {(statusCounts.PLANNING || 0) + (statusCounts.IN_DEVELOPMENT || 0) + (statusCounts.TESTING || 0)}
              </div>
              <p className="text-sm text-purple-700 mt-2">Under development</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-orange-900">Active Tasks</CardTitle>
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-900">{tasks.length}</div>
              <p className="text-sm text-orange-700 mt-2">Total tasks tracked</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Services by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ServiceStatusBadge status={status as ServiceStatus} />
                    <span className="text-sm">{SERVICE_STATUS_LABELS[status as keyof typeof SERVICE_STATUS_LABELS] || status}</span>
                  </div>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Services by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(categoryCounts).map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm">{SERVICE_CATEGORY_LABELS[category as keyof typeof SERVICE_CATEGORY_LABELS] || category}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ServicesTab({ 
  services, 
  searchTerm, 
  setSearchTerm, 
  statusFilter, 
  setStatusFilter, 
  categoryFilter, 
  setCategoryFilter, 
  viewMode, 
  setViewMode, 
  onViewService, 
  onEditService 
}: {
  services: QIGService[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: ServiceStatus | 'ALL';
  setStatusFilter: (status: ServiceStatus | 'ALL') => void;
  categoryFilter: ServiceCategory | 'ALL';
  setCategoryFilter: (category: ServiceCategory | 'ALL') => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  onViewService: (service: QIGService) => void;
  onEditService: (service: QIGService) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ServiceStatus | 'ALL')}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                {Object.keys(SERVICE_STATUS_LABELS).map(status => (
                  <SelectItem key={status} value={status}>{SERVICE_STATUS_LABELS[status as keyof typeof SERVICE_STATUS_LABELS]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as ServiceCategory | 'ALL')}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {Object.keys(SERVICE_CATEGORY_LABELS).map(category => (
                  <SelectItem key={category} value={category}>{SERVICE_CATEGORY_LABELS[category as keyof typeof SERVICE_CATEGORY_LABELS]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex border border-gray-200 rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="rounded-l-none border-l"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className={viewMode === 'grid' 
        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        : "space-y-4"
      }>
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            onEdit={onEditService}
            onView={onViewService}
          />
        ))}
      </div>

      {services.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
          <p className="text-gray-600">Try adjusting your search or filters.</p>
        </div>
      )}
    </div>
  );
}

function TasksTab({ 
  tasks, 
  services, 
  onCreateTask, 
  onUpdateTask, 
  onDeleteTask 
}: {
  tasks: Task[];
  services: QIGService[];
  onCreateTask: (task: any) => Promise<void>;
  onUpdateTask: (id: string, updates: any) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<Task['status'] | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<Task['priority'] | 'ALL'>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'created_at' | 'due_date' | 'priority' | 'status'>('created_at');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('list');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Mock tasks if none provided
  const mockTasks: Task[] = tasks.length > 0 ? tasks : [
    {
      id: '1',
      title: 'Implement authentication system',
      description: 'Set up user authentication with JWT tokens and secure session management',
      service_id: '1',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assignee_name: 'John Doe',
      estimated_hours: 40,
      actual_hours: 25,
      due_date: '2024-02-15',
      tags: ['authentication', 'security', 'backend'],
      created_at: '2024-01-20T10:00:00Z',
      updated_at: '2024-01-25T14:30:00Z'
    },
    {
      id: '2',
      title: 'Design dashboard UI components',
      description: 'Create reusable UI components for the analytics dashboard',
      service_id: '2',
      priority: 'MEDIUM',
      status: 'TODO',
      assignee_name: 'Jane Smith',
      estimated_hours: 24,
      due_date: '2024-02-20',
      tags: ['ui', 'design', 'components'],
      created_at: '2024-01-22T09:15:00Z',
      updated_at: '2024-01-22T09:15:00Z'
    },
    {
      id: '3',
      title: 'Set up automated testing pipeline',
      description: 'Configure CI/CD pipeline with automated testing and deployment',
      service_id: '3',
      priority: 'CRITICAL',
      status: 'REVIEW',
      assignee_name: 'Mike Johnson',
      estimated_hours: 16,
      actual_hours: 18,
      due_date: '2024-02-10',
      tags: ['testing', 'ci-cd', 'automation'],
      created_at: '2024-01-18T16:20:00Z',
      updated_at: '2024-01-28T11:45:00Z'
    },
    {
      id: '4',
      title: 'Database optimization',
      description: 'Optimize database queries and improve performance',
      service_id: '1',
      priority: 'LOW',
      status: 'DONE',
      assignee_name: 'Sarah Wilson',
      estimated_hours: 12,
      actual_hours: 10,
      due_date: '2024-01-30',
      tags: ['database', 'performance', 'optimization'],
      created_at: '2024-01-15T08:30:00Z',
      updated_at: '2024-01-29T17:20:00Z'
    },
    {
      id: '5',
      title: 'API documentation',
      description: 'Write comprehensive API documentation with examples',
      service_id: '1',
      priority: 'MEDIUM',
      status: 'BLOCKED',
      assignee_name: 'Alex Brown',
      estimated_hours: 8,
      actual_hours: 3,
      due_date: '2024-02-25',
      tags: ['documentation', 'api'],
      created_at: '2024-01-25T13:10:00Z',
      updated_at: '2024-01-26T10:15:00Z'
    }
  ];

  const displayTasks = mockTasks;

  // Filter and sort tasks
  const filteredTasks = displayTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.assignee_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || task.priority === priorityFilter;
    const matchesService = serviceFilter === 'ALL' || task.service_id === serviceFilter;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesService;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'due_date':
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      case 'priority':
        const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      case 'status':
        return a.status.localeCompare(b.status);
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  // Task statistics
  const taskStats = {
    total: displayTasks.length,
    completed: displayTasks.filter(t => t.status === 'DONE').length,
    inProgress: displayTasks.filter(t => t.status === 'IN_PROGRESS').length,
    overdue: displayTasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'DONE').length,
    avgProgress: displayTasks.reduce((acc, task) => {
      if (task.estimated_hours && task.actual_hours) {
        return acc + (task.actual_hours / task.estimated_hours) * 100;
      }
      return acc;
    }, 0) / displayTasks.filter(t => t.estimated_hours && t.actual_hours).length || 0
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      await onUpdateTask(taskId, updates);
      setSelectedTask(null);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleTaskDelete = async (taskId: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await onDeleteTask(taskId);
        setSelectedTask(null);
        setIsDetailModalOpen(false);
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'TODO': return 'bg-gray-100 text-gray-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'REVIEW': return 'bg-yellow-100 text-yellow-800';
      case 'TESTING': return 'bg-purple-100 text-purple-800';
      case 'DONE': return 'bg-green-100 text-green-800';
      case 'BLOCKED': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isOverdue = (dueDate: string, status: Task['status']) => {
    return dueDate && new Date(dueDate) < new Date() && status !== 'DONE';
  };

  return (
    <div className="space-y-6">
      {/* Task Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-blue-900">Total Tasks</CardTitle>
              <Clock className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">{taskStats.total}</div>
              <p className="text-sm text-blue-700 mt-2">Across all services</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-green-900">Completed</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-900">{taskStats.completed}</div>
              <p className="text-sm text-green-700 mt-2">
                {Math.round((taskStats.completed / taskStats.total) * 100)}% completion rate
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-purple-900">In Progress</CardTitle>
              <Activity className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900">{taskStats.inProgress}</div>
              <p className="text-sm text-purple-700 mt-2">Currently active</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-red-900">Overdue</CardTitle>
              <AlertCircle className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-900">{taskStats.overdue}</div>
              <p className="text-sm text-red-700 mt-2">Require attention</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search tasks by title, description, or assignee..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as Task['status'] | 'ALL')}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="TODO">To Do</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="REVIEW">Review</SelectItem>
                  <SelectItem value="TESTING">Testing</SelectItem>
                  <SelectItem value="DONE">Done</SelectItem>
                  <SelectItem value="BLOCKED">Blocked</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as Task['priority'] | 'ALL')}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Priority</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Services</SelectItem>
                  {services.map(service => (
                    <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Created Date</SelectItem>
                  <SelectItem value="due_date">Due Date</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex border border-gray-200 rounded-md">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="rounded-r-none"
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'board' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('board')}
                  className="rounded-l-none border-l"
                >
                  <Grid className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Display */}
      {viewMode === 'list' ? (
        /* List View */
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-medium text-gray-900">Task</th>
                    <th className="text-left p-4 font-medium text-gray-900">Status</th>
                    <th className="text-left p-4 font-medium text-gray-900">Priority</th>
                    <th className="text-left p-4 font-medium text-gray-900">Assignee</th>
                    <th className="text-left p-4 font-medium text-gray-900">Due Date</th>
                    <th className="text-left p-4 font-medium text-gray-900">Progress</th>
                    <th className="text-left p-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTasks.map((task) => {
                    const service = services.find(s => s.id === task.service_id);
                    const progressPercentage = task.estimated_hours && task.actual_hours 
                      ? Math.min((task.actual_hours / task.estimated_hours) * 100, 100)
                      : 0;

                    return (
                      <motion.tr
                        key={task.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => {
                          setSelectedTask(task);
                          setIsDetailModalOpen(true);
                        }}
                      >
                        <td className="p-4">
                          <div className="space-y-1">
                            <div className="font-medium text-gray-900">{task.title}</div>
                            <div className="text-sm text-gray-500">{service?.name}</div>
                            {task.tags && task.tags.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {task.tags.slice(0, 3).map((tag, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {task.tags.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{task.tags.length - 3}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className={getStatusColor(task.status)}>
                            {task.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-gray-900">{task.assignee_name || 'Unassigned'}</div>
                        </td>
                        <td className="p-4">
                          <div className={`text-sm ${
                            task.due_date && isOverdue(task.due_date, task.status) 
                              ? 'text-red-600 font-medium' 
                              : 'text-gray-900'
                          }`}>
                            {task.due_date ? formatDate(task.due_date) : '—'}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <div className="text-sm text-gray-600">
                              {task.actual_hours || 0}h / {task.estimated_hours || 0}h
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progressPercentage}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTask(task);
                                setIsEditModalOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTaskDelete(task.id);
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Board View */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'].map((status) => {
            const statusTasks = filteredTasks.filter(task => task.status === status);
            const statusLabels = {
              'TODO': 'To Do',
              'IN_PROGRESS': 'In Progress', 
              'REVIEW': 'Review',
              'DONE': 'Done'
            };

            return (
              <Card key={status} className="h-fit">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      {statusLabels[status as keyof typeof statusLabels]}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {statusTasks.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {statusTasks.map((task) => {
                    const service = services.find(s => s.id === task.service_id);
                    
                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -2 }}
                        className="p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => {
                          setSelectedTask(task);
                          setIsDetailModalOpen(true);
                        }}
                      >
                        <div className="space-y-2">
                          <div className="font-medium text-sm text-gray-900 line-clamp-2">
                            {task.title}
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <Badge className={getPriorityColor(task.priority)} variant="outline">
                              {task.priority}
                            </Badge>
                            {task.due_date && (
                              <div className={`text-xs ${
                                isOverdue(task.due_date, task.status) 
                                  ? 'text-red-600 font-medium' 
                                  : 'text-gray-500'
                              }`}>
                                {formatDate(task.due_date)}
                              </div>
                            )}
                          </div>

                          <div className="text-xs text-gray-500">
                            {service?.name}
                          </div>

                          {task.assignee_name && (
                            <div className="text-xs text-gray-600">
                              Assigned to {task.assignee_name}
                            </div>
                          )}

                          {task.tags && task.tags.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {task.tags.slice(0, 2).map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {task.tags.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{task.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                  
                  {statusTasks.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <div className="text-sm">No tasks</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTask(null);
        }}
        onEdit={() => {
          setIsDetailModalOpen(false);
          setIsEditModalOpen(true);
        }}
        onDelete={handleTaskDelete}
        services={services}
      />

      {/* Task Edit Modal */}
      <TaskEditModal
        task={selectedTask}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedTask(null);
        }}
        onSave={handleTaskUpdate}
        services={services}
      />
    </div>
  );
}

function AnalyticsTab({ services, tasks }: { services: QIGService[]; tasks: Task[] }) {
  const avgProgress = services.reduce((sum, service) => sum + service.progress, 0) / services.length || 0;
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardHeader>
            <CardTitle className="text-emerald-900">Average Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-900">{Math.round(avgProgress)}%</div>
            <p className="text-sm text-emerald-700 mt-2">Across all services</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-50 to-violet-100 border-violet-200">
          <CardHeader>
            <CardTitle className="text-violet-900">Development Velocity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-violet-900">2.5</div>
            <p className="text-sm text-violet-700 mt-2">Services per sprint</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
          <CardHeader>
            <CardTitle className="text-cyan-900">Task Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-cyan-900">85%</div>
            <p className="text-sm text-cyan-700 mt-2">Average completion rate</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Advanced analytics and reporting features would be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function TaskDetailModal({ 
  task, 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete, 
  services 
}: {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: (taskId: string) => void;
  services: QIGService[];
}) {
  if (!isOpen || !task) return null;

  const service = services.find(s => s.id === task.service_id);
  const progressPercentage = task.estimated_hours && task.actual_hours 
    ? Math.min((task.actual_hours / task.estimated_hours) * 100, 100)
    : 0;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'TODO': return 'bg-gray-100 text-gray-800';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
      case 'REVIEW': return 'bg-yellow-100 text-yellow-800';
      case 'TESTING': return 'bg-purple-100 text-purple-800';
      case 'DONE': return 'bg-green-100 text-green-800';
      case 'BLOCKED': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'LOW': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
      case 'HIGH': return 'bg-orange-100 text-orange-800';
      case 'CRITICAL': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Task Details</h2>
                  <p className="text-sm text-gray-600">{service?.name}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => onDelete(task.id)}
                  className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="space-y-6">
              {/* Task Info */}
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{task.title}</h3>
                <div className="flex items-center space-x-3 mb-4">
                  <Badge className={getStatusColor(task.status)}>
                    {task.status.replace('_', ' ')}
                  </Badge>
                  <Badge className={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                </div>
                {task.description && (
                  <p className="text-gray-600 leading-relaxed">{task.description}</p>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Assignment & Timeline</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Assignee</span>
                      <p className="text-gray-900">{task.assignee_name || 'Unassigned'}</p>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium text-gray-500">Due Date</span>
                      <p className="text-gray-900">
                        {task.due_date ? formatDate(task.due_date) : 'No due date set'}
                      </p>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium text-gray-500">Created</span>
                      <p className="text-gray-900">{formatDate(task.created_at)}</p>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium text-gray-500">Last Updated</span>
                      <p className="text-gray-900">{formatDate(task.updated_at)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Progress & Effort</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-gray-500">Time Tracking</span>
                      <div className="mt-1">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span>Progress: {task.actual_hours || 0}h / {task.estimated_hours || 0}h</span>
                          <span className="font-medium">{Math.round(progressPercentage)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium text-gray-500">Estimated Hours</span>
                      <p className="text-gray-900">{task.estimated_hours || 0} hours</p>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium text-gray-500">Actual Hours</span>
                      <p className="text-gray-900">{task.actual_hours || 0} hours</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Tags</h4>
                  <div className="flex gap-2 flex-wrap">
                    {task.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

function TaskEditModal({ 
  task, 
  isOpen, 
  onClose, 
  onSave, 
  services 
}: {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskId: string, updates: Partial<Task>) => Promise<void>;
  services: QIGService[];
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    service_id: '',
    priority: 'MEDIUM' as Task['priority'],
    status: 'TODO' as Task['status'],
    assignee_name: '',
    estimated_hours: '',
    actual_hours: '',
    due_date: '',
    tags: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form when task changes
  React.useEffect(() => {
    if (task && isOpen) {
      setFormData({
        title: task.title,
        description: task.description || '',
        service_id: task.service_id,
        priority: task.priority,
        status: task.status,
        assignee_name: task.assignee_name || '',
        estimated_hours: task.estimated_hours?.toString() || '',
        actual_hours: task.actual_hours?.toString() || '',
        due_date: task.due_date ? task.due_date.split('T')[0] : '',
        tags: task.tags?.join(', ') || ''
      });
    }
  }, [task, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !formData.title || !formData.service_id) return;

    setIsSubmitting(true);
    try {
      const updates: Partial<Task> = {
        title: formData.title,
        description: formData.description || undefined,
        service_id: formData.service_id,
        priority: formData.priority,
        status: formData.status,
        assignee_name: formData.assignee_name || undefined,
        estimated_hours: formData.estimated_hours ? parseInt(formData.estimated_hours) : undefined,
        actual_hours: formData.actual_hours ? parseInt(formData.actual_hours) : undefined,
        due_date: formData.due_date || undefined,
        tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : undefined,
        updated_at: new Date().toISOString()
      };

      await onSave(task.id, updates);
      onClose();
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !task) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Edit className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Edit Task</h2>
                  <p className="text-sm text-gray-600">Update task information</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title" className="text-sm font-medium text-gray-900">
                  Task Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-description" className="text-sm font-medium text-gray-900">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="mt-1 resize-none"
                />
              </div>
            </div>

            {/* Assignment & Organization */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-service" className="text-sm font-medium text-gray-900">
                  Service <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.service_id} onValueChange={(value) => setFormData(prev => ({ ...prev, service_id: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(service => (
                      <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-assignee" className="text-sm font-medium text-gray-900">Assignee</Label>
                <Input
                  id="edit-assignee"
                  value={formData.assignee_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, assignee_name: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Status & Priority */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-status" className="text-sm font-medium text-gray-900">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as Task['status'] }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODO">To Do</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="REVIEW">Review</SelectItem>
                    <SelectItem value="TESTING">Testing</SelectItem>
                    <SelectItem value="DONE">Done</SelectItem>
                    <SelectItem value="BLOCKED">Blocked</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-priority" className="text-sm font-medium text-gray-900">Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as Task['priority'] }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Time & Date */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-estimated" className="text-sm font-medium text-gray-900">Estimated Hours</Label>
                <Input
                  id="edit-estimated"
                  type="number"
                  min="0"
                  value={formData.estimated_hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_hours: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit-actual" className="text-sm font-medium text-gray-900">Actual Hours</Label>
                <Input
                  id="edit-actual"
                  type="number"
                  min="0"
                  step="0.5"
                  value={formData.actual_hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, actual_hours: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit-due-date" className="text-sm font-medium text-gray-900">Due Date</Label>
                <Input
                  id="edit-due-date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <Label htmlFor="edit-tags" className="text-sm font-medium text-gray-900">Tags</Label>
              <Input
                id="edit-tags"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="Enter tags separated by commas"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple tags with commas</p>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !formData.title || !formData.service_id}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default function ServiceStatusDashboard() {
  const { user } = useAuth();
  const [selectedService, setSelectedService] = useState<QIGService | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showTaskModal, setShowTaskModal] = useState(false);
  
  // Track if this is the first load attempt
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);

  // Stale data for services with enhanced error handling
  const { 
    data: servicesData, 
    isLoading: servicesLoading, 
    isValidating: servicesValidating,
    error: servicesError,
    refresh: refreshServices
  } = useStaleServiceStatus();

  // Destructure services and metrics from the data
  const services = servicesData?.services || [];
  const metrics = servicesData?.metrics || {
    totalServices: 0,
    servicesByStatus: {} as Record<ServiceStatus, number>,
    servicesByCategory: {} as Record<ServiceCategory, number>,
    completionRate: 0,
    upcomingDeadlines: [],
    recentUpdates: []
  };

  const {
    tasks,
    createTask,
    updateTask,
    deleteTask,
    isLoading: tasksLoading,
    error: tasksError
  } = useTaskManagement();

  // Track loading attempts
  useEffect(() => {
    if (!servicesLoading && !hasAttemptedLoad) {
      setHasAttemptedLoad(true);
    }
  }, [servicesLoading, hasAttemptedLoad]);

  // Mock data if hooks aren't working
  const mockServices: QIGService[] = [
    {
      id: '1',
      name: 'QIG Core Platform',
      description: 'Main platform providing core functionality for QIG services',
      status: 'LIVE' as ServiceStatus,
      category: 'CORE' as ServiceCategory,
      priority: 'CRITICAL',
      team: 'Core Development',
      owner: 'John Doe',
      progress: 95,
      keyFeatures: ['Authentication', 'API Gateway', 'Data Management', 'User Interface'],
      technicalStack: ['React', 'Node.js', 'PostgreSQL', 'Redis'],
      dependencies: ['AWS Infrastructure', 'Auth0'],
      targetLaunchDate: '2024-01-15',
      actualLaunchDate: '2024-01-20',
      lastUpdated: '2024-01-25',
      createdAt: '2023-12-01',
      tags: ['core', 'platform'],
      clientFacing: true,
      internalOnly: false
    },
    {
      id: '2', 
      name: 'Analytics Dashboard',
      description: 'Comprehensive analytics and reporting dashboard',
      status: 'IN_DEVELOPMENT' as ServiceStatus,
      category: 'ANALYTICS' as ServiceCategory,
      priority: 'HIGH',
      team: 'Analytics Team',
      owner: 'Jane Smith',
      progress: 75,
      keyFeatures: ['Real-time Analytics', 'Custom Reports', 'Data Visualization'],
      technicalStack: ['React', 'D3.js', 'MongoDB', 'Node.js'],
      dependencies: ['Data Pipeline', 'Core Platform'],
      targetLaunchDate: '2024-03-01',
      lastUpdated: '2024-01-20',
      createdAt: '2023-12-15',
      tags: ['analytics', 'dashboard'],
      clientFacing: true,
      internalOnly: false
    },
    {
      id: '3',
      name: 'Automated Testing Suite',
      description: 'Comprehensive automated testing framework',
      status: 'TESTING' as ServiceStatus,
      category: 'AUTOMATION' as ServiceCategory,
      priority: 'MEDIUM',
      team: 'QA Team',
      owner: 'Mike Johnson',
      progress: 60,
      keyFeatures: ['Unit Testing', 'Integration Testing', 'Performance Testing'],
      technicalStack: ['Jest', 'Cypress', 'Docker', 'Jenkins'],
      dependencies: ['CI/CD Pipeline'],
      targetLaunchDate: '2024-02-15',
      lastUpdated: '2024-01-18',
      createdAt: '2024-01-01',
      tags: ['testing', 'automation'],
      clientFacing: false,
      internalOnly: true
    }
  ];

  // Use real data if available, otherwise fall back to mock data
  const displayServices = services && services.length > 0 ? services : mockServices;
  
  // Determine actual loading state
  const isActuallyLoading = servicesLoading && !hasAttemptedLoad;

  // Filter services
  const filteredServices = displayServices.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || service.status === statusFilter;
    const matchesCategory = categoryFilter === 'ALL' || service.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleViewService = (service: QIGService) => {
    setSelectedService(service);
    setModalMode('view');
    setModalOpen(true);
  };

  const handleEditService = (service: QIGService) => {
    setSelectedService(service);
    setModalMode('edit');
    setModalOpen(true);
  };

  const handleCreateService = () => {
    setSelectedService(null);
    setModalMode('create');
    setModalOpen(true);
  };

  const handleCreateTask = async (taskData: any) => {
    try {
      await createTask(taskData);
      // Refresh any related data
    } catch (error) {
      console.error('Failed to create task:', error);
      throw error;
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshServices();
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };

  // Show loading spinner only for initial load
  if (isActuallyLoading) {
    return (
      <QIGOnlyAccess>
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading services...</p>
            <button 
              onClick={handleRefresh}
              className="mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </QIGOnlyAccess>
    );
  }

  // Show error state with retry option
  if (servicesError && !services?.length) {
    return (
      <QIGOnlyAccess>
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center max-w-md">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Services</h2>
            <p className="text-gray-600 mb-4">{servicesError.message || 'Unknown error occurred'}</p>
            <div className="space-y-2">
              <button 
                onClick={handleRefresh}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <RefreshCw className="w-4 h-4 mr-2 inline" />
                Try Again
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </QIGOnlyAccess>
    );
  }

  return (
    <ErrorBoundary level="page" context="admin-services">
      <QIGOnlyAccess>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <div className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Service Management</h1>
                  <p className="mt-2 text-gray-600">Monitor and manage QIG services and projects</p>
                  {(servicesError || tasksError) && (
                    <div className="mt-2 flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-yellow-600">
                        Some data may be using cached content
                      </span>
                      <button 
                        onClick={handleRefresh}
                        className="text-sm text-blue-600 hover:text-blue-700 underline"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  {/* Add stale data indicator */}
                  <div className="mt-2">
                    <StaleDataIndicator
                      isLoading={servicesLoading && !servicesData}
                      isValidating={servicesValidating}
                      error={servicesError}
                      onRefresh={handleRefresh}
                      dataSource="Services"
                      showDetails={false}
                    />
                  </div>
                </div>
                <div className="flex space-x-3">
                  <Button 
                    onClick={() => setShowTaskModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Task
                  </Button>
                  <Button onClick={handleCreateService} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    New Service
                  </Button>
                  <Button onClick={handleRefresh} variant="outline" size="sm">
                    <RefreshCw className={`w-4 h-4 ${servicesValidating ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <OverviewTab services={displayServices} tasks={tasks || []} />
              </TabsContent>

              <TabsContent value="services" className="space-y-6">
                <ServicesTab 
                  services={filteredServices}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  categoryFilter={categoryFilter}
                  setCategoryFilter={setCategoryFilter}
                  viewMode={viewMode}
                  setViewMode={setViewMode}
                  onViewService={handleViewService}
                  onEditService={handleEditService}
                />
              </TabsContent>

              <TabsContent value="tasks" className="space-y-6">
                <TasksTab 
                  tasks={tasks || []}
                  services={displayServices}
                  onCreateTask={handleCreateTask}
                  onUpdateTask={async (id: string, updates: any) => {
                    await updateTask(id, updates);
                  }}
                  onDeleteTask={async (id: string) => {
                    await deleteTask(id);
                  }}
                />
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                <AnalyticsTab services={displayServices} tasks={tasks || []} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Modals */}
          <ServiceModal
            service={selectedService}
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            mode={modalMode}
          />

          <TaskCreationModal
            isOpen={showTaskModal}
            onClose={() => setShowTaskModal(false)}
            onCreateTask={handleCreateTask}
            services={displayServices}
          />
        </div>
      </QIGOnlyAccess>
    </ErrorBoundary>
  );
} 