import { useCallback, useEffect, useState } from "react";

import Button from "@/components/Button/Button";
import InputField from "@/components/Input/InputField";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  CatalogItem,
  createCatalog,
  listCatalog,
  removeCatalog,
  updateCatalog,
} from "@/api/catalog";

export type CatalogField = { key: string; label: string; required?: boolean };

type Props = {
  title: string;
  base: string; // path bajo /catalog (crops, types, lease-types, campaigns)
  fields?: CatalogField[];
  columns?: { key: string; label: string }[];
};

const DEFAULT_FIELDS: CatalogField[] = [{ key: "name", label: "Nombre", required: true }];

// CRUDAR genérico para catálogos name-based (configurable vía fields/columns).
export default function CatalogCrud({ title, base, fields = DEFAULT_FIELDS, columns }: Props) {
  const cols = columns ?? fields.map((f) => ({ key: f.key, label: f.label }));
  const [rows, setRows] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listCatalog(base));
    } catch {
      toastError(`No se pudo cargar ${title}`);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [base, title]);

  useEffect(() => {
    void load();
  }, [load]);

  const reset = () => {
    setForm({});
    setEditingId(null);
  };

  const submit = async () => {
    for (const f of fields) {
      if (f.required && !(form[f.key] ?? "").trim()) {
        toastError(`${f.label} es obligatorio`);
        return;
      }
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      for (const f of fields) body[f.key] = form[f.key] ?? "";
      if (editingId == null) {
        await createCatalog(base, body);
        toastSuccess(`${title}: creado`);
      } else {
        await updateCatalog(base, editingId, body);
        toastSuccess(`${title}: actualizado`);
      }
      reset();
      await load();
    } catch {
      toastError("No se pudo guardar (¿duplicado?)");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (it: CatalogItem) => {
    const f: Record<string, string> = {};
    for (const fl of fields) f[fl.key] = String(it[fl.key] ?? "");
    setForm(f);
    setEditingId(it.id);
  };

  const del = async (it: CatalogItem) => {
    if (!window.confirm(`¿Eliminar «${it.name ?? it.id}»?`)) return;
    try {
      await removeCatalog(base, it.id);
      toastSuccess(`${title}: eliminado`);
      await load();
    } catch {
      toastError("No se pudo eliminar");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 items-end mb-3">
        {fields.map((f) => (
          <div key={f.key} className="min-w-[180px]">
            <InputField
              label={f.label}
              name={`cat-${base}-${f.key}`}
              value={form[f.key] ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
            />
          </div>
        ))}
        <Button variant="primary" size="sm" onClick={submit} disabled={saving}>
          {editingId == null ? "Agregar" : "Guardar"}
        </Button>
        {editingId != null && (
          <Button variant="secondary" size="sm" onClick={reset}>
            Cancelar
          </Button>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              {cols.map((c) => (
                <th key={c.key} className="px-3 py-2">
                  {c.label}
                </th>
              ))}
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((it) => (
              <tr key={it.id} className="border-t">
                {cols.map((c) => (
                  <td key={c.key} className="px-3 py-2">
                    {String(it[c.key] ?? "")}
                  </td>
                ))}
                <td className="px-3 py-2 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button variant="outlineGray" size="xs" onClick={() => startEdit(it)}>
                      Editar
                    </Button>
                    <Button variant="danger" size="xs" onClick={() => del(it)}>
                      Eliminar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={cols.length + 1} className="px-3 py-6 text-center text-gray-400">
                  Sin registros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
