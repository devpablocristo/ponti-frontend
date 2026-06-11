import type { PontiWorkspaceContext } from "@/types/aiChat";

/** Workspace Ponti a partir de la selección de filtros (cliente/proyecto/campaña/campo). */
export const buildPontiWorkspace = (
  selectedCustomer: { id: number; name: string } | undefined,
  selectedProject: { id: number; name: string } | undefined,
  projectId: number | null,
  selectedCampaignId: number | undefined,
  campaigns: Array<{ id: number; name: string }> | undefined,
  selectedField: { id: number; name: string } | undefined
): PontiWorkspaceContext => {
  const campaign = campaigns?.find((c) => c.id === selectedCampaignId);
  return {
    customer_id: selectedCustomer?.id ?? null,
    customer_name: selectedCustomer?.name ?? null,
    project_id: projectId ?? null,
    project_name: selectedProject?.name ?? null,
    campaign_id: selectedCampaignId ?? null,
    campaign_name: campaign?.name ?? null,
    field_id: selectedField?.id ?? null,
    field_name: selectedField?.name ?? null,
  };
};
