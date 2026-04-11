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
    cacheDir: ".vite",
    resolve: {
      alias: [
        { find: /^@\/(.+)$/, replacement: `${srcPath}/$1` },
      ],
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              return undefined;
            }

            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("react-router-dom")
            ) {
              return "vendor-react";
            }

            if (
              id.includes("@material-tailwind/") ||
              id.includes("@heroicons/") ||
              id.includes("flowbite") ||
              id.includes("lucide-react")
            ) {
              return "vendor-ui";
            }

            if (
              id.includes("xlsx") ||
              id.includes("react-to-pdf") ||
              id.includes("jspdf") ||
              id.includes("html2canvas")
            ) {
              return "vendor-export";
            }

            if (id.includes("@devpablocristo/")) {
              return "vendor-shared";
            }

            return undefined;
          },
        },
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
                // SSE / chat stream: timeouts por defecto cortan con ECONNRESET en el navegador.
                timeout: 3_600_000,
                proxyTimeout: 3_600_000,
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
