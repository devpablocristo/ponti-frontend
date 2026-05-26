import React, { useCallback, useEffect, useMemo, useState } from "react";

import { apiClient } from "@/api/client";
import { TenantContext, type Tenant, type TenantContextValue } from "./TenantContext.shared";
import { resolveMeContextPayload } from "./meContextPayload";

const TENANT_STORAGE_KEY = "ponti:tenant_id";
const LEGACY_TENANT_STORAGE_KEY = "tenant_id";
const WORKSPACE_KEYS = [
  "customer",
  "project",
  "project_id",
  "campaign",
  "field",
  "workspace_all_selection",
];

function readStoredTenantId(): string {
  if (typeof window === "undefined") return "";
  return (
    window.localStorage.getItem(TENANT_STORAGE_KEY) ||
    window.localStorage.getItem(LEGACY_TENANT_STORAGE_KEY) ||
    ""
  ).trim();
}

function persistTenantId(tenantId: string): void {
  window.localStorage.setItem(TENANT_STORAGE_KEY, tenantId);
  window.localStorage.setItem(LEGACY_TENANT_STORAGE_KEY, tenantId);
}

function clearWorkspaceSelection(): void {
  for (const key of WORKSPACE_KEYS) {
    window.localStorage.removeItem(`ponti:${key}`);
    window.localStorage.removeItem(key);
  }
}

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantIdState] = useState<string>(() => readStoredTenantId());
  const [loading, setLoading] = useState(false);

  const applyTenant = useCallback((nextTenantId: string, clearWorkspace: boolean) => {
    const normalized = nextTenantId.trim();
    setTenantIdState(normalized);
    if (normalized) {
      persistTenantId(normalized);
    }
    if (clearWorkspace) {
      clearWorkspaceSelection();
      window.dispatchEvent(new CustomEvent("ponti:tenant-changed", { detail: normalized }));
    }
  }, []);

  const refreshTenantContext = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.raw().get("/me/context", {
        headers: { "X-Skip-Tenant": "1" },
      });
      const payload = resolveMeContextPayload(data);
      const items = Array.isArray(payload.tenants) ? payload.tenants : [];
      setTenants(items);
      const stored = readStoredTenantId();
      const currentFromServer =
        typeof payload.current_tenant_id === "string" && payload.current_tenant_id
          ? payload.current_tenant_id
          : "";
      const next =
        (stored && items.some((item) => item.id === stored) ? stored : "") ||
        currentFromServer ||
        items[0]?.id ||
        "";
      if (next && next !== tenantId) {
        applyTenant(next, false);
      }
    } catch {
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }, [applyTenant, tenantId]);

  useEffect(() => {
    void refreshTenantContext();
  }, [refreshTenantContext]);

  const value = useMemo<TenantContextValue>(
    () => ({
      tenants,
      tenantId,
      loading,
      refreshTenantContext,
      setTenantId: (nextTenantId: string) => applyTenant(nextTenantId, nextTenantId !== tenantId),
    }),
    [applyTenant, loading, refreshTenantContext, tenantId, tenants]
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};
