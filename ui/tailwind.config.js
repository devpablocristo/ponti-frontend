/** @type {import('tailwindcss').Config} */
const typography = require("@tailwindcss/typography");

export default {
  // Dark mode controlado por la clase `dark` en el <html>. El ThemeProvider
  // (src/lib/theme) la setea/quita según preferencia del usuario (persistida
  // en localStorage) o `prefers-color-scheme` cuando theme="system".
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@devpablocristo/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Breakpoints: extendemos los defaults (sm 640, md 768, lg 1024, xl 1280,
      // 2xl 1536) con xs (iPhone SE / mini) y 3xl (full HD large). NO redefinir
      // sin agregar todos los defaults, porque `extend.screens` los preserva
      // pero el shorthand `screens` los reemplaza.
      // Single source of truth: este archivo + src/hooks/useBreakpoint.ts.
      screens: {
        xs: "375px",
        "3xl": "1920px",
      },
      // Escala explícita para z-index. Reemplaza usos arbitrarios `z-[NNN]`.
      // Capas (de menor a mayor):
      //   sticky    → sticky table cells/headers en el flujo
      //   dropdown  → dropdowns/popovers en el flujo (sobre sticky)
      //   navbar    → chrome top
      //   nav-menu  → dropdowns dentro del navbar (sobre el navbar)
      //   drawer    → drawer lateral (sobre navbar pero debajo de modales)
      //   modal     → modales + overlays full-screen
      //   popover   → popovers sobre modales
      //   tooltip   → tooltips
      //   notification → toasts (siempre arriba)
      // Si necesitás un z nuevo, agregalo acá — no uses `z-[NNN]` arbitrario.
      zIndex: {
        base: "0",
        sticky: "1",
        dropdown: "50",
        navbar: "900",
        "nav-menu": "910",
        drawer: "920",
        modal: "1000",
        popover: "1010",
        tooltip: "1020",
        notification: "1030",
      },
      colors: {
        "custom-green": "#0E9F6E",
        "custom-btn": "#547792",
        "btn-login": "#67AE6E",
        "custom-bg": "#F1F5F9",
        "custom-text": "#0F172A",
        "custom-label": "#111928",
        "custom-table-header": "#475569",
        primary: {
          50: "#EEF4F8",
          100: "#D6E4ED",
          200: "#B0CCDB",
          300: "#8AB4C9",
          400: "#6A9CB5",
          500: "#547792",
          600: "#3D5A6E",
          700: "#2B4A5F",
          800: "#1E3A4F",
          900: "#0F2A3F",
          950: "#071A2C",
        },
        sidebar: {
          DEFAULT: "#0F172A",
          hover: "#1E293B",
          active: "#334155",
          border: "#1E293B",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          hover: "#F8FAFC",
          raised: "#FFFFFF",
        },
      },
    },
    fontFamily: {
      display: [
        "Sora",
        "ui-sans-serif",
        "system-ui",
        "sans-serif",
      ],
      body: [
        "DM Sans",
        "ui-sans-serif",
        "system-ui",
        "sans-serif",
      ],
      sans: [
        "DM Sans",
        "ui-sans-serif",
        "system-ui",
        "sans-serif",
      ],
    },
  },
  plugins: [typography],
};
