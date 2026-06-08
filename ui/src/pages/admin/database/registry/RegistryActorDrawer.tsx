import { useEffect, useState } from "react";
import { X } from "lucide-react";

import Drawer from "@/components/Drawer/Drawer";
import Button from "@/components/Button/Button";
import InputField from "@/components/Input/InputField";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  Actor,
  ActorRole,
  archiveActor,
  resolveActor,
  restoreActor,
  setActorRoles,
  setActorTaxID,
  updateActor,
} from "@/api/actors";
import { getActor, setActorAliases } from "@/api/registry";

const statusOf = (e: unknown): number | undefined => {
  const x = e as { response?: { status?: number }; error?: { status?: number }; status?: number };
  return x?.response?.status ?? x?.error?.status ?? x?.status;
};

const ROLES: ActorRole[] = [
  "customer",
  "provider",
  "investor",
  "manager",
  "contractor",
  "biller",
  "lessee",
];

const ROLE_LABELS: Record<ActorRole, string> = {
  customer: "Cliente",
  provider: "Proveedor",
  investor: "Inversor",
  manager: "Responsable",
  contractor: "Contratista",
  biller: "Facturador",
  lessee: "Arrendatario",
};

const taxOf = (a: Actor) => a.keys?.find((k) => k.type === "TAX_ID")?.value ?? "";
const aliasesOf = (a: Actor) => (a.keys ?? []).filter((k) => k.type === "ALIAS").map((k) => k.value);

type Props = {
  open: boolean;
  onClose: () => void;
  actorId: number | null; // edición
  prefillName?: string; // alta
  onSaved: () => void;
};

// Drawer NUEVO de actor para la pantalla unificada (registry): nombre, CUIT/DNI, tipo, roles y
// alias. Reusa los APIs existentes de actores + setActorAliases. No modifica nada existente.
export default function RegistryActorDrawer({ open, onClose, actorId, prefillName, onSaved }: Props) {
  const isEdit = actorId != null;
  const [actor, setActor] = useState<Actor | null>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [partyType, setPartyType] = useState("unknown");
  const [roles, setRoles] = useState<Record<string, boolean>>({});
  const [aliases, setAliases] = useState<string[]>([]);
  const [aliasInput, setAliasInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (actorId == null) {
      setActor(null);
      setName(prefillName ?? "");
      setTaxId("");
      setPartyType("unknown");
      setRoles({});
      setAliases([]);
      setAliasInput("");
      return;
    }
    setLoading(true);
    getActor(actorId)
      .then((a) => {
        setActor(a);
        setName(a.display_name);
        setTaxId(taxOf(a));
        setPartyType(a.party_type || "unknown");
        const rs: Record<string, boolean> = {};
        (a.roles ?? []).forEach((r) => (rs[r] = true));
        setRoles(rs);
        setAliases(aliasesOf(a));
        setAliasInput("");
      })
      .catch(() => toastError("No se pudo cargar el actor"))
      .finally(() => setLoading(false));
  }, [open, actorId, prefillName]);

  const toggleRole = (r: ActorRole) => setRoles((prev) => ({ ...prev, [r]: !prev[r] }));

  const addAlias = () => {
    const v = aliasInput.trim();
    if (v === "") return;
    if (!aliases.some((a) => a.toLowerCase() === v.toLowerCase())) setAliases((p) => [...p, v]);
    setAliasInput("");
  };
  const removeAlias = (a: string) => setAliases((p) => p.filter((x) => x !== a));

  const save = async () => {
    if (name.trim() === "") {
      toastError("El nombre es obligatorio");
      return;
    }
    const checked = ROLES.filter((r) => roles[r]);
    setSaving(true);
    try {
      let id: number;
      if (actor) {
        const newTax = taxId.trim();
        if (newTax !== "" && newTax !== taxOf(actor).trim()) {
          try {
            await setActorTaxID(actor.id, newTax);
          } catch (e) {
            toastError(
              statusOf(e) === 409 ? "Ese CUIT/DNI ya lo usa otra identidad" : "No se pudo guardar el CUIT/DNI",
            );
            return;
          }
        }
        try {
          await updateActor(actor.id, { display_name: name.trim(), party_type: partyType });
        } catch (e) {
          toastError(
            statusOf(e) === 409 ? "Ese nombre ya lo usa otra identidad" : "No se pudo guardar el nombre",
          );
          return;
        }
        if (checked.length > 0) await setActorRoles(actor.id, checked);
        id = actor.id;
        toastSuccess("Actor actualizado");
      } else {
        if (taxId.trim() === "") {
          toastError("El CUIT / DNI es obligatorio para crear un actor");
          return;
        }
        if (checked.length === 0) {
          toastError("Elegí al menos un rol");
          return;
        }
        const r = await resolveActor({
          name: name.trim(),
          tax_id: taxId.trim() || undefined,
          role: checked[0],
          reject_existing: true,
        });
        await setActorRoles(r.actor.id, checked);
        id = r.actor.id;
        toastSuccess(`Creado «${r.actor.display_name}»`);
      }
      // Alias (puede dar 409 si un alias ya lo usa otra identidad).
      try {
        await setActorAliases(id, aliases);
      } catch (e) {
        toastError(statusOf(e) === 409 ? "Un alias ya lo usa otra identidad" : "No se pudieron guardar los alias");
        return;
      }
      onSaved();
      onClose();
    } catch (e) {
      toastError(
        statusOf(e) === 409
          ? "Ya existe un actor con ese nombre o CUIT — editalo en la lista"
          : "No se pudo guardar",
      );
    } finally {
      setSaving(false);
    }
  };

  const doArchive = async () => {
    if (!actor) return;
    try {
      await archiveActor(actor.id);
      toastSuccess("Archivado");
      onSaved();
      onClose();
    } catch {
      toastError("No se pudo archivar");
    }
  };

  const doRestore = async () => {
    if (!actor) return;
    try {
      await restoreActor(actor.id);
      toastSuccess("Restaurado");
      onSaved();
      onClose();
    } catch {
      toastError("No se pudo restaurar (¿otra identidad usa esa clave?)");
    }
  };

  return (
    <Drawer open={open} onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4 pr-8">
        {isEdit ? `Editar actor: ${name}` : "Nuevo actor"}
      </h2>

      {loading ? (
        <p className="text-sm text-gray-400">Cargando…</p>
      ) : (
        <div className="space-y-4">
          <InputField label="Nombre" name="ra-name" value={name} onChange={(e) => setName(e.target.value)} />

          <div>
            <InputField
              label={isEdit ? "CUIT / DNI" : "CUIT / DNI *"}
              name="ra-tax"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value.replace(/\D/g, ""))}
              placeholder="20123456786"
            />
            {isEdit && (
              <p className="text-xs text-gray-400 mt-1">
                Corregir la clave no afecta lo ya cargado: sigue colgado de este actor.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Tipo</label>
            <select
              value={partyType}
              onChange={(e) => setPartyType(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm w-full"
            >
              <option value="org">Empresa</option>
              <option value="person">Persona</option>
              <option value="unknown">Sin definir</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Roles</label>
            <div className="flex flex-wrap gap-3">
              {ROLES.map((r) => (
                <label key={r} className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={!!roles[r]} onChange={() => toggleRole(r)} />
                  {ROLE_LABELS[r]}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Alias (nombres alternativos)</label>
            {aliases.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {aliases.map((a) => (
                  <span
                    key={a}
                    className="bg-gray-100 text-gray-700 rounded-full px-2 py-0.5 text-xs flex items-center gap-1"
                  >
                    {a}
                    <button type="button" onClick={() => removeAlias(a)} className="text-gray-500 hover:text-gray-800">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addAlias();
                  }
                }}
                placeholder="Agregar alias y Enter"
                className="border rounded-lg px-3 py-2 text-sm flex-1"
              />
              <Button variant="secondary" size="sm" onClick={addAlias}>
                Agregar
              </Button>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2">
            <div>
              {isEdit &&
                (actor?.archived_at ? (
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
      )}
    </Drawer>
  );
}
