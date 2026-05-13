import { Page } from "@playwright/test";
import { Buffer } from "node:buffer";

const workspace = {
  customer: { id: 17, name: "AGRO LAJITAS 25-26" },
  project: { id: 30, name: "JUJUY (MEALLA/ACHERAL)" },
  projectId: 30,
  campaign: { id: 2, name: "2025-2026", project_id: 30 },
};

function base64Url(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function createE2EToken(): string {
  const exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
  return [
    base64Url({ alg: "none", typ: "JWT" }),
    base64Url({
      sub: "codex-e2e",
      ID: 1,
      Rol: 1,
      Username: "Codex E2E",
      Hash: "e2e",
      exp,
    }),
    "",
  ].join(".");
}

export async function installAuthenticatedSession(page: Page) {
  const token = createE2EToken();
  let tenantId = process.env.E2E_TENANT_ID ?? "";

  if (!tenantId) {
    const response = await page.request.get("/api/v1/me/context", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok()) {
      const payload = (await response.json()) as {
        current_tenant_id?: string;
        tenants?: Array<{ id?: string }>;
      };
      tenantId = payload.current_tenant_id || payload.tenants?.find((tenant) => tenant.id)?.id || "";
    }
  }

  await page.addInitScript(
    ({ e2eToken, selectedWorkspace, selectedTenantId }) => {
      const prefix = `ponti:${window.location.host}:`;

      localStorage.setItem(`${prefix}access_token`, e2eToken);
      localStorage.setItem(`${prefix}refresh_token`, e2eToken);
      if (selectedTenantId) {
        localStorage.setItem("ponti:tenant_id", selectedTenantId);
        localStorage.setItem("tenant_id", selectedTenantId);
      }
      localStorage.setItem(`${prefix}customer`, JSON.stringify(selectedWorkspace.customer));
      localStorage.setItem(`${prefix}project`, JSON.stringify(selectedWorkspace.project));
      localStorage.setItem(`${prefix}project_id`, JSON.stringify(selectedWorkspace.projectId));
      localStorage.setItem(`${prefix}campaign`, JSON.stringify(selectedWorkspace.campaign));
      localStorage.removeItem(`${prefix}field`);
    },
    { e2eToken: token, selectedWorkspace: workspace, selectedTenantId: tenantId }
  );
}
