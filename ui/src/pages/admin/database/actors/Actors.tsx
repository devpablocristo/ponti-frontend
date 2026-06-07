import { useCallback, useEffect, useState } from "react";

import ActorCombobox from "@/components/Actors/ActorCombobox";
import Button from "@/components/Button/Button";
import InputField from "@/components/Input/InputField";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  Actor,
  ActorRole,
  archiveActor,
  deleteActor,
  listActors,
  restoreActor,
  updateActor,
} from "@/api/actors";

const ROLES: ActorRole[] = [
  "customer",
  "provider",
  "investor",
  "manager",
  "contractor",
  "biller",
  "lessee",
];

type StatusFilter = "active" | "archived" | "all";

// Registro de identidad (Pilar 3) — CRUDAR completo: crear (search-first, dedup por
// CUIT/nombre), listar, editar, archivar/restaurar y eliminar.
export default function Actors() {
  const [role, setRole] = useState<ActorRole>("customer");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [rows, setRows] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState<Actor | null>(null);
  const [editName, setEditName] = useState("");
  const [editParty, setEditParty] = useState("unknown");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listActors(status, 1, 100);
      setRows(res.data ?? []);
    } catch {
      toastError("No se pudo cargar el listado de actores");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (a: Actor) => {
    setEditing(a);
    setEditName(a.display_name);
    setEditParty(a.party_type || "unknown");
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (editName.trim() === "") {
      toastError("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    try {
      await updateActor(editing.id, { display_name: editName.trim(), party_type: editParty });
      toastSuccess("Actor actualizado");
      setEditing(null);
      await load();
    } catch {
      toastError("No se pudo actualizar");
    } finally {
      setSaving(false);
    }
  };

  const doArchive = async (a: Actor) => {
    try {
      await archiveActor(a.id);
      toastSuccess(`«${a.display_name}» archivado`);
      await load();
    } catch {
      toastError("No se pudo archivar");
    }
  };

  const doRestore = async (a: Actor) => {
    try {
      await restoreActor(a.id);
      toastSuccess(`«${a.display_name}» restaurado`);
      await load();
    } catch {
      toastError("No se pudo restaurar (¿otra identidad usa esa clave?)");
    }
  };

  const doDelete = async (a: Actor) => {
    if (!window.confirm(`¿Eliminar definitivamente «${a.display_name}»? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      await deleteActor(a.id);
      toastSuccess(`«${a.display_name}» eliminado`);
      await load();
    } catch {
      toastError("No se pudo eliminar");
    }
  };

  const taxId = (a: Actor) => a.keys?.find((k) => k.type === "TAX_ID")?.value ?? "—";

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-semibold mb-1">Actores (Identity Gate)</h1>
      <p className="text-sm text-gray-500 mb-5">
        Crear (search-first, deduplica por CUIT y nombre legal), listar, editar, archivar y
        eliminar. El mismo ente con varios roles es UNA identidad.
      </p>

      {/* Crear / buscar */}
      <div className="flex gap-3 items-end mb-5">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Rol (al crear)</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as ActorRole)}
            className="border rounded-lg px-3 py-2 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <ActorCombobox
            role={role}
            label="Crear o buscar actor"
            placeholder="Escribí un nombre…"
            selected={null}
            onSelect={() => void load()}
          />
        </div>
      </div>

      {/* Filtro de estado */}
      <div className="flex items-center gap-2 mb-3">
        {(["active", "archived", "all"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`text-sm rounded-full px-3 py-1 border ${
              status === s ? "bg-gray-800 text-white" : "bg-white text-gray-600"
            }`}
          >
            {s === "active" ? "Activos" : s === "archived" ? "Archivados" : "Todos"}
          </button>
        ))}
        <span className="text-xs text-gray-400 ml-2">
          {loading ? "cargando…" : `${rows.length} actores`}
        </span>
      </div>

      {/* Tabla */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">CUIT</th>
              <th className="px-3 py-2">Roles</th>
              <th className="px-3 py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="px-3 py-2 font-medium">{a.display_name}</td>
                <td className="px-3 py-2 text-gray-500">{a.party_type}</td>
                <td className="px-3 py-2 text-gray-500">{taxId(a)}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {(a.roles ?? []).map((r) => (
                      <span key={r} className="bg-gray-100 text-gray-700 rounded-full px-2 py-0.5 text-xs">
                        {r}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1 justify-end">
                    <Button variant="outlineGray" size="xs" onClick={() => openEdit(a)}>
                      Editar
                    </Button>
                    {a.archived_at ? (
                      <Button variant="outlineGreen" size="xs" onClick={() => doRestore(a)}>
                        Restaurar
                      </Button>
                    ) : (
                      <Button variant="warning" size="xs" onClick={() => doArchive(a)}>
                        Archivar
                      </Button>
                    )}
                    <Button variant="danger" size="xs" onClick={() => doDelete(a)}>
                      Eliminar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                  Sin actores
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal editar */}
      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-md space-y-3">
            <h2 className="text-lg font-medium">Editar actor</h2>
            <InputField
              label="Nombre"
              name="editName"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <div>
              <label className="block text-sm text-gray-600 mb-1">Tipo</label>
              <select
                value={editParty}
                onChange={(e) => setEditParty(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm w-full"
              >
                <option value="org">org</option>
                <option value="person">person</option>
                <option value="unknown">unknown</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="secondary" size="sm" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" onClick={saveEdit} disabled={saving}>
                {saving ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
