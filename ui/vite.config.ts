import { defineConfig, ConfigEnv, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }: ConfigEnv) => {
  const env = loadEnv(mode, ".", "");

  // In Docker: BFF is at http://ponti-bff:3000
  // Local dev: BFF is at http://localhost:3000
  // Prefer process.env so docker-compose env vars work without needing files.
  // Note: keep this file compilable without Node typings in CI.
  const runtimeEnv = (globalThis as any)?.process?.env ?? {};
  const bffTarget = runtimeEnv.BFF_URL || env.BFF_URL || "http://localhost:3000";

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
              "/api/v1": {
                // Proxy 1:1 hacia el BFF. No reescribir el path.
                target: bffTarget,
                changeOrigin: true,
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
