import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getRecentPrompts, deletePrompt, togglePromptFavorite } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import EditPromptDialog from "@/components/edit-prompt-dialog";
import RecentPromptCard from "@/components/recent-prompt-card";
import ThemeToggle from "@/components/theme-toggle";
import SettingsDropdown from "@/components/settings-dropdown";
import type { Prompt } from "@shared/schema";

export default function Recent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Redirect non-authenticated users to home
  useEffect(() => {
    if (!loading && !user) {
      setLocation("/");
    }
  }, [user, loading, setLocation]);

  const { data: prompts = [], isLoading } = useQuery<Prompt[]>({
    queryKey: ["/api/prompts/recent", 20],
    queryFn: () => getRecentPrompts(20), // Limit to 20 recent prompts
    staleTime: 0,
    gcTime: 0,
    enabled: !!user, // Only run query if user is authenticated
  });

  const deleteMutation = useMutation({
    mutationFn: deletePrompt,
    onSuccess: () => {
      toast({
        title: "Prompt Deleted",
        description: "Prompt has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/prompts/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/prompts/favorites"] });
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete prompt. Please try again.",
        variant: "destructive",
      });
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) => 
      togglePromptFavorite(id, isFavorite),
    onMutate: async ({ id, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/prompts/recent", 20] });
      const previousPrompts = queryClient.getQueryData<Prompt[]>(["/api/prompts/recent", 20]);
      
      queryClient.setQueryData<Prompt[]>(["/api/prompts/recent", 20], (old) => 
        old ? old.map((p) => p.id === id ? { ...p, isFavorite } : p) : []
      );
      
      return { previousPrompts };
    },
    onError: (_, __, context) => {
      if (context?.previousPrompts) {
        queryClient.setQueryData(["/api/prompts/recent", 20], context.previousPrompts);
      }
      toast({
        title: "Action Failed",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: (_, { isFavorite }) => {
      toast({
        title: isFavorite ? "Added to Favorites" : "Removed from Favorites",
        description: isFavorite 
          ? "Prompt has been added to your favorites."
          : "Prompt has been removed from your favorites.",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prompts/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/prompts/favorites"] });
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

  const handleToggleFavorite = (promptId: string, currentStatus: boolean) => {
    favoriteMutation.mutate({ id: promptId, isFavorite: !currentStatus });
  };

  const handleBackToHome = () => {
    setLocation("/");
  };

  if (loading) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900 font-inter text-slate-800 dark:text-slate-200 min-h-screen transition-colors duration-200">
        <div className="flex items-center justify-center h-screen">
          <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="bg-slate-50 dark:bg-slate-900 font-inter text-slate-800 dark:text-slate-200 min-h-screen transition-colors duration-200">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={handleBackToHome}
                className="text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Home
              </Button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <i className="fas fa-magic text-white text-sm"></i>
                </div>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">PromptCraft</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <span className="text-sm text-slate-600 dark:text-slate-400 hidden sm:inline">
                  {user.email}
                </span>
                <SettingsDropdown />
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              <Clock className="inline-block h-8 w-8 mr-3 text-blue-500" />
              Recent Prompts
            </h2>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {prompts.length} recent prompt{prompts.length !== 1 ? 's' : ''}
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="shadow-sm border rounded-lg">
                  <div className="p-6">
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
                          <Skeleton className="h-6 w-6" />
                          <Skeleton className="h-6 w-6" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : prompts.length === 0 ? (
            <div className="text-center py-16">
              <Clock className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                No recent prompts yet
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Start creating prompts to see them here.
              </p>
              <Button onClick={handleBackToHome} className="bg-blue-600 hover:bg-blue-700 text-white">
                Create Your First Prompt
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {prompts.map((prompt) => (
                <RecentPromptCard
                  key={prompt.id}
                  prompt={prompt}
                  onCopy={handleCopy}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <EditPromptDialog
        prompt={editingPrompt}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </div>
  );
}