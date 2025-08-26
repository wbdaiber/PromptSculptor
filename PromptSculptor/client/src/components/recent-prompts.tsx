import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Edit, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getRecentPrompts, deletePrompt } from "@/lib/api";
import EditPromptDialog from "@/components/edit-prompt-dialog";
import type { Prompt } from "@shared/schema";

export default function RecentPrompts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: prompts = [], isLoading } = useQuery<Prompt[]>({
    queryKey: ["/api/prompts/recent"],
    queryFn: () => getRecentPrompts(6),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePrompt,
    onSuccess: () => {
      toast({
        title: "Prompt Deleted",
        description: "Prompt has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/prompts/recent"] });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete prompt. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCopy = async (prompt: Prompt) => {
    try {
      await navigator.clipboard.writeText(prompt.generatedPrompt);
      toast({
        title: "Copied!",
        description: "Prompt copied to clipboard successfully.",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (promptId: string) => {
    deleteMutation.mutate(promptId);
  };

  const handleEdit = (prompt: Prompt) => {
    setEditingPrompt(prompt);
    setIsEditDialogOpen(true);
  };

  const getTemplateIcon = (templateType: string) => {
    const icons = {
      analysis: { icon: "fas fa-chart-line", color: "bg-blue-100 text-blue-600" },
      writing: { icon: "fas fa-pen", color: "bg-green-100 text-green-600" },
      coding: { icon: "fas fa-code", color: "bg-purple-100 text-purple-600" },
      custom: { icon: "fas fa-plus", color: "bg-orange-100 text-orange-600" },
    };
    return icons[templateType as keyof typeof icons] || icons.custom;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  if (prompts.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Recent Prompts</h2>
        <Button variant="ghost" className="text-blue-600 hover:text-blue-700 font-medium">
          View All
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="shadow-sm">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-6 w-6 rounded-md" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-12 w-full" />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-16" />
                    <div className="flex space-x-1">
                      <Skeleton className="h-6 w-6" />
                      <Skeleton className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          prompts.map((prompt) => {
            const templateInfo = getTemplateIcon(prompt.templateType);
            return (
              <Card key={prompt.id} className="shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className={`w-6 h-6 ${templateInfo.color} rounded-md flex items-center justify-center text-xs`}>
                        <i className={templateInfo.icon}></i>
                      </div>
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100 capitalize">
                        {prompt.templateType} Prompt
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {formatTimeAgo(prompt.createdAt.toString())}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 line-clamp-3">
                    {prompt.title}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{prompt.wordCount} words</span>
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-slate-600 p-1 h-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(prompt);
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-slate-600 p-1 h-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(prompt);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-slate-400 hover:text-red-600 p-1 h-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(prompt.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      
      <EditPromptDialog
        prompt={editingPrompt}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </div>
  );
}
