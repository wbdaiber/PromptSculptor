import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Shield,
  AlertTriangle,
  Activity,
  RefreshCw,
  TrendingUp,
  Eye,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle,
  XCircle,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { getSecurityReport, SecurityReport } from '@/lib/adminApi';
import SecurityEventTimeline from '@/components/admin/SecurityEventTimeline';
import ThreatDetectionPanel from '@/components/admin/ThreatDetectionPanel';
import FailedLoginTracker from '@/components/admin/FailedLoginTracker';
import SecurityRecommendations from '@/components/admin/SecurityRecommendations';
import AdminLayout from '@/components/admin/AdminLayout';

export default function SecurityMonitoring() {
  const [refreshing, setRefreshing] = useState(false);
  const [timeFilter, setTimeFilter] = useState<number>(24);
  const { admin } = useAdminAuth();
  const { toast } = useToast();

  const {
    data: securityData,
    isLoading,
    error,
    refetch
  } = useQuery<SecurityReport>({
    queryKey: ['admin-security', timeFilter],
    queryFn: () => {
      if (!admin) throw new Error('Not authenticated');
      return getSecurityReport(timeFilter);
    },
    refetchInterval: 60000, // Refresh every minute
    enabled: !!admin,
  });

  const handleManualRefresh = async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      await refetch();
      toast({
        title: "Security data refreshed",
        description: "Latest security information has been loaded.",
      });
    } catch (error) {
      toast({
        title: "Refresh failed", 
        description: "Could not refresh security data. Please check your connection.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleTimeFilterChange = (hours: number) => {
    setTimeFilter(hours);
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high' | 'critical') => {
    switch (severity) {
      case 'low': return 'text-green-600 dark:text-green-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'high': return 'text-orange-600 dark:text-orange-400'; 
      case 'critical': return 'text-red-600 dark:text-red-400';
      default: return 'text-slate-600 dark:text-slate-400';
    }
  };

  const getSeverityBadgeVariant = (severity: 'low' | 'medium' | 'high' | 'critical') => {
    switch (severity) {
      case 'critical': return 'destructive' as const;
      case 'high': return 'secondary' as const;
      case 'medium': return 'outline' as const;
      case 'low': return 'secondary' as const;
      default: return 'secondary' as const;
    }
  };

  if (error) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Security Monitoring
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Real-time security event monitoring and threat detection
              </p>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Failed to load security data</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  {error instanceof Error ? error.message : 'Unknown error occurred'}
                </p>
                <Button onClick={handleManualRefresh} disabled={refreshing}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Security Monitoring
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Real-time security event monitoring and threat detection
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Time Filter */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">Last:</span>
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                {[1, 6, 24, 168].map((hours) => (
                  <button
                    key={hours}
                    onClick={() => handleTimeFilterChange(hours)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      timeFilter === hours
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {hours === 1 ? '1h' : hours === 6 ? '6h' : hours === 24 ? '24h' : '7d'}
                  </button>
                ))}
              </div>
            </div>
            
            <Button 
              onClick={handleManualRefresh} 
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Total Events
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {isLoading ? '-' : securityData?.report.summary.totalEvents || 0}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Last {timeFilter}h
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Critical Events
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {isLoading ? '-' : securityData?.report.summary.criticalEvents || 0}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  High priority
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Rate Limit Violations
                </p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {isLoading ? '-' : securityData?.report.summary.rateLimitViolations || 0}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Blocked requests
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Suspicious Attempts
                </p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {isLoading ? '-' : securityData?.report.summary.suspiciousAttempts || 0}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Potential threats
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Security Dashboard */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Security Event Timeline */}
        <div className="xl:col-span-2 space-y-6">
          <SecurityEventTimeline 
            events={securityData?.report.events || []}
            isLoading={isLoading}
            timeFilter={timeFilter}
          />
          
          <FailedLoginTracker 
            events={securityData?.report.events || []}
            isLoading={isLoading}
          />
        </div>

        {/* Security Panels */}
        <div className="space-y-6">
          <ThreatDetectionPanel 
            events={securityData?.report.events || []}
            summary={securityData?.report.summary}
            isLoading={isLoading}
          />
          
          <SecurityRecommendations 
            recommendations={securityData?.report.recommendations || []}
            isLoading={isLoading}
          />
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}