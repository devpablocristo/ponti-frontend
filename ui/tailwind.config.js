/** @type {import('tailwindcss').Config} */
const withMT = require("@material-tailwind/react/utils/withMT");

export default withMT({
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@devpablocristo/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
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
  plugins: [],
});
