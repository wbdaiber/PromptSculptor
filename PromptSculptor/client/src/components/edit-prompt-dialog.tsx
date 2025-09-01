import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { updatePrompt } from "@/lib/api";
import type { Prompt } from "@shared/schema";

interface EditPromptDialogProps {
  prompt: Prompt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditPromptDialog({
  prompt,
  open,
  onOpenChange,
}: EditPromptDialogProps) {
  const [title, setTitle] = useState("");
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Populate form when prompt changes
  useEffect(() => {
    if (prompt) {
      setTitle(prompt.title);
      setNaturalLanguageInput(prompt.naturalLanguageInput);
      setGeneratedPrompt(prompt.generatedPrompt);
    }
  }, [prompt]);

  const updateMutation = useMutation({
    mutationFn: (updates: Partial<Prompt>) => updatePrompt(prompt!.id, updates),
    onSuccess: () => {
      toast({
        title: "Prompt Updated",
        description: "Your prompt has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/prompts/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/prompts/favorites"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      console.error("Failed to update prompt:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update prompt. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt) return;

    // Validate required fields
    if (!title.trim() || !naturalLanguageInput.trim() || !generatedPrompt.trim()) {
      toast({
        title: "Validation Error",
        description: "Title, input, and generated prompt are all required.",
        variant: "destructive",
      });
      return;
    }

    const updates = {
      title: title.trim(),
      naturalLanguageInput: naturalLanguageInput.trim(),
      generatedPrompt: generatedPrompt.trim(),
      wordCount: generatedPrompt.trim().split(/\s+/).filter(word => word.length > 0).length,
    };

    updateMutation.mutate(updates);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  if (!prompt) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Prompt</DialogTitle>
          <DialogDescription>
            Make changes to your prompt. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for your prompt"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="naturalLanguageInput">Natural Language Input</Label>
            <Textarea
              id="naturalLanguageInput"
              value={naturalLanguageInput}
              onChange={(e) => setNaturalLanguageInput(e.target.value)}
              placeholder="Describe what you want your AI prompt to accomplish..."
              className="min-h-[100px]"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="generatedPrompt">Generated Prompt</Label>
            <Textarea
              id="generatedPrompt"
              value={generatedPrompt}
              onChange={(e) => setGeneratedPrompt(e.target.value)}
              placeholder="The structured prompt will appear here..."
              className="min-h-[200px] font-mono text-sm"
              required
            />
          </div>


          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}