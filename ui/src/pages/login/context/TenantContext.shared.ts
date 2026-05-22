import { createContext } from "react";

import type { MeTenant } from "@/api/generated";

// Tenant es la shape que el FE consume del array `tenants` de /me/context.
// Tipos vienen generados desde la spec OpenAPI del BE (yarn codegen).
// El BE marca todos los campos como opcionales (sin `required`); el FE asume
// que id/name vienen siempre cuando el endpoint responde 200 OK.
export type Tenant = Required<Pick<MeTenant, "id" | "name">> &
  Omit<MeTenant, "id" | "name">;

export type TenantContextValue = {
  tenants: Tenant[];
  tenantId: string;
  loading: boolean;
  refreshTenantContext: () => Promise<void>;
  setTenantId: (tenantId: string) => void;
};

export const TenantContext = createContext<TenantContextValue | undefined>(undefined);

