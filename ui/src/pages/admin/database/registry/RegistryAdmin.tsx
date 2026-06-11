import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, Archive, ArchiveRestore, Search as SearchIcon, ChevronDown, X } from "lucide-react";

import Button from "@/components/Button/Button";
import { BaseModal } from "@/components/Modal/BaseModal";
import { toastError } from "@/lib/toast";
import { RegistryRow, RegistryStatus, searchRegistry } from "@/api/registry";
import { archiveActor, restoreActor } from "@/api/actors";
import { archiveCatalog, restoreCatalog } from "@/api/catalog";
import RegistryActorDrawer from "./RegistryActorDrawer";
import RegistryCatalogDrawer, { CatalogItem } from "./RegistryCatalogDrawer";
import UsagesPopover from "./UsagesPopover";

const PER_PAGE = 200; // cargamos más para poder filtrar client-side

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

const ENTITY_BADGE: Record<string, { label: string; className: string }> = {
  actor:          { label: "Actor",            className: "bg-primary-100 text-primary-700" },
  crops:          { label: "Cultivo",          className: "bg-green-100 text-green-700" },
  types:          { label: "Tipo",             className: "bg-amber-100 text-amber-700" },
  "lease-types":  { label: "Tipo de arriendo", className: "bg-pink-100 text-pink-700" },
  campaigns:      { label: "Campaña",          className: "bg-violet-100 text-violet-700" },
};

// Tipos de actor-rol (se filtran client-side por roles[])
const ACTOR_ROLE_TYPES = new Set(["customer","provider","investor","manager","contractor","biller","lessee"]);
// Tipos de catálogo (se filtran por entity_type)
const CATALOG_TYPES = new Set(["crops","types","lease-types","campaigns"]);

// Grupos para el popover de filtro
const FILTER_GROUPS = [
  {
    label: "Actores",
    options: [
      { value: "customer",   label: "Clientes" },
      { value: "provider",   label: "Proveedores" },
      { value: "investor",   label: "Inversores" },
      { value: "manager",    label: "Responsables" },
      { value: "contractor", label: "Contratistas" },
      { value: "biller",     label: "Facturadores" },
      { value: "lessee",     label: "Arrendatarios" },
    ],
  },
  {
    label: "Catálogo",
    options: [
      { value: "crops",       label: "Cultivos" },
      { value: "types",       label: "Tipos" },
      { value: "lease-types", label: "Tipos de arriendo" },
      { value: "campaigns",   label: "Campañas" },
    ],
  },
];

// ─── TypeFilterDropdown ───────────────────────────────────────────────────────

interface TypeFilterDropdownProps {
  selected: string[];
  onChange: (next: string[]) => void;
}

function TypeFilterDropdown({ selected, onChange }: TypeFilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const recalcPos = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left });
  };

  const toggle = () => {
    if (open) { setOpen(false); setPos(null); }
    else { recalcPos(); setOpen(true); setSearch(""); }
  };

  // cerrar al hacer click afuera
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !panelRef.current?.contains(t)) {
        setOpen(false); setPos(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // reposicionar al resize/scroll
  useEffect(() => {
    if (!open) return;
    const handler = () => recalcPos();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => { window.removeEventListener("resize", handler); window.removeEventListener("scroll", handler, true); };
  }, [open]);

  const allOptions = FILTER_GROUPS.flatMap((g) => g.options);
  const q = search.toLowerCase();
  const visibleGroups = FILTER_GROUPS.map((g) => ({
    ...g,
    options: g.options.filter((o) => !q || o.label.toLowerCase().includes(q)),
  })).filter((g) => g.options.length > 0);

  const allValues = allOptions.map((o) => o.value);
  const allSelected = allValues.every((v) => selected.includes(v));
  const someSelected = selected.length > 0 && !allSelected;

  const toggleAll = (checked: boolean) => onChange(checked ? allValues : []);
  const toggleOne = (value: string, checked: boolean) =>
    onChange(checked ? [...selected, value] : selected.filter((v) => v !== value));

  // etiqueta del botón
  const buttonLabel = () => {
    if (selected.length === 0) return "Todos los tipos";
    if (selected.length === 1) {
      return allOptions.find((o) => o.value === selected[0])?.label ?? selected[0];
    }
    return `${selected.length} tipos`;
  };

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className={`flex items-center gap-1.5 border rounded-lg px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary-300 ${
          selected.length > 0
            ? "border-primary-400 bg-primary-50 text-primary-700"
            : "border-gray-200 text-gray-700 hover:border-gray-300"
        }`}
      >
        <span>{buttonLabel()}</span>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange([]); }}
            className="ml-0.5 text-primary-400 hover:text-primary-700"
          >
            <X size={12} />
          </button>
        )}
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && pos &&
        createPortal(
          <div
            ref={panelRef}
            className="fixed z-[9999] w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
            style={{ top: pos.top, left: pos.left }}
          >
            {/* Buscador interno */}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar tipo…"
              className="mb-2 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 focus:outline-none"
            />

            {/* Seleccionar todo */}
            {!search && (
              <label className="mb-1 flex items-center gap-2 border-b border-slate-100 pb-2 text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected; }}
                  onChange={(e) => toggleAll(e.target.checked)}
                />
                Seleccionar todo
              </label>
            )}

            {/* Grupos */}
            <div className="max-h-52 overflow-auto pr-1">
              {visibleGroups.map((group) => (
                <div key={group.label} className="mb-2">
                  <p className="mb-1 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {group.label}
                  </p>
                  {group.options.map((opt) => (
                    <label key={opt.value} className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs text-slate-600 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={selected.includes(opt.value)}
                        onChange={(e) => toggleOne(opt.value, e.target.checked)}
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              ))}
              {visibleGroups.length === 0 && (
                <p className="py-2 text-center text-xs text-slate-400">Sin resultados</p>
              )}
            </div>

            {/* Acciones */}
            <div className="mt-2 flex justify-between border-t border-slate-100 pt-2">
              <button
                type="button"
                onClick={() => onChange([])}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200"
              >
                Limpiar
              </button>
              <button
                type="button"
                onClick={() => { setOpen(false); setPos(null); }}
                className="rounded-lg bg-primary-700 px-3 py-1.5 text-xs text-white hover:bg-primary-800"
              >
                Aplicar
              </button>
            </div>
          </div>,
          document.body
        )
      }
    </div>
  );
}

// ─── Helpers de filtrado client-side ─────────────────────────────────────────

function rowMatchesTypes(row: RegistryRow, selectedTypes: string[]): boolean {
  if (selectedTypes.length === 0) return true;
  if (row.entity_type === "actor") {
    const actorRoles = selectedTypes.filter((t) => ACTOR_ROLE_TYPES.has(t));
    if (actorRoles.length === 0) return false; // solo hay tipos de catálogo seleccionados
    return actorRoles.some((t) => row.roles?.includes(t));
  }
  return selectedTypes.includes(row.entity_type);
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function RegistryAdmin() {
  const [q, setQ] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [status, setStatus] = useState<RegistryStatus>("active");
  const [entityTab, setEntityTab] = useState<"actors" | "catalog">("catalog");
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState<RegistryRow[]>([]);
  const [loadedStatus, setLoadedStatus] = useState<RegistryStatus>("active"); // status de los datos en pantalla
  const [activeTotal, setActiveTotal] = useState(0);
  const [archivedTotal, setArchivedTotal] = useState(0);
  const [maxPage, setMaxPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [actorDrawer, setActorDrawer] = useState<{ open: boolean; actorId: number | null; prefillName?: string }>({
    open: false, actorId: null,
  });
  const [catalogDrawer, setCatalogDrawer] = useState<{
    open: boolean; base: string; singular: string; item: CatalogItem | null; prefillName?: string;
  }>({ open: false, base: "crops", singular: "cultivo", item: null });
  const [confirmArchive, setConfirmArchive] = useState<{ row: RegistryRow } | null>(null);

  // Filas activas separadas para los conteos de los tabs de entidad (siempre reflejan status=active)
  const [activeActorCount, setActiveActorCount] = useState(0);
  const [activeCatalogCount, setActiveCatalogCount] = useState(0);

  // Carga siempre con type="all" — el filtrado de tipos es client-side
  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Carga activos y archivados en paralelo para tener ambos contadores
      const [activeRes, archivedRes] = await Promise.all([
        searchRegistry({ q: q.trim(), type: "all", status: "active",   page, perPage: PER_PAGE }),
        searchRegistry({ q: q.trim(), type: "all", status: "archived", page: 1, perPage: 1 }),
      ]);
      setActiveTotal(activeRes.page_info?.total ?? 0);
      setArchivedTotal(archivedRes.page_info?.total ?? 0);

      // Conteos por tipo para los tabs de entidad (siempre de datos activos)
      const activeData = activeRes.data ?? [];
      setActiveActorCount(activeData.filter((r) => r.entity_type === "actor").length);
      setActiveCatalogCount(activeData.filter((r) => r.entity_type !== "actor").length);

      if (status === "active") {
        setRows(activeData);
        setLoadedStatus("active");
        setMaxPage(activeRes.page_info?.max_page ?? 1);
      } else {
        // recarga archivados con PER_PAGE completo
        const archived = await searchRegistry({ q: q.trim(), type: "all", status: "archived", page, perPage: PER_PAGE });
        setRows(archived.data ?? []);
        setLoadedStatus("archived");
        setMaxPage(archived.page_info?.max_page ?? 1);
      }
    } catch {
      toastError("No se pudo cargar el listado");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [q, status, page]);

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

  const onQ = (v: string) => { setPage(1); setQ(v); };
  const onStatus = (v: RegistryStatus) => { setPage(1); setStatus(v); };
  const onTypes = (v: string[]) => { setPage(1); setSelectedTypes(v); };

  // Filtrado client-side por tipos seleccionados
  const filteredRows = useMemo(
    () => rows.filter((r) => rowMatchesTypes(r, selectedTypes)),
    [rows, selectedTypes]
  );

  // Separar en categorías
  const actorRows   = useMemo(() => filteredRows.filter((r) => r.entity_type === "actor"), [filteredRows]);
  const catalogRows = useMemo(() => filteredRows.filter((r) => r.entity_type !== "actor"), [filteredRows]);

  // ¿El filtro mezcla actores y catálogo? → tabla unificada (sin tabs de entidad)
  const hasActorFilter   = selectedTypes.some((t) => ACTOR_ROLE_TYPES.has(t));
  const hasCatalogFilter = selectedTypes.some((t) => CATALOG_TYPES.has(t));
  const isMixedFilter    = hasActorFilter && hasCatalogFilter;

  // Filas que muestra la tabla activa.
  // Usamos loadedStatus para mostrar todo junto (sin separar por entityTab) cuando los datos son archivados.
  const activeRows = (loadedStatus === "archived" || isMixedFilter)
    ? filteredRows
    : entityTab === "actors"
      ? actorRows
      : catalogRows;

  // En modo archivado usamos la tabla "actors" (columnas completas) para acomodar ambos tipos.
  // Usamos loadedStatus (no status) para que el layout de columnas cambie al mismo tiempo que los datos.
  const showUnifiedTable = loadedStatus === "archived" || isMixedFilter;

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

  const handleArchiveConfirm = async (row: RegistryRow) => {
    setConfirmArchive(null);
    try {
      if (row.entity_type === "actor") {
        if (row.archived) await restoreActor(row.id);
        else await archiveActor(row.id);
      } else {
        if (row.archived) await restoreCatalog(row.entity_type, row.id);
        else await archiveCatalog(row.entity_type, row.id);
      }
      void load();
    } catch {
      toastError("No se pudo completar la operación");
    }
  };

  const openCreate = (kind: string) => {
    if (kind === "") return;
    const prefillName = /^\d+$/.test(q.trim()) ? "" : q.trim();
    if (kind === "actor") {
      setActorDrawer({ open: true, actorId: null, prefillName });
    } else if (kind === "catalog") {
      // Nuevo catálogo unificado — la categoría se elige dentro del drawer
      setCatalogDrawer({ open: true, base: "", singular: "", item: null, prefillName });
    } else {
      setCatalogDrawer({ open: true, base: kind, singular: CATALOG_SINGULAR[kind] ?? kind, item: null, prefillName });
    }
  };

  // ─── Render helpers ──────────────────────────────────────────────────────────

  const ActionButtons = ({ row }: { row: RegistryRow }) => (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
      <UsagesPopover entityType={row.entity_type} id={row.id} name={row.name} roles={row.roles ?? []} />
      <button
        onClick={() => openEdit(row)}
        title="Editar"
        className="p-1.5 rounded-md text-gray-400 hover:text-primary-700 hover:bg-primary-50 transition-colors"
      >
        <Pencil size={16} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); setConfirmArchive({ row }); }}
        title={row.archived ? "Restaurar" : "Archivar"}
        className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
      >
        {row.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
      </button>
    </div>
  );

  const EmptyRow = ({ cols }: { cols: number }) => (
    <tr>
      <td colSpan={cols} className="px-4 py-10 text-center text-gray-400 text-sm">
        {loading ? "Cargando…" : "No hay resultados para los filtros seleccionados."}
      </td>
    </tr>
  );

  // Tabla de actores (con Roles + CUIT)
  const ActorsTable = () => (
    <table className="w-full text-sm">
      <thead className="bg-gray-50 text-gray-500 text-left">
        <tr>
          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Nombre</th>
          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Tipo</th>
          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Roles</th>
          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">CUIT / DNI</th>
          <th className="px-4 py-2.5 w-20" />
        </tr>
      </thead>
      <tbody>
        {actorRows.length === 0 && !loading
          ? <EmptyRow cols={5} />
          : actorRows.map((row) => {
              const badge = ENTITY_BADGE[row.entity_type] ?? { label: row.entity_type, className: "bg-gray-100 text-gray-600" };
              const roleChips = (row.roles ?? []).map((r) => ROLE_LABEL[r] ?? r);
              return (
                <tr key={`actor-${row.id}`} className="border-t border-gray-100 hover:bg-gray-50 group">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{row.name}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {roleChips.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {roleChips.map((chip) => (
                          <span key={chip} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            {chip}
                          </span>
                        ))}
                      </div>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500 tabular-nums">
                    {row.tax || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5"><ActionButtons row={row} /></td>
                </tr>
              );
            })
        }
      </tbody>
    </table>
  );

  // Tabla de catálogo (solo Nombre + Tipo, más compacta)
  // Nombre ocupa ~60% → Tipo queda centrado; acciones al extremo derecho con filler en medio
  const CatalogTable = () => (
    <table className="w-full text-sm table-fixed">
      <colgroup>
        <col style={{ width: "60%" }} />
        <col style={{ width: "20%" }} />
        <col />
        <col style={{ width: "72px" }} />
      </colgroup>
      <thead className="bg-gray-50 text-gray-500 text-left">
        <tr>
          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Nombre</th>
          <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Tipo</th>
          <th />
          <th />
        </tr>
      </thead>
      <tbody>
        {catalogRows.length === 0 && !loading
          ? <EmptyRow cols={4} />
          : catalogRows.map((row) => {
              const badge = ENTITY_BADGE[row.entity_type] ?? { label: row.entity_type, className: "bg-gray-100 text-gray-600" };
              return (
                <tr key={`catalog-${row.entity_type}-${row.id}`} className="border-t border-gray-100 hover:bg-gray-50 group">
                  <td className="px-4 py-2.5 font-medium text-gray-900 truncate">{row.name}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td />
                  <td className="px-4 py-2.5"><ActionButtons row={row} /></td>
                </tr>
              );
            })
        }
      </tbody>
    </table>
  );

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

      {/* Confirm archive/restore dialog — mismo estilo que el resto de la app */}
      <BaseModal
        isOpen={!!confirmArchive}
        onClose={() => setConfirmArchive(null)}
        title={confirmArchive?.row.archived ? "Restaurar entidad" : "Confirmar archivado"}
        message={
          confirmArchive?.row.archived
            ? `¿Restaurar "${confirmArchive.row.name}"?`
            : `¿Archivar "${confirmArchive?.row.name}"?`
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

      <p className="text-sm text-gray-500 mb-4">
        Actores, cultivos, tipos y campañas del sistema
      </p>

      {/* Filtros */}
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

        <TypeFilterDropdown selected={selectedTypes} onChange={onTypes} />

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

      {/* Fila de tabs: Catálogo|Actores (izquierda) + Archivados (derecha) */}
      <div className="flex items-end justify-between border-b border-gray-200">
        {/* LEFT: tabs de entidad — siempre visibles (salvo filtro mixto) */}
        <div className="flex">
          {!isMixedFilter ? (
            (["catalog", "actors"] as const).map((tab) => {
              const count = tab === "catalog" ? activeCatalogCount : activeActorCount;
              const isActive = entityTab === tab && status === "active";
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setEntityTab(tab);
                    if (status === "archived") onStatus("active");
                  }}
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
            })
          ) : (
            <span className="text-sm px-4 py-2 text-gray-500">
              {filteredRows.length} resultado{filteredRows.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* RIGHT: Archivados toggle */}
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
      <div className={`border border-t-0 rounded-b-lg overflow-hidden bg-white transition-opacity duration-200 ${loading ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
        {activeRows.length === 0 && !loading ? (
          <div className="py-10 text-center text-gray-400 text-sm">
            No hay resultados para los filtros seleccionados.
          </div>
        ) : showUnifiedTable || entityTab === "actors" ? (
          // Tabla con columnas de actor (Roles + CUIT)
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Nombre</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Tipo</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Roles</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">CUIT / DNI</th>
                <th className="px-4 py-2.5 w-20" />
              </tr>
            </thead>
            <tbody>
              {activeRows.map((row) => {
                const badge = ENTITY_BADGE[row.entity_type] ?? { label: row.entity_type, className: "bg-gray-100 text-gray-600" };
                const roleChips = row.entity_type === "actor" ? (row.roles ?? []).map((r) => ROLE_LABEL[r] ?? r) : [];
                return (
                  <tr key={`${row.entity_type}-${row.id}`} className="border-t border-gray-100 hover:bg-gray-50 group">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{row.name}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {roleChips.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {roleChips.map((chip) => (
                            <span key={chip} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              {chip}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 tabular-nums">
                      {row.tax || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <ActionButtons row={row} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          // Tabla catálogo (solo Nombre + Tipo)
          <table className="w-full text-sm table-fixed">
            <colgroup>
              <col style={{ width: "60%" }} />
              <col style={{ width: "20%" }} />
              <col />
              <col style={{ width: "72px" }} />
            </colgroup>
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Nombre</th>
                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide">Tipo</th>
                <th />
                <th />
              </tr>
            </thead>
            <tbody>
              {activeRows.map((row) => {
                const badge = ENTITY_BADGE[row.entity_type] ?? { label: row.entity_type, className: "bg-gray-100 text-gray-600" };
                return (
                  <tr key={`${row.entity_type}-${row.id}`} className="border-t border-gray-100 hover:bg-gray-50 group">
                    <td className="px-4 py-2.5 font-medium text-gray-900 truncate">{row.name}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td />
                    <td className="px-4 py-2.5">
                      <ActionButtons row={row} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginado */}
      {maxPage > 1 && (
        <div className="flex items-center justify-end gap-3 mt-3 text-sm text-gray-600">
          <span className="text-gray-400">Página {page} de {maxPage}</span>
          <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            Anterior
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setPage((p) => Math.min(maxPage, p + 1))} disabled={page >= maxPage}>
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}
