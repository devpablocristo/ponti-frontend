import { AlertCircle, AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import useLabors from "@/hooks/useLabors";
import useSupplies from "@/hooks/useSupplies";
import useStock from "@/hooks/useStock";
import { isRevIng } from "@/pages/admin/stock/investorLabels";
import { useSelection } from "@/pages/login/context/useSelection";

const MAX_VISIBLE_NAMES = 3;

export function TentativePricesChip() {
  const { projectId } = useSelection();
  const { supplies, getSupplies, processing } = useSupplies();
  const { labors, getLabors } = useLabors();
  const [open, setOpen] = useState(false);
  const { stock, getStock } = useStock();
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!projectId) return;
    getSupplies(projectId);
    getLabors(projectId);
    getStock(projectId, "");
  }, [getSupplies, getLabors, getStock, projectId]);

  useEffect(() => {
    const handleWorkspaceDataUpdated = () => {
      if (!projectId) return;
      getSupplies(projectId);
      getLabors(projectId);
      getStock(projectId, "");
    };

    window.addEventListener("ponti:workspace-data-updated", handleWorkspaceDataUpdated);
    return () => {
      window.removeEventListener("ponti:workspace-data-updated", handleWorkspaceDataUpdated);
    };
  }, [getSupplies, getLabors, getStock, projectId]);

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

  const partialLabors = useMemo(
    () => labors.filter((labor) => Boolean(labor.is_partial_price)),
    [labors]
  );

  const revIngStock = useMemo(
    () => (Array.isArray(stock) ? stock : []).filter((item) => isRevIng(item)),
    [stock]
  );

  const tentativeCount = partialSupplies.length + partialLabors.length;
  const revIngCount = revIngStock.length;
  const count = tentativeCount + revIngCount;

  const mode = revIngCount > 0 ? "review" : "tentative";

  const chipLabel =
    mode === "review"
      ? tentativeCount === 0
        ? `Revisar ${revIngCount} insumos`
        : `Revisar ${count} items`
      : `${count} precios tentativos`;

  useEffect(() => {
    if (count === 0) setOpen(false);
  }, [count]);

  if (!projectId || count === 0) return null;

  return (
    <div ref={rootRef} className="relative hidden sm:block">
      <button
        type="button"
        className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold shadow-sm transition ${mode === "review"
          ? "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100"
          : "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
          }`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        title="Precios pendientes de validación"
      >
        {mode === "review" ? (
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        <span>{processing ? "Cargando..." : chipLabel}</span>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-amber-200 bg-white p-3 text-sm text-slate-700 shadow-lg">
          <p className="font-semibold text-slate-900">
            {mode === "review" ? "Revisión pendiente" : "Precios pendientes de validación"}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {mode === "review"
              ? "Hay items que requieren tu atención: precios tentativos y/o insumos a revisar (REV ING.)."
              : "Estos insumos o labores aún tienen valores tentativos. Revisalos antes de generar o exportar informes."}
          </p>
          {partialSupplies.length > 0 ? (
            <div className="mt-3">
              <p className="px-1 text-xs font-semibold text-slate-700">Insumos</p>
              <div className="mt-1.5 space-y-1.5">
                {partialSupplies.slice(0, MAX_VISIBLE_NAMES).map((supply) => (
                  <div
                    key={supply.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-900"
                  >
                    <Link
                      to="/admin/database/items/list"
                      onClick={() => setOpen(false)}
                      className="truncate hover:underline"
                    >
                      {supply.name}
                    </Link>
                    <span className="shrink-0 font-semibold">u$ {supply.price}</span>
                  </div>
                ))}

                {partialSupplies.length > MAX_VISIBLE_NAMES ? (
                  <p className="px-2 text-xs text-slate-500">
                    +{partialSupplies.length - MAX_VISIBLE_NAMES} insumos más
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
          {partialLabors.length > 0 ? (
            <div className="mt-3">
              <p className="px-1 text-xs font-semibold text-slate-700">Labores</p>
              <div className="mt-1.5 space-y-1.5">
                {partialLabors.slice(0, MAX_VISIBLE_NAMES).map((labor) => (
                  <div
                    key={labor.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-900"
                  >
                    <Link
                      to="/admin/database/tasks/list"
                      onClick={() => setOpen(false)}
                      className="truncate hover:underline"
                    >
                      {labor.name}
                    </Link>
                    <span className="shrink-0 font-semibold">u$ {labor.price}</span>
                  </div>
                ))}

                {partialLabors.length > MAX_VISIBLE_NAMES ? (
                  <p className="px-2 text-xs text-slate-500">
                    +{partialLabors.length - MAX_VISIBLE_NAMES} labores más
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
          {revIngStock.length > 0 ? (
            <div className="mt-3">
              <p className="px-1 text-xs font-semibold text-slate-700">Insumos a revisar (REV ING.)</p>
              <div className="mt-1.5 space-y-1.5">
                {revIngStock.slice(0, MAX_VISIBLE_NAMES).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-rose-50 px-2 py-1.5 text-xs text-rose-900"
                  >
                    <span className="truncate">{item.supply_name}</span>
                    <span className="shrink-0 font-semibold">REV ING.</span>
                  </div>
                ))}

                {revIngStock.length > MAX_VISIBLE_NAMES ? (
                  <p className="px-2 text-xs text-slate-500">
                    +{revIngStock.length - MAX_VISIBLE_NAMES} insumos más
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
