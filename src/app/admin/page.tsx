"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Settings, 
  Building2, 
  Users, 
  BarChart3, 
  Database, 
  Shield, 
  HelpCircle,
  ArrowRight,
  Zap,
  MessageSquare,
  FileText,
  Globe,
  Monitor,
  Package,
  Server
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth/AuthContext";

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const cardVariant = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5 }
  }
};

interface AdminFeature {
  id: string;
  title: string;
  description: string;
  icon: any;
  iconColor: string;
  bgGradient: string;
  path: string;
  status: 'available' | 'beta' | 'coming-soon';
  features: string[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, organization } = useAuth();

  // Check if user is QIG admin
  const isQIGAdmin = organization?.name === 'QIG';

  const adminFeatures: AdminFeature[] = [
    {
      id: 'client-config',
      title: 'Client Configuration',
      description: 'Manage organization settings, backend configurations, and service features for all clients.',
      icon: Building2,
      iconColor: 'text-blue-600',
      bgGradient: 'from-blue-50 to-indigo-50',
      path: '/admin/client-config',
      status: 'available',
      features: [
        'Organization management',
        'Backend URL configuration',
        'Feature toggle controls',
        'Service activation'
      ]
    },
    {
      id: 'sample-questions',
      title: 'Sample Questions',
      description: 'Manage pre-defined questions and topic cards for different services and organizations.',
      icon: MessageSquare,
      iconColor: 'text-emerald-600',
      bgGradient: 'from-emerald-50 to-green-50',
      path: '/admin/sample-questions',
      status: 'available',
      features: [
        'Create sample questions',
        'Organize by topics',
        'Service-specific content',
        'Organization targeting'
      ]
    },
    {
      id: 'services',
      title: 'Service Management',
      description: 'Configure and manage QIG platform services, API integrations, and system-wide settings.',
      icon: Server,
      iconColor: 'text-green-600',
      bgGradient: 'from-green-50 to-emerald-50',
      path: '/admin/services',
      status: 'available',
      features: [
        'Service configuration',
        'API endpoint management',
        'Integration settings',
        'System preferences'
      ]
    },
    {
      id: 'monitoring',
      title: 'System Monitoring & Performance',
      description: 'Comprehensive real-time monitoring dashboard with performance analytics, API health tracking, intelligent alerting, and automated optimization.',
      icon: Monitor,
      iconColor: 'text-blue-600',
      bgGradient: 'from-blue-50 to-indigo-50',
      path: '/admin/monitoring',
      status: 'available',
      features: [
        'Real-time performance metrics',
        'API response time monitoring', 
        'Error rate tracking & analysis',
        'User activity analytics',
        'Intelligent auto-fix system',
        'Smart performance recommendations',
        'Historical trends & reporting',
        'Automated system optimization',
        'Advanced alerting with AI insights'
      ]
    },
    {
      id: 'user-management',
      title: 'User Management',
      description: 'Manage user accounts, permissions, and organization assignments across the platform.',
      icon: Users,
      iconColor: 'text-purple-600',
      bgGradient: 'from-purple-50 to-violet-50',
      path: '/admin/users',
      status: 'coming-soon',
      features: [
        'User account management',
        'Role assignments',
        'Organization access',
        'Permission controls'
      ]
    },
    {
      id: 'analytics',
      title: 'System Analytics',
      description: 'Monitor platform usage, performance metrics, and generate comprehensive reports.',
      icon: BarChart3,
      iconColor: 'text-amber-600',
      bgGradient: 'from-amber-50 to-yellow-50',
      path: '/admin/analytics',
      status: 'coming-soon',
      features: [
        'Usage statistics',
        'Performance monitoring',
        'Custom reports',
        'Trend analysis'
      ]
    }
  ];

  const handleFeatureClick = (feature: AdminFeature) => {
    if (feature.status === 'available') {
      router.push(feature.path);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'available':
        return {
          badge: 'Available',
          badgeColor: 'bg-green-100 text-green-800',
          buttonText: 'Access Feature',
          buttonDisabled: false
        };
      case 'beta':
        return {
          badge: 'Beta',
          badgeColor: 'bg-blue-100 text-blue-800',
          buttonText: 'Try Beta',
          buttonDisabled: false
        };
      case 'coming-soon':
        return {
          badge: 'Coming Soon',
          badgeColor: 'bg-gray-100 text-gray-600',
          buttonText: 'Coming Soon',
          buttonDisabled: true
        };
      default:
        return {
          badge: 'Unknown',
          badgeColor: 'bg-gray-100 text-gray-600',
          buttonText: 'Unavailable',
          buttonDisabled: true
        };
    }
  };

  if (!isQIGAdmin) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield size={32} className="text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h1>
            <p className="text-slate-600 mb-6">
              This area is restricted to QIG administrators only.
            </p>
            <Button 
              onClick={() => router.push('/landing')}
              className="bg-slate-600 hover:bg-slate-700"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        {/* Header */}
        <motion.section
          className="bg-gradient-to-r from-slate-900 via-gray-800 to-slate-900 text-white relative overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent"></div>
          
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
            <motion.div
              className="text-center"
              variants={fadeIn}
              initial="hidden"
              animate="visible"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl mb-6">
                <Settings size={32} className="text-white" />
              </div>
              
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                System Administration
              </h1>
              <p className="text-lg lg:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
                Manage and configure the QIG Intelligence Platform. Control organization settings, 
                user access, and system-wide features from this central dashboard.
              </p>
              
              <div className="mt-6 inline-flex items-center bg-blue-500/20 backdrop-blur-sm text-blue-100 px-4 py-2 rounded-full border border-blue-400/30">
                <Shield size={16} className="mr-2" />
                Administrator Access • {user?.email || 'QIG Admin'}
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* Main Content */}
        <main className="py-8 lg:py-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* Quick Stats */}
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8 lg:mb-12"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {[
                { label: 'Organizations', value: '5', icon: Building2, color: 'text-blue-600' },
                { label: 'Active Users', value: '24', icon: Users, color: 'text-emerald-600' },
                { label: 'Services', value: '3', icon: Zap, color: 'text-purple-600' },
                { label: 'Configurations', value: '12', icon: Settings, color: 'text-amber-600' }
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  className="bg-white rounded-xl shadow-lg border border-slate-200/50 p-4 lg:p-6"
                  variants={cardVariant}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">{stat.label}</p>
                      <p className="text-xl lg:text-2xl font-bold text-slate-800">{stat.value}</p>
                    </div>
                    <div className={`h-10 w-10 lg:h-12 lg:w-12 rounded-lg bg-slate-50 flex items-center justify-center`}>
                      <stat.icon size={20} className={`lg:w-6 lg:h-6 ${stat.color}`} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Admin Features */}
            <motion.div
              className="mb-8 lg:mb-12"
              variants={fadeIn}
              initial="hidden"
              animate="visible"
            >
              <div className="text-center mb-6 lg:mb-8">
                <h2 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-4">Administrative Features</h2>
                <p className="text-lg lg:text-xl text-slate-600 max-w-2xl mx-auto">
                  Comprehensive tools for managing the QIG Intelligence Platform
                </p>
              </div>

              <motion.div
                className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {adminFeatures.map((feature) => {
                  const statusConfig = getStatusConfig(feature.status);
                  
                  return (
                    <motion.div
                      key={feature.id}
                      className={`group relative bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden transition-all duration-300 ${
                        feature.status === 'available' 
                          ? 'cursor-pointer hover:shadow-2xl hover:-translate-y-1 hover:border-blue-300/50' 
                          : 'opacity-75'
                      }`}
                      variants={cardVariant}
                      onClick={() => handleFeatureClick(feature)}
                    >
                      {/* Status Badge */}
                      <div className="absolute top-4 right-4 z-10">
                        <Badge className={`${statusConfig.badgeColor} font-medium`}>
                          {statusConfig.badge}
                        </Badge>
                      </div>
                      
                      {/* Header */}
                      <div className={`h-32 bg-gradient-to-br ${feature.bgGradient} relative overflow-hidden`}>
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5"></div>
                        <div className="absolute bottom-4 left-6">
                          <div className={`h-14 w-14 bg-white rounded-2xl shadow-lg flex items-center justify-center ${
                            feature.status === 'available' ? 'group-hover:scale-110' : ''
                          } transition-transform duration-300`}>
                            <feature.icon size={28} className={feature.iconColor} />
                          </div>
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors duration-200">
                          {feature.title}
                        </h3>
                        <p className="text-slate-600 leading-relaxed mb-4">
                          {feature.description}
                        </p>
                        
                        {/* Features List */}
                        <div className="space-y-2 mb-6">
                          {feature.features.map((item, index) => (
                            <div key={index} className="flex items-center text-sm">
                              <div className="h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center mr-3 flex-shrink-0">
                                <div className="h-1.5 w-1.5 bg-emerald-600 rounded-full"></div>
                              </div>
                              <span className="text-slate-700">{item}</span>
                            </div>
                          ))}
                        </div>
                        
                        {/* Action Button */}
                        <Button 
                          className={`w-full h-12 rounded-xl font-semibold transition-all duration-200 ${
                            feature.status === 'available'
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl' 
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                          disabled={statusConfig.buttonDisabled}
                        >
                          {feature.status === 'available' ? (
                            <motion.div 
                              className="flex items-center"
                              whileHover={{ x: 4 }}
                              transition={{ duration: 0.2 }}
                            >
                              {statusConfig.buttonText} <ArrowRight size={18} className="ml-2" />
                            </motion.div>
                          ) : (
                            statusConfig.buttonText
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>

            {/* Help Section */}
            <motion.div 
              className="bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <div className="p-6 lg:p-8 text-center">
                <div className="h-14 w-14 lg:h-16 lg:w-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <HelpCircle size={28} className="lg:w-8 lg:h-8 text-white" />
                </div>
                
                <h3 className="text-xl lg:text-2xl font-bold text-slate-800 mb-4">Need Help?</h3>
                <p className="text-slate-600 text-base lg:text-lg leading-relaxed max-w-xl mx-auto mb-6">
                  Access detailed documentation, system guides, and best practices for managing 
                  the QIG Intelligence Platform.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 justify-center max-w-md mx-auto">
                  <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50 text-sm lg:text-base">
                    <FileText size={16} className="mr-2" />
                    Documentation
                  </Button>
                  <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50 text-sm lg:text-base">
                    <Globe size={16} className="mr-2" />
                    Support Portal
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
} 