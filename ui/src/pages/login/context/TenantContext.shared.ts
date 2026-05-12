import { createContext } from "react";

export type Tenant = {
  id: string;
  name: string;
  role?: string;
  permissions?: string[];
  is_current?: boolean;
};

export type TenantContextValue = {
  tenants: Tenant[];
  tenantId: string;
  loading: boolean;
  refreshTenantContext: () => Promise<void>;
  setTenantId: (tenantId: string) => void;
};

export const TenantContext = createContext<TenantContextValue | undefined>(undefined);

