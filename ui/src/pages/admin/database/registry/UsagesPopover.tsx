import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Info, Loader } from "lucide-react";
import { apiClient } from "@/api/client";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type UsageItem = {
  id: number;
  name: string;
  customer: string;
  campaign: string;
};

type UsageResult = {
  items: UsageItem[];
  total: number;
};

// ─── Etiquetas ────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  actor:         "Actor",
  campaigns:     "Campaña",
  crops:         "Cultivo",
  "lease-types": "Tipo de arriendo",
  types:         "Tipo",
  project:       "Proyecto",
  field:         "Campo",
  lot:           "Lote",
};

const ROLE_LABEL: Record<string, string> = {
  customer:   "Cliente",
  provider:   "Proveedor",
  investor:   "Inversor",
  manager:    "Responsable",
  contractor: "Contratista",
  biller:     "Facturador",
  lessee:     "Arrendatario",
};

// ─── Componente ───────────────────────────────────────────────────────────────

type Props = {
  entityType: string;
  id: number;
  name: string;
  roles?: string[];
};

// Contenedor principal de scroll de la app (ver ProtectedLayout.tsx)
function getMainScroll(): HTMLElement {
  return (document.getElementById("main-scroll") ?? document.documentElement) as HTMLElement;
}

export default function UsagesPopover({ entityType, id, name, roles = [] }: Props) {
  const [open, setOpen]       = useState(false);
  const [pos, setPos]         = useState({ top: 0, left: 0 });
  const [data, setData]       = useState<UsageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const btnRef                = useRef<HTMLButtonElement>(null);
  const popRef                = useRef<HTMLDivElement>(null);
  const scrollElRef           = useRef<HTMLElement | null>(null);
  const addedPaddingRef       = useRef(0);
  // Marca que el scroll fue programático (nuestro) para no cerrar el popup al recibirlo
  const isOwnScrollRef        = useRef(false);

  const fetchUsages = async () => {
    setLoading(true);
    setData(null);
    try {
      const qs = new URLSearchParams({ entity_type: entityType, id: String(id), name });
      if (roles.length) qs.set("roles", roles.join(","));
      const res = await apiClient.get<{ success: boolean; data: UsageResult }>(
        `/registry/usages?${qs.toString()}`
      );
      setData(res.data);
    } catch {
      setData({ items: [], total: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Quita el espacio que hayamos agregado al final de la página
  const revertExtraSpace = useCallback(() => {
    if (addedPaddingRef.current > 0 && scrollElRef.current) {
      const el = scrollElRef.current;
      const prev = parseFloat(getComputedStyle(el).paddingBottom || "0");
      const next = Math.max(0, prev - addedPaddingRef.current);
      el.style.paddingBottom = next > 0 ? `${next}px` : "";
    }
    addedPaddingRef.current = 0;
    scrollElRef.current = null;
  }, []);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (open) { setOpen(false); return; }
    if (!btnRef.current) return;

    // Posición provisoria debajo del botón; el alto real se mide al renderizar
    const rect = btnRef.current.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.right - 288, window.innerWidth - 288 - 8));
    setPos({ top: rect.bottom + 6, left });
    fetchUsages();
    setOpen(true);
  };

  // Posiciona el popover y genera SOLO el espacio que su contenido real necesita.
  // Corre tras renderizar y cada vez que cambia el contenido (loading/data), midiendo
  // el alto efectivo del popover en vez de asumir un alto fijo.
  useLayoutEffect(() => {
    if (!open || !popRef.current || !btnRef.current) return;
    // Revertir el espacio de una medición previa antes de volver a medir
    revertExtraSpace();

    const rect       = btnRef.current.getBoundingClientRect();
    const popH       = popRef.current.offsetHeight;
    const left       = Math.max(8, Math.min(rect.right - 288, window.innerWidth - 288 - 8));
    const spaceBelow = window.innerHeight - rect.bottom - 14;

    // Entra debajo del botón: no tocamos la página
    if (popH <= spaceBelow) {
      setPos({ top: rect.bottom + 6, left });
      return;
    }

    // No entra: expandimos la página exactamente lo que falta y scrolleamos
    const extraNeeded = popH - spaceBelow;
    const scrollEl    = getMainScroll();
    scrollElRef.current     = scrollEl;
    addedPaddingRef.current = extraNeeded;
    const prevPadding = parseFloat(getComputedStyle(scrollEl).paddingBottom || "0");
    scrollEl.style.paddingBottom = `${prevPadding + extraNeeded}px`;
    void scrollEl.offsetHeight; // reflow antes de scrollear
    isOwnScrollRef.current = true;
    scrollEl.scrollBy({ top: extraNeeded, behavior: "instant" });
    setTimeout(() => { isOwnScrollRef.current = false; }, 100);

    const newRect = btnRef.current.getBoundingClientRect();
    const rawTop  = newRect.bottom + 6;
    const top = rawTop + popH > window.innerHeight - 8 ? window.innerHeight - popH - 8 : rawTop;
    setPos({ top: Math.max(8, top), left });
  }, [open, loading, data, revertExtraSpace]);

  // Al cerrar, restaurar el padding-bottom agregado
  useEffect(() => {
    if (!open) revertExtraSpace();
  }, [open, revertExtraSpace]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popRef.current && !popRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Cerrar al hacer scroll fuera del popover (ignorar el scroll propio al abrir)
  useEffect(() => {
    if (!open) return;
    const handler = (e: Event) => {
      if (isOwnScrollRef.current) return;
      if (popRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", handler, true);
    return () => window.removeEventListener("scroll", handler, true);
  }, [open]);

  const popover = open
    ? createPortal(
        <div
          ref={popRef}
          style={{ top: pos.top, left: pos.left, width: 288, position: "fixed", zIndex: 9999 }}
          className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-3.5 py-2.5 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {entityType === "actor"
                ? roles.map((r) => ROLE_LABEL[r] ?? r).join(", ") || TYPE_LABEL[entityType]
                : TYPE_LABEL[entityType] ?? entityType}
            </p>
          </div>

          {/* Body */}
          <div className="divide-y divide-gray-100 max-h-56 overflow-y-auto flex-1">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-5 text-gray-400">
                <Loader size={14} className="animate-spin" />
                <span className="text-sm">Cargando…</span>
              </div>
            )}

            {!loading && data && data.items.length === 0 && (
              <div className="px-3.5 py-4 text-sm text-gray-400 text-center">
                No se encontraron proyectos activos.
              </div>
            )}

            {!loading && data && data.items.map((item) => (
              <div key={item.id} className="px-3.5 py-2.5">
                <a
                  href={`/admin/database/customers/${item.id}`}
                  className="group flex items-center gap-1 text-sm font-medium text-gray-800 hover:text-blue-600 leading-snug"
                >
                  <span>{item.name}</span>
                  <ExternalLink size={11} className="opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                </a>
                <p className="text-xs text-gray-400 mt-0.5">
                  {item.customer || "—"}
                  {entityType !== "campaigns" && item.campaign
                    ? ` · Campaña ${item.campaign}`
                    : ""}
                </p>
              </div>
            ))}
          </div>

          {/* Footer */}
          {!loading && data && (
            <div className="px-3.5 py-2 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-400">
                {data.total === 0
                  ? "Sin proyectos"
                  : `${data.total} proyecto${data.total !== 1 ? "s" : ""} activo${data.total !== 1 ? "s" : ""}`}
              </p>
            </div>
          )}
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        title="Ver usos"
        className={`p-1.5 rounded-md transition-colors ${
          open
            ? "text-blue-600 bg-blue-50"
            : "text-gray-500 hover:text-blue-500 hover:bg-blue-50"
        }`}
      >
        <Info size={15} />
      </button>
      {popover}
    </>
  );
}
