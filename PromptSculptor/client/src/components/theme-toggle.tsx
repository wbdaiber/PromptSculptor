import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme");
      return (stored as "light" | "dark") || "dark";
    }
    return "dark";
  });

  // Apply theme on component mount and theme change
  useEffect(() => {
    if (typeof window !== "undefined") {
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(theme);
      localStorage.setItem("theme", theme);
    }
  }, [theme]);

  // Set initial dark theme
  useEffect(() => {
    if (typeof window !== "undefined") {
      const root = document.documentElement;
      root.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
      data-testid="button-theme-toggle"
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
    </Button>
  );
}