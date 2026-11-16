// src/contexts/ThemeContext.jsx — Light/Dark/System theme management
// Applies 'dark' class to <html> based on user preference + system settings.

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Load saved theme from localStorage, default to 'system'
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('expensify-theme') || 'system';
  });

  // Apply the appropriate dark/light class whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (theme === 'dark' || (theme === 'system' && prefersDark)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Also react to system preference changes (when theme = 'system')
  useEffect(() => {
    if (theme !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  // Save to localStorage when theme changes
  function setTheme(newTheme) {
    setThemeState(newTheme);
    localStorage.setItem('expensify-theme', newTheme);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook for consuming theme context in any component
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
