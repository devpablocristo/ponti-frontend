import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, ConfigEnv, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveCoreAuthPath() {
  const candidates = [
    path.resolve(__dirname, ".deps/core/authn/ts/src"),
    path.resolve(__dirname, "../../../core/authn/ts/src"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

function resolveCoreHttpPath() {
  const candidates = [
    path.resolve(__dirname, ".deps/core/http/ts/src"),
    path.resolve(__dirname, "../../../core/http/ts/src"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

function resolveCoreBrowserPath() {
  const candidates = [
    path.resolve(__dirname, ".deps/core/browser/ts/src"),
    path.resolve(__dirname, "../../../core/browser/ts/src"),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
}

// https://vite.dev/config/
export default defineConfig(({ mode }: ConfigEnv) => {
  const env = loadEnv(mode, ".", "");
  const coreAuthPath = resolveCoreAuthPath();
  const coreHttpPath = resolveCoreHttpPath();
  const coreBrowserPath = resolveCoreBrowserPath();
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
      alias: [
        {
          find: /^@devpablocristo\/core-authn$/,
          replacement: path.join(coreAuthPath, "index.ts"),
        },
        {
          find: /^@devpablocristo\/core-authn\/(.+)$/,
          replacement: `${coreAuthPath}/$1`,
        },
        {
          find: /^@devpablocristo\/core-http$/,
          replacement: path.join(coreHttpPath, "index.ts"),
        },
        {
          find: /^@devpablocristo\/core-http\/(.+)$/,
          replacement: `${coreHttpPath}/$1`,
        },
        {
          find: /^@devpablocristo\/core-browser$/,
          replacement: path.join(coreBrowserPath, "index.ts"),
        },
        {
          find: /^@devpablocristo\/core-browser\/(.+)$/,
          replacement: `${coreBrowserPath}/$1`,
        },
        {
          find: /^@\/(.+)$/,
          replacement: `${srcPath}/$1`,
        },
      ],
    },
    server:
      mode === "development"
        ? {
            fs: {
              allow: [path.resolve(__dirname), coreAuthPath, coreHttpPath, coreBrowserPath],
            },
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
