import { describe, expect, it } from "vitest";

import { resolveMeContextPayload } from "./meContextPayload";

const tenant = {
  id: "652f757e-465a-419e-a529-04a0a81e2803",
  name: "default",
  role: "admin",
  permissions: ["projects.read"],
  is_current: true,
};

describe("resolveMeContextPayload", () => {
  it("lee la respuesta cruda de /me/context", () => {
    const payload = resolveMeContextPayload({
      current_tenant_id: tenant.id,
      tenants: [tenant],
    });

    expect(payload.current_tenant_id).toBe(tenant.id);
    expect(payload.tenants?.[0]?.id).toBe(tenant.id);
  });

  it("lee la respuesta envuelta por el interceptor legacy", () => {
    const payload = resolveMeContextPayload({
      success: true,
      data: {
        current_tenant_id: tenant.id,
        tenants: [tenant],
      },
    });

    expect(payload.current_tenant_id).toBe(tenant.id);
    expect(payload.tenants?.[0]?.role).toBe("admin");
  });
});
