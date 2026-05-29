import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";

import { apiClient } from "@/api/client";
import type { SuccessResponse } from "@/api/types";
import Button from "../../../../components/Button/Button";
import { DrawerShell, DrawerSection } from "../../../../components/Drawer/DrawerShell";
import InputField from "../../../../components/Input/InputField";
import SmartEntityInput from "../../../../components/SmartEntityInput/SmartEntityInput";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
import type { Project } from "../../../../hooks/useDatabase/projects/types";
import type { Data as Field } from "../../../../hooks/useFields/types";
import { formatError } from "../../../../lib/format";
import { notify } from "../../../../lib/notify";
import { collapseInternalSpaces, formatEntityDisplayName } from "../../../../lib/properName";
import { normalizeProject } from "../customers/helpers";

type ProjectOption = {
  id: number;
  name: string;
};

export type FieldBasicDrawerProps = {
  open: boolean;
  mode: "create" | "edit";
  projectId?: number | null;
  fieldId?: number | null;
  project?: Project | null;
  field?: Field | null;
  projects?: ProjectOption[];
  onClose: () => void;
  onSaved?: () => Promise<void> | void;
};

function findProjectField(project: Project | null, fieldId?: number | null) {
  if (!project || !fieldId) return null;
  return project.fields.find((field) => field.id === fieldId) ?? null;
}

function defaultLeaseTypeId(project: Project | null, field: Field | null) {
  const fieldLeaseType = Number(field?.lease_type_id ?? 0);
  if (fieldLeaseType > 0) return fieldLeaseType;
  const projectLeaseType =
    project?.fields.find((item) => Number(item.lease_type_id) > 0)?.lease_type_id ?? 0;
  return Number(projectLeaseType) > 0 ? Number(projectLeaseType) : 1;
}

function renameFieldInProject(project: Project, fieldId: number, name: string) {
  let found = false;
  const fields = project.fields.map((field) => {
    if (field.id !== fieldId) return field;
    found = true;
    return { ...field, name };
  });
  return { project: { ...project, fields }, found };
}

export default function FieldBasicDrawer({
  open,
  mode,
  projectId,
  fieldId,
  project,
  field,
  projects = [],
  onClose,
  onSaved,
}: FieldBasicDrawerProps) {
  const [loadedProject, setLoadedProject] = useState<Project | null>(project ?? null);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(projectId ?? null);
  const [fieldName, setFieldName] = useState(field?.name ?? "");
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedProject = useMemo(
    () => projects.find((candidate) => candidate.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );
  const projectField = findProjectField(loadedProject, fieldId);
  const title = mode === "edit" ? "Editar Campo" : "Nuevo Campo";

  useEffect(() => {
    if (!open) return;
    setWarning(null);
    setLoadedProject(project ?? null);
    setSelectedProjectId(project?.customer.id ? (projectId ?? null) : (projectId ?? null));
    setFieldName(field?.name ?? projectField?.name ?? "");
  }, [field?.name, open, project, projectField?.name, projectId]);

  useEffect(() => {
    if (!open || !selectedProjectId || project) return;
    let cancelled = false;

    setLoading(true);
    void apiClient
      .get<SuccessResponse<Project>>(`/projects/${selectedProjectId}?fresh=1`)
      .then((response) => {
        if (cancelled) return;
        const normalized = normalizeProject(response.data);
        setLoadedProject(normalized);
        const sourceField = findProjectField(normalized, fieldId);
        if (sourceField) setFieldName(sourceField.name);
      })
      .catch((error) => {
        if (cancelled) return;
        const message = formatError(error, { fallback: "No se pudo cargar el proyecto." });
        setWarning(message);
        notify.error(message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fieldId, open, project, selectedProjectId]);

  const setWarningAndNotify = (message: string) => {
    setWarning(message);
    notify.error(message);
  };

  const handleSave = async () => {
    const name = collapseInternalSpaces(fieldName);
    setWarning(null);

    if (!name) {
      setWarningAndNotify("Campo: ingresá un nombre.");
      return;
    }

    setSaving(true);
    try {
      if (mode === "edit") {
        if (!fieldId || !selectedProjectId || !loadedProject) {
          setWarningAndNotify("No se encontró el campo completo para guardar.");
          return;
        }

        const next = renameFieldInProject(loadedProject, fieldId, name);
        if (!next.found) {
          setWarningAndNotify("No se encontró el campo dentro del proyecto.");
          return;
        }

        await apiClient.put<SuccessResponse<Project>>(
          `/projects/${selectedProjectId}`,
          next.project
        );
        notify.success("Campo actualizado.");
      } else {
        if (!selectedProjectId || !loadedProject) {
          setWarningAndNotify("Seleccioná un proyecto antes de crear el campo.");
          return;
        }
        const leaseTypeId = defaultLeaseTypeId(loadedProject, field ?? null);
        await apiClient.put<SuccessResponse<Project>>(`/projects/${selectedProjectId}`, {
          ...loadedProject,
          fields: [
            ...loadedProject.fields,
            {
              id: 0,
              name,
              lease_type_id: leaseTypeId,
              lease_type_name: "",
              lease_type_percent: null,
              lease_type_value: null,
              investors: [],
              lots: [],
            },
          ],
        });
        notify.success("Campo creado.");
      }

      await onSaved?.();
      onClose();
    } catch (error) {
      const message = formatError(error, { fallback: "No se pudo guardar el campo." });
      setWarning(message);
      notify.error(message);
    } finally {
      setSaving(false);
    }
  };

  const projectName =
    loadedProject?.name ??
    selectedProject?.name ??
    (selectedProjectId ? `Proyecto #${selectedProjectId}` : "");

  return (
    <DrawerShell
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            iconLeft={<Save className="h-4 w-4" />}
            onClick={handleSave}
            disabled={saving || loading}
          >
            Guardar
          </Button>
        </div>
      }
    >
      <div className="relative">
        <LoadingOverlay show={loading || saving} />

        <DrawerSection title="Campo">
          <div className="space-y-3">
            {warning ? (
              <div
                role="alert"
                className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
              >
                {warning}
              </div>
            ) : null}

            {mode === "edit" ? (
              <InputField
                label="Proyecto"
                name="field-project-context"
                value={formatEntityDisplayName(projectName)}
                onChange={() => undefined}
                disabled
                fullWidth
              />
            ) : (
              <SmartEntityInput<ProjectOption>
                label="Proyecto"
                name="field-basic-project"
                value={selectedProject?.name ?? projectName}
                options={projects}
                entityLabel="Proyecto"
                selectionOnly
                required
                placeholder="Seleccionar proyecto"
                onChange={() => undefined}
                onSelectExisting={(option) => setSelectedProjectId(option.id)}
              />
            )}

            <InputField
              label="Nombre del campo"
              name="field-basic-name"
              value={fieldName}
              onChange={(event) => setFieldName(event.target.value)}
              required
              fullWidth
            />
          </div>
        </DrawerSection>
      </div>
    </DrawerShell>
  );
}
