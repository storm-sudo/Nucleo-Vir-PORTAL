import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9"
      data-testid="theme-toggle"
    >
      {theme === 'light' ? (
        <Moon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
      ) : (
        <Sun className="h-5 w-5 text-yellow-500" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
