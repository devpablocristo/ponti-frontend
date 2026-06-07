import { useEffect, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";

import { DataTable } from "@devpablocristo/modules-ui-data-display";
import Drawer from "@/components/Drawer/Drawer";
import { BaseModal } from "@/components/Modal/BaseModal";
import { Column } from "@/pages/admin/types";
import { toastError, toastSuccess } from "@/lib/toast";
import { Actor, deleteActor, listActors, restoreActor } from "@/api/actors";

const taxOf = (a: Actor) => a.keys?.find((k) => k.type === "TAX_ID")?.value ?? "—";

// Drawer de actores archivados (mismo patrón que ArchivedWorkOrdersDrawer): lista +
// restaurar / eliminar definitivo, con confirmación.
export default function ArchivedActorsDrawer({
  open,
  onClose,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [rows, setRows] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cfg, setCfg] = useState<{
    title: string;
    message: string;
    primary: string;
    onConfirm: () => Promise<void>;
  }>({ title: "", message: "", primary: "", onConfirm: async () => {} });

  const load = async () => {
    setLoading(true);
    try {
      const r = await listActors("archived", 1, 1000);
      setRows(r.data ?? []);
    } catch {
      toastError("No se pudo cargar archivados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void load();
  }, [open]);

  const confirmRestore = (a: Actor) => {
    setCfg({
      title: "Restaurar actor",
      message: `¿Restaurar «${a.display_name}»?`,
      primary: "Restaurar",
      onConfirm: async () => {
        setSaving(true);
        try {
          await restoreActor(a.id);
          await load();
          onChanged?.();
          toastSuccess("Restaurado");
        } catch {
          toastError("No se pudo restaurar (¿otra identidad usa esa clave?)");
        } finally {
          setSaving(false);
        }
      },
    });
    setModalOpen(true);
  };

  const confirmDelete = (a: Actor) => {
    setCfg({
      title: "Eliminar definitivo",
      message: `¿Eliminar definitivamente «${a.display_name}»? No se puede deshacer.`,
      primary: "Eliminar",
      onConfirm: async () => {
        setSaving(true);
        try {
          await deleteActor(a.id);
          await load();
          onChanged?.();
          toastSuccess("Eliminado");
        } catch {
          toastError("No se pudo eliminar");
        } finally {
          setSaving(false);
        }
      },
    });
    setModalOpen(true);
  };

  const columns: Column<Actor>[] = [
    { key: "display_name", header: "Nombre" },
    { key: "party_type", header: "Tipo" },
    { key: "keys", header: "CUIT", render: (_v, a) => taxOf(a) },
    { key: "roles", header: "Roles", render: (_v, a) => (a.roles ?? []).join(", ") || "—" },
    {
      key: "id",
      header: "Acciones",
      align: "center",
      render: (_v, a) => (
        <div className="flex items-center justify-center gap-3">
          <button
            className="text-green-700 hover:text-green-900"
            title="Restaurar"
            onClick={() => confirmRestore(a)}
          >
            <RotateCcw size={16} />
          </button>
          <button
            className="text-red-700 hover:text-red-900"
            title="Eliminar definitivo"
            onClick={() => confirmDelete(a)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <Drawer open={open} onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4 pr-8">Actores archivados</h2>
      <DataTable data={rows} columns={columns} />
      {!loading && rows.length === 0 && (
        <p className="text-sm text-gray-400 mt-4">No hay actores archivados.</p>
      )}
      <BaseModal
        isOpen={modalOpen}
        isSaving={saving}
        onClose={() => setModalOpen(false)}
        title={cfg.title}
        message={cfg.message}
        primaryButtonText={cfg.primary}
        secondaryButtonText="Cancelar"
        onPrimaryAction={() => {
          void cfg.onConfirm();
          setModalOpen(false);
        }}
      />
    </Drawer>
  );
}
