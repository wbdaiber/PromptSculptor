import { Copy, Edit, Trash2, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Prompt } from "@shared/schema";

interface RecentPromptCardProps {
  prompt: Prompt;
  onCopy: (prompt: Prompt) => void;
  onEdit: (prompt: Prompt) => void;
  onDelete: (promptId: string) => void;
  onToggleFavorite: (promptId: string, currentStatus: boolean) => void;
}

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

export default function RecentPromptCard({
  prompt,
  onCopy,
  onEdit,
  onDelete,
  onToggleFavorite,
}: RecentPromptCardProps) {
  const templateInfo = getTemplateIcon(prompt.templateType);

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
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
              className={`p-1 h-auto ${
                prompt.isFavorite 
                  ? "text-yellow-500 hover:text-yellow-600" 
                  : "text-slate-400 hover:text-yellow-500"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(prompt.id, prompt.isFavorite || false);
              }}
              title={prompt.isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={`h-3 w-3 ${prompt.isFavorite ? "fill-current" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-slate-600 p-1 h-auto"
              onClick={(e) => {
                e.stopPropagation();
                onCopy(prompt);
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
                onEdit(prompt);
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
                onDelete(prompt.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}