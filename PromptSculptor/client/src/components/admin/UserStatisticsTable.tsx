import { useState } from 'react';
import { 
  User, 
  MessageSquare, 
  Clock, 
  Activity,
  BarChart3,
  PieChart,
  Mail,
  Calendar,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { UserActivityData } from '@/lib/adminApi';

interface UserStatisticsTableProps {
  activityData: UserActivityData | undefined;
  isLoading: boolean;
}

export default function UserStatisticsTable({ activityData, isLoading }: UserStatisticsTableProps) {
  const [expandedSignups, setExpandedSignups] = useState(false);
  const [expandedPrompts, setExpandedPrompts] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-slate-200 dark:bg-slate-700 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!activityData) {
    return (
      <div className="text-center py-8">
        <div className="text-slate-500 dark:text-slate-400 mb-2">No activity data available</div>
        <div className="text-sm text-slate-400 dark:text-slate-500">
          Activity will appear as users interact with the system
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatEmailForDisplay = (email: string) => {
    if (email.length <= 20) return email;
    const [local, domain] = email.split('@');
    if (local.length > 8) {
      return `${local.substring(0, 8)}...@${domain}`;
    }
    return email;
  };

  const getTemplateTypeIcon = (type: string) => {
    switch (type) {
      case 'analysis':
        return <BarChart3 className="w-4 h-4" />;
      case 'writing':
        return <MessageSquare className="w-4 h-4" />;
      case 'coding':
        return <Activity className="w-4 h-4" />;
      default:
        return <PieChart className="w-4 h-4" />;
    }
  };

  const getTemplateTypeColor = (type: string) => {
    switch (type) {
      case 'analysis':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'writing':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'coding':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const signupsToShow = expandedSignups ? activityData.recentSignups : activityData.recentSignups.slice(0, 5);
  const promptsToShow = expandedPrompts ? activityData.recentPrompts : activityData.recentPrompts.slice(0, 8);

  return (
    <div className="space-y-6">
      <Tabs defaultValue="signups" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="signups" className="flex items-center space-x-2">
            <User className="w-4 h-4" />
            <span>Recent Signups ({activityData.recentSignups.length})</span>
          </TabsTrigger>
          <TabsTrigger value="prompts" className="flex items-center space-x-2">
            <MessageSquare className="w-4 h-4" />
            <span>Recent Prompts ({activityData.recentPrompts.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="signups" className="space-y-4">
          {activityData.recentSignups.length > 0 ? (
            <>
              <div className="space-y-3">
                {signupsToShow.map((user) => (
                  <div 
                    key={user.id} 
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {user.username}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            New
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                          <Mail className="w-3 h-3" />
                          <span title={user.email}>{formatEmailForDisplay(user.email)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatDate(user.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {activityData.recentSignups.length > 5 && (
                <div className="text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedSignups(!expandedSignups)}
                    className="text-xs"
                  >
                    {expandedSignups ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-1" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-1" />
                        Show All ({activityData.recentSignups.length})
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
              <div className="text-slate-500 dark:text-slate-400 mb-1">No recent signups</div>
              <div className="text-sm text-slate-400 dark:text-slate-500">
                New user registrations will appear here
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="prompts" className="space-y-4">
          {activityData.recentPrompts.length > 0 ? (
            <>
              <div className="space-y-3">
                {promptsToShow.map((prompt) => (
                  <div 
                    key={prompt.id} 
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                        {getTemplateTypeIcon(prompt.templateType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                            {prompt.title}
                          </span>
                          <Badge className={getTemplateTypeColor(prompt.templateType)}>
                            {prompt.templateType}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400">
                          <User className="w-3 h-3" />
                          <span>{prompt.username || 'Anonymous'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                        <Clock className="w-3 h-3 mr-1" />
                        {formatDate(prompt.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {activityData.recentPrompts.length > 8 && (
                <div className="text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpandedPrompts(!expandedPrompts)}
                    className="text-xs"
                  >
                    {expandedPrompts ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-1" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-1" />
                        Show All ({activityData.recentPrompts.length})
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
              <div className="text-slate-500 dark:text-slate-400 mb-1">No recent prompts</div>
              <div className="text-sm text-slate-400 dark:text-slate-500">
                User-generated prompts will appear here
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}