import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getFavoritePrompts, deletePrompt, togglePromptFavorite } from "@/lib/api";
import EditPromptDialog from "@/components/edit-prompt-dialog";
import FavoritePromptCard from "@/components/favorite-prompt-card";
import type { Prompt } from "@shared/schema";

export default function FavoritePrompts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: prompts = [], isLoading } = useQuery<Prompt[]>({
    queryKey: ["/api/prompts/favorites"],
    queryFn: () => getFavoritePrompts(6),
    staleTime: 0,
    gcTime: 0,
  });

  const deleteMutation = useMutation({
    mutationFn: deletePrompt,
    onSuccess: () => {
      toast({
        title: "Prompt Deleted",
        description: "Prompt has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/prompts/favorites"] });
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

  const unfavoriteMutation = useMutation({
    mutationFn: (id: string) => togglePromptFavorite(id, false),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["/api/prompts/favorites"] });
      const previousPrompts = queryClient.getQueryData<Prompt[]>(["/api/prompts/favorites"]);
      
      queryClient.setQueryData<Prompt[]>(["/api/prompts/favorites"], (old) => 
        old ? old.filter((p) => p.id !== id) : []
      );
      
      return { previousPrompts };
    },
    onError: (_, __, context) => {
      if (context?.previousPrompts) {
        queryClient.setQueryData(["/api/prompts/favorites"], context.previousPrompts);
      }
      toast({
        title: "Action Failed",
        description: "Failed to remove from favorites. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Removed from Favorites",
        description: "Prompt removed from favorites successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/prompts/recent"] });
    },
    onSettled: () => {
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

  const handleUnfavorite = (promptId: string) => {
    unfavoriteMutation.mutate(promptId);
  };

  const handleViewAll = () => {
    setLocation("/favorites");
  };

  if (prompts.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          <Heart className="inline-block h-5 w-5 mr-2 text-yellow-500 fill-yellow-500" />
          Favorite Prompts
        </h2>
        <Button 
          variant="ghost" 
          className="text-blue-600 hover:text-blue-700 font-medium"
          onClick={handleViewAll}
        >
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
          prompts.map((prompt) => (
            <FavoritePromptCard
              key={prompt.id}
              prompt={prompt}
              onCopy={handleCopy}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onUnfavorite={handleUnfavorite}
            />
          ))
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