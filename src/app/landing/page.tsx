"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  Building2, 
  Settings, 
  Brain,
  MessageSquare,
  FileText,
  BookOpen,
  Clock,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Zap,
  Shield,
  Users,
  BarChart3,
  TrendingUp,
  Activity,
  Calendar,
  Eye,
  Star,
  ChevronRight,
  Target,
  Timer,
  TrendingDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { LOGOS_BUCKET, getOrganizationLogoUrl } from "@/lib/supabase/storage";
import { clientConfigService } from "@/services/clientConfigService";
import { ClientConfiguration } from "@/types/client-config";
import { useOrganizationSwitch } from "@/contexts/OrganizationSwitchContext";
import { OrganizationSwitcher } from "@/components/OrganizationSwitcher";
import { chatAnalyticsService, ChatAnalytics } from "@/services/chatAnalyticsService";
import { ChatProvider } from "@/components/ChatProvider";

// Enhanced animation variants
const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

const cardVariant = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: { 
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  }
};

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
  }
};

// Service type definitions
interface ServiceInfo {
  id: string;
  name: string;
  description: string;
  icon: any;
  iconColor: string;
  bgGradient: string;
  features: string[];
  available: boolean;
  path?: string;
  status?: 'active' | 'configured' | 'unavailable';
  badge?: string;
}

// Recent activity interfaces
interface RecentDocument {
  id: string;
  filename: string;
  uploadDate: string;
  fileType: string;
}

interface RecentSession {
  id: string;
  title: string;
  createdAt: string;
  messageCount: number;
}

interface UsageStats {
  documentsProcessed: number;
  questionsAsked: number;
  sessionsCreated: number;
  totalInteractions: number;
  topService: string;
  avgResponseTime: number;
  recentDocuments: number;
  activeToday: boolean;
  monthlyGrowth: number;
}

export default function LandingPage() {
  return (
    <ChatProvider>
      <LandingPageContent />
    </ChatProvider>
  );
}

function LandingPageContent() {
  const router = useRouter();
  const { user, organization } = useAuth();
  const { canSwitchOrganizations, activeOrganization, userOrganization } = useOrganizationSwitch();
  
  const [logoUrl, setLogoUrl] = useState<string>('/defaultLogo.png');
  const [themeColor, setThemeColor] = useState<string>('from-slate-900 via-gray-800 to-slate-900');
  const [clientConfig, setClientConfig] = useState<ClientConfiguration | null>(null);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<ServiceInfo[]>([]);
  
  // Quick Actions & Recent Activity state
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);

  // Refs to track loading state and prevent race conditions
  const loadingRef = useRef(false);
  const initializedRef = useRef(false);

  // Handle window visibility changes to prevent stuck loading states
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && loadingRef.current) {
        // If we're stuck in loading when window becomes visible, reset it
        console.log('Landing: Window became visible, checking loading state...');
        setTimeout(() => {
          if (loadingRef.current && initializedRef.current) {
            console.log('Landing: Resetting stuck loading state');
            setLoading(false);
            loadingRef.current = false;
          }
        }, 1000); // Give 1 second for any pending operations
      }
    };

    const handleFocus = () => {
      // Similar handling for window focus
      if (loadingRef.current && initializedRef.current) {
        setTimeout(() => {
          if (loadingRef.current) {
            console.log('Landing: Window focused, resetting stuck loading state');
            setLoading(false);
            loadingRef.current = false;
          }
        }, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Determine which organization we're showing data for
  const displayOrganization = activeOrganization || organization;

  // Quick action handlers
  const handleNewChat = () => {
    router.push('/fast-rag');
  };

  const handleUploadDocuments = () => {
    router.push('/upload');
  };

  const handleViewAnalytics = () => {
    router.push('/analytics');
  };

  // Fetch organization data and configuration
  useEffect(() => {
    // Prevent multiple simultaneous loading attempts
    if (loadingRef.current) {
      console.log('Already loading landing data, skipping...');
      return;
    }

    const currentDisplayOrganization = activeOrganization || organization;
    
    // Generate services based on organization configuration
    const generateAvailableServices = (config: ClientConfiguration | null) => {
      const allServices: ServiceInfo[] = [
        {
          id: 'chat',
          name: 'AI Document Chat',
          description: 'Engage in natural conversations with your documents using state-of-the-art AI technology.',
          icon: MessageSquare,
          iconColor: 'text-blue-600',
          bgGradient: 'from-blue-50 to-indigo-50',
          features: [
            'Natural language queries',
            'Real-time AI responses', 
            'Citation tracking',
            'Multi-document conversations'
          ],
          available: !!config?.backend_config?.api_url,
          path: '/fast-rag',
          status: config?.backend_config?.api_url ? 'active' : 'unavailable',
          badge: 'Most Popular'
        },
        {
          id: 'deeprag',
          name: 'Advanced Intelligence',
          description: 'Deep document analysis with structured data extraction and advanced reasoning capabilities.',
          icon: Brain,
          iconColor: 'text-violet-600',
          bgGradient: 'from-violet-50 to-purple-50',
          features: [
            'X-Ray document analysis',
            'Structured data extraction',
            'Entity recognition',
            'Advanced AI reasoning'
          ],
          available: !!config?.features?.contract_search,
          path: '/deep-rag',
          status: config?.features?.contract_search ? 'active' : 'unavailable',
          badge: 'Advanced'
        }
      ];

      // Add organization-specific services based on backend URL or type
      if (config?.backend_config?.api_url) {
        // Detect organization type based on backend URL or client name
        const clientName = config.client_name?.toLowerCase() || '';
        const backendUrl = config.backend_config.api_url?.toLowerCase() || '';
        
        if (backendUrl.includes('content') || clientName.includes('content')) {
          allServices.push({
            id: 'content',
            name: 'Content Management',
            description: 'Enterprise-grade content organization, collaboration, and workflow management platform.',
            icon: BookOpen,
            iconColor: 'text-amber-600',
            bgGradient: 'from-amber-50 to-orange-50',
            features: [
              'Intelligent categorization',
              'Version control',
              'Team collaboration',
              'Publishing workflows'
            ],
            available: true,
            path: '/content',
            status: 'active'
          });
        }
      }

      // For QIG users, add admin services
      if (userOrganization?.name === 'QIG') {
        allServices.push({
          id: 'admin',
          name: 'System Administration',
          description: 'Comprehensive system management, configuration, and monitoring dashboard.',
          icon: Settings,
          iconColor: 'text-slate-600',
          bgGradient: 'from-slate-50 to-gray-50',
          features: [
            'Organization management',
            'Backend configuration',
            'User administration',
            'Performance monitoring'
          ],
          available: true,
          path: '/admin',
          status: 'active',
          badge: 'Admin Only'
        });
      }

      setServices(allServices);
    };
    
    const fetchOrganizationData = async () => {
      if (!currentDisplayOrganization?.id) {
        console.log('No organization ID available');
        setLoading(false);
        loadingRef.current = false;
        return;
      }
      
      setLoading(true);
      loadingRef.current = true;
      console.log('Fetching data for organization:', currentDisplayOrganization.name);
      
      try {
        // Fetch client configuration
        const config = await clientConfigService.getClientConfig(currentDisplayOrganization.id);
        setClientConfig(config);
        
        // Fetch complete organization data from database to get theme info
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, name, theme_color, logo_url, created_at')
          .eq('id', currentDisplayOrganization.id)
          .single();
        
        if (orgError) {
          console.warn('Error fetching organization details:', orgError);
        }
        
        // Fetch logo
        const { data: files, error } = await supabase.storage
          .from(LOGOS_BUCKET)
          .list(currentDisplayOrganization.id.toString());
          
        if (!error && files && files.length > 0) {
          const logoPath = `${currentDisplayOrganization.id.toString()}/${files[0].name}`;
          const url = getOrganizationLogoUrl(logoPath);
          setLogoUrl(url);
        } else if (orgData?.logo_url) {
          setLogoUrl(orgData.logo_url);
        } else {
          setLogoUrl('/defaultLogo.png');
        }
        
        // Set enhanced theme gradient based on organization theme
        if (orgData?.theme_color) {
          const color = orgData.theme_color.toLowerCase();
          if (color.includes('blue')) {
            setThemeColor('from-blue-900 via-blue-800 to-indigo-900');
          } else if (color.includes('green')) {
            setThemeColor('from-emerald-900 via-green-800 to-teal-900');
          } else if (color.includes('purple')) {
            setThemeColor('from-purple-900 via-indigo-800 to-blue-900');
          } else if (color.includes('red')) {
            setThemeColor('from-red-900 via-rose-800 to-pink-900');
          } else if (color.includes('orange')) {
            setThemeColor('from-orange-900 via-amber-800 to-yellow-900');
          } else {
            setThemeColor('from-slate-900 via-gray-800 to-slate-900');
          }
        } else {
          // Default theme
          setThemeColor('from-slate-900 via-gray-800 to-slate-900');
        }

        // Generate available services based on configuration
        generateAvailableServices(config);
        
        // Mark as initialized on first successful load
        initializedRef.current = true;
        
      } catch (err) {
        console.error('Failed to fetch organization data:', err);
        // Set fallback theme on error
        setThemeColor('from-slate-900 via-gray-800 to-slate-900');
        setLogoUrl('/defaultLogo.png');
      } finally {
        // Use a small timeout to ensure state updates are processed
        setTimeout(() => {
          setLoading(false);
          loadingRef.current = false;
        }, 100);
      }
    };
    
    const fetchRecentActivity = async () => {
      if (!currentDisplayOrganization?.id) return;
      
      setActivityLoading(true);
      try {
        // Fetch recent documents
        const { data: documents, error: docsError } = await supabase
          .from('uploaded_documents')
          .select('id, filename, upload_date, file_type')
          .eq('organization_id', currentDisplayOrganization.id)
          .order('upload_date', { ascending: false })
          .limit(5);

        if (!docsError && documents) {
          setRecentDocuments(documents.map(doc => ({
            id: doc.id,
            filename: doc.filename,
            uploadDate: doc.upload_date,
            fileType: doc.file_type
          })));
        }

        // Fetch chat analytics from IndexedDB
        const analytics = await chatAnalyticsService.getChatAnalytics();
        
        // Set recent sessions from analytics
        setRecentSessions(analytics.recentSessions.slice(0, 5));

        // Calculate documents uploaded this month
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const currentMonthDocs = documents ? documents.filter(doc => {
          const docDate = new Date(doc.upload_date);
          return docDate.getMonth() === currentMonth && docDate.getFullYear() === currentYear;
        }).length : 0;

        // Create enhanced usage statistics
        const stats: UsageStats = {
          documentsProcessed: documents?.length || 0,
          questionsAsked: analytics.totalUserMessages,
          sessionsCreated: analytics.totalSessions,
          totalInteractions: analytics.totalMessages,
          topService: analytics.totalSessions > 0 ? 'AI Document Chat' : 'No activity',
          avgResponseTime: 1.8, // Keep as estimated average for now
          recentDocuments: currentMonthDocs,
          activeToday: analytics.activeToday,
          monthlyGrowth: analytics.monthlySessionGrowth
        };
        setUsageStats(stats);

      } catch (error) {
        console.error('Error fetching recent activity:', error);
      } finally {
        setActivityLoading(false);
      }
    };
    
    fetchOrganizationData();
    fetchRecentActivity();
  }, [activeOrganization?.id, organization?.id, userOrganization?.name]);

  const navigateToService = (service: ServiceInfo) => {
    if (service.available && service.path) {
      router.push(service.path);
    }
  };

  const getStatusConfig = (status?: string) => {
    switch (status) {
      case 'active':
        return {
          icon: <CheckCircle size={14} className="text-emerald-500" />,
          text: 'Active',
          bgColor: 'bg-emerald-50',
          textColor: 'text-emerald-700'
        };
      case 'configured':
        return {
          icon: <Clock size={14} className="text-amber-500" />,
          text: 'Configured',
          bgColor: 'bg-amber-50',
          textColor: 'text-amber-700'
        };
      case 'unavailable':
        return {
          icon: <AlertCircle size={14} className="text-red-500" />,
          text: 'Unavailable',
          bgColor: 'bg-red-50',
          textColor: 'text-red-700'
        };
      default:
        return {
          icon: null,
          text: '',
          bgColor: '',
          textColor: ''
        };
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50">
          <motion.div 
            className="text-center max-w-md mx-auto px-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Modern loader animation */}
            <div className="relative mb-8">
              <motion.div 
                className="w-16 h-16 mx-auto"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                {/* Outer ring */}
                <motion.div
                  className="absolute inset-0 border-4 border-blue-100 rounded-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                />
                
                {/* Animated ring */}
                <motion.div
                  className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-blue-400 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
                
                {/* Inner dot */}
                <motion.div
                  className="absolute inset-4 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.7, 1, 0.7]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </motion.div>
            </div>

            {/* Loading text with animation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <h3 className="text-2xl font-bold text-slate-800 mb-3">
                Loading Your Workspace
              </h3>
              <motion.p 
                className="text-slate-600 text-lg leading-relaxed"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                Preparing your organization services...
              </motion.p>
              
              {/* Progress dots */}
              <div className="flex justify-center space-x-2 mt-6">
                {[0, 1, 2].map((index) => (
                  <motion.div
                    key={index}
                    className="w-2 h-2 bg-blue-400 rounded-full"
                    animate={{
                      scale: [1, 1.5, 1],
                      opacity: [0.4, 1, 0.4]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: index * 0.2,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </ProtectedRoute>
    );
  }

  const statusConfig = getStatusConfig(clientConfig ? 'active' : 'unavailable');

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        {/* Enhanced Header Section */}
        <motion.section
          className={`bg-gradient-to-r ${themeColor} text-white relative overflow-hidden`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-20"></div>
          
          <div className="relative max-w-7xl mx-auto px-6 py-16">
            <div className="flex items-center justify-between">
              <div className="flex items-center max-w-4xl">
                {logoUrl && (
                  <motion.div
                    className="mr-6 bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/20 shadow-2xl"
                    initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    transition={{ delay: 0.3, duration: 0.6, ease: "easeOut" }}
                  >
                    <Image
                      src={logoUrl}
                      alt={displayOrganization?.name || 'Organization'} 
                      width={72} 
                      height={72}
                      className="rounded-xl shadow-lg"
                      onError={() => setLogoUrl('/defaultLogo.png')}
                      priority
                      unoptimized
                    />
                  </motion.div>
                )}
                <div>
                  <motion.h1 
                    className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-white to-white/90 bg-clip-text"
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                  >
                    {displayOrganization?.name || 'QIG'} Intelligence Hub
                  </motion.h1>
                  <motion.p 
                    className="text-xl text-white/90 max-w-2xl font-light leading-relaxed"
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                  >
                    {clientConfig ? 
                      `Advanced ${clientConfig.client_type} document intelligence and analysis platform` :
                      'Intelligent document analysis and business insights'
                    }
                  </motion.p>
                  {activeOrganization?.id !== userOrganization?.id && (
                    <motion.div
                      className="mt-4 inline-flex items-center bg-orange-500/20 backdrop-blur-sm text-orange-100 px-4 py-2 rounded-full border border-orange-400/30"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 }}
                    >
                      <Users size={16} className="mr-2" />
                      Viewing workspace: {activeOrganization?.name}
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Organization Switcher for desktop */}
              {canSwitchOrganizations && (
                <motion.div
                  className="hidden lg:block"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-2 border border-white/20">
                    <OrganizationSwitcher />
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.section>

        {/* Mobile Organization Switcher */}
        {canSwitchOrganizations && (
          <motion.div 
            className="lg:hidden p-6 bg-white border-b border-slate-200"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <OrganizationSwitcher />
          </motion.div>
        )}

        {/* Main Content */}
        <main className="py-16">
          <div className="max-w-7xl mx-auto px-6">

            {/* Enhanced Quick Start & Analytics Dashboard */}
            <motion.div 
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {/* Quick Start & Recent Activity */}
              <motion.div 
                className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden"
                variants={cardVariant}
              >
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-4 border-b border-slate-200/50">
                  <div className="flex items-center">
                    <div className="h-10 w-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-md">
                      <Zap size={20} className="text-white" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-bold text-slate-800">Quick Start</h3>
                      <p className="text-slate-600 text-sm">Get started with your workspace</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <Button
                      onClick={handleNewChat}
                      className="h-16 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                      disabled={!clientConfig?.backend_config?.api_url}
                    >
                      <div className="flex flex-col items-center">
                        <MessageSquare size={20} className="mb-1" />
                        <span className="text-sm font-medium">Start AI Chat</span>
                      </div>
                    </Button>
                    
                    <Button
                      onClick={handleUploadDocuments}
                      variant="outline"
                      className="h-16 border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                    >
                      <div className="flex flex-col items-center">
                        <FileText size={20} className="mb-1 text-blue-600" />
                        <span className="text-sm font-medium text-blue-700">Upload Documents</span>
                      </div>
                    </Button>
                  </div>
                    
                  {/* Additional Quick Actions */}
                  <div className="grid grid-cols-1 gap-3 mb-6">
                    <button
                      onClick={handleViewAnalytics}
                      className="flex items-center justify-center p-3 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
                    >
                      <BarChart3 size={16} className="mr-2 text-purple-600" />
                      <span className="text-sm text-purple-700">View Detailed Analytics</span>
                    </button>
                  </div>
                  
                  {/* Quick Stats Preview */}
                  {usageStats && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200/50 mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <Target size={16} className="text-blue-600 mr-2" />
                          <span className="text-sm font-medium text-blue-800">Quick Overview</span>
                        </div>
                        {usageStats.activeToday && (
                          <div className="flex items-center text-xs text-emerald-600">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full mr-1 animate-pulse"></div>
                            Active today
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3">
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-700">{usageStats.documentsProcessed}</div>
                          <div className="text-xs text-blue-600">Documents</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-emerald-700">{usageStats.sessionsCreated}</div>
                          <div className="text-xs text-emerald-600">Sessions</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-purple-700">{usageStats.questionsAsked}</div>
                          <div className="text-xs text-purple-600">Questions</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Recent Activity */}
                  <div className="pt-6 border-t border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-800 mb-4 flex items-center">
                      <Activity size={16} className="mr-2 text-slate-600" />
                      Recent Activity
                    </h4>
                    
                    {activityLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
                        <span className="ml-3 text-slate-600">Loading activity...</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentDocuments.slice(0, 3).map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200/50 hover:bg-slate-100 transition-colors">
                            <div className="flex items-center">
                              <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                <FileText size={14} className="text-blue-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800 truncate max-w-[200px]">{doc.filename}</p>
                                <p className="text-xs text-slate-500">
                                  {new Date(doc.uploadDate).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <ChevronRight size={16} className="text-slate-400" />
                          </div>
                        ))}
                        
                        {recentSessions.slice(0, 2).map((session) => (
                          <div key={session.id} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200/50 hover:bg-emerald-100 transition-colors">
                            <div className="flex items-center">
                              <div className="h-8 w-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
                                <MessageSquare size={14} className="text-emerald-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800 truncate max-w-[200px]">{session.title}</p>
                                <p className="text-xs text-slate-500">
                                  {session.messageCount} messages • {new Date(session.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <ChevronRight size={16} className="text-slate-400" />
                          </div>
                        ))}
                        
                        {recentDocuments.length === 0 && recentSessions.length === 0 && (
                          <div className="text-center py-6 text-slate-500">
                            <Activity size={24} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No recent activity</p>
                            <p className="text-xs mt-1">Start by uploading documents or creating a chat session</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
              
              {/* Usage Analytics Dashboard */}
              <motion.div 
                className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden"
                variants={cardVariant}
              >
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-slate-200/50">
                  <div className="flex items-center">
                    <div className="h-10 w-10 bg-purple-500 rounded-lg flex items-center justify-center shadow-md">
                      <TrendingUp size={20} className="text-white" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-bold text-slate-800">Usage Analytics</h3>
                      <p className="text-slate-600 text-sm">Real-time workspace insights</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  {activityLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent"></div>
                      <span className="ml-3 text-slate-600">Loading stats...</span>
                    </div>
                  ) : usageStats ? (
                    <div className="space-y-6">
                      {/* Key Metrics */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200/50">
                          <div className="text-2xl font-bold text-blue-700">{usageStats.documentsProcessed}</div>
                          <div className="text-xs text-blue-600 mt-1">Total Documents</div>
                          {usageStats.recentDocuments > 0 && (
                            <div className="text-xs text-emerald-600 mt-1">+{usageStats.recentDocuments} this month</div>
                          )}
                        </div>
                        <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-200/50">
                          <div className="text-2xl font-bold text-emerald-700">{usageStats.questionsAsked}</div>
                          <div className="text-xs text-emerald-600 mt-1">Questions Asked</div>
                          <div className="text-xs text-slate-500 mt-1">Real conversations</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200/50">
                          <div className="text-2xl font-bold text-purple-700">{usageStats.sessionsCreated}</div>
                          <div className="text-xs text-purple-600 mt-1">Chat Sessions</div>
                          <div className="text-xs text-slate-500 mt-1">All time</div>
                        </div>
                        <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200/50">
                          <div className="text-2xl font-bold text-amber-700">{usageStats.totalInteractions}</div>
                          <div className="text-xs text-amber-600 mt-1">Total Messages</div>
                          <div className="text-xs text-slate-500 mt-1">Including responses</div>
                        </div>
                      </div>
                      
                      {/* Performance Metrics */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700">Most Used Service</span>
                          <div className="flex items-center">
                            <Star size={14} className="text-yellow-500 mr-1" />
                            <span className="text-sm text-slate-600">{usageStats.topService}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-700">Avg Response Time</span>
                          <span className="text-sm text-slate-600">{usageStats.avgResponseTime.toFixed(1)}s</span>
                        </div>
                        
                        {usageStats.monthlyGrowth !== 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-700">Monthly Growth</span>
                            <div className={`flex items-center ${usageStats.monthlyGrowth > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {usageStats.monthlyGrowth > 0 ? (
                                <TrendingUp size={14} className="mr-1" />
                              ) : (
                                <TrendingDown size={14} className="mr-1" />
                              )}
                              <span className="text-sm font-medium">{Math.abs(usageStats.monthlyGrowth)}%</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="pt-4 border-t border-slate-200">
                          <div className="text-center">
                            <p className="text-xs text-slate-500 mb-2">
                              Showing activity for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </p>
                            <div className="flex items-center justify-center text-xs text-slate-400">
                              <Activity size={12} className="mr-1" />
                              <span>Data updates in real-time</span>
                            </div>
                            {usageStats.activeToday && (
                              <div className="flex items-center justify-center text-xs text-emerald-600 mt-1">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full mr-1 animate-pulse"></div>
                                <span>Active session today</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <TrendingUp size={24} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No analytics data available</p>
                      <p className="text-xs mt-1">Start using the platform to see insights</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>

            {/* Enhanced Organization Status */}
            {clientConfig && (
              <motion.div 
                className="mb-12 bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden"
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
              >
                <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 px-8 py-6 border-b border-slate-200/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Building2 size={24} className="text-white" />
                      </div>
                      <div className="ml-4">
                        <h2 className="text-2xl font-bold text-slate-800">System Configuration</h2>
                        <p className="text-slate-600">Your workspace configuration and status</p>
                      </div>
                    </div>
                    <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700">
                      <CheckCircle size={14} className="text-emerald-500 mr-2" />
                      <span>{clientConfig?.client_type.charAt(0).toUpperCase() + clientConfig?.client_type.slice(1) || 'Basic'} Plan</span>
                    </div>
                  </div>
                </div>
                
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                          <Zap size={16} className="text-blue-600" />
                        </div>
                        <span className="font-semibold text-slate-800">Backend Service</span>
                      </div>
                      <div className="text-slate-600 text-sm bg-slate-50 p-3 rounded-lg font-mono">
                        {clientConfig?.backend_config?.api_url ? (
                          <div className="flex items-center">
                            <div className="h-2 w-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                            Connected
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <div className="h-2 w-2 bg-red-500 rounded-full mr-2"></div>
                            Not configured
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-emerald-100 rounded-lg flex items-center justify-center mr-3">
                          <Shield size={16} className="text-emerald-600" />
                        </div>
                        <span className="font-semibold text-slate-800">Active Features</span>
                      </div>
                      <div className="text-slate-600 text-sm">
                        {Object.entries(clientConfig?.features || {})
                          .filter(([_, enabled]) => enabled)
                          .map(([feature, _]) => feature.replace(/_/g, ' '))
                          .join(', ') || 'Basic features enabled'}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <div className="h-8 w-8 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                          <BarChart3 size={16} className="text-amber-600" />
                        </div>
                        <span className="font-semibold text-slate-800">Last Updated</span>
                      </div>
                      <div className="text-slate-600 text-sm">
                        {clientConfig?.updated_at ? 
                          new Date(clientConfig.updated_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 
                          'Configuration pending'
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Services Section Header */}
            <motion.div 
              className="text-center mb-12"
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
            >
              <h2 className="text-3xl font-bold text-slate-800 mb-4">Available Services</h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                Choose from our suite of intelligent document analysis and management tools
              </p>
            </motion.div>

            {/* Enhanced Service Cards */}
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {services.map((service) => {
                const statusConfig = getStatusConfig(service.status);
                
                return (
                  <motion.div 
                    key={service.id}
                    className={`group relative bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden transition-all duration-300 ${
                      service.available 
                        ? 'cursor-pointer hover:shadow-2xl hover:-translate-y-2 hover:border-blue-300/50' 
                        : 'opacity-60 cursor-not-allowed'
                    }`}
                    variants={cardVariant}
                    onClick={() => service.available && navigateToService(service)}
                  >
                    {/* Service Badge */}
                    {service.badge && service.available && (
                      <div className="absolute top-4 right-4 z-10">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg">
                          {service.badge}
                        </span>
                      </div>
                    )}
                    
                    {/* Gradient Header */}
                    <div className={`h-32 bg-gradient-to-br ${service.bgGradient} relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5"></div>
                      <div className="absolute bottom-4 left-6">
                        <div className={`h-14 w-14 bg-white rounded-2xl shadow-lg flex items-center justify-center ${
                          service.available ? 'group-hover:scale-110' : ''
                        } transition-transform duration-300`}>
                          <service.icon size={28} className={service.available ? service.iconColor : 'text-slate-400'} />
                        </div>
                      </div>
                      
                      {/* Status Indicator */}
                      <div className="absolute top-4 left-4">
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                          {statusConfig.icon}
                          <span className="ml-1">{statusConfig.text}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Card Content */}
                    <div className="p-6 space-y-4">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors duration-200">
                          {service.name}
                        </h3>
                        <p className="text-slate-600 leading-relaxed">
                          {service.description}
                        </p>
                      </div>
                      
                      {/* Features List */}
                      <div className="space-y-3">
                        {service.features.map((feature, index) => (
                          <div key={index} className="flex items-center text-sm">
                            <div className={`h-6 w-6 rounded-full ${
                              service.available ? 'bg-emerald-100' : 'bg-slate-100'
                            } flex items-center justify-center mr-3 flex-shrink-0`}>
                              <CheckCircle size={12} className={service.available ? 'text-emerald-600' : 'text-slate-400'} />
                            </div>
                            <span className={service.available ? 'text-slate-700' : 'text-slate-500'}>
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>
                      
                    </div>
                    
                    {/* Card Footer */}
                    <div className="px-6 pb-6">
                      <Button 
                        className={`w-full h-12 rounded-xl font-semibold transition-all duration-200 ${
                          service.available 
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl' 
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                        disabled={!service.available}
                      >
                        {service.available ? (
                          <motion.div 
                            className="flex items-center"
                            whileHover={{ x: 4 }}
                            transition={{ duration: 0.2 }}
                          >
                            Launch {service.name} <ArrowRight size={18} className="ml-2" />
                          </motion.div>
                        ) : (
                          'Service Unavailable'
                        )}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
            
            {/* Enhanced Help Section */}
            <motion.div 
              className="mt-16 bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <div className="p-8 text-center">
                <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <MessageSquare size={32} className="text-white" />
                </div>
                
                <h3 className="text-2xl font-bold text-slate-800 mb-4">Need Assistance?</h3>
                <p className="text-slate-600 text-lg leading-relaxed max-w-2xl mx-auto mb-6">
                  Services are automatically configured based on your organization's subscription plan and backend infrastructure.
                  {userOrganization?.name === 'QIG' ? 
                    ' As a system administrator, you have access to configure additional services for any organization.' :
                    ' Contact your system administrator to enable additional features and capabilities.'
                  }
                </p>
                
                {!clientConfig && (
                  <motion.div 
                    className="max-w-md mx-auto bg-amber-50 border border-amber-200 rounded-xl p-6"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1, duration: 0.4 }}
                  >
                    <div className="flex items-center justify-center text-amber-800 mb-3">
                      <AlertCircle size={24} className="mr-3" />
                      <span className="font-semibold">Configuration Required</span>
                    </div>
                    <p className="text-sm text-amber-700 leading-relaxed">
                      No active configuration found for this organization. Backend services may be limited. 
                      Please contact your administrator to complete the setup process.
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}