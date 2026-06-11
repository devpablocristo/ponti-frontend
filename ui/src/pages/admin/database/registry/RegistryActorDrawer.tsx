import { useEffect, useState } from "react";
import { User, X } from "lucide-react";

import Drawer from "@/components/Drawer/Drawer";
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
  "customer", "provider", "investor", "manager", "contractor", "biller", "lessee",
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

const PARTY_TYPES = [
  { value: "org",     label: "Empresa" },
  { value: "person",  label: "Persona" },
  { value: "unknown", label: "Sin definir" },
];

const taxOf    = (a: Actor) => a.keys?.find((k) => k.type === "TAX_ID")?.value ?? "";
const aliasesOf = (a: Actor) => (a.keys ?? []).filter((k) => k.type === "ALIAS").map((k) => k.value);

type Props = {
  open: boolean;
  onClose: () => void;
  actorId: number | null;
  prefillName?: string;
  onSaved: () => void;
};

export default function RegistryActorDrawer({ open, onClose, actorId, prefillName, onSaved }: Props) {
  const isEdit = actorId != null;
  const [actor, setActor]         = useState<Actor | null>(null);
  const [loading, setLoading]     = useState(false);
  const [name, setName]           = useState("");
  const [taxId, setTaxId]         = useState("");
  const [partyType, setPartyType] = useState("unknown");
  const [roles, setRoles]         = useState<Record<string, boolean>>({});
  const [aliases, setAliases]     = useState<string[]>([]);
  const [aliasInput, setAliasInput] = useState("");
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (!open) return;
    if (actorId == null) {
      setActor(null); setName(prefillName ?? ""); setTaxId(""); setPartyType("unknown");
      setRoles({}); setAliases([]); setAliasInput("");
      return;
    }
    setLoading(true);
    getActor(actorId)
      .then((a) => {
        setActor(a); setName(a.display_name); setTaxId(taxOf(a));
        setPartyType(a.party_type || "unknown");
        const rs: Record<string, boolean> = {};
        (a.roles ?? []).forEach((r) => (rs[r] = true));
        setRoles(rs); setAliases(aliasesOf(a)); setAliasInput("");
      })
      .catch(() => toastError("No se pudo cargar el actor"))
      .finally(() => setLoading(false));
  }, [open, actorId, prefillName]);

  const toggleRole = (r: ActorRole) => setRoles((p) => ({ ...p, [r]: !p[r] }));

  const addAlias = () => {
    const v = aliasInput.trim();
    if (!v) return;
    if (!aliases.some((a) => a.toLowerCase() === v.toLowerCase())) setAliases((p) => [...p, v]);
    setAliasInput("");
  };
  const removeAlias = (a: string) => setAliases((p) => p.filter((x) => x !== a));

  const save = async () => {
    if (!name.trim()) { toastError("El nombre es obligatorio"); return; }
    const checked = ROLES.filter((r) => roles[r]);
    setSaving(true);
    try {
      let id: number;
      if (actor) {
        const newTax = taxId.trim();
        if (newTax && newTax !== taxOf(actor).trim()) {
          try { await setActorTaxID(actor.id, newTax); }
          catch (e) {
            toastError(statusOf(e) === 409 ? "Ese CUIT/DNI ya lo usa otra identidad" : "No se pudo guardar el CUIT/DNI");
            return;
          }
        }
        try { await updateActor(actor.id, { display_name: name.trim(), party_type: partyType }); }
        catch (e) {
          toastError(statusOf(e) === 409 ? "Ese nombre ya lo usa otra identidad" : "No se pudo guardar el nombre");
          return;
        }
        if (checked.length > 0) await setActorRoles(actor.id, checked);
        id = actor.id;
        toastSuccess("Actor actualizado");
      } else {
        if (!taxId.trim()) { toastError("El CUIT / DNI es obligatorio"); return; }
        if (!checked.length) { toastError("Elegí al menos un rol"); return; }
        const r = await resolveActor({ name: name.trim(), tax_id: taxId.trim(), role: checked[0], reject_existing: true });
        await setActorRoles(r.actor.id, checked);
        id = r.actor.id;
        toastSuccess(`Creado «${r.actor.display_name}»`);
      }
      try { await setActorAliases(id, aliases); }
      catch (e) {
        toastError(statusOf(e) === 409 ? "Un alias ya lo usa otra identidad" : "No se pudieron guardar los alias");
        return;
      }
      onSaved(); onClose();
    } catch (e) {
      toastError(statusOf(e) === 409 ? "Ya existe un actor con ese nombre o CUIT" : "No se pudo guardar");
    } finally { setSaving(false); }
  };

  // doArchive / doRestore kept for internal use (no longer shown in drawer UI)
  const _doArchive = archiveActor;
  const _doRestore = restoreActor;
  void _doArchive; void _doRestore;

  return (
    <Drawer open={open} onClose={onClose}>
      {/* Header */}
      <div className="flex items-center gap-3 pb-5 border-b border-gray-100 pr-8">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
          <User size={18} className="text-primary-700" />
        </div>
        <div>
          <p className="text-xs font-medium text-primary-600 uppercase tracking-wide">Actor</p>
          <h2 className="text-lg font-semibold text-gray-900 leading-tight">
            {isEdit ? name || "Editar actor" : "Nuevo actor"}
          </h2>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 mt-6">Cargando…</p>
      ) : (
        <div className="pt-5 space-y-6">

          {/* Información básica */}
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
              Información básica
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Razón social o nombre completo"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CUIT / DNI{!isEdit && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <input
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value.replace(/\D/g, ""))}
                  placeholder="20123456786"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400"
                />
                {isEdit && (
                  <p className="text-xs text-gray-400 mt-1">
                    Corregir la clave no afecta lo ya cargado.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                <div className="flex gap-2">
                  {PARTY_TYPES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setPartyType(value)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                        partyType === value
                          ? "bg-primary-50 text-primary-700 border-primary-400"
                          : "text-gray-500 border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="border-t border-gray-100" />

          {/* Roles */}
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
              Roles{!isEdit && <span className="text-red-500 ml-0.5"> *</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => toggleRole(r)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                    roles[r]
                      ? "bg-primary-700 text-white border-primary-700 shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600"
                  }`}
                >
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </section>

          <div className="border-t border-gray-100" />

          {/* Alias */}
          <section>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
              Alias <span className="normal-case font-normal text-gray-400">(nombres alternativos)</span>
            </p>
            {aliases.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {aliases.map((a) => (
                  <span key={a} className="flex items-center gap-1 bg-gray-100 text-gray-700 rounded-full px-2.5 py-1 text-xs font-medium">
                    {a}
                    <button type="button" onClick={() => removeAlias(a)} className="text-gray-400 hover:text-gray-700 ml-0.5">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAlias(); } }}
                placeholder="Agregar alias y presionar Enter"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
              <button
                type="button"
                onClick={addAlias}
                className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Agregar
              </button>
            </div>
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
      )}
    </Drawer>
  );
}
