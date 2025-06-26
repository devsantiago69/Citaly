import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'classic' | 'dark' | 'custom';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  customColors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  setCustomColors: (colors: {
    primary?: string;
    secondary?: string;
    background?: string;
    text?: string;
  }) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('classic');
  const [customColors, setCustomColorsState] = useState({
    primary: '#3b82f6',
    secondary: '#f3f4f6',
    background: '#ffffff',
    text: '#1f2937'
  });

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    const savedColors = localStorage.getItem('customColors');
    
    if (savedTheme) {
      setTheme(savedTheme);
    }
    if (savedColors) {
      setCustomColorsState(JSON.parse(savedColors));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    
    // Aplicar tema al documento
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    if (theme === 'custom') {
      root.style.setProperty('--custom-primary', customColors.primary);
      root.style.setProperty('--custom-secondary', customColors.secondary);
      root.style.setProperty('--custom-background', customColors.background);
      root.style.setProperty('--custom-text', customColors.text);
    }
  }, [theme, customColors]);

  const setCustomColors = (colors: Partial<typeof customColors>) => {
    const newColors = { ...customColors, ...colors };
    setCustomColorsState(newColors);
    localStorage.setItem('customColors', JSON.stringify(newColors));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, customColors, setCustomColors }}>
      {children}
    </ThemeContext.Provider>
  );
};
