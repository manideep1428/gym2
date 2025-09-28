import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    card: string;
    error: string;
    success: string;
    warning: string;
    gradientStart: string;
    gradientEnd: string;
  };
}

// Light Theme (super white)
const lightTheme = {
  primary: '#22C1C3',
  secondary: '#8B5CF6',
  accent: '#06B6D4',
  background: '#FFFFFF',   // pure white
  surface: '#FDFDFD',      // almost white
  text: '#000000',         // pure black text
  textSecondary: '#555555',
  border: '#DDDDDD',
  card: '#FFFFFF',
  error: '#FF4D4F',
  success: '#00C851',
  warning: '#FFBB33',
  gradientStart: '#FFFFFF',
  gradientEnd: '#F0F0F0',
};

// Dark Theme (super black)
const darkTheme = {
  primary: '#22C1C3',
  secondary: '#A78BFA',
  accent: '#22D3EE',
  background: '#000000',   // pure black
  surface: '#0A0A0A',      // near black
  text: '#FFFFFF',         // pure white text
  textSecondary: '#B0B0B0',
  border: '#222222',
  card: '#0A0A0A',
  error: '#FF4D4F',
  success: '#00C851',
  warning: '#FFBB33',
  gradientStart: '#111111',
  gradientEnd: '#333333',
};

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme) {
        setIsDark(savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDark;
      setIsDark(newTheme);
      await AsyncStorage.setItem('theme', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const colors = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};
