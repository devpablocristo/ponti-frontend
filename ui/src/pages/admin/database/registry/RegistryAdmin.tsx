import { useCallback, useEffect, useState } from "react";

import Search from "@/components/Input/Search";
import Button from "@/components/Button/Button";
import { toastError } from "@/lib/toast";
import { RegistryRow, RegistryStatus, searchRegistry } from "@/api/registry";
import RegistryActorDrawer from "./RegistryActorDrawer";
import RegistryCatalogDrawer, { CatalogItem } from "./RegistryCatalogDrawer";

const PER_PAGE = 100;

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "customer", label: "Clientes" },
  { value: "provider", label: "Proveedores" },
  { value: "investor", label: "Inversores" },
  { value: "manager", label: "Responsables" },
  { value: "contractor", label: "Contratistas" },
  { value: "biller", label: "Facturadores" },
  { value: "lessee", label: "Arrendatarios" },
  { value: "crops", label: "Cultivos" },
  { value: "types", label: "Tipos" },
  { value: "lease-types", label: "Tipos de arriendo" },
  { value: "campaigns", label: "Campañas" },
];

const ROLE_LABEL: Record<string, string> = {
  customer: "Cliente",
  provider: "Proveedor",
  investor: "Inversor",
  manager: "Responsable",
  contractor: "Contratista",
  biller: "Facturador",
  lessee: "Arrendatario",
};
const CATALOG_LABEL: Record<string, string> = {
  crops: "Cultivo",
  types: "Tipo",
  "lease-types": "Tipo de arriendo",
  campaigns: "Campaña",
};
const CATALOG_SINGULAR: Record<string, string> = {
  crops: "cultivo",
  types: "tipo",
  "lease-types": "tipo de arriendo",
  campaigns: "campaña",
};
const CREATE_OPTIONS: { kind: string; label: string }[] = [
  { kind: "actor", label: "Actor" },
  { kind: "crops", label: "Cultivo" },
  { kind: "types", label: "Tipo" },
  { kind: "lease-types", label: "Tipo de arriendo" },
  { kind: "campaigns", label: "Campaña" },
];

const badge = (row: RegistryRow): string => {
  if (row.entity_type === "actor") {
    const roles = (row.roles ?? []).map((r) => ROLE_LABEL[r] ?? r).join(", ");
    return roles ? `Actor · ${roles}` : "Actor";
  }
  return CATALOG_LABEL[row.entity_type] ?? row.entity_type;
};

// Pantalla unificada (registry): buscador por identificador + selector de tipo, lista paginada de
// a 100, alta/edición en drawers por tipo, toggle Activos/Archivados.
export default function RegistryAdmin() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState<RegistryStatus>("active");
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState<RegistryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [maxPage, setMaxPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [actorDrawer, setActorDrawer] = useState<{ open: boolean; actorId: number | null; prefillName?: string }>({
    open: false,
    actorId: null,
  });
  const [catalogDrawer, setCatalogDrawer] = useState<{
    open: boolean;
    base: string;
    singular: string;
    item: CatalogItem | null;
    prefillName?: string;
  }>({ open: false, base: "crops", singular: "cultivo", item: null });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await searchRegistry({ q: q.trim(), type, status, page, perPage: PER_PAGE });
      setRows(r.data ?? []);
      setTotal(r.page_info?.total ?? 0);
      setMaxPage(r.page_info?.max_page ?? 1);
    } catch {
      toastError("No se pudo cargar el listado");
      setRows([]);
      setTotal(0);
      setMaxPage(1);
    } finally {
      setLoading(false);
    }
  }, [q, type, status, page]);

  // Búsqueda con debounce sobre el identificador; tipo/estado/página recargan inmediato.
  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  // Cambiar filtros vuelve a la página 1.
  const onQ = (v: string) => {
    setPage(1);
    setQ(v);
  };
  const onType = (v: string) => {
    setPage(1);
    setType(v);
  };
  const onStatus = (v: RegistryStatus) => {
    setPage(1);
    setStatus(v);
  };

  const openEdit = (row: RegistryRow) => {
    if (row.entity_type === "actor") {
      setActorDrawer({ open: true, actorId: row.id });
    } else {
      setCatalogDrawer({
        open: true,
        base: row.entity_type,
        singular: CATALOG_SINGULAR[row.entity_type] ?? row.entity_type,
        item: { id: row.id, name: row.name, archived: row.archived },
      });
    }
  };

  const openCreate = (kind: string) => {
    if (kind === "") return;
    const prefillName = /^\d+$/.test(q.trim()) ? "" : q.trim();
    if (kind === "actor") {
      setActorDrawer({ open: true, actorId: null, prefillName });
    } else {
      setCatalogDrawer({
        open: true,
        base: kind,
        singular: CATALOG_SINGULAR[kind] ?? kind,
        item: null,
        prefillName,
      });
    }
  };

  return (
    <div>
      <RegistryActorDrawer
        open={actorDrawer.open}
        onClose={() => setActorDrawer((d) => ({ ...d, open: false }))}
        actorId={actorDrawer.actorId}
        prefillName={actorDrawer.prefillName}
        onSaved={load}
      />
      <RegistryCatalogDrawer
        open={catalogDrawer.open}
        onClose={() => setCatalogDrawer((d) => ({ ...d, open: false }))}
        base={catalogDrawer.base}
        singular={catalogDrawer.singular}
        item={catalogDrawer.item}
        prefillName={catalogDrawer.prefillName}
        onSaved={load}
      />

      {/* Fila: identificador + tipo + nuevo */}
      <div className="flex items-end gap-2 mb-3">
        <div className="flex-1">
          <Search
            label="Buscar (nombre, CUIT/DNI, alias)"
            name="reg-q"
            placeholder="Escribí un nombre o número…"
            value={q}
            onChange={(e) => onQ(e.target.value)}
            fullWidth
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Tipo</label>
          <select
            value={type}
            onChange={(e) => onType(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">&nbsp;</label>
          <select
            value=""
            onChange={(e) => openCreate(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-gray-800 text-white"
          >
            <option value="">+ Nuevo…</option>
            {CREATE_OPTIONS.map((o) => (
              <option key={o.kind} value={o.kind} className="text-black">
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Estado */}
      <div className="flex items-center gap-2 mb-3">
        {(["active", "archived"] as RegistryStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => onStatus(s)}
            className={`text-sm rounded-full px-3 py-1 border ${
              status === s ? "bg-gray-800 text-white" : "bg-white text-gray-600"
            }`}
          >
            {s === "active" ? "Activos" : "Archivados"}
          </button>
        ))}
        <span className="text-xs text-gray-400 ml-2">
          {loading ? "cargando…" : `${total} resultados`}
        </span>
      </div>

      {/* Lista */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">CUIT / DNI</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={`${row.entity_type}-${row.id}`}
                onClick={() => openEdit(row)}
                className="border-t cursor-pointer hover:bg-gray-50"
              >
                <td className="px-3 py-2 font-medium">{row.name}</td>
                <td className="px-3 py-2 text-gray-500">{badge(row)}</td>
                <td className="px-3 py-2 text-gray-500">{row.tax || "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-gray-400">
                  Sin resultados
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginado */}
      <div className="flex items-center justify-end gap-3 mt-3 text-sm text-gray-600">
        <span>
          Página {page} de {maxPage}
        </span>
        <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
          Anterior
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
          disabled={page >= maxPage}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
