import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const uiRoot = resolve(__dirname, "..");
const repoRoot = resolve(uiRoot, "..", "..");
const axisRoot = process.env.AXIS_DIR
  ? resolve(process.env.AXIS_DIR)
  : resolve(repoRoot, "..", "axis");
const localSchemaPath = resolve(axisRoot, "companion", "openapi.yaml");
const outputDir = resolve(uiRoot, "src", "generated");
const schemaPath = resolve(outputDir, "axis-companion.openapi.yaml");
const typesPath = resolve(outputDir, "axis-companion.openapi.ts");
const schemaUrl =
  process.env.AXIS_COMPANION_OPENAPI_URL ??
  process.env.COMPANION_OPENAPI_URL ??
  (process.env.COMPANION_BASE_URL
    ? `${process.env.COMPANION_BASE_URL.replace(/\/$/, "")}/openapi.json`
    : "");

async function exportSchema() {
  mkdirSync(outputDir, { recursive: true });

  if (schemaUrl) {
    try {
      const response = await fetch(schemaUrl);
      if (!response.ok) throw new Error(`openapi_http_${response.status}`);
      const payload = await response.text();
      writeFileSync(schemaPath, payload.replace(/\r\n/g, "\n"), "utf-8");
      return;
    } catch (_error) {
      // Axis puede no estar corriendo en local; abajo caemos al schema versionado.
    }
  }

  const payload = readFileSync(localSchemaPath, "utf-8");
  writeFileSync(schemaPath, payload.replace(/\r\n/g, "\n"), "utf-8");
}

(async () => {
  await exportSchema();

  const generateResult = spawnSync(
    "npx",
    ["openapi-typescript", schemaPath, "--output", typesPath],
    {
      cwd: uiRoot,
      stdio: "inherit",
      env: process.env,
    },
  );
  if (generateResult.status !== 0) {
    process.exit(generateResult.status ?? 1);
  }

  const generated = readFileSync(typesPath, "utf-8");
  writeFileSync(typesPath, generated.replace(/\r\n/g, "\n"), "utf-8");
})();
