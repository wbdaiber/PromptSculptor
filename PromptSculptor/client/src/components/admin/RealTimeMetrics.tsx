import { useState, useEffect } from 'react';
import { Activity, Clock, TrendingUp, RefreshCw, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import type { AdvancedAnalyticsData } from '@/pages/admin/DatabaseAnalytics';

interface RealTimeMetricsProps {
  data: AdvancedAnalyticsData | null;
  loading: boolean;
  refreshInterval: 'manual' | '5m' | '15m' | '1h';
  onRefreshIntervalChange: (interval: 'manual' | '5m' | '15m' | '1h') => void;
}

interface LiveMetric {
  id: string;
  label: string;
  value: number;
  previousValue: number;
  unit?: string;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'green' | 'blue' | 'purple' | 'orange';
}

export default function RealTimeMetrics({ 
  data, 
  loading, 
  refreshInterval, 
  onRefreshIntervalChange 
}: RealTimeMetricsProps) {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [nextUpdate, setNextUpdate] = useState<number>(0);

  const refreshIntervalMs = {
    'manual': 0,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
  }[refreshInterval];

  // Update countdown timer
  useEffect(() => {
    if (refreshInterval === 'manual' || !refreshIntervalMs) return;

    const updateCountdown = () => {
      const elapsed = Date.now() - lastUpdate.getTime();
      const remaining = Math.max(0, refreshIntervalMs - elapsed);
      setNextUpdate(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [lastUpdate, refreshIntervalMs, refreshInterval]);

  // Reset last update time when data changes
  useEffect(() => {
    if (!loading) {
      setLastUpdate(new Date());
    }
  }, [data, loading]);

  const getLiveMetrics = (): LiveMetric[] => {
    if (!data) return [];
    
    return [
      {
        id: 'active-users',
        label: 'Active Users',
        value: data.userEngagement.activeUsers,
        previousValue: data.userEngagement.activeUsers,
        trend: 'stable',
        changePercent: 0,
        icon: Activity,
        color: 'green',
      },
      {
        id: 'prompts-today',
        label: 'Prompts Today',
        value: data.customMetrics.promptsPerDay[data.customMetrics.promptsPerDay.length - 1]?.count || 0,
        previousValue: data.customMetrics.promptsPerDay[data.customMetrics.promptsPerDay.length - 1]?.count || 0,
        trend: 'stable',
        changePercent: 0,
        icon: Zap,
        color: 'blue',
      },
      {
        id: 'api-keys',
        label: 'API Keys Active',
        value: data.userEngagement.apiKeysConfigured,
        previousValue: data.userEngagement.apiKeysConfigured,
        trend: 'stable',
        changePercent: 0,
        icon: TrendingUp,
        color: 'purple',
      },
      {
        id: 'retention-rate',
        label: 'Retention Rate',
        value: Math.round(data.userRetention.retentionRate),
        previousValue: Math.round(data.userRetention.retentionRate),
        unit: '%',
        trend: 'stable',
        changePercent: 0,
        icon: Clock,
        color: 'orange',
      },
    ];
  };

  const formatTimeRemaining = (ms: number) => {
    if (ms === 0) return 'Now';
    
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getColorClasses = (color: string) => {
    const colors = {
      green: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable', changePercent: number) => {
    if (trend === 'up') return '↗️';
    if (trend === 'down') return '↘️';
    return '→';
  };

  const liveMetrics = getLiveMetrics();

  if (loading && !data) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-slate-100 dark:bg-slate-800 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Real-Time Metrics
            </CardTitle>
            <CardDescription>
              Live dashboard with automatic updates
              {refreshInterval !== 'manual' && (
                <span className="ml-2">
                  • Next update in {formatTimeRemaining(nextUpdate)}
                </span>
              )}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Select value={refreshInterval} onValueChange={onRefreshIntervalChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="5m">5 minutes</SelectItem>
                <SelectItem value="15m">15 minutes</SelectItem>
                <SelectItem value="1h">1 hour</SelectItem>
              </SelectContent>
            </Select>
            
            <Badge variant="outline" className="text-xs">
              <RefreshCw className="w-3 h-3 mr-1" />
              {lastUpdate.toLocaleTimeString()}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {liveMetrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <div
                key={metric.id}
                className="p-4 rounded-lg border bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900"
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className="w-4 h-4 text-slate-500" />
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${getColorClasses(metric.color)}`}
                  >
                    {getTrendIcon(metric.trend, metric.changePercent)}
                    {metric.changePercent.toFixed(1)}%
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {metric.value}{metric.unit}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {metric.label}
                  </div>
                </div>
                
                {/* Progress bar showing change */}
                <div className="mt-3">
                  <Progress 
                    value={Math.min(100, metric.changePercent * 10)} 
                    className="h-1"
                  />
                </div>
              </div>
            );
          })}
        </div>
        
        {refreshInterval !== 'manual' && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>Auto-refresh enabled</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Live updates every {refreshInterval}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}