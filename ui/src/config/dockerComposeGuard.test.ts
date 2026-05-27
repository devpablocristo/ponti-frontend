import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

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
  return Array.from(command.matchAll(/node_modules\/((?:@[^/\s"']+\/)?[^/\s"']+)/g))
    .map(([, packageName]) => packageName)
    .filter((packageName) => packageName && !packageName.startsWith("."));
}

describe("ponti-ui install guard", () => {
  it("uses yarn check-files instead of a hardcoded package allowlist", () => {
    const composeFile = readRepoFile("docker-compose.yml");
    const command = getPontiUiCommand(composeFile);

    expect(command).toContain("yarn install --frozen-lockfile --check-files");

    const guardedPackages = getGuardedPackages(command);
    expect(guardedPackages).toHaveLength(0);
    expect(guardedPackages).not.toContain("read-excel-file");
    expect(guardedPackages).not.toContain("xlsx");
  });
});
