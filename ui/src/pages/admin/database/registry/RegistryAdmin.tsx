import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Archive, ArchiveRestore, Search as SearchIcon, ChevronDown } from "lucide-react";

import { BaseModal } from "@/components/Modal/BaseModal";
import { toastError } from "@/lib/toast";
import { apiClient } from "@/api/client";
import { RegistryRow, RegistryStatus, searchRegistry, searchRegistryAll } from "@/api/registry";
import { archiveActor, restoreActor } from "@/api/actors";
import { archiveCatalog, restoreCatalog } from "@/api/catalog";
import { DataTable, useClientTableFilters, usePagination } from "@/lib/dataDisplay";
import type { DataTableColumn, FilterOptionGroup } from "@/lib/LocalDataTable";
import RegistryActorDrawer from "./RegistryActorDrawer";
import RegistryCatalogDrawer, { CatalogItem } from "./RegistryCatalogDrawer";
import UsagesPopover from "./UsagesPopover";

const statusOf = (e: unknown): number | undefined => {
  const x = e as { response?: { status?: number }; error?: { status?: number }; status?: number };
  return x?.response?.status ?? x?.error?.status ?? x?.status;
};

// ─── Mapeos ───────────────────────────────────────────────────────────────────

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
  project: "Proyecto",
  field: "Campo",
  lot: "Lote",
};
const CATALOG_SINGULAR: Record<string, string> = {
  crops: "cultivo",
  types: "tipo",
  "lease-types": "tipo de arriendo",
  campaigns: "campaña",
  project: "proyecto",
  field: "campo",
  lot: "lote",
};
const ENTITY_BADGE: Record<string, { label: string; className: string }> = {
  actor:          { label: "Actor",            className: "bg-primary-100 text-primary-700" },
  crops:          { label: "Cultivo",          className: "bg-green-100 text-green-700" },
  types:          { label: "Tipo",             className: "bg-amber-100 text-amber-700" },
  "lease-types":  { label: "Tipo de arriendo", className: "bg-pink-100 text-pink-700" },
  campaigns:      { label: "Campaña",          className: "bg-violet-100 text-violet-700" },
  project:        { label: "Proyecto",         className: "bg-blue-100 text-blue-700" },
  field:          { label: "Campo",            className: "bg-orange-100 text-orange-700" },
  lot:            { label: "Lote",             className: "bg-stone-100 text-stone-700" },
};


// ─── Tipo de fila procesada (campos computados para filtros) ──────────────────

type ProcessedRow = RegistryRow & {
  type_display: string;    // "Actor" | "Cultivo" | "Campaña" | …
  roles_display: string;   // "Cliente, Inversor" | "—"
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function RegistryAdmin() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<RegistryStatus>("active");
  const [entityTab, setEntityTab] = useState<"actors" | "catalog">("catalog");
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const newMenuRef = useRef<HTMLDivElement>(null);

  const [rows, setRows] = useState<RegistryRow[]>([]);
  const [loadedStatus, setLoadedStatus] = useState<RegistryStatus>("active");
  const [activeTotal, setActiveTotal] = useState(0);
  const [archivedTotal, setArchivedTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [actorDrawer, setActorDrawer] = useState<{ open: boolean; actorId: number | null; prefillName?: string }>({
    open: false, actorId: null,
  });
  const [catalogDrawer, setCatalogDrawer] = useState<{
    open: boolean; base: string; singular: string; item: CatalogItem | null; prefillName?: string;
  }>({ open: false, base: "crops", singular: "cultivo", item: null });
  const [confirmArchive, setConfirmArchive] = useState<{ row: RegistryRow; usageCount?: number } | null>(null);

  const [activeActorCount, setActiveActorCount] = useState(0);
  const [activeCatalogCount, setActiveCatalogCount] = useState(0);

  // ─── Carga de datos ──────────────────────────────────────────────────────────

const load = useCallback(async () => {
  setLoading(true);
  try {
    if (status === "active") {
      const [activeData, archivedRes] = await Promise.all([
        searchRegistryAll({ q: q.trim(), type: "all", status: "active" }),
        searchRegistry({ q: q.trim(), type: "all", status: "archived", page: 1, perPage: 1 }),
      ]);
      setActiveTotal(activeData.length);
      setArchivedTotal(archivedRes.page_info?.total ?? 0);
      setActiveActorCount(activeData.filter((r) => r.entity_type === "actor").length);
      setActiveCatalogCount(activeData.filter((r) => r.entity_type !== "actor").length);
      setRows(activeData);
      setLoadedStatus("active");
    } else {
      const [activeData, archivedData] = await Promise.all([
        searchRegistryAll({ q: q.trim(), type: "all", status: "active" }),
        searchRegistryAll({ q: q.trim(), type: "all", status: "archived" }),
      ]);
      setActiveTotal(activeData.length);
      setArchivedTotal(archivedData.length);
      setActiveActorCount(activeData.filter((r) => r.entity_type === "actor").length);
      setActiveCatalogCount(activeData.filter((r) => r.entity_type !== "actor").length);
      setRows(archivedData);
      setLoadedStatus("archived");
    }
  } catch {
    toastError("No se pudo cargar el listado");
    setRows([]);
  } finally {
    setLoading(false);
  }
}, [q, status]);

  useEffect(() => {
    if (!newMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!newMenuRef.current?.contains(e.target as Node)) setNewMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [newMenuOpen]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  // ─── Filas activas por tab ────────────────────────────────────────────────────

  const actorRows   = useMemo(() => rows.filter((r) => r.entity_type === "actor"), [rows]);
  const catalogRows = useMemo(() => rows.filter((r) => r.entity_type !== "actor"), [rows]);

  const isArchived = loadedStatus === "archived";
  const activeRows = isArchived ? rows : entityTab === "actors" ? actorRows : catalogRows;

  // ─── Filas procesadas para DataTable ─────────────────────────────────────────

  const processedRows = useMemo((): ProcessedRow[] =>
    activeRows.map((r) => ({
      ...r,
      type_display: r.entity_type === "actor"
        ? "Actor"
        : (CATALOG_LABEL[r.entity_type] ?? r.entity_type),
      roles_display: r.entity_type === "actor"
        ? (r.roles ?? []).map((role) => ROLE_LABEL[role] ?? role).join(", ") || "—"
        : "—",
    })),
    [activeRows]
  );

  // roles_display tiene valores combinados ("Cliente, Inversor") que no matchean
  // exacto con las opciones individuales. Lo filtramos manualmente fuera del hook.
  const [rolesFilter, setRolesFilter] = useState<string[]>([]);

  const {
    filteredRows: baseFilteredRows,
    filters: baseColFilters,
    handleFilterChange: handleBaseFilterChange,
    resetFilters: resetBaseFilters,
    getFilterOptionsForColumn,
  } = useClientTableFilters({ rows: processedRows });

  // Post-filtro de roles: busca si alguno de los roles del actor está en la selección
  const displayRows = useMemo(() => {
    if (rolesFilter.length === 0) return baseFilteredRows;
    return baseFilteredRows.filter((row) =>
      (row.roles ?? []).some((r) => rolesFilter.includes(ROLE_LABEL[r] ?? r))
    );
  }, [baseFilteredRows, rolesFilter]);

  // Filtros unificados para DataTable (necesita ver roles_display para pintar el badge activo)
  const colFilters = useMemo(() => ({
    ...baseColFilters,
    ...(rolesFilter.length > 0 ? { roles_display: rolesFilter } : {}),
  }), [baseColFilters, rolesFilter]);

  // handleFilterChange unificado: separa roles del resto
  const handleFilterChange = useCallback((nextFilters: Record<string, unknown>) => {
    const { roles_display, ...rest } = nextFilters;
    handleBaseFilterChange(rest);
    setRolesFilter(Array.isArray(roles_display) ? (roles_display as string[]) : []);
  }, [handleBaseFilterChange]);

  const resetFilters = useCallback(() => {
    resetBaseFilters();
    setRolesFilter([]);
  }, [resetBaseFilters]);

  // Opciones individuales de rol (sin combinar)
  const roleFilterOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const row of processedRows) {
      for (const r of (row.roles ?? [])) seen.add(ROLE_LABEL[r] ?? r);
    }
    return [...seen].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }, [processedRows]);

  const pagination = usePagination({ perPage: 30 });

  // ─── Handlers de navegación ────────────────────────────────────────────────

  const onQ = (v: string) => { setQ(v); resetFilters(); pagination.resetPage(); };
  const onStatus = (v: RegistryStatus) => { setStatus(v); resetFilters(); pagination.resetPage(); };
  const onEntityTab = (tab: "actors" | "catalog") => {
    setEntityTab(tab);
    if (status === "archived") onStatus("active");
    resetFilters();
    pagination.resetPage();
  };

  // ─── Archivar / restaurar ──────────────────────────────────────────────────

  const handleArchiveClick = async (row: RegistryRow) => {
    if (row.archived) { setConfirmArchive({ row }); return; }
    setConfirmArchive({ row });
    try {
      const qs = new URLSearchParams({ entity_type: row.entity_type, id: String(row.id), name: row.name });
      if (row.roles?.length) qs.set("roles", row.roles.join(","));
      const res = await apiClient.get<{ success: boolean; data: { total: number; not_supported?: boolean } }>(
        `/registry/usages?${qs.toString()}`
      );
      const usageCount = res.data?.not_supported ? 0 : (res.data?.total ?? 0);
      setConfirmArchive((prev) => prev ? { ...prev, usageCount } : null);
    } catch {
      setConfirmArchive((prev) => prev ? { ...prev, usageCount: 0 } : null);
    }
  };

  const handleArchiveConfirm = async (row: RegistryRow) => {
    setConfirmArchive(null);
    const isRestore = row.archived;
    try {
      if (row.entity_type === "actor") {
        if (isRestore) await restoreActor(row.id);
        else await archiveActor(row.id);
      } else {
        if (isRestore) await restoreCatalog(row.entity_type, row.id);
        else await archiveCatalog(row.entity_type, row.id);
      }
      void load();
    } catch (e) {
      const s = statusOf(e);
      if (isRestore) {
        toastError(
          s === 409
            ? row.entity_type === "actor"
              ? "No se puede restaurar: otra identidad activa tiene el mismo CUIT/DNI"
              : "No se puede restaurar: ya existe un elemento activo con ese nombre"
            : s === 404
            ? "El elemento no existe o ya fue eliminado"
            : "No se pudo restaurar"
        );
      } else {
        toastError(
          s === 409 ? "No se puede archivar: el elemento está en uso"
          : s === 404 ? "El elemento no existe o ya fue eliminado"
          : "No se pudo archivar"
        );
      }
    }
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
    } else if (kind === "catalog") {
      setCatalogDrawer({ open: true, base: "", singular: "", item: null, prefillName });
    } else {
      setCatalogDrawer({ open: true, base: kind, singular: CATALOG_SINGULAR[kind] ?? kind, item: null, prefillName });
    }
  };

  // ─── Grupos de filtro por tipo ─────────────────────────────────────────────

  // Catálogo: nombres agrupados por Campaña / Cultivo / Tipo / Tipo de arriendo
  const catalogNameGroups = useMemo((): FilterOptionGroup[] => {
    const CATALOG_ORDER = ["project", "field", "lot", "campaigns", "crops", "types", "lease-types"];
    const grouped: Record<string, Set<string>> = {};
    for (const r of processedRows) {
      if (r.entity_type === "actor") continue;
      if (!grouped[r.entity_type]) grouped[r.entity_type] = new Set();
      grouped[r.entity_type].add(r.name);
    }
    return CATALOG_ORDER
      .filter((et) => grouped[et]?.size)
      .map((et) => ({
        label: CATALOG_LABEL[et] ?? et,
        options: [...grouped[et]].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" })),
      }));
  }, [processedRows]);

  // Actores: nombres agrupados por rol (Cliente, Inversor, etc.)
  const actorNameGroups = useMemo((): FilterOptionGroup[] => {
    const ROLE_ORDER = ["customer", "manager", "investor", "contractor", "provider", "biller", "lessee"];
    const grouped: Record<string, Set<string>> = {};
    for (const r of processedRows) {
      if (r.entity_type !== "actor") continue;
      const roles = r.roles ?? [];
      if (roles.length === 0) {
        if (!grouped["_none"]) grouped["_none"] = new Set();
        grouped["_none"].add(r.name);
      } else {
        for (const role of roles) {
          if (!grouped[role]) grouped[role] = new Set();
          grouped[role].add(r.name);
        }
      }
    }
    const ordered = ROLE_ORDER.filter((r) => grouped[r]?.size);
    if (grouped["_none"]?.size) ordered.push("_none");
    return ordered.map((role) => ({
      label: role === "_none" ? "Sin rol" : (ROLE_LABEL[role] ?? role),
      options: [...grouped[role]].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" })),
    }));
  }, [processedRows]);

  // ─── Columnas DataTable ────────────────────────────────────────────────────

  const actorColumns: DataTableColumn<ProcessedRow>[] = useMemo(() => [
    {
      key: "name",
      header: "Nombre",
      sortable: true,
      filterable: true,
      filterType: "select",
      filterOptionGroups: actorNameGroups,
    },
    {
      key: "type_display",
      header: "Tipo",
      sortable: true,
      filterable: false,
      render: (_val, row) => {
        const badge = ENTITY_BADGE[row.entity_type] ?? { label: row.entity_type, className: "bg-gray-100 text-gray-600" };
        return (
          <span className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-medium ${badge.className}`}>
            {badge.label}
          </span>
        );
      },
    },
    {
      key: "roles_display",
      header: "Roles",
      sortable: true,
      filterable: true,
      filterType: "select",
      filterOptions: roleFilterOptions,
      render: (_val, row) => {
        const chips = (row.roles ?? []).map((r) => ROLE_LABEL[r] ?? r);
        return chips.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {chips.map((chip) => (
              <span key={chip} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                {chip}
              </span>
            ))}
          </div>
        ) : <span className="text-gray-300">—</span>;
      },
    },
    {
      key: "tax",
      header: "CUIT / DNI",
      sortable: true,
      filterable: true,
      filterType: "select",
      filterOptions: getFilterOptionsForColumn("tax"),
      render: (val) => val ? <span className="tabular-nums text-gray-500">{String(val)}</span> : <span className="text-gray-300">—</span>,
    },
  ], [actorNameGroups, getFilterOptionsForColumn, roleFilterOptions]);

  const catalogColumns: DataTableColumn<ProcessedRow>[] = useMemo(() => [
    {
  key: "name",
  header: "Nombre",
  sortable: true,
  filterable: true,
  filterType: "select",
  filterOptionGroups: catalogNameGroups,

},
    {
      key: "type_display",
      header: "Tipo",
      sortable: true,
      filterable: true,
      filterType: "select",
      filterOptions: getFilterOptionsForColumn("type_display"),
      render: (_val, row) => {
        const badge = ENTITY_BADGE[row.entity_type] ?? { label: row.entity_type, className: "bg-gray-100 text-gray-600" };
        return (
          <span className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-medium ${badge.className}`}>
            {badge.label}
          </span>
        );
      },
    },
  ], [catalogNameGroups, getFilterOptionsForColumn]);

  // En modo archivado: tabla unificada con columnas de actor
  const activeColumns = isArchived ? actorColumns : entityTab === "actors" ? actorColumns : catalogColumns;

  // ─── JSX ─────────────────────────────────────────────────────────────────────

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

      {/* Confirm archive/restore dialog */}
      <BaseModal
        isOpen={!!confirmArchive}
        onClose={() => setConfirmArchive(null)}
        isSaving={!confirmArchive?.row.archived && confirmArchive?.usageCount === undefined}
        title={
          confirmArchive?.row.archived
            ? "Restaurar entidad"
            : (confirmArchive?.usageCount ?? 0) > 0
            ? "Elemento en uso"
            : "Confirmar archivado"
        }
        message={
          confirmArchive?.row.archived
            ? `¿Restaurar "${confirmArchive.row.name}"?`
            : confirmArchive?.usageCount === undefined
            ? "Verificando usos…"
            : confirmArchive.usageCount > 0
            ? `"${confirmArchive.row.name}" está en uso en ${confirmArchive.usageCount} proyecto${confirmArchive.usageCount !== 1 ? "s" : ""}. Si lo archivás, esos proyectos perderán esa referencia. ¿Archivar de todas formas?`
            : `¿Archivar "${confirmArchive.row.name}"?`
        }
        primaryButtonText={confirmArchive?.row.archived ? "Sí, restaurar" : "Sí, archivar"}
        secondaryButtonText="Cancelar"
        primaryButtonColor={
          confirmArchive?.row.archived
            ? "bg-primary-700 hover:bg-primary-800 focus:ring-primary-300"
            : "bg-red-600 hover:bg-red-800 focus:ring-red-300"
        }
        onPrimaryAction={() => confirmArchive && void handleArchiveConfirm(confirmArchive.row)}
        onSecondaryAction={() => setConfirmArchive(null)}
      />
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={q}
            onChange={(e) => onQ(e.target.value)}
            placeholder="Buscar por nombre, CUIT/DNI, alias…"
            className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>

        <div className="relative" ref={newMenuRef}>
          <button
            type="button"
            onClick={() => setNewMenuOpen((p) => !p)}
            className="flex items-center gap-1.5 border rounded-lg px-4 py-2 text-sm bg-primary-700 text-white hover:bg-primary-800 transition-colors"
          >
            + Nuevo
            <ChevronDown size={14} className={`transition-transform duration-150 ${newMenuOpen ? "rotate-180" : ""}`} />
          </button>
          {newMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl border border-gray-200 shadow-lg z-20 overflow-hidden">
              <button
                type="button"
                onClick={() => { setNewMenuOpen(false); openCreate("actor"); }}
                className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Actor
              </button>
              <button
                type="button"
                onClick={() => { setNewMenuOpen(false); openCreate("catalog"); }}
                className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
              >
                Catálogo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-end justify-between border-b border-gray-200">
        <div className="flex">
          {(["catalog", "actors"] as const).map((tab) => {
            const count = tab === "catalog" ? activeCatalogCount : activeActorCount;
            const isActive = entityTab === tab && status === "active";
            return (
              <button
                key={tab}
                onClick={() => onEntityTab(tab)}
                className={`text-sm px-4 py-2 border-b-2 transition-colors ${
                  isActive
                    ? "border-primary-700 text-primary-700 font-medium"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab === "catalog" ? "Catálogo" : "Actores"}
                <span className={`ml-2 text-xs rounded-full px-2 py-0.5 ${
                  isActive ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-500"
                }`}>
                  {loading ? "…" : count}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onStatus(status === "archived" ? "active" : "archived")}
          className={`text-sm px-4 py-2 border-b-2 transition-colors ${
            status === "archived"
              ? "border-primary-700 text-primary-700 font-medium"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Archivados
          <span className={`ml-2 text-xs rounded-full px-2 py-0.5 ${
            status === "archived" ? "bg-primary-100 text-primary-700" : "bg-gray-100 text-gray-500"
          }`}>
            {loading ? "…" : archivedTotal}
          </span>
        </button>
      </div>

      {/* Tabla */}
      <div className={`transition-opacity duration-200 ${loading ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
        <DataTable<ProcessedRow>
          data={displayRows}
          columns={activeColumns}
          filters={colFilters}
          onFilterChange={handleFilterChange}
          enableFilters={true}
          renderActions={(row) => (
            <div className="flex items-center gap-1 justify-end">
              <UsagesPopover entityType={row.entity_type} id={row.id} name={row.name} roles={row.roles ?? []} />
              <button
                onClick={() => openEdit(row)}
                title="Editar"
                className="p-1.5 rounded-md text-gray-500 hover:text-primary-700 hover:bg-primary-50 transition-colors"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); void handleArchiveClick(row); }}
                title={row.archived ? "Restaurar" : "Archivar"}
                className="p-1.5 rounded-md text-gray-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
              >
                {row.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
              </button>
            </div>
          )}
          message={loading ? "Cargando…" : "No hay resultados para los filtros seleccionados."}
          pagination={pagination.buildPagination(displayRows.length)}
        />
      </div>
    </div>
  );
}
