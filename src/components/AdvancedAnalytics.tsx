'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Calendar, 
  Clock, 
  MessageCircle, 
  Activity,
  BarChart3,
  Users,
  Brain,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { chatAnalyticsService, ChatAnalytics } from '@/services/chatAnalyticsService';

interface AdvancedAnalyticsProps {
  className?: string;
}

export const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({ className = '' }) => {
  const [analytics, setAnalytics] = useState<ChatAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const hasAnalyticsData = await chatAnalyticsService.hasData();
        setHasData(hasAnalyticsData);
        
        if (hasAnalyticsData) {
          const analyticsData = await chatAnalyticsService.getChatAnalytics();
          setAnalytics(analyticsData);
        }
      } catch (error) {
        console.error('Error loading advanced analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain size={20} className="mr-2 text-purple-600" />
            Advanced Analytics
          </CardTitle>
          <CardDescription>Deep insights from your chat history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent"></div>
            <span className="ml-3 text-slate-600">Loading insights...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasData || !analytics) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain size={20} className="mr-2 text-purple-600" />
            Advanced Analytics
          </CardTitle>
          <CardDescription>Deep insights from your chat history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-500">
            <Brain size={24} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">No chat data available yet</p>
            <p className="text-xs mt-1">Start a conversation to see insights</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const cardVariant = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.4 }
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatHour = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Brain size={20} className="mr-2 text-purple-600" />
          Advanced Analytics
        </CardTitle>
        <CardDescription>Deep insights from your chat history</CardDescription>
      </CardHeader>
      <CardContent>
        <motion.div 
          className="space-y-6"
          initial="hidden"
          animate="visible"
          variants={{
            visible: {
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
        >
          {/* Conversation Patterns */}
          <motion.div variants={cardVariant}>
            <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center">
              <MessageCircle size={16} className="mr-2 text-blue-600" />
              Conversation Patterns
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200/50">
                <div className="text-lg font-bold text-blue-700">
                  {analytics.averageMessagesPerSession}
                </div>
                <div className="text-xs text-blue-600">Avg Messages/Session</div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200/50">
                <div className="text-lg font-bold text-emerald-700">
                  {formatDuration(analytics.averageSessionDuration)}
                </div>
                <div className="text-xs text-emerald-600">Avg Session Duration</div>
              </div>
            </div>
          </motion.div>

          {/* Activity Timeline */}
          <motion.div variants={cardVariant}>
            <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center">
              <Calendar size={16} className="mr-2 text-purple-600" />
              Activity Timeline
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Most Active Day</span>
                <span className="font-medium text-slate-800">{analytics.mostActiveDay}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Peak Usage Hour</span>
                <span className="font-medium text-slate-800">{formatHour(analytics.peakUsageHour)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Active Days</span>
                <span className="font-medium text-slate-800">{analytics.activeDays} days</span>
              </div>
            </div>
          </motion.div>

          {/* Growth Metrics */}
          {(analytics.monthlySessionGrowth !== 0 || analytics.monthlyMessageGrowth !== 0) && (
            <motion.div variants={cardVariant}>
              <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center">
                <TrendingUp size={16} className="mr-2 text-green-600" />
                Growth Metrics
              </h4>
              <div className="space-y-2">
                {analytics.monthlySessionGrowth !== 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Session Growth</span>
                    <span className={`font-medium ${analytics.monthlySessionGrowth > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {analytics.monthlySessionGrowth > 0 ? '+' : ''}{analytics.monthlySessionGrowth}%
                    </span>
                  </div>
                )}
                {analytics.monthlyMessageGrowth !== 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Message Growth</span>
                    <span className={`font-medium ${analytics.monthlyMessageGrowth > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {analytics.monthlyMessageGrowth > 0 ? '+' : ''}{analytics.monthlyMessageGrowth}%
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Current Month Stats */}
          <motion.div variants={cardVariant}>
            <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center">
              <Activity size={16} className="mr-2 text-indigo-600" />
              This Month
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200/50">
                <div className="text-lg font-bold text-indigo-700">
                  {analytics.sessionsThisMonth}
                </div>
                <div className="text-xs text-indigo-600">New Sessions</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-3 border border-amber-200/50">
                <div className="text-lg font-bold text-amber-700">
                  {analytics.messagesThisMonth}
                </div>
                <div className="text-xs text-amber-600">Total Messages</div>
              </div>
            </div>
          </motion.div>

          {/* Activity Status */}
          <motion.div variants={cardVariant}>
            <div className="flex items-center justify-center pt-4 border-t border-slate-200">
              {analytics.activeToday ? (
                <div className="flex items-center text-emerald-600">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-sm font-medium">Active today</span>
                </div>
              ) : (
                <div className="flex items-center text-slate-500">
                  <Clock size={14} className="mr-2" />
                  <span className="text-sm">Last activity: {analytics.recentSessions.length > 0 
                    ? new Date(analytics.recentSessions[0].lastActivity).toLocaleDateString()
                    : 'No recent activity'}</span>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </CardContent>
    </Card>
  );
}; 