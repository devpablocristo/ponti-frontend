import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Info, Loader } from "lucide-react";
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
  not_supported?: boolean;
  unsupported_roles?: string[];
};

// ─── Etiquetas ────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  actor:         "Actor",
  campaigns:     "Campaña",
  crops:         "Cultivo",
  "lease-types": "Tipo de arriendo",
  types:         "Tipo",
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

const NOT_SUPPORTED = new Set(["crops", "types", "lease-types"]);

// ─── Componente ───────────────────────────────────────────────────────────────

type Props = {
  entityType: string;
  id: number;
  name: string;
  roles?: string[];
};

export default function UsagesPopover({ entityType, id, name, roles = [] }: Props) {
  const [open, setOpen]       = useState(false);
  const [pos, setPos]         = useState({ top: 0, left: 0 });
  const [data, setData]       = useState<UsageResult | null>(null);
  const [loading, setLoading] = useState(false);
  const btnRef                = useRef<HTMLButtonElement>(null);
  const popRef                = useRef<HTMLDivElement>(null);

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

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const popW = 288;
    const POPUP_H = 280;
    const left = Math.max(8, Math.min(rect.right - popW, window.innerWidth - popW - 8));
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < POPUP_H && rect.top >= POPUP_H
      ? rect.top - POPUP_H - 6   // abre hacia arriba
      : rect.bottom + 6;         // abre hacia abajo
    setPos({ top, left });
    if (!open) fetchUsages();
    setOpen((v) => !v);
  };

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

  // Cerrar al hacer scroll fuera del popover
  useEffect(() => {
    if (!open) return;
    const handler = (e: Event) => {
      if (popRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", handler, true);
    return () => window.removeEventListener("scroll", handler, true);
  }, [open]);

  const isNotSupported = NOT_SUPPORTED.has(entityType);

  const popover = open
    ? createPortal(
        <div
          ref={popRef}
          style={{ top: pos.top, left: pos.left, width: 288, position: "fixed", zIndex: 9999 }}
          className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden"
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
          <div className="divide-y divide-gray-100 max-h-56 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center gap-2 py-5 text-gray-400">
                <Loader size={14} className="animate-spin" />
                <span className="text-sm">Cargando…</span>
              </div>
            )}

            {!loading && isNotSupported && (
              <div className="px-3.5 py-4 text-sm text-gray-400 text-center leading-snug">
                Los usos de {TYPE_LABEL[entityType] ?? entityType.toLowerCase()} requieren<br />
                soporte del backend.
              </div>
            )}

            {!loading && !isNotSupported && data && data.items.length === 0 && (
              <div className="px-3.5 py-4 text-sm text-gray-400 text-center">
                No se encontraron proyectos activos.
              </div>
            )}

            {!loading && data && data.items.map((item) => (
              <div key={item.id} className="px-3.5 py-2.5">
                <p className="text-sm font-medium text-gray-800 leading-snug">{item.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {item.customer || "—"}
                  {/* Campaña solo se muestra si no estamos filtrando por campaña */}
                  {entityType !== "campaigns" && item.campaign
                    ? ` · Campaña ${item.campaign}`
                    : ""}
                </p>
              </div>
            ))}
          </div>

          {/* Footer */}
          {!loading && data && !isNotSupported && (
            <div className="px-3.5 py-2 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-400">
                {data.total === 0
                  ? "Sin proyectos"
                  : `${data.total} proyecto${data.total !== 1 ? "s" : ""} activo${data.total !== 1 ? "s" : ""}`}
                {data.unsupported_roles && data.unsupported_roles.length > 0 && (
                  <span className="text-amber-500">
                    {" · "}Roles sin soporte: {data.unsupported_roles.join(", ")}
                  </span>
                )}
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
            : "text-gray-300 hover:text-blue-500 hover:bg-blue-50"
        }`}
      >
        <Info size={15} />
      </button>
      {popover}
    </>
  );
}
