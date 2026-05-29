import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import useSupplies from "@/hooks/useSupplies";
import { useSelection } from "@/pages/login/context/useSelection";

const MAX_VISIBLE_NAMES = 3;

export function TentativePricesChip() {
  const { projectId } = useSelection();
  const { supplies, getSupplies, processing } = useSupplies();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!projectId) return;
    getSupplies(projectId);
  }, [getSupplies, projectId]);

  useEffect(() => {
    const handleWorkspaceDataUpdated = () => {
      if (!projectId) return;
      getSupplies(projectId);
    };

    window.addEventListener("ponti:workspace-data-updated", handleWorkspaceDataUpdated);
    return () => {
      window.removeEventListener("ponti:workspace-data-updated", handleWorkspaceDataUpdated);
    };
  }, [getSupplies, projectId]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const partialSupplies = useMemo(
    () => supplies.filter((supply) => Boolean(supply.is_partial_price)),
    [supplies]
  );

  const count = partialSupplies.length;

  useEffect(() => {
    if (count === 0) setOpen(false);
  }, [count]);

  if (!projectId || count === 0) return null;

  return (
    <div ref={rootRef} className="relative hidden sm:block">
      <button
        type="button"
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-800 shadow-sm transition hover:bg-amber-100"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        title="Precios pendientes de validación"
      >
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{processing ? "Revisando..." : `${count} precios tentativos`}</span>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-amber-200 bg-white p-3 text-sm text-slate-700 shadow-lg">
          <p className="font-semibold text-slate-900">Precios pendientes de validación</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Estos insumos o labores aún tienen valores tentativos.
            Revisalos antes de generar o exportar informes.
          </p>

          <div className="mt-3 space-y-1.5">
            {partialSupplies.slice(0, MAX_VISIBLE_NAMES).map((supply) => (
              <div
                key={supply.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-900"
              >
                <span className="truncate">{supply.name}</span>
                <span className="shrink-0 font-semibold">u$ {supply.price}</span>
              </div>
            ))}

            {count > MAX_VISIBLE_NAMES ? (
              <p className="px-2 text-xs text-slate-500">
                +{count - MAX_VISIBLE_NAMES} insumos más
              </p>
            ) : null}
          </div>

          <Link
            to="/admin/master-data/supplies/list"
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-700"
            onClick={() => setOpen(false)}
          >
            Revisar insumos
          </Link>
        </div>
      ) : null}
    </div>
  );
}
