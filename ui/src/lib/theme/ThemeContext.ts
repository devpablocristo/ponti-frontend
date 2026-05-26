// Context + types extraídos de ThemeProvider.tsx para que Fast Refresh
// reconozca al .tsx como "solo componentes" (regla
// `react-refresh/only-export-components`).

import { createContext } from "react";

export type Theme = "light" | "dark" | "system";

export type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (next: Theme) => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);
