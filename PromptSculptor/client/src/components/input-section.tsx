import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Clipboard, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { generatePrompt } from "@/lib/api";
import type { Template, GeneratePromptRequest } from "@shared/schema";

interface InputSectionProps {
  selectedTemplate: Template | null;
  onPromptGenerated: (result: any) => void;
  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
}

export default function InputSection({ 
  selectedTemplate, 
  onPromptGenerated, 
  isGenerating, 
  setIsGenerating 
}: InputSectionProps) {
  const [naturalLanguageInput, setNaturalLanguageInput] = useState("");
  const [targetModel, setTargetModel] = useState<string>("claude");
  const [complexityLevel, setComplexityLevel] = useState<string>("detailed");
  const [includeExamples, setIncludeExamples] = useState(true);
  const [useXMLTags, setUseXMLTags] = useState(true);
  const [includeConstraints, setIncludeConstraints] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load template sample input when template is selected
  useEffect(() => {
    if (selectedTemplate && selectedTemplate.sampleInput) {
      setNaturalLanguageInput(selectedTemplate.sampleInput);
    }
  }, [selectedTemplate]);

  const generateMutation = useMutation({
    mutationFn: generatePrompt,
    onSuccess: (result) => {
      onPromptGenerated(result);
      toast({
        title: "Prompt Generated",
        description: "Your structured prompt has been generated successfully.",
      });
      // Invalidate recent prompts to refresh the list
      queryClient.invalidateQueries({ queryKey: ["/api/prompts/recent"] });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate prompt. Please try again.",
        variant: "destructive",
      });
      setIsGenerating(false);
    },
  });

  const handleGenerate = () => {
    if (!naturalLanguageInput.trim()) {
      toast({
        title: "Input Required",
        description: "Please enter your natural language instructions.",
        variant: "destructive",
      });
      return;
    }

    if (naturalLanguageInput.length < 10) {
      toast({
        title: "Input Too Short",
        description: "Please provide more detailed instructions (at least 10 characters).",
        variant: "destructive",
      });
      return;
    }

    if (naturalLanguageInput.length > 5000) {
      toast({
        title: "Input Too Long",
        description: "Please keep your input under 5000 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    const request: GeneratePromptRequest = {
      naturalLanguageInput,
      templateType: (selectedTemplate?.type || 'custom') as any,
      targetModel: targetModel as any,
      complexityLevel: complexityLevel as any,
      includeExamples,
      useXMLTags,
      includeConstraints,
    };

    generateMutation.mutate(request);
  };

  const handleClear = () => {
    setNaturalLanguageInput("");
  };

  const handlePasteExample = () => {
    const exampleText = "I need to analyze customer feedback data to identify key themes and sentiment patterns. The analysis should include specific examples and actionable recommendations for improving our product.";
    setNaturalLanguageInput(exampleText);
  };

  const characterCount = naturalLanguageInput.length;

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader className="border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Natural Language Input</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-500">{characterCount}</span>
              <span className="text-sm text-slate-400">/</span>
              <span className="text-sm text-slate-400">5000</span>
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Describe your task or requirements in plain language</p>
        </CardHeader>
        <CardContent className="p-6">
          <Textarea
            value={naturalLanguageInput}
            onChange={(e) => setNaturalLanguageInput(e.target.value)}
            placeholder="I need to analyze customer feedback data to identify key themes and sentiment patterns. The analysis should include specific examples and actionable recommendations for improving our product..."
            className="w-full h-64 resize-none"
            maxLength={5000}
          />
          
          {/* Input Tools */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClear}
                className="text-slate-500 hover:text-slate-700"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handlePasteExample}
                className="text-slate-500 hover:text-slate-700"
              >
                <Clipboard className="h-3 w-3 mr-1" />
                Paste Example
              </Button>
            </div>
            <Button 
              onClick={handleGenerate}
              disabled={isGenerating || !naturalLanguageInput.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isGenerating ? "Generating..." : "Generate Prompt"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Options */}
      <Card>
        <CardHeader className="border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Advanced Options</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Customize the generated prompt structure</p>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Target Model</Label>
              <Select value={targetModel} onValueChange={setTargetModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="claude">Claude (Anthropic)</SelectItem>
                  <SelectItem value="gpt">GPT (OpenAI)</SelectItem>
                  <SelectItem value="gemini">Gemini (Google)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Complexity Level</Label>
              <Select value={complexityLevel} onValueChange={setComplexityLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simple</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                  <SelectItem value="comprehensive">Comprehensive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="includeExamples" 
                checked={includeExamples}
                onCheckedChange={(checked) => setIncludeExamples(checked === true)}
              />
              <Label htmlFor="includeExamples" className="text-sm text-slate-700 dark:text-slate-300">
                Include examples in prompt
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="useXMLTags" 
                checked={useXMLTags}
                onCheckedChange={(checked) => setUseXMLTags(checked === true)}
              />
              <Label htmlFor="useXMLTags" className="text-sm text-slate-700 dark:text-slate-300">
                Use XML-style tags (Claude optimized)
              </Label>
            </div>
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="includeConstraints" 
                checked={includeConstraints}
                onCheckedChange={(checked) => setIncludeConstraints(checked === true)}
              />
              <Label htmlFor="includeConstraints" className="text-sm text-slate-700 dark:text-slate-300">
                Add constraint sections
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
