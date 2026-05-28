import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { apiClient } from "@/api/client";
import type { SuccessResponse } from "@/api/types";
import Button from "../../../../components/Button/Button";
import { IconActionButton } from "../../../../components/Button/IconActionButton";
import { EntityFormDrawer } from "../../../../components/crud/EntityFormDrawer";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
import InputField from "../../../../components/Input/InputField";
import { SmartEntityInput } from "../../../../components/SmartEntityInput/SmartEntityInput";
import type { Actor } from "../../../../hooks/useActors";
import type { Crop } from "../../../../hooks/useCrops";
import type { Project } from "../../../../hooks/useDatabase/projects/types";
import { formatError } from "../../../../lib/format";
import { leaseTypeHasFixedValue, leaseTypeHasPercent } from "../../../../lib/leaseTypes";
import { notify } from "../../../../lib/notify";
import { formatProperName } from "../../../../lib/properName";
import { extractEntityOptions } from "../customers/helpers";
import type { EntityOption, FormOptionsPayload } from "../customers/types";

type ProjectField = Project["fields"][number];
type ProjectLot = ProjectField["lots"][number];
type ProjectInvestor = ProjectField["investors"][number];

type FieldFormDrawerProps = {
  open: boolean;
  title: string;
  projectId: number | null;
  fieldId?: number | null;
  project?: Project | null;
  actors: Actor[];
  crops: Crop[];
  seasons: Array<{ id: number; name: string }>;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

const defaultSeasons = [
  { id: 1, name: "Otoño" },
  { id: 2, name: "Invierno" },
  { id: 3, name: "Primavera" },
  { id: 4, name: "Verano" },
];

const emptyInvestor = (): ProjectInvestor => ({
  id: 0,
  actor_id: null,
  name: "",
  percentage: 0,
});

const emptyLot = (): ProjectLot => ({
  id: 0,
  name: "",
  hectares: 0,
  previous_crop_id: 0,
  previous_crop_name: "",
  current_crop_id: 0,
  current_crop_name: "",
  season: "",
});

const emptyField = (): ProjectField => ({
  id: -Date.now(),
  name: "",
  lease_type_id: 0,
  lease_type_name: "",
  lease_type_percent: "",
  lease_type_value: "",
  investors: [emptyInvestor()],
  lots: [],
});

function cloneField(field: ProjectField): ProjectField {
  return {
    ...field,
    investors: field.investors?.length ? field.investors.map((investor) => ({ ...investor })) : [emptyInvestor()],
    lots: field.lots?.map((lot) => ({ ...lot })) ?? [],
  };
}

function cleanDecimal(value: unknown) {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function cropOption(crop: Crop): EntityOption {
  return { id: crop.id, name: crop.name };
}

function actorOption(actor: Actor): EntityOption {
  return { id: actor.id, name: actor.display_name };
}

function fieldSubmitPayload(field: ProjectField): ProjectField {
  const leaseTypeId = Number(field.lease_type_id || 0);
  return {
    ...field,
    name: field.name.trim(),
    lease_type_id: leaseTypeId,
    lease_type_percent: leaseTypeHasPercent(leaseTypeId)
      ? cleanDecimal(field.lease_type_percent)
      : null,
    lease_type_value: leaseTypeHasFixedValue(leaseTypeId)
      ? cleanDecimal(field.lease_type_value)
      : null,
    investors: field.investors
      .filter((investor) => investor.name.trim())
      .map((investor) => ({
        ...investor,
        percentage: cleanDecimal(investor.percentage) ?? 0,
      })),
    lots: field.lots
      .filter((lot) => lot.name.trim())
      .map((lot) => ({
        ...lot,
        hectares: cleanDecimal(lot.hectares) ?? 0,
        previous_crop_id: Number(lot.previous_crop_id || 0),
        current_crop_id: Number(lot.current_crop_id || 0),
      })),
  };
}

export default function FieldFormDrawer({
  open,
  title,
  projectId,
  fieldId = null,
  project,
  actors,
  crops,
  seasons,
  onClose,
  onSaved,
}: FieldFormDrawerProps) {
  const [loadedProject, setLoadedProject] = useState<Project | null>(project ?? null);
  const [draft, setDraft] = useState<ProjectField>(emptyField);
  const [leaseTypeOptions, setLeaseTypeOptions] = useState<EntityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const tenantOptions = useMemo(
    () =>
      actors
        .filter((actor) => actor.roles?.includes("arrendatario"))
        .map(actorOption),
    [actors],
  );
  const cropOptions = useMemo(() => crops.map(cropOption), [crops]);
  const seasonOptions = seasons.length > 0 ? seasons : defaultSeasons;

  useEffect(() => {
    if (!open) return;
    setErrorMessage(null);
    setLoadedProject(project ?? null);
    const sourceField =
      fieldId && project ? project.fields.find((field) => field.id === fieldId) : null;
    setDraft(sourceField ? cloneField(sourceField) : emptyField());
  }, [fieldId, open, project]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [leaseTypesResult, projectResult] = await Promise.allSettled([
          apiClient.get<SuccessResponse<FormOptionsPayload>>("/form-options"),
          !project && projectId
            ? apiClient.get<SuccessResponse<Project>>(`/projects/${projectId}?fresh=1`)
            : Promise.resolve(null),
        ]);

        if (cancelled) return;
        if (leaseTypesResult.status === "fulfilled") {
          setLeaseTypeOptions(extractEntityOptions(leaseTypesResult.value.data?.rentTypes));
        }
        if (projectResult.status === "fulfilled" && projectResult.value) {
          const nextProject = projectResult.value.data;
          setLoadedProject(nextProject);
          const sourceField =
            fieldId ? nextProject.fields.find((field) => field.id === fieldId) : null;
          setDraft(sourceField ? cloneField(sourceField) : emptyField());
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(formatError(error, { fallback: "No se pudo cargar el campo." }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [fieldId, open, project, projectId]);

  const updateDraft = (patch: Partial<ProjectField>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const updateInvestor = (index: number, patch: Partial<ProjectInvestor>) => {
    setDraft((current) => ({
      ...current,
      investors: current.investors.map((investor, idx) =>
        idx === index ? { ...investor, ...patch } : investor,
      ),
    }));
  };

  const updateLot = (index: number, patch: Partial<ProjectLot>) => {
    setDraft((current) => ({
      ...current,
      lots: current.lots.map((lot, idx) => (idx === index ? { ...lot, ...patch } : lot)),
    }));
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    if (!projectId || !loadedProject) {
      setErrorMessage("Seleccioná un proyecto antes de guardar el campo.");
      return;
    }
    if (!draft.name.trim()) {
      setErrorMessage("El campo es obligatorio.");
      return;
    }
    if (!Number(draft.lease_type_id)) {
      setErrorMessage("El tipo de arriendo es obligatorio.");
      return;
    }

    const nextField = fieldSubmitPayload(draft);
    const fieldExists = Boolean(fieldId && loadedProject.fields.some((field) => field.id === fieldId));
    const nextProject: Project = {
      ...loadedProject,
      fields: fieldExists
        ? loadedProject.fields.map((field) => (field.id === fieldId ? nextField : field))
        : [...loadedProject.fields, nextField],
    };

    setSaving(true);
    try {
      await apiClient.put<SuccessResponse<Project>>(`/projects/${projectId}`, nextProject);
      notify.success(fieldExists ? "Campo actualizado." : "Campo creado.");
      await onSaved();
      onClose();
    } catch (error) {
      setErrorMessage(formatError(error, { fallback: "No se pudo guardar el campo." }));
    } finally {
      setSaving(false);
    }
  };

  const leaseTypeValue = leaseTypeOptions.find((option) => Number(option.id) === Number(draft.lease_type_id))?.name ?? draft.lease_type_name ?? "";
  const showPercent = leaseTypeHasPercent(Number(draft.lease_type_id));
  const showFixedValue = leaseTypeHasFixedValue(Number(draft.lease_type_id));

  return (
    <EntityFormDrawer
      open={open}
      onClose={onClose}
      title={title}
      processing={saving}
      errorMessage={errorMessage}
      onSubmit={handleSubmit}
      submitLabel={fieldId ? "Guardar" : "Crear"}
    >
      <LoadingOverlay show={loading} />
      <section className="drawer-section">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_1.2fr]">
          <InputField
            label="Campo"
            name="field_name"
            value={draft.name}
            onChange={(event) => updateDraft({ name: event.target.value })}
            size="sm"
          />
          <SmartEntityInput<EntityOption>
            label="Tipo de Arriendo"
            name="field_lease_type"
            value={leaseTypeValue}
            options={leaseTypeOptions}
            entityLabel="Tipo de Arriendo"
            onChange={() => undefined}
            onSelectExisting={(option) =>
              updateDraft({
                lease_type_id: Number(option.id),
                lease_type_name: option.name,
              })
            }
            lockName
            size="sm"
          />
          {showFixedValue ? (
            <InputField
              label="Valor (USD)"
              name="field_lease_value"
              type="number"
              value={draft.lease_type_value === null || draft.lease_type_value === undefined ? "" : String(draft.lease_type_value)}
              onChange={(event) => updateDraft({ lease_type_value: event.target.value })}
              size="sm"
            />
          ) : null}
          {showPercent ? (
            <InputField
              label="%"
              name="field_lease_percent"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={draft.lease_type_percent === null || draft.lease_type_percent === undefined ? "" : String(draft.lease_type_percent)}
              onChange={(event) => updateDraft({ lease_type_percent: event.target.value })}
              size="sm"
            />
          ) : null}
        </div>

        <div className="mt-3 space-y-2">
          {draft.investors.map((investor, index) => (
            <div key={`field-investor-${index}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(220px,320px)_96px_auto] sm:items-end">
              <SmartEntityInput<EntityOption>
                label={index === 0 ? "Arrendatario" : ""}
                name={`field_tenant_${index}`}
                value={investor.name}
                options={tenantOptions}
                entityLabel="Arrendatario"
                onChange={() => undefined}
                onSelectExisting={(option) =>
                  updateInvestor(index, {
                    id: 0,
                    actor_id: Number(option.id),
                    name: option.name,
                  })
                }
                selectionOnly
                size="sm"
              />
              <InputField
                label="%"
                name={`field_tenant_percent_${index}`}
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={String(investor.percentage ?? "")}
                onChange={(event) => updateInvestor(index, { percentage: Number(event.target.value || 0) })}
                size="xs"
              />
              <IconActionButton
                label="Quitar arrendatario"
                icon={<Trash2 className="h-4 w-4" />}
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    investors:
                      current.investors.length <= 1
                        ? [emptyInvestor()]
                        : current.investors.filter((_item, idx) => idx !== index),
                  }))
                }
              />
            </div>
          ))}
          <button
            type="button"
            className="text-xs font-semibold text-primary-700"
            onClick={() =>
              setDraft((current) => ({
                ...current,
                investors: [...current.investors, emptyInvestor()],
              }))
            }
          >
            Agregar
          </button>
        </div>
      </section>

      <section className="drawer-section">
        <div className="drawer-section-header">
          <h3 className="drawer-section-title">Lotes</h3>
          <Button
            variant="primary"
            size="xs"
            iconLeft={<Plus className="h-4 w-4" />}
            onClick={() =>
              setDraft((current) => ({
                ...current,
                lots: [...current.lots, emptyLot()],
              }))
            }
          >
            Agregar
          </Button>
        </div>
        {draft.lots.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500">
            Sin lotes cargados.
          </p>
        ) : (
          <div className="space-y-2">
            {draft.lots.map((lot, index) => (
              <div key={lot.id || index} className="grid grid-cols-1 gap-2 lg:grid-cols-[1fr_90px_1fr_1fr_120px_auto] lg:items-end">
                <InputField
                  label="Lote"
                  name={`field_lot_${index}`}
                  value={lot.name}
                  onChange={(event) => updateLot(index, { name: event.target.value })}
                  size="sm"
                />
                <InputField
                  label="Hectáreas"
                  name={`field_lot_hectares_${index}`}
                  type="number"
                  min={0}
                  step="0.001"
                  value={String(lot.hectares ?? "")}
                  onChange={(event) => updateLot(index, { hectares: Number(event.target.value || 0) })}
                  size="sm"
                />
                <SmartEntityInput<EntityOption>
                  label="Cultivo Anterior"
                  name={`field_lot_previous_crop_${index}`}
                  value={lot.previous_crop_name ?? ""}
                  options={cropOptions}
                  entityLabel="Cultivo"
                  onChange={() => undefined}
                  onSelectExisting={(option) =>
                    updateLot(index, {
                      previous_crop_id: Number(option.id),
                      previous_crop_name: option.name,
                    })
                  }
                  selectionOnly
                  size="sm"
                />
                <SmartEntityInput<EntityOption>
                  label="Cultivo Actual"
                  name={`field_lot_current_crop_${index}`}
                  value={lot.current_crop_name ?? ""}
                  options={cropOptions}
                  entityLabel="Cultivo"
                  onChange={() => undefined}
                  onSelectExisting={(option) =>
                    updateLot(index, {
                      current_crop_id: Number(option.id),
                      current_crop_name: option.name,
                    })
                  }
                  selectionOnly
                  size="sm"
                />
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Periodo
                  </label>
                  <select
                    className="input-base block px-3.5 py-2 text-sm"
                    value={lot.season}
                    onChange={(event) => updateLot(index, { season: event.target.value })}
                  >
                    <option value="">Seleccionar...</option>
                    {seasonOptions.map((season) => (
                      <option key={season.id} value={season.name}>
                        {formatProperName(season.name)}
                      </option>
                    ))}
                  </select>
                </div>
                <IconActionButton
                  label="Quitar lote"
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      lots: current.lots.filter((_item, idx) => idx !== index),
                    }))
                  }
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </EntityFormDrawer>
  );
}
