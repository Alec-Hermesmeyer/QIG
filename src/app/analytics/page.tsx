"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Activity, 
  MessageSquare, 
  FileText, 
  Calendar,
  Clock,
  Star,
  Target,
  Users,
  Zap,
  ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/auth/AuthContext";
import { supabase } from "@/lib/supabase/client";
import { chatHistoryService } from "@/services/chatHistoryService";
import { useOrganizationSwitch } from "@/contexts/OrganizationSwitchContext";

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

interface DetailedUsageStats {
  documentsProcessed: number;
  questionsAsked: number;
  sessionsCreated: number;
  totalInteractions: number;
  recentDocuments: number;
  activeToday: boolean;
  monthlyGrowth: number;
  avgSessionLength: number;
  topInteractionDays: { day: string; count: number }[];
  weeklyActivity: { week: string; sessions: number; messages: number }[];
  documentTypes: { type: string; count: number }[];
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, organization } = useAuth();
  const { activeOrganization } = useOrganizationSwitch();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DetailedUsageStats | null>(null);

  const displayOrganization = activeOrganization || organization;

  useEffect(() => {
    const fetchDetailedAnalytics = async () => {
      if (!displayOrganization?.id) return;

      setLoading(true);
      try {
        // Fetch documents
        const { data: documents } = await supabase
          .from('uploaded_documents')
          .select('id, filename, upload_date, file_type')
          .eq('organization_id', displayOrganization.id)
          .order('upload_date', { ascending: false });

        // Fetch chat sessions
        const sessions = chatHistoryService.getAllSessions();
        
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        // Calculate detailed metrics
        const totalMessages = sessions.reduce((total, session) => total + session.messages.length, 0);
        const userMessages = sessions.reduce((total, session) => {
          return total + session.messages.filter(msg => msg.role === 'user').length;
        }, 0);
        
        // Calculate average session length
        const avgSessionLength = sessions.length > 0 ? 
          sessions.reduce((total, session) => total + session.messages.length, 0) / sessions.length : 0;
        
        // Calculate monthly growth
        const currentMonthSessions = sessions.filter(session => {
          const sessionDate = new Date(session.createdAt);
          return sessionDate.getMonth() === currentMonth && sessionDate.getFullYear() === currentYear;
        });
        
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        const lastMonthSessions = sessions.filter(session => {
          const sessionDate = new Date(session.createdAt);
          return sessionDate.getMonth() === lastMonth && sessionDate.getFullYear() === lastMonthYear;
        }).length;
        
        const monthlyGrowth = lastMonthSessions > 0 ? 
          ((currentMonthSessions.length - lastMonthSessions) / lastMonthSessions) * 100 : 
          currentMonthSessions.length > 0 ? 100 : 0;

        // Calculate top interaction days (last 7 days)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date.toDateString();
        });

        const topInteractionDays = last7Days.map(day => {
          const count = sessions.filter(session => {
            const sessionDate = new Date(session.updatedAt || session.createdAt);
            return sessionDate.toDateString() === day;
          }).length;
          return {
            day: new Date(day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            count
          };
        }).reverse();

        // Calculate weekly activity (last 4 weeks)
        const weeklyActivity = Array.from({ length: 4 }, (_, i) => {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - (i * 7 + 7));
          weekStart.setHours(0, 0, 0, 0);
          
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 7);
          
          const weekSessions = sessions.filter(session => {
            const sessionDate = new Date(session.createdAt);
            return sessionDate >= weekStart && sessionDate < weekEnd;
          });
          
          const weekMessages = weekSessions.reduce((total, session) => total + session.messages.length, 0);
          
          return {
            week: `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
            sessions: weekSessions.length,
            messages: weekMessages
          };
        }).reverse();

        // Calculate document types
        const documentTypes = documents ? documents.reduce((acc, doc) => {
          const type = doc.file_type || 'Unknown';
          const existing = acc.find(item => item.type === type);
          if (existing) {
            existing.count++;
          } else {
            acc.push({ type, count: 1 });
          }
          return acc;
        }, [] as { type: string; count: number }[]) : [];

        // Calculate current month docs
        const currentMonthDocs = documents ? documents.filter(doc => {
          const docDate = new Date(doc.upload_date);
          return docDate.getMonth() === currentMonth && docDate.getFullYear() === currentYear;
        }).length : 0;

        // Check if active today
        const today = new Date().toDateString();
        const activeToday = sessions.some(session => {
          const sessionDate = new Date(session.updatedAt || session.createdAt);
          return sessionDate.toDateString() === today;
        });

        setStats({
          documentsProcessed: documents?.length || 0,
          questionsAsked: userMessages,
          sessionsCreated: sessions.length,
          totalInteractions: totalMessages,
          recentDocuments: currentMonthDocs,
          activeToday,
          monthlyGrowth: Math.round(monthlyGrowth),
          avgSessionLength: Math.round(avgSessionLength * 10) / 10,
          topInteractionDays,
          weeklyActivity,
          documentTypes
        });

      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetailedAnalytics();
  }, [displayOrganization?.id]);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-purple-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-slate-600">Loading analytics data...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
        {/* Header */}
        <motion.section
          className="bg-gradient-to-r from-purple-900 via-indigo-800 to-blue-900 text-white relative overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent"></div>
          
          <div className="relative max-w-7xl mx-auto px-6 py-16">
            <motion.div
              className="flex items-center justify-between"
              variants={fadeIn}
              initial="hidden"
              animate="visible"
            >
              <div className="flex items-center">
                <Button
                  onClick={() => router.push('/landing')}
                  variant="outline"
                  className="mr-6 bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <ArrowLeft size={16} className="mr-2" />
                  Back to Dashboard
                </Button>
                
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold mb-4">
                    Usage Analytics
                  </h1>
                  <p className="text-xl text-white/90 max-w-3xl leading-relaxed">
                    Detailed insights into your workspace activity and performance metrics for {displayOrganization?.name}
                  </p>
                </div>
              </div>
              
              <div className="hidden lg:block">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <BarChart3 size={48} className="text-white" />
                </div>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* Main Content */}
        <main className="py-16">
          <div className="max-w-7xl mx-auto px-6">
            
            {stats ? (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="space-y-8"
              >
                {/* Key Metrics Overview */}
                <motion.div variants={cardVariant}>
                  <h2 className="text-2xl font-bold text-slate-800 mb-6">Overview</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200/50">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
                          <FileText size={24} className="text-blue-600" />
                        </div>
                        {stats.recentDocuments > 0 && (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                            +{stats.recentDocuments} this month
                          </span>
                        )}
                      </div>
                      <div className="text-3xl font-bold text-slate-800">{stats.documentsProcessed}</div>
                      <div className="text-slate-600">Total Documents</div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200/50">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-12 w-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                          <MessageSquare size={24} className="text-emerald-600" />
                        </div>
                        {stats.activeToday && (
                          <div className="flex items-center text-xs text-emerald-600">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full mr-1 animate-pulse"></div>
                            Active today
                          </div>
                        )}
                      </div>
                      <div className="text-3xl font-bold text-slate-800">{stats.questionsAsked}</div>
                      <div className="text-slate-600">Questions Asked</div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200/50">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center">
                          <Users size={24} className="text-purple-600" />
                        </div>
                        <div className="text-xs text-slate-500">Avg: {stats.avgSessionLength} msg/session</div>
                      </div>
                      <div className="text-3xl font-bold text-slate-800">{stats.sessionsCreated}</div>
                      <div className="text-slate-600">Chat Sessions</div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200/50">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-12 w-12 bg-amber-100 rounded-xl flex items-center justify-center">
                          <Activity size={24} className="text-amber-600" />
                        </div>
                        {stats.monthlyGrowth !== 0 && (
                          <div className={`flex items-center text-xs ${stats.monthlyGrowth > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {stats.monthlyGrowth > 0 ? (
                              <TrendingUp size={12} className="mr-1" />
                            ) : (
                              <TrendingDown size={12} className="mr-1" />
                            )}
                            {Math.abs(stats.monthlyGrowth)}%
                          </div>
                        )}
                      </div>
                      <div className="text-3xl font-bold text-slate-800">{stats.totalInteractions}</div>
                      <div className="text-slate-600">Total Interactions</div>
                    </div>
                  </div>
                </motion.div>

                {/* Activity Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Daily Activity */}
                  <motion.div variants={cardVariant} className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200/50">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                      <Calendar size={20} className="mr-2 text-slate-600" />
                      Daily Activity (Last 7 Days)
                    </h3>
                    <div className="space-y-4">
                      {stats.topInteractionDays.map((day, index) => {
                        const maxCount = Math.max(...stats.topInteractionDays.map(d => d.count));
                        const percentage = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                        
                        return (
                          <div key={index} className="flex items-center">
                            <div className="w-20 text-sm text-slate-600">{day.day}</div>
                            <div className="flex-1 mx-4">
                              <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                            <div className="w-8 text-sm font-medium text-slate-800">{day.count}</div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>

                  {/* Weekly Trends */}
                  <motion.div variants={cardVariant} className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200/50">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                      <TrendingUp size={20} className="mr-2 text-slate-600" />
                      Weekly Trends
                    </h3>
                    <div className="space-y-4">
                      {stats.weeklyActivity.map((week, index) => (
                        <div key={index} className="border border-slate-200 rounded-lg p-4">
                          <div className="text-sm font-medium text-slate-800 mb-2">{week.week}</div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center">
                              <MessageSquare size={16} className="text-blue-600 mr-2" />
                              <span className="text-sm text-slate-600">{week.sessions} sessions</span>
                            </div>
                            <div className="flex items-center">
                              <Activity size={16} className="text-purple-600 mr-2" />
                              <span className="text-sm text-slate-600">{week.messages} messages</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>

                {/* Document Types */}
                {stats.documentTypes.length > 0 && (
                  <motion.div variants={cardVariant} className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200/50">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                      <FileText size={20} className="mr-2 text-slate-600" />
                      Document Types
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {stats.documentTypes.map((type, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                          <div className="flex items-center">
                            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                              <FileText size={16} className="text-blue-600" />
                            </div>
                            <span className="font-medium text-slate-800">{type.type}</span>
                          </div>
                          <span className="text-lg font-bold text-slate-600">{type.count}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

              </motion.div>
            ) : (
              <motion.div 
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                className="text-center py-16"
              >
                <BarChart3 size={64} className="mx-auto text-slate-400 mb-4" />
                <h2 className="text-2xl font-bold text-slate-800 mb-2">No Data Available</h2>
                <p className="text-slate-600">Start using the platform to see analytics insights.</p>
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
} 