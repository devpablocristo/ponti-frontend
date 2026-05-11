import { useEffect, useMemo, useState } from "react";

import EntityFormDrawer from "../../../../components/crud/EntityFormDrawer";
import InputField from "../../../../components/Input/InputField";
import { Checkbox } from "../../../../components/Input/Checkbox";
import {
  Actor,
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

const splitList = (value: string) =>
  value
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const selectedIdentifier = (actor: Actor | null) =>
  actor?.identifiers?.find((identifier) => identifier.is_primary) ??
  actor?.identifiers?.[0] ??
  null;

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
  const [aliasesText, setAliasesText] = useState("");
  const [identifierCountry, setIdentifierCountry] = useState("AR");
  const [identifierType, setIdentifierType] = useState("");
  const [identifierValue, setIdentifierValue] = useState("");
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
    const identifier = selectedIdentifier(actor);
    setActorKind(actor?.actor_kind ?? "unknown");
    setDisplayName(actor?.display_name ?? "");
    setPrimaryEmail(actor?.primary_email ?? "");
    setPrimaryPhone(actor?.primary_phone ?? "");
    setNotes(actor?.notes ?? "");
    setRoles(actor?.roles ?? []);
    setAliasesText((actor?.aliases ?? []).map((item) => item.alias).join(", "));
    setIdentifierCountry(identifier?.country ?? "AR");
    setIdentifierType(identifier?.identifier_type ?? "");
    setIdentifierValue(identifier?.identifier_value ?? "");
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

  const existingAliasSet = useMemo(
    () =>
      new Set(
        (actor?.aliases ?? []).map((item) =>
          item.alias.trim().toLocaleLowerCase(),
        ),
      ),
    [actor],
  );

  const toggleRole = (role: ActorRole) => {
    setRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role],
    );
  };

  const handleSubmit = async () => {
    setValidation(null);
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setValidation("El nombre visible es obligatorio.");
      return;
    }

    const aliases = splitList(aliasesText)
      .filter((alias) => !isEdit || !existingAliasSet.has(alias.toLocaleLowerCase()))
      .map((alias) => ({ alias, source: isEdit ? "ui_edit" : "ui_create" }));

    const identifiers =
      !isEdit && identifierType.trim() && identifierValue.trim()
        ? [
            {
              country: identifierCountry.trim() || "AR",
              identifier_type: identifierType.trim(),
              identifier_value: identifierValue.trim(),
              is_primary: true,
            },
          ]
        : [];

    const input: ActorPayloadInput = {
      actor_kind: actorKind,
      display_name: trimmedName,
      primary_email: primaryEmail.trim() || null,
      primary_phone: primaryPhone.trim() || null,
      notes: notes.trim() || null,
      roles,
      aliases,
      identifiers,
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
      maxWidth="max-w-2xl"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Tipo de actor
          </label>
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

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">Roles</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ACTOR_ROLE_OPTIONS.map((role) => (
            <label
              key={role.value}
              className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
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
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Persona</h3>
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
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">
            Empresa / Sociedad
          </h3>
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

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">
          Identificador principal
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <InputField
            label="País"
            name="identifier_country"
            value={identifierCountry}
            disabled={isEdit}
            onChange={(event) => setIdentifierCountry(event.target.value)}
            size="sm"
          />
          <InputField
            label="Tipo"
            name="identifier_type"
            value={identifierType}
            disabled={isEdit}
            placeholder="CUIT, DNI, RUT"
            onChange={(event) => setIdentifierType(event.target.value)}
            size="sm"
          />
          <InputField
            label="Valor"
            name="identifier_value"
            value={identifierValue}
            disabled={isEdit}
            onChange={(event) => setIdentifierValue(event.target.value)}
            size="sm"
          />
        </div>
      </section>

      <InputField
        label="Aliases"
        name="aliases"
        value={aliasesText}
        onChange={(event) => setAliasesText(event.target.value)}
        size="sm"
      />
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
