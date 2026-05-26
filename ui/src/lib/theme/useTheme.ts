// `useTheme` vive separado de `ThemeProvider.tsx` para no romper la regla
// `react-refresh/only-export-components` (HMR de Vite quiere que los .tsx
// solo exporten componentes; hooks y constantes van en .ts aparte).

import { useContext } from "react";
import { ThemeContext, type ThemeContextValue } from "./ThemeContext";

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme debe usarse dentro de <ThemeProvider>");
  }
  return ctx;
}
