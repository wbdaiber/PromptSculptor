import {
  Lightbulb,
  CheckCircle,
  AlertCircle,
  Shield,
  Zap,
  TrendingUp,
  Settings,
  Eye,
  Clock,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface SecurityRecommendationsProps {
  recommendations: string[];
  isLoading: boolean;
}

export default function SecurityRecommendations({ recommendations, isLoading }: SecurityRecommendationsProps) {
  // Enhanced recommendations with actionable details
  const getEnhancedRecommendations = () => {
    type Priority = 'low' | 'medium' | 'high' | 'critical';
    type Category = 'general' | 'incident' | 'traffic' | 'authentication' | 'status' | 'monitoring' | 'maintenance';
    
    const enhanced = recommendations.map(rec => {
      // Default recommendation structure
      let recommendation: {
        title: string;
        description: string;
        priority: Priority;
        icon: any;
        actionable: boolean;
        category: Category;
      } = {
        title: rec,
        description: '',
        priority: 'medium',
        icon: Lightbulb,
        actionable: false,
        category: 'general'
      };

      // Enhance based on content
      if (rec.includes('critical security events')) {
        recommendation = {
          title: 'Critical Security Events Detected',
          description: 'Immediate review of critical security events is required. These may indicate active security threats or system vulnerabilities.',
          priority: 'critical',
          icon: AlertCircle,
          actionable: true,
          category: 'incident'
        };
      } else if (rec.includes('rate limiting activity')) {
        recommendation = {
          title: 'High Rate Limiting Activity',
          description: 'Unusual rate limiting patterns detected. Consider adjusting rate limits or investigating traffic sources for potential attacks.',
          priority: 'high',
          icon: Zap,
          actionable: true,
          category: 'traffic'
        };
      } else if (rec.includes('invalid token attempts')) {
        recommendation = {
          title: 'Multiple Invalid Token Attempts',
          description: 'Detected multiple failed token validation attempts. This could indicate brute force attacks on your authentication system.',
          priority: 'high',
          icon: Shield,
          actionable: true,
          category: 'authentication'
        };
      } else if (rec.includes('operating normally')) {
        recommendation = {
          title: 'System Operating Normally',
          description: 'No security issues detected in the monitored period. Continue monitoring for any changes in security patterns.',
          priority: 'low',
          icon: CheckCircle,
          actionable: false,
          category: 'status'
        };
      } else if (rec.includes('monitoring')) {
        recommendation = {
          title: 'Continue Security Monitoring',
          description: 'Maintain vigilant monitoring of security events and system activity for any unusual patterns.',
          priority: 'medium',
          icon: Eye,
          actionable: false,
          category: 'monitoring'
        };
      }

      return recommendation;
    });

    // Add some default security best practices if no specific recommendations
    if (enhanced.length === 0) {
      enhanced.push(
        {
          title: 'Regular Security Audits',
          description: 'Schedule regular security audits to identify potential vulnerabilities and ensure system integrity.',
          priority: 'medium',
          icon: Settings,
          actionable: true,
          category: 'maintenance'
        },
        {
          title: 'Monitor Authentication Patterns',
          description: 'Keep tracking authentication patterns and failed login attempts to identify potential security threats.',
          priority: 'medium',
          icon: TrendingUp,
          actionable: false,
          category: 'monitoring'
        }
      );
    }

    return enhanced.sort((a, b) => {
      const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  };

  const getPriorityColor = (priority: 'low' | 'medium' | 'high' | 'critical') => {
    switch (priority) {
      case 'critical': return 'text-red-600 dark:text-red-400';
      case 'high': return 'text-orange-600 dark:text-orange-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'low': return 'text-green-600 dark:text-green-400';
      default: return 'text-slate-600 dark:text-slate-400';
    }
  };

  const getPriorityBadgeVariant = (priority: 'low' | 'medium' | 'high' | 'critical') => {
    switch (priority) {
      case 'critical': return 'destructive' as const;
      case 'high': return 'secondary' as const;
      case 'medium': return 'outline' as const;
      case 'low': return 'secondary' as const;
      default: return 'secondary' as const;
    }
  };

  const getCategoryIcon = (category: 'general' | 'incident' | 'traffic' | 'authentication' | 'status' | 'monitoring' | 'maintenance') => {
    switch (category) {
      case 'incident': return AlertCircle;
      case 'traffic': return Zap;
      case 'authentication': return Shield;
      case 'status': return CheckCircle;
      case 'monitoring': return Eye;
      case 'maintenance': return Settings;
      default: return Lightbulb;
    }
  };

  const enhancedRecommendations = getEnhancedRecommendations();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lightbulb className="w-5 h-5" />
            <span>Security Recommendations</span>
          </CardTitle>
          <CardDescription>
            AI-powered security insights and action items
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 border rounded-lg space-y-2">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
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
        <CardTitle className="flex items-center space-x-2">
          <Lightbulb className="w-5 h-5" />
          <span>Security Recommendations</span>
        </CardTitle>
        <CardDescription>
          AI-powered security insights and action items
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {enhancedRecommendations.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">All Clear</h3>
            <p className="text-slate-600 dark:text-slate-400">
              No specific security recommendations at this time. Keep monitoring!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {enhancedRecommendations.map((rec, index) => {
              const Icon = rec.icon;
              
              return (
                <div 
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    rec.priority === 'critical' ? 'border-l-red-500 bg-red-50 dark:bg-red-900/10' :
                    rec.priority === 'high' ? 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/10' :
                    rec.priority === 'medium' ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/10' :
                    'border-l-green-500 bg-green-50 dark:bg-green-900/10'
                  } border border-slate-200 dark:border-slate-700`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`mt-0.5 ${getPriorityColor(rec.priority)}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-slate-900 dark:text-slate-100">
                            {rec.title}
                          </h4>
                          <Badge 
                            variant={getPriorityBadgeVariant(rec.priority)}
                            className="text-xs"
                          >
                            {rec.priority.toUpperCase()}
                          </Badge>
                        </div>
                        
                        {rec.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                            {rec.description}
                          </p>
                        )}
                        
                        {rec.actionable && (
                          <div className="flex items-center space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-xs"
                            >
                              Take Action
                              <ArrowRight className="w-3 h-3 ml-1" />
                            </Button>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              Requires admin intervention
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Badge variant="outline" className="text-xs">
                        {rec.category}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Separator className="my-6" />

        {/* Security Status Summary */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Clock className="w-4 h-4 text-slate-500" />
            <h4 className="font-medium text-sm">Security Status Summary</h4>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-red-600 dark:text-red-400">
                {enhancedRecommendations.filter(r => r.priority === 'critical').length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Critical Issues
              </p>
            </div>
            <div>
              <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                {enhancedRecommendations.filter(r => r.priority === 'high').length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                High Priority
              </p>
            </div>
            <div>
              <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                {enhancedRecommendations.filter(r => r.actionable).length}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Action Required
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}