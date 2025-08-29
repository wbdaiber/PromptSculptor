import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { deleteTemplate } from "@/lib/api";
import type { Template } from "@shared/schema";

interface DeleteTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template | null;
}

export default function DeleteTemplateDialog({
  open,
  onOpenChange,
  template,
}: DeleteTemplateDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (templateId: string) => deleteTemplate(templateId),
    onSuccess: () => {
      toast({
        title: "Template Deleted",
        description: "Your template has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      console.error("Failed to delete template:", error);
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (!template?.id) return;
    deleteMutation.mutate(template.id);
  };

  if (!template) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Template</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the template "{template.name}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Template"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}