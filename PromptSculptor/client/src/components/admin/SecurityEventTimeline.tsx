import { useState } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Eye,
  Clock,
  MapPin,
  User,
  Mail,
  ChevronDown,
  ChevronRight,
  Activity,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SecurityEvent } from '@/lib/adminApi';

interface SecurityEventTimelineProps {
  events: SecurityEvent[];
  isLoading: boolean;
  timeFilter: number;
}

export default function SecurityEventTimeline({ events, isLoading, timeFilter }: SecurityEventTimelineProps) {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');

  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const getEventIcon = (type: SecurityEvent['type']) => {
    switch (type) {
      case 'password_reset_request':
        return <Mail className="w-4 h-4" />;
      case 'password_reset_success':
        return <CheckCircle className="w-4 h-4" />;
      case 'password_reset_failure':
        return <XCircle className="w-4 h-4" />;
      case 'rate_limit_exceeded':
        return <Zap className="w-4 h-4" />;
      case 'invalid_token_attempt':
        return <Eye className="w-4 h-4" />;
      case 'suspicious_activity':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getEventColor = (severity: SecurityEvent['severity']) => {
    switch (severity) {
      case 'low':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'high':
        return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      case 'critical':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default:
        return 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
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

  const formatEventType = (type: SecurityEvent['type']) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredEvents = events.filter(event => {
    if (eventTypeFilter === 'all') return true;
    return event.type === eventTypeFilter;
  });

  const eventTypes = Array.from(new Set(events.map(e => e.type)));

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="w-5 h-5" />
            <span>Security Event Timeline</span>
          </CardTitle>
          <CardDescription>
            Real-time security events and activity monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 animate-pulse">
                <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="w-3/4 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="w-1/2 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
                <div className="w-16 h-6 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
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
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Security Event Timeline</span>
            </CardTitle>
            <CardDescription>
              Real-time security events and activity monitoring (Last {timeFilter}h)
            </CardDescription>
          </div>
          
          {/* Event Type Filter */}
          {eventTypes.length > 1 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">Filter:</span>
              <select 
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="text-sm border rounded-md px-2 py-1 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              >
                <option value="all">All Events</option>
                {eventTypes.map(type => (
                  <option key={type} value={type}>
                    {formatEventType(type)}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Security Events</h3>
            <p className="text-slate-600 dark:text-slate-400">
              {events.length === 0 
                ? `No security events recorded in the last ${timeFilter} hours. System is operating normally.`
                : `No events match the current filter. Try selecting "All Events" to see all activity.`
              }
            </p>
          </div>
        ) : (
          <ScrollArea className="h-96">
            <div className="space-y-4">
              {filteredEvents.map((event, index) => {
                const eventId = `${event.timestamp}-${index}`;
                const isExpanded = expandedEvents.has(eventId);
                const colorClasses = getEventColor(event.severity);
                
                return (
                  <div key={eventId} className={`border rounded-lg p-4 ${colorClasses}`}>
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleEventExpansion(eventId)}
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="flex-shrink-0">
                          {getEventIcon(event.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium truncate">
                              {formatEventType(event.type)}
                            </h4>
                            <Badge variant={getSeverityBadgeVariant(event.severity)} className="text-xs">
                              {event.severity.toUpperCase()}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-xs opacity-75">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatTimeAgo(event.timestamp)}</span>
                            </div>
                            
                            {event.ipAddress && (
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-3 h-3" />
                                <span>{event.ipAddress}</span>
                              </div>
                            )}
                            
                            {event.userId && (
                              <div className="flex items-center space-x-1">
                                <User className="w-3 h-3" />
                                <span>{event.userId}</span>
                              </div>
                            )}
                            
                            {event.email && !event.userId && (
                              <div className="flex items-center space-x-1">
                                <Mail className="w-3 h-3" />
                                <span>{event.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <Button variant="ghost" size="sm" className="ml-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    
                    {isExpanded && event.details && (
                      <>
                        <Separator className="my-3" />
                        <div className="space-y-2">
                          <h5 className="font-medium text-sm">Event Details:</h5>
                          <div className="bg-white dark:bg-slate-900 rounded-md p-3 text-sm">
                            <pre className="whitespace-pre-wrap font-mono">
                              {JSON.stringify(event.details, null, 2)}
                            </pre>
                          </div>
                          
                          <div className="text-xs opacity-75">
                            <strong>Full Timestamp:</strong> {new Date(event.timestamp).toLocaleString()}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}