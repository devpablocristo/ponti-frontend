import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import Button from "../../../../components/Button/Button";
import { IconActionButton } from "../../../../components/Button/IconActionButton";
import { EntityFormDrawer } from "../../../../components/crud/EntityFormDrawer";
import InputField from "../../../../components/Input/InputField";
import { Checkbox } from "../../../../components/Input/Checkbox";
import {
  Actor,
  ActorAlias,
  ActorIdentifier,
  ActorKind,
  ActorPayloadInput,
  ActorRole,
} from "../../../../hooks/useActors";
import { ACTOR_KIND_OPTIONS, ACTOR_ROLE_OPTIONS } from "./constants";

type ActorFormDrawerProps = {
  open: boolean;
  actor: Actor | null;
  processing?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (input: ActorPayloadInput) => void | Promise<void>;
};

const textOrEmpty = (value: unknown) => String(value ?? "");

const emptyIdentifier = (): ActorIdentifier => ({
  country: "AR",
  identifier_type: "",
  identifier_value: "",
  is_primary: false,
});

export default function ActorFormDrawer({
  open,
  actor,
  processing = false,
  errorMessage,
  onClose,
  onSubmit,
}: ActorFormDrawerProps) {
  const isEdit = actor !== null;
  const [actorKind, setActorKind] = useState<ActorKind>("unknown");
  const [displayName, setDisplayName] = useState("");
  const [primaryEmail, setPrimaryEmail] = useState("");
  const [primaryPhone, setPrimaryPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [roles, setRoles] = useState<ActorRole[]>([]);
  const [aliases, setAliases] = useState<ActorAlias[]>([]);
  const [identifiers, setIdentifiers] = useState<ActorIdentifier[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [legalEntityType, setLegalEntityType] = useState("");
  const [taxCondition, setTaxCondition] = useState("");
  const [fiscalAddress, setFiscalAddress] = useState("");
  const [validation, setValidation] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setActorKind(actor?.actor_kind ?? "unknown");
    setDisplayName(actor?.display_name ?? "");
    setPrimaryEmail(actor?.primary_email ?? "");
    setPrimaryPhone(actor?.primary_phone ?? "");
    setNotes(actor?.notes ?? "");
    setRoles(actor?.roles ?? []);
    setAliases((actor?.aliases ?? []).map((item) => ({ ...item })));
    setIdentifiers((actor?.identifiers ?? []).map((item) => ({ ...item })));
    setFirstName(actor?.person_profile?.first_name ?? "");
    setLastName(actor?.person_profile?.last_name ?? "");
    setDocumentType(actor?.person_profile?.document_type ?? "");
    setDocumentNumber(actor?.person_profile?.document_number ?? "");
    setLegalName(actor?.organization_profile?.legal_name ?? "");
    setTradeName(actor?.organization_profile?.trade_name ?? "");
    setLegalEntityType(actor?.organization_profile?.legal_entity_type ?? "");
    setTaxCondition(actor?.organization_profile?.tax_condition ?? "");
    setFiscalAddress(actor?.organization_profile?.fiscal_address ?? "");
    setValidation(null);
  }, [actor, open]);

  const toggleRole = (role: ActorRole) => {
    setRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role]
    );
  };

  const updateAlias = (index: number, value: string) => {
    setAliases((current) =>
      current.map((alias, currentIndex) =>
        currentIndex === index ? { ...alias, alias: value } : alias
      )
    );
  };

  const updateIdentifier = (
    index: number,
    field: keyof ActorIdentifier,
    value: string | boolean
  ) => {
    setIdentifiers((current) =>
      current.map((identifier, currentIndex) =>
        currentIndex === index ? { ...identifier, [field]: value } : identifier
      )
    );
  };

  const markPrimaryIdentifier = (index: number) => {
    setIdentifiers((current) =>
      current.map((identifier, currentIndex) => ({
        ...identifier,
        is_primary: currentIndex === index,
      }))
    );
  };

  const handleSubmit = async () => {
    setValidation(null);
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setValidation("El nombre visible es obligatorio.");
      return;
    }

    const cleanAliases = aliases
      .map((alias) => ({
        alias: alias.alias.trim(),
        source: alias.source ?? (isEdit ? "ui_edit" : "ui_create"),
      }))
      .filter((alias) => alias.alias);

    const cleanIdentifiers = identifiers
      .map((identifier) => ({
        country: identifier.country.trim() || "AR",
        identifier_type: identifier.identifier_type.trim(),
        identifier_value: identifier.identifier_value.trim(),
        is_primary: Boolean(identifier.is_primary),
      }))
      .filter((identifier) => identifier.identifier_type && identifier.identifier_value);

    if (cleanIdentifiers.length > 0 && !cleanIdentifiers.some((item) => item.is_primary)) {
      cleanIdentifiers[0].is_primary = true;
    }

    const input: ActorPayloadInput = {
      actor_kind: actorKind,
      display_name: trimmedName,
      primary_email: primaryEmail.trim() || null,
      primary_phone: primaryPhone.trim() || null,
      notes: notes.trim() || null,
      roles,
      aliases: cleanAliases,
      identifiers: cleanIdentifiers,
      person_profile:
        actorKind === "natural_person"
          ? {
              first_name: firstName.trim() || null,
              last_name: lastName.trim() || null,
              document_type: documentType.trim() || null,
              document_number: documentNumber.trim() || null,
            }
          : null,
      organization_profile:
        actorKind === "organization"
          ? {
              legal_name: legalName.trim() || null,
              trade_name: tradeName.trim() || null,
              legal_entity_type: legalEntityType.trim() || null,
              tax_condition: taxCondition.trim() || null,
              fiscal_address: fiscalAddress.trim() || null,
            }
          : null,
    };

    await onSubmit(input);
  };

  return (
    <EntityFormDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar actor" : "Nuevo actor"}
      subtitle={isEdit ? actor?.display_name : undefined}
      processing={processing}
      errorMessage={validation ?? errorMessage ?? null}
      onSubmit={handleSubmit}
      submitLabel={isEdit ? "Guardar cambios" : "Crear actor"}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">Tipo de actor</label>
          <select
            className="input-base block w-full px-3.5 py-2 text-sm"
            value={actorKind}
            onChange={(event) => setActorKind(event.target.value as ActorKind)}
          >
            {ACTOR_KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <InputField
          label="Nombre visible"
          name="display_name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          size="sm"
        />
        <InputField
          label="Email"
          name="primary_email"
          value={primaryEmail}
          onChange={(event) => setPrimaryEmail(event.target.value)}
          size="sm"
        />
        <InputField
          label="Teléfono"
          name="primary_phone"
          value={primaryPhone}
          onChange={(event) => setPrimaryPhone(event.target.value)}
          size="sm"
        />
      </div>

      <section className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">Roles</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ACTOR_ROLE_OPTIONS.map((role) => (
            <label
              key={role.value}
              className="flex items-center gap-2 rounded-md border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
            >
              <Checkbox
                tone="form"
                checked={roles.includes(role.value)}
                onChange={() => toggleRole(role.value)}
              />
              <span>{role.label}</span>
            </label>
          ))}
        </div>
      </section>

      {actorKind === "natural_person" && (
        <section className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">Persona</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField
              label="Nombre"
              name="first_name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              size="sm"
            />
            <InputField
              label="Apellido"
              name="last_name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              size="sm"
            />
            <InputField
              label="Tipo documento"
              name="document_type"
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value)}
              size="sm"
            />
            <InputField
              label="Documento"
              name="document_number"
              value={documentNumber}
              onChange={(event) => setDocumentNumber(event.target.value)}
              size="sm"
            />
          </div>
        </section>
      )}

      {actorKind === "organization" && (
        <section className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-200">Empresa / Sociedad</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InputField
              label="Razón social"
              name="legal_name"
              value={legalName}
              onChange={(event) => setLegalName(event.target.value)}
              size="sm"
            />
            <InputField
              label="Nombre comercial"
              name="trade_name"
              value={tradeName}
              onChange={(event) => setTradeName(event.target.value)}
              size="sm"
            />
            <InputField
              label="Tipo societario"
              name="legal_entity_type"
              value={legalEntityType}
              onChange={(event) => setLegalEntityType(event.target.value)}
              size="sm"
            />
            <InputField
              label="Condición fiscal"
              name="tax_condition"
              value={taxCondition}
              onChange={(event) => setTaxCondition(event.target.value)}
              size="sm"
            />
            <InputField
              label="Domicilio fiscal"
              name="fiscal_address"
              value={fiscalAddress}
              onChange={(event) => setFiscalAddress(event.target.value)}
              size="sm"
              className="sm:col-span-2"
            />
          </div>
        </section>
      )}

      <section className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Identificadores</h3>
          <Button
            variant="light"
            size="xs"
            iconLeft={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setIdentifiers((current) => [...current, emptyIdentifier()])}
          >
            Agregar
          </Button>
        </div>
        <div className="space-y-3">
          {identifiers.length === 0 && (
            <div className="rounded-md border border-dashed border-slate-300 dark:border-slate-600 px-3 py-3 text-sm text-slate-500 dark:text-slate-400">
              Sin identificadores
            </div>
          )}
          {identifiers.map((identifier, index) => (
            <div
              key={identifier.id ?? index}
              className="grid grid-cols-1 gap-3 rounded-md border border-slate-100 bg-slate-50 dark:bg-slate-900 p-3 sm:grid-cols-[0.7fr_1fr_1.4fr_auto_auto]"
            >
              <InputField
                label="País"
                name={`identifier_country_${index}`}
                value={identifier.country}
                onChange={(event) => updateIdentifier(index, "country", event.target.value)}
                size="sm"
              />
              <InputField
                label="Tipo"
                name={`identifier_type_${index}`}
                value={identifier.identifier_type}
                placeholder="CUIT, DNI, RUT"
                onChange={(event) => updateIdentifier(index, "identifier_type", event.target.value)}
                size="sm"
              />
              <InputField
                label="Valor"
                name={`identifier_value_${index}`}
                value={identifier.identifier_value}
                onChange={(event) =>
                  updateIdentifier(index, "identifier_value", event.target.value)
                }
                size="sm"
              />
              <label className="flex items-end gap-2 pb-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                <Checkbox
                  tone="form"
                  checked={Boolean(identifier.is_primary)}
                  onChange={() => markPrimaryIdentifier(index)}
                />
                Principal
              </label>
              <IconActionButton
                label="Quitar identificador"
                icon={<Trash2 className="h-4 w-4" />}
                tone="danger"
                className="mb-1 self-end"
                onClick={() =>
                  setIdentifiers((current) =>
                    current.filter((_item, currentIndex) => currentIndex !== index)
                  )
                }
                title="Quitar identificador"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Aliases</h3>
          <Button
            variant="light"
            size="xs"
            iconLeft={<Plus className="h-3.5 w-3.5" />}
            onClick={() =>
              setAliases((current) => [
                ...current,
                { alias: "", source: isEdit ? "ui_edit" : "ui_create" },
              ])
            }
          >
            Agregar
          </Button>
        </div>
        <div className="space-y-3">
          {aliases.length === 0 && (
            <div className="rounded-md border border-dashed border-slate-300 dark:border-slate-600 px-3 py-3 text-sm text-slate-500 dark:text-slate-400">
              Sin aliases
            </div>
          )}
          {aliases.map((alias, index) => (
            <div
              key={alias.id ?? index}
              className="grid grid-cols-[1fr_auto] gap-3 rounded-md border border-slate-100 bg-slate-50 dark:bg-slate-900 p-3"
            >
              <InputField
                label="Alias"
                name={`alias_${index}`}
                value={alias.alias}
                onChange={(event) => updateAlias(index, event.target.value)}
                size="sm"
              />
              <IconActionButton
                label="Quitar alias"
                icon={<Trash2 className="h-4 w-4" />}
                tone="danger"
                className="mb-1 self-end"
                onClick={() =>
                  setAliases((current) =>
                    current.filter((_item, currentIndex) => currentIndex !== index)
                  )
                }
                title="Quitar alias"
              />
            </div>
          ))}
        </div>
      </section>

      <InputField
        label="Notas"
        name="notes"
        value={textOrEmpty(notes)}
        onChange={(event) => setNotes(event.target.value)}
        size="sm"
      />
    </EntityFormDrawer>
  );
}
