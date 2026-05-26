import { useEffect, useState } from "react";

// Breakpoints alineados 1:1 con tailwind.config.js (defaults + xs/3xl extension).
// Cualquier cambio acá debe espejarse en tailwind.config.js o se desincroniza CSS/JS.
export const BREAKPOINTS = {
  xs: 375,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
  "3xl": 1920,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

const ORDER: Breakpoint[] = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl"];

function resolve(width: number): Breakpoint {
  let current: Breakpoint = "xs";
  for (const bp of ORDER) {
    if (width >= BREAKPOINTS[bp]) current = bp;
  }
  return current;
}

/**
 * Devuelve el breakpoint actual. SSR-safe: durante render server-side cae a `xs`.
 * Usa matchMedia para evitar re-renders en cada pixel de resize.
 */
export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() => {
    if (typeof window === "undefined") return "xs";
    return resolve(window.innerWidth);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const queries = ORDER.map((name) => ({
      name,
      mql: window.matchMedia(`(min-width: ${BREAKPOINTS[name]}px)`),
    }));

    const recompute = () => {
      let current: Breakpoint = "xs";
      for (const { name, mql } of queries) {
        if (mql.matches) current = name;
      }
      setBp(current);
    };

    queries.forEach(({ mql }) => mql.addEventListener("change", recompute));
    recompute();

    return () => {
      queries.forEach(({ mql }) => mql.removeEventListener("change", recompute));
    };
  }, []);

  return bp;
}

/**
 * `true` cuando el viewport es estrictamente menor a `md` (768px).
 * Reemplaza `window.innerWidth < 768` raw — sincronizado con Tailwind `md:`.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < BREAKPOINTS.md;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(`(max-width: ${BREAKPOINTS.md - 1}px)`);
    const update = () => setIsMobile(mql.matches);
    mql.addEventListener("change", update);
    update();
    return () => mql.removeEventListener("change", update);
  }, []);

  return isMobile;
}
