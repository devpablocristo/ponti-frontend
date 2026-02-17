import { defineConfig, ConfigEnv, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }: ConfigEnv) => {
  const env = loadEnv(mode, ".", "");

  // In Docker: BFF is at http://ponti-bff:3000
  // Local dev: BFF is at http://localhost:3000
  // Prefer process.env so docker-compose env vars work without needing files.
  const bffTarget = process.env.BFF_URL || env.BFF_URL || "http://localhost:3000";

  return {
    plugins: [react()],
    base: "/",
    resolve: {
      alias: {
        "@": "/src",
      },
    },
    server:
      mode === "development"
        ? {
            proxy: {
              "/api": {
                target: `${bffTarget}/api`,
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ""),
              },
            },
          }
        : undefined,
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
      globals: true,
    },
  };
});
