import { Page } from "@playwright/test";
import { Buffer } from "node:buffer";

export const e2eWorkspace = {
  customer: { id: 14, name: "SOALEN SRL 25-26" },
  project: { id: 29, name: "CAMPO COTY" },
  projectId: 29,
  campaign: { id: 2, name: "2025-2026", project_id: 29 },
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

export async function installAuthenticatedSession(
  page: Page,
  selectedWorkspace = e2eWorkspace
) {
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
      tenantId =
        payload.current_tenant_id || payload.tenants?.find((tenant) => tenant.id)?.id || "";
    }
  }

  await page.addInitScript(
    ({ e2eToken, selectedWorkspace, selectedTenantId }) => {
      const prefix = `ponti:${window.location.host}:`;
      const setSelectionJson = (key: string, value: unknown) => {
        localStorage.setItem(`${prefix}${key}`, JSON.stringify(value));
        localStorage.setItem(`ponti:${key}`, JSON.stringify(value));
        localStorage.setItem(key, JSON.stringify(value));
      };
      const setSelectionNumber = (key: string, value: number) => {
        localStorage.setItem(`${prefix}${key}`, JSON.stringify(value));
        localStorage.setItem(`ponti:${key}`, String(value));
        localStorage.setItem(key, String(value));
      };
      const removeSelection = (key: string) => {
        localStorage.removeItem(`${prefix}${key}`);
        localStorage.removeItem(`ponti:${key}`);
        localStorage.removeItem(key);
      };

      localStorage.setItem(`${prefix}access_token`, e2eToken);
      localStorage.setItem(`${prefix}refresh_token`, e2eToken);
      if (selectedTenantId) {
        localStorage.setItem("ponti:tenant_id", selectedTenantId);
        localStorage.setItem("tenant_id", selectedTenantId);
      }
      setSelectionJson("customer", selectedWorkspace.customer);
      setSelectionJson("project", selectedWorkspace.project);
      setSelectionNumber("project_id", selectedWorkspace.projectId);
      setSelectionJson("campaign", selectedWorkspace.campaign);
      removeSelection("field");
    },
    { e2eToken: token, selectedWorkspace, selectedTenantId: tenantId }
  );
}
