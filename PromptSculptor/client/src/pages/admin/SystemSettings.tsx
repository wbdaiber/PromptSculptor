import { useState, useEffect } from 'react';
import { Settings, Database, Shield, RefreshCw, Trash2, AlertTriangle, CheckCircle2, Server } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/admin/AdminLayout';
import TokenManagement from '@/components/admin/TokenManagement';
import EmailSystemStatus from '@/components/admin/EmailSystemStatus';
import ConfigurationPanel from '@/components/admin/ConfigurationPanel';
import MaintenanceTools from '@/components/admin/MaintenanceTools';
import {
  getSystemHealth,
  getSystemMetrics,
  triggerTokenCleanup,
  type HealthStatus,
  type MetricsData,
  type CleanupResult,
} from '@/lib/adminApi';
import { useAdminAuth } from '@/context/AdminAuthContext';

interface SystemStatus {
  database: 'connected' | 'disconnected' | 'error';
  email: 'operational' | 'degraded' | 'down';
  security: 'normal' | 'elevated' | 'critical';
  tokens: 'healthy' | 'cleanup_needed' | 'critical';
}

export default function SystemSettings() {
  const { admin } = useAdminAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState<HealthStatus | null>(null);
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    database: 'connected',
    email: 'operational',
    security: 'normal',
    tokens: 'healthy',
  });
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const fetchSystemData = async () => {
    if (!admin) return;
    
    try {
      setLoading(true);
      
      const [health, metrics] = await Promise.all([
        getSystemHealth(),
        getSystemMetrics(),
      ]);
      
      setHealthData(health);
      setMetricsData(metrics);
      
      // Determine system status based on data
      const status: SystemStatus = {
        database: health.checks.find(c => c.name === 'database')?.status === 'pass' ? 'connected' : 'error',
        email: health.checks.find(c => c.name === 'email')?.status === 'pass' ? 'operational' : 'degraded',
        security: health.status === 'healthy' ? 'normal' : 'elevated',
        tokens: (typeof metrics.tokenStatistics === 'object' && 'cleanupRequired' in metrics.tokenStatistics && metrics.tokenStatistics.cleanupRequired > 10) ? 'cleanup_needed' : 'healthy',
      };
      
      setSystemStatus(status);
    } catch (error) {
      console.error('Failed to fetch system data:', error);
      toast({
        title: 'System Data Error',
        description: 'Failed to load system information. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTokenCleanup = async () => {
    if (!admin) return;
    
    try {
      const result = await triggerTokenCleanup();
      
      toast({
        title: 'Token Cleanup Complete',
        description: `Removed ${result.cleanup.tokensRemoved} expired tokens.`,
      });
      
      // Refresh system data
      await fetchSystemData();
    } catch (error) {
      toast({
        title: 'Cleanup Failed',
        description: 'Failed to clean up expired tokens. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const toggleMaintenanceMode = () => {
    setMaintenanceMode(!maintenanceMode);
    toast({
      title: maintenanceMode ? 'Maintenance Mode Disabled' : 'Maintenance Mode Enabled',
      description: maintenanceMode 
        ? 'System is now operational for all users.' 
        : 'System is now in maintenance mode.',
      variant: maintenanceMode ? 'default' : 'destructive',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'operational':
      case 'normal':
      case 'healthy':
        return 'text-green-600 dark:text-green-400';
      case 'degraded':
      case 'elevated':
      case 'cleanup_needed':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'disconnected':
      case 'down':
      case 'error':
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-slate-600 dark:text-slate-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'operational':
      case 'normal':
      case 'healthy':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'degraded':
      case 'elevated':
      case 'cleanup_needed':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'disconnected':
      case 'down':
      case 'error':
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <RefreshCw className="w-4 h-4 text-slate-500" />;
    }
  };

  const getSystemHealthPercentage = () => {
    if (!healthData) return 0;
    
    const passedChecks = healthData.checks.filter(c => c.status === 'pass').length;
    return Math.round((passedChecks / healthData.checks.length) * 100);
  };

  useEffect(() => {
    fetchSystemData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchSystemData, 30000);
    return () => clearInterval(interval);
  }, [admin]);

  if (loading && !healthData) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading system settings...</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              System Administration
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              System maintenance tools and configuration management
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <Server className="w-3 h-3 mr-1" />
              Phase 4
            </Badge>
          </div>
        </div>

        {/* System Status Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* System Health */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                System Health Overview
              </CardTitle>
              <CardDescription>
                Current system status and health metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Health</span>
                <Badge variant={healthData?.status === 'healthy' ? 'default' : 'destructive'}>
                  {healthData?.status || 'Unknown'}
                </Badge>
              </div>
              
              <Progress value={getSystemHealthPercentage()} className="h-2" />
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Database</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(systemStatus.database)}
                    <span className={`text-sm font-medium ${getStatusColor(systemStatus.database)}`}>
                      {systemStatus.database}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Email Service</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(systemStatus.email)}
                    <span className={`text-sm font-medium ${getStatusColor(systemStatus.email)}`}>
                      {systemStatus.email}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Security</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(systemStatus.security)}
                    <span className={`text-sm font-medium ${getStatusColor(systemStatus.security)}`}>
                      {systemStatus.security}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Token System</span>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(systemStatus.tokens)}
                    <span className={`text-sm font-medium ${getStatusColor(systemStatus.tokens)}`}>
                      {systemStatus.tokens}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Common administrative tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={fetchSystemData}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh System Status
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={handleTokenCleanup}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clean Up Tokens
              </Button>
              
              <Button
                variant={maintenanceMode ? "default" : "destructive"}
                size="sm"
                className="w-full justify-start"
                onClick={toggleMaintenanceMode}
              >
                <Settings className="w-4 h-4 mr-2" />
                {maintenanceMode ? 'Exit' : 'Enter'} Maintenance Mode
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Maintenance Mode Alert */}
        {maintenanceMode && (
          <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              <strong>Maintenance Mode Active:</strong> The system is currently in maintenance mode. 
              Regular users may experience limited functionality.
            </AlertDescription>
          </Alert>
        )}

        {/* Management Sections */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Token Management */}
          <TokenManagement
            metricsData={metricsData}
            onTokenCleanup={handleTokenCleanup}
            loading={loading}
          />

          {/* Email System Status */}
          <EmailSystemStatus
            healthData={healthData}
            metricsData={metricsData}
            loading={loading}
          />
        </div>

        {/* Configuration Panel */}
        <ConfigurationPanel
          systemStatus={systemStatus}
          maintenanceMode={maintenanceMode}
          onMaintenanceModeChange={setMaintenanceMode}
        />

        {/* Maintenance Tools */}
        <MaintenanceTools
          healthData={healthData}
          metricsData={metricsData}
          onRefresh={fetchSystemData}
          loading={loading}
        />
      </div>
    </AdminLayout>
  );
}