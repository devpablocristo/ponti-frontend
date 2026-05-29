import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";

import { apiClient } from "@/api/client";
import type { SuccessResponse } from "@/api/types";
import Button from "../../../../components/Button/Button";
import { DrawerShell, DrawerSection } from "../../../../components/Drawer/DrawerShell";
import InputField from "../../../../components/Input/InputField";
import SmartEntityInput from "../../../../components/SmartEntityInput/SmartEntityInput";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
import type { Campaign } from "../../../../hooks/useCampaigns";
import type { CustomerData } from "../../../../hooks/useCustomers/types";
import type { Project } from "../../../../hooks/useDatabase/projects/types";
import { formatError } from "../../../../lib/format";
import { notify } from "../../../../lib/notify";
import { collapseInternalSpaces, formatEntityDisplayName } from "../../../../lib/properName";
import { normalizeProject } from "../customers/helpers";

export type ProjectBasicDrawerProps = {
  open: boolean;
  mode: "create" | "edit";
  projectId?: number | null;
  customerId?: number | null;
  campaignId?: number | null;
  project?: Project | null;
  customers?: CustomerData[];
  campaigns?: Campaign[];
  onClose: () => void;
  onSaved?: () => Promise<void> | void;
};

function findById<T extends { id: number }>(items: T[], id?: number | null) {
  if (!id) return null;
  return items.find((item) => item.id === id) ?? null;
}

function readProjectName(project: Project | null | undefined, fallback = "") {
  return project?.name ?? fallback;
}

function buildMinimalProjectPayload(input: {
  name: string;
  customer: CustomerData;
  campaign: Campaign;
}): Project {
  return {
    name: input.name,
    customer: {
      id: input.customer.id,
      actor_id: input.customer.actor_id ?? null,
      name: input.customer.name,
    },
    campaign: {
      id: input.campaign.id,
      name: input.campaign.name,
    },
    managers: [],
    investors: [],
    admin_cost_investors: [],
    admin_cost: 0,
    planned_cost: 0,
    fields: [],
    updated_at: undefined,
  };
}

export default function ProjectBasicDrawer({
  open,
  mode,
  projectId,
  customerId,
  campaignId,
  project,
  customers = [],
  campaigns = [],
  onClose,
  onSaved,
}: ProjectBasicDrawerProps) {
  const [loadedProject, setLoadedProject] = useState<Project | null>(project ?? null);
  const [projectName, setProjectName] = useState(readProjectName(project));
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(customerId ?? null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(campaignId ?? null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);

  const selectedCustomer = useMemo(
    () => findById(customers, selectedCustomerId),
    [customers, selectedCustomerId]
  );
  const selectedCampaign = useMemo(
    () => findById(campaigns, selectedCampaignId),
    [campaigns, selectedCampaignId]
  );

  useEffect(() => {
    if (!open) return;

    setWarning(null);
    setLoadedProject(project ?? null);
    setProjectName(readProjectName(project));
    setSelectedCustomerId(project?.customer.id ?? customerId ?? null);
    setSelectedCampaignId(project?.campaign.id ?? campaignId ?? null);
  }, [campaignId, customerId, open, project]);

  useEffect(() => {
    if (!open || mode !== "edit" || !projectId || project) return;

    let cancelled = false;
    setLoading(true);
    void apiClient
      .get<SuccessResponse<Project>>(`/projects/${projectId}?fresh=1`)
      .then((response) => {
        if (cancelled) return;
        const normalized = normalizeProject(response.data);
        setLoadedProject(normalized);
        setProjectName(normalized.name);
        setSelectedCustomerId(normalized.customer.id ?? customerId ?? null);
        setSelectedCampaignId(normalized.campaign.id ?? campaignId ?? null);
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
  }, [campaignId, customerId, mode, open, project, projectId]);

  const setWarningAndNotify = (message: string) => {
    setWarning(message);
    notify.error(message);
  };

  const handleSave = async () => {
    const name = collapseInternalSpaces(projectName);
    setWarning(null);

    if (!name) {
      setWarningAndNotify("Proyecto: ingresá un nombre.");
      return;
    }

    setSaving(true);
    try {
      if (mode === "edit") {
        const currentProject = loadedProject ?? project;
        if (!projectId || !currentProject) {
          setWarningAndNotify("No se encontró el proyecto completo para guardar.");
          return;
        }

        await apiClient.put<SuccessResponse<Project>>(`/projects/${projectId}`, {
          ...currentProject,
          name,
        });
        notify.success("Proyecto actualizado.");
      } else {
        if (!selectedCustomer || !selectedCampaign) {
          setWarningAndNotify(
            "Seleccioná un cliente y una campaña existentes antes de crear el proyecto."
          );
          return;
        }

        await apiClient.post<SuccessResponse<Project>>(
          "/projects",
          buildMinimalProjectPayload({
            name,
            customer: selectedCustomer,
            campaign: selectedCampaign,
          })
        );
        notify.success("Proyecto creado.");
      }

      await onSaved?.();
      onClose();
    } catch (error) {
      const message = formatError(error, { fallback: "No se pudo guardar el proyecto." });
      setWarning(message);
      notify.error(message);
    } finally {
      setSaving(false);
    }
  };

  const currentProject = loadedProject ?? project;
  const editCustomerName =
    currentProject?.customer.name ??
    selectedCustomer?.name ??
    (customerId ? `Cliente #${customerId}` : "");
  const editCampaignName =
    currentProject?.campaign.name ??
    selectedCampaign?.name ??
    (campaignId ? `Campaña #${campaignId}` : "");
  const title = mode === "edit" ? "Editar Proyecto" : "Nuevo Proyecto";

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

        <DrawerSection title="Proyecto">
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
              <div className="grid gap-3 md:grid-cols-2">
                <InputField
                  label="Cliente / Sociedad"
                  name="project-customer-context"
                  value={formatEntityDisplayName(editCustomerName)}
                  onChange={() => undefined}
                  disabled
                  fullWidth
                />
                <InputField
                  label="Campaña"
                  name="project-campaign-context"
                  value={editCampaignName}
                  onChange={() => undefined}
                  disabled
                  fullWidth
                />
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <SmartEntityInput<CustomerData>
                  label="Cliente / Sociedad"
                  name="project-basic-customer"
                  value={selectedCustomer?.name ?? ""}
                  options={customers}
                  entityLabel="cliente"
                  selectionOnly
                  required
                  placeholder="Seleccionar cliente"
                  onChange={() => undefined}
                  onSelectExisting={(option) => setSelectedCustomerId(option.id)}
                />
                <SmartEntityInput<Campaign>
                  label="Campaña"
                  name="project-basic-campaign"
                  value={selectedCampaign?.name ?? ""}
                  options={campaigns}
                  entityLabel="campaña"
                  selectionOnly
                  required
                  placeholder="Seleccionar campaña"
                  onChange={() => undefined}
                  onSelectExisting={(option) => setSelectedCampaignId(option.id)}
                  formatDisplayValue={false}
                />
              </div>
            )}

            <InputField
              label="Nombre del proyecto"
              name="project-basic-name"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              required
              fullWidth
            />
          </div>
        </DrawerSection>
      </div>
    </DrawerShell>
  );
}
