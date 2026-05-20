import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "../../..");

function readRepoFile(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function getPontiUiCommand(composeFile: string) {
  const match = composeFile.match(/ponti-ui:[\s\S]*?^\s+command:\s*(.+)$/m);
  return match?.[1] ?? "";
}

function getGuardedPackages(command: string) {
  return Array.from(
    command.matchAll(/node_modules\/((?:@[^/\s"']+\/)?[^/\s"']+)/g)
  )
    .map(([, packageName]) => packageName)
    .filter((packageName) => packageName && !packageName.startsWith("."));
}

describe("ponti-ui install guard", () => {
  it("only checks packages declared by the UI workspace", () => {
    const composeFile = readRepoFile("docker-compose.yml");
    const packageJson = JSON.parse(readRepoFile("ui/package.json")) as PackageJson;
    const lockfile = readRepoFile("ui/yarn.lock");
    const declaredPackages = new Set([
      ...Object.keys(packageJson.dependencies ?? {}),
      ...Object.keys(packageJson.devDependencies ?? {}),
    ]);

    const guardedPackages = getGuardedPackages(getPontiUiCommand(composeFile));

    expect(guardedPackages.length).toBeGreaterThan(0);
    expect(guardedPackages).not.toContain("read-excel-file");
    expect(guardedPackages).not.toContain("xlsx");

    for (const packageName of guardedPackages) {
      expect(
        declaredPackages.has(packageName),
        `${packageName} is missing from ui/package.json`
      ).toBe(true);
      expect(lockfile, `${packageName} is missing from ui/yarn.lock`).toContain(
        packageName
      );
    }
  });
});
