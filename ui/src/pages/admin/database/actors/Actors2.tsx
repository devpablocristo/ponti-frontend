import { useCallback, useEffect, useState } from "react";
import { Archive, Plus } from "lucide-react";

import Search from "@/components/Input/Search";
import Button from "@/components/Button/Button";
import { toastError } from "@/lib/toast";
import { Actor, listActors } from "@/api/actors";
import ArchivedActorsDrawer from "./ArchivedActorsDrawer";
import ActorFormDrawer from "./ActorFormDrawer";

const taxOf = (a: Actor) => a.keys?.find((k) => k.type === "TAX_ID")?.value ?? "—";

// Administrador de actores: lista completa (nombre + CUIT) filtrable; alta/edición en un
// Drawer (con tipo y roles). Archivar inline; archivados en su propio Drawer.
export default function Actors2() {
  const [rows, setRows] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(false);
  const [nameF, setNameF] = useState("");
  const [taxF, setTaxF] = useState("");

  const [archivedOpen, setArchivedOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editActor, setEditActor] = useState<Actor | null>(null);
  const [prefill, setPrefill] = useState<{ name: string; taxId: string } | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listActors("active", 1, 1000);
      setRows(r.data ?? []);
    } catch {
      toastError("No se pudo cargar el listado de actores");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const n = nameF.trim().toLowerCase();
  const t = taxF.trim().toLowerCase();
  const filtered = rows.filter(
    (a) =>
      (n === "" || a.display_name.toLowerCase().includes(n)) &&
      (t === "" || taxOf(a).toLowerCase().includes(t)),
  );

  const openEdit = (a: Actor) => {
    setEditActor(a);
    setPrefill(undefined);
    setFormOpen(true);
  };

  const openNew = () => {
    setEditActor(null);
    setPrefill({ name: nameF.trim(), taxId: taxF.trim() });
    setFormOpen(true);
  };

  return (
    <div>
      <ArchivedActorsDrawer
        open={archivedOpen}
        onClose={() => setArchivedOpen(false)}
        onChanged={load}
      />
      <ActorFormDrawer
        open={formOpen}
        onClose={() => setFormOpen(false)}
        actor={editActor}
        prefill={prefill}
        onSaved={load}
      />

      {/* Fila: filtros nombre + CUIT + acciones */}
      <div className="flex items-end gap-2 mb-4">
        <div className="flex-1">
          <Search
            label="Nombre"
            name="actor2-name"
            placeholder="Filtrar / escribir nombre…"
            value={nameF}
            onChange={(e) => setNameF(e.target.value)}
            fullWidth
          />
        </div>
        <div className="flex-1">
          <Search
            label="CUIT / DNI"
            name="actor2-tax"
            placeholder="Filtrar / escribir CUIT…"
            value={taxF}
            onChange={(e) => setTaxF(e.target.value.replace(/\D/g, ""))}
            fullWidth
          />
        </div>
        <Button
          variant="primary"
          size="sm"
          iconLeft={<Archive className="h-4 w-4" />}
          onClick={() => setArchivedOpen(true)}
        >
          Archivados
        </Button>
        <Button variant="primary" size="sm" iconLeft={<Plus className="h-4 w-4" />} onClick={openNew}>
          Nuevo
        </Button>
      </div>

      {/* Lista completa */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-left">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">CUIT / DNI</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr
                key={a.id}
                onClick={() => openEdit(a)}
                className="border-t cursor-pointer hover:bg-gray-50"
              >
                <td className="px-3 py-2 font-medium">{a.display_name}</td>
                <td className="px-3 py-2 text-gray-500">{taxOf(a)}</td>
              </tr>
            ))}
            {filtered.length === 0 && !loading && (
              <tr>
                <td colSpan={2} className="px-3 py-6 text-center text-gray-400">
                  Sin actores
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
