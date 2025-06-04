// Central configuration for admin routes and access control
export interface AdminRoute {
  path: string;
  name: string;
  description: string;
  category: 'services' | 'content' | 'analytics' | 'system' | 'monitoring';
  requiresQIG: boolean;
  isImplemented: boolean;
  showInToolbar?: boolean; // New flag to control toolbar visibility
  version?: string;
}

export const adminRoutes: AdminRoute[] = [
  {
    path: '/admin/services',
    name: 'Service Management',
    description: 'Monitor and manage service development lifecycle',
    category: 'services',
    requiresQIG: true,
    isImplemented: true,
    showInToolbar: true,
    version: '2.0'
  },
  {
    path: '/admin/monitoring',
    name: 'System Monitoring',
    description: 'Monitor system health, performance, and resource usage',
    category: 'monitoring',
    requiresQIG: true,
    isImplemented: true,
    showInToolbar: true,
    version: '1.0'
  },
  {
    path: '/admin/sample-questions',
    name: 'Sample Questions',
    description: 'Manage FAQ and sample questions for the AI assistant',
    category: 'content',
    requiresQIG: true,
    isImplemented: true,
    showInToolbar: false, // Hide from toolbar for now
    version: '1.0'
  },
  {
    path: '/documents',
    name: 'Document Management',
    description: 'Upload and manage documents for RAG processing',
    category: 'content',
    requiresQIG: false, // Available to all authenticated users
    isImplemented: true,
    showInToolbar: false, // Hide from toolbar
    version: '1.5'
  },
  {
    path: '/rag-debug',
    name: 'RAG Debug Console',
    description: 'Debug RAG queries, embeddings, and responses',
    category: 'system',
    requiresQIG: true,
    isImplemented: true,
    showInToolbar: false, // Hide from toolbar
    version: '1.0'
  },
  {
    path: '/admin/client-config',
    name: 'Client Configuration',
    description: 'Configure client organizations and settings',
    category: 'system',
    requiresQIG: true,
    isImplemented: false, // Planned feature
    showInToolbar: false,
  },
  {
    path: '/admin/analytics',
    name: 'Usage Analytics',
    description: 'View detailed usage metrics and performance data',
    category: 'analytics',
    requiresQIG: true,
    isImplemented: false, // Planned feature
    showInToolbar: false,
  },
  {
    path: '/admin/user-management',
    name: 'User Management',
    description: 'Manage user accounts, roles, and permissions',
    category: 'system',
    requiresQIG: true,
    isImplemented: false, // Planned feature
    showInToolbar: false,
  },
  {
    path: '/admin/api-keys',
    name: 'API Key Management',
    description: 'Manage API keys and external service integrations',
    category: 'system',
    requiresQIG: true,
    isImplemented: false, // Planned feature
    showInToolbar: false,
  },
  {
    path: '/admin/audit-logs',
    name: 'Audit Logs',
    description: 'View system audit logs and user activity',
    category: 'monitoring',
    requiresQIG: true,
    isImplemented: false, // Planned feature
    showInToolbar: false,
  }
];

// Helper functions
export const getImplementedRoutes = () => adminRoutes.filter(route => route.isImplemented);
export const getQIGOnlyRoutes = () => adminRoutes.filter(route => route.requiresQIG);
export const getToolbarRoutes = () => adminRoutes.filter(route => route.showInToolbar && route.isImplemented);
export const getRoutesByCategory = (category: AdminRoute['category']) => 
  adminRoutes.filter(route => route.category === category);

// Route protection utility
export const isRouteAccessible = (path: string, isQIGOrganization: boolean) => {
  const route = adminRoutes.find(r => path.startsWith(r.path));
  if (!route) return true; // Allow access to non-admin routes
  
  if (route.requiresQIG && !isQIGOrganization) {
    return false;
  }
  
  return true;
};

// Get route metadata
export const getRouteMetadata = (path: string) => {
  return adminRoutes.find(r => path.startsWith(r.path));
}; 