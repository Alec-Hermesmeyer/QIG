'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Monitor, Activity, Server, Users, Database, Bell, 
  AlertTriangle, X, RefreshCw, Play, Zap, TrendingUp,
  Settings, Download, Upload, Trash2, BarChart3,
  Clock, Shield, Gauge, History, AlertCircle,
  CheckCircle2, XCircle, Pause, Eye
} from 'lucide-react';

// UI Components
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Enhanced Monitoring Hooks
import { 
  useMonitoring, 
  useSystemHealth, 
  useAPIEndpointsHealth, 
  useActiveAlerts, 
  useAlertRules,
  useMonitoringConfig,
  usePerformanceMetrics 
} from '@/hooks/useMonitoring';

// Enhanced Services
import { monitoringConfigService } from '@/services/monitoringConfig';
import { alertingService, EnhancedAlert } from '@/services/alertingService';

// Components
import ProtectedRoute from '@/components/ProtectedRoute';
import HealthChart from '@/components/charts/HealthChart';

// Auth
import { useAuth } from '@/lib/auth/AuthContext';

function QIGOnlyAccess({ children }: { children: React.ReactNode }) {
  const { isQIGOrganization, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">
      <RefreshCw className="w-6 h-6 animate-spin" />
    </div>;
  }

  if (!isQIGOrganization) {
    return <div className="min-h-screen flex items-center justify-center">
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-red-600">Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This monitoring dashboard is restricted to QIG team members only.</p>
        </CardContent>
      </Card>
    </div>;
  }

  return <>{children}</>;
}

function StatusIndicator({ status }: { status: 'healthy' | 'degraded' | 'down' }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'healthy':
        return { color: 'bg-green-500', text: 'Healthy', textColor: 'text-green-700' };
      case 'degraded':
        return { color: 'bg-yellow-500', text: 'Degraded', textColor: 'text-yellow-700' };
      case 'down':
        return { color: 'bg-red-500', text: 'Down', textColor: 'text-red-700' };
      default:
        return { color: 'bg-gray-500', text: 'Unknown', textColor: 'text-gray-700' };
    }
  };

  const config = getStatusConfig();
  
  return (
    <div className="flex items-center space-x-2">
      <div className={`w-3 h-3 rounded-full ${config.color}`}></div>
      <span className={`text-sm font-medium ${config.textColor}`}>{config.text}</span>
    </div>
  );
}

function AlertSeverityBadge({ severity }: { severity: EnhancedAlert['severity'] }) {
  const getConfig = () => {
    switch (severity) {
      case 'critical': return { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' };
      case 'high': return { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' };
      case 'medium': return { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' };
      case 'low': return { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' };
    }
  };

  const config = getConfig();
  return (
    <Badge className={`${config.bg} ${config.text} ${config.border} border`}>
      {severity.toUpperCase()}
    </Badge>
  );
}

function ConfigurationPanel() {
  const { config, updateConfig, resetConfig, exportData, importData, clearHistory, storageInfo } = useMonitoringConfig();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleConfigUpdate = (path: string, value: any) => {
    const pathParts = path.split('.');
    const newConfig = { ...localConfig };
    let current: any = newConfig;
    
    for (let i = 0; i < pathParts.length - 1; i++) {
      current = current[pathParts[i]];
    }
    current[pathParts[pathParts.length - 1]] = value;
    
    setLocalConfig(newConfig);
  };

  const saveConfig = () => {
    updateConfig(localConfig);
  };

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `qig-monitoring-config-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!importFile) return;
    
    try {
      const text = await importFile.text();
      const success = importData(text);
      if (success) {
        alert('Configuration imported successfully!');
        setImportFile(null);
      } else {
        alert('Failed to import configuration. Please check the file format.');
      }
    } catch (error) {
      alert('Error importing configuration: ' + error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Storage Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="mr-2" />
            Storage Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span>Used Storage:</span>
              <span>{storageInfo.usedMB} MB / {storageInfo.totalMB} MB</span>
            </div>
            <Progress value={(storageInfo.usedMB / storageInfo.totalMB) * 100} />
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={localConfig.storage.compressionEnabled}
                onChange={(e) => handleConfigUpdate('storage.compressionEnabled', e.target.checked)}
              />
              <Label>Enable compression</Label>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={clearHistory} className="flex-1">
                <Trash2 className="w-4 h-4 mr-2" />
                Clear History
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Health Check Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Health Check Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Check Interval (seconds)</Label>
              <Input
                type="number"
                value={localConfig.healthCheck.interval / 1000}
                onChange={(e) => handleConfigUpdate('healthCheck.interval', parseInt(e.target.value) * 1000)}
              />
            </div>
            <div>
              <Label>Timeout (seconds)</Label>
              <Input
                type="number"
                value={localConfig.healthCheck.timeout / 1000}
                onChange={(e) => handleConfigUpdate('healthCheck.timeout', parseInt(e.target.value) * 1000)}
              />
            </div>
            <div>
              <Label>Retry Attempts</Label>
              <Input
                type="number"
                value={localConfig.healthCheck.retryAttempts}
                onChange={(e) => handleConfigUpdate('healthCheck.retryAttempts', parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label>Batch Size</Label>
              <Input
                type="number"
                value={localConfig.healthCheck.batchSize}
                onChange={(e) => handleConfigUpdate('healthCheck.batchSize', parseInt(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Thresholds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Response Time - Degraded (ms)</Label>
              <Input
                type="number"
                value={localConfig.alerts.thresholds.responseTime.degraded}
                onChange={(e) => handleConfigUpdate('alerts.thresholds.responseTime.degraded', parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label>Response Time - Critical (ms)</Label>
              <Input
                type="number"
                value={localConfig.alerts.thresholds.responseTime.critical}
                onChange={(e) => handleConfigUpdate('alerts.thresholds.responseTime.critical', parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label>Availability Warning (%)</Label>
              <Input
                type="number"
                value={localConfig.alerts.thresholds.availability.warning}
                onChange={(e) => handleConfigUpdate('alerts.thresholds.availability.warning', parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label>Consecutive Failures</Label>
              <Input
                type="number"
                value={localConfig.alerts.rules.consecutiveFailures}
                onChange={(e) => handleConfigUpdate('alerts.rules.consecutiveFailures', parseInt(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Warmup Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Auto-Warmup Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={localConfig.warmup.autoWarmupEnabled}
              onCheckedChange={(checked) => handleConfigUpdate('warmup.autoWarmupEnabled', checked)}
            />
            <Label>Enable Auto-Warmup</Label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Warmup Interval (minutes)</Label>
              <Input
                type="number"
                value={localConfig.warmup.warmupInterval / 60000}
                onChange={(e) => handleConfigUpdate('warmup.warmupInterval', parseInt(e.target.value) * 60000)}
              />
            </div>
            <div>
              <Label>Grace Period (minutes)</Label>
              <Input
                type="number"
                value={localConfig.alerts.rules.warmupGracePeriod / 60000}
                onChange={(e) => handleConfigUpdate('alerts.rules.warmupGracePeriod', parseInt(e.target.value) * 60000)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export/Import */}
      <Card>
        <CardHeader>
          <CardTitle>Backup & Restore</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button onClick={handleExport} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Export Configuration
            </Button>
            <Button variant="outline" onClick={resetConfig} className="flex-1">
              Reset to Defaults
            </Button>
          </div>
          <div className="flex space-x-2">
            <Input
              type="file"
              accept=".json"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="flex-1"
            />
            <Button onClick={handleImport} disabled={!importFile}>
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
          </div>
          <Button onClick={saveConfig} className="w-full">
            Save Configuration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function AlertManagementPanel() {
  const { alerts, acknowledgeAlert, suppressAlert, history } = useActiveAlerts();
  const { rules, updateRule } = useAlertRules();
  const [selectedAlert, setSelectedAlert] = useState<EnhancedAlert | null>(null);

  const handleAcknowledge = (alertId: string) => {
    acknowledgeAlert(alertId);
  };

  const handleSuppress = (alertId: string, duration: number) => {
    suppressAlert(alertId, duration);
  };

  return (
    <div className="space-y-6">
      {/* Active Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="mr-2" />
            Active Alerts ({alerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>No active alerts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <Card key={alert.id} className="border-l-4 border-l-red-500">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium">{alert.title}</h4>
                          <AlertSeverityBadge severity={alert.severity} />
                          {alert.acknowledged && (
                            <Badge variant="outline" className="text-xs">
                              Acknowledged by {alert.acknowledgedBy}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{alert.description.split('\n')[0]}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>Occurrences: {alert.occurrenceCount}</span>
                          <span>First: {new Date(alert.firstOccurrence).toLocaleString()}</span>
                          <span>Last: {new Date(alert.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {!alert.acknowledged && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAcknowledge(alert.id)}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Ack
                          </Button>
                        )}
                        <Select onValueChange={(value) => handleSuppress(alert.id, parseInt(value))}>
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder="Suppress" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="300000">5 minutes</SelectItem>
                            <SelectItem value="1800000">30 minutes</SelectItem>
                            <SelectItem value="3600000">1 hour</SelectItem>
                            <SelectItem value="86400000">24 hours</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedAlert(alert)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alert Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Rules ({rules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-3 border rounded">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h5 className="font-medium">{rule.name}</h5>
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(enabled) => updateRule(rule.id, { enabled })}
                    />
                  </div>
                  <p className="text-sm text-gray-600">{rule.description}</p>
                  <div className="text-xs text-gray-500 mt-1">
                    Cooldown: {rule.cooldownPeriod / 60000}min | 
                    Conditions: {rule.conditions.length} | 
                    Actions: {rule.actions.length}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alert History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="mr-2" />
            Recent Alert History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {history.slice(0, 10).map((alert) => (
              <div key={`${alert.id}-${alert.timestamp}`} className="flex items-center justify-between p-2 border rounded">
                <div className="flex-1">
                  <span className="text-sm font-medium">{alert.title}</span>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <AlertSeverityBadge severity={alert.severity} />
                    <span>{new Date(alert.timestamp).toLocaleString()}</span>
                    <span>Duration: {Math.round((new Date(alert.timestamp).getTime() - new Date(alert.firstOccurrence).getTime()) / 60000)}min</span>
                  </div>
                </div>
                <Badge variant={alert.resolved ? "outline" : "destructive"}>
                  {alert.resolved ? 'Resolved' : 'Active'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EnhancedMonitoringDashboard() {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(24 * 60 * 60 * 1000); // 24 hours
  
  // Use enhanced monitoring hooks
  const { 
    data: monitoringData, 
    isLoading, 
    error, 
    lastRefresh, 
    refresh, 
    triggerWarmup, 
    clearCaches,
    config 
  } = useMonitoring({ useConfigDefaults: true });

  const systemHealth = useSystemHealth();
  const { endpoints } = useAPIEndpointsHealth();
  const { alerts: enhancedAlerts, count: alertCount } = useActiveAlerts();
  const performance = usePerformanceMetrics();

  // Auto-refresh based on configuration
  const [autoRefresh, setAutoRefresh] = useState(config.dashboard.autoRefresh);

  // Enhanced refresh handler
  const handleRefresh = useCallback(async () => {
    try {
      await refresh();
    } catch (error) {
      console.error('Refresh failed:', error);
    }
  }, [refresh]);

  // Enhanced warmup handler
  const handleTriggerWarmup = useCallback(async () => {
    try {
      await triggerWarmup();
    } catch (error) {
      console.error('Warmup failed:', error);
    }
  }, [triggerWarmup]);

  // Dismiss alert handler
  const handleDismissAlert = useCallback((alertId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId));
  }, []);

  // Filter active alerts
  const activeAlerts = enhancedAlerts.filter(
    alert => !alert.resolved && !dismissedAlerts.has(alert.id)
  );

  if (!monitoringData && isLoading) {
    return (
      <ProtectedRoute>
        <QIGOnlyAccess>
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading enhanced monitoring data...</p>
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
          {/* Enhanced Header */}
          <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                  <h1 className="text-xl font-semibold text-gray-900 flex items-center">
                    <Monitor className="mr-2 text-blue-600" />
                    Enhanced QIG Monitoring
                    <Badge variant="outline" className="ml-3 text-xs">v2.0</Badge>
                  </h1>
                </div>
                <div className="flex items-center space-x-3">
                  {alertCount > 0 && (
                    <Badge variant="destructive" className="animate-pulse">
                      {alertCount} Alert{alertCount > 1 ? 's' : ''}
                    </Badge>
                  )}
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
                    onClick={clearCaches}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear Cache
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
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="charts">Charts & Trends</TabsTrigger>
                <TabsTrigger value="alerts">Alert Management</TabsTrigger>
                <TabsTrigger value="settings">Configuration</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Critical Alerts Section */}
                <AnimatePresence>
                  {activeAlerts.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <Card className="border-red-200 bg-red-50">
                        <CardHeader className="pb-3">
                          <CardTitle className="flex items-center text-red-800">
                            <Bell className="mr-2" />
                            Critical Alerts ({activeAlerts.length})
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {activeAlerts.slice(0, 3).map((alert, index) => (
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
                                <AlertDescription className="text-sm">
                                  {alert.description.split('\n')[0]}
                                </AlertDescription>
                                <div className="mt-2 text-xs text-gray-500">
                                  {new Date(alert.timestamp).toLocaleString()} | 
                                  Occurrences: {alert.occurrenceCount}
                                </div>
                              </Alert>
                            </motion.div>
                          ))}
                          {activeAlerts.length > 3 && (
                            <p className="text-sm text-red-700">
                              +{activeAlerts.length - 3} more alerts...
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* System Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                        <StatusIndicator status={systemHealth.status} />
                        <p className="text-xs text-muted-foreground mt-2">
                          Response time: {Math.round(systemHealth.responseTime)}ms
                        </p>
                        <div className="mt-2 text-xs">
                          <span className="text-gray-500">Threshold: </span>
                          <span className={systemHealth.responseTime > systemHealth.thresholds.degraded ? 'text-red-600' : 'text-green-600'}>
                            {systemHealth.thresholds.degraded}ms
                          </span>
                        </div>
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
                          {performance.memoryUsage}%
                        </div>
                        <Progress value={performance.memoryUsage} className="mt-2" />
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
                              {performance.warmupStatus.lastWarmup
                                ? 'Active'
                                : 'Never Run'
                              }
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {performance.warmupStatus.successRate}% success rate
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
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Activity className="mr-2" />
                        API Endpoints Status
                      </CardTitle>
                      <CardDescription>
                        Real-time health monitoring with intelligent consistency checking.
                        <br />
                        <span className="text-xs text-gray-500 mt-1 block">
                          Smart health checks: Azure backends marked healthy if chat-stream is working.
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {endpoints.map((endpoint, index) => (
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
                                <div className="text-gray-500">Avg Response</div>
                              </div>
                              <div className="text-center">
                                <div className="font-medium">{endpoint.errorCount24h}</div>
                                <div className="text-gray-500">Errors (24h)</div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>

              {/* Charts & Trends Tab */}
              <TabsContent value="charts" className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Health Trends & Analytics</h2>
                  <Select value={selectedTimeRange.toString()} onValueChange={(value) => setSelectedTimeRange(parseInt(value))}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={(1 * 60 * 60 * 1000).toString()}>Last 1 Hour</SelectItem>
                      <SelectItem value={(6 * 60 * 60 * 1000).toString()}>Last 6 Hours</SelectItem>
                      <SelectItem value={(24 * 60 * 60 * 1000).toString()}>Last 24 Hours</SelectItem>
                      <SelectItem value={(7 * 24 * 60 * 60 * 1000).toString()}>Last 7 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Individual Endpoint Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {endpoints.filter(e => e.history && e.history.length > 0).map((endpoint) => (
                    <Card key={endpoint.name}>
                      <CardHeader>
                        <CardTitle className="text-lg">{endpoint.name}</CardTitle>
                        <CardDescription>
                          Current: <StatusIndicator status={endpoint.health.status} />
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <HealthChart
                          data={endpoint.history || []}
                          width={500}
                          height={300}
                          timeRange={selectedTimeRange}
                          endpoint={endpoint.name}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* System Overview Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>System Overview</CardTitle>
                    <CardDescription>
                      Combined health metrics for all monitored endpoints
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <HealthChart
                      data={systemHealth.history || []}
                      width={800}
                      height={400}
                      timeRange={selectedTimeRange}
                      endpoint="System Overview"
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Alert Management Tab */}
              <TabsContent value="alerts">
                <AlertManagementPanel />
              </TabsContent>

              {/* Configuration Tab */}
              <TabsContent value="settings">
                <ConfigurationPanel />
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </QIGOnlyAccess>
    </ProtectedRoute>
  );
} 