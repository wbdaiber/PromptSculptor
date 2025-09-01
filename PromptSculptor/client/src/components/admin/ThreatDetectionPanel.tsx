import {
  AlertTriangle,
  Shield,
  Zap,
  Eye,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  MapPin,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { SecurityEvent } from '@/lib/adminApi';

interface ThreatDetectionPanelProps {
  events: SecurityEvent[];
  summary?: {
    totalEvents: number;
    criticalEvents: number;
    rateLimitViolations: number;
    suspiciousAttempts: number;
  };
  isLoading: boolean;
}

export default function ThreatDetectionPanel({ events, summary, isLoading }: ThreatDetectionPanelProps) {
  // Analyze threats from events
  const analyzeThreatLevel = () => {
    if (!events.length) return { level: 'low', score: 0, description: 'No threats detected' };
    
    const criticalEvents = events.filter(e => e.severity === 'critical').length;
    const highEvents = events.filter(e => e.severity === 'high').length;
    const rateLimitEvents = events.filter(e => e.type === 'rate_limit_exceeded').length;
    const suspiciousEvents = events.filter(e => e.type === 'suspicious_activity').length;
    
    let score = 0;
    score += criticalEvents * 25;
    score += highEvents * 15;
    score += rateLimitEvents * 10;
    score += suspiciousEvents * 20;
    
    // Cap at 100
    score = Math.min(score, 100);
    
    if (score >= 75) return { level: 'critical', score, description: 'Critical threats detected - immediate attention required' };
    if (score >= 50) return { level: 'high', score, description: 'High threat activity - investigation recommended' };
    if (score >= 25) return { level: 'medium', score, description: 'Moderate threat activity - monitoring advised' };
    return { level: 'low', score, description: 'Low threat level - system operating normally' };
  };

  const getThreatColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 dark:text-red-400';
      case 'high': return 'text-orange-600 dark:text-orange-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'low': return 'text-green-600 dark:text-green-400';
      default: return 'text-slate-600 dark:text-slate-400';
    }
  };

  const getThreatIcon = (level: string) => {
    switch (level) {
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case 'high': return <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />;
      case 'medium': return <Eye className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
      case 'low': return <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const getTopThreats = () => {
    const threatMap = new Map<string, { count: number; ips: Set<string>; severity: SecurityEvent['severity'] }>();
    
    events.forEach(event => {
      const key = event.type;
      if (!threatMap.has(key)) {
        threatMap.set(key, { count: 0, ips: new Set(), severity: event.severity });
      }
      const threat = threatMap.get(key)!;
      threat.count++;
      if (event.ipAddress) threat.ips.add(event.ipAddress);
      // Keep the highest severity
      if (['critical', 'high', 'medium', 'low'].indexOf(event.severity) < 
          ['critical', 'high', 'medium', 'low'].indexOf(threat.severity)) {
        threat.severity = event.severity;
      }
    });

    return Array.from(threatMap.entries())
      .map(([type, data]) => ({ type, ...data, ips: Array.from(data.ips) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const formatThreatType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const threat = analyzeThreatLevel();
  const topThreats = getTopThreats();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Threat Detection</span>
          </CardTitle>
          <CardDescription>
            AI-powered threat analysis and risk assessment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
            <Separator />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-6 bg-slate-200 dark:bg-slate-700 rounded" />
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
          <Shield className="w-5 h-5" />
          <span>Threat Detection</span>
        </CardTitle>
        <CardDescription>
          AI-powered threat analysis and risk assessment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Threat Level Indicator */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getThreatIcon(threat.level)}
              <span className={`font-semibold ${getThreatColor(threat.level)}`}>
                {threat.level.toUpperCase()} THREAT LEVEL
              </span>
            </div>
            <Badge 
              variant={threat.level === 'critical' ? 'destructive' : 
                     threat.level === 'high' ? 'secondary' : 'outline'}
            >
              Score: {threat.score}/100
            </Badge>
          </div>
          
          <Progress 
            value={threat.score} 
            className="h-3"
            style={{
              // @ts-ignore - Custom CSS property
              '--progress-foreground': 
                threat.level === 'critical' ? 'rgb(220 38 38)' :
                threat.level === 'high' ? 'rgb(234 88 12)' :
                threat.level === 'medium' ? 'rgb(234 179 8)' : 'rgb(34 197 94)'
            }}
          />
          
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {threat.description}
          </p>
        </div>

        <Separator />

        {/* Top Threats */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center space-x-2">
            <TrendingUp className="w-4 h-4" />
            <span>Active Threat Types</span>
          </h4>
          
          {topThreats.length === 0 ? (
            <div className="text-center py-4">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-slate-600 dark:text-slate-400">
                No active threats detected
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {topThreats.map((threat, index) => (
                <div key={threat.type} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded-full text-xs font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {formatThreatType(threat.type)}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400">
                        <span>{threat.count} events</span>
                        {threat.ips.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3" />
                            <span>{threat.ips.length} IP{threat.ips.length > 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Badge 
                    variant={
                      threat.severity === 'critical' ? 'destructive' :
                      threat.severity === 'high' ? 'secondary' : 'outline'
                    }
                    className="text-xs"
                  >
                    {threat.severity.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {summary?.criticalEvents || 0}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Critical Events
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {summary?.rateLimitViolations || 0}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Rate Limit Hits
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}