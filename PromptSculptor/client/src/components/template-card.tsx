import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import type { Template } from "@shared/schema";

interface TemplateCardProps {
  template: Template;
  onSelect: (template: Template) => void;
  isSelected: boolean;
  onEdit?: (template: Template) => void;
  onDelete?: (template: Template) => void;
}

const iconColorMap = {
  blue: "bg-blue-100 text-blue-600",
  green: "bg-green-100 text-green-600",
  purple: "bg-purple-100 text-purple-600",
  orange: "bg-orange-100 text-orange-600",
};

export default function TemplateCard({ 
  template, 
  onSelect, 
  isSelected, 
  onEdit, 
  onDelete 
}: TemplateCardProps) {
  const { user } = useAuth();
  const iconColorClass = iconColorMap[template.iconColor as keyof typeof iconColorMap] || "bg-gray-100 text-gray-600";
  
  // Check if this is a user's own template (not a default system template)
  const canEdit = user && template.userId === user.id && !template.isDefault;
  
  const handleCardClick = () => {
    onSelect(template);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(template);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(template);
    }
  };
  
  return (
    <Card 
      className={`p-4 hover:shadow-md transition-all cursor-pointer group relative ${
        isSelected ? 'border-blue-200 shadow-md' : 'hover:border-blue-200'
      }`}
      onClick={handleCardClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 ${iconColorClass} rounded-lg flex items-center justify-center text-sm`}>
            <i className={template.icon}></i>
          </div>
          <span className="font-medium text-slate-900 dark:text-slate-100">{template.name}</span>
        </div>
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                <Edit className="h-4 w-4 mr-2" />
                Edit Template
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleDelete} 
                className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/20"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Template
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{template.description}</p>
    </Card>
  );
}
