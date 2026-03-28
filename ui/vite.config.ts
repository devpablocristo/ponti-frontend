import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, ConfigEnv, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig(({ mode }: ConfigEnv) => {
  const env = loadEnv(mode, ".", "");
  const srcPath = path.resolve(__dirname, "src");

  // In Docker: BFF is at http://ponti-bff:3000
  // Local dev: BFF is at http://localhost:3000
  // Prefer process.env so docker-compose env vars work without needing files.
  // Note: keep this file compilable without Node typings in CI.
  const runtimeEnv = (
    globalThis as { process?: { env?: Record<string, string | undefined> } }
  )?.process?.env ?? {};
  const bffTarget = runtimeEnv.BFF_URL || env.BFF_URL || "http://localhost:3000";

  return {
    plugins: [react()],
    base: "/",
    resolve: {
      alias: [{ find: /^@\/(.+)$/, replacement: `${srcPath}/$1` }],
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
