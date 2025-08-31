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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { updateTemplate } from "@/lib/api";
import type { Template } from "@shared/schema";

interface EditTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: Template | null;
}

const templateTypes = [
  { value: "analysis", label: "Analysis", icon: "fas fa-chart-line", color: "blue" },
  { value: "writing", label: "Writing", icon: "fas fa-pen", color: "green" },
  { value: "coding", label: "Coding", icon: "fas fa-code", color: "purple" },
  { value: "custom", label: "Custom", icon: "fas fa-plus", color: "orange" },
];

export default function EditTemplateDialog({
  open,
  onOpenChange,
  template,
}: EditTemplateDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("");
  const [sampleInput, setSampleInput] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Populate form when template changes
  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description);
      setType(template.type);
      setSampleInput(template.sampleInput);
    }
  }, [template]);

  const updateMutation = useMutation({
    mutationFn: (templateData: any) => updateTemplate(template!.id, templateData),
    onSuccess: () => {
      toast({
        title: "Template Updated",
        description: "Your template has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      console.error("Failed to update template:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!template) return;

    // Validate required fields
    if (!name.trim() || !description.trim() || !type || !sampleInput.trim()) {
      toast({
        title: "Validation Error",
        description: "All fields are required to update the template.",
        variant: "destructive",
      });
      return;
    }

    const selectedType = templateTypes.find(t => t.value === type);
    if (!selectedType) {
      toast({
        title: "Validation Error",
        description: "Please select a valid template type.",
        variant: "destructive",
      });
      return;
    }

    const templateData = {
      name: name.trim(),
      type: type,
      description: description.trim(),
      icon: selectedType.icon,
      iconColor: selectedType.color,
      sampleInput: sampleInput.trim(),
      promptStructure: {
        sections: ["role", "task", "context", "requirements", "outputFormat"],
        includeExamples: true,
        useXMLTags: true
      }
    };

    updateMutation.mutate(templateData);
  };

  const handleCancel = () => {
    onOpenChange(false);
    // Reset form when cancelling
    if (template) {
      setName(template.name);
      setDescription(template.description);
      setType(template.type);
      setSampleInput(template.sampleInput);
    }
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Template</DialogTitle>
          <DialogDescription>
            Make changes to your template. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="edit-template-name">Template Name</Label>
            <Input
              id="edit-template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Give your template a descriptive name"
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-template-type">Template Type</Label>
            <Select value={type} onValueChange={setType} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a template category" />
              </SelectTrigger>
              <SelectContent>
                {templateTypes.map((templateType) => (
                  <SelectItem key={templateType.value} value={templateType.value}>
                    <div className="flex items-center space-x-2">
                      <i className={`${templateType.icon} text-${templateType.color}-600`}></i>
                      <span>{templateType.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-template-description">Description</Label>
            <Textarea
              id="edit-template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe what this template is used for"
              className="min-h-[80px]"
              maxLength={500}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-template-sample-input">Sample Input</Label>
            <Textarea
              id="edit-template-sample-input"
              value={sampleInput}
              onChange={(e) => setSampleInput(e.target.value)}
              placeholder="The natural language input that will be pre-filled when this template is selected"
              className="min-h-[120px]"
              maxLength={7500}
              required
            />
            <div className="text-sm text-slate-500">
              {sampleInput.length}/7500 characters
            </div>
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
              className="bg-blue-600 hover:bg-blue-700"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}