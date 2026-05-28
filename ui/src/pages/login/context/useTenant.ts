import { useContext } from "react";

import { TenantContext } from "./TenantContext.shared";

export function useTenant() {
  const value = useContext(TenantContext);
  if (!value) {
    throw new Error("useTenant debe usarse dentro de TenantProvider");
  }
  return value;
}
