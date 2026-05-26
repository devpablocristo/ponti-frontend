// ThemeProvider — gestiona el tema visual (light/dark/system) de toda la app.
//
// Aplica/quita la clase `dark` al <html> según:
//   - `theme === "dark"`            → siempre dark
//   - `theme === "light"`           → siempre light
//   - `theme === "system"` (default) → sigue `prefers-color-scheme` del OS
//
// La preferencia persiste en localStorage (`ponti:theme`). El listener al
// media query permite reaccionar a cambios en vivo cuando theme="system".
//
// Tailwind está configurado con `darkMode: "class"` (ver tailwind.config.js),
// así que basta con togglear la clase para que TODOS los `dark:` se activen.
//
// El hook `useTheme` y los tipos viven en archivos separados para no romper
// la regla `react-refresh/only-export-components` (el .tsx solo debe
// exportar componentes; tipos y hooks van en .ts adyacente).

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  ThemeContext,
  type Theme,
  type ThemeContextValue,
} from "./ThemeContext";

const STORAGE_KEY = "ponti:theme";
const VALID: ReadonlySet<Theme> = new Set<Theme>(["light", "dark", "system"]);

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw && VALID.has(raw as Theme) ? (raw as Theme) : "system";
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyThemeClass(isDark: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", isDark);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme());
  const [systemDark, setSystemDark] = useState<boolean>(() => systemPrefersDark());

  // Reaccionar a cambios del OS (solo relevante cuando theme === "system").
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const resolvedTheme: "light" | "dark" = useMemo(() => {
    if (theme === "dark") return "dark";
    if (theme === "light") return "light";
    return systemDark ? "dark" : "light";
  }, [theme, systemDark]);

  // Aplica la clase al <html> cada vez que el resolved theme cambia.
  useEffect(() => {
    applyThemeClass(resolvedTheme === "dark");
  }, [resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
