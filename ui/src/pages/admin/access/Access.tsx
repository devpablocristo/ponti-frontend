import { useEffect, useMemo, useState } from "react";
import Header from "../../../components/Header/Header";
import Button from "../../../components/Button/Button";
import { apiClient } from "@/api/client";

type Tenant = { id: number; name: string };
type UserRow = {
  user_id: number;
  email: string;
  username: string;
  idp_sub: string;
  tenant_id: number;
  tenant: string;
  role: string;
};

type NestedListBody<T> = {
  data?: NestedListBody<T> | T[];
  items?: T[];
};

type CreateUserResponse = {
  data?: {
    reset_link?: string;
  };
  reset_link?: string;
};

function isNestedListBody<T>(value: unknown): value is NestedListBody<T> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrapList<T>(body: unknown): T[] {
  // BFF routes wrap backend responses (and sometimes wrap their own wrappers).
  // Normalize to a plain array so the UI doesn't explode on map().
  const source = body;
  const level1 = isNestedListBody<T>(source) ? source.data : undefined;
  const level2 = isNestedListBody<T>(level1) ? level1.data : undefined;
  const level3 = isNestedListBody<T>(level2) ? level2.data : undefined;
  const candidates = [
    source,
    level1,
    level2,
    level3,
    isNestedListBody<T>(source) ? source.items : undefined,
    isNestedListBody<T>(level1) ? level1.items : undefined,
    isNestedListBody<T>(level2) ? level2.items : undefined,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) return c as T[];
  }
  return [];
}

function getErrorMessage(error: unknown): string {
  const err = error as {
    message?: string;
    response?: { data?: { error?: { details?: string } } };
  };
  return err?.response?.data?.error?.details || err?.message || "Error";
}

export default function Access() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  const [newTenantName, setNewTenantName] = useState("");

  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantName, setTenantName] = useState("default");
  const [roleName, setRoleName] = useState("viewer");
  const [sendResetLink, setSendResetLink] = useState(true);
  const [resetLink, setResetLink] = useState("");

  const roleOptions = useMemo(() => ["admin", "manager", "viewer"], []);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const tenantsBody = await apiClient.get<unknown>("/admin/tenants");
      setTenants(unwrapList<Tenant>(tenantsBody));

      const usersBody = await apiClient.get<unknown>("/admin/users");
      setUsers(unwrapList<UserRow>(usersBody));
    } catch (error) {
      setError(getErrorMessage(error) || "No se pudo cargar la informacion");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const createTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult("");
    try {
      await apiClient.post("/admin/tenants", { name: newTenantName.trim() });
      setResult("Tenant creado");
      setNewTenantName("");
      await refresh();
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult("");
    setResetLink("");
    try {
      const payload = {
        username: usernameOrEmail.trim(),
        email: usernameOrEmail.trim(),
        password: password,
        tenant_name: tenantName.trim(),
        role_name: roleName,
        send_reset_link: sendResetLink,
      };

      const resp = await apiClient.post<CreateUserResponse>("/admin/users", payload);
      const link = resp?.data?.reset_link as string | undefined;
      if (link) setResetLink(link);
      setResult("Usuario creado / actualizado");
      setPassword("");
      await refresh();
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header title="Accesos" />

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Crear Tenant</h2>
          <form onSubmit={createTenant} className="flex flex-col gap-3">
            <input
              className="bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-lg block w-full p-3"
              placeholder="Nombre del tenant (ej: default)"
              value={newTenantName}
              onChange={(e) => setNewTenantName(e.target.value)}
              disabled={loading}
            />
            <div className="flex gap-3">
              <Button variant="primary" type="submit" disabled={loading}>
                Crear
              </Button>
              <Button
                variant="primary"
                type="button"
                disabled={loading}
                onClick={refresh}
              >
                Refrescar
              </Button>
            </div>
          </form>
          <div className="mt-4 text-sm text-slate-700">
            Tenants:{" "}
            {tenants.length === 0
              ? "ninguno"
              : tenants.map((t) => t.name).join(", ")}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Crear Usuario</h2>
          <form onSubmit={createUser} className="flex flex-col gap-3">
            <input
              className="bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-lg block w-full p-3"
              placeholder="Usuario o email (ej: juan o juan@dominio.com)"
              value={usernameOrEmail}
              onChange={(e) => setUsernameOrEmail(e.target.value)}
              disabled={loading}
              required
            />
            <input
              className="bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-lg block w-full p-3"
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                className="bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-lg block w-full p-3"
                placeholder="Tenant (default)"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                disabled={loading}
              />
              <select
                className="bg-gray-50 border border-gray-300 text-gray-900 text-base rounded-lg block w-full p-3"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                disabled={loading}
              >
                {roleOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={sendResetLink}
                  onChange={(e) => setSendResetLink(e.target.checked)}
                  disabled={loading}
                />
                Generar reset link
              </label>
            </div>
            <div className="flex gap-3">
              <Button variant="primary" type="submit" disabled={loading}>
                Crear / asignar
              </Button>
              <Button
                variant="primary"
                type="button"
                disabled={loading}
                onClick={refresh}
              >
                Refrescar
              </Button>
            </div>
          </form>

          {resetLink && (
            <div className="mt-4 text-sm break-all">
              <span className="font-semibold">Reset link:</span> {resetLink}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Usuarios (Tenant Actual)</h2>
          {users.length === 0 ? (
            <div className="text-sm text-slate-700">Sin usuarios para mostrar.</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-600">
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Role</th>
                    <th className="py-2 pr-3">Tenant</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={`${u.user_id}-${u.tenant_id}`} className="border-t">
                      <td className="py-2 pr-3">{u.email}</td>
                      <td className="py-2 pr-3">{u.role}</td>
                      <td className="py-2 pr-3">{u.tenant}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {(error || result) && (
          <div
            className={`p-4 text-sm rounded-lg ${
              error ? "text-red-800 bg-red-50" : "text-green-800 bg-green-50"
            }`}
            role="alert"
          >
            <span className="font-medium">{error ? "Error!" : "OK:"}</span>{" "}
            {error || result}
          </div>
        )}
      </div>
    </div>
  );
}

