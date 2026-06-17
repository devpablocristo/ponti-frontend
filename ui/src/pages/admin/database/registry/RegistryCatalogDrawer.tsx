import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";

import Drawer from "@/components/Drawer/Drawer";
import { toastError, toastSuccess } from "@/lib/toast";
import { createCatalog, updateCatalog } from "@/api/catalog";

const statusOf = (e: unknown): number | undefined => {
  const x = e as { response?: { status?: number }; error?: { status?: number }; status?: number };
  return x?.response?.status ?? x?.error?.status ?? x?.status;
};

export type CatalogItem = { id: number; name: string; archived: boolean };

const CATALOG_TYPES = [
  { base: "campaigns",   label: "Campaña",          singular: "campaña" },
  { base: "crops",       label: "Cultivo",           singular: "cultivo" },
  { base: "types",       label: "Tipo",              singular: "tipo" },
  { base: "lease-types", label: "Tipo de arriendo",  singular: "tipo de arriendo" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  base: string;       // vacío = nuevo con selector de categoría
  singular: string;
  item: CatalogItem | null;
  prefillName?: string;
  onSaved: () => void;
};

export default function RegistryCatalogDrawer({ open, onClose, base, singular, item, prefillName, onSaved }: Props) {
  const isEdit = !!item;
  const needsTypeSelection = !isEdit && base === "";

  const [selectedBase, setSelectedBase] = useState<string>("");
  const [name, setName]                 = useState("");
  const [saving, setSaving]             = useState(false);

  const effectiveBase     = isEdit ? base : (needsTypeSelection ? selectedBase : base);
  const effectiveSingular = isEdit ? singular : (CATALOG_TYPES.find((t) => t.base === effectiveBase)?.singular ?? singular);

  useEffect(() => {
    if (!open) return;
    setName(item ? item.name : (prefillName ?? ""));
    if (!isEdit) setSelectedBase("");
  }, [open, item, prefillName, isEdit]);

  const save = async () => {
    if (needsTypeSelection && !selectedBase) { toastError("Elegí una categoría"); return; }
    if (!name.trim()) { toastError("El nombre es obligatorio"); return; }
    setSaving(true);
    try {
      if (item) {
        await updateCatalog(effectiveBase, item.id, { name: name.trim() });
        toastSuccess("Guardado");
      } else {
        await createCatalog(effectiveBase, { name: name.trim() });
        toastSuccess(`Creado «${name.trim()}»`);
      }
      onSaved(); onClose();
    } catch (e) {
      toastError(statusOf(e) === 409 ? `Ya existe un ${effectiveSingular} con ese nombre` : "No se pudo guardar");
    } finally { setSaving(false); }
  };

  const displayName = isEdit
    ? item?.name
    : (needsTypeSelection
        ? CATALOG_TYPES.find((t) => t.base === selectedBase)?.label ?? "Nuevo elemento"
        : singular.charAt(0).toUpperCase() + singular.slice(1));

  return (
    <Drawer open={open} onClose={onClose}>
      {/* Header */}
      <div className="flex items-center gap-3 pb-5 border-b border-gray-100 pr-8">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <BookOpen size={18} className="text-emerald-700" />
        </div>
        <div>
          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Catálogo</p>
          <h2 className="text-lg font-semibold text-gray-900 leading-tight">
            {isEdit ? `Editar ${effectiveSingular}` : `Nuevo — ${displayName}`}
          </h2>
        </div>
      </div>

      <div className="pt-5 space-y-6">

        {/* Selector de categoría (solo al crear nuevo sin tipo pre-definido) */}
        {needsTypeSelection && (
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
              Categoría<span className="text-red-500 ml-0.5">*</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CATALOG_TYPES.map(({ base: b, label }) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setSelectedBase(b)}
                  className={`py-2.5 px-3 rounded-lg text-sm font-medium border text-left transition-all ${
                    selectedBase === b
                      ? "bg-primary-50 text-primary-700 border-primary-400"
                      : "text-gray-600 border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Nombre */}
        <section>
          {needsTypeSelection && <div className="border-t border-gray-100 mb-6" />}
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Nombre<span className="text-red-500 ml-0.5">*</span>
          </p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void save(); } }}
            placeholder={`Nombre del ${effectiveSingular || "elemento"}…`}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
          />
        </section>

        {/* Footer */}
        <div className="border-t border-gray-100 pt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-5 py-2 text-sm font-medium rounded-lg bg-primary-700 text-white hover:bg-primary-800 disabled:opacity-60 transition-colors"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </Drawer>
  );
}
