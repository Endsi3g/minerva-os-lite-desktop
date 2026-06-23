'use client';

// Stub theme context for BillingSDK compatibility.
// BillingSDK components call useTheme() expecting { currentTheme, previewDarkMode }.
// We return neutral defaults so styles remain unmodified.

import { createContext, useContext } from 'react';

interface ThemeContextValue {
  currentTheme: string;
  previewDarkMode: boolean;
  setTheme?: (theme: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  currentTheme: 'default',
  previewDarkMode: false,
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

export { ThemeContext };
