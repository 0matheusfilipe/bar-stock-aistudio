import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '@/components/ui/button';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all active:scale-90"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon className="h-6 w-6" />
      ) : (
        <Sun className="h-6 w-6" />
      )}
    </Button>
  );
};
