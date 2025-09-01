import {
  UserX,
  MapPin,
  Clock,
  Zap,
  AlertCircle,
  Shield,
  TrendingUp,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SecurityEvent } from '@/lib/adminApi';

interface FailedLoginTrackerProps {
  events: SecurityEvent[];
  isLoading: boolean;
}

export default function FailedLoginTracker({ events, isLoading }: FailedLoginTrackerProps) {
  // Filter for authentication-related events
  const authEvents = events.filter(event => 
    event.type === 'password_reset_failure' || 
    event.type === 'invalid_token_attempt' ||
    event.type === 'rate_limit_exceeded' ||
    event.type === 'suspicious_activity'
  );

  // Analyze failed attempts by IP
  const analyzeFailedAttempts = () => {
    const ipMap = new Map<string, {
      attempts: number;
      types: Set<string>;
      lastAttempt: Date;
      severity: SecurityEvent['severity'];
    }>();

    authEvents.forEach(event => {
      if (!event.ipAddress) return;
      
      const ip = event.ipAddress;
      if (!ipMap.has(ip)) {
        ipMap.set(ip, {
          attempts: 0,
          types: new Set(),
          lastAttempt: new Date(event.timestamp),
          severity: event.severity
        });
      }
      
      const data = ipMap.get(ip)!;
      data.attempts++;
      data.types.add(event.type);
      
      const eventTime = new Date(event.timestamp);
      if (eventTime > data.lastAttempt) {
        data.lastAttempt = eventTime;
      }
      
      // Keep the highest severity
      if (['critical', 'high', 'medium', 'low'].indexOf(event.severity) < 
          ['critical', 'high', 'medium', 'low'].indexOf(data.severity)) {
        data.severity = event.severity;
      }
    });

    return Array.from(ipMap.entries())
      .map(([ip, data]) => ({ 
        ip, 
        ...data, 
        types: Array.from(data.types) 
      }))
      .sort((a, b) => b.attempts - a.attempts)
      .slice(0, 10);
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getSeverityColor = (severity: SecurityEvent['severity']) => {
    switch (severity) {
      case 'low': return 'text-green-600 dark:text-green-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'high': return 'text-orange-600 dark:text-orange-400';
      case 'critical': return 'text-red-600 dark:text-red-400';
      default: return 'text-slate-600 dark:text-slate-400';
    }
  };

  const getSeverityBadgeVariant = (severity: SecurityEvent['severity']) => {
    switch (severity) {
      case 'critical': return 'destructive' as const;
      case 'high': return 'secondary' as const;
      case 'medium': return 'outline' as const;
      case 'low': return 'secondary' as const;
      default: return 'secondary' as const;
    }
  };

  const formatEventType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const failedAttemptsByIP = analyzeFailedAttempts();
  const totalFailedAttempts = authEvents.length;
  const uniqueIPs = new Set(authEvents.map(e => e.ipAddress).filter(Boolean)).size;
  const recentAttempts = authEvents.slice(0, 5);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserX className="w-5 h-5" />
            <span>Authentication Monitoring</span>
          </CardTitle>
          <CardDescription>
            Failed login attempts and suspicious authentication activity
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
            <Separator />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-slate-200 dark:bg-slate-700 rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <UserX className="w-5 h-5" />
          <span>Authentication Monitoring</span>
        </CardTitle>
        <CardDescription>
          Failed login attempts and suspicious authentication activity
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {totalFailedAttempts}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Total Failed Attempts
            </p>
          </div>
          <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {uniqueIPs}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Unique IP Addresses
            </p>
          </div>
        </div>

        {totalFailedAttempts === 0 ? (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Failed Attempts</h3>
            <p className="text-slate-600 dark:text-slate-400">
              No failed authentication attempts detected. System security is intact.
            </p>
          </div>
        ) : (
          <>
            <Separator />

            {/* Failed Attempts by IP */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center space-x-2">
                <TrendingUp className="w-4 h-4" />
                <span>Top Failed Attempts by IP</span>
              </h4>
              
              <ScrollArea className="h-48">
                <div className="space-y-3">
                  {failedAttemptsByIP.map((item, index) => (
                    <div key={item.ip} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded-full text-xs font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            <span className="font-mono text-sm">{item.ip}</span>
                            <Badge variant={getSeverityBadgeVariant(item.severity)} className="text-xs">
                              {item.severity.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400">
                            <span>{item.attempts} attempts</span>
                            <span>{item.types.length} event type{item.types.length > 1 ? 's' : ''}</span>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{getTimeAgo(item.lastAttempt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className={`text-lg font-bold ${getSeverityColor(item.severity)}`}>
                          {item.attempts}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          attempts
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <Separator />

            {/* Recent Attempts */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center space-x-2">
                <Activity className="w-4 h-4" />
                <span>Recent Authentication Events</span>
              </h4>
              
              <div className="space-y-2">
                {recentAttempts.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
                    No recent authentication events
                  </p>
                ) : (
                  recentAttempts.map((event, index) => (
                    <div key={`${event.timestamp}-${index}`} className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {event.type === 'rate_limit_exceeded' && <Zap className="w-4 h-4 text-orange-500" />}
                          {event.type === 'invalid_token_attempt' && <AlertCircle className="w-4 h-4 text-red-500" />}
                          {event.type === 'password_reset_failure' && <UserX className="w-4 h-4 text-red-500" />}
                          {event.type === 'suspicious_activity' && <Shield className="w-4 h-4 text-purple-500" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {formatEventType(event.type)}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{getTimeAgo(new Date(event.timestamp))}</span>
                            </div>
                            {event.ipAddress && (
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-3 h-3" />
                                <span className="font-mono">{event.ipAddress}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <Badge variant={getSeverityBadgeVariant(event.severity)} className="text-xs">
                        {event.severity.toUpperCase()}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}