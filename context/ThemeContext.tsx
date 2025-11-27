import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';

// Define theme colors
const lightTheme = {
  primary: '#d56324', // laranja destaque
  background: '#4d184a', // roxo fundo
  card: '#fff',
  text: '#fff',
  textSecondary: '#fff',
  border: '#d56324',
  success: '#10B981',
};

const darkTheme = {
  primary: '#d56324',
  background: '#4d184a',
  card: '#1F2937',
  text: '#fff',
  textSecondary: '#fff',
  border: '#d56324',
  success: '#10B981',
};

type ThemeContextType = {
  theme: 'light' | 'dark';
  colors: typeof lightTheme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  colors: lightTheme,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const colors = theme === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);