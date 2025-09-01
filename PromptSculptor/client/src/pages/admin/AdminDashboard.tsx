import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Activity, 
  Database, 
  Mail, 
  Shield, 
  Users, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { getSystemHealth, getSystemMetrics } from '@/lib/adminApi';
import type { HealthStatus, MetricsData } from '@/lib/adminApi';
import AdminLayout from '@/components/admin/AdminLayout';

export default function AdminDashboard() {
  const { admin } = useAdminAuth();
  const { toast } = useToast();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Health status query
  const {
    data: healthData,
    isLoading: healthLoading,
    error: healthError,
    refetch: refetchHealth
  } = useQuery<HealthStatus>({
    queryKey: ['admin', 'health'],
    queryFn: () => getSystemHealth(),
    enabled: !!admin,
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: true,
  });

  // Metrics query
  const {
    data: metricsData,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics
  } = useQuery<MetricsData>({
    queryKey: ['admin', 'metrics'],
    queryFn: () => getSystemMetrics(),
    enabled: !!admin,
    refetchInterval: 120000, // Refresh every 2 minutes
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    try {
      await Promise.all([refetchHealth(), refetchMetrics()]);
      setLastUpdated(new Date());
      toast({
        title: 'Dashboard Refreshed',
        description: 'All data has been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh dashboard data.',
        variant: 'destructive',
      });
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'unhealthy':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              System Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Real-time system health and performance monitoring
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Updated {formatTimeAgo(lastUpdated)}
            </span>
            <Button onClick={handleRefresh} size="sm" variant="outline">
              <Activity className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* System Health Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <span>System Health</span>
            </CardTitle>
            <CardDescription>
              Overall system status and component health checks
            </CardDescription>
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-600 dark:text-slate-400" />
                <span className="ml-2 text-slate-600 dark:text-slate-400">Loading health status...</span>
              </div>
            ) : healthError ? (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  Failed to load health status: {healthError.message}
                </AlertDescription>
              </Alert>
            ) : healthData ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getHealthStatusIcon(healthData.status)}
                    <span className="text-lg font-medium text-slate-900 dark:text-slate-100">
                      System Status
                    </span>
                  </div>
                  <Badge className={getHealthStatusColor(healthData.status)}>
                    {healthData.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {healthData.checks.map((check, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center space-x-2">
                        {check.status === 'pass' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {check.name}
                        </span>
                      </div>
                      {check.details && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {check.details}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Quick Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Password Reset Metrics */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center space-x-2">
                <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Password Resets</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metricsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-600 dark:text-slate-400" />
              ) : metricsData?.passwordResetMetrics ? (
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {metricsData.passwordResetMetrics.totalRequests || 0}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Total requests
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">
                    {metricsData.passwordResetMetrics.successfulResets || 0} successful
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400">No data available</div>
              )}
            </CardContent>
          </Card>

          {/* Token Statistics */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center space-x-2">
                <Database className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>Active Tokens</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metricsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-600 dark:text-slate-400" />
              ) : metricsData?.tokenStatistics ? (
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {metricsData.tokenStatistics.active || 0}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Active tokens
                  </div>
                  <div className="text-xs text-red-600 dark:text-red-400">
                    {metricsData.tokenStatistics.expired || 0} expired
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400">No data available</div>
              )}
            </CardContent>
          </Card>

          {/* Email Delivery Rate */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center space-x-2">
                <Mail className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Email Success</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metricsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-600 dark:text-slate-400" />
              ) : metricsData?.passwordResetMetrics?.emailDeliverySuccessRate ? (
                <div className="space-y-2">
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {Math.round(metricsData.passwordResetMetrics.emailDeliverySuccessRate * 100)}%
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    Delivery rate
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400">No data available</div>
              )}
            </CardContent>
          </Card>

          {/* System Uptime Placeholder */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                <span>System Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className={`text-2xl font-bold ${
                  healthData?.status === 'healthy' ? 'text-green-600 dark:text-green-400' :
                  healthData?.status === 'degraded' ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-red-600 dark:text-red-400'
                }`}>
                  {healthData ? (
                    healthData.status === 'healthy' ? 'Online' :
                    healthData.status === 'degraded' ? 'Degraded' :
                    'Issues Detected'
                  ) : 'Checking...'}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {healthData ? (
                    healthData.status === 'healthy' ? 'All systems operational' :
                    `${healthData.checks.filter((c: any) => c.status !== 'pass').length} component(s) with issues`
                  ) : 'Checking system status...'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coming Soon Alert */}
        <Alert>
          <Activity className="w-4 h-4" />
          <AlertDescription>
            <strong>Phase 2 Coming Soon:</strong> User Analytics, Security Monitoring, and detailed charts will be available in the next phase of development.
          </AlertDescription>
        </Alert>
      </div>
    </AdminLayout>
  );
}