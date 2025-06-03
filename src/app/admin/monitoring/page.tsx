'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Monitor, 
  RefreshCw,
  Server,
  Users,
  Zap,
  TrendingUp,
  Bell,
  X,
  Play,
  AlertCircle,
  Info
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useOrganizationSwitch } from '@/contexts/OrganizationSwitchContext';
import { monitoringService, MonitoringData, Alert as MonitoringAlert } from '@/services/monitoringService';

// QIG Access Control Component
function QIGOnlyAccess({ children }: { children: React.ReactNode }) {
  const { canSwitchOrganizations, activeOrganization } = useOrganizationSwitch();

  // Only QIG employees can access admin monitoring
  if (!canSwitchOrganizations) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="mr-2" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              This monitoring dashboard is restricted to QIG team members only.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

// Status indicator component
function StatusIndicator({ status }: { status: 'healthy' | 'degraded' | 'down' }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'healthy':
        return { color: 'bg-green-500', icon: CheckCircle, text: 'Healthy' };
      case 'degraded':
        return { color: 'bg-yellow-500', icon: AlertTriangle, text: 'Degraded' };
      case 'down':
        return { color: 'bg-red-500', icon: AlertCircle, text: 'Down' };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${config.color}`} />
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{config.text}</span>
    </div>
  );
}

// Alert severity badge
function AlertSeverityBadge({ severity }: { severity: MonitoringAlert['severity'] }) {
  const getConfig = () => {
    switch (severity) {
      case 'critical':
        return { variant: 'destructive' as const, text: 'Critical' };
      case 'high':
        return { variant: 'destructive' as const, text: 'High' };
      case 'medium':
        return { variant: 'secondary' as const, text: 'Medium' };
      case 'low':
        return { variant: 'outline' as const, text: 'Low' };
    }
  };

  const config = getConfig();
  return <Badge variant={config.variant}>{config.text}</Badge>;
}

export default function MonitoringDashboard() {
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Load monitoring data
  const loadMonitoringData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await monitoringService.getMonitoringData();
      setMonitoringData(data);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error loading monitoring data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadMonitoringData();
  }, [loadMonitoringData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(loadMonitoringData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadMonitoringData]);

  // Manual refresh handler
  const handleRefresh = useCallback(() => {
    loadMonitoringData();
  }, [loadMonitoringData]);

  // Trigger API warmup
  const handleTriggerWarmup = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('Triggering API warmup from monitoring dashboard...');
      
      const result = await monitoringService.triggerWarmup();
      console.log('Warmup result:', result);
      
      // Show detailed feedback
      if (result.unhealthyEndpoints && result.unhealthyEndpoints.length > 0) {
        console.warn('Some endpoints had issues during warmup:', result.unhealthyEndpoints);
      }
      
      // Refresh data after warmup
      setTimeout(loadMonitoringData, 3000);
    } catch (error) {
      console.error('Error triggering warmup:', error);
      // Still refresh to see if anything improved
      setTimeout(loadMonitoringData, 2000);
    } finally {
      setIsLoading(false);
    }
  }, [loadMonitoringData]);

  // Dismiss alert
  const handleDismissAlert = useCallback((alertId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId));
    monitoringService.resolveAlert(alertId);
  }, []);

  // Filter active alerts
  const activeAlerts = monitoringData?.alerts.filter(
    alert => !alert.resolved && !dismissedAlerts.has(alert.id)
  ) || [];

  if (!monitoringData && isLoading) {
    return (
      <ProtectedRoute>
        <QIGOnlyAccess>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading monitoring data...</p>
            </div>
          </div>
        </QIGOnlyAccess>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <QIGOnlyAccess>
        <div className="min-h-screen bg-gray-50">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-semibold text-gray-900 flex items-center">
                    <Monitor className="mr-2 text-blue-600" />
                    QIG System Monitoring
                    <Badge variant="outline" className="ml-3 text-xs">Internal Tool</Badge>
                  </h1>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-sm text-gray-500">
                    Last updated: {lastRefresh ? lastRefresh.toLocaleTimeString() : 'Never'}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={autoRefresh ? 'bg-green-50 border-green-300' : ''}
                  >
                    <Activity className="w-4 h-4 mr-1" />
                    Auto-refresh {autoRefresh ? 'On' : 'Off'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            {/* Alerts Section */}
            <AnimatePresence>
              {activeAlerts.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mb-6"
                >
                  <Card className="border-red-200 bg-red-50">
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center text-red-800">
                        <Bell className="mr-2" />
                        Active Alerts ({activeAlerts.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {activeAlerts.map((alert, index) => (
                        <motion.div
                          key={alert.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Alert className="relative">
                            <AlertTriangle className="h-4 w-4" />
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{alert.title}</span>
                                <AlertSeverityBadge severity={alert.severity} />
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDismissAlert(alert.id)}
                                className="h-6 w-6 p-0"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <AlertDescription className="whitespace-pre-line text-sm">
                              {alert.description}
                            </AlertDescription>
                            <div className="mt-2 text-xs text-gray-500">
                              {new Date(alert.timestamp).toLocaleString()}
                            </div>
                          </Alert>
                        </motion.div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {/* System Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Overall System Health */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">System Health</CardTitle>
                    <Server className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <StatusIndicator status={monitoringData?.systemHealth.status || 'down'} />
                    <p className="text-xs text-muted-foreground mt-2">
                      Response time: {Math.round(monitoringData?.systemHealth.responseTime || 0)}ms
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Active Users */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Users (24h)</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {monitoringData?.userMetrics.activeUsers24h || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {monitoringData?.userMetrics.totalSessions || 0} total sessions
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Memory Usage */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                    <Database className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {monitoringData?.performance.memoryUsage || 0}%
                    </div>
                    <Progress 
                      value={monitoringData?.performance.memoryUsage || 0} 
                      className="mt-2"
                    />
                  </CardContent>
                </Card>
              </motion.div>

              {/* API Warmup Status */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">API Warmup</CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium">
                          {monitoringData?.performance.warmupStatus.lastWarmup
                            ? 'Active'
                            : 'Never Run'
                          }
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {monitoringData?.performance.warmupStatus.successRate || 0}% success rate
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTriggerWarmup}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Warmup
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* API Endpoints Health */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-8"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="mr-2" />
                    API Endpoints Status
                  </CardTitle>
                  <CardDescription>
                    Real-time health monitoring of all client backends and internal APIs.
                    <br />
                    <span className="text-xs text-gray-500 mt-1 block">
                      Note: Some APIs may show as "degraded" when returning expected error codes (e.g., 400 for missing parameters). 
                      This indicates the service is running but needs proper authentication/parameters.
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {monitoringData?.apiEndpoints.map((endpoint, index) => (
                      <motion.div
                        key={endpoint.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <StatusIndicator status={endpoint.health.status} />
                            <div>
                              <h4 className="font-medium">{endpoint.name}</h4>
                              <p className="text-sm text-gray-500">{endpoint.url}</p>
                              {endpoint.organizationName && (
                                <p className="text-xs text-blue-600 font-medium">
                                  {endpoint.organizationName}
                                </p>
                              )}
                              {endpoint.health.error && (
                                <p className="text-xs text-red-600 mt-1">
                                  {endpoint.health.error}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-6 text-sm">
                          <div className="text-center">
                            <div className="font-medium">{Math.round(endpoint.availability)}%</div>
                            <div className="text-gray-500">Uptime</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">{Math.round(endpoint.avgResponseTime)}ms</div>
                            <div className="text-gray-500">Response</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">{endpoint.errorCount24h}</div>
                            <div className="text-gray-500">Errors (24h)</div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  {/* Health Check Methodology Info */}
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h5 className="font-medium text-blue-900 mb-2">Health Check Methodology</h5>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p>• <strong>Azure Backends:</strong> Simple connectivity test - any response indicates service is running</p>
                      <p>• <strong>Internal APIs:</strong> Smart checks using OPTIONS or minimal payloads to avoid interference</p>
                      <p>• <strong>Status Meanings:</strong></p>
                      <ul className="ml-4 space-y-1">
                        <li>🟢 <strong>Healthy:</strong> Service responding normally</li>
                        <li>🟡 <strong>Degraded:</strong> Service running but slow or returning expected error codes</li>
                        <li>🔴 <strong>Down:</strong> Service not responding or network error</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* User Metrics and Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Activity */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="mr-2" />
                      User Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-2xl font-bold">
                          {monitoringData?.userMetrics.totalMessages || 0}
                        </div>
                        <p className="text-sm text-gray-500">Total Messages</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">
                          {Math.round(monitoringData?.userMetrics.averageSessionDuration || 0)}m
                        </div>
                        <p className="text-sm text-gray-500">Avg Session</p>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">Top Organizations</h4>
                      {monitoringData?.userMetrics.topOrganizations.map((org, index) => (
                        <div key={org.name} className="flex justify-between items-center py-1">
                          <span className="text-sm">{org.name}</span>
                          <Badge variant="outline">{org.messageCount} messages</Badge>
                        </div>
                      )) || (
                        <p className="text-sm text-gray-500">No data available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Performance Metrics */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Monitor className="mr-2" />
                      Performance Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">Memory Usage</span>
                          <span className="text-sm">{monitoringData?.performance.memoryUsage || 0}%</span>
                        </div>
                        <Progress value={monitoringData?.performance.memoryUsage || 0} />
                      </div>
                      
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium">Error Rate</span>
                          <span className="text-sm">{monitoringData?.performance.errorRate || 0}%</span>
                        </div>
                        <Progress value={monitoringData?.performance.errorRate || 0} />
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Requests/min</div>
                        <div className="text-gray-500">{monitoringData?.performance.requestsPerMinute || 0}</div>
                      </div>
                      <div>
                        <div className="font-medium">Warmup Avg Response</div>
                        <div className="text-gray-500">
                          {monitoringData?.performance.warmupStatus.averageResponseTime || 0}ms
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </main>
        </div>
      </QIGOnlyAccess>
    </ProtectedRoute>
  );
} 