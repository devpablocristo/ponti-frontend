import { Building2 } from "lucide-react";

import { useTenant } from "@/pages/login/context/useTenant";

const TenantSwitcher = () => {
  const { tenants, tenantId, loading, setTenantId } = useTenant();

  if (tenants.length <= 1 && !tenantId) {
    return null;
  }

  return (
    <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
      <Building2 className="h-4 w-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
      <span className="sr-only">Tenant</span>
      <select
        className="h-9 min-w-[160px] rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-sky-500 dark:focus:ring-sky-500/30"
        value={tenantId}
        disabled={loading || tenants.length === 0}
        onChange={(event) => setTenantId(event.target.value)}
      >
        {tenants.length === 0 ? (
          <option value="">Sin tenants</option>
        ) : (
          tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.name}
            </option>
          ))
        )}
      </select>
    </label>
  );
};

export default TenantSwitcher;

