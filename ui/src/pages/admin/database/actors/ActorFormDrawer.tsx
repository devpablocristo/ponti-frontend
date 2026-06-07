import { useEffect, useState } from "react";

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

// statusOf intenta sacar el HTTP status del error sin importar la forma (axios / cuerpo BFF).
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

type Props = {
  open: boolean;
  onClose: () => void;
  actor: Actor | null; // edición
  prefill?: { name: string; taxId: string }; // alta
  onSaved: () => void;
};

// Drawer de alta/edición de actor: nombre, CUIT/DNI, tipo y roles. En edición el CUIT también
// es editable (re-key vía setActorTaxID): no re-crea el actor, así lo ya cargado sigue colgado;
// si otra identidad activa ya tiene ese CUIT devuelve 409.
export default function ActorFormDrawer({ open, onClose, actor, prefill, onSaved }: Props) {
  const isEdit = !!actor;
  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [partyType, setPartyType] = useState("unknown");
  const [roles, setRoles] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (actor) {
      setName(actor.display_name);
      setTaxId(taxOf(actor));
      setPartyType(actor.party_type || "unknown");
      const rs: Record<string, boolean> = {};
      (actor.roles ?? []).forEach((r) => (rs[r] = true));
      setRoles(rs);
    } else {
      setName(prefill?.name ?? "");
      setTaxId(prefill?.taxId ?? "");
      setPartyType("unknown");
      setRoles({});
    }
  }, [open, actor, prefill]);

  const toggleRole = (r: ActorRole) => setRoles((prev) => ({ ...prev, [r]: !prev[r] }));

  const save = async () => {
    if (name.trim() === "") {
      toastError("El nombre es obligatorio");
      return;
    }
    const checked = ROLES.filter((r) => roles[r]);
    setSaving(true);
    try {
      if (actor) {
        // El CUIT/DNI primero (puede dar 409 si otra identidad ya lo usa), solo si cambió, así
        // no dejamos el nombre/roles a medias.
        const newTax = taxId.trim();
        if (newTax !== "" && newTax !== taxOf(actor).trim()) {
          try {
            await setActorTaxID(actor.id, newTax);
          } catch (e) {
            toastError(
              statusOf(e) === 409
                ? "Ese CUIT/DNI ya lo usa otra identidad"
                : "No se pudo guardar el CUIT/DNI",
            );
            return;
          }
        }
        // Nombre + tipo (puede dar 409 si el nombre lo usa otra identidad).
        try {
          await updateActor(actor.id, { display_name: name.trim(), party_type: partyType });
        } catch (e) {
          toastError(
            statusOf(e) === 409
              ? "Ese nombre ya lo usa otra identidad"
              : "No se pudo guardar el nombre",
          );
          return;
        }
        if (checked.length > 0) await setActorRoles(actor.id, checked);
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
        // Alta estricta: si ya existe (nombre o CUIT) el backend devuelve 409 (no reusa).
        const r = await resolveActor({
          name: name.trim(),
          tax_id: taxId.trim() || undefined,
          role: checked[0],
          reject_existing: true,
        });
        await setActorRoles(r.actor.id, checked);
        toastSuccess(`Creado «${r.actor.display_name}»`);
      }
      onSaved();
      onClose();
    } catch (e) {
      // Llega acá el 409 del alta estricta (los 409 de edición se manejan inline arriba).
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
        {isEdit ? `Editar: ${actor?.display_name}` : "Nuevo actor"}
      </h2>

      <div className="space-y-4">
        <InputField label="Nombre" name="fd-name" value={name} onChange={(e) => setName(e.target.value)} />

        <div>
          <InputField
            label={isEdit ? "CUIT / DNI" : "CUIT / DNI *"}
            name="fd-tax"
            value={taxId}
            onChange={(e) => setTaxId(e.target.value.replace(/\D/g, ""))}
            placeholder="20123456786"
          />
          {isEdit && (
            <p className="text-xs text-gray-400 mt-1">
              Corregir la clave no afecta lo ya cargado (clientes, trabajos): siguen colgados de
              este actor.
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
    </Drawer>
  );
}
