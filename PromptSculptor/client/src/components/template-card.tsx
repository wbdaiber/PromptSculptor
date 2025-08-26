import { Card } from "@/components/ui/card";
import type { Template } from "@shared/schema";

interface TemplateCardProps {
  template: Template;
  onSelect: (template: Template) => void;
  isSelected: boolean;
}

const iconColorMap = {
  blue: "bg-blue-100 text-blue-600",
  green: "bg-green-100 text-green-600",
  purple: "bg-purple-100 text-purple-600",
  orange: "bg-orange-100 text-orange-600",
};

export default function TemplateCard({ template, onSelect, isSelected }: TemplateCardProps) {
  const iconColorClass = iconColorMap[template.iconColor as keyof typeof iconColorMap] || "bg-gray-100 text-gray-600";
  
  return (
    <Card 
      className={`p-4 hover:shadow-md transition-all cursor-pointer group ${
        isSelected ? 'border-blue-200 shadow-md' : 'hover:border-blue-200'
      }`}
      onClick={() => onSelect(template)}
    >
      <div className="flex items-center space-x-3 mb-2">
        <div className={`w-8 h-8 ${iconColorClass} rounded-lg flex items-center justify-center text-sm`}>
          <i className={template.icon}></i>
        </div>
        <span className="font-medium text-slate-900 dark:text-slate-100">{template.name}</span>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{template.description}</p>
    </Card>
  );
}
