import type { Tenant } from "./TenantContext.shared";

export type MeContextPayload = {
  current_tenant_id?: string;
  tenants?: Tenant[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function resolveMeContextPayload(value: unknown): MeContextPayload {
  if (!isRecord(value)) return {};
  if (value.success === true && isRecord(value.data)) {
    return value.data as MeContextPayload;
  }
  return value as MeContextPayload;
}
