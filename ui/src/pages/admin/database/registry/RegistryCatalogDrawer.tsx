import { useEffect, useState } from "react";

import Drawer from "@/components/Drawer/Drawer";
import Button from "@/components/Button/Button";
import InputField from "@/components/Input/InputField";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  archiveCatalog,
  createCatalog,
  restoreCatalog,
  updateCatalog,
} from "@/api/catalog";

const statusOf = (e: unknown): number | undefined => {
  const x = e as { response?: { status?: number }; error?: { status?: number }; status?: number };
  return x?.response?.status ?? x?.error?.status ?? x?.status;
};

export type CatalogItem = { id: number; name: string; archived: boolean };

type Props = {
  open: boolean;
  onClose: () => void;
  base: string; // crops | types | lease-types | campaigns
  singular: string; // "cultivo", "tipo", … para mensajes
  item: CatalogItem | null; // edición
  prefillName?: string; // alta
  onSaved: () => void;
};

// Drawer NUEVO de catálogo (solo nombre) para la pantalla unificada. Reusa los APIs de catálogo.
export default function RegistryCatalogDrawer({ open, onClose, base, singular, item, prefillName, onSaved }: Props) {
  const isEdit = !!item;
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(item ? item.name : (prefillName ?? ""));
  }, [open, item, prefillName]);

  const save = async () => {
    if (name.trim() === "") {
      toastError("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    try {
      if (item) {
        await updateCatalog(base, item.id, { name: name.trim() });
        toastSuccess("Guardado");
      } else {
        await createCatalog(base, { name: name.trim() });
        toastSuccess(`Creado «${name.trim()}»`);
      }
      onSaved();
      onClose();
    } catch (e) {
      toastError(statusOf(e) === 409 ? `Ya existe un ${singular} con ese nombre` : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const doArchive = async () => {
    if (!item) return;
    try {
      await archiveCatalog(base, item.id);
      toastSuccess("Archivado");
      onSaved();
      onClose();
    } catch {
      toastError("No se pudo archivar");
    }
  };

  const doRestore = async () => {
    if (!item) return;
    try {
      await restoreCatalog(base, item.id);
      toastSuccess("Restaurado");
      onSaved();
      onClose();
    } catch {
      toastError("No se pudo restaurar (¿ya existe uno activo con ese nombre?)");
    }
  };

  return (
    <Drawer open={open} onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4 pr-8">
        {isEdit ? `Editar ${singular}: ${item?.name}` : `Nuevo ${singular}`}
      </h2>

      <div className="space-y-4">
        <InputField label="Nombre" name="rc-name" value={name} onChange={(e) => setName(e.target.value)} />

        <div className="flex justify-between items-center pt-2">
          <div>
            {isEdit &&
              (item?.archived ? (
                <Button variant="primary" size="sm" onClick={doRestore}>
                  Restaurar
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={doArchive}>
                  Archivar
                </Button>
              ))}
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={save} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
            <Button variant="primary" size="sm" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
